import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type SerializableTXReport,
	type TXReport,
	type TransmitOptions,
	TransmitStatus,
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
	encodeTXReport,
	expectedCallback,
	expectedResponse,
	messageTypes,
	parseTXReport,
	priority,
	serializableTXReportToTXReport,
} from "@zwave-js/serial";
import {
	Bytes,
	buffer2hex,
	getEnumMemberName,
	num2hex,
} from "@zwave-js/shared";

export enum ProtocolCCEncryptionStatus {
	Started = 0x00,
	NodeNotFound = 0x01,
	NLSNotSupported = 0x02,
	Unknown = 0xff,
}

@messageTypes(MessageType.Request, FunctionType.RequestProtocolCCEncryption)
@priority(MessagePriority.ControllerImmediate)
export class RequestProtocolCCEncryptionRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RequestProtocolCCEncryptionRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return RequestProtocolCCEncryptionRequest.from(raw, ctx);
		} else {
			return RequestProtocolCCEncryptionCallback.from(raw, ctx);
		}
	}
}

export interface RequestProtocolCCEncryptionRequestOptions {
	destinationNodeId: number;
	plaintext: Uint8Array;
	transmitOptions: TransmitOptions;
}

@expectedResponse(FunctionType.RequestProtocolCCEncryption)
@expectedCallback(FunctionType.RequestProtocolCCEncryption)
export class RequestProtocolCCEncryptionRequest
	extends RequestProtocolCCEncryptionRequestBase
{
	public constructor(
		options: RequestProtocolCCEncryptionRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.destinationNodeId = options.destinationNodeId;
		this.plaintext = options.plaintext;
		this.transmitOptions = options.transmitOptions;
	}

	public destinationNodeId: number;
	public plaintext: Uint8Array;
	public transmitOptions: TransmitOptions;

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RequestProtocolCCEncryptionRequest {
		const { nodeId: destinationNodeId, bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			0,
		);
		let offset = bytesRead;

		const plaintextLength = raw.payload[offset++];
		const plaintext = raw.payload.slice(offset, offset + plaintextLength);
		offset += plaintextLength;

		const transmitOptions = raw.payload[offset++];
		const callbackId = raw.payload[offset++];

		return new this({
			destinationNodeId,
			plaintext,
			transmitOptions,
			callbackId,
		});
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.concat([
			encodeNodeID(this.destinationNodeId, ctx.nodeIdType),
			[this.plaintext.length],
			this.plaintext,
			[this.transmitOptions, this.callbackId],
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"destination node": this.destinationNodeId,
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId ?? "(not set)",
				plaintext: buffer2hex(this.plaintext),
			},
		};
	}
}

export interface RequestProtocolCCEncryptionResponseOptions {
	status: ProtocolCCEncryptionStatus;
}

@messageTypes(MessageType.Response, FunctionType.RequestProtocolCCEncryption)
export class RequestProtocolCCEncryptionResponse extends Message {
	public constructor(
		options:
			& RequestProtocolCCEncryptionResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.status = options.status;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RequestProtocolCCEncryptionResponse {
		const status: ProtocolCCEncryptionStatus = raw.payload[0];
		const callbackId = raw.payload[1];

		return new this({
			status,
			callbackId,
		});
	}

	public status: ProtocolCCEncryptionStatus;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				status: getEnumMemberName(
					ProtocolCCEncryptionStatus,
					this.status,
				),
			},
		};
	}
}

export interface RequestProtocolCCEncryptionCallbackOptions {
	transmitStatus: TransmitStatus;
	txReport?: SerializableTXReport;
}

export class RequestProtocolCCEncryptionCallback
	extends RequestProtocolCCEncryptionRequestBase
{
	public constructor(
		options:
			& RequestProtocolCCEncryptionCallbackOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
		this.txReport = options.txReport
			&& serializableTXReportToTXReport(options.txReport);
	}

	public transmitStatus: TransmitStatus;
	public txReport: TXReport | undefined;

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RequestProtocolCCEncryptionCallback {
		const callbackId = raw.payload[0];
		const transmitStatus: TransmitStatus = raw.payload[1];

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

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId!,
			},
		};
	}
}
