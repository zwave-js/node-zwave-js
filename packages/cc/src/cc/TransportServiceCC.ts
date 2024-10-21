import {
	CRC16_CCITT,
	CommandClasses,
	type MessageOrCCLogEntry,
	type SinglecastCC,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { buffer2hex } from "@zwave-js/shared/safe";
import {
	type CCCommandOptions,
	type CCRaw,
	type CCResponseRole,
	CommandClass,
} from "../lib/CommandClass";
import {
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { TransportServiceCommand } from "../lib/_Types";

export const MAX_SEGMENT_SIZE = 39;

export const RELAXED_TIMING_THRESHOLD = 2;

// TODO: Figure out how we know if communicating with R2 or R3
/** @publicAPI */
export const TransportServiceTimeouts = {
	/** Waiting time before requesting a missing segment at data rate R2 */
	requestMissingSegmentR2: 800,
	/** Waiting time before requesting a missing segment at data rate R3 */
	requestMissingSegmentR3: 400,
	/** Waiting time before sending another datagram at data rate R2 */
	segmentCompleteR2: 1000,
	/** Waiting time before sending another datagram at data rate R3 */
	segmentCompleteR3: 500,
	/** Waiting time between segments when sending more than {@link RELAXED_TIMING_THRESHOLD} segments at data rate R2 */
	relaxedTimingDelayR2: 35,
	/** Waiting time between segments when sending more than {@link RELAXED_TIMING_THRESHOLD} segments at data rate R3 */
	relaxedTimingDelayR3: 15,
};

@commandClass(CommandClasses["Transport Service"])
@implementedVersion(2)
export class TransportServiceCC extends CommandClass
	implements SinglecastCC<TransportServiceCC>
{
	declare ccCommand: TransportServiceCommand;
	declare nodeId: number;

	// Override the default helper method
	public static getCCCommand(data: Buffer): number | undefined {
		const originalCCCommand = super.getCCCommand(data)!;
		// Transport Service only uses the higher 5 bits for the command
		return originalCCCommand & 0b11111_000;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	protected deserialize(data: Buffer) {
		const ret = super.deserialize(data) as {
			ccId: CommandClasses;
			ccCommand: number;
			payload: Buffer;
		};
		// Transport Service re-uses the lower 3 bits of the ccCommand as payload
		ret.payload = Buffer.concat([
			Buffer.from([ret.ccCommand & 0b111]),
			ret.payload,
		]);
		return ret;
	}

	/** Encapsulates a command that should be sent in multiple segments */
	public static encapsulate(_cc: CommandClass): TransportServiceCC {
		throw new Error("not implemented");
	}
}

// @publicAPI
export interface TransportServiceCCFirstSegmentOptions {
	datagramSize: number;
	sessionId: number;
	headerExtension?: Buffer | undefined;
	partialDatagram: Buffer;
}

/** @publicAPI */
export function isTransportServiceEncapsulation(
	command: CommandClass,
): command is
	| TransportServiceCCFirstSegment
	| TransportServiceCCSubsequentSegment
{
	return (
		command.ccId === CommandClasses["Transport Service"]
		&& (command.ccCommand === TransportServiceCommand.FirstSegment
			|| command.ccCommand === TransportServiceCommand.SubsequentSegment)
	);
}

@CCCommand(TransportServiceCommand.FirstSegment)
// @expectedCCResponse(TransportServiceCCReport)
export class TransportServiceCCFirstSegment extends TransportServiceCC {
	public constructor(
		options: TransportServiceCCFirstSegmentOptions & CCCommandOptions,
	) {
		super(options);
		this.datagramSize = options.datagramSize;
		this.sessionId = options.sessionId;
		this.headerExtension = options.headerExtension;
		this.partialDatagram = options.partialDatagram;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TransportServiceCCFirstSegment {
		// Deserialization has already split the datagram size from the ccCommand.
		// Therefore we have one more payload byte

		validatePayload(raw.payload.length >= 6); // 2 bytes dgram size, 1 byte sessid/ext, 1+ bytes payload, 2 bytes checksum

		// Verify the CRC
		const headerBuffer = Buffer.from([
			CommandClasses["Transport Service"],
			TransportServiceCommand.FirstSegment | raw.payload[0],
		]);
		const ccBuffer = raw.payload.subarray(1, -2);
		let expectedCRC = CRC16_CCITT(headerBuffer);
		expectedCRC = CRC16_CCITT(ccBuffer, expectedCRC);
		const actualCRC = raw.payload.readUInt16BE(
			raw.payload.length - 2,
		);
		validatePayload(expectedCRC === actualCRC);
		const datagramSize = raw.payload.readUInt16BE(0);
		const sessionId = raw.payload[2] >>> 4;
		let payloadOffset = 3;

		// If there is a header extension, read it
		const hasHeaderExtension = !!(raw.payload[2] & 0b1000);
		let headerExtension: Buffer | undefined;

		if (hasHeaderExtension) {
			const extLength = raw.payload[3];
			headerExtension = raw.payload.subarray(4, 4 + extLength);
			payloadOffset += 1 + extLength;
		}
		const partialDatagram: Buffer = raw.payload.subarray(payloadOffset, -2);

		// A node supporting the Transport Service Command Class, version 2
		// MUST NOT send Transport Service segments with the Payload field longer than 39 bytes.
		validatePayload(partialDatagram.length <= MAX_SEGMENT_SIZE);

		return new TransportServiceCCFirstSegment({
			nodeId: ctx.sourceNodeId,
			datagramSize,
			sessionId,
			headerExtension,
			partialDatagram,
		});
	}

	public datagramSize: number;
	public sessionId: number;
	public headerExtension: Buffer | undefined;
	public partialDatagram: Buffer;
	public encapsulated!: CommandClass;

	public serialize(ctx: CCEncodingContext): Buffer {
		// Transport Service re-uses the lower 3 bits of the ccCommand as payload
		this.ccCommand = (this.ccCommand & 0b11111_000)
			| ((this.datagramSize >>> 8) & 0b111);

		const ext = !!this.headerExtension && this.headerExtension.length >= 1;
		this.payload = Buffer.from([
			this.datagramSize & 0xff,
			((this.sessionId & 0b1111) << 4) | (ext ? 0b1000 : 0),
		]);
		if (ext) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([this.headerExtension!.length]),
				this.headerExtension!,
			]);
		}
		this.payload = Buffer.concat([
			this.payload,
			this.partialDatagram,
			Buffer.alloc(2, 0), // checksum
		]);

		// Compute and save the CRC16 in the payload
		// The CC header is included in the CRC computation
		const headerBuffer = Buffer.from([this.ccId, this.ccCommand]);
		let crc = CRC16_CCITT(headerBuffer);
		crc = CRC16_CCITT(this.payload.subarray(0, -2), crc);
		// Write the checksum into the last two bytes of the payload
		this.payload.writeUInt16BE(crc, this.payload.length - 2);

		return super.serialize(ctx);
	}

	public expectMoreMessages(): boolean {
		return true; // The FirstSegment message always expects more messages
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Only use the session ID to identify the session, not the CC command
		return { ccCommand: undefined, sessionId: this.sessionId };
	}

	protected computeEncapsulationOverhead(): number {
		// Transport Service CC (first segment) adds 1 byte datagram size, 1 byte Session ID/..., 2 bytes checksum and (0 OR n+1) bytes header extension
		return (
			super.computeEncapsulationOverhead()
			+ 4
			+ (this.headerExtension?.length
				? 1 + this.headerExtension.length
				: 0)
		);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"session ID": this.sessionId,
				"datagram size": this.datagramSize,
				"byte range": `0...${this.partialDatagram.length - 1}`,
				payload: buffer2hex(this.partialDatagram),
			},
		};
	}
}

