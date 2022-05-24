import { TimedExpectation } from "@zwave-js/shared";
import type { MockController } from "./MockController";
import {
	getDefaultMockNodeCapabilities,
	type MockNodeCapabilities,
} from "./MockNodeCapabilities";
import {
	createMockZWaveAckFrame,
	MockZWaveAckFrame,
	MockZWaveFrame,
	MockZWaveFrameType,
	MockZWaveRequestFrame,
	MOCK_FRAME_ACK_TIMEOUT,
} from "./MockZWaveFrame";

export interface MockNodeOptions {
	id: number;
	controller: MockController;
	capabilities?: Partial<MockNodeCapabilities>;
}

/** A mock node that can be used to test the driver as if it were speaking to an actual network */
export class MockNode {
	public constructor(options: MockNodeOptions) {
		this.id = options.id;
		this.controller = options.controller;

		this.capabilities = {
			...getDefaultMockNodeCapabilities(),
			...options.capabilities,
		};
	}

	public readonly id: number;
	public readonly controller: MockController;
	public readonly capabilities: MockNodeCapabilities;
	private behaviors: MockNodeBehavior[] = [];

	/** Can be used by behaviors to store controller related state */
	public readonly state = new Map<string, unknown>();

	/** Controls whether the controller automatically ACKs node frames before handling them */
	public autoAckControllerFrames: boolean = true;

	private expectedControllerFrames: TimedExpectation<
		MockZWaveFrame,
		MockZWaveFrame
	>[] = [];

	/**
	 * Waits until the controller sends a frame matching the given predicate or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectControllerFrame<
		T extends MockZWaveFrame = MockZWaveFrame,
	>(
		timeout: number,
		predicate: (msg: MockZWaveFrame) => msg is T,
	): Promise<T> {
		const expectation = new TimedExpectation<
			MockZWaveFrame,
			MockZWaveFrame
		>(
			timeout,
			predicate,
			"The controller did not send the expected frame within the provided timeout!",
		);
		try {
			this.expectedControllerFrames.push(expectation);
			return (await expectation) as T;
		} finally {
			const index = this.expectedControllerFrames.indexOf(expectation);
			if (index !== -1) this.expectedControllerFrames.splice(index, 1);
		}
	}

	/**
	 * Waits until the controller sends an ACK frame or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public expectControllerACK(timeout: number): Promise<MockZWaveAckFrame> {
		return this.expectControllerFrame(
			timeout,
			(msg): msg is MockZWaveAckFrame =>
				msg.type === MockZWaveFrameType.ACK,
		);
	}

	/**
	 * Sends a {@link MockZWaveFrame} to the {@link MockController}
	 */
	public async sendToController(
		frame: MockZWaveFrame,
	): Promise<MockZWaveAckFrame | undefined> {
		let ret: Promise<MockZWaveAckFrame> | undefined;
		if (frame.type === MockZWaveFrameType.Request && frame.ackRequested) {
			ret = this.expectControllerACK(MOCK_FRAME_ACK_TIMEOUT);
		}
		void this.controller.onNodeFrame(this, frame);
		if (ret) return await ret;
	}

	/** Gets called when a {@link MockZWaveFrame} is received from the {@link MockController} */
	public async onControllerFrame(frame: MockZWaveFrame): Promise<void> {
		// Ack the frame if desired
		if (
			this.autoAckControllerFrames &&
			frame.type === MockZWaveFrameType.Request
		) {
			await this.ackControllerRequestFrame(frame);
		}

		// Handle message buffer. Check for pending expectations first.
		const handler = this.expectedControllerFrames.find(
			(e) => !e.predicate || e.predicate(frame),
		);
		if (handler) {
			handler.resolve(frame);
		} else {
			for (const behavior of this.behaviors) {
				if (
					await behavior.onControllerFrame?.(
						this.controller,
						this,
						frame,
					)
				) {
					return;
				}
			}
		}
	}

	/**
	 * Sends an ACK frame to the {@link MockController}
	 */
	public async ackControllerRequestFrame(
		frame?: MockZWaveRequestFrame,
	): Promise<void> {
		await this.sendToController(
			createMockZWaveAckFrame({
				repeaters: frame?.repeaters,
			}),
		);
	}

	public defineBehavior(...behaviors: MockNodeBehavior[]): void {
		// New behaviors must override existing ones, so we insert at the front of the array
		this.behaviors.unshift(...behaviors);
	}
}

export interface MockNodeBehavior {
	/** Gets called when a message from the controller is received. Return `true` to indicate that the message has been handled. */
	onControllerFrame?: (
		// host: ZWaveHost,
		controller: MockController,
		self: MockNode,
		frame: MockZWaveFrame,
	) => Promise<boolean> | boolean;
}
