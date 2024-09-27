import { ZWaveError, ZWaveErrorCodes, highResTimestamp } from "@zwave-js/core";
import { createWrappingCounter } from "@zwave-js/shared";
import { type CompareResult } from "alcalzone-shared/comparable";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";

/** A high-level task that can be started and stepped through */
export interface Task<TReturn> {
	readonly id: number;
	readonly timestamp: number;
	readonly builder: TaskBuilder<TReturn>;

	/** A name to identify the task */
	readonly name?: string;
	/** The task's priority */
	readonly priority: TaskPriority;
	/** How the task should behave when interrupted */
	readonly interrupt: TaskInterruptBehavior;
	/** Starts the task it if hasn't been started yet, and executes the next step of the task */
	step(): Promise<TaskStepResult<TReturn>>;
	/** Stops the task without further executing it, cleans up, and prepares it for starting again */
	reset(): Promise<void>;
	/** Resolves the task's promise to notify the caller */
	resolve(result: TReturn): void;
	/** Rejects the task's promise to notify the caller */
	reject(error: Error): void;
	/** The current state of the task */
	get state(): TaskState;

	readonly generator: ReturnType<TaskBuilder<TReturn>["task"]> | undefined;
	readonly promise: Promise<TReturn>;
}

/** Defines the necessary information for creating a task */
export interface TaskBuilder<TReturn> {
	/** A name to identify the task */
	name?: string;
	/** The task's priority */
	priority: TaskPriority;
	/** How the task should behave when interrupted */
	interrupt?: TaskInterruptBehavior;
	/**
	 * The task's main generator function. This is called repeatedly until it's done.
	 * The function must yield at points where it may be interrupted.
	 * When the task wants to wait for something, it must yield a function returning a Promise that resolves when it can continue.
	 */
	task: () => AsyncGenerator<
		(() => Promise<unknown>) | undefined,
		TReturn,
		void
	>;
	/** A cleanup function that gets called when the task is dropped */
	cleanup?: () => Promise<void>;
}

/**
 * The priority of a task.
 *
 * Higher priority tasks are executed first and interrupt lower priority tasks.
 * The recommended priority for application-initiated communication is `Normal`.
 * `Low` and `Lower` are recommended for internal long-running tasks that should not interfere with user-initiated tasks.
 * `Idle` is recommended for tasks that should only run when no other tasks are pending.
 */
export enum TaskPriority {
	Highest,
	High,
	Normal,
	Low,
	Lower,
	Idle,
}

export enum TaskState {
	/** The task has not been created yet */
	None,
	/** The task is being executed */
	Active,
	/** The task is waiting for something */
	Waiting,
	/** The task is finished */
	Done,
}

export enum TaskInterruptBehavior {
	/** The task may not be interrupted */
	Forbidden,
	/** The task will be resumed after being interrupted (default) */
	Resume,
	/** The task needs to be restarted after being interrupted */
	Restart,
}

export type TaskStepResult<T> = {
	newState: TaskState.Done;
	result: T;
	waitFor?: undefined;
} | {
	newState: TaskState.Active;
	waitFor?: undefined;
} | {
	newState: TaskState.Waiting;
	waitFor: Promise<unknown>;
};

function compareTasks<T1, T2>(a: Task<T1>, b: Task<T2>): CompareResult {
	// Sort by priority first. Higher priority goes to the end of the list
	if (a.priority < b.priority) return 1;
	if (a.priority > b.priority) return -1;

	// Deprioritize waiting tasks
	if (a.state !== TaskState.Waiting && b.state === TaskState.Waiting) {
		return 1;
	}
	if (a.state === TaskState.Waiting && b.state !== TaskState.Waiting) {
		return -1;
	}

	// Sort equal priority by timestamp. Newer tasks go to the end of the list
	if (a.timestamp < b.timestamp) return 1;
	if (a.timestamp > b.timestamp) return -1;

	// If all else fails, sort by ID
	return Math.sign(b.id - a.id) as CompareResult;
}

export class TaskScheduler {
	private _tasks = new SortedList<Task<unknown>>(undefined, compareTasks);
	private _currentTask: Task<unknown> | undefined;

	private _idGenerator = createWrappingCounter(0xff_ff_ff);
	private _continueSignal: DeferredPromise<void> | undefined;
	private _stopSignal: DeferredPromise<void> | undefined;
	private _stopPromise: DeferredPromise<void> | undefined;

	public queueTask<T>(builder: TaskBuilder<T>): Promise<T> {
		const task = this.createTask(builder);
		this._tasks.add(task);
		if (this._continueSignal) this._continueSignal.resolve();
		return task.promise;
	}

	public async removeTasks(
		predicate: (task: Task<unknown>) => boolean,
		reason?: ZWaveError,
	): Promise<void> {
		// Collect tasks that should be removed, but in reverse order,
		// so that we handle the current task last.
		const tasksToRemove: Task<unknown>[] = [];
		let removeCurrentTask = false;
		for (const task of this._tasks) {
			if (predicate(task)) {
				if (task === this._currentTask) {
					removeCurrentTask = true;
				} else {
					tasksToRemove.push(task);
				}
			}
		}

		reason ??= new ZWaveError(
			"Task was removed",
			ZWaveErrorCodes.Driver_TaskRemoved,
		);

		for (const task of tasksToRemove) {
			this._tasks.remove(task);
			if (
				task.state === TaskState.Active
				|| task.state === TaskState.Waiting
			) {
				// The task is running, clean it up
				await task.reset();
			}
			task.reject(reason);
		}

		if (removeCurrentTask && this._currentTask) {
			this._tasks.remove(this._currentTask);
			await this._currentTask.reset();
			this._currentTask.reject(reason);
			this._currentTask = undefined;
		}

		if (this._continueSignal) this._continueSignal.resolve();
	}

