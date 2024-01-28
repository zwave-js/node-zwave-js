import {
	type MessageOrCCLogEntry,
	type MessageRecord,
	type RSSI,
	ZnifferRegion,
	parseNodeBitMask,
	validatePayload,
	znifferProtocolDataRateToString,
} from "@zwave-js/core";
import {
	type ZnifferDataMessage,
	type ZnifferFrameInfo,
} from "@zwave-js/serial";
import { buffer2hex, pick, staticExtends } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import { parseRSSI } from "../serialapi/transport/SendDataShared";

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

function formatNodeId(nodeId: number): string {
	return padStart(nodeId.toString(), 3, "0");
}

function formatRoute(
	source: number,
	repeaters: readonly number[],
	destination: number,
	currentHop: number,
): string {
	return [
		formatNodeId(source),
		...repeaters.map(formatNodeId),
		formatNodeId(destination),
	].map((id, i) => (i === 0 ? "" : i === currentHop + 1 ? " » " : " › ") + id)
		.join("");
}

export interface MPDUOptions {
	data: Buffer;
	frameInfo: ZnifferFrameInfo;
}

export enum MPDUHeaderType {
	Singlecast = 0x1,
	Multicast = 0x2,
	Acknowledgement = 0x3,
	Explorer = 0x5,
	Routed = 0x8,
}

export enum BeamingInfo {
	None = 0b00,
	ShortContinuous = 0b01,
	LongContinuous = 0b10,
	Fragmented = 0b100,
}

export enum ExplorerFrameCommand {
	Normal = 0x00,
	InclusionRequest = 0x01,
	SearchResult = 0x02,
}

export class MPDU {
	public constructor(options: MPDUOptions) {
		const data = options.data;
		this.frameInfo = options.frameInfo;

		const channelConfig = getChannelConfiguration(this.frameInfo.region);

		let destinationOffset = 8;
		const frameControl = data.subarray(5, 7);
		switch (channelConfig) {
			case "1/2": {
				this.routed = !!(frameControl[0] & 0b1000_0000);
				this.ackRequested = !!(frameControl[0] & 0b0100_0000);
				this.lowPower = !!(frameControl[0] & 0b0010_0000);
				this.speedModified = !!(frameControl[0] & 0b0001_0000);
				this.headerType = frameControl[0] & 0b0000_1111;
				this.beamingInfo = frameControl[1] & 0b0110_0000;
				this.sequenceNumber = frameControl[1] & 0b0000_1111;
				break;
			}
			case "3": {
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
			default: {
				validatePayload.fail(
					`Unsupported channel configuration ${channelConfig}`,
				);
			}
		}

		const Constructor = this.headerType === MPDUHeaderType.Acknowledgement
			? AckMPDU
			: (this.headerType === MPDUHeaderType.Routed
					|| (this.headerType === MPDUHeaderType.Singlecast
						&& this.routed))
			? RoutedMPDU
			: this.headerType === MPDUHeaderType.Singlecast
			? SinglecastMPDU
			: this.headerType === MPDUHeaderType.Multicast
			? MulticastMPDU
			: this.headerType === MPDUHeaderType.Explorer
			? ExplorerMPDU
			: undefined;
		if (!Constructor) {
			validatePayload.fail(
				`Unsupported MPDU header type ${this.headerType}`,
			);
		} else if (
			new.target !== Constructor
			&& !staticExtends(new.target, Constructor)
		) {
			return new Constructor(options);
		}

		// FIXME: Find out which differences channel configuration 4 (ZWLR) has
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

	public static from(msg: ZnifferDataMessage): MPDU {
		return new MPDU({
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
				+ (this.speedModified ? " (modified)" : ""),
			RSSI: `${this.frameInfo.rssiRaw}`,
		};
		return {
			tags,
			message,
		};
	}
}

export class SinglecastMPDU extends MPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.destinationNodeId = this.destinationBuffer[0];
	}

	public readonly destinationNodeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(this.sourceNodeId, [], this.destinationNodeId, 0);

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

export class AckMPDU extends MPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.destinationNodeId = this.destinationBuffer[0];
	}

	public readonly destinationNodeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message } = super.toLogEntry();
		tags[0] = formatRoute(this.sourceNodeId, [], this.destinationNodeId, 0);
		tags.unshift("ACK");

		return {
			tags,
			message,
		};
	}
}

export class RoutedMPDU extends MPDU {
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
		const { tags, message } = super.toLogEntry();
		tags[0] = formatRoute(
			this.sourceNodeId,
			this.repeaters,
			this.destinationNodeId,
			this.hop,
		);

		return {
			tags,
			message,
		};
	}
}

export class MulticastMPDU extends MPDU {
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

export class ExplorerMPDU extends MPDU {
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
			? NormalExplorerMPDU
			: this.command === ExplorerFrameCommand.InclusionRequest
			? InclusionRequestExplorerMPDU
			: this.command === ExplorerFrameCommand.SearchResult
			? SearchResultExplorerMPDU
			: undefined;

		if (!Constructor) {
			validatePayload.fail(
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

	public toLogEntry(): MessageOrCCLogEntry {
		const { tags, message: original } = super.toLogEntry();
		tags[0] = formatRoute(this.sourceNodeId, [], this.destinationNodeId, 0);
		tags.unshift("EXPLORER");

		const message: MessageRecord = {
			...original,
			// TODO: Add other fields, and specialization for the subcommands
			payload: buffer2hex(this.payload),
		};
		return {
			tags,
			message,
		};
	}
}

export class NormalExplorerMPDU extends ExplorerMPDU {
	public constructor(options: MPDUOptions) {
		super(options);
	}
}

export class InclusionRequestExplorerMPDU extends ExplorerMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.networkHomeId = this.payload.readUInt32BE(0);
		this.payload = this.payload.subarray(4);
	}

	/** The home ID of the repeating node */
	public readonly networkHomeId: number;
}

export class SearchResultExplorerMPDU extends ExplorerMPDU {
	public constructor(options: MPDUOptions) {
		super(options);

		this.explorerNodeId = this.payload[0];
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
	public readonly explorerNodeId?: number;
	/** The sequence number of the original explorer frame */
	public readonly frameHandle?: number;
	public readonly resultTTL?: number;
	public readonly resultRepeaters?: readonly number[];
}
