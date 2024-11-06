import { ZWaveError, ZWaveErrorCodes, highResTimestamp } from "@zwave-js/core";
import { createWrappingCounter, evalOrStatic, noop } from "@zwave-js/shared";
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

	/** The parent task spawning this subtask, if any */
	readonly parent?: Task<unknown>;

	/** A name to identify the task */
	readonly name?: string;
	/** A tag to identify the task programmatically */
	readonly tag?: TaskTag;
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

function getTaskName(task: Task<unknown>): string {
	return `${
		task.name ?? (task.tag && JSON.stringify(task.tag)) ?? "unnamed"
	} (ID ${task.id})`;
}

/** Defines the necessary information for creating a task */
export interface TaskBuilder<TReturn, TInner = unknown> {
	/** A name to identify the task */
	name?: string;
	/** A tag to identify the task programmatically */
	tag?: TaskTag;
	/** The task's priority */
	priority: TaskPriority;
	/** How the task should behave when interrupted */
	interrupt?: TaskInterruptBehavior;
	/**
	 * The task's main generator function. This is called repeatedly until it's done.
	 * The function must yield at points where it may be interrupted.
	 *
	 * At those points, the task can also wait for something to happen:
	 * - Either a Promise, in which case it must yield a function that returns that Promise
	 * - Or another task, in which case it must yield a TaskBuilder object or a function that returns one
	 *
	 * Yielded Promises should not spawn new tasks. If they do, the spawned tasks MUST have a higher priority than the parent task.
	 */
	task: () => AsyncGenerator<
		| (() => Promise<TInner> | TaskBuilder<TInner>)
		| (() => TaskBuilder<TInner>)
		| TaskBuilder<TInner>
		| undefined,
		TReturn,
		TInner
	>;
	/** A cleanup function that gets called when the task is dropped */
	cleanup?: () => Promise<void>;
}

export type TaskReturnType<T extends TaskBuilder<unknown>> = T extends
	TaskBuilder<infer R> ? R
	: never;

function isTaskBuilder<T>(
	obj: any,
): obj is TaskBuilder<T> {
	return (
		typeof obj === "object"
		&& typeof obj.task === "function"
		&& typeof obj.priority === "number"
	);
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
	High = 1,
	Normal = 2,
	Low = 3,
	Lower = 4,
	Idle = 5,
}

export enum TaskState {
	/** The task has not been created yet */
	None,
	/** The task is being executed */
	Active,
	/** The task is waiting for a Promise to resolve */
	AwaitingPromise,
	/** The task is waiting for another task to finish */
	AwaitingTask,
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
} | {
	newState: TaskState.Active;
} | {
	newState: TaskState.AwaitingPromise;
	promise: Promise<unknown>;
} | {
	newState: TaskState.AwaitingTask;
	task: Task<unknown>;
};

function compareTasks<T1, T2>(a: Task<T1>, b: Task<T2>): CompareResult {
	// Sort by priority first. Higher priority goes to the end of the list
	if (a.priority < b.priority) return 1;
	if (a.priority > b.priority) return -1;

	// Deprioritize waiting tasks
	const aWaiting = a.state === TaskState.AwaitingPromise
		|| a.state === TaskState.AwaitingTask;
	const bWaiting = b.state === TaskState.AwaitingPromise
		|| b.state === TaskState.AwaitingTask;
	if (!aWaiting && bWaiting) return 1;
	if (aWaiting && !bWaiting) return -1;

	// Sort equal priority by timestamp. Newer tasks go to the end of the list
	if (a.timestamp < b.timestamp) return 1;
	if (a.timestamp > b.timestamp) return -1;

	// If all else fails, sort by ID
	return Math.sign(b.id - a.id) as CompareResult;
}

export type TaskTag =
	| {
		// Rebuild routes for all nodes
		id: "rebuild-routes";
	}
	| {
		// Rebuild routes for a single node
		id: "rebuild-node-routes";
		nodeId: number;
	}
	| {
		// Perform an OTA firmware update for a node
		id: "firmware-update-ota";
		nodeId: number;
	};

