import type { CCEncodingContext, CommandClass } from "@zwave-js/cc";
import {
	MAX_NODES,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MulticastCC,
	type MulticastDestination,
	type SinglecastCC,
	type TXReport,
	TransmitOptions,
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
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
	MessageOrigin,
	MessageType,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName, num2hex } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";
import { ApplicationCommandRequest } from "../application/ApplicationCommandRequest.js";
import { BridgeApplicationCommandRequest } from "../application/BridgeApplicationCommandRequest.js";
import { type MessageWithCC, containsCC } from "../utils.js";
import { MAX_SEND_ATTEMPTS } from "./SendDataMessages.js";
import {
	encodeTXReport,
	parseTXReport,
	txReportToMessageRecord,
} from "./SendDataShared.js";

@messageTypes(MessageType.Request, FunctionType.SendDataBridge)
@priority(MessagePriority.Normal)
export class SendDataBridgeRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataBridgeRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return SendDataBridgeRequest.from(raw, ctx);
		} else {
			return SendDataBridgeRequestTransmitReport.from(raw, ctx);
		}
	}
}

export type SendDataBridgeRequestOptions<
	CCType extends CommandClass = CommandClass,
> =
	& (
		| { command: CCType }
		| {
			nodeId: number;
			serializedCC: Uint8Array;
		}
	)
	& {
		sourceNodeId: number;
		transmitOptions?: TransmitOptions;
		maxSendAttempts?: number;
	};