// @publicAPI
export interface TransportServiceCCSubsequentSegmentOptions
	extends TransportServiceCCFirstSegmentOptions
{
	datagramOffset: number;
}

@CCCommand(TransportServiceCommand.SubsequentSegment)
// @expectedCCResponse(TransportServiceCCReport)
export class TransportServiceCCSubsequentSegment extends TransportServiceCC {
	public constructor(
		options: TransportServiceCCSubsequentSegmentOptions & CCCommandOptions,
	) {
		super(options);
		this.datagramSize = options.datagramSize;
		this.datagramOffset = options.datagramOffset;
		this.sessionId = options.sessionId;
		this.headerExtension = options.headerExtension;
		this.partialDatagram = options.partialDatagram;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TransportServiceCCSubsequentSegment {
		// Deserialization has already split the datagram size from the ccCommand.
		// Therefore we have one more payload byte

		validatePayload(raw.payload.length >= 7); // 2 bytes dgram size, 1 byte sessid/ext/offset, 1 byte offset, 1+ bytes payload, 2 bytes checksum

		// Verify the CRC
		const headerBuffer = Buffer.from([
			CommandClasses["Transport Service"],
			TransportServiceCommand.SubsequentSegment | raw.payload[0],
		]);
		const ccBuffer = raw.payload.subarray(1, -2);
		let expectedCRC = CRC16_CCITT(headerBuffer);
		expectedCRC = CRC16_CCITT(ccBuffer, expectedCRC);
		const actualCRC = raw.payload.readUInt16BE(
			raw.payload.length - 2,
		);
		validatePayload(expectedCRC === actualCRC);
		const datagramSize = raw.payload.readUInt16BE(0);
		const sessionId = raw.payload[2] >>> 4;
		const datagramOffset = ((raw.payload[2] & 0b111) << 8)
			+ raw.payload[3];
		let payloadOffset = 4;

		// If there is a header extension, read it
		const hasHeaderExtension = !!(raw.payload[2] & 0b1000);
		let headerExtension: Buffer | undefined;

		if (hasHeaderExtension) {
			const extLength = raw.payload[4];
			headerExtension = raw.payload.subarray(5, 5 + extLength);
			payloadOffset += 1 + extLength;
		}
		const partialDatagram: Buffer = raw.payload.subarray(payloadOffset, -2);

		// A node supporting the Transport Service Command Class, version 2
		// MUST NOT send Transport Service segments with the Payload field longer than 39 bytes.
		validatePayload(partialDatagram.length <= MAX_SEGMENT_SIZE);

		return new TransportServiceCCSubsequentSegment({
			nodeId: ctx.sourceNodeId,
			datagramSize,
			sessionId,
			datagramOffset,
			headerExtension,
			partialDatagram,
		});
	}

	public datagramSize: number;
	public datagramOffset: number;
	public sessionId: number;
	public headerExtension: Buffer | undefined;
	public partialDatagram: Buffer;

	// This can only be received
	private _encapsulated!: CommandClass;
	public get encapsulated(): CommandClass {
		return this._encapsulated;
	}

	public expectMoreMessages(
		session: [
			TransportServiceCCFirstSegment,
			...TransportServiceCCSubsequentSegment[],
		],
	): boolean {
		if (!(session[0] instanceof TransportServiceCCFirstSegment)) {
			// First segment is missing
			return true;
		}
		const datagramSize = session[0].datagramSize;
		const receivedBytes = new Array<boolean>(datagramSize).fill(false);
		for (const segment of [...session, this]) {
			const offset = segment instanceof TransportServiceCCFirstSegment
				? 0
				: segment.datagramOffset;
			for (
				let i = offset;
				i <= offset + segment.partialDatagram.length;
				i++
			) {
				receivedBytes[i] = true;
			}
		}
		// Expect more messages as long as we haven't received everything
		return receivedBytes.includes(false);
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Only use the session ID to identify the session, not the CC command
		return { ccCommand: undefined, sessionId: this.sessionId };
	}

	public mergePartialCCs(
		partials: [
			TransportServiceCCFirstSegment,
			...TransportServiceCCSubsequentSegment[],
		],
		ctx: CCParsingContext,
	): void {
		// Concat the CC buffers
		const datagram = Buffer.allocUnsafe(this.datagramSize);
		for (const partial of [...partials, this]) {
			// Ensure that we don't try to write out-of-bounds
			const offset = partial instanceof TransportServiceCCFirstSegment
				? 0
				: partial.datagramOffset;
			if (offset + partial.partialDatagram.length > datagram.length) {
				throw new ZWaveError(
					`The partial datagram offset and length in a segment are not compatible to the communicated datagram length`,
					ZWaveErrorCodes.PacketFormat_InvalidPayload,
				);
			}
			partial.partialDatagram.copy(datagram, offset);
		}

		// and deserialize the CC
		this._encapsulated = CommandClass.parse(datagram, ctx);
		this._encapsulated.encapsulatingCC = this as any;
	}

	public serialize(ctx: CCEncodingContext): Buffer {
		// Transport Service re-uses the lower 3 bits of the ccCommand as payload
		this.ccCommand = (this.ccCommand & 0b11111_000)
			| ((this.datagramSize >>> 8) & 0b111);

		const ext = !!this.headerExtension && this.headerExtension.length >= 1;
		this.payload = Buffer.from([
			this.datagramSize & 0xff,
			((this.sessionId & 0b1111) << 4)
			| (ext ? 0b1000 : 0)
			| ((this.datagramOffset >>> 8) & 0b111),
			this.datagramOffset & 0xff,
		]);
		if (ext) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([this.headerExtension!.length]),
				this.headerExtension!,
			]);
		}
		this.payload = Buffer.concat([
			this.payload,
			this.partialDatagram,
			Buffer.alloc(2, 0), // checksum
		]);

		// Compute and save the CRC16 in the payload
		// The CC header is included in the CRC computation
		const headerBuffer = Buffer.from([this.ccId, this.ccCommand]);
		let crc = CRC16_CCITT(headerBuffer);
		crc = CRC16_CCITT(this.payload.subarray(0, -2), crc);
		// Write the checksum into the last two bytes of the payload
		this.payload.writeUInt16BE(crc, this.payload.length - 2);

		return super.serialize(ctx);
	}

	protected computeEncapsulationOverhead(): number {
		// Transport Service CC (first segment) adds 1 byte datagram size, 1 byte Session ID/..., 1 byte offset, 2 bytes checksum and (0 OR n+1) bytes header extension
		return (
			super.computeEncapsulationOverhead()
			+ 5
			+ (this.headerExtension?.length
				? 1 + this.headerExtension.length
				: 0)
		);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"session ID": this.sessionId,
				"datagram size": this.datagramSize,
				"byte range": `${this.datagramOffset}...${
					this.datagramOffset + this.partialDatagram.length - 1
				}`,
				payload: buffer2hex(this.partialDatagram),
			},
		};
	}
}

