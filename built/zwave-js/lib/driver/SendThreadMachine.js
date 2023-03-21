"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSendThreadMachine = void 0;
const NoOperationCC_1 = require("@zwave-js/cc/NoOperationCC");
const core_1 = require("@zwave-js/core");
const sorted_list_1 = require("alcalzone-shared/sorted-list");
const xstate_1 = require("xstate");
const actions_1 = require("xstate/lib/actions");
const _Types_1 = require("../node/_Types");
const CommandQueueMachine_1 = require("./CommandQueueMachine");
const TransactionMachine_1 = require("./TransactionMachine");
const finalizeTransaction = (0, actions_1.pure)((ctx, evt) => [
    (0, actions_1.stop)(evt.id),
    (0, xstate_1.assign)((ctx) => {
        // Pause the send thread if necessary
        const transaction = ctx.activeTransactions.get(evt.id)?.transaction;
        if (transaction?.pauseSendThread)
            ctx.paused = true;
        // Remove the last reference to the actor
        ctx.activeTransactions.delete(evt.id);
        return ctx;
    }),
]);
const forwardToCommandQueue = (0, xstate_1.forwardTo)((ctx) => ctx.commandQueue);
const sortQueue = (0, xstate_1.assign)({
    queue: (ctx) => {
        const queue = ctx.queue;
        const items = [...queue];
        queue.clear();
        // Since the send queue is a sorted list, sorting is done on insert/add
        queue.add(...items);
        return queue;
    },
});
const guards = {
    mayStartTransaction: (ctx, evt, meta) => {
        // We may not send anything if the send thread is paused
        if (ctx.paused)
            return false;
        const nextTransaction = ctx.queue.peekStart();
        // We can't send anything if the queue is empty
        if (!nextTransaction)
            return false;
        const message = nextTransaction.message;
        const targetNode = message.getNodeUnsafe(nextTransaction.driver);
        // The send queue is sorted automatically. If the first message is for a sleeping node, all messages in the queue are.
        // There are a few exceptions:
        // 1. Pings may be used to determine whether a node is really asleep.
        // 2. Responses to nonce requests must be sent independent of the node status, because some sleeping nodes may try to send us encrypted messages.
        //    If we don't send them, they block the send queue
        // 3. Nodes that can sleep but do not support wakeup: https://github.com/zwave-js/node-zwave-js/discussions/1537
        //    We need to try and send messages to them even if they are asleep, because we might never hear from them
        // While the queue is busy, we may not start any transaction, except nonce responses to the node we're currently communicating with
        if (meta.state.matches("busy")) {
            if (nextTransaction.priority === core_1.MessagePriority.Nonce) {
                for (const active of ctx.activeTransactions.values()) {
                    if (active.transaction.message.getNodeId() ===
                        nextTransaction.message.getNodeId()) {
                        return true;
                    }
                }
            }
            return false;
        }
        // While not busy, always reply to nonce requests and Supervision Get requests
        if (nextTransaction.priority === core_1.MessagePriority.Nonce ||
            nextTransaction.priority === core_1.MessagePriority.Supervision) {
            return true;
        }
        // And send pings
        if ((0, NoOperationCC_1.messageIsPing)(message))
            return true;
        // Or controller messages
        if (!targetNode)
            return true;
        return (targetNode.status !== _Types_1.NodeStatus.Asleep ||
            (!targetNode.supportsCC(core_1.CommandClasses["Wake Up"]) &&
                targetNode.interviewStage >= _Types_1.InterviewStage.NodeInfo));
    },
    hasNoActiveTransactions: (ctx) => ctx.activeTransactions.size === 0,
};
function createSendThreadMachine(implementations, params) {
    const notifyUnsolicited = (_, evt) => {
        implementations.notifyUnsolicited(evt.message);
    };
    const reduce = (0, actions_1.pure)((ctx, evt) => {
        const dropQueued = [];
        const stopActive = [];
        const requeue = [];
        const reduceTransaction = (transaction, source) => {
            const reducerResult = evt.reducer(transaction, source);
            switch (reducerResult.type) {
                case "drop":
                    (source === "queue" ? dropQueued : stopActive).push(transaction);
                    break;
                case "requeue":
                    if (reducerResult.priority != undefined) {
                        transaction.priority = reducerResult.priority;
                    }
                    if (reducerResult.tag != undefined) {
                        transaction.tag = reducerResult.tag;
                    }
                    if (source === "active")
                        stopActive.push(transaction);
                    requeue.push(transaction);
                    break;
                case "resolve":
                    implementations.resolveTransaction(transaction, reducerResult.message);
                    (source === "queue" ? dropQueued : stopActive).push(transaction);
                    break;
                case "reject":
                    implementations.rejectTransaction(transaction, new core_1.ZWaveError(reducerResult.message, reducerResult.code, undefined, transaction.stack));
                    (source === "queue" ? dropQueued : stopActive).push(transaction);
                    break;
            }
        };
        const { queue, activeTransactions } = ctx;
        for (const transaction of queue) {
            reduceTransaction(transaction, "queue");
        }
        for (const { transaction } of activeTransactions.values()) {
            reduceTransaction(transaction, "active");
        }
        // Now we know what to do with the transactions
        queue.remove(...dropQueued, ...requeue);
        queue.add(...requeue.map((t) => t.clone()));
        return [
            (0, xstate_1.assign)((ctx) => ({
                ...ctx,
                queue,
            })),
            ...stopActive.map((t) => (0, actions_1.send)({ type: "remove", transaction: t }, { to: ctx.commandQueue })),
        ];
    });
    const spawnTransaction = (0, xstate_1.assign)((ctx) => {
        const newCounter = (ctx.counter + 1) % 0xffffffff;
        const id = "T" + newCounter.toString(16).padStart(8, "0");
        const transaction = ctx.queue.shift();
        const machine = (0, xstate_1.spawn)((0, TransactionMachine_1.createTransactionMachine)(id, transaction, implementations), {
            name: id,
        });
        ctx.activeTransactions.set(id, { machine, transaction });
        return {
            ...ctx,
            counter: newCounter,
        };
    });
    const ret = (0, xstate_1.createMachine)({
        id: "SendThread",
        initial: "init",
        preserveActionOrder: true,
        context: {
            commandQueue: undefined,
            queue: new sorted_list_1.SortedList(),
            activeTransactions: new Map(),
            counter: 0,
            paused: false,
        },
        on: {
            // Forward low-level events and unidentified messages to the command queue
            ACK: { actions: forwardToCommandQueue },
            CAN: { actions: forwardToCommandQueue },
            NAK: { actions: forwardToCommandQueue },
            // messages may come back as "unsolicited", these might be expected updates
            // we need to run them through the serial API machine to avoid mismatches
            message: { actions: forwardToCommandQueue },
            // Forward NIFs to each transaction machine to resolve potential waiting pings
            NIF: {
                actions: (0, actions_1.pure)((ctx, evt) => {
                    const activeTransactionMachinesForNode = [
                        ...ctx.activeTransactions.values(),
                    ]
                        .filter(({ transaction }) => transaction.message.getNodeId() ===
                        evt.nodeId)
                        .map((a) => a.machine.id);
                    return [
                        ...activeTransactionMachinesForNode.map((id) => (0, actions_1.send)(evt, { to: id })),
                        // Sort the send queue and evaluate again whether the next message may be sent
                        sortQueue,
                        (0, actions_1.raise)("trigger"),
                    ];
                }),
            },
            // handle newly added messages
            add: {
                actions: [
                    (0, xstate_1.assign)({
                        queue: (ctx, evt) => {
                            ctx.queue.add(evt.transaction);
                            return ctx.queue;
                        },
                    }),
                    (0, actions_1.raise)("trigger"),
                ],
            },
            reduce: {
                // Reducing may reorder the queue, so raise a trigger afterwards
                actions: [reduce, (0, actions_1.raise)("trigger")],
            },
            // Return unsolicited messages to the driver
            unsolicited: {
                actions: notifyUnsolicited,
            },
            // Accept external commands to sort the queue
            sortQueue: {
                actions: [sortQueue, (0, actions_1.raise)("trigger")],
            },
            // Accept external commands to pause/unpause the send queue
            pause: {
                actions: [(0, xstate_1.assign)({ paused: () => true })],
            },
            unpause: {
                actions: [
                    (0, xstate_1.assign)({ paused: () => false }),
                    (0, actions_1.raise)("trigger"),
                ],
            },
            // forward events between child machinies
            forward: {
                actions: (0, actions_1.send)((_, evt) => ({ ...evt.payload, from: evt.from }), {
                    to: (_, evt) => evt.to,
                }),
            },
            // Stop transactions when they are done
            transaction_done: {
                actions: [finalizeTransaction, (0, actions_1.raise)("trigger")],
            },
        },
        states: {
            init: {
                entry: (0, xstate_1.assign)({
                    commandQueue: () => (0, xstate_1.spawn)((0, CommandQueueMachine_1.createCommandQueueMachine)(implementations, params), {
                        name: "QUEUE",
                    }),
                }),
                // Spawn the command queue when starting the send thread
                always: "idle",
            },
            // While idle, any transaction may be started
            idle: {
                id: "idle",
                always: {
                    cond: "mayStartTransaction",
                    // Use the first transaction in the queue as the current one
                    actions: spawnTransaction,
                    target: "busy",
                },
                on: {
                    // On trigger, re-evaluate the conditions to enter "busy"
                    trigger: { target: "idle" },
                },
            },
            // While busy, only nonces may be sent
            busy: {
                id: "busy",
                always: [
                    {
                        cond: "hasNoActiveTransactions",
                        target: "idle",
                    },
                    {
                        cond: "mayStartTransaction",
                        // Use the first transaction in the queue as the current one
                        actions: spawnTransaction,
                        target: "busy",
                    },
                ],
                on: {
                    // On trigger, re-evaluate the conditions to go spawn transactions or back to idle
                    trigger: { target: "busy" },
                },
            },
        },
    }, {
        guards: {
            ...guards,
            every: (ctx, event, { cond }) => {
                const keys = cond.guards;
                return keys.every((guardKey) => guards[guardKey]?.(ctx, event, undefined));
            },
        },
    });
    return ret;
}
exports.createSendThreadMachine = createSendThreadMachine;
//# sourceMappingURL=SendThreadMachine.js.map