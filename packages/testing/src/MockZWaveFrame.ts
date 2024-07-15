import { type CommandClass } from "@zwave-js/cc";

/**
 * Is used to simulate communication between a {@link MockController} and a {@link MockNode}.
 */
export type MockZWaveFrame = MockZWaveRequestFrame | MockZWaveAckFrame;

// Support delayed parsing
export type LazyMockZWaveFrame = LazyMockZWaveRequestFrame | MockZWaveAckFrame;

export interface MockZWaveRequestFrame {
	type: MockZWaveFrameType.Request;
	/** The repeaters to use to reach the destination */
	repeaters: number[];
	/** Whether an ACK is requested from the destination */
	ackRequested: boolean;
	/** The Command Class contained in the frame */
	payload: CommandClass;
}

export interface LazyMockZWaveRequestFrame {
	type: MockZWaveFrameType.Request;
	/** The repeaters to use to reach the destination */
	repeaters: number[];
	/** Whether an ACK is requested from the destination */
	ackRequested: boolean;
	/** The Command Class contained in the frame */
	payload: CommandClass | (() => CommandClass);
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
	payload: CommandClass | (() => CommandClass),
	options: Partial<Omit<MockZWaveRequestFrame, "direction" | "payload">> = {},
): LazyMockZWaveRequestFrame {
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

export function unlazyMockZWaveFrame(
	frame: LazyMockZWaveFrame,
): MockZWaveFrame {
	if (frame.type === MockZWaveFrameType.ACK) return frame;
	let payload = frame.payload;
	if (typeof payload === "function") {
		payload = payload();
	}
	return {
		...frame,
		payload,
	};
}

/** How long a Mock Node gets to ack a Z-Wave frame */
export const MOCK_FRAME_ACK_TIMEOUT = 1000;