	/** Creates a task that can be executed */
	private createTask<T>(builder: TaskBuilder<T>): Task<T> {
		let state = TaskState.None;
		let generator: ReturnType<TaskBuilder<T>["task"]> | undefined;
		let waitFor: Promise<unknown> | undefined;
		const promise = createDeferredPromise<T>();

		return {
			id: this._idGenerator(),
			timestamp: highResTimestamp(),
			builder,
			name: builder.name,
			priority: builder.priority,
			interrupt: builder.interrupt ?? TaskInterruptBehavior.Resume,
			promise,
			async step() {
				// Do not proceed while still waiting for something
				if (state === TaskState.Waiting && waitFor) {
					return {
						newState: state,
						waitFor,
					};
				}

				generator ??= builder.task();
				state = TaskState.Active;

				const { value, done } = await generator.next();
				if (done) {
					state = TaskState.Done;
					return {
						newState: state,
						result: value,
					};
				} else if (typeof value === "function") {
					state = TaskState.Waiting;
					waitFor = value().then(() => {
						waitFor = undefined;
						if (state === TaskState.Waiting) {
							state = TaskState.Active;
						}
					});
					return {
						newState: state,
						waitFor,
					};
				}
				return { newState: state };
			},
			async reset() {
				if (state === TaskState.None) return;
				state = TaskState.None;
				waitFor = undefined;
				generator = undefined;

				await builder.cleanup?.();
			},
			resolve(result) {
				promise.resolve(result);
			},
			reject(error) {
				promise.reject(error);
			},
			get state() {
				return state;
			},
			get generator() {
				return generator;
			},
		};
	}

	public start(): void {
		this._stopSignal = createDeferredPromise();
		setImmediate(async () => {
			try {
				await this.run();
			} catch (e) {
				console.error("Task runner crashed", e);
			}
		});
	}

	private async run(): Promise<void> {
		while (true) {
			let waitFor: Promise<unknown> | undefined;
			if (this._tasks.length > 0) {
				const firstTask = this._tasks.peekStart()!;
				if (!this._currentTask) {
					// We're not currently executing a task, start executing the first one
					this._currentTask = firstTask;
				} else if (
					this._currentTask !== firstTask
					&& this._currentTask.interrupt
						!== TaskInterruptBehavior.Forbidden
				) {
					// We are executing an interruptible task, and a new task with a higher priority was added
					if (
						this._currentTask.interrupt
							=== TaskInterruptBehavior.Restart
					) {
						// The current task needs to be restarted after being interrupted, so reset it
						await this._currentTask.reset();
					}
					// switch to the new task
					this._currentTask = firstTask;
				}

				const cleanupCurrentTask = async () => {
					if (this._currentTask) {
						this._tasks.remove(this._currentTask);
						await this._currentTask.reset();
						this._currentTask = undefined;
					}
				};

				// Execute the current task one step further
				waitFor = undefined;
				let stepResult: TaskStepResult<unknown>;
				try {
					stepResult = await this._currentTask.step();
				} catch (e) {
					// The task threw an error, expose the result and clean up.
					this._currentTask.reject(e as Error);
					await cleanupCurrentTask();
					// Then continue with the next iteration
					continue;
				}

				if (stepResult.newState === TaskState.Done) {
					// The task is done, clean up
					this._currentTask.resolve(stepResult.result);
					await cleanupCurrentTask();
					// Then continue with the next iteration
					continue;
				} else if (stepResult.newState === TaskState.Waiting) {
					// The task is waiting for something

					// If the task may be interrupted, check if there are other same-priority tasks that should be executed instead
					if (
						this._currentTask.interrupt
							!== TaskInterruptBehavior.Forbidden
					) {
						// Re-queue the task, so the queue gets reordered
						this._tasks.remove(this._currentTask);
						this._tasks.add(this._currentTask);

						if (this._tasks.peekStart() !== this._currentTask) {
							// The task is no longer the first in the queue. Switch to the other one
							continue;
						}
					}

					// Otherwise, we got nothing to do right now than to wait
					waitFor = stepResult.waitFor;
				} else {
					// The current task is not done, continue with the next iteration
					continue;
				}
			}

			// Task queue empty. Wait for either a new task or the stop signal,
			// or the current task to finish waiting
			this._continueSignal = createDeferredPromise();
			const nextAction = await Promise.race([
				this._continueSignal.then(() => "continue" as const),
				this._stopSignal!.then(() => "stop" as const),
				waitFor?.then(() => "continue" as const),
			].filter((p) => p !== undefined));
			this._continueSignal = undefined;
			if (nextAction === "stop") break;
		}
		this._stopPromise!.resolve();
	}

	public async stop(): Promise<void> {
		if (!this._stopSignal) return;
		// Signal to the task runner that it should stop
		this._stopPromise = createDeferredPromise();
		this._stopSignal.resolve();
		await this._stopPromise;
	}
}
