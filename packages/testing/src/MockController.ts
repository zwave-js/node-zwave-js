import {
	type CCId,
	type MaybeNotKnown,
	NOT_KNOWN,
	NodeIDType,
	SecurityClass,
	type SecurityManagers,
	randomBytes,
	securityClassOrder,
} from "@zwave-js/core";
import {
	type FunctionType,
	Message,
	type MessageEncodingContext,
	MessageHeaders,
	MessageOrigin,
	type MessageParsingContext,
	type ZWaveSerialStream,
} from "@zwave-js/serial";
import { type MockPort } from "@zwave-js/serial/mock";
import { AsyncQueue } from "@zwave-js/shared";
import { TimedExpectation, isAbortError, noop } from "@zwave-js/shared/safe";
import { wait } from "alcalzone-shared/async";
import {
	type MockControllerCapabilities,
	getDefaultMockControllerCapabilities,
} from "./MockControllerCapabilities.js";
import type { MockNode } from "./MockNode.js";
import {
	type LazyMockZWaveFrame,
	MOCK_FRAME_ACK_TIMEOUT,
	type MockZWaveAckFrame,
	type MockZWaveFrame,
	MockZWaveFrameType,
	type MockZWaveRequestFrame,
	createMockZWaveAckFrame,
	unlazyMockZWaveFrame,
} from "./MockZWaveFrame.js";

export interface MockControllerOptions {
	mockPort: MockPort;
	serial: ZWaveSerialStream;
	// serial: MockPortBinding;
	ownNodeId?: number;
	homeId?: number;
	capabilities?: Partial<MockControllerCapabilities>;
}

/** A mock Z-Wave controller which interacts with {@link MockNode}s and can be controlled via a {@link MockSerialPort} */
export class MockController {
	public constructor(options: MockControllerOptions) {
		this.mockPort = options.mockPort;
		this.serial = options.serial;

		void this.handleSerialData();

		this.ownNodeId = options.ownNodeId ?? 1;
		this.homeId = options.homeId ?? 0x7e571000;

		this.capabilities = {
			...getDefaultMockControllerCapabilities(),
			...options.capabilities,
		};

		const securityClasses = new Map<number, Map<SecurityClass, boolean>>();
		const requestStorage = new Map<FunctionType, Record<string, unknown>>();

		const self = this;
		this.encodingContext = {
			homeId: this.homeId,
			ownNodeId: this.ownNodeId,
			// TODO: LR is not supported in mocks
			nodeIdType: NodeIDType.Short,
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
			getSupportedCCVersion: (cc, nodeId, endpointIndex = 0) => {
				if (!this.nodes.has(nodeId)) {
					return 0;
				}
				const node = this.nodes.get(nodeId)!;
				const endpoint = node.endpoints.get(endpointIndex);
				return (endpoint ?? node).implementedCCs.get(cc)?.version ?? 0;
			},
			getDeviceConfig: () => undefined,
			get securityManager() {
				return self.securityManagers.securityManager;
			},
			get securityManager2() {
				return self.securityManagers.securityManager2;
			},
			get securityManagerLR() {
				return self.securityManagers.securityManagerLR;
			},
		};
		this.parsingContext = {
			...this.encodingContext,
			// FIXME: Take from the controller capabilities
			sdkVersion: undefined,
			requestStorage,
		};

		void this.execute();
	}

	public homeId: number;
	public ownNodeId: number;

	public securityManagers: SecurityManagers = {
		securityManager: undefined,
		securityManager2: undefined,
		securityManagerLR: undefined,
	};

	public encodingContext: MessageEncodingContext;
	public parsingContext: MessageParsingContext;

	public readonly mockPort: MockPort;
	public readonly serial: ZWaveSerialStream;

	private expectedHostACKs: TimedExpectation[] = [];
	private expectedHostMessages: TimedExpectation<Message, Message>[] = [];
	private expectedNodeFrames: Map<
		number,
		TimedExpectation<MockZWaveFrame, MockZWaveFrame>[]
	> = new Map();
	private behaviors: MockControllerBehavior[] = [];

