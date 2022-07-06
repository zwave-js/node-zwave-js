import type { CommandClasses, CommandClassInfo } from "@zwave-js/core";
import { TimedExpectation } from "@zwave-js/shared";
import { isDeepStrictEqual } from "util";
import type { MockController } from "./MockController";
import {
	getDefaultMockEndpointCapabilities,
	getDefaultMockNodeCapabilities,
	MockEndpointCapabilities,
	PartialCCCapabilities,
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

const defaultCCInfo: CommandClassInfo = {
	isSupported: true,
	isControlled: false,
	secure: false,
	version: 1,
};

export interface MockNodeOptions {
	id: number;
	controller: MockController;
	capabilities?: Partial<MockNodeCapabilities> & {
		/** The CCs implemented by the root device of this node */
		commandClasses?: PartialCCCapabilities[];
		/** Additional, consecutive endpoints. The first one defined will be available at index 1. */
		endpoints?: (Partial<MockEndpointCapabilities> & {
			commandClasses?: PartialCCCapabilities[];
		})[];
	};
}

export interface MockEndpointOptions {
	index: number;
	node: MockNode;
	capabilities?: Partial<MockEndpointCapabilities> & {
		/** The CCs implemented by this endpoint */
		commandClasses?: PartialCCCapabilities[];
	};
}

export class MockEndpoint {
	public constructor(options: MockEndpointOptions) {
		this.index = options.index;
		this.node = options.node;

		const { commandClasses = [], ...capabilities } =
			options.capabilities ?? {};
		this.capabilities = {
			...getDefaultMockEndpointCapabilities(this.node.capabilities),
			...capabilities,
		};

		for (const cc of commandClasses) {
			if (typeof cc === "number") {
				this.addCC(cc, {});
			} else {
				const { ccId, ...ccInfo } = cc;
				this.addCC(ccId, ccInfo);
			}
		}
	}

	public readonly index: number;
	public readonly node: MockNode;
	public readonly capabilities: MockEndpointCapabilities;

	public readonly implementedCCs = new Map<
		CommandClasses,
		CommandClassInfo
	>();

	/** Adds information about a CC to this mock endpoint */
	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void {
		const original = this.implementedCCs.get(cc);
		const updated = Object.assign({}, original ?? defaultCCInfo, info);
		if (!isDeepStrictEqual(original, updated)) {
			this.implementedCCs.set(cc, updated);
		}
	}

	/** Removes information about a CC from this mock node */
	public removeCC(cc: CommandClasses): void {
		this.implementedCCs.delete(cc);
	}
}

/** A mock node that can be used to test the driver as if it were speaking to an actual network */
export class MockNode {
	public constructor(options: MockNodeOptions) {
		this.id = options.id;
		this.controller = options.controller;

		const {
			commandClasses = [],
			endpoints = [],
			...capabilities
		} = options.capabilities ?? {};
		this.capabilities = {
			...getDefaultMockNodeCapabilities(),
			...capabilities,
		};

		for (const cc of commandClasses) {
			if (typeof cc === "number") {
				this.addCC(cc, {});
			} else {
				const { ccId, ...ccInfo } = cc;
				this.addCC(ccId, ccInfo);
			}
		}

		let index = 0;
		for (const endpoint of endpoints) {
			index++;
			this.endpoints.set(
				index,
				new MockEndpoint({
					index,
					node: this,
					capabilities: endpoint,
				}),
			);
		}
	}

	public readonly id: number;
	public readonly controller: MockController;
	public readonly capabilities: MockNodeCapabilities;

	private behaviors: MockNodeBehavior[] = [];

	public readonly implementedCCs = new Map<
		CommandClasses,
		CommandClassInfo
	>();

	public readonly endpoints = new Map<number, MockEndpoint>();

	/** Can be used by behaviors to store controller related state */
	public readonly state = new Map<string, unknown>();

	/** Controls whether the controller automatically ACKs node frames before handling them */
	public autoAckControllerFrames: boolean = true;

	private expectedControllerFrames: TimedExpectation<
		MockZWaveFrame,
		MockZWaveFrame
	>[] = [];

	/** Records the frames received from the controller to perform assertions on them */
	private receivedControllerFrames: MockZWaveFrame[] = [];
	/** Records the frames sent to the controller to perform assertions on them */
	private sentControllerFrames: MockZWaveFrame[] = [];

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
		this.sentControllerFrames.push(frame);
		process.nextTick(() => {
			void this.controller.onNodeFrame(this, frame);
		});
		if (ret) return await ret;
	}

	/** Gets called when a {@link MockZWaveFrame} is received from the {@link MockController} */
	public async onControllerFrame(frame: MockZWaveFrame): Promise<void> {
		this.receivedControllerFrames.push(frame);

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

	/** Adds information about a CC to this mock node */
	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void {
		const original = this.implementedCCs.get(cc);
		const updated = Object.assign({}, original ?? defaultCCInfo, info);
		if (!isDeepStrictEqual(original, updated)) {
			this.implementedCCs.set(cc, updated);
		}
	}

	/** Removes information about a CC from this mock node */
	public removeCC(cc: CommandClasses): void {
		this.implementedCCs.delete(cc);
	}

	public defineBehavior(...behaviors: MockNodeBehavior[]): void {
		// New behaviors must override existing ones, so we insert at the front of the array
		this.behaviors.unshift(...behaviors);
	}

	/** Asserts that a frame matching the given predicate was received from the controller */
	public assertReceivedControllerFrame(
		predicate: (frame: MockZWaveFrame) => boolean,
		options?: {
			noMatch?: boolean;
			errorMessage?: string;
		},
	): void {
		const { errorMessage, noMatch } = options ?? {};
		const index = this.receivedControllerFrames.findIndex(predicate);
		if (index === -1 && !noMatch) {
			throw new Error(
				`Node ${
					this.id
				} did not receive a Z-Wave frame matching the predicate!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		} else if (index > -1 && noMatch) {
			throw new Error(
				`Node ${
					this.id
				} received a Z-Wave frame matching the predicate, but this was not expected!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		}
	}

	/** Forgets all recorded frames received from the controller */
	public clearReceivedControllerFrames(): void {
		this.receivedControllerFrames = [];
	}

	/** Asserts that a frame matching the given predicate was sent to the controller */
	public assertSentControllerFrame(
		predicate: (frame: MockZWaveFrame) => boolean,
		options?: {
			noMatch?: boolean;
			errorMessage?: string;
		},
	): void {
		const { errorMessage, noMatch } = options ?? {};
		const index = this.sentControllerFrames.findIndex(predicate);
		if (index === -1 && !noMatch) {
			throw new Error(
				`Node ${
					this.id
				} did not send a Z-Wave frame matching the predicate!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		} else if (index > -1 && noMatch) {
			throw new Error(
				`Node ${
					this.id
				} sent a Z-Wave frame matching the predicate, but this was not expected!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		}
	}

	/** Forgets all recorded frames sent to the controller */
	public clearSentControllerFrames(): void {
		this.sentControllerFrames = [];
	}
}

export interface MockNodeBehavior {
	/** Gets called when a message from the controller is received. Return `true` to indicate that the message has been handled. */
	onControllerFrame?: (
		controller: MockController,
		self: MockNode,
		frame: MockZWaveFrame,
	) => Promise<boolean | undefined> | boolean | undefined;
}
