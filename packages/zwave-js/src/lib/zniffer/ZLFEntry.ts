import {
	CRC16_CCITT,
	ProtocolHeaderFormat,
	ZWaveError,
	ZWaveErrorCodes,
	ZnifferProtocolDataRate,
	ZnifferRegion,
	getProtocolHeaderFormat,
	isZWaveError,
	rfRegionToRadioProtocolMode,
	znifferRegionToRFRegion,
} from "@zwave-js/core";
import {
	ZnifferDataMessage,
	ZnifferFrameType,
	ZnifferMessage,
	ZnifferMessageType,
	computeChecksumXOR,
} from "@zwave-js/serial";
import { Bytes, type BytesView } from "@zwave-js/shared";

import { ZLFAttachment } from "./ZLFAttachment.js";
import type { CapturedData } from "./Zniffer.js";

export function captureToZLFEntry(capture: CapturedData): BytesView {
	const buffer = new Bytes(14 + capture.rawData.length).fill(0);
	// Convert the date to a .NET datetime
	let ticks =
		BigInt(capture.timestamp.getTime()) * 10000n + 621355968000000000n;
	// https://github.com/dotnet/runtime/blob/179473d3c8a1012b036ad732d02804b062923e8d/src/libraries/System.Private.CoreLib/src/System/DateTime.cs#L161
	ticks = ticks | (2n << 62n); // DateTimeKind.Local << KindShift

	buffer.writeBigUInt64LE(ticks, 0);
	const direction = 0; // inbound, outbound would be 0b1000_0000

	buffer[8] = direction | 0x01; // dir + session ID
	buffer.writeUInt32LE(capture.rawData.length, 9);
	buffer.set(capture.rawData, 13);
	buffer[buffer.length - 1] = 0xfe; // end of frame
	return buffer;
}