	/** Shared medium for sending messages back and forth */
	private air = new AsyncQueue<
		LazyMockZWaveFrame & {
			source?: number;
			target?: number;
			onTransmit?: (frame: MockZWaveFrame) => void;
		}
	>();

	/** Records the messages received from the host to perform assertions on them */
	private _receivedHostMessages: Message[] = [];
	public get receivedHostMessages(): readonly Readonly<Message>[] {
		return this._receivedHostMessages;
	}

	private _nodes = new Map<number, MockNode>();
	public get nodes(): ReadonlyMap<number, MockNode> {
		return this._nodes;
	}

	public addNode(node: MockNode): void {
		this._nodes.set(node.id, node);
	}

	public removeNode(node: MockNode): void {
		this._nodes.delete(node.id);
	}

	public readonly capabilities: MockControllerCapabilities;

	/** Can be used by behaviors to store controller related state */
	public readonly state = new Map<string, unknown>();

	/** Controls whether the controller automatically ACKs messages from the host before handling them */
	public autoAckHostMessages: boolean = true;
	/** Controls whether the controller automatically ACKs node frames before handling them */
	public autoAckNodeFrames: boolean = true;
	/** Allows reproducing issues with the 7.19.x firmware where the high nibble of the ACK after soft-reset is corrupted */
	public corruptACK: boolean = false;

	private async handleSerialData(): Promise<void> {
		try {
			read: for await (const data of this.mockPort.readable) {
				// Execute hooks for inspecting the raw data first
				for (const behavior of this.behaviors) {
					if (await behavior.onHostData?.(this, data)) {
						continue read;
					}
				}

				if (data.length === 1) {
					const header = data[0];
					switch (header) {
						case MessageHeaders.ACK:
						case MessageHeaders.NAK:
						case MessageHeaders.CAN:
							void this.serialOnData(header).catch(noop);
							continue;
					}
				}
				void this.serialOnData(data).catch(noop);
			}
		} catch (e) {
			if (isAbortError(e)) return;
			throw e;
		}
	}

	/** Gets called when parsed/chunked data is received from the serial port */
	private async serialOnData(
		data:
			| Uint8Array
			| MessageHeaders.ACK
			| MessageHeaders.CAN
			| MessageHeaders.NAK,
	): Promise<void> {
		if (typeof data === "number") {
			switch (data) {
				case MessageHeaders.ACK: {
					// If we were waiting for this ACK, resolve the expectation
					this.expectedHostACKs?.shift()?.resolve();
					return;
				}
				case MessageHeaders.NAK: {
					// Not sure if we actually need to do anything here
					return;
				}
				case MessageHeaders.CAN: {
					// The driver should NEVER send this
					throw new Error(
						"Mock controller received a CAN from the host. This is illegal!",
					);
				}
			}
		}

		let msg: Message;
		try {
			msg = Message.parse(data, {
				...this.parsingContext,
				origin: MessageOrigin.Host,
			});
			this._receivedHostMessages.push(msg);
			if (this.autoAckHostMessages) {
				// all good, respond with ACK
				this.ackHostMessage();
			}
		} catch (e: any) {
			throw new Error(
				`Mock controller received an invalid message from the host: ${e.stack}`,
			);
		}

		// Handle message buffer. Check for pending expectations first.
		const handler = this.expectedHostMessages.find(
			(e) => !e.predicate || e.predicate(msg),
		);
		if (handler) {
			handler.resolve(msg);
		} else {
			for (const behavior of this.behaviors) {
				if (await behavior.onHostMessage?.(this, msg)) {
					return;
				}
			}
		}
	}

