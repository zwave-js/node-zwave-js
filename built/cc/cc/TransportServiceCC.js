"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportServiceCCSegmentWait = exports.TransportServiceCCSegmentComplete = exports.TransportServiceCCSegmentRequest = exports.TransportServiceCCSubsequentSegment = exports.TransportServiceCCFirstSegment = exports.isTransportServiceEncapsulation = exports.TransportServiceCC = exports.TransportServiceTimeouts = exports.RELAXED_TIMING_THRESHOLD = exports.MAX_SEGMENT_SIZE = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
exports.MAX_SEGMENT_SIZE = 39;
exports.RELAXED_TIMING_THRESHOLD = 2;
// TODO: Figure out how we know if communicating with R2 or R3
/** @publicAPI */
exports.TransportServiceTimeouts = {
    /** Waiting time before requesting a missing segment at data rate R2 */
    requestMissingSegmentR2: 800,
    /** Waiting time before requesting a missing segment at data rate R3 */
    requestMissingSegmentR3: 400,
    /** Waiting time before sending another datagram at data rate R2 */
    segmentCompleteR2: 1000,
    /** Waiting time before sending another datagram at data rate R3 */
    segmentCompleteR3: 500,
    /** Waiting time between segments when sending more than {@link RELAXED_TIMING_THRESHOLD} segments at data rate R2 */
    relaxedTimingDelayR2: 35,
    /** Waiting time between segments when sending more than {@link RELAXED_TIMING_THRESHOLD} segments at data rate R3 */
    relaxedTimingDelayR3: 15,
};
let TransportServiceCC = class TransportServiceCC extends CommandClass_1.CommandClass {
    // Override the default helper method
    static getCCCommand(data) {
        const originalCCCommand = super.getCCCommand(data);
        // Transport Service only uses the higher 5 bits for the command
        return originalCCCommand & 248;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    deserialize(data) {
        const ret = super.deserialize(data);
        // Transport Service re-uses the lower 3 bits of the ccCommand as payload
        ret.payload = Buffer.concat([
            Buffer.from([ret.ccCommand & 0b111]),
            ret.payload,
        ]);
        return ret;
    }
    /** Encapsulates a command that should be sent in multiple segments */
    static encapsulate(_host, _cc) {
        throw new Error("not implemented");
    }
};
TransportServiceCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Transport Service"]),
    (0, CommandClassDecorators_1.implementedVersion)(2)
], TransportServiceCC);
exports.TransportServiceCC = TransportServiceCC;
/** @publicAPI */
function isTransportServiceEncapsulation(command) {
    return (command.ccId === safe_1.CommandClasses["Transport Service"] &&
        (command.ccCommand === _Types_1.TransportServiceCommand.FirstSegment ||
            command.ccCommand === _Types_1.TransportServiceCommand.SubsequentSegment));
}
exports.isTransportServiceEncapsulation = isTransportServiceEncapsulation;
let TransportServiceCCFirstSegment = class TransportServiceCCFirstSegment extends TransportServiceCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // Deserialization has already split the datagram size from the ccCommand.
            // Therefore we have one more payload byte
            (0, safe_1.validatePayload)(this.payload.length >= 6); // 2 bytes dgram size, 1 byte sessid/ext, 1+ bytes payload, 2 bytes checksum
            // Verify the CRC
            const headerBuffer = Buffer.from([
                this.ccId,
                this.ccCommand | this.payload[0],
            ]);
            const ccBuffer = this.payload.slice(1, -2);
            let expectedCRC = (0, safe_1.CRC16_CCITT)(headerBuffer);
            expectedCRC = (0, safe_1.CRC16_CCITT)(ccBuffer, expectedCRC);
            const actualCRC = this.payload.readUInt16BE(this.payload.length - 2);
            (0, safe_1.validatePayload)(expectedCRC === actualCRC);
            this.datagramSize = this.payload.readUInt16BE(0);
            this.sessionId = this.payload[2] >>> 4;
            let payloadOffset = 3;
            // If there is a header extension, read it
            const hasHeaderExtension = !!(this.payload[2] & 0b1000);
            if (hasHeaderExtension) {
                const extLength = this.payload[3];
                this.headerExtension = this.payload.slice(4, 4 + extLength);
                payloadOffset += 1 + extLength;
            }
            this.partialDatagram = this.payload.slice(payloadOffset, -2);
            // A node supporting the Transport Service Command Class, version 2
            // MUST NOT send Transport Service segments with the Payload field longer than 39 bytes.
            (0, safe_1.validatePayload)(this.partialDatagram.length <= exports.MAX_SEGMENT_SIZE);
        }
        else {
            this.datagramSize = options.datagramSize;
            this.sessionId = options.sessionId;
            this.headerExtension = options.headerExtension;
            this.partialDatagram = options.partialDatagram;
        }
    }
    serialize() {
        // Transport Service re-uses the lower 3 bits of the ccCommand as payload
        this.ccCommand =
            (this.ccCommand & 248) |
                ((this.datagramSize >>> 8) & 0b111);
        const ext = !!this.headerExtension && this.headerExtension.length >= 1;
        this.payload = Buffer.from([
            this.datagramSize & 0xff,
            ((this.sessionId & 0b1111) << 4) | (ext ? 0b1000 : 0),
        ]);
        if (ext) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([this.headerExtension.length]),
                this.headerExtension,
            ]);
        }
        this.payload = Buffer.concat([
            this.payload,
            this.partialDatagram,
            Buffer.alloc(2, 0), // checksum
        ]);
        // Compute and save the CRC16 in the payload
        // The CC header is included in the CRC computation
        const headerBuffer = Buffer.from([this.ccId, this.ccCommand]);
        let crc = (0, safe_1.CRC16_CCITT)(headerBuffer);
        crc = (0, safe_1.CRC16_CCITT)(this.payload.slice(0, -2), crc);
        // Write the checksum into the last two bytes of the payload
        this.payload.writeUInt16BE(crc, this.payload.length - 2);
        return super.serialize();
    }
    expectMoreMessages() {
        return true; // The FirstSegment message always expects more messages
    }
    getPartialCCSessionId() {
        // Only use the session ID to identify the session, not the CC command
        return { ccCommand: undefined, sessionId: this.sessionId };
    }
    computeEncapsulationOverhead() {
        // Transport Service CC (first segment) adds 1 byte datagram size, 1 byte Session ID/..., 2 bytes checksum and (0 OR n+1) bytes header extension
        return (super.computeEncapsulationOverhead() +
            4 +
            (this.headerExtension?.length ? 1 + this.headerExtension.length : 0));
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "session ID": this.sessionId,
                "datagram size": this.datagramSize,
                "byte range": `0...${this.partialDatagram.length - 1}`,
                payload: (0, safe_2.buffer2hex)(this.partialDatagram),
            },
        };
    }
};
TransportServiceCCFirstSegment = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TransportServiceCommand.FirstSegment)
    // @expectedCCResponse(TransportServiceCCReport)
], TransportServiceCCFirstSegment);
exports.TransportServiceCCFirstSegment = TransportServiceCCFirstSegment;
let TransportServiceCCSubsequentSegment = class TransportServiceCCSubsequentSegment extends TransportServiceCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // Deserialization has already split the datagram size from the ccCommand.
            // Therefore we have one more payload byte
            (0, safe_1.validatePayload)(this.payload.length >= 7); // 2 bytes dgram size, 1 byte sessid/ext/offset, 1 byte offset, 1+ bytes payload, 2 bytes checksum
            // Verify the CRC
            const headerBuffer = Buffer.from([
                this.ccId,
                this.ccCommand | this.payload[0],
            ]);
            const ccBuffer = this.payload.slice(1, -2);
            let expectedCRC = (0, safe_1.CRC16_CCITT)(headerBuffer);
            expectedCRC = (0, safe_1.CRC16_CCITT)(ccBuffer, expectedCRC);
            const actualCRC = this.payload.readUInt16BE(this.payload.length - 2);
            (0, safe_1.validatePayload)(expectedCRC === actualCRC);
            this.datagramSize = this.payload.readUInt16BE(0);
            this.sessionId = this.payload[2] >>> 4;
            this.datagramOffset =
                ((this.payload[2] & 0b111) << 8) + this.payload[3];
            let payloadOffset = 4;
            // If there is a header extension, read it
            const hasHeaderExtension = !!(this.payload[2] & 0b1000);
            if (hasHeaderExtension) {
                const extLength = this.payload[4];
                this.headerExtension = this.payload.slice(5, 5 + extLength);
                payloadOffset += 1 + extLength;
            }
            this.partialDatagram = this.payload.slice(payloadOffset, -2);
            // A node supporting the Transport Service Command Class, version 2
            // MUST NOT send Transport Service segments with the Payload field longer than 39 bytes.
            (0, safe_1.validatePayload)(this.partialDatagram.length <= exports.MAX_SEGMENT_SIZE);
        }
        else {
            this.datagramSize = options.datagramSize;
            this.datagramOffset = options.datagramOffset;
            this.sessionId = options.sessionId;
            this.headerExtension = options.headerExtension;
            this.partialDatagram = options.partialDatagram;
        }
    }
    get encapsulated() {
        return this._encapsulated;
    }
    expectMoreMessages(session) {
        if (!(session[0] instanceof TransportServiceCCFirstSegment)) {
            // First segment is missing
            return true;
        }
        const datagramSize = session[0].datagramSize;
        const chunkSize = session[0].partialDatagram.length;
        const received = new Array(Math.ceil(datagramSize / chunkSize)).fill(false);
        for (const segment of [...session, this]) {
            const offset = segment instanceof TransportServiceCCFirstSegment
                ? 0
                : segment.datagramOffset;
            received[offset / chunkSize] = true;
        }
        // Expect more messages as long as we haven't received everything
        return !received.every(Boolean);
    }
    getPartialCCSessionId() {
        // Only use the session ID to identify the session, not the CC command
        return { ccCommand: undefined, sessionId: this.sessionId };
    }
    mergePartialCCs(applHost, partials) {
        // Concat the CC buffers
        const datagram = Buffer.allocUnsafe(this.datagramSize);
        for (const partial of [...partials, this]) {
            // Ensure that we don't try to write out-of-bounds
            const offset = partial instanceof TransportServiceCCFirstSegment
                ? 0
                : partial.datagramOffset;
            if (offset + partial.partialDatagram.length > datagram.length) {
                throw new safe_1.ZWaveError(`The partial datagram offset and length in a segment are not compatible to the communicated datagram length`, safe_1.ZWaveErrorCodes.PacketFormat_InvalidPayload);
            }
            partial.partialDatagram.copy(datagram, offset);
        }
        // and deserialize the CC
        this._encapsulated = CommandClass_1.CommandClass.from(this.host, {
            data: datagram,
            fromEncapsulation: true,
            encapCC: this,
        });
    }
    serialize() {
        // Transport Service re-uses the lower 3 bits of the ccCommand as payload
        this.ccCommand =
            (this.ccCommand & 248) |
                ((this.datagramSize >>> 8) & 0b111);
        const ext = !!this.headerExtension && this.headerExtension.length >= 1;
        this.payload = Buffer.from([
            this.datagramSize & 0xff,
            ((this.sessionId & 0b1111) << 4) |
                (ext ? 0b1000 : 0) |
                ((this.datagramOffset >>> 8) & 0b111),
            this.datagramOffset & 0xff,
        ]);
        if (ext) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([this.headerExtension.length]),
                this.headerExtension,
            ]);
        }
        this.payload = Buffer.concat([
            this.payload,
            this.partialDatagram,
            Buffer.alloc(2, 0), // checksum
        ]);
        // Compute and save the CRC16 in the payload
        // The CC header is included in the CRC computation
        const headerBuffer = Buffer.from([this.ccId, this.ccCommand]);
        let crc = (0, safe_1.CRC16_CCITT)(headerBuffer);
        crc = (0, safe_1.CRC16_CCITT)(this.payload.slice(0, -2), crc);
        // Write the checksum into the last two bytes of the payload
        this.payload.writeUInt16BE(crc, this.payload.length - 2);
        return super.serialize();
    }
    computeEncapsulationOverhead() {
        // Transport Service CC (first segment) adds 1 byte datagram size, 1 byte Session ID/..., 1 byte offset, 2 bytes checksum and (0 OR n+1) bytes header extension
        return (super.computeEncapsulationOverhead() +
            5 +
            (this.headerExtension?.length ? 1 + this.headerExtension.length : 0));
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "session ID": this.sessionId,
                "datagram size": this.datagramSize,
                "byte range": `${this.datagramOffset}...${this.datagramOffset + this.partialDatagram.length - 1}`,
                payload: (0, safe_2.buffer2hex)(this.partialDatagram),
            },
        };
    }
};
TransportServiceCCSubsequentSegment = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TransportServiceCommand.SubsequentSegment)
    // @expectedCCResponse(TransportServiceCCReport)
], TransportServiceCCSubsequentSegment);
exports.TransportServiceCCSubsequentSegment = TransportServiceCCSubsequentSegment;
function testResponseForSegmentRequest(sent, received) {
    return ((sent.datagramOffset === 0 &&
        received instanceof TransportServiceCCFirstSegment &&
        received.sessionId === sent.sessionId) ||
        (sent.datagramOffset > 0 &&
            received instanceof TransportServiceCCSubsequentSegment &&
            sent.datagramOffset === received.datagramOffset &&
            received.sessionId === sent.sessionId));
}
let TransportServiceCCSegmentRequest = class TransportServiceCCSegmentRequest extends TransportServiceCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 3);
            this.sessionId = this.payload[1] >>> 4;
            this.datagramOffset =
                ((this.payload[1] & 0b111) << 8) + this.payload[2];
        }
        else {
            this.sessionId = options.sessionId;
            this.datagramOffset = options.datagramOffset;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            ((this.sessionId & 0b1111) << 4) |
                ((this.datagramOffset >>> 8) & 0b111),
            this.datagramOffset & 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "session ID": this.sessionId,
                offset: this.datagramOffset,
            },
        };
    }
};
TransportServiceCCSegmentRequest = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TransportServiceCommand.SegmentRequest),
    (0, CommandClassDecorators_1.expectedCCResponse)(TransportServiceCC, testResponseForSegmentRequest)
], TransportServiceCCSegmentRequest);
exports.TransportServiceCCSegmentRequest = TransportServiceCCSegmentRequest;
let TransportServiceCCSegmentComplete = class TransportServiceCCSegmentComplete extends TransportServiceCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.sessionId = this.payload[1] >>> 4;
        }
        else {
            this.sessionId = options.sessionId;
        }
    }
    serialize() {
        this.payload = Buffer.from([(this.sessionId & 0b1111) << 4]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "session ID": this.sessionId },
        };
    }
};
TransportServiceCCSegmentComplete = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TransportServiceCommand.SegmentComplete)
], TransportServiceCCSegmentComplete);
exports.TransportServiceCCSegmentComplete = TransportServiceCCSegmentComplete;
let TransportServiceCCSegmentWait = class TransportServiceCCSegmentWait extends TransportServiceCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.pendingSegments = this.payload[1];
        }
        else {
            this.pendingSegments = options.pendingSegments;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.pendingSegments]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "pending segments": this.pendingSegments },
        };
    }
};
TransportServiceCCSegmentWait = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TransportServiceCommand.SegmentWait)
], TransportServiceCCSegmentWait);
exports.TransportServiceCCSegmentWait = TransportServiceCCSegmentWait;
//# sourceMappingURL=TransportServiceCC.js.map