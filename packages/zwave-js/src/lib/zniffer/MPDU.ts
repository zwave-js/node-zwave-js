import { type CommandClass } from "@zwave-js/cc";
import {
	type BeamingInfo,
	MPDUHeaderType,
	type MessageOrCCLogEntry,
	type MessageRecord,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	Protocols,
	type RSSI,
	ZWaveError,
	ZWaveErrorCodes,
	type ZnifferProtocolDataRate,
	ZnifferRegion,
	parseNodeBitMask,
	rssiToString,
	validatePayload,
	znifferProtocolDataRateToString,
} from "@zwave-js/core";
import {
	type ZnifferDataMessage,
	type ZnifferFrameInfo,
	ZnifferFrameType,
} from "@zwave-js/serial";
import {
	type AllOrNone,
	buffer2hex,
	pick,
	staticExtends,
} from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import { parseRSSI } from "../serialapi/transport/SendDataShared";
import {
	ExplorerFrameCommand,
	LongRangeFrameType,
	ZWaveFrameType,
} from "./_Types";

function getChannelConfiguration(region: ZnifferRegion): "1/2" | "3" | "4" {
	switch (region) {
		case ZnifferRegion.Japan:
		case ZnifferRegion.Korea:
			return "3";
		case ZnifferRegion["USA (Long Range)"]:
		case ZnifferRegion["USA (Long Range, backup)"]:
		case ZnifferRegion["USA (Long Range, end device)"]:
			return "4";
		default:
			return "1/2";
	}
}

function longRangeBeamPowerToDBm(power: number): number {
	return [
		-6,
		-2,
		2,
		6,
		10,
		13,
		16,
		19,
		21,
		23,
		25,
		26,
		27,
		28,
		29,
		30,
	][power];
}

function formatNodeId(nodeId: number): string {
	return padStart(nodeId.toString(), 3, "0");
}

function formatRoute(
	source: number,
	repeaters: readonly number[],
	destination: number,
	direction: "outbound" | "inbound",
	currentHop: number,
	failedHop?: number,
): string {
	return [
		direction === "outbound"
			? formatNodeId(source)
			: formatNodeId(destination),
		...repeaters.map(formatNodeId),
		direction === "outbound"
			? formatNodeId(destination)
			: formatNodeId(source),
	].map((id, i) => {
		if (i === 0) return id;
		if (i - 1 === failedHop) return " × " + id;
		if (i - 1 === currentHop) {
			return (direction === "outbound" ? " » " : " « ") + id;
		}
		return (direction === "outbound" ? " › " : " ‹ ") + id;
	})
		.join("");
}

export interface MPDUOptions {
	data: Buffer;
	frameInfo: ZnifferFrameInfo;
}

export interface MPDU {
	frameInfo: ZnifferFrameInfo;
	homeId: number;
	sourceNodeId: number;
	ackRequested: boolean;
	headerType: MPDUHeaderType;
	sequenceNumber: number;
	payload: Buffer;
}

export function parseMPDU(
	frame: ZnifferDataMessage,
): ZWaveMPDU | LongRangeMPDU {
	switch (frame.channel) {
		case 0:
		case 1:
		case 2:
			return ZWaveMPDU.from(frame);
		case 3:
			return LongRangeMPDU.from(frame);
		default:
			throw validatePayload.fail(
				`Unsupported channel ${frame.channel}. MPDU payload: ${
					buffer2hex(frame.payload)
				}`,
			);
	}
}

export class LongRangeMPDU implements MPDU {
	public constructor(options: MPDUOptions) {
		const data = options.data;
		this.frameInfo = options.frameInfo;

		if (options.frameInfo.channel !== 3) {
			throw validatePayload.fail(
				`Unsupported channel ${options.frameInfo.channel} for LongRangeMPDU`,
			);
		}

		this.homeId = data.readUInt32BE(0);
		const nodeIds = data.readUIntBE(4, 3);
		this.sourceNodeId = nodeIds >>> 12;
		this.destinationNodeId = nodeIds & 0xfff;

		// skip length byte

		const frameControl = data[8];
		this.ackRequested = !!(frameControl & 0b1000_0000);
		const hasExtendedHeader = !!(frameControl & 0b0100_0000);
		this.headerType = frameControl & 0b0000_0111;

		this.sequenceNumber = data[9];
		this.noiseFloor = parseRSSI(data, 10);
		this.txPower = data.readInt8(11);

		let offset = 12;
		if (hasExtendedHeader) {
			const extensionControl = data[offset++];
			const extensionLength = extensionControl & 0b111;
			// const discardUnknown = extensionControl & 0b0000_1000;
			// const extensionType = (extensionControl & 0b0111_0000) >>> 4;
			// TODO: Parse extension (once there is a definition)
			offset += extensionLength;
		}

		const Constructor = this.headerType === MPDUHeaderType.Acknowledgement
			? AckLongRangeMPDU
			: this.headerType === MPDUHeaderType.Singlecast
			? SinglecastLongRangeMPDU
			: undefined;
		if (!Constructor) {
			throw validatePayload.fail(
				`Unsupported Long Range MPDU header type ${this.headerType}`,
			);
		} else if (
			new.target !== Constructor
			&& !staticExtends(new.target, Constructor)
		) {
			return new Constructor(options);
		}

		this.payload = data.subarray(offset);
	}

