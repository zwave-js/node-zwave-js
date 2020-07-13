import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { MessageHeaders, ZWaveSerialPort } from "@zwave-js/serial";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { interpret } from "xstate";
import type { CommandClass } from "../commandclass/CommandClass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import {
	SendDataMulticastRequest,
	SendDataRequest,
} from "../controller/SendDataMessages";
import type { SendCommandOptions } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import {
	createSendThreadMachine,
	SendThreadInterpreter,
} from "./SendThreadMachine";
import { Transaction } from "./Transaction";

export class Driver2 {
	public constructor(port: string) {
		this.port = port;

		this.destroy = this.destroy.bind(this);
		process.on("exit", this.destroy);
		process.on("SIGINT", this.destroy);
		process.on("uncaughtException", this.destroy);

		const sendThreadMachine = createSendThreadMachine({
			sendData: this.sendMessage.bind(this),
		});
		this.sendThread = interpret(sendThreadMachine).start();
		this.sendThread.send("ACK");
	}

	private port: string;
	private serial: ZWaveSerialPort | undefined;
	private sendThread: SendThreadInterpreter;

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
					this.sendThread?.send("ACK");
					return;
				}
				case MessageHeaders.NAK: {
					this.sendThread?.send("NAK");
					return;
				}
				case MessageHeaders.CAN: {
					this.sendThread?.send("CAN");
					return;
				}
			}
		}

		const msg = Message.from(this as any, data);
		// all good, send ACK
		await this.sendMessage(Buffer.from([MessageHeaders.ACK]));
		// And handle it
		this.sendThread?.send({ type: "message", message: msg });
	}

	/** Sends a raw datagram to the serialport (if that is open) */
	private async sendMessage(data: Buffer): Promise<void> {
		return this.serial?.writeAsync(data);
	}

	public executeAPICommand(message: Message): Promise<Message | undefined> {
		const promise = createDeferredPromise<Message>();
		const transaction = new Transaction(
			this as any,
			message,
			promise,
			MessagePriority.Normal,
		);
		this.sendThread.send({
			type: "add",
			transaction,
		});
		return promise;
	}

	public async sendCommand<TResponse extends CommandClass = CommandClass>(
		command: CommandClass,
		options: SendCommandOptions = {},
	): Promise<TResponse | undefined> {
		let msg: SendDataRequest | SendDataMulticastRequest;
		if (command.isSinglecast()) {
			msg = new SendDataRequest(this as any, { command });
		} else if (command.isMulticast()) {
			msg = new SendDataMulticastRequest(this as any, { command });
		} else {
			throw new ZWaveError(
				`A CC must either be singlecast or multicast`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		// Specify the number of send attempts for the request
		if (options.maxSendAttempts != undefined) {
			msg.maxSendAttempts = options.maxSendAttempts;
		}

		const resp = await this.executeAPICommand(msg);
		if (isCommandClassContainer(resp)) {
			return resp.command as TResponse;
		}
	}

	public async destroy(): Promise<void> {
		// the serialport must be closed in any case
		if (this.serial != undefined) {
			if (this.serial.isOpen) await this.serial.close();
			this.serial = undefined;
		}
	}
}
