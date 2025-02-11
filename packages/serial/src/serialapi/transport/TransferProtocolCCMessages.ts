import {
	type MessageOrCCLogEntry,
	MessagePriority,
	SecurityClass,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, buffer2hex, getEnumMemberName } from "@zwave-js/shared";

export interface TransferProtocolCCRequestOptions {
	sourceNodeId: number;
	securityClass: SecurityClass;
	decryptedCC: Uint8Array;
}

// The enum used in this command has a different value mapping than the SecurityClass enum
function decryptionKeyToSecurityClass(key: number): SecurityClass {
	switch (key) {
		case 0x00:
			return SecurityClass.None;
		case 0x01:
			return SecurityClass.S2_Unauthenticated;
		case 0x02:
			return SecurityClass.S2_Authenticated;
		case 0x03:
			return SecurityClass.S2_AccessControl;
		case 0x04:
			return SecurityClass.S0_Legacy;
	}
	// Unknown key, assume no security
	return SecurityClass.None;
}

function securityClassToDecryptionKey(sc: SecurityClass): number {
	switch (sc) {
		case SecurityClass.None:
			return 0x00;
		case SecurityClass.S2_Unauthenticated:
			return 0x01;
		case SecurityClass.S2_Authenticated:
			return 0x02;
		case SecurityClass.S2_AccessControl:
			return 0x03;
		case SecurityClass.S0_Legacy:
			return 0x04;
	}
	return 0x00;
}

@messageTypes(MessageType.Request, FunctionType.TransferProtocolCC)
@priority(MessagePriority.ControllerImmediate)
@expectedResponse(FunctionType.TransferProtocolCC)
export class TransferProtocolCCRequest extends Message {
	public constructor(
		options: TransferProtocolCCRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.sourceNodeId = options.sourceNodeId;
		this.securityClass = options.securityClass;
		this.decryptedCC = options.decryptedCC;
	}

	public sourceNodeId: number;
	public securityClass: SecurityClass;
	public decryptedCC: Uint8Array;

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): TransferProtocolCCRequest {
		const { nodeId: sourceNodeId, bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			0,
		);
		let offset = bytesRead;
		const securityClass = decryptionKeyToSecurityClass(
			raw.payload[offset++],
		);
		const decryptedCCLength = raw.payload[offset++];
		const decryptedCC = raw.payload.slice(
			offset,
			offset + decryptedCCLength,
		);

		return new this({
			sourceNodeId,
			securityClass,
			decryptedCC,
		});
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			encodeNodeID(this.sourceNodeId, ctx.nodeIdType),
			[
				securityClassToDecryptionKey(this.securityClass),
				this.decryptedCC.length,
			],
			this.decryptedCC,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node ID": this.sourceNodeId,
				"security class": getEnumMemberName(
					SecurityClass,
					this.securityClass,
				),
				payload: buffer2hex(this.decryptedCC),
			},
		};
	}
}

export interface TransferProtocolCCResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.TransferProtocolCC)
export class TransferProtocolCCResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: TransferProtocolCCResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): TransferProtocolCCResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}
