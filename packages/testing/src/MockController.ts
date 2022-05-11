import {
	MessageHeaders,
	MockSerialPort,
	SerialAPIParser,
} from "@zwave-js/serial";
import { TimedExpectation } from "@zwave-js/shared/safe";
import type { MockNode } from "./MockNode";

/** A mock Z-Wave controller which interacts with {@link MockNode}s and can be controlled via a {@link MockSerialPort} */
export class MockController {
	public constructor(serial: MockSerialPort) {
		this.serial = serial;
		// Pipe the serial data through a parser, so we get complete message buffers or headers out the other end
		this.serialParser = new SerialAPIParser();
		serial.on("write", (data) => {
			this.serialParser.write(data);
		});
		this.serialParser.on("data", (data) => this.serialOnData(data));
	}

	public readonly serial: MockSerialPort;
	private readonly serialParser: SerialAPIParser;
	private expectedHostACK?: TimedExpectation;

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
					this.expectedHostACK?.resolve();
					this.expectedHostACK = undefined;
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

		// TODO: handle message buffer
		await Promise.resolve();
	}

	/**
	 * Waits until the host sends an ACK or a timeout has elapsed.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 */
	private expectHostACK(timeout: number): PromiseLike<void> {
		this.expectedHostACK = new TimedExpectation(
			timeout,
			undefined,
			"Host did not respond with an ACK within the provided timeout!",
		);
		return this.expectedHostACK;
	}

	/** Sends a message header (ACK/NAK/CAN) to the host/driver */
	public sendHeaderToHost(data: MessageHeaders): void {
		// The terms used in the mock serialport consider the host side,
		// so sending something to the host means the serialport receives data
		this.serial.receiveData(Buffer.from([data]));
	}

	/** Sends a raw buffer to the host/driver and expect an ACK */
	private async sendToHost(data: Buffer): Promise<void> {
		// The terms used in the mock serialport consider the host side,
		// so sending something to the host means the serialport receives data
		this.serial.receiveData(data);
		// TODO: make the timeout match the configured ACK timeout
		await this.expectHostACK(500);
	}

	/** Gets called when a complete chunk of data is received from a {@link MockNode} */
	public nodeOnData(node: MockNode, data: Buffer): void {
		// TODO: handle message buffer
	}

	/**
	 * Sends a raw buffer to a node
	 * @param data The data to send. Mock nodes expect a complete message/command.
	 */
	public sendToNode(node: MockNode, data: Buffer): void {
		node.controllerOnData(data);
	}
}
