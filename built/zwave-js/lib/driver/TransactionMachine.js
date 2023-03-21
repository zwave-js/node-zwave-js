"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransactionMachine = void 0;
/* eslint-disable @typescript-eslint/no-empty-function */
const NoOperationCC_1 = require("@zwave-js/cc/NoOperationCC");
const xstate_1 = require("xstate");
const SendDataBridgeMessages_1 = require("../serialapi/transport/SendDataBridgeMessages");
const SendDataMessages_1 = require("../serialapi/transport/SendDataMessages");
const SendDataShared_1 = require("../serialapi/transport/SendDataShared");
const StateMachineShared_1 = require("./StateMachineShared");
const guards = {
    mayRetry: (ctx, evt) => {
        const msg = ctx.transaction.parts.current;
        if (!(0, SendDataShared_1.isSendData)(msg))
            return false;
        if (msg instanceof SendDataMessages_1.SendDataMulticastRequest ||
            msg instanceof SendDataBridgeMessages_1.SendDataMulticastBridgeRequest) {
            // Don't try to resend multicast messages if they were already transmitted.
            // One or more nodes might have already reacted
            if (evt.reason === "callback NOK") {
                return false;
            }
        }
        return msg.maxSendAttempts > ctx.sendDataAttempts;
    },
    currentMessageIsSendData: (ctx) => (0, SendDataShared_1.isSendData)(ctx.transaction.parts.current),
    currentTransactionIsPingForNode: (ctx, evt) => {
        const msg = ctx.transaction.parts.current;
        return (!!msg &&
            (0, NoOperationCC_1.messageIsPing)(msg) &&
            msg.getNodeId() === evt.nodeId);
    },
    hasMessage: (ctx) => !!ctx.transaction.parts.current,
};
const every = (...guards) => ({
    type: "every",
    guards,
});
function createTransactionMachine(id, transaction, implementations) {
    return (0, xstate_1.createMachine)({
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
                            cond: every("currentMessageIsSendData", "mayRetry"),
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
                            cond: every("currentMessageIsSendData", "mayRetry"),
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
                entry: (0, xstate_1.sendParent)({
                    type: "transaction_done",
                    id,
                }),
            },
        },
    }, {
        actions: {
            startTransaction: (ctx) => {
                ctx.transaction.parts.start();
            },
            resetSendDataAttempts: (0, xstate_1.assign)({
                sendDataAttempts: (_) => 0,
            }),
            incrementSendDataAttempts: (0, xstate_1.assign)({
                sendDataAttempts: (ctx) => ctx.sendDataAttempts + 1,
            }),
            sendToCommandQueue: (0, xstate_1.sendParent)((ctx) => ({
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
                    .self.throw(undefined)
                    .catch(() => { });
            },
            rememberCommandSuccess: (0, xstate_1.assign)({
                result: (_, evt) => evt.result,
                error: (_) => undefined,
            }),
            rememberCommandFailure: (0, xstate_1.assign)((ctx, evt) => {
                // For messages that were sent to a node, a NOK callback still contains useful info we need to evaluate
                if (((0, SendDataShared_1.isSendData)(ctx.transaction.parts.current) ||
                    (0, SendDataShared_1.isTransmitReport)(evt.result)) &&
                    evt.reason === "callback NOK") {
                    return {
                        ...ctx,
                        result: evt.result,
                        error: undefined,
                    };
                }
                else {
                    return {
                        ...ctx,
                        result: undefined,
                        error: (0, StateMachineShared_1.sendDataErrorToZWaveError)(evt.reason, ctx.transaction, evt.result),
                    };
                }
            }),
            rememberCommandError: (0, xstate_1.assign)({
                result: (_) => undefined,
                error: (_, evt) => (0, StateMachineShared_1.createMessageDroppedUnexpectedError)(evt.error),
            }),
            unsetCommandResult: (0, xstate_1.assign)({
                result: (_) => undefined,
                error: (_) => undefined,
            }),
        },
        services: {
            // This service is used to return something to the yielded message generator
            // Depending on the outcome of the last command, the generator will either be thrown or continued with the result
            nextMessage: (ctx) => {
                if (ctx.error) {
                    implementations.rejectTransaction(ctx.transaction, ctx.error);
                    return Promise.resolve();
                }
                else {
                    // self can be undefined if the transaction was expired while in flight
                    // In that case, resolve to nothing immediately to end the Transaction machine
                    return (ctx.transaction.parts.self?.next(ctx.result) ?? Promise.resolve());
                }
            },
            notifyRetry: (ctx) => {
                implementations.notifyRetry?.("SendData", undefined, ctx.transaction.message, ctx.sendDataAttempts, ctx.transaction.message
                    .maxSendAttempts, 500);
                return Promise.resolve();
            },
        },
        guards: {
            ...guards,
            every: (ctx, event, { cond }) => {
                const keys = cond.guards;
                return keys.every((guardKey) => guards[guardKey]?.(ctx, event, undefined));
            },
        },
        delays: {},
    });
}
exports.createTransactionMachine = createTransactionMachine;
//# sourceMappingURL=TransactionMachine.js.map