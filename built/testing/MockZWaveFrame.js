"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_FRAME_ACK_TIMEOUT = exports.createMockZWaveAckFrame = exports.createMockZWaveRequestFrame = exports.MockZWaveFrameType = void 0;
var MockZWaveFrameType;
(function (MockZWaveFrameType) {
    MockZWaveFrameType[MockZWaveFrameType["Request"] = 0] = "Request";
    MockZWaveFrameType[MockZWaveFrameType["ACK"] = 1] = "ACK";
})(MockZWaveFrameType = exports.MockZWaveFrameType || (exports.MockZWaveFrameType = {}));
function createMockZWaveRequestFrame(payload, options = {}) {
    const { repeaters = [], ackRequested = true } = options;
    return {
        type: MockZWaveFrameType.Request,
        repeaters,
        ackRequested,
        payload,
    };
}
exports.createMockZWaveRequestFrame = createMockZWaveRequestFrame;
function createMockZWaveAckFrame(options = {}) {
    const { repeaters = [], ack = true, failedHop } = options;
    return {
        type: MockZWaveFrameType.ACK,
        repeaters,
        ack,
        failedHop,
    };
}
exports.createMockZWaveAckFrame = createMockZWaveAckFrame;
/** How long a Mock Node gets to ack a Z-Wave frame */
exports.MOCK_FRAME_ACK_TIMEOUT = 1000;
//# sourceMappingURL=MockZWaveFrame.js.map