	/**
	 * Waits until the host sends an ACK or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectHostACK(timeout: number): Promise<void> {
		const ack = new TimedExpectation(
			timeout,
			undefined,
			"Host did not respond with an ACK within the provided timeout!",
		);
		try {
			this.expectedHostACKs.push(ack);
			return await ack;
		} finally {
			const index = this.expectedHostACKs.indexOf(ack);
			if (index !== -1) void this.expectedHostACKs.splice(index, 1);
		}
	}

	/**
	 * Waits until the host sends a message matching the given predicate or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectHostMessage(
		timeout: number,
		predicate: (msg: Message) => boolean,
	): Promise<Message> {
		const expectation = new TimedExpectation<Message, Message>(
			timeout,
			predicate,
			"Host did not send the expected message within the provided timeout!",
		);
		try {
			this.expectedHostMessages.push(expectation);
			return await expectation;
		} finally {
			const index = this.expectedHostMessages.indexOf(expectation);
			if (index !== -1) void this.expectedHostMessages.splice(index, 1);
		}
	}

	/**
	 * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectNodeFrame<T extends MockZWaveFrame = MockZWaveFrame>(
		node: MockNode,
		timeout: number,
		predicate: (msg: MockZWaveFrame) => msg is T,
	): Promise<T> {
		const expectation = new TimedExpectation<
			MockZWaveFrame,
			MockZWaveFrame
		>(
			timeout,
			predicate,
			`Node ${node.id} did not send the expected frame within the provided timeout!`,
		);
		try {
			if (!this.expectedNodeFrames.has(node.id)) {
				this.expectedNodeFrames.set(node.id, []);
			}
			this.expectedNodeFrames.get(node.id)!.push(expectation);
			return (await expectation) as T;
		} finally {
			const array = this.expectedNodeFrames.get(node.id);
			if (array) {
				const index = array.indexOf(expectation);
				if (index !== -1) void array.splice(index, 1);
			}
		}
	}

	/**
	 * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectNodeCC<T extends CCId = CCId>(
		node: MockNode,
		timeout: number,
		predicate: (cc: CCId) => cc is T,
	): Promise<T> {
		const ret = await this.expectNodeFrame(
			node,
			timeout,
			(msg): msg is MockZWaveRequestFrame & { payload: T } =>
				msg.type === MockZWaveFrameType.Request
				&& predicate(msg.payload),
		);
		return ret.payload;
	}

	/**
	 * Waits until the controller sends an ACK frame or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public expectNodeACK(
		node: MockNode,
		timeout: number,
	): Promise<MockZWaveAckFrame> {
		return this.expectNodeFrame(
			node,
			timeout,
			(msg): msg is MockZWaveAckFrame =>
				msg.type === MockZWaveFrameType.ACK,
		);
	}

	/** Sends a message header (ACK/NAK/CAN) to the host/driver */
	private sendHeaderToHost(data: MessageHeaders): void {
		this.mockPort.emitData(Uint8Array.from([data]));
	}

	/** Sends a raw buffer to the host/driver and expect an ACK */
	public async sendMessageToHost(
		msg: Message,
		fromNode?: MockNode,
	): Promise<void> {
		let data: Uint8Array;
		if (fromNode) {
			data = await msg.serialize({
				nodeIdType: this.encodingContext.nodeIdType,
				...fromNode.encodingContext,
			});
			// Simulate the frame being transmitted via radio
			await wait(fromNode.capabilities.txDelay);
		} else {
			data = await msg.serialize(this.encodingContext);
		}
		this.mockPort.emitData(data);
		// TODO: make the timeout match the configured ACK timeout
		await this.expectHostACK(1000);
	}

	/** Sends a raw buffer to the host/driver and expect an ACK */
	public async sendToHost(data: Uint8Array): Promise<void> {
		this.mockPort.emitData(data);
		// TODO: make the timeout match the configured ACK timeout
		await this.expectHostACK(1000);
	}

	/**
	 * Sends an ACK frame to the host
	 */
	public ackHostMessage(): void {
		if (this.corruptACK) {
			const highNibble = randomBytes(1)[0] & 0xf0;
			this.mockPort.emitData(
				Uint8Array.from([highNibble | MessageHeaders.ACK]),
			);
		} else {
			this.sendHeaderToHost(MessageHeaders.ACK);
		}
	}

