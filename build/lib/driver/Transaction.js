"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comparable_1 = require("alcalzone-shared/comparable");
const Constants_1 = require("../message/Constants");
/** Returns a timestamp with nano-second precision */
function highResTimestamp() {
    const [s, ns] = process.hrtime();
    return s * 1e9 + ns;
}
// The Z-Wave spec declare that maximum 3 send attempts may be performed
exports.MAX_SEND_ATTEMPTS = 3;
class Transaction {
    constructor(driver, message, promise, priority, timestamp = highResTimestamp(), ackPending = true, response) {
        this.driver = driver;
        this.message = message;
        this.promise = promise;
        this.priority = priority;
        this.timestamp = timestamp;
        this.ackPending = ackPending;
        this.response = response;
        this._maxSendAttempts = exports.MAX_SEND_ATTEMPTS;
        /** The number of times the driver has tried to send this message */
        this.sendAttempts = 0;
        if (message != undefined)
            this.maxSendAttempts = message.maxSendAttempts;
    }
    /** The number of times the driver may try to send this message */
    get maxSendAttempts() {
        return this._maxSendAttempts;
    }
    set maxSendAttempts(value) {
        if (value > exports.MAX_SEND_ATTEMPTS)
            value = exports.MAX_SEND_ATTEMPTS;
        this._maxSendAttempts = value;
    }
    compareTo(other) {
        // delay messages for sleeping nodes
        if (this.priority === Constants_1.MessagePriority.WakeUp) {
            const thisNode = this.message.getNodeUnsafe();
            const otherNode = other.message.getNodeUnsafe();
            if (thisNode) {
                // We don't require existence of the other node. If the other
                // transaction is not for a node, it targets the controller which
                // is assumed always awake
                const thisIsAsleep = !thisNode.isAwake();
                const otherIsAsleep = !(otherNode && otherNode.isAwake());
                // If both nodes are asleep, the conventional order applies
                // Asleep nodes always have the lowest priority
                if (thisIsAsleep && !otherIsAsleep)
                    return 1;
                if (otherIsAsleep && !thisIsAsleep)
                    return -1;
            }
        }
        else if (other.priority === Constants_1.MessagePriority.WakeUp) {
            return -other.compareTo(this);
        }
        // delay NodeQuery messages for non-listening nodes
        if (this.priority === Constants_1.MessagePriority.NodeQuery) {
            const thisNode = this.message.getNodeUnsafe();
            const otherNode = other.message.getNodeUnsafe();
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
        }
        else if (other.priority === Constants_1.MessagePriority.NodeQuery) {
            return -other.compareTo(this);
        }
        // by default, sort by priority
        if (this.priority < other.priority)
            return -1;
        else if (this.priority > other.priority)
            return 1;
        // for equal priority, sort by the timestamp
        return comparable_1.compareNumberOrString(other.timestamp, this.timestamp);
        // TODO: do we need to sort by the message itself?
    }
}
exports.Transaction = Transaction;
