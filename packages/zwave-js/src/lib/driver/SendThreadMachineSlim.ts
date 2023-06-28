import { type ZWaveError } from "@zwave-js/core";
import { type Message } from "@zwave-js/serial";
import { getErrorMessage } from "@zwave-js/shared";
import { assign, createMachine, forwardTo } from "xstate";
import { type DriverLogger } from "../log/Driver";
import {
	createSerialAPICommandMachine,
	type SerialAPICommandDoneData,
	type SerialAPICommandError,
	type SerialAPICommandMachineParams,
} from "./SerialAPICommandMachine";
import {
	createMessageDroppedUnexpectedError,
	type InterpreterFromMachine,
} from "./StateMachineShared";

export interface ServiceImplementations {
	pollQueue: (
		// FIXME: I don't want to expose SerialAPICommandDoneData here.
		// This should be Message | ZWaveError | undefined
		prevResult: SerialAPICommandDoneData | ZWaveError | undefined,
	) => Promise<Message | undefined>;
	notifyUnsolicited: (message: Message) => void;
	sendData: (data: Buffer) => Promise<void>;
	// createSendDataAbort: () => SendDataAbort;
	notifyRetry?: (
		command: "SendData" | "SerialAPI",
		lastError: SerialAPICommandError | undefined,
		message: Message,
		attempts: number,
		maxAttempts: number,
		delay: number,
	) => void;
	timestamp: () => number;
	logOutgoingMessage: (message: Message) => void;
	log: DriverLogger["print"];
}

export type SendThreadSlimMachineParams = SerialAPICommandMachineParams;

interface SendThreadSlimContext {
	current?: Message;
	// FIXME: I don't want to expose SerialAPICommandDoneData here.
	// This should be Message | ZWaveError | undefined
	prevResult?: SerialAPICommandDoneData | ZWaveError;
}

export type SendThreadSlimEvents =
	// Tell the machine to poll the queue again if it was idle
	| { type: "trigger" }
	// These events are forwarded to the SerialAPICommand machine
	| { type: "ACK" }
	| { type: "CAN" }
	| { type: "NAK" }
	// Used for received messages. The message will be returned as unsolicited when it is not expected
	| { type: "message"; message: Message }
	| { type: "unsolicited"; message: Message };

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSendThreadMachineSlim(
	implementations: ServiceImplementations,
	params: SendThreadSlimMachineParams,
) {
	const ret = createMachine<SendThreadSlimContext, SendThreadSlimEvents>(
		{
			predictableActionArguments: true,
			context: {
				current: undefined,
				prevResult: undefined,
			},
			initial: "idle",
			states: {
				idle: {
					// Only leave the idle state when triggered
					on: {
						trigger: "nextMessage",
					},
				},
				nextMessage: {
					invoke: {
						// nextMessage will generate a new message to send until the queue is empty
						id: "nextMessage",
						src: "nextMessage",
						onDone: [
							{
								// If we got a message, store it and transition to sending
								cond: "hasMessage",
								actions: assign({
									current: (_, evt) => evt.data,
								}),
								target: "sending",
							},
							// If the queue is empty, go back to the idle state
							{ target: "idle" },
						],
						// If the next message cannot be generated because of an error, the transaction is also done
						onError: { target: "done" },
					},
				},
				execute: {
					invoke: {
						id: "execute",
						src: "executeSerialAPICommand",
						onDone: {
							target: "executeDone",
							actions: "rememberCommandResult",
						},
						onError: {
							target: "executeDone",
							actions: "rememberCommandError",
						},
					},
				},
				abortSendData: {
					invoke: {
						id: "executeSendDataAbort",
						src: "executeSendDataAbort",
						onDone: "executeDone",
					},
				},
				executeDone: {
					always: {
						target: "idle",
						actions: "deleteCurrentMessage",
					},
				},
			},

			on: {
				// When a serial API machine is active, forward the message. Otherwise, return all messages as unsolicited.
				message: [
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
					{ actions: "notifyUnsolicited" },
				],
				unsolicited: [
					// The Serial API has determined this message to be unsolicited
					// Forward it to the SendThreadMachine
					{ actions: "notifyUnsolicited" },
				],

				// Forward low-level messages to the serial API command machine
				ACK: [
					// {
					// 	cond: "isAbortingWithTimeout",
					// 	actions: forwardTo("executeSendDataAbort"),
					// },
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
				],
				CAN: [
					// {
					// 	cond: "isAbortingWithTimeout",
					// 	actions: forwardTo("executeSendDataAbort"),
					// },
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
				],
				NAK: [
					// {
					// 	cond: "isAbortingWithTimeout",
					// 	actions: forwardTo("executeSendDataAbort"),
					// },
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
				],
			},
		},
		{
			actions: {
				deleteCurrentMessage: assign({
					current: undefined,
				}),
				rememberCommandResult: assign({
					prevResult: (ctx, evt: any) => evt.data,
				}),
				rememberCommandError: assign({
					prevResult: (_, evt: any) =>
						createMessageDroppedUnexpectedError(evt.data),
				}),
				notifyUnsolicited: (_, evt: any) => {
					implementations.notifyUnsolicited(evt.message);
				},
			},
			guards: {
				executeSuccessful: (_, evt: any) =>
					evt.data?.type === "success",
				hasMessage: (ctx, evt: any) => !!evt.data,
				isExecuting: (ctx, evt, meta) => meta.state.matches("execute"),
			},
			services: {
				// This service polls the queue for the next message to send. It also passes the result of the last command
				// so the generator can decide whether to continue or not.
				nextMessage: (ctx) => implementations.pollQueue(ctx.prevResult),
				executeSerialAPICommand: (ctx) => {
					try {
						return createSerialAPICommandMachine(
							ctx.current!,
							implementations,
							params,
						);
					} catch (e) {
						// If there is an error while creating the command machine (e.g. during message serialization)
						// wrap it in a rejected promise, so xstate can handle it
						implementations.log(
							`Unexpected error during SerialAPI command: ${getErrorMessage(
								e,
								true,
							)}`,
							"error",
						);
						return Promise.reject(e);
					}
				},
				// executeSendDataAbort: (_) =>
				// 	createSerialAPICommandMachine(
				// 		implementations.createSendDataAbort(),
				// 		implementations,
				// 		params,
				// 	),
			},
		},
	);

	return ret;
}

export type SendThreadMachineSlim = ReturnType<
	typeof createSendThreadMachineSlim
>;

export type SendThreadSlimInterpreter =
	InterpreterFromMachine<SendThreadMachineSlim>;
