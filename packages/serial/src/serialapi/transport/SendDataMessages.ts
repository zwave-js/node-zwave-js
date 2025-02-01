import { type CCEncodingContext, type CommandClass } from "@zwave-js/cc";
import {
	MAX_NODES,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MulticastCC,
	type MulticastDestination,
	type SerializableTXReport,
	type SinglecastCC,
	type TXReport,
	TransmitOptions,
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	MessageOrigin,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
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
import {
	encodeTXReport,
	parseTXReport,
	serializableTXReportToTXReport,
	txReportToMessageRecord,
} from "./SendDataShared.js";

export const MAX_SEND_ATTEMPTS = 5;

@messageTypes(MessageType.Request, FunctionType.SendData)
@priority(MessagePriority.Normal)
export class SendDataRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return SendDataRequest.from(raw, ctx);
		} else {
			return SendDataRequestTransmitReport.from(raw, ctx);
		}
	}
}

export type SendDataRequestOptions<
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
		transmitOptions?: TransmitOptions;
		maxSendAttempts?: number;
	};

@expectedResponse(FunctionType.SendData)
@expectedCallback(FunctionType.SendData)
export class SendDataRequest<CCType extends CommandClass = CommandClass>
	extends SendDataRequestBase
	implements MessageWithCC
{
	public constructor(
		options: SendDataRequestOptions<CCType> & MessageBaseOptions,
	) {
		super(options);

		if ("command" in options) {
			if (
				!options.command.isSinglecast()
				&& !options.command.isBroadcast()
			) {
				throw new ZWaveError(
					`SendDataRequest can only be used for singlecast and broadcast CCs`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.command = options.command;
			this._nodeId = this.command.nodeId;
		} else {
			this._nodeId = options.nodeId;
			this.serializedCC = options.serializedCC;
		}

		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		if (options.maxSendAttempts != undefined) {
			this.maxSendAttempts = options.maxSendAttempts;
		}
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataRequest {
		let offset = 0;
		const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		const serializedCCLength = raw.payload[offset++];
		const transmitOptions: TransmitOptions =
			raw.payload[offset + serializedCCLength];
		const callbackId = raw.payload[offset + 1 + serializedCCLength];

		const serializedCC = raw.payload.subarray(
			offset,
			offset + serializedCCLength,
		);

		return new this({
			transmitOptions,
			callbackId,
			nodeId,
			serializedCC,
		});
	}

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
		const nodeId = encodeNodeID(
			this.command?.nodeId ?? this._nodeId,
			ctx.nodeIdType,
		);
		const serializedCC = await this.serializeCC(ctx);
		this.payload = Bytes.concat([
			nodeId,
			Bytes.from([serializedCC.length]),
			serializedCC,
			Bytes.from([this.transmitOptions, this.callbackId]),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
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

export interface SendDataRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
	txReport?: SerializableTXReport;
}

export class SendDataRequestTransmitReport extends SendDataRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: SendDataRequestTransmitReportOptions & MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
		this.txReport = options.txReport
			&& serializableTXReportToTXReport(options.txReport);
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataRequestTransmitReport {
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

	public transmitStatus: TransmitStatus;
	public txReport: TXReport | undefined;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([
			this.callbackId,
			this.transmitStatus,
		]);
		if (this.txReport) {
			this.payload = Bytes.concat([
				this.payload,
				encodeTXReport(this.txReport),
			]);
		}

		return super.serialize(ctx);
	}

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

export interface SendDataResponseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SendData)
export class SendDataResponse extends Message implements SuccessIndicator {
	public constructor(
		options: SendDataResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.wasSent = options.wasSent;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataResponse {
		const wasSent = raw.payload[0] !== 0;

		return new this({
			wasSent,
		});
	}

	public wasSent: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.wasSent ? 1 : 0]);
		return super.serialize(ctx);
	}

	isOK(): boolean {
		return this.wasSent;
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
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataMulticastRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return SendDataMulticastRequest.from(raw, ctx);
		} else {
			return SendDataMulticastRequestTransmitReport.from(raw, ctx);
		}
	}
}

export type SendDataMulticastRequestOptions<CCType extends CommandClass> =
	& (
		| { command: CCType }
		| {
			nodeIds: MulticastDestination;
			serializedCC: Uint8Array;
		}
	)
	& {
		transmitOptions?: TransmitOptions;
		maxSendAttempts?: number;
	};

@expectedResponse(FunctionType.SendDataMulticast)
@expectedCallback(FunctionType.SendDataMulticast)
export class SendDataMulticastRequest<
	CCType extends CommandClass = CommandClass,
> extends SendDataMulticastRequestBase implements MessageWithCC {
	public constructor(
		options: SendDataMulticastRequestOptions<CCType> & MessageBaseOptions,
	) {
		super(options);

		if ("command" in options) {
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
		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		if (options.maxSendAttempts != undefined) {
			this.maxSendAttempts = options.maxSendAttempts;
		}
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendDataMulticastRequest {
		const numNodeIDs = raw.payload[0];
		let offset = 1;
		const nodeIds: number[] = [];
		for (let i = 0; i < numNodeIDs; i++) {
			const { nodeId, bytesRead } = parseNodeID(
				raw.payload,
				ctx.nodeIdType,
				offset,
			);
			nodeIds.push(nodeId);
			offset += bytesRead;
		}
		const serializedCCLength = raw.payload[offset];
		offset++;
		const serializedCC = raw.payload.subarray(
			offset,
			offset + serializedCCLength,
		);
		offset += serializedCCLength;
		const transmitOptions: TransmitOptions = raw.payload[offset];

		offset++;
		const callbackId: any = raw.payload[offset];

		return new this({
			transmitOptions,
			callbackId,
			nodeIds: nodeIds as MulticastDestination,
			serializedCC,
		});
	}

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
		const destinationNodeIDs = (this.command?.nodeId ?? this.nodeIds)
			.map((id) => encodeNodeID(id, ctx.nodeIdType));
		this.payload = Bytes.concat([
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
				"target nodes": (this.command?.nodeId ?? this.nodeIds).join(
					", ",
				),
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export interface SendDataMulticastRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class SendDataMulticastRequestTransmitReport
	extends SendDataMulticastRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& SendDataMulticastRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataMulticastRequestTransmitReport {
		const callbackId = raw.payload[0];
		const transmitStatus: TransmitStatus = raw.payload[1];

		return new this({
			callbackId,
			transmitStatus,
		});
	}

	public transmitStatus: TransmitStatus;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([this.callbackId, this.transmitStatus]);
		return super.serialize(ctx);
	}

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

export interface SendDataMulticastResponseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SendDataMulticast)
export class SendDataMulticastResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: SendDataMulticastResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.wasSent = options.wasSent;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SendDataMulticastResponse {
		const wasSent = raw.payload[0] !== 0;

		return new this({
			wasSent,
		});
	}

	public wasSent: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.wasSent ? 1 : 0]);
		return super.serialize(ctx);
	}

	public isOK(): boolean {
		return this.wasSent;
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