// @publicAPI
export interface TransportServiceCCSegmentRequestOptions {
	sessionId: number;
	datagramOffset: number;
}

function testResponseForSegmentRequest(
	sent: TransportServiceCCSegmentRequest,
	received: TransportServiceCC,
): CCResponseRole {
	return (
		(sent.datagramOffset === 0
			&& received instanceof TransportServiceCCFirstSegment
			&& received.sessionId === sent.sessionId)
		|| (sent.datagramOffset > 0
			&& received instanceof TransportServiceCCSubsequentSegment
			&& sent.datagramOffset === received.datagramOffset
			&& received.sessionId === sent.sessionId)
	);
}

@CCCommand(TransportServiceCommand.SegmentRequest)
@expectedCCResponse(TransportServiceCC, testResponseForSegmentRequest)
export class TransportServiceCCSegmentRequest extends TransportServiceCC {
	public constructor(
		options: TransportServiceCCSegmentRequestOptions & CCCommandOptions,
	) {
		super(options);
		this.sessionId = options.sessionId;
		this.datagramOffset = options.datagramOffset;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TransportServiceCCSegmentRequest {
		validatePayload(raw.payload.length >= 3);
		const sessionId = raw.payload[1] >>> 4;
		const datagramOffset = ((raw.payload[1] & 0b111) << 8)
			+ raw.payload[2];

		return new TransportServiceCCSegmentRequest({
			nodeId: ctx.sourceNodeId,
			sessionId,
			datagramOffset,
		});
	}

	public sessionId: number;
	public datagramOffset: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			((this.sessionId & 0b1111) << 4)
			| ((this.datagramOffset >>> 8) & 0b111),
			this.datagramOffset & 0xff,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"session ID": this.sessionId,
				offset: this.datagramOffset,
			},
		};
	}
}

