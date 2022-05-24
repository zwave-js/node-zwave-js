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
	/** The payload contained in the frame */
	payload: Buffer;
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

export enum MockZWaveFrameType {
	Request,
	ACK,
}

export function createMockZWaveRequestFrame(
	payload: Buffer,
	options: Partial<Omit<MockZWaveRequestFrame, "direction" | "payload">> = {},
): MockZWaveRequestFrame {
	const { repeaters = [], ackRequested = true } = options;
	return {
		type: MockZWaveFrameType.Request,
		repeaters,
		ackRequested,
		payload,
	};
}

export function createMockZWaveAckFrame(
	options: Partial<Omit<MockZWaveAckFrame, "direction" | "payload">> = {},
): MockZWaveAckFrame {
	const { repeaters = [], ack = true, failedHop } = options;
	return {
		type: MockZWaveFrameType.ACK,
		repeaters,
		ack,
		failedHop,
	};
}

export const MOCK_FRAME_ACK_TIMEOUT = 100000;
