"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransportServiceRXMachine = void 0;
const xstate_1 = require("xstate");
const receiveSegment = (0, xstate_1.assign)((ctx, evt) => {
    ctx.receivedSegments[evt.index] = true;
    return ctx;
});
function createTransportServiceRXMachine(implementations, params) {
    return (0, xstate_1.Machine)({
        id: "TransportServiceRX",
        initial: "waitingForSegment",
        context: {
            receivedSegments: [
                // When the machine is started, we've already received the first segment
                true,
                // The rest of the segments are still missing
                ...Array.from({
                    length: params.numSegments - 1,
                }).fill(false),
            ],
        },
        states: {
            waitingForSegment: {
                always: [
                    {
                        cond: "isComplete",
                        target: "segmentsComplete",
                    },
                    {
                        cond: "hasHole",
                        target: "segmentTimeout",
                    },
                ],
                after: {
                    missingSegment: "segmentTimeout",
                },
                on: {
                    segment: {
                        actions: receiveSegment,
                        target: "waitingForSegment",
                        internal: false,
                    },
                },
            },
            segmentTimeout: {
                invoke: {
                    id: "requestMissing",
                    src: "requestMissingSegment",
                    onDone: {
                        target: "waitingForRequestedSegment",
                    },
                    onError: {
                        target: "failure",
                    },
                },
            },
            waitingForRequestedSegment: {
                after: {
                    missingSegment: "failure",
                },
                on: {
                    segment: {
                        actions: receiveSegment,
                        target: "waitingForSegment",
                        internal: false,
                    },
                },
            },
            segmentsComplete: {
                invoke: {
                    id: "segmentsComplete",
                    src: "sendSegmentsComplete",
                    onDone: {
                        target: "success",
                    },
                    onError: {
                        // If sending the command fails, the node will send us the segment again
                        target: "success",
                    },
                },
            },
            success: {
                type: "final",
                on: {
                    segment: "segmentsComplete",
                },
            },
            failure: {
                type: "final",
            },
        },
    }, {
        services: {
            requestMissingSegment: (ctx) => {
                return implementations.requestMissingSegment(ctx.receivedSegments.indexOf(false));
            },
            sendSegmentsComplete: () => {
                return implementations.sendSegmentsComplete();
            },
        },
        guards: {
            isComplete: (ctx) => ctx.receivedSegments.every(Boolean),
            hasHole: (ctx) => ctx.receivedSegments.lastIndexOf(true) >
                ctx.receivedSegments.indexOf(false),
        },
        delays: {
            missingSegment: params.missingSegmentTimeout,
        },
    });
}
exports.createTransportServiceRXMachine = createTransportServiceRXMachine;
//# sourceMappingURL=TransportServiceMachine.js.map