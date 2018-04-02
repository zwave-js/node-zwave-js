import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { Constructable, expectedResponse, Message, messageTypes, priority } from "../message/Message";
import { log } from "../util/logger";
import { CommandClass, CommandClasses } from "./CommandClass";

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
}

// TODO: what is this?
export enum TransmitStatus {
	OK = 0x00, // Transmission complete and ACK received
	NoAck = 0x01, // Transmission complete, no ACK received
	Fail = 0x02, // Transmission failed
	NotIdle = 0x03, // Transmission failed, network busy
	NoRoute = 0x04, // Tranmission complete, no return route
}

let lastCallbackId = 0;
function getNextCallbackId(): number {
	lastCallbackId++;
	if (lastCallbackId > 0xff) lastCallbackId = 1;
	return lastCallbackId;
}

@messageTypes(MessageType.Request, FunctionType.SendData)
@expectedResponse(FunctionType.SendData)
@priority(MessagePriority.Normal)
export class SendDataRequest extends Message {

	// tslint:disable:unified-signatures
	// empty constructor to parse messages
	constructor();
	// default constructor to send messages
	constructor(
		command: CommandClass,
		transmitOptions?: TransmitOptions,
		callbackId?: number,
	);
	constructor(
		/** The command this message contains */
		public command?: CommandClass,
		/** Options regarding the transmission of the message */
		public transmitOptions?: TransmitOptions,
		/** A callback ID to map requests and responses */
		public callbackId?: number,
	) {
		super();
		if (command != null) {
			// non-empty constructor -> define default values
			if (this.transmitOptions == null) this.transmitOptions = TransmitOptions.DEFAULT;
			if (this.callbackId == null) this.callbackId = getNextCallbackId();
		}
	}
	// tslint:enable:unified-signatures

	public serialize(): Buffer {
		if (this.command == null) {
			throw new ZWaveError(
				"Cannot serialize a SendData message without a command",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			serializedCC,
			Buffer.from([
				this.transmitOptions,
				this.callbackId,
			]),
		]);

		return super.serialize();
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// the data is the command class
		const serializedCC = this.payload.slice(0, this.payload.length - 2);
		this.command = CommandClass.from(serializedCC);
		// followed by two bytes for tx and callback
		this.transmitOptions = this.payload[this.payload.length - 2];
		this.callbackId = this.payload[this.payload.length - 1];

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.SendData)
export class SendDataResponse extends Message {

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	private _errorCode: number;
	public get errorCode(): number {
		return this._errorCode;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._wasSent = this.payload[0] !== 0;
		if (!this._wasSent) this._errorCode = this.payload[0];

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			errorCode: this.errorCode,
		});
	}

}