	public readonly frameInfo: ZnifferFrameInfo;
	public readonly homeId: number;
	public readonly sourceNodeId: number;
	public readonly destinationNodeId: number;
	public readonly ackRequested: boolean;
	public readonly headerType: MPDUHeaderType;
	public readonly sequenceNumber: number;
	public readonly noiseFloor: RSSI;
	public readonly txPower: number;
	public payload!: Buffer;

	public static from(msg: ZnifferDataMessage): LongRangeMPDU {
		return new LongRangeMPDU({
			data: msg.payload,
			frameInfo: pick(msg, [
				"channel",
				"frameType",
				"region",
				"protocolDataRate",
				"rssiRaw",
			]),
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const tags = [
			formatRoute(
				this.sourceNodeId,
				[],
				this.destinationNodeId,
				// Singlecast frames do not contain a bit for this, we consider them all "outbound"
				"outbound",
				0,
			),
		];
		if (this.headerType === MPDUHeaderType.Acknowledgement) {
			tags.unshift("ACK");
		}

		const message: MessageRecord = {
			"sequence no.": this.sequenceNumber,
			channel: this.frameInfo.channel,
			"protocol/data rate": znifferProtocolDataRateToString(
				this.frameInfo.protocolDataRate,
			),
			"TX power": `${this.txPower} dBm`,
			RSSI: this.frameInfo.rssi != undefined
				? rssiToString(this.frameInfo.rssi)
				: this.frameInfo.rssiRaw.toString(),
			"noise floor": rssiToString(this.noiseFloor),
		};
		if (this.headerType !== MPDUHeaderType.Acknowledgement) {
			message["ack requested"] = this.ackRequested;
		}
		if (this.payload.length > 0) {
			message.payload = buffer2hex(this.payload);
		}
		return {
			tags,
			message,
		};
	}
}

export class SinglecastLongRangeMPDU extends LongRangeMPDU {
	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();

		const message: MessageRecord = {
			...original,
			payload: buffer2hex(this.payload),
		};
		return {
			tags,
			message,
		};
	}
}

export class AckLongRangeMPDU extends LongRangeMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.incomingRSSI = parseRSSI(this.payload, 0);
		this.payload = this.payload.subarray(1);
	}

	public readonly incomingRSSI: RSSI;

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();

		const message: MessageRecord = {
			...original,
			"incoming RSSI": rssiToString(this.incomingRSSI),
		};
		if (this.payload.length > 0) {
			message.payload = buffer2hex(this.payload);
		}

		return {
			tags,
			message,
		};
	}
}

export class ZWaveMPDU implements MPDU {
	public constructor(options: MPDUOptions) {
		const data = options.data;
		this.frameInfo = options.frameInfo;

		let destinationOffset = 8;
		const frameControl = data.subarray(5, 7);
		switch (options.frameInfo.channel) {
			case 0:
			case 1: {
				this.routed = !!(frameControl[0] & 0b1000_0000);
				this.ackRequested = !!(frameControl[0] & 0b0100_0000);
				this.lowPower = !!(frameControl[0] & 0b0010_0000);
				this.speedModified = !!(frameControl[0] & 0b0001_0000);
				this.headerType = frameControl[0] & 0b0000_1111;
				this.beamingInfo = frameControl[1] & 0b0110_0000;
				this.sequenceNumber = frameControl[1] & 0b0000_1111;
				break;
			}
			case 2: {
				this.routed = false;
				this.ackRequested = !!(frameControl[0] & 0b1000_0000);
				this.lowPower = !!(frameControl[0] & 0b0100_0000);
				this.speedModified = false;
				this.headerType = frameControl[0] & 0b0000_1111;
				this.beamingInfo = frameControl[1] & 0b0111_0000;
				this.sequenceNumber = data[destinationOffset];
				destinationOffset++;
				break;
			}
			case 3: {
				throw validatePayload.fail(
					`Channel 3 (ZWLR) must be parsed as a LongRangeMPDU!`,
				);
			}
			default: {
				throw validatePayload.fail(
					`Unsupported channel ${options.frameInfo.channel}. MPDU payload: ${
						buffer2hex(data)
					}`,
				);
			}
		}

		const Constructor = this.headerType === MPDUHeaderType.Acknowledgement
			? AckZWaveMPDU
			: (this.headerType === MPDUHeaderType.Routed
					|| (this.headerType === MPDUHeaderType.Singlecast
						&& this.routed))
			? RoutedZWaveMPDU
			: this.headerType === MPDUHeaderType.Singlecast
			? SinglecastZWaveMPDU
			: this.headerType === MPDUHeaderType.Multicast
			? MulticastZWaveMPDU
			: this.headerType === MPDUHeaderType.Explorer
			? ExplorerZWaveMPDU
			: undefined;
		if (!Constructor) {
			throw validatePayload.fail(
				`Unsupported MPDU header type ${this.headerType}`,
			);
		} else if (
			new.target !== Constructor
			&& !staticExtends(new.target, Constructor)
		) {
			return new Constructor(options);
		}

		// FIXME: Parse Beams

		this.homeId = data.readUInt32BE(0);
		this.sourceNodeId = data[4];

		// byte 7 is another length byte
		// FIXME: This should consider the multicast control byte
		const destinationLength = this.headerType === MPDUHeaderType.Multicast
			? 30
			: 1;
		this.destinationBuffer = data.subarray(
			destinationOffset,
			destinationOffset + destinationLength,
		);
		this.payload = data.subarray(destinationOffset + destinationLength);
	}

