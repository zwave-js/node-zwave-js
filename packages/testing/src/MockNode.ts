import type { CommandClass } from "@zwave-js/cc";
import {
	type CommandClassInfo,
	type CommandClasses,
	type MaybeNotKnown,
	NOT_KNOWN,
	SecurityClass,
	securityClassOrder,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { TimedExpectation } from "@zwave-js/shared";
import { isDeepStrictEqual } from "node:util";
import type { CCIdToCapabilities } from "./CCSpecificCapabilities";
import type { MockController } from "./MockController";
import {
	type MockEndpointCapabilities,
	type MockNodeCapabilities,
	type PartialCCCapabilities,
	getDefaultMockEndpointCapabilities,
	getDefaultMockNodeCapabilities,
} from "./MockNodeCapabilities";
import {
	type LazyMockZWaveFrame,
	MOCK_FRAME_ACK_TIMEOUT,
	type MockZWaveAckFrame,
	type MockZWaveFrame,
	MockZWaveFrameType,
	type MockZWaveRequestFrame,
	createMockZWaveAckFrame,
	createMockZWaveRequestFrame,
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

		const { commandClasses = [], ...capabilities } = options.capabilities
			?? {};
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

		// A node's host is a bit more specialized than the controller's host.
		const securityClasses = new Map<number, Map<SecurityClass, boolean>>();
		this.host = {
			...this.controller.host,
			ownNodeId: this.id,
			__internalIsMockNode: true,

			// Mimic the behavior of ZWaveNode, but for arbitrary node IDs
			hasSecurityClass(
				nodeId: number,
				securityClass: SecurityClass,
			): MaybeNotKnown<boolean> {
				return (
					securityClasses.get(nodeId)?.get(securityClass) ?? NOT_KNOWN
				);
			},
			setSecurityClass(
				nodeId: number,
				securityClass: SecurityClass,
				granted: boolean,
			): void {
				if (!securityClasses.has(nodeId)) {
					securityClasses.set(nodeId, new Map());
				}
				securityClasses.get(nodeId)!.set(securityClass, granted);
			},
			getHighestSecurityClass(
				nodeId: number,
			): MaybeNotKnown<SecurityClass> {
				const map = securityClasses.get(nodeId);
				if (!map?.size) return undefined;
				let missingSome = false;
				for (const secClass of securityClassOrder) {
					if (map.get(secClass) === true) return secClass;
					if (!map.has(secClass)) {
						missingSome = true;
					}
				}
				// If we don't have the info for every security class, we don't know the highest one yet
				return missingSome ? undefined : SecurityClass.None;
			},
		};

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

	public readonly host: ZWaveHost;
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
			if (index !== -1) {
				void this.expectedControllerFrames.splice(index, 1);
			}
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
		frame: LazyMockZWaveFrame,
	): Promise<MockZWaveAckFrame | undefined> {
		this.controller["air"].add({
			source: this.id,
			onTransmit: (frame) => this.sentControllerFrames.push(frame),
			...frame,
		});

		if (frame.type === MockZWaveFrameType.Request && frame.ackRequested) {
			return await this.expectControllerACK(MOCK_FRAME_ACK_TIMEOUT);
		}
	}

	/** Gets called when a {@link MockZWaveFrame} is received from the {@link MockController} */
	public async onControllerFrame(frame: MockZWaveFrame): Promise<void> {
		this.receivedControllerFrames.push(frame);

		// Ack the frame if desired
		if (
			this.autoAckControllerFrames
			&& frame.type === MockZWaveFrameType.Request
		) {
			void this.ackControllerRequestFrame(frame);
		}

		// Handle message buffer. Check for pending expectations first.
		const handler = this.expectedControllerFrames.find(
			(e) => !e.predicate || e.predicate(frame),
		);
		if (handler) {
			handler.resolve(frame);
		} else if (frame.type === MockZWaveFrameType.Request) {
			let cc = frame.payload;
			let response: MockNodeResponse | undefined;

			// Transform incoming frames with hooks, e.g. to support unwrapping encapsulated CCs
			for (const behavior of this.behaviors) {
				if (behavior.transformIncomingCC) {
					cc = await behavior.transformIncomingCC(
						this.controller,
						this,
						cc,
					);
				}
			}

			// Figure out what to do with the frame
			for (const behavior of this.behaviors) {
				response = await behavior.handleCC?.(
					this.controller,
					this,
					cc,
				);
				if (response) break;
			}

			// If no behavior handled the frame, or we're supposed to stop, stop
			if (!response || response.action === "stop") return;

			// Transform responses with hooks, e.g. to support Supervision or other encapsulation
			for (const behavior of this.behaviors) {
				if (behavior.transformResponse) {
					response = await behavior.transformResponse(
						this.controller,
						this,
						cc,
						response,
					);
				}
			}

			// Finally send a CC to the controller if we're supposed to
			if (response.action === "sendCC") {
				await this.sendToController(
					createMockZWaveRequestFrame(response.cc, {
						ackRequested: response.ackRequested,
					}),
				);
			} else if (response.action === "ack") {
				// Or ack the frame
				await this.ackControllerRequestFrame(frame);
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
				`Node ${this.id} did not receive a Z-Wave frame matching the predicate!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		} else if (index > -1 && noMatch) {
			throw new Error(
				`Node ${this.id} received a Z-Wave frame matching the predicate, but this was not expected!${
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
				`Node ${this.id} did not send a Z-Wave frame matching the predicate!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		} else if (index > -1 && noMatch) {
			throw new Error(
				`Node ${this.id} sent a Z-Wave frame matching the predicate, but this was not expected!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		}
	}

	/** Forgets all recorded frames sent to the controller */
	public clearSentControllerFrames(): void {
		this.sentControllerFrames = [];
	}

	public getCCCapabilities<T extends CommandClasses>(
		ccId: T,
		endpointIndex?: number,
	): Partial<CCIdToCapabilities<T>> | undefined {
		let ccInfo: CommandClassInfo | undefined;
		if (endpointIndex) {
			const endpoint = this.endpoints.get(endpointIndex);
			ccInfo = endpoint?.implementedCCs.get(ccId);
		} else {
			ccInfo = this.implementedCCs.get(ccId);
		}
		if (ccInfo) {
			const { isSupported, isControlled, version, secure, ...ret } =
				ccInfo;
			return ret;
		}
	}
}

/** What the mock node should do after receiving a controller frame */
export type MockNodeResponse = {
	// Send a CC
	action: "sendCC";
	cc: CommandClass;
	ackRequested?: boolean; // Defaults to false
} | {
	// Acknowledge the incoming frame
	action: "ack";
} | {
	// do nothing
	action: "stop";
} | {
	// indicate success to the sending node
	action: "ok";
} | {
	// indicate failure to the sending node
	action: "fail";
};

export interface MockNodeBehavior {
	/** Gets called before the `handleCC` handlers and can transform an incoming `CommandClass` into another */
	transformIncomingCC?: (
		controller: MockController,
		self: MockNode,
		cc: CommandClass,
	) => Promise<CommandClass> | CommandClass;

	/** Gets called when a CC from the controller is received. Returns an action to be performed in response, or `undefined` if there is nothing to do. */
	handleCC?: (
		controller: MockController,
		self: MockNode,
		receivedCC: CommandClass,
	) => Promise<MockNodeResponse | undefined> | MockNodeResponse | undefined;

	/** Gets called after the `onControllerFrame` handlers and can transform one `MockNodeResponse` into another */
	transformResponse?: (
		controller: MockController,
		self: MockNode,
		receivedCC: CommandClass,
		response: MockNodeResponse,
	) => Promise<MockNodeResponse> | MockNodeResponse;
}
