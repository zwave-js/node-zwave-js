import { assign, Machine, StateMachine, StatesConfig } from "xstate";

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

export interface SerialAPICommandContext {
	msg: Buffer;
	expectsResponse: boolean;
	expectsCallback: boolean;
	attempts: number;
	maxAttempts: number;
}

export type SerialAPICommandEvent =
	| { type: "ACK" }
	| { type: "CAN" }
	| { type: "response" | "callback"; ok: boolean };

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

export function createSerialAPICommandMachine(
	{ sendData, notifyRetry }: ServiceImplementations,
	initialContext: Partial<SerialAPICommandContext> = {},
	additionalStates: StatesConfig<
		SerialAPICommandContext,
		any,
		SerialAPICommandEvent
	> = {},
): StateMachine<
	SerialAPICommandContext,
	SerialAPICommandStateSchema,
	SerialAPICommandEvent
> {
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
						onError: "retry",
					},
				},
				waitForACK: {
					on: {
						CAN: "retry",
						ACK: [
							{
								target: "waitForResponse",
							},
						],
					},
					after: {
						1600: "retry",
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
							},
							{ target: "waitForCallback" },
						],
					},
					after: {
						1600: "retry",
					},
				},
				waitForCallback: {
					on: {
						"": [{ target: "success", cond: "expectsNoCallback" }],
						callback: [
							{
								target: "retry",
								cond: "callbackIsNOK",
							},
							{ target: "success" },
						],
					},
					after: {
						65000: "abort",
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
				},
				abort: {
					type: "final",
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
			},
			delays: {
				RETRY_DELAY: (ctx) => computeRetryDelay(ctx),
			},
		},
	);
}
