/* eslint-disable @typescript-eslint/no-empty-function */
import type { ZWaveError } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import {
	assign,
	createMachine,
	Interpreter,
	MachineOptions,
	sendParent,
	StateMachine,
} from "xstate";
import { messageIsPing } from "../commandclass/NoOperationCC";
import { SendDataMulticastBridgeRequest } from "../serialapi/transport/SendDataBridgeMessages";
import { SendDataMulticastRequest } from "../serialapi/transport/SendDataMessages";
import {
	isSendData,
	isTransmitReport,
	SendDataMessage,
} from "../serialapi/transport/SendDataShared";
import type { CommandQueueEvent } from "./CommandQueueMachine";
import {
	createMessageDroppedUnexpectedError,
	sendDataErrorToZWaveError,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";

/*
	The command queue is a small wrapper around the Serial API Command Machine
	which does basic queue handling and aborts timed out send data commands.
	It does not care about node status etc.
*/

export interface TransactionMachineContext {
	transaction: Transaction;
	sendDataAttempts: number;
	result?: Message;
	error?: ZWaveError;
}

export type TransactionMachineEvent =
	| (CommandQueueEvent & { type: "command_success" })
	| (CommandQueueEvent & { type: "command_failure" })
	| (CommandQueueEvent & { type: "command_error" })
	| { type: "NIF"; nodeId: number }
	// Re-transmit the current message immediately
	| { type: "resend" }
	// Immediately stop the transaction
	| { type: "stop" };

const guards: NonNullable<
	MachineOptions<TransactionMachineContext, TransactionMachineEvent>["guards"]
> = {
	mayRetry: (ctx, evt: any) => {
		const msg = ctx.transaction.parts.current;
		if (!isSendData(msg)) return false;
		if (
			msg instanceof SendDataMulticastRequest ||
			msg instanceof SendDataMulticastBridgeRequest
		) {
			// Don't try to resend multicast messages if they were already transmitted.
			// One or more nodes might have already reacted
			if (evt.reason === "callback NOK") {
				return false;
			}
		}
		return msg.maxSendAttempts > ctx.sendDataAttempts;
	},
	currentMessageIsSendData: (ctx) =>
		isSendData(ctx.transaction.parts.current),
	currentTransactionIsPingForNode: (ctx, evt) => {
		const msg = ctx.transaction.parts.current;
		return (
			!!msg &&
			messageIsPing(msg) &&
			msg.getNodeId() === (evt as any).nodeId
		);
	},
	hasMessage: (ctx) => !!ctx.transaction.parts.current,
};

const every = (...guards: string[]) => ({
	type: "every",
	guards,
});

export type TransactionMachine = StateMachine<
	TransactionMachineContext,
	any,
	TransactionMachineEvent,
	any,
	any,
	any,
	any
>;

export type TransactionMachineInterpreter = Interpreter<
	TransactionMachineContext,
	any,
	TransactionMachineEvent
>;

export function createTransactionMachine(
	id: string,
	transaction: Transaction,
	implementations: ServiceImplementations,
): TransactionMachine {
	return createMachine<TransactionMachineContext, TransactionMachineEvent>(
		{
			preserveActionOrder: true,
			id,
			initial: "init",
			context: {
				transaction,
				sendDataAttempts: 0,
			},
			on: {
				NIF: {
					// Pings are not retransmitted and won't receive a response if the node wake up after the ping was sent
					// Therefore resolve pending pings so the communication may proceed immediately
					cond: "currentTransactionIsPingForNode",
					actions: "resolvePing",
					target: "done",
					internal: true,
				},
				resend: {
					// The driver asked to re-transmit the current message again immediately
					// without increasing the retry counter
					target: "execute",
					internal: true,
				},
				stop: "done",
			},
			states: {
				init: {
					always: {
						actions: "startTransaction",
						target: "nextMessage",
					},
				},
				// The following states are repeated for every message in this transaction
				nextMessage: {
					invoke: {
						// The message generator asynchronously generates a new message to send
						// or undefined if it has reached the end. Invoking this promise doubles
						// as waiting for the node response without introducing additional states
						id: "nextMessage",
						src: "nextMessage",
						onDone: [
							{
								cond: "hasMessage",
								target: "attemptMessage",
								// Each newly generated message gets its own sendData attempts
								actions: "resetSendDataAttempts",
							},
							// When the transaction generator is empty, we're done with this transaction
							{ target: "done" },
						],
						// If the next message cannot be generated because of an error, the transaction is also done
						onError: { target: "done" },
					},
				},
				// Increase send data counter before sending the message
				attemptMessage: {
					always: [
						{
							cond: "currentMessageIsSendData",
							actions: "incrementSendDataAttempts",
							target: "execute",
						},
						{
							target: "execute",
						},
					],
				},
				execute: {
					entry: "sendToCommandQueue",
					on: {
						command_success: [
							// On success, resolve the transaction and wait for the driver's GO for the next one
							{
								actions: "rememberCommandSuccess",
								target: "nextMessage",
							},
						],
						command_failure: [
							// On failure, retry SendData commands if possible
							{
								cond: every(
									"currentMessageIsSendData",
									"mayRetry",
								),
								target: "retryWait",
							},
							// Otherwise reject the transaction
							{
								actions: "rememberCommandFailure",
								target: "nextMessage",
							},
						],
						command_error: [
							// On failure, retry SendData commands if possible
							{
								cond: every(
									"currentMessageIsSendData",
									"mayRetry",
								),
								target: "retryWait",
							},
							// Otherwise reject the transaction
							{
								actions: "rememberCommandError",
								target: "nextMessage",
							},
						],
					},
				},
				retryWait: {
					invoke: {
						id: "notify",
						src: "notifyRetry",
					},
					after: {
						500: "attemptMessage",
					},
				},
				done: {
					type: "final",
					// Notify the parent machine so it can clean up
					entry: sendParent({
						type: "transaction_done",
						id,
					}),
				},
			},
		},
		{
			actions: {
				startTransaction: (ctx) => {
					ctx.transaction.parts.start();
				},
				resetSendDataAttempts: assign({
					sendDataAttempts: (_) => 0,
				}),
				incrementSendDataAttempts: assign({
					sendDataAttempts: (ctx) => ctx.sendDataAttempts + 1,
				}),
				sendToCommandQueue: sendParent((ctx) => ({
					type: "forward",
					to: "QUEUE",
					from: id,
					payload: {
						type: "add",
						transaction: ctx.transaction,
					},
				})),
				resolvePing: (ctx) => {
					// To resolve a ping, exit the message generator early by throwing something that's not an error
					ctx.transaction.parts
						.self!.throw(undefined as any)
						.catch(() => {});
				},
				rememberCommandSuccess: assign({
					result: (_, evt: any) => evt.result,
					error: (_) => undefined,
				}),
				rememberCommandFailure: assign((ctx, evt: any) => {
					// For messages that were sent to a node, a NOK callback still contains useful info we need to evaluate
					if (
						(isSendData(ctx.transaction.parts.current) ||
							isTransmitReport(evt.result)) &&
						evt.reason === "callback NOK"
					) {
						return {
							...ctx,
							result: evt.result,
							error: undefined,
						};
					} else {
						return {
							...ctx,
							result: undefined,
							error: sendDataErrorToZWaveError(
								evt.reason,
								ctx.transaction,
								evt.result,
							),
						};
					}
				}),
				rememberCommandError: assign({
					result: (_) => undefined,
					error: (_, evt: any) =>
						createMessageDroppedUnexpectedError(evt.error),
				}),
				unsetCommandResult: assign({
					result: (_) => undefined,
					error: (_) => undefined,
				}),
			},
			services: {
				// This service is used to return something to the yielded message generator
				// Depending on the outcome of the last command, the generator will either be thrown or continued with the result
				nextMessage: (ctx: TransactionMachineContext) => {
					if (ctx.error) {
						implementations.rejectTransaction(
							ctx.transaction,
							ctx.error,
						);
						return Promise.resolve();
					} else {
						// self can be undefined if the transaction was expired while in flight
						// In that case, resolve to nothing immediately to end the Transaction machine
						return (
							ctx.transaction.parts.self?.next(
								ctx.result as any,
							) ?? Promise.resolve()
						);
					}
				},
				notifyRetry: (ctx) => {
					implementations.notifyRetry?.(
						"SendData",
						undefined,
						ctx.transaction.message,
						ctx.sendDataAttempts,
						(ctx.transaction.message as SendDataMessage)
							.maxSendAttempts,
						500,
					);
					return Promise.resolve();
				},
			},
			guards: {
				...guards,
				every: (ctx, event, { cond }) => {
					const keys = (cond as any).guards as string[];
					return keys.every((guardKey: string) =>
						guards[guardKey]?.(ctx, event, undefined as any),
					);
				},
			},
			delays: {},
		},
	);
}