	/** Gets called when a {@link MockZWaveFrame} is received from a {@link MockNode} */
	public async onNodeFrame(
		node: MockNode,
		frame: MockZWaveFrame,
	): Promise<void> {
		// Ack the frame if desired
		if (
			this.autoAckNodeFrames
			&& frame.type === MockZWaveFrameType.Request
		) {
			void this.ackNodeRequestFrame(node, frame);
		}

		// Handle message buffer. Check for pending expectations first.
		const handler = this.expectedNodeFrames
			.get(node.id)
			?.find((e) => !e.predicate || e.predicate(frame));
		if (handler) {
			handler.resolve(frame);
		} else {
			// Then apply generic predefined behavior
			for (const behavior of this.behaviors) {
				if (
					await behavior.onNodeFrame?.(this, node, frame)
				) {
					return;
				}
			}
		}
	}

	/**
	 * Sends an ACK frame to a {@link MockNode}
	 */
	public async ackNodeRequestFrame(
		node: MockNode,
		frame?: MockZWaveRequestFrame,
	): Promise<void> {
		await this.sendToNode(
			node,
			createMockZWaveAckFrame({
				repeaters: frame?.repeaters,
			}),
		);
	}

	/**
	 * Sends a {@link MockZWaveFrame} to a {@link MockNode}
	 */
	public async sendToNode(
		node: MockNode,
		frame: LazyMockZWaveFrame,
	): Promise<MockZWaveAckFrame | undefined> {
		this.air.add({
			target: node.id,
			...frame,
		});

		if (frame.type === MockZWaveFrameType.Request && frame.ackRequested) {
			return await this.expectNodeACK(node, MOCK_FRAME_ACK_TIMEOUT);
		}
	}

	public defineBehavior(...behaviors: MockControllerBehavior[]): void {
		// New behaviors must override existing ones, so we insert at the front of the array
		this.behaviors.unshift(...behaviors);
	}

	/** Asserts that a message matching the given predicate was received from the host */
	public assertReceivedHostMessage(
		predicate: (msg: Message) => boolean,
		options?: {
			errorMessage?: string;
		},
	): void {
		const { errorMessage } = options ?? {};
		const index = this._receivedHostMessages.findIndex(predicate);
		if (index === -1) {
			throw new Error(
				`Did not receive a host message matching the predicate!${
					errorMessage ? ` ${errorMessage}` : ""
				}`,
			);
		}
	}

	/** Forgets all recorded messages received from the host */
	public clearReceivedHostMessages(): void {
		this._receivedHostMessages = [];
	}

	public async execute(): Promise<void> {
		for await (const { source, target, onTransmit, ...frame } of this.air) {
			if (!source && target) {
				// controller -> node
				const node = this._nodes.get(target);
				if (!node) continue;

				await wait(node.capabilities.txDelay);

				const unlazy = await unlazyMockZWaveFrame(frame);
				onTransmit?.(unlazy);
				node.onControllerFrame(unlazy).catch((e) => {
					console.error(e);
				});
			} else if (source && !target) {
				// node -> controller
				const node = this._nodes.get(source);
				if (!node) continue;

				await wait(node.capabilities.txDelay);

				const unlazy = await unlazyMockZWaveFrame(frame);
				onTransmit?.(unlazy);
				this.onNodeFrame(node, unlazy).catch((e) => {
					console.error(e);
				});
			}
		}
	}

	public destroy(): void {
		this.air.abort();
	}
}

export interface MockControllerBehavior {
	/**
	 * Can be used to inspect raw data received from the host before it is processed by the serial parser and the mock controller.
	 * Return `true` to indicate that the data has been handled and should not be processed further.
	 */
	onHostData?: (
		controller: MockController,
		data: Uint8Array,
	) => Promise<boolean | undefined> | boolean | undefined;
	/** Gets called when a message from the host is received. Return `true` to indicate that the message has been handled. */
	onHostMessage?: (
		controller: MockController,
		msg: Message,
	) => Promise<boolean | undefined> | boolean | undefined;
	/** Gets called when a message from a node is received. Return `true` to indicate that the message has been handled. */
	onNodeFrame?: (
		controller: MockController,
		node: MockNode,
		frame: MockZWaveFrame,
	) => Promise<boolean | undefined> | boolean | undefined;
}