export class TaskScheduler {
	public constructor(private verbose: boolean = false) {
	}

	private _tasks = new SortedList<Task<unknown>>(undefined, compareTasks);
	private _currentTask: Task<unknown> | undefined;

	private _idGenerator = createWrappingCounter(0xff_ff_ff);
	private _continueSignal: DeferredPromise<void> | undefined;
	private _stopSignal: DeferredPromise<void> | undefined;
	private _stopPromise: DeferredPromise<void> | undefined;

	public queueTask<T>(builder: TaskBuilder<T>): Promise<T> {
		const task = this.createTask(builder);
		this._tasks.add(task);
		if (this.verbose) {
			console.log(
				`Task queued: ${getTaskName(task)}`,
			);
		}

		if (this._continueSignal) this._continueSignal.resolve();
		return task.promise;
	}

	/** Removes/stops tasks matching the given predicate. Returns `true` when a task was removed, `false` otherwise. */
	public async removeTasks(
		predicate: (task: Task<unknown>) => boolean,
		reason?: ZWaveError,
	): Promise<boolean> {
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
			if (this.verbose) {
				console.log(
					`Removing task: ${getTaskName(task)}`,
				);
			}
			this._tasks.remove(task);
			if (
				task.state === TaskState.Active
				|| task.state === TaskState.AwaitingPromise
				|| task.state === TaskState.AwaitingTask
			) {
				// The task is running, clean it up
				await task.reset().catch(noop);
			}
			task.reject(reason);
			// Re-add the parent task to the list if there is one
			if (task.parent) {
				if (this.verbose) {
					console.log(
						`Restoring parent task: ${getTaskName(task.parent)}`,
					);
				}
				this._tasks.add(task.parent);
			}
		}

		if (removeCurrentTask && this._currentTask) {
			if (this.verbose) {
				console.log(
					`Removing task: ${getTaskName(this._currentTask)}`,
				);
			}
			this._tasks.remove(this._currentTask);
			await this._currentTask.reset().catch(noop);
			this._currentTask.reject(reason);
			// Re-add the parent task to the list if there is one
			if (this._currentTask.parent) {
				if (this.verbose) {
					console.log(
						`Restoring parent task: ${
							getTaskName(this._currentTask.parent)
						}`,
					);
				}
				this._tasks.add(this._currentTask.parent);
			}
			this._currentTask = undefined;
		}

		if (this._continueSignal) this._continueSignal.resolve();