@expectedResponse(FunctionType.SendDataBridge)
@expectedCallback(FunctionType.SendDataBridge)
export class SendDataBridgeRequest<CCType extends CommandClass = CommandClass>
	extends SendDataBridgeRequestBase
	implements MessageWithCC
{
	public constructor(
		options: SendDataBridgeRequestOptions<CCType> & MessageBaseOptions,
	) {
		super(options);

		if ("command" in options) {
			if (
				!options.command.isSinglecast()
				&& !options.command.isBroadcast()
			) {
				throw new ZWaveError(
					`SendDataBridgeRequest can only be used for singlecast and broadcast CCs`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.command = options.command;
			this._nodeId = options.command.nodeId;
		} else {
			this._nodeId = options.nodeId;
			this.serializedCC = options.serializedCC;
		}

		this.sourceNodeId = options.sourceNodeId;

		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		if (options.maxSendAttempts != undefined) {
			this.maxSendAttempts = options.maxSendAttempts;
		}
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataBridgeRequestBase {
		let offset = 0;
		let parseResult = parseNodeID(raw.payload, ctx.nodeIdType);
		const sourceNodeId = parseResult.nodeId;
		offset += parseResult.bytesRead;

		parseResult = parseNodeID(raw.payload, ctx.nodeIdType, offset);
		const destinationNodeId = parseResult.nodeId;
		offset += parseResult.bytesRead;

		const ccLength = raw.payload[offset++];
		const serializedCC = raw.payload.slice(offset, offset + ccLength);
		offset += ccLength;

		const transmitOptions = raw.payload[offset++];

		// The route field is unused
		offset += 4;

		const callbackId = raw.payload[offset++];

		return new this({
			sourceNodeId,
			nodeId: destinationNodeId,
			serializedCC,
			transmitOptions,
			callbackId,
		});
	}

	/** Which Node ID this command originates from */
	public sourceNodeId: number;

	/** The command this message contains */
	public command: SinglecastCC<CCType> | undefined;
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

	private _nodeId: number;
	public override getNodeId(): number | undefined {
		return this.command?.nodeId ?? this._nodeId;
	}

	public serializedCC: Uint8Array | undefined;
	public async serializeCC(ctx: CCEncodingContext): Promise<Uint8Array> {
		if (!this.serializedCC) {
			if (!this.command) {
				throw new ZWaveError(
					`Cannot serialize a ${this.constructor.name} without a command`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.serializedCC = await this.command.serialize(ctx);
		}
		return this.serializedCC;
	}

	public prepareRetransmission(): void {
		this.command?.prepareRetransmission();
		this.serializedCC = undefined;
		this.callbackId = undefined;
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const sourceNodeId = encodeNodeID(
			this.sourceNodeId,
			ctx.nodeIdType,
		);
		const destinationNodeId = encodeNodeID(
			this.command?.nodeId ?? this._nodeId,
			ctx.nodeIdType,
		);
		const serializedCC = await this.serializeCC(ctx);

		this.payload = Bytes.concat([
			sourceNodeId,
			destinationNodeId,
			Bytes.from([serializedCC.length]),
			serializedCC,
			Bytes.from([this.transmitOptions, 0, 0, 0, 0, this.callbackId]),
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
			// We can only answer this if the command is known
			this.command != undefined
			// Only true singlecast commands may expect a response
			&& this.command.isSinglecast()
			// ... and only if the command expects a response
			&& this.command.expectsCCResponse()
		);
	}

	public isExpectedNodeUpdate(msg: Message): boolean {
		return (
			// We can only answer this if the command is known
			this.command != undefined
			&& (msg instanceof ApplicationCommandRequest
				|| msg instanceof BridgeApplicationCommandRequest)
			&& containsCC(msg)
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

		return new this({
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

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([this.callbackId, this.transmitStatus]);
		if (this.txReport) {
			this.payload = Bytes.concat([
				this.payload,
				encodeTXReport(this.txReport),
			]);
		}

		return super.serialize(ctx);
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

		return new this({
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
		if (ctx.origin === MessageOrigin.Host) {
			return SendDataMulticastBridgeRequest.from(raw, ctx);
		} else {
			return SendDataMulticastBridgeRequestTransmitReport.from(raw, ctx);
		}
	}
}

export type SendDataMulticastBridgeRequestOptions<
	CCType extends CommandClass,
> =
	& (
		| { command: CCType }
		| {
			nodeIds: MulticastDestination;
			serializedCC: Uint8Array;
		}
	)
	& {
		sourceNodeId: number;
		transmitOptions?: TransmitOptions;
		maxSendAttempts?: number;
	};

@expectedResponse(FunctionType.SendDataMulticastBridge)
@expectedCallback(FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeRequest<
	CCType extends CommandClass = CommandClass,
> extends SendDataMulticastBridgeRequestBase implements MessageWithCC {
	public constructor(
		options:
			& SendDataMulticastBridgeRequestOptions<CCType>
			& MessageBaseOptions,
	) {
		super(options);

		if ("command" in options) {
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
			} else if (
				options.command.nodeId.some((n) => n < 1 || n > MAX_NODES)
			) {
				throw new ZWaveError(
					`All node IDs must be between 1 and ${MAX_NODES}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.command = options.command;
			this.nodeIds = this.command.nodeId;
		} else {
			this.nodeIds = options.nodeIds;
			this.serializedCC = options.serializedCC;
		}

		this.sourceNodeId = options.sourceNodeId;
		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		if (options.maxSendAttempts != undefined) {
			this.maxSendAttempts = options.maxSendAttempts;
		}
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataMulticastBridgeRequest {
		const { nodeId: sourceNodeId, bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
		);
		let offset = bytesRead;

		const destinationNodeIdCount = raw.payload[offset++];
		const nodeIds: number[] = [];
		for (let i = 0; i < destinationNodeIdCount; i++) {
			const { nodeId, bytesRead } = parseNodeID(
				raw.payload,
				ctx.nodeIdType,
				offset,
			);
			nodeIds.push(nodeId);
			offset += bytesRead;
		}

		const ccLength = raw.payload[offset++];
		const serializedCC = raw.payload.slice(offset, offset + ccLength);
		offset += ccLength;

		const transmitOptions = raw.payload[offset++];
		const callbackId = raw.payload[offset++];

		return new this({
			sourceNodeId,
			nodeIds: nodeIds as MulticastDestination,
			serializedCC,
			transmitOptions,
			callbackId,
		});
	}

	/** Which Node ID this command originates from */
	public sourceNodeId: number;

	/** The command this message contains */
	public command: MulticastCC<CCType> | undefined;
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

	public nodeIds: MulticastDestination;
	public override getNodeId(): number | undefined {
		// This is multicast, getNodeId must return undefined here
		return undefined;
	}

	public serializedCC: Uint8Array | undefined;
	public async serializeCC(ctx: CCEncodingContext): Promise<Uint8Array> {
		if (!this.serializedCC) {
			if (!this.command) {
				throw new ZWaveError(
					`Cannot serialize a ${this.constructor.name} without a command`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.serializedCC = await this.command.serialize(ctx);
		}
		return this.serializedCC;
	}

	public prepareRetransmission(): void {
		this.command?.prepareRetransmission();
		this.serializedCC = undefined;
		this.callbackId = undefined;
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const serializedCC = await this.serializeCC(ctx);
		const sourceNodeId = encodeNodeID(
			this.sourceNodeId,
			ctx.nodeIdType,
		);
		const destinationNodeIDs = (this.command?.nodeId ?? this.nodeIds)
			.map((id) => encodeNodeID(id, ctx.nodeIdType));

		this.payload = Bytes.concat([
			sourceNodeId,
			// # of target nodes, not # of bytes
			Bytes.from([destinationNodeIDs.length]),
			...destinationNodeIDs,
			Bytes.from([serializedCC.length]),
			// payload
			serializedCC,
			Bytes.from([this.transmitOptions, this.callbackId]),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
				"target nodes": (this.command?.nodeId ?? this.nodeIds).join(
					", ",
				),
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

		return new this({
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

		return new this({
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