// @publicAPI
export interface TransportServiceCCSegmentCompleteOptions {
	sessionId: number;
}

@CCCommand(TransportServiceCommand.SegmentComplete)
export class TransportServiceCCSegmentComplete extends TransportServiceCC {
	public constructor(
		options: TransportServiceCCSegmentCompleteOptions & CCCommandOptions,
	) {
		super(options);
		this.sessionId = options.sessionId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TransportServiceCCSegmentComplete {
		validatePayload(raw.payload.length >= 2);
		const sessionId = raw.payload[1] >>> 4;

		return new TransportServiceCCSegmentComplete({
			nodeId: ctx.sourceNodeId,
			sessionId,
		});
	}

	public sessionId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([(this.sessionId & 0b1111) << 4]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "session ID": this.sessionId },
		};
	}
}

// @publicAPI
export interface TransportServiceCCSegmentWaitOptions {
	pendingSegments: number;
}

@CCCommand(TransportServiceCommand.SegmentWait)
export class TransportServiceCCSegmentWait extends TransportServiceCC {
	public constructor(
		options: TransportServiceCCSegmentWaitOptions & CCCommandOptions,
	) {
		super(options);
		this.pendingSegments = options.pendingSegments;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TransportServiceCCSegmentWait {
		validatePayload(raw.payload.length >= 2);
		const pendingSegments = raw.payload[1];

		return new TransportServiceCCSegmentWait({
			nodeId: ctx.sourceNodeId,
			pendingSegments,
		});
	}

	public pendingSegments: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.pendingSegments]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "pending segments": this.pendingSegments },
		};
	}
}