		return tasksToRemove.length > 0 || removeCurrentTask;
	}

	public findTask<T = unknown>(
		predicate: (task: Task<T>) => boolean,
	): Promise<T> | undefined {
		return this._tasks.find((t: any) => predicate(t))?.promise as
			| Promise<T>
			| undefined;
	}

	/** Creates a task that can be executed */
	private createTask<T>(
		builder: TaskBuilder<T>,
		parent?: Task<unknown>,
	): Task<T> {
		let state = TaskState.None;
		let generator: ReturnType<TaskBuilder<T>["task"]> | undefined;
		let waitForPromise: Promise<unknown> | undefined;
		const promise = createDeferredPromise<T>();

		let prevResult: unknown;
		let waitError: unknown;

		const self = this;

		return {
			id: this._idGenerator(),
			timestamp: highResTimestamp(),
			builder,
			parent,
			name: builder.name,
			tag: builder.tag,
			priority: builder.priority,
			interrupt: builder.interrupt ?? TaskInterruptBehavior.Resume,
			promise,
			async step() {
				// Do not proceed while still waiting for a Promise to resolve
				if (state === TaskState.AwaitingPromise && waitForPromise) {
					return {
						newState: state,
						promise: waitForPromise,
					};
				} else if (state === TaskState.AwaitingTask) {
					throw new Error(
						"Cannot step through a task that is waiting for another task",
					);
				}

				generator ??= builder.task();
				state = TaskState.Active;

				const { value, done } = waitError
					? await generator.throw(waitError)
					: await generator.next(prevResult);
				prevResult = undefined;
				waitError = undefined;
				if (done) {
					state = TaskState.Done;
					return {
						newState: state,
						result: value,
					};
				} else if (value != undefined) {
					const waitFor = evalOrStatic(value);
					if (waitFor instanceof Promise) {
						state = TaskState.AwaitingPromise;
						waitForPromise = waitFor.then((result) => {
							prevResult = result;
						}).catch((e) => {
							waitError = e;
						}).finally(() => {
							waitForPromise = undefined;
							if (state === TaskState.AwaitingPromise) {
								state = TaskState.Active;
							}
						});
						return {
							newState: state,
							promise: waitForPromise,
						};
					} else if (isTaskBuilder(waitFor)) {
						if (waitFor.priority > builder.priority) {
							throw new Error(
								"Tasks cannot yield to tasks with lower priority than their own",
							);
						}
						// Create a sub-task with a reference to this task
						state = TaskState.AwaitingTask;
						const subTask = self.createTask(waitFor, this);

						subTask.promise.then((result) => {
							prevResult = result;
						}).catch((e) => {
							waitError = e;
						}).finally(() => {
							if (state === TaskState.AwaitingTask) {
								state = TaskState.Active;
							}
						});

						return {
							newState: state,
							task: subTask,
						};
					} else {
						throw new Error(
							"Invalid value yielded by task",
						);
					}
				} else {
					return { newState: state };
				}
			},
			async reset() {
				if (state === TaskState.None) return;
				state = TaskState.None;
				waitForPromise = undefined;
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

				if (this.verbose) {
					console.log(
						`Stepping through task: ${
							getTaskName(this._currentTask)
						}`,
					);
				}

				const cleanupCurrentTask = async () => {
					if (this._currentTask) {
						this._tasks.remove(this._currentTask);
						await this._currentTask.reset();
						// Re-add the parent task to the list if there is one
						if (this._currentTask.parent) {
							if (this.verbose) {
								console.log(
									`Restoring parent task: ${
										getTaskName(this._currentTask.parent)
									}`,
								);
							}
							this._tasks.add(this._currentTask.parent);
						}
						this._currentTask = undefined;
					}
				};

				// Execute the current task one step further
				waitFor = undefined;
				let stepResult: TaskStepResult<unknown>;
				try {
					stepResult = await this._currentTask.step();
				} catch (e) {
					if (this.verbose) {
						console.error(
							`- Task threw an error:`,
							e,
						);
					}
					// The task threw an error, expose the result and clean up.
					this._currentTask.reject(e as Error);
					await cleanupCurrentTask();
					// Then continue with the next iteration
					continue;
				}

				if (stepResult.newState === TaskState.Done) {
					if (this.verbose) {
						console.log(`- Task finished`);
					}
					// The task is done, clean up
					this._currentTask.resolve(stepResult.result);
					await cleanupCurrentTask();
					// Then continue with the next iteration
					continue;
				} else if (stepResult.newState === TaskState.AwaitingPromise) {
					// The task is waiting for something
					if (this.verbose) {
						console.log(`- Task waiting`);
					}

					// If the task may be interrupted, check if there are other same-priority tasks that should be executed instead
					if (
						this._currentTask.interrupt
							!== TaskInterruptBehavior.Forbidden
					) {
						// Re-queue the task, so the queue gets reordered
						this._tasks.remove(this._currentTask);
						this._tasks.add(this._currentTask);

						if (this._tasks.peekStart() !== this._currentTask) {
							if (this.verbose) {
								console.log(`-- Continuing with another task`);
							}
							// The task is no longer the first in the queue. Switch to the other one
							continue;
						}
					}

					// Otherwise, we got nothing to do right now than to wait
					waitFor = stepResult.promise;
				} else if (stepResult.newState === TaskState.AwaitingTask) {
					// The task spawned a sub-task. Replace it with the sub-task and continue executing
					if (this.verbose) {
						console.log(`- Task spawned a sub-task`);
					}
					this._tasks.add(stepResult.task);
					this._tasks.remove(this._currentTask);
					// Continue with the next iteration
					continue;
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
