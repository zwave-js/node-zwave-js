"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const core_1 = require("@zwave-js/core");
const comparable_1 = require("alcalzone-shared/comparable");
const _Types_1 = require("../node/_Types");
/**
 * Transactions are used to track and correlate messages with their responses.
 */
class Transaction {
    constructor(driver, options) {
        this.driver = driver;
        this.options = options;
        /** Will be resolved/rejected by the Send Thread Machine when the entire transaction is handled */
        this.promise = this.options.promise;
        /** The "primary" message this transaction contains, e.g. the un-encapsulated version of a SendData request */
        this.message = this.options.message;
        /** The message generator to create the actual messages for this transaction */
        this.parts = this.options.parts;
        /** The priority of this transaction */
        this.priority = this.options.priority;
        /** The timestamp at which the transaction was created */
        this.creationTimestamp = (0, core_1.highResTimestamp)();
        /** Whether the node status should be updated when this transaction times out */
        this.changeNodeStatusOnTimeout = true;
        /** Whether the send thread MUST be paused after this transaction was handled */
        this.pauseSendThread = false;
        /** If a Wake Up On Demand should be requested for the target node. */
        this.requestWakeUpOnDemand = false;
        // Give the message generator a reference to this transaction
        options.parts.parent = this;
        // We need create the stack on a temporary object or the Error
        // class will try to print the message
        const tmp = { message: "" };
        Error.captureStackTrace(tmp, Transaction);
        this._stack = tmp.stack.replace(/^Error:?\s*\n/, "");
    }
    clone() {
        const ret = new Transaction(this.driver, this.options);
        for (const prop of [
            "_stack",
            "creationTimestamp",
            "changeNodeStatusOnTimeout",
            "pauseSendThread",
            "requestWakeUpOnDemand",
        ]) {
            ret[prop] = this[prop];
        }
        return ret;
    }
    /**
     * Returns the current message of this transaction. This is either the currently active partial message
     * or the primary message if the generator hasn't been started yet.
     */
    getCurrentMessage() {
        return this.parts.current ?? this.message;
    }
    get stack() {
        return this._stack;
    }
    /** Compares two transactions in order to plan their transmission sequence */
    compareTo(other) {
        const compareWakeUpPriority = (_this, _other) => {
            const thisNode = _this.message.getNodeUnsafe(this.driver);
            const otherNode = _other.message.getNodeUnsafe(this.driver);
            // We don't require existence of the node object
            // If any transaction is not for a node, it targets the controller
            // which is always awake
            const thisIsAsleep = thisNode?.status === _Types_1.NodeStatus.Asleep;
            const otherIsAsleep = otherNode?.status === _Types_1.NodeStatus.Asleep;
            // If both nodes are asleep, the conventional order applies
            // Asleep nodes always have the lowest priority
            if (thisIsAsleep && !otherIsAsleep)
                return 1;
            if (otherIsAsleep && !thisIsAsleep)
                return -1;
        };
        // delay messages for sleeping nodes
        if (this.priority === core_1.MessagePriority.WakeUp) {
            const result = compareWakeUpPriority(this, other);
            if (result != undefined)
                return result;
        }
        else if (other.priority === core_1.MessagePriority.WakeUp) {
            const result = compareWakeUpPriority(other, this);
            if (result != undefined)
                return -result;
        }
        const compareNodeQueryPriority = (_this, _other) => {
            const thisNode = _this.message.getNodeUnsafe(this.driver);
            const otherNode = _other.message.getNodeUnsafe(this.driver);
            if (thisNode && otherNode) {
                // Both nodes exist
                const thisListening = thisNode.isListening || thisNode.isFrequentListening;
                const otherListening = otherNode.isListening || otherNode.isFrequentListening;
                // prioritize (-1) the one node that is listening when the other is not
                if (thisListening && !otherListening)
                    return -1;
                if (!thisListening && otherListening)
                    return 1;
            }
        };
        // delay NodeQuery messages for non-listening nodes
        if (this.priority === core_1.MessagePriority.NodeQuery) {
            const result = compareNodeQueryPriority(this, other);
            if (result != undefined)
                return result;
        }
        else if (other.priority === core_1.MessagePriority.NodeQuery) {
            const result = compareNodeQueryPriority(other, this);
            if (result != undefined)
                return -result;
        }
        // by default, sort by priority
        if (this.priority < other.priority)
            return -1;
        else if (this.priority > other.priority)
            return 1;
        // for equal priority, sort by the timestamp
        return (0, comparable_1.compareNumberOrString)(other.creationTimestamp, this.creationTimestamp);
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=Transaction.js.map