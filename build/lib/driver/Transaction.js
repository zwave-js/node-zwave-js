"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comparable_1 = require("alcalzone-shared/comparable");
const Constants_1 = require("../message/Constants");
const Node_1 = require("../node/Node");
/** Returns a timestamp with nano-second precision */
function highResTimestamp() {
    const [s, ns] = process.hrtime();
    return s * 1e9 + ns;
}
class Transaction {
    constructor(driver, message, promise, priority, timestamp = highResTimestamp(), ackPending = true, response, retries = 0) {
        this.driver = driver;
        this.message = message;
        this.promise = promise;
        this.priority = priority;
        this.timestamp = timestamp;
        this.ackPending = ackPending;
        this.response = response;
        this.retries = retries;
    }
    compareTo(other) {
        // first sort by priority
        if (this.priority < other.priority)
            return -1;
        else if (this.priority > other.priority)
            return 1;
        // delay node queries for sleeping devices
        if (this.priority === Constants_1.MessagePriority.NodeQuery) {
            const thisNodeId = Node_1.getNodeId(this.message);
            const otherNodeId = Node_1.getNodeId(other.message);
            if (thisNodeId != null && otherNodeId != null) {
                // Both messages contain a node ID
                const thisNode = this.driver.controller.nodes.get(thisNodeId);
                const otherNode = this.driver.controller.nodes.get(otherNodeId);
                if (thisNode != null && otherNode != null) {
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
        }
        // for equal priority, sort by the timestamp
        return comparable_1.compareNumberOrString(other.timestamp, this.timestamp);
        // TODO: do we need to sort by the message itself?
    }
}
exports.Transaction = Transaction;
