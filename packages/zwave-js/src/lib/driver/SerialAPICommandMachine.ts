import type { Message } from "@zwave-js/serial";
import {
	MessageType,
	isMultiStageCallback,
	isSuccessIndicator,
} from "@zwave-js/serial";
import {
	type InterpreterFrom,
	type MachineConfig,
	type MachineOptions,
	type StateMachine,
	assign,
	createMachine,
	raise,
} from "xstate";
import { isSendData } from "../serialapi/transport/SendDataShared";
import type { ZWaveOptions } from "./ZWaveOptions";

/* eslint-disable @typescript-eslint/ban-types */
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
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export type SerialAPICommandError =
	| "send failure"
	| "CAN"
	| "NAK"
	| "ACK timeout"
	| "response timeout"
	| "callback timeout"
	| "response NOK"
	| "callback NOK";

export interface SerialAPICommandContext {
	msg: Message;
	data: Buffer;
	attempts: number;
	maxAttempts: number;
	lastError?: SerialAPICommandError;
	result?: Message;
	txTimestamp?: number;
}

export type SerialAPICommandEvent =
	| { type: "ACK" }
	| { type: "CAN" }
	| { type: "NAK" }
	| { type: "message"; message: Message } // A message that might or might not be expected
	| { type: "response"; message: Message } // Gets forwarded when a response-type message is expected
	| { type: "callback"; message: Message }; // Gets forwarded when a callback-type message is expected

export type SerialAPICommandDoneData =
	| {
		type: "success";
		// TODO: Can we get rid of this?
		txTimestamp: number;
		result?: Message;
	}
	| (
		& {
			type: "failure";
		}
		& (
			| {
				reason:
					| "send failure"
					| "CAN"
					| "NAK"
					| "ACK timeout"
					| "response timeout"
					| "callback timeout";
				result?: undefined;
			}
			| {
				reason: "response NOK" | "callback NOK";
				result: Message;
			}
		)
	);

export interface SerialAPICommandServiceImplementations {
	timestamp: () => number;
	sendData: (data: Buffer) => Promise<void>;
	sendDataAbort: () => Promise<void>;
	notifyRetry: (
		lastError: SerialAPICommandError | undefined,
		message: Message,
		attempts: number,
		maxAttempts: number,
		delay: number,
	) => void;
	notifyUnsolicited: (message: Message) => void;
	logOutgoingMessage: (message: Message) => void;
}

function computeRetryDelay(ctx: SerialAPICommandContext): number {
	return 100 + 1000 * (ctx.attempts - 1);
}

const forwardMessage = raise((_, evt: SerialAPICommandEvent) => {
	const msg = (evt as any).message as Message;
	return {
		type: msg.type === MessageType.Response ? "response" : "callback",
		message: msg,
	} as SerialAPICommandEvent;
});

export type SerialAPICommandMachineConfig = MachineConfig<
	SerialAPICommandContext,
	SerialAPICommandStateSchema,
	SerialAPICommandEvent
>;
export type SerialAPICommandMachine = StateMachine<
	SerialAPICommandContext,
	SerialAPICommandStateSchema,
	SerialAPICommandEvent
>;

export type SerialAPICommandInterpreter = InterpreterFrom<
	SerialAPICommandMachine
>;
export type SerialAPICommandMachineOptions = Partial<
	MachineOptions<SerialAPICommandContext, SerialAPICommandEvent>
>;

export type SerialAPICommandMachineParams = {
	timeouts: Pick<
		ZWaveOptions["timeouts"],
		"ack" | "response" | "sendDataAbort" | "sendDataCallback"
	>;
	attempts: Pick<ZWaveOptions["attempts"], "controller">;
};

