import { ICommandClass, MAX_SUPERVISION_SESSION_ID } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	Message,
	MessageHeaders,
	MessageOrigin,
	SerialAPIParser,
} from "@zwave-js/serial";
import type { MockPortBinding } from "@zwave-js/serial/mock";
import { createWrappingCounter, TimedExpectation } from "@zwave-js/shared/safe";
import {
	getDefaultMockControllerCapabilities,
	MockControllerCapabilities,
} from "./MockControllerCapabilities";
import type { MockNode } from "./MockNode";
import {
	createMockZWaveAckFrame,
	MockZWaveAckFrame,
	MockZWaveFrame,
	MockZWaveFrameType,
	MockZWaveRequestFrame,
	MOCK_FRAME_ACK_TIMEOUT,
} from "./MockZWaveFrame";

export interface MockControllerOptions {
	serial: MockPortBinding;
	ownNodeId?: number;
	homeId?: number;
	capabilities?: Partial<MockControllerCapabilities>;
}

/** A mock Z-Wave controller which interacts with {@link MockNode}s and can be controlled via a {@link MockSerialPort} */
export class MockController {
	public constructor(options: MockControllerOptions) {
		this.serial = options.serial;
		// Pipe the serial data through a parser, so we get complete message buffers or headers out the other end
		this.serialParser = new SerialAPIParser();
		this.serial.on("write", (data) => {
			this.serialParser.write(data);
		});
		this.serialParser.on("data", (data) => this.serialOnData(data));

		// Set up the fake host
		// const valuesStorage = new Map();
		// const metadataStorage = new Map();
		// const valueDBCache = new Map<number, ValueDB>();

		this.host = {
			ownNodeId: options.ownNodeId ?? 1,
			homeId: options.homeId ?? 0x7e571000,
			securityManager: undefined,
			securityManager2: undefined,
			// nodes: this.nodes as any,
			getNextCallbackId: () => 1,
			getNextSupervisionSessionId: createWrappingCounter(
				MAX_SUPERVISION_SESSION_ID,
			),
			getSafeCCVersionForNode: () => 100,
			getSupportedCCVersionForEndpoint: (
				cc,
				nodeId,
				endpointIndex = 0,
			) => {
				if (!this.nodes.has(nodeId)) {
					return 0;
				}
				const node = this.nodes.get(nodeId)!;
				const endpoint = node.endpoints.get(endpointIndex);
				return (endpoint ?? node).implementedCCs.get(cc)?.version ?? 0;
			},
			isCCSecure: () => false,
			// TODO: We don't care about security classes on the controller
			// This is handled by the nodes hosts
			getHighestSecurityClass: () => undefined,
			hasSecurityClass: () => false,
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			setSecurityClass: () => {},

			// getValueDB: (nodeId) => {
			// 	if (!valueDBCache.has(nodeId)) {
			// 		valueDBCache.set(
			// 			nodeId,
			// 			new ValueDB(
			// 				nodeId,
			// 				valuesStorage as any,
			// 				metadataStorage as any,
			// 			),
			// 		);
			// 	}
			// 	return valueDBCache.get(nodeId)!;
			// },
		};

		this.capabilities = {
			...getDefaultMockControllerCapabilities(),
			...options.capabilities,
		};
	}

	public readonly serial: MockPortBinding;
	private readonly serialParser: SerialAPIParser;
	private expectedHostACKs: TimedExpectation[] = [];
	private expectedHostMessages: TimedExpectation<Message, Message>[] = [];
	private expectedNodeFrames: Map<
		number,
		TimedExpectation<MockZWaveFrame, MockZWaveFrame>[]
	> = new Map();
	private behaviors: MockControllerBehavior[] = [];

	/** Records the messages received from the host to perform assertions on them */
	private receivedHostMessages: Message[] = [];

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

	public readonly host: ZWaveHost;

	public readonly capabilities: MockControllerCapabilities;

	/** Can be used by behaviors to store controller related state */
	public readonly state = new Map<string, unknown>();

	/** Controls whether the controller automatically ACKs node frames before handling them */
	public autoAckNodeFrames: boolean = true;

	/** Gets called when parsed/chunked data is received from the serial port */
	private async serialOnData(
		data:
			| Buffer
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
			msg = Message.from(this.host, {
				data,
				origin: MessageOrigin.Host,
				parseCCs: false,
			});
			this.receivedHostMessages.push(msg);
			// all good, respond with ACK
			this.sendHeaderToHost(MessageHeaders.ACK);
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
				if (await behavior.onHostMessage?.(this.host, this, msg))
					return;
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
			if (index !== -1) this.expectedHostACKs.splice(index, 1);
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
			if (index !== -1) this.expectedHostMessages.splice(index, 1);
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
				if (index !== -1) array.splice(index, 1);
			}
		}
	}

	/**
	 * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectNodeCC<T extends ICommandClass = ICommandClass>(
		node: MockNode,
		timeout: number,
		predicate: (cc: ICommandClass) => cc is T,
	): Promise<T> {
		const ret = await this.expectNodeFrame(
			node,
			timeout,
			(msg): msg is MockZWaveRequestFrame & { payload: T } =>
				msg.type === MockZWaveFrameType.Request &&
				predicate(msg.payload),
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
		this.serial.emitData(Buffer.from([data]));
	}

	/** Sends a raw buffer to the host/driver and expect an ACK */
	public async sendToHost(data: Buffer): Promise<void> {
		this.serial.emitData(data);
		// TODO: make the timeout match the configured ACK timeout
		await this.expectHostACK(1000);
	}

	/** Gets called when a {@link MockZWaveFrame} is received from a {@link MockNode} */
	public async onNodeFrame(
		node: MockNode,
		frame: MockZWaveFrame,
	): Promise<void> {
		// Ack the frame if desired
		if (
			this.autoAckNodeFrames &&
			frame.type === MockZWaveFrameType.Request
		) {
			await this.ackNodeRequestFrame(node, frame);
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
				if (await behavior.onNodeFrame?.(this.host, this, node, frame))
					return;
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
		frame: MockZWaveFrame,
	): Promise<MockZWaveAckFrame | undefined> {
		let ret: Promise<MockZWaveAckFrame> | undefined;
		if (frame.type === MockZWaveFrameType.Request && frame.ackRequested) {
			ret = this.expectNodeACK(node, MOCK_FRAME_ACK_TIMEOUT);
		}
		process.nextTick(() => {
			void node.onControllerFrame(frame);
		});
		if (ret) return await ret;
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
		const index = this.receivedHostMessages.findIndex(predicate);
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
		this.receivedHostMessages = [];
	}
}

export interface MockControllerBehavior {
	/** Gets called when a message from the host is received. Return `true` to indicate that the message has been handled. */
	onHostMessage?: (
		host: ZWaveHost,
		controller: MockController,
		msg: Message,
	) => Promise<boolean | undefined> | boolean | undefined;
	/** Gets called when a message from a node is received. Return `true` to indicate that the message has been handled. */
	onNodeFrame?: (
		host: ZWaveHost,
		controller: MockController,
		node: MockNode,
		frame: MockZWaveFrame,
	) => Promise<boolean | undefined> | boolean | undefined;
}
