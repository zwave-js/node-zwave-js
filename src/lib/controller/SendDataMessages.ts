import {
	CommandClass,
	getExpectedCCResponse,
} from "../commandclass/CommandClass";
import {
	ICommandClassContainer,
	isCommandClassContainer,
} from "../commandclass/ICommandClassContainer";
import { IDriver } from "../driver/IDriver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
	ResponseRole,
} from "../message/Message";
import { JSONObject, staticExtends } from "../util/misc";

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
}

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

@messageTypes(MessageType.Request, FunctionType.SendData)
@priority(MessagePriority.Normal)
export class SendDataRequestBase extends Message {
	public constructor(driver: IDriver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataRequestTransmitReport
		) {
			return new SendDataRequestTransmitReport(driver, options);
		}
		super(driver, options);
	}

	/** A callback ID to map requests and responses */
	// We need the ! assertion because TypeScript doesn't know it is being set
	// in a derived class
	public callbackId!: number;
}

export interface SendDataRequestOptions<
	CCType extends CommandClass = CommandClass
> extends MessageBaseOptions {
	command: CCType;
	transmitOptions?: TransmitOptions;
	callbackId?: number;
}

@expectedResponse(testResponseForSendDataRequest)
export class SendDataRequest<CCType extends CommandClass = CommandClass>
	extends SendDataRequestBase
	implements ICommandClassContainer {
	public constructor(
		driver: IDriver,
		options: SendDataRequestOptions<CCType>,
	) {
		super(driver, options);

		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions != undefined
				? options.transmitOptions
				: TransmitOptions.DEFAULT;
		this.callbackId =
			options.callbackId != undefined
				? options.callbackId
				: getNextCallbackId();
	}

	/** The command this message contains */
	public command: CCType;
	/** Options regarding the transmission of the message */
	public transmitOptions: TransmitOptions;

	public serialize(): Buffer {
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			serializedCC,
			Buffer.from([this.transmitOptions, this.callbackId]),
		]);

		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}

	/** @inheritDoc */
	public testResponse(msg: Message): ResponseRole {
		const ret = super.testResponse(msg);
		if (ret === "confirmation" || ret.startsWith("fatal")) return ret;
		if (ret === "unexpected" && !isCommandClassContainer(msg)) return ret;
		// We handle a special case here:
		// If the contained CC expects a certain response (which will come in an "unexpected" ApplicationCommandRequest)
		// we declare that as final and the original "final" response, i.e. the SendDataRequest becomes a confirmation
		const expectedCCOrDynamic = getExpectedCCResponse(this.command);
		const expected =
			typeof expectedCCOrDynamic === "function" &&
			!staticExtends(expectedCCOrDynamic, CommandClass)
				? expectedCCOrDynamic(this.command)
				: expectedCCOrDynamic;

		if (expected == undefined) return ret; // "final" | "unexpected"

		if (isCommandClassContainer(msg)) {
			// TODO: Is "confirmation" the correct return value here?
			// Or is it "unexpected"?
			if (msg.command instanceof expected) {
				return msg.command.expectMoreMessages() ? "partial" : "final";
			}
			// return expected === msg.command.ccId ? "final" : "confirmation"; // not sure if other CCs can come in the meantime
		}
		return "unexpected";
	}

	/** Include previously received partial responses into a final message */
	public mergePartialMessages(partials: Message[]): void {
		this.command.mergePartialCCs(
			(partials as SendDataRequest[]).map(p => p.command),
		);
	}
}

export class SendDataRequestTransmitReport extends SendDataRequestBase {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._transmitStatus = this.payload[1];
		// not sure what bytes 2 and 3 mean
		// the CC seems not to be included in this, but rather come in an application command later
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	/** Checks if a received SendDataRequest indicates that sending failed */
	public isFailed(): boolean {
		return this._transmitStatus !== TransmitStatus.OK;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			callbackId: this.callbackId,
			transmitStatus: this.transmitStatus,
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.SendData)
export class SendDataResponse extends Message {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
		super(driver, options);
		this._wasSent = this.payload[0] !== 0;
		// if (!this._wasSent) this._errorCode = this.payload[0];
	}

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	// private _errorCode: number;
	// public get errorCode(): number {
	// 	return this._errorCode;
	// }

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			// errorCode: this.errorCode,
		});
	}
}

// Generic handler for all potential responses to SendDataRequests
function testResponseForSendDataRequest(
	sent: SendDataRequest,
	received: Message,
): ResponseRole {
	if (received instanceof SendDataResponse) {
		return received.wasSent ? "confirmation" : "fatal_controller";
	} else if (received instanceof SendDataRequestTransmitReport) {
		return received.isFailed() ? "fatal_node" : "final"; // send data requests are final unless stated otherwise by a CommandClass
	}
	return "unexpected";
}