export function getSerialAPICommandMachineConfig(
	message: Message,
	{
		timestamp,
		logOutgoingMessage,
		notifyUnsolicited,
		sendDataAbort,
	}: Pick<
		SerialAPICommandServiceImplementations,
		| "timestamp"
		| "logOutgoingMessage"
		| "notifyUnsolicited"
		| "sendDataAbort"
	>,
	attemptsConfig: SerialAPICommandMachineParams["attempts"],
): SerialAPICommandMachineConfig {
	return {
		predictableActionArguments: true,
		id: "serialAPICommand",
		initial: "sending",
		context: {
			msg: message,
			data: message.serialize(),
			attempts: 0,
			maxAttempts: attemptsConfig.controller,
		},
		on: {
			// The state machine accepts any message. If it is expected
			// it will be forwarded to the correct states. If not, it
			// will be returned with the "unsolicited" event.
			message: [
				{
					cond: "isExpectedMessage",
					actions: forwardMessage as any,
				},
				{
					actions: (_: any, evt: any) => {
						notifyUnsolicited(evt.message);
					},
				},
			],
		},
		states: {
			sending: {
				// Every send attempt should increase the attempts by one
				// and remember the timestamp of transmission
				entry: [
					assign({
						attempts: (ctx) => ctx.attempts + 1,
						txTimestamp: (_) => timestamp(),
					}),
					(ctx) => logOutgoingMessage(ctx.msg),
				],
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
				always: [{ target: "success", cond: "expectsNoAck" }],
				on: {
					CAN: {
						target: "retry",
						actions: assign({
							lastError: (_) => "CAN",
						}),
					},
					NAK: {
						target: "retry",
						actions: assign({
							lastError: (_) => "NAK",
						}),
					},
					ACK: "waitForResponse",
				},
				after: {
					ACK_TIMEOUT: {
						target: "retry",
						actions: assign({
							lastError: (_) => "ACK timeout",
						}),
					},
				},
			},
			waitForResponse: {
				always: [
					{
						target: "waitForCallback",
						cond: "expectsNoResponse",
					},
				],
				on: {
					response: [
						{
							target: "retry",
							cond: "responseIsNOK",
							actions: assign({
								lastError: (_) => "response NOK",
								result: (_, evt) => (evt as any).message,
							}),
						},
						{
							target: "waitForCallback",
							actions: assign({
								result: (_, evt) => (evt as any).message,
							}),
						},
					],
				},
				after: {
					// Do not retry when a response times out
					RESPONSE_TIMEOUT: [
						{
							cond: "isSendData",
							target: "waitForCallback",
							actions: [
								() => sendDataAbort(),
								assign({
									lastError: (_) => "response timeout",
								}),
							],
						},
						{
							target: "failure",
							actions: assign({
								lastError: (_) => "response timeout",
							}),
						},
					],
				},
			},
			waitForCallback: {
				always: [{ target: "success", cond: "expectsNoCallback" }],
				on: {
					callback: [
						{
							// Preserve "response timeout" errors
							// A NOK callback afterwards is expected, but we're not interested in it
							target: "failure",
							cond: "callbackIsNOKAfterTimedOutResponse",
						},
						{
							target: "failure",
							cond: "callbackIsNOK",
							actions: assign({
								// Preserve "response timeout" errors
								lastError: (_) => "callback NOK",
								result: (_, evt) => (evt as any).message,
							}),
						},
						{
							target: "success",
							cond: "callbackIsFinal",
							actions: assign({
								result: (_, evt) => (evt as any).message,
							}),
						},
						{ target: "waitForCallback" },
					],
				},
				after: {
					// Abort Send Data when it takes too long
					SENDDATA_ABORT_TIMEOUT: {
						cond: "isSendData",
						actions: [
							() => sendDataAbort(),
						],
					},
					CALLBACK_TIMEOUT: {
						target: "failure",
						actions: assign({
							lastError: (_) => "callback timeout",
						}),
					},
				},
			},
			retry: {
				always: [
					{ target: "retryWait", cond: "mayRetry" },
					{ target: "failure" },
				],
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
				data: {
					type: "success",
					txTimestamp: (ctx: SerialAPICommandContext) =>
						ctx.txTimestamp!,
					result: (ctx: SerialAPICommandContext) => ctx.result,
				},
			},
			failure: {
				type: "final",
				data: {
					type: "failure",
					reason: (ctx: SerialAPICommandContext) => ctx.lastError,
					result: (ctx: SerialAPICommandContext) => ctx.result!,
				},
			},
		},
	};
}

