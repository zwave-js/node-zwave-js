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

let lastCallbackId = 0xff;
function getNextCallbackId(): number {
	lastCallbackId = (lastCallbackId + 1) & 0xff;
	// callback IDs below 10 are reserved for nonce messages
	if (lastCallbackId < 10) lastCallbackId = 10;
	return lastCallbackId;
}

// SendDataRequests need specialized handling for the responses
// We might receive a SendDataResponse indicating that the request failed
// or we might have to wait for a SendDataRequest giving us more info about what happened
function isExpectedResponseToSendDataRequest(sent: SendDataRequest, received: Message): boolean {
	// Quick check for the function type instead of using the prototype
	if (received.functionType !== FunctionType.SendData) return false;

	// A SendDataRequest has to have the correct callback ID to be expected
	return (received instanceof SendDataRequest && received.callbackId === sent.callbackId);
}

@messageTypes(MessageType.Request, FunctionType.SendData)
@expectedResponse(isExpectedResponseToSendDataRequest)
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

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

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

	// We deserialize SendData requests differently as the controller responses have a different format
	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this.callbackId = this.payload[0];
		this._transmitStatus = this.payload[1];
		// not sure what bytes 2 and 3 mean

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}

	/** Checks if a received SendDataRequest indicates that sending failed */
	public isFailed(): boolean {
		return this._transmitStatus !== TransmitStatus.OK;
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