export function parseZLFHeader(buffer: BytesView): {
	znifferVersion: number;
	checksum: number;
	bytesRead: number;
} {
	if (buffer.length < 2048) {
		// oxlint-disable-next-line @zwave-js/no-unexpected-parse-errors -- capture files are provided by the user, so this is an invalid argument
		throw new ZWaveError(
			"Invalid ZLF file: header too small",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const bytes = Bytes.view(buffer);

	const znifferVersion = bytes[0];
	const checksum = bytes.readUInt16BE(2046);

	return {
		znifferVersion,
		checksum,
		bytesRead: 2048,
	};
}

export enum ZLFEntryKind {
	Zniffer = 0x00,
	Attachment = 0x06,
	/** Silicon Labs debug channel (DCH) frames, e.g. PTI captures from 800 series controllers */
	Pti = 0x09,
	/** PTI frames with incomplete fragments, e.g. aborted transmissions */
	PtiDiagnostic = 0x0a,
}

// The debug channel and PTI definitions below follow the format documentation in
// https://github.com/SiliconLabsSoftware/java_packet_trace_library/blob/master/doc/debug-channel.md
// and the value tables in Wireshark's packet-silabs-dch.c dissector

/** Delimiters surrounding a single debug channel frame */
const DCH_FRAME_START = 0x5b;
const DCH_FRAME_END = 0x5d;

/** Beam frames start with this tag instead of an MPDU header */
const BEAM_TAG = 0x55;

/** Debug channel message types that carry a radio packet */
enum DCHMessageType {
	EFRTxPacket = 0x29,
	EFRRxPacket = 0x2a,
}

/** Marks what the radio was doing when the capture started */
enum PTIHardwareStart {
	RxStart = 0xf8,
	TxStart = 0xfc,
	DMPProtocolSwitch = 0xf0,
}

/** Protocol IDs in the low nibble of the PTI status byte */
enum PTIProtocolId {
	ZWaveOnRAIL = 0x06,
}

// Mirrors RAIL_ZWAVE_RegionId_t from RAIL's rail_zwave.h
/** Z-Wave region IDs used in the radio config of PTI appended info */
enum RAILZWaveRegionId {
	Unknown = 0,
	EU = 1,
	US = 2,
	ANZ = 3,
	HK = 4,
	MY = 5,
	IN = 6,
	JP = 7,
	RU = 8,
	IL = 9,
	KR = 10,
	CN = 11,
	US_LR1 = 12,
	US_LR2 = 13,
	US_LR_EndDevice = 14,
	EU_LR1 = 15,
	EU_LR2 = 16,
	EU_LR_EndDevice = 17,
}

function railRegionToZnifferRegion(regionId: RAILZWaveRegionId): ZnifferRegion {
	switch (regionId) {
		case RAILZWaveRegionId.EU:
			return ZnifferRegion.Europe;
		case RAILZWaveRegionId.US:
			return ZnifferRegion.USA;
		case RAILZWaveRegionId.ANZ:
			return ZnifferRegion["Australia/New Zealand"];
		case RAILZWaveRegionId.HK:
			return ZnifferRegion["Hong Kong"];
		case RAILZWaveRegionId.IN:
			return ZnifferRegion.India;
		case RAILZWaveRegionId.JP:
			return ZnifferRegion.Japan;
		case RAILZWaveRegionId.RU:
			return ZnifferRegion.Russia;
		case RAILZWaveRegionId.IL:
			return ZnifferRegion.Israel;
		case RAILZWaveRegionId.KR:
			return ZnifferRegion.Korea;
		case RAILZWaveRegionId.CN:
			return ZnifferRegion.China;
		case RAILZWaveRegionId.US_LR1:
			return ZnifferRegion["USA (Long Range)"];
		case RAILZWaveRegionId.US_LR2:
			return ZnifferRegion["USA (Long Range, backup)"];
		case RAILZWaveRegionId.US_LR_EndDevice:
			return ZnifferRegion["USA (Long Range, end device)"];
		case RAILZWaveRegionId.EU_LR1:
		case RAILZWaveRegionId.EU_LR2:
		case RAILZWaveRegionId.EU_LR_EndDevice:
			return ZnifferRegion["Europe (Long Range)"];
		default:
			return ZnifferRegion.Unknown;
	}
}

function railChannelToZnifferChannel(
	regionId: RAILZWaveRegionId,
	channel: number,
): number {
	switch (regionId) {
		// The Zniffer exposes the second LR frequency as channel 4
		case RAILZWaveRegionId.US_LR2:
		case RAILZWaveRegionId.EU_LR2:
			return channel === 3 ? 4 : channel;
		// The end device PHYs only contain the two LR channels
		case RAILZWaveRegionId.US_LR_EndDevice:
		case RAILZWaveRegionId.EU_LR_EndDevice:
			return channel + 3;
		default:
			return channel;
	}
}

function channelToDataRate(
	region: ZnifferRegion,
	znifferChannel: number,
): ZnifferProtocolDataRate {
	const mode = rfRegionToRadioProtocolMode(znifferRegionToRFRegion(region));
	switch (getProtocolHeaderFormat(mode, znifferChannel)) {
		case ProtocolHeaderFormat.LongRange:
			return ZnifferProtocolDataRate.LongRange_100k;
		// 3-channel regions use 100 kbps on all channels
		case ProtocolHeaderFormat.Classic3Channel:
			return ZnifferProtocolDataRate.ZWave_100k;
		default:
			switch (znifferChannel) {
				case 0:
					return ZnifferProtocolDataRate.ZWave_100k;
				case 1:
					return ZnifferProtocolDataRate.ZWave_40k;
				default:
					return ZnifferProtocolDataRate.ZWave_9k6;
			}
	}
}

/**
 * Parses a single Silicon Labs debug channel frame containing a PTI radio packet
 * and converts it into a Zniffer data message. Returns `undefined` for unsupported frames.
 */
function parsePTIFrame(
	frame: BytesView,
	timestamp: Date,
): { msg: ZnifferDataMessage; capture: CapturedData } | undefined {
	// The frame is laid out as follows, where the length counts itself and the
	// message, but neither delimiter:
	//   5B <length, 2 bytes LE> <DCH message> 5D
	// The DCH message header depends on its version, and is followed by the PTI data:
	//   v2: <version, 2 bytes> <timestamp, 6 bytes (µs)> <type, 2 bytes> <sequence no., 1 byte>
	//   v3: <version, 2 bytes> <timestamp, 8 bytes (ns)> <type, 2 bytes> <flags, 4 bytes> <sequence no., 2 bytes>
	// The PTI data wraps the captured radio frame in a hardware start/end marker,
	// followed by the appended info, which is parsed back to front:
	//   <hw start, 1 byte> <radio frame> <hw end, 1 byte> <appended info>

	// Frame start, length and frame end
	if (frame.length < 4) return;
	if (frame[0] !== DCH_FRAME_START) return;
	if (frame.at(-1) !== DCH_FRAME_END) return;
	// The length includes itself, but neither delimiter
	if (Bytes.view(frame).readUInt16LE(1) !== frame.length - 2) return;

	// The message starts after the start delimiter and the length bytes
	const body = Bytes.view(frame.subarray(3, -1));
	if (body.length < 2) return;
	const version = body.readUInt16LE(0);
	let messageType: DCHMessageType | undefined;
	let ptiOffset: number;
	if (version === 0) {
		// Z-Wave CTT uses the v2 header size with zeroed version and message type fields.
		if (body.length < 11) return;
		if (body.readUInt16LE(8) !== 0) return;
		messageType = undefined;
		ptiOffset = 11;
	} else if (version === 2) {
		if (body.length < 11) return;
		messageType = body.readUInt16LE(8);
		ptiOffset = 11;
	} else if (version === 3) {
		if (body.length < 18) return;
		messageType = body.readUInt16LE(10);
		ptiOffset = 18;
	} else {
		return;
	}

	// Only Tx and Rx packets contain radio frames
	if (
		messageType !== undefined
		&& messageType !== DCHMessageType.EFRTxPacket
		&& messageType !== DCHMessageType.EFRRxPacket
	) {
		return;
	}
	const pti = Bytes.view(body.subarray(ptiOffset));

	// Only actual radio traffic is supported, no DMP protocol switches
	const hwStart: PTIHardwareStart = pti[0];
	if (
		hwStart !== PTIHardwareStart.RxStart
		&& hwStart !== PTIHardwareStart.TxStart
	) {
		return;
	}

	// The appended info at the end of the frame is parsed back to front,
	// starting with its configuration byte
	const cfg = pti.at(-1)!;
	const isRx = !!(cfg & 0b0100_0000);
	const varLen = (cfg >>> 3) & 0b111;
	const infoVersion = cfg & 0b111;

	let hasRssi = false;
	let hasSyncword = false;
	let radioCfgLen = 0;
	if (isRx) {
		switch (varLen) {
			case 1:
				hasRssi = true;
				break;
			case 2:
				hasRssi = true;
				radioCfgLen = 1;
				break;
			case 3:
				hasRssi = true;
				radioCfgLen = 2;
				break;
			case 5:
				hasRssi = true;
				hasSyncword = true;
				break;
			case 6:
				hasRssi = true;
				hasSyncword = true;
				radioCfgLen = 1;
				break;
			case 7:
				hasRssi = true;
				hasSyncword = true;
				radioCfgLen = 2;
				break;
			default:
				return;
		}
	} else {
		switch (varLen) {
			case 0:
				break;
			case 1:
				radioCfgLen = 1;
				break;
			case 2:
				radioCfgLen = 2;
				break;
			case 4:
				hasSyncword = true;
				break;
			case 5:
				hasSyncword = true;
				radioCfgLen = 1;
				break;
			case 6:
				hasSyncword = true;
				radioCfgLen = 2;
				break;
			default:
				return;
		}
	}
	// The appended info additionally contains radio info, status and the config byte
	const appendedLength = varLen + 3;
	// hw start + radio frame + hw end + appended info
	if (pti.length < 1 + 1 + 1 + appendedLength) return;

	// Only Z-Wave frames are supported
	const status = pti.at(-2)!;
	if ((status & 0x0f) !== PTIProtocolId.ZWaveOnRAIL) return;

	const radioFrame = pti.subarray(1, pti.length - appendedLength - 1);

	const appendedOffset = pti.length - appendedLength;
	let offset = appendedOffset;
	let rssiRaw = 0;
	let rssi: number | undefined;
	if (hasRssi) {
		rssiRaw = pti[appendedOffset];
		rssi = pti.readInt8(appendedOffset);
		// Version 1 of the appended info offsets the RSSI by 0x32
		if (infoVersion === 1) rssi -= 0x32;
		offset++;
	}
	if (hasSyncword) offset += 4;
	let railRegion: RAILZWaveRegionId = RAILZWaveRegionId.Unknown;
	if (radioCfgLen > 0) {
		railRegion = pti[offset] & 0b1_1111;
		offset += radioCfgLen;
	}
	const channel = railChannelToZnifferChannel(
		railRegion,
		pti[offset] & 0b11_1111,
	);
	const region = railRegionToZnifferRegion(railRegion);
	const protocolDataRate = channelToDataRate(region, channel);

	if (radioFrame.length === 0) return;

	const isLongRange =
		protocolDataRate === ZnifferProtocolDataRate.LongRange_100k;

	let frameType: ZnifferFrameType;
	let payload: Bytes;
	let checksumOK: boolean;
	let mpdu: BytesView | undefined;
	if (radioFrame[0] === BEAM_TAG) {
		frameType = ZnifferFrameType.BeamStart;
		// A beam train is captured as a single frame containing many repetitions
		// of the beam, so only the first one is of interest
		if (isLongRange) {
			// Long Range beams are beam tag, TX power and destination, home ID hash
			if (radioFrame.length < 4) return;
			payload = Bytes.view(radioFrame.subarray(0, 4));
		} else {
			// Classic beams are beam tag, destination and an optional home ID
			// hash, whose presence the Zniffer indicates with a 0x01 marker byte
			if (radioFrame.length < 2) return;
			const hasHomeIdHash = radioFrame.length > 2;
			payload = Bytes.from([
				BEAM_TAG,
				radioFrame[1],
				hasHomeIdHash ? 0x01 : 0,
				hasHomeIdHash ? radioFrame[2] : 0,
			]);
		}
		checksumOK = true;
	} else {
		frameType = ZnifferFrameType.Data;
		mpdu = radioFrame;
		// The radio may capture trailing bytes after the actual frame ends.
		// Trim to the length encoded in the MPDU, which is at byte 7 for
		// both classic Z-Wave and Z-Wave LR
		if (mpdu.length > 8 && mpdu[7] > 7 && mpdu[7] < mpdu.length) {
			mpdu = mpdu.subarray(0, mpdu[7]);
		}
		const checksumLength =
			protocolDataRate >= ZnifferProtocolDataRate.ZWave_100k ? 2 : 1;
		if (mpdu.length <= checksumLength) return;
		// The MPDU length includes the checksum, the Zniffer payload does not
		payload = Bytes.view(mpdu.subarray(0, -checksumLength));
		const expectedChecksum =
			checksumLength === 2
				? CRC16_CCITT(payload)
				: computeChecksumXOR(payload);
		const checksum = Bytes.view(mpdu).readUIntBE(
			mpdu.length - checksumLength,
			checksumLength,
		);
		checksumOK = checksum === expectedChecksum;
	}

	const msg = new ZnifferDataMessage({
		frameType,
		channel,
		protocolDataRate,
		region,
		rssiRaw,
		rssi,
		payload,
		checksumOK,
	});

	// Re-encode the frame in the classic Zniffer serial format, so saving
	// the capture again produces a file the Zniffer application can read
	const channelAndDataRate = (channel << 5) | protocolDataRate;
	let rawData: Bytes;
	if (mpdu) {
		rawData = Bytes.concat([
			[
				ZnifferMessageType.Data,
				frameType,
				0,
				0,
				channelAndDataRate,
				region,
				rssiRaw,
				0x21,
				0x03,
				mpdu.length,
			],
			mpdu,
		]);
	} else {
		// While PTI captures the entire beam train, the Zniffer represents a
		// beam with a single 11-byte BeamStart frame: 7 header bytes and the
		// 4 byte beam
		rawData = Bytes.concat([
			[
				ZnifferMessageType.Data,
				frameType,
				0,
				0,
				channelAndDataRate,
				region,
				rssiRaw,
			],
			payload,
		]);
	}

	return {
		msg,
		capture: {
			timestamp,
			rawData,
			frameData: msg.payload,
		},
	};
}

type ParsedZLFEntry =
	| {
			kind: ZLFEntryKind.Zniffer;
			type: ZnifferMessageType.Data;
			msg: ZnifferDataMessage;
			capture: CapturedData;
	  }
	| {
			kind: ZLFEntryKind.Zniffer;
			type: ZnifferMessageType.Command;
			msg: ZnifferMessage;
			capture: CapturedData;
	  }
	| {
			kind: ZLFEntryKind.Attachment;
			attachment: ZLFAttachment;
			capture?: undefined;
	  };

type ParseZLFEntryResult = (
	| {
			complete: true;
			bytesRead: number;
			accumulator?: undefined;
	  }
	| {
			complete: false;
			bytesRead: number;
			accumulator: CapturedData;
	  }
) & {
	entries: ParsedZLFEntry[];
};

/** @internal */
export function parseZLFEntry(
	buffer: BytesView,
	offset: number,
	accumulator?: CapturedData,
): ParseZLFEntryResult {
	const bytes = Bytes.view(buffer.subarray(offset));

	// Each ZLF entry has a 14-byte overhead, so the buffer must have at least that size
	if (bytes.length < 14) {
		throw new ZWaveError(
			"Invalid ZLF file: entry truncated",
			ZWaveErrorCodes.PacketFormat_Truncated,
		);
	}

	// Parse .NET DateTime ticks (8 bytes, little-endian)
	const ticks = bytes.readBigUInt64LE(0);
	// Kind: 1 = UTC, 2 = Local
	// const dateTimeKind = Number((ticks >> 62n) & 0b11n);
	const timeStampMask = (1n << 62n) - 1n;
	const jsTimestamp = Number(
		((ticks & timeStampMask) - 621355968000000000n) / 10000n,
	);
	// FIXME: dateTimeKind should always be local. Properly support UTC
	const timestamp = new Date(jsTimestamp);

	// Ignore the direction and session ID byte
	const rawDataLength = bytes.readUInt32LE(9);
	const totalLength = 14 + rawDataLength;
	if (bytes.length < totalLength) {
		throw new ZWaveError(
			"Invalid ZLF file: entry truncated",
			ZWaveErrorCodes.PacketFormat_Truncated,
		);
	}
	const kind: ZLFEntryKind = 0xfe - bytes[totalLength - 1];
	// Skip unsupported entries:
	if (
		kind !== ZLFEntryKind.Zniffer
		&& kind !== ZLFEntryKind.Attachment
		&& kind !== ZLFEntryKind.Pti
		&& kind !== ZLFEntryKind.PtiDiagnostic
	) {
		return {
			complete: true,
			bytesRead: totalLength,
			entries: [],
		};
	}

	let rawData = bytes.subarray(13, totalLength - 1);
	if (accumulator) {
		rawData = Bytes.concat([accumulator.rawData, rawData]);
	}

	const parsed: ParsedZLFEntry[] = [];

	try {
		// Parse all entries in this chunk
		if (kind === ZLFEntryKind.Zniffer) {
			while (rawData.length > 0) {
				const { msg, bytesRead } = ZnifferMessage.parse(rawData);
				if (bytesRead === 0) break;

				const capture: CapturedData = {
					timestamp,
					rawData: rawData.subarray(0, bytesRead),
					frameData: msg.payload,
				};

				// Help TypeScript out a bit
				if (msg instanceof ZnifferDataMessage) {
					parsed.push({
						kind: ZLFEntryKind.Zniffer,
						type: ZnifferMessageType.Data,
						msg,
						capture,
					});
				} else {
					// We are dealing with a command frame
					parsed.push({
						kind: ZLFEntryKind.Zniffer,
						type: ZnifferMessageType.Command,
						msg,
						capture,
					});
				}
				// Advance the buffer for the next iteration
				rawData = rawData.subarray(bytesRead);
			}
		} else if (
			kind === ZLFEntryKind.Pti
			|| kind === ZLFEntryKind.PtiDiagnostic
		) {
			while (rawData.length > 0) {
				// Anything not starting with a delimiter cannot be parsed
				if (rawData[0] !== DCH_FRAME_START) break;
				if (rawData.length < 3) {
					throw new ZWaveError(
						"Incomplete debug channel frame",
						ZWaveErrorCodes.PacketFormat_Truncated,
					);
				}
				// The length field includes itself and the message, but not the delimiters
				const frameLength = 2 + Bytes.view(rawData).readUInt16LE(1);
				if (rawData.length < frameLength) {
					throw new ZWaveError(
						"Incomplete debug channel frame",
						ZWaveErrorCodes.PacketFormat_Truncated,
					);
				}

				const result = parsePTIFrame(
					rawData.subarray(0, frameLength),
					timestamp,
				);
				if (result) {
					// Expose PTI frames like classic Zniffer data frames
					parsed.push({
						kind: ZLFEntryKind.Zniffer,
						type: ZnifferMessageType.Data,
						msg: result.msg,
						capture: result.capture,
					});
				}
				rawData = rawData.subarray(frameLength);
			}
		} else if (kind === ZLFEntryKind.Attachment) {
			try {
				// There should only be one attachment per entry
				const { attachment } = ZLFAttachment.parse(rawData);
				parsed.push({
					kind: ZLFEntryKind.Attachment,
					attachment,
				});
			} catch (e) {
				if (
					isZWaveError(e)
					&& e.code === ZWaveErrorCodes.Deserialization_NotImplemented
				) {
					// Ignore unknown attachment types
					console.warn("Ignoring unsupported ZLF attachment");
				}
			}
		}

		// All data was consumed
		return {
			complete: true,
			bytesRead: totalLength,
			entries: parsed,
		};
	} catch (e) {
		if (
			isZWaveError(e)
			&& e.code === ZWaveErrorCodes.PacketFormat_Truncated
		) {
			// We are dealing with an incomplete frame, so we need to accumulate the data for the next iteration
			accumulator ??= {
				timestamp,
				rawData: new Bytes(),
				frameData: new Bytes(), // Cannot be determined yet
			};
			accumulator.rawData = rawData; // rawData only contains the unparsed data

			return {
				complete: false,
				bytesRead: totalLength,
				accumulator,
				// Include what was parsed already
				entries: parsed,
			};
		}
		throw e;
	}
}