export function getSerialAPICommandMachineOptions(
	{
		sendData,
		notifyRetry,
	}: Pick<
		SerialAPICommandServiceImplementations,
		"sendData" | "sendDataAbort" | "notifyRetry"
	>,
	timeoutConfig: SerialAPICommandMachineParams["timeouts"],
): SerialAPICommandMachineOptions {
	return {
		services: {
			send: (ctx) => {
				// Mark the message as sent immediately before actually sending
				ctx.msg.markAsSent();
				return sendData(ctx.data);
			},
			notifyRetry: (ctx) => {
				notifyRetry(
					ctx.lastError,
					ctx.msg,
					ctx.attempts,
					ctx.maxAttempts,
					computeRetryDelay(ctx),
				);
				return Promise.resolve();
			},
		},
		guards: {
			mayRetry: (ctx) => ctx.attempts < ctx.maxAttempts,
			isSendData: (ctx) => isSendData(ctx.msg),
			expectsNoAck: (ctx) => !ctx.msg.expectsAck(),
			expectsNoResponse: (ctx) => !ctx.msg.expectsResponse(),
			expectsNoCallback: (ctx) => !ctx.msg.expectsCallback(),
			isExpectedMessage: (ctx, evt, meta) =>
				meta.state.matches("waitForResponse")
					? ctx.msg.isExpectedResponse((evt as any).message)
					: meta.state.matches("waitForCallback")
					? ctx.msg.isExpectedCallback((evt as any).message)
					: false,
			responseIsNOK: (ctx, evt) =>
				evt.type === "response"
				// assume responses without success indication to be OK
				&& isSuccessIndicator(evt.message)
				&& !evt.message.isOK(),
			callbackIsNOKAfterTimedOutResponse: (ctx, evt) =>
				evt.type === "callback"
				// assume callbacks without success indication to be OK
				&& isSuccessIndicator(evt.message)
				&& !evt.message.isOK()
				&& isSendData(ctx.msg)
				&& ctx.lastError === "response timeout",
			callbackIsNOK: (ctx, evt) =>
				evt.type === "callback"
				// assume callbacks without success indication to be OK
				&& isSuccessIndicator(evt.message)
				&& !evt.message.isOK(),
			callbackIsFinal: (ctx, evt) =>
				evt.type === "callback"
				// assume callbacks without success indication to be OK
				&& (!isSuccessIndicator(evt.message) || evt.message.isOK())
				// assume callbacks without isFinal method to be final
				&& (!isMultiStageCallback(evt.message)
					|| evt.message.isFinal()),
		},
		delays: {
			RETRY_DELAY: (ctx) => computeRetryDelay(ctx),
			RESPONSE_TIMEOUT: (ctx) => {
				return (
					// Ask the message for its callback timeout
					ctx.msg.getResponseTimeout()
					// and fall back to default values
					|| timeoutConfig.response
				);
			},
			CALLBACK_TIMEOUT: (ctx) => {
				return (
					// Ask the message for its callback timeout
					ctx.msg.getCallbackTimeout()
					// and fall back to default values
					|| timeoutConfig.sendDataCallback
				);
			},
			SENDDATA_ABORT_TIMEOUT: timeoutConfig.sendDataAbort,
			ACK_TIMEOUT: timeoutConfig.ack,
		},
	};
}

export function createSerialAPICommandMachine(
	message: Message,
	implementations: SerialAPICommandServiceImplementations,
	params: SerialAPICommandMachineParams,
): SerialAPICommandMachine {
	return createMachine<SerialAPICommandContext, SerialAPICommandEvent>(
		getSerialAPICommandMachineConfig(
			message,
			implementations,
			params.attempts,
		),
		getSerialAPICommandMachineOptions(implementations, params.timeouts),
	);
}
