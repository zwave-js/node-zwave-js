import type { CommandClass, ICommandClassContainer } from "@zwave-js/cc";
import {
	MAX_NODES,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MulticastCC,
	type SinglecastCC,
	type TXReport,
	TransmitOptions,
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
} from "@zwave-js/core";
import type { CCEncodingContext } from "@zwave-js/host";
import type {
	MessageEncodingContext,
	MessageParsingContext,
	MessageRaw,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	MessageType,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";
import { ApplicationCommandRequest } from "../application/ApplicationCommandRequest";
import { BridgeApplicationCommandRequest } from "../application/BridgeApplicationCommandRequest";
import { MAX_SEND_ATTEMPTS } from "./SendDataMessages";
import { parseTXReport, txReportToMessageRecord } from "./SendDataShared";

@messageTypes(MessageType.Request, FunctionType.SendDataBridge)
@priority(MessagePriority.Normal)
export class SendDataBridgeRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataBridgeRequestBase {
		return SendDataBridgeRequestTransmitReport.from(raw, ctx);
	}
}

export interface SendDataBridgeRequestOptions<
	CCType extends CommandClass = CommandClass,
> {
	command: CCType;
	sourceNodeId: number;
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
		options: SendDataBridgeRequestOptions<CCType> & MessageBaseOptions,
	) {
		super(options);

		if (!options.command.isSinglecast() && !options.command.isBroadcast()) {
			throw new ZWaveError(
				`SendDataBridgeRequest can only be used for singlecast and broadcast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.sourceNodeId = options.sourceNodeId;

		this.command = options.command;
		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		if (options.maxSendAttempts != undefined) {
			this.maxSendAttempts = options.maxSendAttempts;
		}
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

	// Cache the serialized CC, so we can check if it needs to be fragmented
	private _serializedCC: Buffer | undefined;
	/** @internal */
	public serializeCC(ctx: CCEncodingContext): Buffer {
		if (!this._serializedCC) {
			this._serializedCC = this.command.serialize(ctx);
		}
		return this._serializedCC;
	}

	public prepareRetransmission(): void {
		this.command.prepareRetransmission();
		this._serializedCC = undefined;
		this.callbackId = undefined;
	}

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const sourceNodeId = encodeNodeID(
			this.sourceNodeId,
			ctx.nodeIdType,
		);
		const destinationNodeId = encodeNodeID(
			this.command.nodeId,
			ctx.nodeIdType,
		);
		const serializedCC = this.serializeCC(ctx);

		this.payload = Buffer.concat([
			sourceNodeId,
			destinationNodeId,
			Buffer.from([serializedCC.length]),
			serializedCC,
			Buffer.from([this.transmitOptions, 0, 0, 0, 0, this.callbackId]),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}

	public expectsNodeUpdate(): boolean {
		return (
			// Only true singlecast commands may expect a response
			this.command.isSinglecast()
			// ... and only if the command expects a response
			&& this.command.expectsCCResponse()
		);
	}

	public isExpectedNodeUpdate(msg: Message): boolean {
		return (
			(msg instanceof ApplicationCommandRequest
				|| msg instanceof BridgeApplicationCommandRequest)
			&& this.command.isExpectedCCResponse(msg.command)
		);
	}
}

export interface SendDataBridgeRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
	txReport?: TXReport;
}

export class SendDataBridgeRequestTransmitReport
	extends SendDataBridgeRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& SendDataBridgeRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
		this.txReport = options.txReport;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataBridgeRequestTransmitReport {
		const callbackId = raw.payload[0];
		const transmitStatus: TransmitStatus = raw.payload[1];

		// TODO: Consider NOT parsing this for transmit status other than OK or NoACK
		const txReport = parseTXReport(
			transmitStatus !== TransmitStatus.NoAck,
			raw.payload.subarray(2),
		);

		return new SendDataBridgeRequestTransmitReport({
			callbackId,
			transmitStatus,
			txReport,
		});
	}

	public readonly transmitStatus: TransmitStatus;
	public readonly txReport: TXReport | undefined;

	public isOK(): boolean {
		return this.transmitStatus === TransmitStatus.OK;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				"transmit status":
					getEnumMemberName(TransmitStatus, this.transmitStatus)
					+ (this.txReport
						? `, took ${this.txReport.txTicks * 10} ms`
						: ""),
				...(this.txReport
					? txReportToMessageRecord(this.txReport)
					: {}),
			},
		};
	}
}

export interface SendDataBridgeResponseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SendDataBridge)
export class SendDataBridgeResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: SendDataBridgeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.wasSent = options.wasSent;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataBridgeResponse {
		const wasSent = raw.payload[0] !== 0;

		return new SendDataBridgeResponse({
			wasSent,
		});
	}

	isOK(): boolean {
		return this.wasSent;
	}

	public wasSent: boolean;

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
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataMulticastBridgeRequestBase {
		return SendDataMulticastBridgeRequestTransmitReport.from(raw, ctx);
	}
}

export interface SendDataMulticastBridgeRequestOptions<
	CCType extends CommandClass,
> {
	command: CCType;
	sourceNodeId: number;
	transmitOptions?: TransmitOptions;
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendDataMulticastBridge)
@expectedCallback(FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeRequest<
	CCType extends CommandClass = CommandClass,
> extends SendDataMulticastBridgeRequestBase implements ICommandClassContainer {
	public constructor(
		options:
			& SendDataMulticastBridgeRequestOptions<CCType>
			& MessageBaseOptions,
	) {
		super(options);

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

		this.sourceNodeId = options.sourceNodeId;
		this.command = options.command;
		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		if (options.maxSendAttempts != undefined) {
			this.maxSendAttempts = options.maxSendAttempts;
		}
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

	// Cache the serialized CC, so we can check if it needs to be fragmented
	private _serializedCC: Buffer | undefined;
	/** @internal */
	public serializeCC(ctx: CCEncodingContext): Buffer {
		if (!this._serializedCC) {
			this._serializedCC = this.command.serialize(ctx);
		}
		return this._serializedCC;
	}

	public prepareRetransmission(): void {
		this.command.prepareRetransmission();
		this._serializedCC = undefined;
		this.callbackId = undefined;
	}

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const serializedCC = this.serializeCC(ctx);
		const sourceNodeId = encodeNodeID(
			this.sourceNodeId,
			ctx.nodeIdType,
		);
		const destinationNodeIDs = this.command.nodeId.map((id) =>
			encodeNodeID(id, ctx.nodeIdType)
		);

		this.payload = Buffer.concat([
			sourceNodeId,
			// # of target nodes, not # of bytes
			Buffer.from([this.command.nodeId.length]),
			...destinationNodeIDs,
			Buffer.from([serializedCC.length]),
			// payload
			serializedCC,
			Buffer.from([this.transmitOptions, this.callbackId]),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
				"target nodes": this.command.nodeId.join(", "),
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export interface SendDataMulticastBridgeRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class SendDataMulticastBridgeRequestTransmitReport
	extends SendDataMulticastBridgeRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& SendDataMulticastBridgeRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataMulticastBridgeRequestTransmitReport {
		const callbackId = raw.payload[0];
		const transmitStatus: TransmitStatus = raw.payload[1];

		return new SendDataMulticastBridgeRequestTransmitReport({
			callbackId,
			transmitStatus,
		});
	}

	public transmitStatus: TransmitStatus;

	public isOK(): boolean {
		return this.transmitStatus === TransmitStatus.OK;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}

export interface SendDataMulticastBridgeResponseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: SendDataMulticastBridgeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.wasSent = options.wasSent;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataMulticastBridgeResponse {
		const wasSent = raw.payload[0] !== 0;

		return new SendDataMulticastBridgeResponse({
			wasSent,
		});
	}

	public isOK(): boolean {
		return this.wasSent;
	}

	public wasSent: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was sent": this.wasSent },
		};
	}
}
