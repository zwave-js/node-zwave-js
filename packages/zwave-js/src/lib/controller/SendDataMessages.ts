import {
	MAX_NODES,
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, JSONObject, num2hex } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";
import type {
	CommandClass,
	MulticastCC,
	SinglecastCC,
} from "../commandclass/CommandClass";
import type { ICommandClassContainer } from "../commandclass/ICommandClassContainer";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type { SuccessIndicator } from "../message/SuccessIndicator";
import { TransmitOptions, TransmitStatus } from "./SendDataShared";

export const MAX_SEND_ATTEMPTS = 5;

@messageTypes(MessageType.Request, FunctionType.SendData)
@priority(MessagePriority.Normal)
export class SendDataRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
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
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendData)
@expectedCallback(FunctionType.SendData)
export class SendDataRequest<CCType extends CommandClass = CommandClass>
	extends SendDataRequestBase
	implements ICommandClassContainer {
	public constructor(
		driver: Driver,
		options: SendDataRequestOptions<CCType>,
	) {
		super(driver, options);

		if (!options.command.isSinglecast()) {
			throw new ZWaveError(
				`SendDataRequest can only be used for singlecast and broadcast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions ?? TransmitOptions.DEFAULT;
		this.maxSendAttempts =
			options.maxSendAttempts ?? driver.options.attempts.sendData;
	}

	/** The command this message contains */
	public command: SinglecastCC<CCType>;
	/** Options regarding the transmission of the message */
	public transmitOptions: TransmitOptions;

	private _maxSendAttempts: number = 1;
	/** The number of times the driver may try to send this message */
	public get maxSendAttempts(): number {
		return this._maxSendAttempts;
	}
	public set maxSendAttempts(value: number) {
		this._maxSendAttempts = clamp(value, 1, MAX_SEND_ATTEMPTS);
	}

	public serialize(): Buffer {
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			Buffer.from([this.command.nodeId, serializedCC.length]),
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
			message: {
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId,
			},
		};
	}

	/** Computes the maximum payload size that can be transmitted with this message */
	public getMaxPayloadLength(): number {
		// From INS13954-7, chapter 4.3.3.1.5
		if (this.transmitOptions & TransmitOptions.Explore) return 46;
		if (this.transmitOptions & TransmitOptions.AutoRoute) return 48;
		return 54;
	}
}

interface SendDataRequestTransmitReportOptions extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataRequestTransmitReport
	extends SendDataRequestBase
	implements SuccessIndicator {
	public constructor(
		driver: Driver,
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

	public isOK(): boolean {
		return this._transmitStatus === TransmitStatus.OK;
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
			message: {
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendData)
export class SendDataResponse extends Message implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._wasSent = this.payload[0] !== 0;
		// if (!this._wasSent) this._errorCode = this.payload[0];
	}

	isOK(): boolean {
		return this._wasSent;
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
			message: { "was sent": this.wasSent },
		};
	}
}

@messageTypes(MessageType.Request, FunctionType.SendDataMulticast)
@priority(MessagePriority.Normal)
export class SendDataMulticastRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataMulticastRequestTransmitReport
		) {
			return new SendDataMulticastRequestTransmitReport(driver, options);
		}
		super(driver, options);
	}
}

interface SendDataMulticastRequestOptions<CCType extends CommandClass>
	extends MessageBaseOptions {
	command: CCType;
	transmitOptions?: TransmitOptions;
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendDataMulticast)
@expectedCallback(FunctionType.SendDataMulticast)
export class SendDataMulticastRequest<
		CCType extends CommandClass = CommandClass
	>
	extends SendDataMulticastRequestBase
	implements ICommandClassContainer {
	public constructor(
		driver: Driver,
		options: SendDataMulticastRequestOptions<CCType>,
	) {
		super(driver, options);

		if (!options.command.isMulticast()) {
			throw new ZWaveError(
				`SendDataMulticastRequest can only be used for multicast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (options.command.nodeId.length === 0) {
			throw new ZWaveError(
				`At least one node must be targeted`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (options.command.nodeId.some((n) => n < 1 || n > MAX_NODES)) {
			throw new ZWaveError(
				`All node IDs must be between 1 and ${MAX_NODES}!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions ?? TransmitOptions.DEFAULT;
		this.maxSendAttempts =
			options.maxSendAttempts ?? driver.options.attempts.sendData;
	}

	/** The command this message contains */
	public command: MulticastCC<CCType>;
	/** Options regarding the transmission of the message */
	public transmitOptions: TransmitOptions;

	private _maxSendAttempts: number = 1;
	/** The number of times the driver may try to send this message */
	public get maxSendAttempts(): number {
		return this._maxSendAttempts;
	}
	public set maxSendAttempts(value: number) {
		this._maxSendAttempts = clamp(value, 1, MAX_SEND_ATTEMPTS);
	}

	public serialize(): Buffer {
		// The payload CC must not include the target node ids, so strip the header out
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			// # of target nodes and nodeIds
			Buffer.from([
				this.command.nodeId.length,
				...this.command.nodeId,
				serializedCC.length,
			]),
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
			message: {
				"target nodes": this.command.nodeId.join(", "),
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId,
			},
		};
	}
}

interface SendDataMulticastRequestTransmitReportOptions
	extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataMulticastRequestTransmitReport
	extends SendDataMulticastRequestBase
	implements SuccessIndicator {
	public constructor(
		driver: Driver,
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

	public isOK(): boolean {
		return this._transmitStatus === TransmitStatus.OK;
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
			message: {
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendDataMulticast)
export class SendDataMulticastResponse
	extends Message
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._wasSent = this.payload[0] !== 0;
		// if (!this._wasSent) this._errorCode = this.payload[0];
	}

	public isOK(): boolean {
		return this._wasSent;
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
			message: { "was sent": this.wasSent },
		};
	}
}

@messageTypes(MessageType.Request, FunctionType.SendDataAbort)
@priority(MessagePriority.Controller)
export class SendDataAbort extends Message {}
