import { MessageHeaders, SerialAPIParser } from "@zwave-js/serial";
import type { MockPortBinding } from "@zwave-js/serial/mock";
import { TimedExpectation } from "@zwave-js/shared/safe";
import type { MockNode } from "./MockNode";

/** A mock Z-Wave controller which interacts with {@link MockNode}s and can be controlled via a {@link MockSerialPort} */
export class MockController {
	public constructor(serial: MockPortBinding) {
		this.serial = serial;
		// Pipe the serial data through a parser, so we get complete message buffers or headers out the other end
		this.serialParser = new SerialAPIParser();
		serial.on("write", (data) => {
			this.serialParser.write(data);
		});
		this.serialParser.on("data", (data) => this.serialOnData(data));
	}

	public readonly serial: MockPortBinding;
	private readonly serialParser: SerialAPIParser;
	private expectedHostACK?: TimedExpectation;
	private expectedHostMessages: TimedExpectation<Buffer, Buffer>[] = [];
	private expectedNodeMessages: Map<
		number,
		TimedExpectation<Buffer, Buffer>[]
	> = new Map();

	/** Gets called when parsed/chunked data is received from the serial port */
	private serialOnData(
		data:
			| Buffer
			| MessageHeaders.ACK
			| MessageHeaders.CAN
			| MessageHeaders.NAK,
	): void {
		if (typeof data === "number") {
			switch (data) {
				case MessageHeaders.ACK: {
					// If we were waiting for this ACK, resolve the expectation
					this.expectedHostACK?.resolve();
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
					return;
				}
			}
		}

		// all good, respond with ACK
		this.sendHeaderToHost(MessageHeaders.ACK);

		// Handle message buffer. Check for pending expectations first.
		const handler = this.expectedHostMessages.find(
			(e) => !e.predicate || e.predicate(data),
		);
		if (handler) {
			handler.resolve(data);
		} else {
			// TODO: Then apply generic predefined behavior
		}
	}

	/**
	 * Waits until the host sends an ACK or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	private async expectHostACK(timeout: number): Promise<void> {
		try {
			this.expectedHostACK = new TimedExpectation(
				timeout,
				undefined,
				"Host did not respond with an ACK within the provided timeout!",
			);
			return await this.expectedHostACK;
		} finally {
			this.expectedHostACK = undefined;
		}
	}

	/**
	 * Waits until the host sends a message matching the given predicate or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	public async expectHostMessage(
		timeout: number,
		predicate: (data: Buffer) => boolean,
	): Promise<Buffer> {
		const expectation = new TimedExpectation<Buffer, Buffer>(
			timeout,
			predicate,
			"Host did not respond with an ACK within the provided timeout!",
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
	public async expectNodeMessage(
		node: MockNode,
		timeout: number,
		predicate: (data: Buffer) => boolean,
	): Promise<Buffer> {
		const expectation = new TimedExpectation<Buffer, Buffer>(
			timeout,
			predicate,
			"Node did not respond with an ACK within the provided timeout!",
		);
		try {
			if (!this.expectedNodeMessages.has(node.id)) {
				this.expectedNodeMessages.set(node.id, []);
			}
			this.expectedNodeMessages.get(node.id)!.push(expectation);
			return await expectation;
		} finally {
			const array = this.expectedNodeMessages.get(node.id);
			if (array) {
				const index = array.indexOf(expectation);
				if (index !== -1) array.splice(index, 1);
			}
		}
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

	/** Gets called when a complete chunk of data is received from a {@link MockNode} */
	public nodeOnData(node: MockNode, data: Buffer): void {
		// Handle message buffer. Check for pending expectations first.
		const handler = this.expectedNodeMessages
			.get(node.id)
			?.find((e) => !e.predicate || e.predicate(data));
		if (handler) {
			handler.resolve(data);
		} else {
			// TODO: Then apply generic predefined behavior
		}
	}

	/**
	 * Sends a raw buffer to a node
	 * @param data The data to send. Mock nodes expect a complete message/command.
	 */
	public sendToNode(node: MockNode, data: Buffer): void {
		node.controllerOnData(data);
	}
}

export interface MockControllerBehavior {
	onHostMessage: (controller: MockController, data: Buffer) => void;
	onNodeMessage: (
		controller: MockController,
		node: MockNode,
		data: Buffer,
	) => void;
}
