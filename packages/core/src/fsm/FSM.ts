export interface StateMachineTransition<
	State extends StateMachineState,
	Effect = undefined,
> {
	effect?: Effect;
	newState: State;
}

export interface StateMachineState {
	value: number | string;
	done?: boolean;
}

export interface StateMachineInput {
	value: number | string;
}

export type StateMachineTransitionMap<
	State extends StateMachineState,
	Input extends StateMachineInput,
	Effect = undefined,
> = (
	state: State,
) => (
	input: Input,
) => StateMachineTransition<State, Effect | undefined> | undefined;

export type InferStateMachineTransitions<
	T extends StateMachine<any, any, any>,
> = T extends StateMachine<infer S, infer I, infer E>
	? StateMachineTransitionMap<S, I, E | undefined>
	: never;

export class StateMachine<
	State extends StateMachineState,
	Input extends StateMachineInput,
	Effect = undefined,
> {
	public constructor(
		initialState: State,
		transitions: StateMachineTransitionMap<
			State,
			Input,
			Effect | undefined
		>,
	) {
		this._initial = this._state = initialState;
		this.transitions = transitions;
	}

	protected transitions: StateMachineTransitionMap<
		State,
		Input,
		Effect | undefined
	>;

	/** Restarts the machine from the initial state */
	public restart(): void {
		this._state = this._initial;
	}

	/** Determines the next transition to take */
	public next(
		input: Input,
	): StateMachineTransition<State, Effect | undefined> | undefined {
		if (this._state.done) return;
		return this.transitions(this._state)(input);
	}

	/** Transitions the machine to the next state. This does not execute effects */
	public transition(next?: State): void {
		// Allow some convenience by passing the transition's next state directly
		if (next == undefined) return;
		this._state = next;
	}

	private _initial: State;
	private _state: State;
	/** Returns the current state of the state machine */
	public get state(): State {
		return this._state;
	}

	/** Returns whether this state machine is done */
	public get done(): boolean {
		return !!this._state.done;
	}
}
