"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skipBytes = exports.SerialAPIParser = void 0;
const stream_1 = require("stream");
const MessageHeaders_1 = require("../MessageHeaders");
/**
 * Checks if there's enough data in the buffer to deserialize a complete message
 */
function containsCompleteMessage(data) {
    return !!data && data.length >= 5 && data.length >= getMessageLength(data);
}
/** Given a buffer that starts with SOF, this method returns the number of bytes the first message occupies in the buffer */
function getMessageLength(data) {
    const remainingLength = data[1];
    return remainingLength + 2;
}
class SerialAPIParser extends stream_1.Transform {
    constructor(logger, onDiscarded) {
        // We read byte streams but emit messages
        super({ readableObjectMode: true });
        this.logger = logger;
        this.onDiscarded = onDiscarded;
        this.receiveBuffer = Buffer.allocUnsafe(0);
    }
    _transform(chunk, encoding, callback) {
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);
        while (this.receiveBuffer.length > 0) {
            if (this.receiveBuffer[0] !== MessageHeaders_1.MessageHeaders.SOF) {
                let skip = 1;
                switch (this.receiveBuffer[0]) {
                    // Emit the single-byte messages directly
                    case MessageHeaders_1.MessageHeaders.ACK: {
                        this.logger?.ACK("inbound");
                        this.push(MessageHeaders_1.MessageHeaders.ACK);
                        break;
                    }
                    case MessageHeaders_1.MessageHeaders.NAK: {
                        this.logger?.NAK("inbound");
                        this.push(MessageHeaders_1.MessageHeaders.NAK);
                        break;
                    }
                    case MessageHeaders_1.MessageHeaders.CAN: {
                        this.logger?.CAN("inbound");
                        this.push(MessageHeaders_1.MessageHeaders.CAN);
                        break;
                    }
                    default: {
                        // INS12350: A host or a Z-Wave chip waiting for new traffic MUST ignore all other
                        // byte values than 0x06 (ACK), 0x15 (NAK), 0x18 (CAN) or 0x01 (Data frame).
                        // Scan ahead until the next valid byte and log the invalid bytes
                        while (skip < this.receiveBuffer.length) {
                            const byte = this.receiveBuffer[skip];
                            if (byte === MessageHeaders_1.MessageHeaders.SOF ||
                                byte === MessageHeaders_1.MessageHeaders.ACK ||
                                byte === MessageHeaders_1.MessageHeaders.NAK ||
                                byte === MessageHeaders_1.MessageHeaders.CAN) {
                                // Next byte is valid, keep it
                                break;
                            }
                            skip++;
                        }
                        const discarded = this.receiveBuffer.slice(0, skip);
                        this.logger?.discarded(discarded);
                        this.onDiscarded?.(discarded);
                    }
                }
                // Continue with the next valid byte
                this.receiveBuffer = skipBytes(this.receiveBuffer, skip);
                continue;
            }
            if (!containsCompleteMessage(this.receiveBuffer)) {
                // The buffer contains no complete message, we're done here for now
                break;
            }
            else {
                // We have at least one complete message
                const msgLength = getMessageLength(this.receiveBuffer);
                // emit it and slice the read bytes from the buffer
                const msg = this.receiveBuffer.slice(0, msgLength);
                this.receiveBuffer = skipBytes(this.receiveBuffer, msgLength);
                this.logger?.data("inbound", msg);
                this.push(msg);
            }
        }
        callback();
    }
}
exports.SerialAPIParser = SerialAPIParser;
/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf, n) {
    return Buffer.from(buf.slice(n));
}
exports.skipBytes = skipBytes;
//# sourceMappingURL=SerialAPIParser.js.map