	public readonly frameInfo: ZnifferFrameInfo;

	public readonly homeId!: number;
	public readonly sourceNodeId!: number;

	public readonly routed: boolean;
	public readonly ackRequested: boolean;
	public readonly lowPower: boolean;
	public readonly speedModified: boolean;
	public readonly headerType: MPDUHeaderType;
	public readonly beamingInfo: BeamingInfo;
	public readonly sequenceNumber: number;

	protected readonly destinationBuffer!: Buffer;
	public payload!: Buffer;

	public static from(msg: ZnifferDataMessage): ZWaveMPDU {
		return new ZWaveMPDU({
			data: msg.payload,
			frameInfo: pick(msg, [
				"channel",
				"frameType",
				"region",
				"protocolDataRate",
				"rssiRaw",
			]),
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const tags = [formatNodeId(this.sourceNodeId)];

		const message: MessageRecord = {
			"sequence no.": this.sequenceNumber,
			channel: this.frameInfo.channel,
			"protocol/data rate":
				znifferProtocolDataRateToString(this.frameInfo.protocolDataRate)
				+ (this.speedModified ? " (reduced)" : ""),
			RSSI: this.frameInfo.rssi != undefined
				? rssiToString(this.frameInfo.rssi)
				: this.frameInfo.rssiRaw.toString(),
		};
		return {
			tags,
			message,
		};
	}
}

export class SinglecastZWaveMPDU extends ZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.destinationNodeId = this.destinationBuffer[0];
	}

	public readonly destinationNodeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			[],
			this.destinationNodeId,
			// Singlecast frames do not contain a bit for this, we consider them all "outbound"
			"outbound",
			0,
		);

		const message: MessageRecord = {
			...original,
			"ack requested": this.ackRequested,
			payload: buffer2hex(this.payload),
		};
		return {
			tags,
			message,
		};
	}
}

export class AckZWaveMPDU extends ZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.destinationNodeId = this.destinationBuffer[0];
	}

	public readonly destinationNodeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			[],
			this.destinationNodeId,
			// ACK frames do not contain a bit for this, we consider them all "inbound"
			"inbound",
			0,
		);
		tags.unshift("ACK");

		return {
			tags,
			message,
		};
	}
}

