"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comparable_1 = require("../util/comparable");
/** Returns a timestamp with nano-second precision */
function highResTimestamp() {
    const [s, ns] = process.hrtime();
    return s * 1e9 + ns;
}
class Transaction {
    constructor(message, promise, priority, timestamp = highResTimestamp(), ackPending = true, response) {
        this.message = message;
        this.promise = promise;
        this.priority = priority;
        this.timestamp = timestamp;
        this.ackPending = ackPending;
        this.response = response;
    }
    compareTo(other) {
        // first sort by priority
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
