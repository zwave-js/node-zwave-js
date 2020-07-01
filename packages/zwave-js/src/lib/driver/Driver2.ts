import { MessageHeaders, ZWaveSerialPort } from "@zwave-js/serial";
import { interpret } from "xstate";
import { Message } from "../message/Message";
import {
	createSerialAPICommandMachine,
	SerialAPICommandContext,
	SerialAPICommandEvent,
	SerialAPICommandInterpreter,
	SerialAPICommandMachine,
	SerialAPICommandStateSchema,
} from "./SerialAPICommandMachine";

export class Driver2 {
	public constructor(port: string) {
		this.port = port;

		this.destroy = this.destroy.bind(this);
		process.on("exit", this.destroy);
		process.on("SIGINT", this.destroy);
		process.on("uncaughtException", this.destroy);
	}

	private port: string;
	private serial: ZWaveSerialPort | undefined;
	private apiMachine!: SerialAPICommandMachine;
	private apiInterpreter: SerialAPICommandInterpreter | undefined;

	public async start(): Promise<void> {
		this.serial = new ZWaveSerialPort(this.port)
			.on("data", this.serialport_onData.bind(this))
			.on("error", (err) => {
				console.error(err);
			});
		// If the port is already open, close it first
		if (this.serial.isOpen) await this.serial.close();

		await this.serial.open();
	}

	/**
	 * Is called when the serial port has received a single-byte message or a complete message buffer
	 */
	private async serialport_onData(
		data:
			| Buffer
			| MessageHeaders.ACK
			| MessageHeaders.CAN
			| MessageHeaders.NAK,
	): Promise<void> {
		if (typeof data === "number") {
			switch (data) {
				// single-byte messages - we have a handler for each one
				case MessageHeaders.ACK: {
					this.apiInterpreter?.send("ACK");
					return;
				}
				case MessageHeaders.NAK: {
					this.apiInterpreter?.send("NAK");
					return;
				}
				case MessageHeaders.CAN: {
					this.apiInterpreter?.send("CAN");
					return;
				}
			}
		}

		const msg = Message.from(this as any, data);
		// all good, send ACK
		await this.sendMessage(Buffer.from([MessageHeaders.ACK]));
		// And handle it
		this.apiInterpreter?.send({ type: "response", message: msg });
	}

	/** Sends a raw datagram to the serialport (if that is open) */
	private async sendMessage(data: Buffer): Promise<void> {
		return this.serial?.writeAsync(data);
	}

	public async executeAPICommand(
		message: Message,
	): Promise<Message | undefined> {
		return new Promise((resolve, reject) => {
			const machine = createSerialAPICommandMachine(message, {
				sendData: this.sendMessage.bind(this),
			});
			this.apiInterpreter = interpret<
				SerialAPICommandContext,
				SerialAPICommandStateSchema,
				SerialAPICommandEvent
			>(machine)
				.onTransition((state) => {
					console.log(state.value);
				})
				.onDone((evt) => {
					const state = this.apiInterpreter!.state;
					if (state.matches("success")) {
						resolve(evt.data?.result);
					} else if (state.matches("failure")) {
						console.error(evt.data?.reason);
						reject();
					} else if (state.matches("abort")) {
						console.error(evt.data?.reason);
						reject();
					}
				});

			this.apiInterpreter.start();
		});
	}

	public async destroy(): Promise<void> {
		// the serialport must be closed in any case
		if (this.serial != undefined) {
			if (this.serial.isOpen) await this.serial.close();
			this.serial = undefined;
		}
	}
}
