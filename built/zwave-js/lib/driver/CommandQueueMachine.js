"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommandQueueMachine = void 0;
const shared_1 = require("@zwave-js/shared");
const sorted_list_1 = require("alcalzone-shared/sorted-list");
const xstate_1 = require("xstate");
const actions_1 = require("xstate/lib/actions");
const SendDataShared_1 = require("../serialapi/transport/SendDataShared");
const SerialAPICommandMachine_1 = require("./SerialAPICommandMachine");
const StateMachineShared_1 = require("./StateMachineShared");
const setCurrentTransaction = (0, xstate_1.assign)((ctx) => ({
    ...ctx,
    currentTransaction: ctx.queue.shift(),
}));
const deleteCurrentTransaction = (0, xstate_1.assign)((ctx) => {
    ctx.callbackIDs.delete(ctx.currentTransaction);
    return {
        ...ctx,
        currentTransaction: undefined,
    };
});
const stopTransaction = (0, actions_1.sendParent)((ctx, evt) => ({
    type: "forward",
    from: "QUEUE",
    to: ctx.callbackIDs.get(evt.transaction),
    payload: {
        type: "stop",
    },
}));
const removeFromQueue = (0, xstate_1.assign)((ctx, evt) => {
    ctx.queue.remove(evt.transaction);
    ctx.callbackIDs.delete(evt.transaction);
    return ctx;
});
const stopAbortMachine = (0, actions_1.pure)((ctx) => {
    const ret = [];
    if (ctx.abortActor) {
        ret.push((0, actions_1.stop)(ctx.abortActor.id));
    }
    ret.push((0, xstate_1.assign)({ abortActor: (_) => undefined }));
    return ret;
});
const notifyResult = (0, actions_1.sendParent)((ctx, evt) => ({
    type: "forward",
    from: "QUEUE",
    to: ctx.callbackIDs.get(ctx.currentTransaction),
    payload: {
        ...evt.data,
        type: evt.data.type === "success" ? "command_success" : "command_failure",
    },
}));
const notifyError = (0, actions_1.sendParent)((ctx, evt) => ({
    type: "forward",
    from: "QUEUE",
    to: ctx.callbackIDs.get(ctx.currentTransaction),
    payload: {
        type: "command_error",
        error: evt.data,
        transaction: ctx.currentTransaction,
    },
}));
function createCommandQueueMachine(implementations, params) {
    const spawnAbortMachine = (0, xstate_1.assign)({
        abortActor: (_) => (0, xstate_1.spawn)((0, SerialAPICommandMachine_1.createSerialAPICommandMachine)(implementations.createSendDataAbort(), implementations, params)),
    });
    return (0, xstate_1.Machine)({
        preserveActionOrder: true,
        id: "CommandQueue",
        initial: "idle",
        context: {
            queue: new sorted_list_1.SortedList(),
            callbackIDs: new WeakMap(),
            // currentTransaction: undefined,
        },
        on: {
            add: {
                actions: [
                    (0, xstate_1.assign)((ctx, evt) => {
                        ctx.queue.add(evt.transaction);
                        ctx.callbackIDs.set(evt.transaction, evt.from);
                        return ctx;
                    }),
                    (0, actions_1.raise)("trigger"),
                ],
            },
            // What to do when removing transactions depends on their state
            remove: [
                // Abort ongoing SendData commands when the transaction is removed. The transaction machine will
                // stop on its own
                {
                    cond: "isCurrentTransactionAndSendData",
                    actions: [spawnAbortMachine, stopTransaction],
                },
                // If the transaction to remove is the current transaction, but not SendData
                // we can't just end it because it would risk putting the driver and stick out of sync
                {
                    cond: "isNotCurrentTransaction",
                    actions: [stopTransaction, removeFromQueue],
                },
            ],
            // Then a serial API machine is active, forward the message. Otherwise, return all messages as unsolicited.
            message: [
                {
                    cond: "isExecuting",
                    actions: (0, actions_1.forwardTo)("execute"),
                },
                { actions: StateMachineShared_1.notifyUnsolicited },
            ],
            unsolicited: [
                // The Serial API has determined this message to be unsolicited
                // Forward it to the SendThreadMachine
                { actions: StateMachineShared_1.notifyUnsolicited },
            ],
            // Forward low-level messages to the correct actor
            ACK: [
                {
                    cond: "isAbortingInFlight",
                    actions: (0, actions_1.forwardTo)((ctx) => ctx.abortActor),
                },
                {
                    cond: "isAbortingWithTimeout",
                    actions: (0, actions_1.forwardTo)("executeSendDataAbort"),
                },
                {
                    cond: "isExecuting",
                    actions: (0, actions_1.forwardTo)("execute"),
                },
            ],
            CAN: [
                {
                    cond: "isAbortingInFlight",
                    actions: (0, actions_1.forwardTo)((ctx) => ctx.abortActor),
                },
                {
                    cond: "isAbortingWithTimeout",
                    actions: (0, actions_1.forwardTo)("executeSendDataAbort"),
                },
                {
                    cond: "isExecuting",
                    actions: (0, actions_1.forwardTo)("execute"),
                },
            ],
            NAK: [
                {
                    cond: "isAbortingInFlight",
                    actions: (0, actions_1.forwardTo)((ctx) => ctx.abortActor),
                },
                {
                    cond: "isAbortingWithTimeout",
                    actions: (0, actions_1.forwardTo)("executeSendDataAbort"),
                },
                {
                    cond: "isExecuting",
                    actions: (0, actions_1.forwardTo)("execute"),
                },
            ],
        },
        states: {
            idle: {
                entry: deleteCurrentTransaction,
                on: {
                    trigger: "idle",
                },
                always: {
                    target: "execute",
                    actions: setCurrentTransaction,
                    cond: "queueNotEmpty",
                },
            },
            execute: {
                invoke: {
                    id: "execute",
                    src: "executeSerialAPICommand",
                    onDone: [
                        // If the transition was aborted in flight, just silently ignore
                        // the result. The transaction was meant to be dropped or will be
                        // rejected anyways.
                        {
                            cond: "isAbortingInFlight",
                            target: "executeDone",
                        },
                        // On success, forward the response to our parent machine
                        {
                            cond: "executeSuccessful",
                            actions: notifyResult,
                            target: "executeDone",
                        },
                        // On failure, abort timed out send attempts
                        {
                            cond: "isSendDataWithCallbackTimeout",
                            target: "abortSendData",
                            actions: notifyResult,
                        },
                        // And just notify the parent about other failures
                        {
                            target: "executeDone",
                            actions: notifyResult,
                        },
                    ],
                    onError: {
                        target: "executeDone",
                        actions: notifyError,
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
                    actions: [
                        // Delete the current transaction after we're done
                        deleteCurrentTransaction,
                        stopAbortMachine,
                    ],
                },
            },
        },
    }, {
        services: {
            executeSerialAPICommand: (ctx) => {
                try {
                    return (0, SerialAPICommandMachine_1.createSerialAPICommandMachine)(ctx.currentTransaction.parts.current, implementations, params);
                }
                catch (e) {
                    // If there is an error while creating the command machine (e.g. during message serialization)
                    // wrap it in a rejected promise, so xstate can handle it
                    implementations.log(`Unexpected error during SerialAPI command: ${(0, shared_1.getErrorMessage)(e, true)}`, "error");
                    return Promise.reject(e);
                }
            },
            executeSendDataAbort: (_) => (0, SerialAPICommandMachine_1.createSerialAPICommandMachine)(implementations.createSendDataAbort(), implementations, params),
        },
        guards: {
            executeSuccessful: (_, evt) => evt.data?.type === "success",
            queueNotEmpty: (ctx) => ctx.queue.length > 0,
            isNotCurrentTransaction: (ctx, evt) => ctx.currentTransaction !== evt.transaction,
            isCurrentTransactionAndSendData: (ctx, evt) => ctx.currentTransaction === evt.transaction &&
                (0, SendDataShared_1.isSendData)(evt.transaction.message),
            currentTransactionIsSendData: (ctx) => (0, SendDataShared_1.isSendData)(ctx.currentTransaction?.parts.current),
            isSendDataWithCallbackTimeout: (ctx, evt) => {
                return ((0, SendDataShared_1.isSendData)(ctx.currentTransaction?.parts.current) &&
                    evt.data?.type === "failure" &&
                    evt.data?.reason === "callback timeout");
            },
            isExecuting: (ctx, evt, meta) => meta.state.matches("execute"),
            isAbortingWithTimeout: (ctx, evt, meta) => meta.state.matches("abortSendData"),
            isAbortingInFlight: (ctx) => ctx.abortActor != undefined,
        },
        delays: {},
    });
}
exports.createCommandQueueMachine = createCommandQueueMachine;
//# sourceMappingURL=CommandQueueMachine.js.map