export class RoutedZWaveMPDU extends ZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		const channelConfig = getChannelConfiguration(this.frameInfo.region);

		this.direction = (this.payload[0] & 0b1) ? "inbound" : "outbound";
		this.routedAck = !!(this.payload[0] & 0b10);
		this.routedError = !!(this.payload[0] & 0b100);
		const hasExtendedHeader = !!(this.payload[0] & 0b1000);
		if (this.routedError) {
			this.failedHop = this.payload[0] >>> 4;
		} else if (channelConfig === "1/2") {
			// @ts-expect-error speedModified is readonly
			this.speedModified = !!(this.payload[0] & 0b10000);
		}

		this.hop = this.payload[1] & 0b1111;
		// The hop field in the MPDU indicates which repeater should handle the frame next.
		// This means that for an inbound frame between repeater 0 and 1, the value is one
		// less (0) than for an outbound frame (1). This also means that the field overflows
		// to 0x0f when the frame returns to the source node.
		//
		// We normalize this, so hop = 0 always means the frame is transmitted between the source node and repeater 0.
		if (this.direction === "inbound") {
			this.hop = (this.hop + 1) % 16;
		}

		const numRepeaters = this.payload[1] >>> 4;
		this.repeaters = [...this.payload.subarray(2, 2 + numRepeaters)];

		let offset = 2 + numRepeaters;
		if (channelConfig === "3") {
			this.destinationWakeup = this.payload[offset++] === 0x02;
		}

		if (hasExtendedHeader) {
			const headerPreamble = this.payload[offset++];
			const headerLength = headerPreamble >>> 4;
			const headerType = headerPreamble & 0b1111;
			const header = this.payload.subarray(offset, offset + headerLength);
			offset += headerLength;

			if (headerType === 0x00) {
				this.destinationWakeupType = header[0] & 0b0100_0000
					? "1000ms"
					: header[0] & 0b0010_0000
					? "250ms"
					: undefined;
			} else if (headerType === 0x01) {
				const repeaterRSSI = [];
				for (let i = 0; i < numRepeaters; i++) {
					repeaterRSSI.push(parseRSSI(header, i));
				}
				this.repeaterRSSI = repeaterRSSI;
			}
		}

		this.payload = this.payload.subarray(offset);

		this.destinationNodeId = this.destinationBuffer[0];
	}

	public readonly destinationNodeId: number;
	public readonly direction: "outbound" | "inbound";
	public readonly routedAck: boolean;
	public readonly routedError: boolean;
	public readonly failedHop?: number;
	public readonly hop: number;
	public readonly repeaters: readonly number[];
	public readonly destinationWakeup?: boolean;
	public readonly destinationWakeupType?: "250ms" | "1000ms";
	public readonly repeaterRSSI?: readonly RSSI[];

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			this.repeaters,
			this.destinationNodeId,
			this.direction,
			this.hop,
			this.failedHop,
		);

		const message: MessageRecord = {
			...original,
			"ack requested": this.ackRequested,
			payload: buffer2hex(this.payload),
		};

		return {
			tags,
			message,
		};
	}
}

export class MulticastZWaveMPDU extends ZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		const control = this.destinationBuffer[0]; // 3 bits offset, 5 bits mask length, but this MUST be set to 29
		validatePayload.withReason("Invalid multicast control byte")(
			control === 29,
		);
		this.destinationNodeIds = parseNodeBitMask(
			this.destinationBuffer.subarray(1),
		);
	}

	public readonly destinationNodeIds: readonly number[];

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags.push("MULTICAST");

		const message: MessageRecord = {
			destinations: this.destinationNodeIds.join(", "),
			...original,
			payload: buffer2hex(this.payload),
		};
		return {
			tags,
			message,
		};
	}
}

export class ExplorerZWaveMPDU extends ZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);
		this.version = this.payload[0] >>> 5;
		this.command = this.payload[0] & 0b0001_1111;
		this.stop = !!(this.payload[1] & 0b100);
		this.direction = this.payload[1] & 0b010 ? "inbound" : "outbound";
		this.sourceRouted = !!(this.payload[1] & 0b001);
		this.randomTXInterval = this.payload[2];
		this.ttl = this.payload[3] >>> 4;
		const numRepeaters = this.payload[3] & 0b1111;
		this.repeaters = [...this.payload.subarray(4, 4 + numRepeaters)];

		// Make sure the correct constructor gets called
		const Constructor = this.command === ExplorerFrameCommand.Normal
			? NormalExplorerZWaveMPDU
			: this.command === ExplorerFrameCommand.InclusionRequest
			? InclusionRequestExplorerZWaveMPDU
			: this.command === ExplorerFrameCommand.SearchResult
			? SearchResultExplorerZWaveMPDU
			: undefined;

		if (!Constructor) {
			throw validatePayload.fail(
				`Unsupported Explorer MPDU command ${this.command}`,
			);
		} else if (
			new.target !== Constructor
			&& !staticExtends(new.target, Constructor)
		) {
			return new Constructor(options);
		}

		this.destinationNodeId = this.destinationBuffer[0];
		this.payload = this.payload.subarray(8);
	}

	public readonly destinationNodeId!: number;

	public readonly version: number;
	public readonly command: ExplorerFrameCommand;
	public readonly stop: boolean;
	public readonly sourceRouted: boolean;
	public readonly direction: "outbound" | "inbound";
	public readonly randomTXInterval: number;
	public readonly ttl: number;
	public readonly repeaters: readonly number[];
}

export class NormalExplorerZWaveMPDU extends ExplorerZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			this.repeaters,
			this.destinationNodeId,
			// Explorer frames do not contain a bit for the direction, we consider them all "outbound"
			"outbound",
			4 - this.ttl,
		);
		tags.unshift("EXPLORER");

		const message: MessageRecord = {
			...original,
			"ack requested": this.ackRequested,
			payload: buffer2hex(this.payload),
		};
		return {
			tags,
			message,
		};
	}
}

