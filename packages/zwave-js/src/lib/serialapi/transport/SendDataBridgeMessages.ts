import {
	MAX_NODES,
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	expectedCallback,
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, JSONObject, num2hex } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";
import type {
	CommandClass,
	MulticastCC,
	SinglecastCC,
} from "../../commandclass/CommandClass";
import type { ICommandClassContainer } from "../../commandclass/ICommandClassContainer";
import {
	TransmitOptions,
	TransmitStatus,
	TXReport,
} from "../../controller/_Types";
import { ApplicationCommandRequest } from "../application/ApplicationCommandRequest";
import { BridgeApplicationCommandRequest } from "../application/BridgeApplicationCommandRequest";
import { MAX_SEND_ATTEMPTS } from "./SendDataMessages";
import { parseTXReport, txReportToMessageRecord } from "./SendDataShared";

@messageTypes(MessageType.Request, FunctionType.SendDataBridge)
@priority(MessagePriority.Normal)
export class SendDataBridgeRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataBridgeRequestTransmitReport
		) {
			return new SendDataBridgeRequestTransmitReport(host, options);
		}
		super(host, options);
	}
}

interface SendDataBridgeRequestOptions<
	CCType extends CommandClass = CommandClass,
> extends MessageBaseOptions {
	command: CCType;
	sourceNodeId?: number;
	transmitOptions?: TransmitOptions;
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendDataBridge)
@expectedCallback(FunctionType.SendDataBridge)
export class SendDataBridgeRequest<CCType extends CommandClass = CommandClass>
	extends SendDataBridgeRequestBase
	implements ICommandClassContainer
{
	public constructor(
		host: ZWaveHost,
		options: SendDataBridgeRequestOptions<CCType>,
	) {
		super(host, options);

		if (!options.command.isSinglecast()) {
			throw new ZWaveError(
				`SendDataBridgeRequest can only be used for singlecast and broadcast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.sourceNodeId = options.sourceNodeId ?? host.ownNodeId;

		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions ?? TransmitOptions.DEFAULT;
		this.maxSendAttempts =
			options.maxSendAttempts ?? host.options.attempts.sendData;
	}

	/** Which Node ID this command originates from */
	public sourceNodeId: number;

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

	public override getNodeId(): number | undefined {
		return this.command.nodeId;
	}

	public serialize(): Buffer {
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			Buffer.from([
				this.sourceNodeId,
				this.command.nodeId,
				serializedCC.length,
			]),
			serializedCC,
			Buffer.from([this.transmitOptions, 0, 0, 0, 0, this.callbackId]),
		]);

		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			sourceNodeId: this.sourceNodeId,
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
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

	public expectsNodeUpdate(): boolean {
		return this.command.expectsCCResponse();
	}

	public isExpectedNodeUpdate(msg: Message): boolean {
		return (
			(msg instanceof ApplicationCommandRequest ||
				msg instanceof BridgeApplicationCommandRequest) &&
			this.command.isExpectedCCResponse(msg.command)
		);
	}
}

interface SendDataBridgeRequestTransmitReportOptions
	extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataBridgeRequestTransmitReport
	extends SendDataBridgeRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SendDataBridgeRequestTransmitReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this.transmitStatus = this.payload[1];
			this.txReport = parseTXReport(
				this.transmitStatus !== TransmitStatus.NoAck,
				this.payload.slice(2),
			);
		} else {
			this.callbackId = options.callbackId;
			this.transmitStatus = options.transmitStatus;
		}
	}

	public readonly transmitStatus: TransmitStatus;
	public readonly txReport: TXReport | undefined;

	public isOK(): boolean {
		return this.transmitStatus === TransmitStatus.OK;
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
				"transmit status":
					getEnumMemberName(TransmitStatus, this.transmitStatus) +
					(this.txReport
						? `, took ${this.txReport.txTicks * 10} ms`
						: ""),
				...(this.txReport
					? txReportToMessageRecord(this.txReport)
					: {}),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendDataBridge)
export class SendDataBridgeResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this._wasSent = this.payload[0] !== 0;
	}

	isOK(): boolean {
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

@messageTypes(MessageType.Request, FunctionType.SendDataMulticastBridge)
@priority(MessagePriority.Normal)
export class SendDataMulticastBridgeRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataMulticastBridgeRequestTransmitReport
		) {
			return new SendDataMulticastBridgeRequestTransmitReport(
				host,
				options,
			);
		}
		super(host, options);
	}
}

interface SendDataMulticastBridgeRequestOptions<CCType extends CommandClass>
	extends MessageBaseOptions {
	command: CCType;
	sourceNodeId?: number;
	transmitOptions?: TransmitOptions;
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendDataMulticastBridge)
@expectedCallback(FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeRequest<
		CCType extends CommandClass = CommandClass,
	>
	extends SendDataMulticastBridgeRequestBase
	implements ICommandClassContainer
{
	public constructor(
		host: ZWaveHost,
		options: SendDataMulticastBridgeRequestOptions<CCType>,
	) {
		super(host, options);

		if (!options.command.isMulticast()) {
			throw new ZWaveError(
				`SendDataMulticastBridgeRequest can only be used for multicast CCs`,
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

		this.sourceNodeId = options.sourceNodeId ?? host.ownNodeId;
		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions ?? TransmitOptions.DEFAULT;
		this.maxSendAttempts =
			options.maxSendAttempts ?? host.options.attempts.sendData;
	}

	/** Which Node ID this command originates from */
	public sourceNodeId: number;

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

	public override getNodeId(): number | undefined {
		// This is multicast, getNodeId must return undefined here
		return undefined;
	}

	public serialize(): Buffer {
		// The payload CC must not include the target node ids, so strip the header out
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			// # of target nodes and nodeIds
			Buffer.from([
				this.sourceNodeId,
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
			sourceNodeId: this.sourceNodeId,
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
				"target nodes": this.command.nodeId.join(", "),
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId,
			},
		};
	}
}

interface SendDataMulticastBridgeRequestTransmitReportOptions
	extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataMulticastBridgeRequestTransmitReport
	extends SendDataMulticastBridgeRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SendDataMulticastBridgeRequestTransmitReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this._transmitStatus = this.payload[1];
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

@messageTypes(MessageType.Response, FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this._wasSent = this.payload[0] !== 0;
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
