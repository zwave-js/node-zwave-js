import {
	assign,
	Interpreter,
	Machine,
	StateMachine,
	StatesConfig,
} from "xstate";

export interface SerialAPICommandStateSchema {
	states: {
		sending: {};
		waitForACK: {};
		waitForResponse: {};
		waitForCallback: {};
		retry: {};
		retryWait: {};
		failure: {};
		success: {};
		abort: {};
	};
}

export type SerialAPICommandError =
	| "send failure"
	| "CAN"
	| "ACK timeout"
	| "response timeout"
	| "callback timeout"
	| "response NOK"
	| "callback NOK";

export interface SerialAPICommandContext {
	msg: Buffer;
	expectsResponse: boolean;
	expectsCallback: boolean;
	attempts: number;
	maxAttempts: number;
	lastError?: SerialAPICommandError;
}

export type SerialAPICommandEvent =
	| { type: "ACK" }
	| { type: "CAN" }
	| {
			type: "response";
			ok: boolean;
	  }
	| {
			type: "response" | "callback";
			ok: boolean;
			final?: boolean;
	  };

export type SerialAPICommandDoneEvent = { reason: SerialAPICommandError };

export interface ServiceImplementations {
	sendData: (data: Buffer) => Promise<void>;
	notifyRetry?: (
		attempts: number,
		maxAttempts: number,
		delay: number,
	) => void;
}

function computeRetryDelay(ctx: SerialAPICommandContext): number {
	return 100 + 1000 * (ctx.attempts - 1);
}

export type SerialAPICommandMachine = StateMachine<
	SerialAPICommandContext,
	SerialAPICommandStateSchema,
	SerialAPICommandEvent
>;
export type SerialAPICommandInterpreter = Interpreter<
	SerialAPICommandContext,
	SerialAPICommandStateSchema,
	SerialAPICommandEvent
>;

export function createSerialAPICommandMachine(
	{ sendData, notifyRetry }: ServiceImplementations,
	initialContext: Partial<SerialAPICommandContext> = {},
	additionalStates: StatesConfig<
		SerialAPICommandContext,
		any,
		SerialAPICommandEvent
	> = {},
): SerialAPICommandMachine {
	return Machine(
		{
			id: "serialAPICommand",
			initial: "sending",
			context: {
				msg: Buffer.from([]),
				expectsResponse: false,
				expectsCallback: false,
				attempts: 0,
				maxAttempts: 3,
				...initialContext,
			},
			states: {
				...additionalStates,
				sending: {
					entry: assign({
						attempts: (ctx) => ctx.attempts + 1,
					}),
					invoke: {
						id: "sendMessage",
						src: "send",
						onDone: "waitForACK",
						onError: {
							target: "retry",
							actions: assign({
								lastError: (_) => "send failure",
							}),
						},
					},
				},
				waitForACK: {
					on: {
						CAN: {
							target: "retry",
							actions: assign<SerialAPICommandContext>({
								lastError: (_) => "CAN",
							}),
						},
						ACK: [
							{
								target: "waitForResponse",
							},
						],
					},
					after: {
						1600: {
							target: "retry",
							actions: assign({
								lastError: (_) => "ACK timeout",
							}),
						},
					},
				},
				waitForResponse: {
					on: {
						"": [
							{
								target: "waitForCallback",
								cond: "expectsNoResponse",
							},
						],
						response: [
							{
								target: "retry",
								cond: "responseIsNOK",
								actions: assign<SerialAPICommandContext>({
									lastError: (_) => "response NOK",
								}),
							},
							{ target: "waitForCallback" },
						],
					},
					after: {
						1600: {
							target: "retry",
							actions: assign({
								lastError: (_) => "response timeout",
							}),
						},
					},
				},
				waitForCallback: {
					on: {
						"": [{ target: "success", cond: "expectsNoCallback" }],
						callback: [
							{
								target: "failure",
								cond: "callbackIsNOK",
								actions: assign<SerialAPICommandContext>({
									lastError: (_) => "callback NOK",
								}),
							},
							{ target: "success", cond: "callbackIsFinal" },
							{ target: "waitForCallback" },
						],
					},
					after: {
						65000: {
							target: "abort",
							actions: assign({
								lastError: (_) => "callback timeout",
							}),
						},
					},
				},
				retry: {
					on: {
						"": [
							{ target: "retryWait", cond: "mayRetry" },
							{ target: "failure" },
						],
					},
				},
				retryWait: {
					invoke: {
						id: "notify",
						src: "notifyRetry",
					},
					after: {
						RETRY_DELAY: "sending",
					},
				},
				success: {
					type: "final",
				},
				failure: {
					type: "final",
					data: {
						reason: (ctx: SerialAPICommandContext) => ctx.lastError,
					},
				},
				abort: {
					type: "final",
					data: {
						reason: (ctx: SerialAPICommandContext) => ctx.lastError,
					},
				},
			},
		},
		{
			services: {
				send: (ctx) => sendData(ctx.msg),
				notifyRetry: (ctx) => {
					notifyRetry?.(
						ctx.attempts,
						ctx.maxAttempts,
						computeRetryDelay(ctx),
					);
					return Promise.resolve();
				},
			},
			guards: {
				mayRetry: (ctx) => ctx.attempts < ctx.maxAttempts,
				expectsNoResponse: (ctx) => !ctx.expectsResponse,
				expectsNoCallback: (ctx) => !ctx.expectsCallback,
				responseIsNOK: (ctx, evt) => evt.type === "response" && !evt.ok,
				callbackIsNOK: (ctx, evt) => evt.type === "callback" && !evt.ok,
				callbackIsFinal: (ctx, evt) =>
					evt.type === "callback" && evt.ok && evt.final !== false,
			},
			delays: {
				RETRY_DELAY: (ctx) => computeRetryDelay(ctx),
			},
		},
	);
}