export class InclusionRequestExplorerZWaveMPDU extends ExplorerZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.networkHomeId = this.payload.readUInt32BE(0);
		this.payload = this.payload.subarray(4);
	}

	/** The home ID of the repeating node */
	public readonly networkHomeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			this.repeaters,
			this.destinationNodeId,
			// Explorer frames do not contain a bit for the direction, we consider them all "outbound"
			"outbound",
			4 - this.ttl,
		);
		tags.unshift("INCL REQUEST");

		const message: MessageRecord = {
			...original,
			"network home ID": padStart(
				this.networkHomeId.toString(16),
				8,
				"0",
			),
			payload: buffer2hex(this.payload),
		};
		return {
			tags,
			message,
		};
	}
}

export class SearchResultExplorerZWaveMPDU extends ExplorerZWaveMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.searchingNodeId = this.payload[0];
		this.frameHandle = this.payload[1];
		this.resultTTL = this.payload[2] >>> 4;
		const numRepeaters = this.payload[2] & 0b1111;
		this.resultRepeaters = [
			...this.payload.subarray(3, 3 + numRepeaters),
		];

		// This frame contains no payload
		this.payload = Buffer.allocUnsafe(0);
	}

	/** The node ID that sent the explorer frame that's being answered here */
	public readonly searchingNodeId: number;
	/** The sequence number of the original explorer frame */
	public readonly frameHandle: number;
	public readonly resultTTL: number;
	public readonly resultRepeaters: readonly number[];

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			this.repeaters,
			this.destinationNodeId,
			// Explorer frames do not contain a bit for the direction, we consider their responses "inbound"
			"inbound",
			4 - this.ttl,
		);
		tags.unshift("EXPLORER RESULT");

		const message: MessageRecord = {
			...original,
			"frame handle": this.frameHandle,
			"result TTL": this.resultTTL,
			"result repeaters": this.resultRepeaters.join(", "),
		};
		return {
			tags,
			message,
		};
	}
}

