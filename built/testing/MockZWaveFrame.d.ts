import type { ICommandClass } from "@zwave-js/core";
/**
 * Is used to simulate communication between a {@link MockController} and a {@link MockNode}.
 *
 */
export type MockZWaveFrame = MockZWaveRequestFrame | MockZWaveAckFrame;
export interface MockZWaveRequestFrame {
    type: MockZWaveFrameType.Request;
    /** The repeaters to use to reach the destination */
    repeaters: number[];
    /** Whether an ACK is requested from the destination */
    ackRequested: boolean;
    /** The Command Class contained in the frame */
    payload: ICommandClass;
}
export interface MockZWaveAckFrame {
    type: MockZWaveFrameType.ACK;
    /** Whether an ACK was received from the destination */
    ack: boolean;
    /** The repeaters used to reach the destination */
    repeaters: number[];
    /** If the transmission failed at a repeater, this contains the array index */
    failedHop?: number;
}
export declare enum MockZWaveFrameType {
    Request = 0,
    ACK = 1
}
export declare function createMockZWaveRequestFrame(payload: ICommandClass, options?: Partial<Omit<MockZWaveRequestFrame, "direction" | "payload">>): MockZWaveRequestFrame;
export declare function createMockZWaveAckFrame(options?: Partial<Omit<MockZWaveAckFrame, "direction" | "payload">>): MockZWaveAckFrame;
/** How long a Mock Node gets to ack a Z-Wave frame */
export declare const MOCK_FRAME_ACK_TIMEOUT = 1000;
//# sourceMappingURL=MockZWaveFrame.d.ts.map