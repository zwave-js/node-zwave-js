import {
	CCResponseRole,
	CommandClass,
	getExpectedCCResponse,
	isDynamicCCResponse,
} from "../commandclass/CommandClass";
import {
	EncapsulatingCommandClass,
	isEncapsulatingCommandClass,
} from "../commandclass/EncapsulatingCommandClass";
import {
	ICommandClassContainer,
	isCommandClassContainer,
} from "../commandclass/ICommandClassContainer";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { MessageOrCCLogEntry } from "../log/shared";
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
import { getEnumMemberName, JSONObject, staticExtends } from "../util/misc";
import { num2hex } from "../util/strings";
import { encodeBitMask } from "../values/Primitive";
import { ApplicationCommandRequest } from "./ApplicationCommandRequest";
import { MAX_NODES } from "./NodeBitMask";

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
}

interface SendDataRequestOptions<CCType extends CommandClass = CommandClass>
	extends MessageBaseOptions {
	command: CCType;
	transmitOptions?: TransmitOptions;
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `transmitOptions: ${num2hex(this.transmitOptions)}
callbackId:      ${this.callbackId}`,
		};
	}

	/** Include previously received partial responses into a final message */
	public mergePartialMessages(partials: Message[]): void {
		this.command.mergePartialCCs(
			(partials as SendDataRequest[]).map(p => p.command),
		);
	}

	/** @inheritDoc */
	public testResponse(msg: Message): ResponseRole {
		const ret = super.testResponse(msg);
		// We handle a special case here: A node's response to a SendDataRequest comes in an
		// ApplicationCommandRequest which does not have a callback id, so it is classified as
		// "unexpected". Test those again with the predicate for SendDataRequests
		if (
			ret === "unexpected" &&
			msg instanceof ApplicationCommandRequest &&
			// Ensure the nodeId matches (GH #623)
			msg.command.nodeId === this.command.nodeId
		) {
			return testResponseForSendDataRequest(this, msg);
		}
		return ret;
	}
}

// Generic handler for all potential responses to SendDataRequests
function testResponseForSendDataRequest(
	sent: SendDataRequest,
	received: Message,
): ResponseRole {
	let msgIsPositiveTransmitReport = false;
	if (received instanceof SendDataResponse) {
		return received.wasSent ? "confirmation" : "fatal_controller";
	} else if (received instanceof SendDataRequestTransmitReport) {
		// send data requests are final unless stated otherwise by a CommandClass
		if (received.isFailed()) return "fatal_node";
		msgIsPositiveTransmitReport = true;
	} else if (!(received instanceof ApplicationCommandRequest)) {
		return "unexpected";
	}

	const sentCommand = sent.command;
	const receivedCommand = isCommandClassContainer(received)
		? received.command
		: undefined;

	// Check the sent command if it expects this response
	const ret = testResponseForCC(
		sentCommand,
		receivedCommand,
		msgIsPositiveTransmitReport,
	);
	return ret;
}

function testResponseForCC(
	sent: CommandClass,
	received: CommandClass | undefined,
	isTransmitReport: boolean,
): Exclude<CCResponseRole, "checkEncapsulated"> {
	let ret: CCResponseRole | undefined;
	const isEncapCC = isEncapsulatingCommandClass(sent);

	let expected = getExpectedCCResponse(sent);
	// Evaluate dynamic CC responses
	if (
		typeof expected === "function" &&
		!staticExtends(expected, CommandClass) &&
		isDynamicCCResponse(expected)
	) {
		expected = expected(sent);
	}

	if (expected == undefined) {
		// The CC expects no CC response, a transmit report is the final message
		ret = isTransmitReport ? "final" : "unexpected";
	} else if (staticExtends(expected, CommandClass)) {
		// The CC always expects the same response, check if this is the one
		if (received && received instanceof expected) {
			ret = received.expectMoreMessages()
				? "partial"
				: isEncapCC
				? "checkEncapsulated"
				: "final";
		} else if (isTransmitReport) {
			ret = isEncapCC ? "checkEncapsulated" : "confirmation";
		} else {
			ret = "unexpected";
		}
	} else {
		// The CC wants to test the response itself, let it do so
		ret = expected(sent, received, isTransmitReport);
	}

	if (ret === "checkEncapsulated") {
		ret = testResponseForCC(
			((sent as unknown) as EncapsulatingCommandClass).encapsulated,
			isEncapsulatingCommandClass(received)
				? received.encapsulated
				: undefined,
			isTransmitReport,
		);
	}

	return ret;
}

interface SendDataRequestTransmitReportOptions extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataRequestTransmitReport extends SendDataRequestBase {
	public constructor(
		driver: IDriver,
		options:
			| MessageDeserializationOptions
			| SendDataRequestTransmitReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this._transmitStatus = this.payload[1];
			// not sure what bytes 2 and 3 mean
			// the CC seems not to be included in this, but rather come in an application command later
		} else {
			this.callbackId = options.callbackId;
			this._transmitStatus = options.transmitStatus;
		}
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `callbackId:     ${this.callbackId}
transmitStatus: ${getEnumMemberName(TransmitStatus, this.transmitStatus)}`,
		};
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `wasSent: ${this.wasSent}`,
		};
	}
}