export function parseBeamFrame(
	frame: ZnifferDataMessage,
): ZWaveBeamStart | LongRangeBeamStart | BeamStop {
	if (frame.frameType === ZnifferFrameType.BeamStop) {
		return new BeamStop({
			data: frame.payload,
			frameInfo: frame,
		});
	}

	const channelConfig = getChannelConfiguration(frame.region);
	switch (channelConfig) {
		case "1/2":
		case "3": {
			return new ZWaveBeamStart({
				data: frame.payload,
				frameInfo: frame,
			});
		}
		case "4": {
			return new LongRangeBeamStart({
				data: frame.payload,
				frameInfo: frame,
			});
		}
		default:
			throw validatePayload.fail(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Unsupported channel configuration ${channelConfig}. MPDU payload: ${
					buffer2hex(frame.payload)
				}`,
			);
	}
}

export class ZWaveBeamStart {
	public constructor(options: MPDUOptions) {
		const data = options.data;
		this.frameInfo = options.frameInfo;

		const channelConfig = getChannelConfiguration(this.frameInfo.region);
		switch (channelConfig) {
			case "1/2":
			case "3":
				// OK
				break;
			case "4": {
				throw validatePayload.fail(
					`Channel configuration 4 (ZWLR) must be parsed as a LongRangeMPDU!`,
				);
			}
			default: {
				throw validatePayload.fail(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`Unsupported channel configuration ${channelConfig}. MPDU payload: ${
						buffer2hex(data)
					}`,
				);
			}
		}

		this.destinationNodeId = data[1];
		if (data[2] === 0x01) {
			this.homeIdHash = data[3];
		}
	}

	public readonly frameInfo: ZnifferFrameInfo;
	public readonly homeIdHash?: number;
	public readonly destinationNodeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const tags = [
			`BEAM » ${formatNodeId(this.destinationNodeId)}`,
		];

		const message: MessageRecord = {
			channel: this.frameInfo.channel,
			"protocol/data rate": znifferProtocolDataRateToString(
				this.frameInfo.protocolDataRate,
			),
			RSSI: this.frameInfo.rssi != undefined
				? rssiToString(this.frameInfo.rssi)
				: this.frameInfo.rssiRaw.toString(),
		};
		return {
			tags,
			message,
		};
	}
}

export class LongRangeBeamStart {
	public constructor(options: MPDUOptions) {
		const data = options.data;
		this.frameInfo = options.frameInfo;

		const channelConfig = getChannelConfiguration(this.frameInfo.region);
		switch (channelConfig) {
			case "1/2":
			case "3":
				// OK
				break;
			case "4": {
				throw validatePayload.fail(
					`Channel configuration 4 (ZWLR) must be parsed as a LongRangeMPDU!`,
				);
			}
			default: {
				throw validatePayload.fail(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`Unsupported channel configuration ${channelConfig}. MPDU payload: ${
						buffer2hex(data)
					}`,
				);
			}
		}

		const txPower = data[1] >>> 4;
		this.txPower = longRangeBeamPowerToDBm(txPower);
		this.destinationNodeId = data.readUint16BE(1) & 0x0fff;
		this.homeIdHash = data[3];
	}

	public readonly frameInfo: ZnifferFrameInfo;
	public readonly homeIdHash: number;
	public readonly destinationNodeId: number;
	public readonly txPower: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const tags = [
			`BEAM » ${formatNodeId(this.destinationNodeId)}`,
		];

		const message: MessageRecord = {
			channel: this.frameInfo.channel,
			"protocol/data rate": znifferProtocolDataRateToString(
				this.frameInfo.protocolDataRate,
			),
			"TX power": `${this.txPower} dBm`,
			RSSI: this.frameInfo.rssi != undefined
				? rssiToString(this.frameInfo.rssi)
				: this.frameInfo.rssiRaw.toString(),
		};
		return {
			tags,
			message,
		};
	}
}

export class BeamStop {
	public constructor(options: MPDUOptions) {
		this.frameInfo = options.frameInfo;
	}

	public readonly frameInfo: ZnifferFrameInfo;

	public toLogEntry(): MessageOrCCLogEntry {
		const tags = [
			"BEAM STOP",
		];

		const message: MessageRecord = {
			channel: this.frameInfo.channel,
		};
		return {
			tags,
			message,
		};
	}
}

/** An application-oriented representation of a Z-Wave frame that was captured by the Zniffer */
export type ZWaveFrame =
	// Common fields for all Z-Wave frames
	& {
		protocol: Protocols.ZWave;

		channel: number;
		region: number;
		rssiRaw: number;
		rssi?: RSSI;

		protocolDataRate: ZnifferProtocolDataRate;
		speedModified: boolean;

		sequenceNumber: number;

		homeId: number;
		sourceNodeId: number;
	}
	// Different kinds of Z-Wave frames:
	& (
		| (
			// Singlecast frame, either routed or not
			& {
				type: ZWaveFrameType.Singlecast;
				destinationNodeId: number;
				ackRequested: boolean;
				payload: Buffer | CommandClass;
			}
			// Only present in routed frames:
			& AllOrNone<
				& {
					direction: "outbound" | "inbound";
					hop: number;
					repeaters: number[];
					repeaterRSSI?: RSSI[];
				}
				// Different kinds of routed frames:
				& (
					// Normal frame
					| {
						routedAck: false;
						routedError: false;
						failedHop?: undefined;
					}
					// Routed acknowledgement
					| {
						routedAck: true;
						routedError: false;
						failedHop?: undefined;
					}
					// Routed error
					| {
						routedAck: false;
						routedError: true;
						failedHop: number;
					}
				)
			>
		)
		// Broadcast frame. This is technically a singlecast frame,
		// but the destination node ID is always 255 and it is not routed
		| {
			type: ZWaveFrameType.Broadcast;
			destinationNodeId: typeof NODE_ID_BROADCAST;
			ackRequested: boolean;
			payload: Buffer | CommandClass;
		}
		| {
			// Multicast frame, not routed
			type: ZWaveFrameType.Multicast;
			destinationNodeIds: number[];
			payload: Buffer | CommandClass;
		}
		| {
			// Ack frame, not routed
			type: ZWaveFrameType.AckDirect;
			destinationNodeId: number;
		}
		| (
			// Different kind of explorer frames
			& ({
				type: ZWaveFrameType.ExplorerNormal;
				payload: Buffer | CommandClass;
			} | {
				type: ZWaveFrameType.ExplorerSearchResult;
				searchingNodeId: number;
				frameHandle: number;
				resultTTL: number;
				resultRepeaters: readonly number[];
			} | {
				type: ZWaveFrameType.ExplorerInclusionRequest;
				networkHomeId: number;
				payload: Buffer | CommandClass;
			})
			// Common fields for all explorer frames
			& {
				destinationNodeId: number;
				ackRequested: boolean;
				direction: "outbound" | "inbound";
				repeaters: number[];
				ttl: number;
			}
		)
	);

export type LongRangeFrame =
	// Common fields for all Long Range frames
	& {
		protocol: Protocols.ZWaveLongRange;

		channel: number;
		region: ZnifferRegion;
		protocolDataRate: ZnifferProtocolDataRate;

		rssiRaw: number;
		rssi?: RSSI;
		noiseFloor: RSSI;
		txPower: number;

		sequenceNumber: number;

		homeId: number;
		sourceNodeId: number;
		destinationNodeId: number;
	}
	// Different kinds of Long Range frames:
	& (
		| {
			// Singlecast frame
			type: LongRangeFrameType.Singlecast;
			ackRequested: boolean;
			payload: Buffer | CommandClass;
		}
		| {
			// Broadcast frame. This is technically a singlecast frame,
			// but the destination node ID is always 4095
			type: LongRangeFrameType.Broadcast;
			destinationNodeId: typeof NODE_ID_BROADCAST_LR;
			ackRequested: boolean;
			payload: Buffer | CommandClass;
		}
		| {
			// Acknowledgement frame
			type: LongRangeFrameType.Ack;
			incomingRSSI: RSSI;
			payload: Buffer;
		}
	);

export type BeamFrame =
	// Common fields for all Beam frames
	& {
		channel: number;
	}
	// Different types of beam frames:
	& (
		| {
			// Z-Wave Classic
			protocol: Protocols.ZWave;
			type: ZWaveFrameType.BeamStart;

			protocolDataRate: ZnifferProtocolDataRate;
			rssiRaw: number;
			rssi?: RSSI;
			region: ZnifferRegion;

			homeIdHash?: number;
			destinationNodeId: number;
		}
		| {
			// Z-Wave Long Range
			protocol: Protocols.ZWaveLongRange;
			type: LongRangeFrameType.BeamStart;

			protocolDataRate: ZnifferProtocolDataRate;
			rssiRaw: number;
			rssi?: RSSI;
			region: ZnifferRegion;

			txPower: number;
			homeIdHash: number;
			destinationNodeId: number;
		}
		// The Zniffer sends the same command for the beam ending for both
		// Z-Wave Classic and Long Range. To make testing the frame type more
		// consistent with the other frames, two different values are used
		| {
			protocol: Protocols.ZWave;
			type: ZWaveFrameType.BeamStop;
		}
		| {
			protocol: Protocols.ZWaveLongRange;
			type: LongRangeFrameType.BeamStop;
		}
	);

export type Frame =
	| ZWaveFrame
	| LongRangeFrame
	| BeamFrame;

export type CorruptedFrame = {
	channel: number;
	region: number;
	rssiRaw: number;
	rssi?: RSSI;

	protocolDataRate: ZnifferProtocolDataRate;

	payload: Buffer;
};

export function mpduToFrame(mpdu: MPDU, payloadCC?: CommandClass): Frame {
	if (mpdu instanceof ZWaveMPDU) {
		return mpduToZWaveFrame(mpdu, payloadCC);
	} else if (mpdu instanceof LongRangeMPDU) {
		return mpduToLongRangeFrame(mpdu, payloadCC);
	}

	throw new ZWaveError(
		`mpduToFrame not supported for ${mpdu.constructor.name}`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function mpduToZWaveFrame(
	mpdu: ZWaveMPDU,
	payloadCC?: CommandClass,
): ZWaveFrame {
	const retBase = {
		protocol: Protocols.ZWave as const,

		channel: mpdu.frameInfo.channel,
		region: mpdu.frameInfo.region,
		rssiRaw: mpdu.frameInfo.rssiRaw,
		rssi: mpdu.frameInfo.rssi,

		protocolDataRate: mpdu.frameInfo.protocolDataRate,
		speedModified: mpdu.speedModified,

		sequenceNumber: mpdu.sequenceNumber,

		homeId: mpdu.homeId,
		sourceNodeId: mpdu.sourceNodeId,
	};

	if (mpdu instanceof SinglecastZWaveMPDU) {
		const ret = {
			...retBase,
			ackRequested: mpdu.ackRequested,
			payload: payloadCC ?? mpdu.payload,
		};
		if (mpdu.destinationNodeId === NODE_ID_BROADCAST) {
			return {
				type: ZWaveFrameType.Broadcast,
				destinationNodeId: mpdu.destinationNodeId,
				...ret,
			};
		} else {
			return {
				type: ZWaveFrameType.Singlecast,
				destinationNodeId: mpdu.destinationNodeId,
				...ret,
			};
		}
	} else if (mpdu instanceof AckZWaveMPDU) {
		return {
			type: ZWaveFrameType.AckDirect,
			...retBase,
			destinationNodeId: mpdu.destinationNodeId,
		};
	} else if (mpdu instanceof MulticastZWaveMPDU) {
		return {
			type: ZWaveFrameType.Multicast,
			...retBase,
			destinationNodeIds: [...mpdu.destinationNodeIds],
			payload: payloadCC ?? mpdu.payload,
		};
	} else if (mpdu instanceof RoutedZWaveMPDU) {
		return {
			type: ZWaveFrameType.Singlecast,
			...retBase,
			destinationNodeId: mpdu.destinationNodeId,
			ackRequested: mpdu.ackRequested,
			payload: payloadCC ?? mpdu.payload,
			direction: mpdu.direction,
			hop: mpdu.hop,
			repeaters: [...mpdu.repeaters],
			repeaterRSSI: mpdu.repeaterRSSI && [...mpdu.repeaterRSSI],
			routedAck: mpdu.routedAck as any,
			routedError: mpdu.routedError as any,
			failedHop: mpdu.failedHop,
		};
	} else if (mpdu instanceof ExplorerZWaveMPDU) {
		const explorerBase = {
			...retBase,
			destinationNodeId: mpdu.destinationNodeId,
			ackRequested: mpdu.ackRequested,
			direction: mpdu.direction,
			repeaters: [...mpdu.repeaters],
			ttl: mpdu.ttl,
		};
		if (mpdu instanceof NormalExplorerZWaveMPDU) {
			return {
				type: ZWaveFrameType.ExplorerNormal,
				payload: payloadCC ?? mpdu.payload,
				...explorerBase,
			};
		} else if (mpdu instanceof SearchResultExplorerZWaveMPDU) {
			return {
				type: ZWaveFrameType.ExplorerSearchResult,
				...explorerBase,
				searchingNodeId: mpdu.searchingNodeId,
				frameHandle: mpdu.frameHandle,
				resultTTL: mpdu.resultTTL,
				resultRepeaters: [...mpdu.resultRepeaters],
			};
		} else if (mpdu instanceof InclusionRequestExplorerZWaveMPDU) {
			return {
				type: ZWaveFrameType.ExplorerInclusionRequest,
				payload: payloadCC ?? mpdu.payload,
				...explorerBase,
				networkHomeId: mpdu.networkHomeId,
			};
		}
	}

	throw new ZWaveError(
		`mpduToZWaveFrame not supported for ${mpdu.constructor.name}`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function mpduToLongRangeFrame(
	mpdu: LongRangeMPDU,
	payloadCC?: CommandClass,
): LongRangeFrame {
	const retBase = {
		protocol: Protocols.ZWaveLongRange as const,

		channel: mpdu.frameInfo.channel,
		region: mpdu.frameInfo.region,
		protocolDataRate: mpdu.frameInfo.protocolDataRate,

		rssiRaw: mpdu.frameInfo.rssiRaw,
		rssi: mpdu.frameInfo.rssi,
		noiseFloor: mpdu.noiseFloor,
		txPower: mpdu.txPower,

		sequenceNumber: mpdu.sequenceNumber,

		homeId: mpdu.homeId,
		sourceNodeId: mpdu.sourceNodeId,
		destinationNodeId: mpdu.destinationNodeId,
	};

	if (mpdu instanceof SinglecastLongRangeMPDU) {
		const ret = {
			...retBase,
			ackRequested: mpdu.ackRequested,
			payload: payloadCC ?? mpdu.payload,
		};
		if (mpdu.destinationNodeId === NODE_ID_BROADCAST_LR) {
			return {
				type: LongRangeFrameType.Broadcast,
				...ret,
				destinationNodeId: mpdu.destinationNodeId, // Make TS happy
			};
		} else {
			return {
				type: LongRangeFrameType.Singlecast,
				...ret,
			};
		}
	} else if (mpdu instanceof AckLongRangeMPDU) {
		return {
			type: LongRangeFrameType.Ack,
			...retBase,
			incomingRSSI: mpdu.incomingRSSI,
			payload: mpdu.payload,
		};
	}

	throw new ZWaveError(
		`mpduToLongRangeFrame not supported for ${mpdu.constructor.name}`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function beamToFrame(
	beam: ZWaveBeamStart | LongRangeBeamStart | BeamStop,
): Frame {
	const retBase = {
		channel: beam.frameInfo.channel,
		region: beam.frameInfo.region,
		rssiRaw: beam.frameInfo.rssiRaw,
		rssi: beam.frameInfo.rssi,

		protocolDataRate: beam.frameInfo.protocolDataRate,
	};

	if (beam instanceof ZWaveBeamStart) {
		return {
			protocol: Protocols.ZWave,
			type: ZWaveFrameType.BeamStart,
			...retBase,
			destinationNodeId: beam.destinationNodeId,
			homeIdHash: beam.homeIdHash,
		};
	} else if (beam instanceof LongRangeBeamStart) {
		return {
			protocol: Protocols.ZWaveLongRange,
			type: LongRangeFrameType.BeamStart,
			...retBase,
			destinationNodeId: beam.destinationNodeId,
			homeIdHash: beam.homeIdHash,
			txPower: beam.txPower,
		};
	} else {
		// Beam Stop - contains only the channel, the other fields are garbage
		const isLR = beam.frameInfo.channel === 4;
		if (isLR) {
			return {
				protocol: Protocols.ZWaveLongRange,
				type: LongRangeFrameType.BeamStop,
				channel: beam.frameInfo.channel,
			};
		} else {
			return {
				protocol: Protocols.ZWave,
				type: ZWaveFrameType.BeamStop,
				channel: beam.frameInfo.channel,
			};
		}
	}
}

export function znifferDataMessageToCorruptedFrame(
	msg: ZnifferDataMessage,
	rssi?: RSSI,
): CorruptedFrame {
	if (msg.checksumOK) {
		throw new ZWaveError(
			`znifferDataMessageToCorruptedFrame expects the checksum to be incorrect`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	return {
		channel: msg.channel,
		region: msg.region,
		rssiRaw: msg.rssiRaw,
		rssi,
		protocolDataRate: msg.protocolDataRate,
		payload: msg.payload,
	};
}