@messageTypes(MessageType.Request, FunctionType.SendDataMulticast)
@priority(MessagePriority.Normal)
export class SendDataMulticastRequestBase extends Message {
	public constructor(driver: IDriver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataMulticastRequestTransmitReport
		) {
			return new SendDataMulticastRequestTransmitReport(driver, options);
		}
		super(driver, options);
	}
}

interface SendDataMulticastRequestOptions<
	CCType extends CommandClass = CommandClass
> extends MessageBaseOptions {
	nodeIds: [number, ...number[]];
	command: CCType;
	transmitOptions?: TransmitOptions;
}

@expectedResponse(testResponseForSendDataMulticastRequest)
export class SendDataMulticastRequest<
	CCType extends CommandClass = CommandClass
> extends SendDataMulticastRequestBase implements ICommandClassContainer {
	public constructor(
		driver: IDriver,
		options: SendDataMulticastRequestOptions<CCType>,
	) {
		super(driver, options);

		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions != undefined
				? options.transmitOptions
				: TransmitOptions.DEFAULT;

		if (options.nodeIds.length === 0) {
			throw new ZWaveError(
				`At least one node must be targeted`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (options.nodeIds.some(n => n < 1 || n > MAX_NODES)) {
			throw new ZWaveError(
				`All node IDs must be between 1 and ${MAX_NODES}!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.nodeIds = options.nodeIds;
	}

	/** The command this message contains */
	public command: CCType;
	/** Options regarding the transmission of the message */
	public transmitOptions: TransmitOptions;
	/** The IDs of all nodes that should receive this message */
	public nodeIds: number[];

	public serialize(): Buffer {
		// The payload CC must not include the target node ids, so strip the header out
		// TODO: Refactor this and CommandClass.serialize()
		const serializedCC = this.command.serializeForEncapsulation();
		const destinationBitMask = encodeBitMask(
			this.nodeIds,
			Math.max(...this.nodeIds),
		);
		this.payload = Buffer.concat([
			// Target bit mask + length
			Buffer.from([destinationBitMask.length]),
			destinationBitMask,
			// payload
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `transmitOptions: ${num2hex(this.transmitOptions)}
callbackId:      ${this.callbackId}`,
		};
	}

	/** Include previously received partial responses into a final message */
	public mergePartialMessages(partials: Message[]): void {
		this.command.mergePartialCCs(
			(partials as SendDataMulticastRequest[]).map(p => p.command),
		);
	}
}

// Generic handler for all potential responses to SendDataMulticastRequests
function testResponseForSendDataMulticastRequest(
	sent: SendDataMulticastRequest,
	received: Message,
): ResponseRole {
	if (received instanceof SendDataMulticastResponse) {
		return received.wasSent ? "confirmation" : "fatal_controller";
	} else if (received instanceof SendDataMulticastRequestTransmitReport) {
		return received.isFailed() ? "fatal_node" : "final";
	}
	// Multicast messages cannot expect a response from the nodes
	return "unexpected";
}

interface SendDataMulticastRequestTransmitReportOptions
	extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataMulticastRequestTransmitReport extends SendDataMulticastRequestBase {
	public constructor(
		driver: IDriver,
		options:
			| MessageDeserializationOptions
			| SendDataMulticastRequestTransmitReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this._transmitStatus = this.payload[1];
			// not sure what bytes 2 and 3 mean
			// the CC seems not to be included in this, but rather come in an application command later
		} else {
			this.callbackId = options.callbackId;
			this._transmitStatus = options.transmitStatus;
		}
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	/** Checks if a received SendDataMulticastRequest indicates that sending failed */
	public isFailed(): boolean {
		return this._transmitStatus !== TransmitStatus.OK;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			callbackId: this.callbackId,
			transmitStatus: this.transmitStatus,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `callbackId:     ${this.callbackId}
transmitStatus: ${getEnumMemberName(TransmitStatus, this.transmitStatus)}`,
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendDataMulticast)
export class SendDataMulticastResponse extends Message {
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

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			wasSent: this.wasSent,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `wasSent: ${this.wasSent}`,
		};
	}
}

/** Checks whether the message is a report that tells us that a message was sent */
export function isSendReport(
	msg: Message,
): msg is SendDataResponse | SendDataMulticastResponse {
	return (
		msg instanceof SendDataResponse ||
		msg instanceof SendDataMulticastResponse
	);
}

/** Checks whether the message is a report that contains the transmit status of a message */
export function isTransmitReport(
	msg: Message,
): msg is
	| SendDataRequestTransmitReport
	| SendDataMulticastRequestTransmitReport {
	return (
		msg instanceof SendDataRequestTransmitReport ||
		msg instanceof SendDataMulticastRequestTransmitReport
	);
}
