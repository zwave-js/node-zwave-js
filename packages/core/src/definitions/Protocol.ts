import { num2hex } from "@zwave-js/shared";

import { RFRegion, ZnifferRegion, ZnifferRegionLegacy } from "./RFRegion.js";

export enum Protocols {
	ZWave = 0,
	ZWaveLongRange = 1,
}

export enum ZWaveDataRate {
	"9k6" = 0x01,
	"40k" = 0x02,
	"100k" = 0x03,
}

export function zwaveDataRateToString(rate: ZWaveDataRate): string {
	switch (rate) {
		case ZWaveDataRate["9k6"]:
			return "9.6 kbit/s";
		case ZWaveDataRate["40k"]:
			return "40 kbit/s";
		case ZWaveDataRate["100k"]:
			return "100 kbit/s";
	}
	return `Unknown (${num2hex(rate)})`;
}

export enum ProtocolDataRate {
	ZWave_9k6 = 0x01,
	ZWave_40k = 0x02,
	ZWave_100k = 0x03,
	LongRange_100k = 0x04,
}

export function protocolDataRateToString(rate: ProtocolDataRate): string {
	switch (rate) {
		case ProtocolDataRate.ZWave_9k6:
			return "Z-Wave, 9.6 kbit/s";
		case ProtocolDataRate.ZWave_40k:
			return "Z-Wave, 40 kbit/s";
		case ProtocolDataRate.ZWave_100k:
			return "Z-Wave, 100 kbit/s";
		case ProtocolDataRate.LongRange_100k:
			return "Z-Wave Long Range, 100 kbit/s";
	}
	return `Unknown (${num2hex(rate)})`;
}

// Same as ProtocolDataRate, but with the ability to NOT specify a data rate
export enum RouteProtocolDataRate {
	Unspecified = 0x00,
	ZWave_9k6 = 0x01,
	ZWave_40k = 0x02,
	ZWave_100k = 0x03,
	LongRange_100k = 0x04,
}

// Like ProtocolDataRate, but for use in the Zniffer protocol, which
// shifts the values by one for some reason
export enum ZnifferProtocolDataRate {
	ZWave_9k6 = 0x00,
	ZWave_40k = 0x01,
	ZWave_100k = 0x02,
	LongRange_100k = 0x03,
}

export function znifferProtocolDataRateToProtocolDataRate(
	rate: ZnifferProtocolDataRate,
): ProtocolDataRate {
	return rate + 1;
}

/**
 * Converts a ZnifferProtocolDataRate into a human-readable string.
 * @param includeProtocol - Whether to include the protocol name in the output
 */
export function znifferProtocolDataRateToString(
	rate: ZnifferProtocolDataRate,
	includeProtocol: boolean = true,
): string {
	if (includeProtocol) {
		switch (rate) {
			case ZnifferProtocolDataRate.ZWave_9k6:
				return "Z-Wave, 9.6 kbit/s";
			case ZnifferProtocolDataRate.ZWave_40k:
				return "Z-Wave, 40 kbit/s";
			case ZnifferProtocolDataRate.ZWave_100k:
				return "Z-Wave, 100 kbit/s";
			case ZnifferProtocolDataRate.LongRange_100k:
				return "Z-Wave Long Range, 100 kbit/s";
		}
	} else {
		switch (rate) {
			case ZnifferProtocolDataRate.ZWave_9k6:
				return "9.6 kbit/s";
			case ZnifferProtocolDataRate.ZWave_40k:
				return "40 kbit/s";
			case ZnifferProtocolDataRate.ZWave_100k:
			case ZnifferProtocolDataRate.LongRange_100k:
				return "100 kbit/s";
		}
	}
	return `Unknown (${num2hex(rate)})`;
}

export const protocolDataRateMask = 0b111;

export enum ProtocolType {
	"Z-Wave" = 0,
	"Z-Wave AV" = 1,
	"Z-Wave for IP" = 2,
}

export enum LongRangeChannel {
	/** Indicates that Long Range is not supported by the currently set RF region */
	Unsupported = 0x00,
	A = 0x01,
	B = 0x02,
	// 0x03..0xFE are reserved and must not be used
	/** Z-Wave Long Range Channel automatically selected by the Z-Wave algorithm */
	Auto = 0xff,
}

export function isLongRangeNodeId(nodeId: number): boolean {
	return nodeId > 255;
}

export enum ProtocolVersion {
	unknown = 0,
	"2.0" = 1,
	"4.2x / 5.0x" = 2,
	"4.5x / 6.0x" = 3,
}

export enum RadioProtocolMode {
	Classic2Channel = 0,
	Classic3Channel = 1,
	Classic2ChannelPlusLongRange = 2,
	LongRange2Channel = 3,
}

export enum ProtocolHeaderFormat {
	Classic2Channel = 0,
	Classic3Channel = 1,
	LongRange = 2,
}

/**
 * Converts a region reported by a legacy (500 series or older) Zniffer
 * to the modern {@link ZnifferRegion} encoding. The legacy values collide
 * with the modern ones, e.g. legacy India (9) is the modern "USA (Long Range)".
 */
export function znifferLegacyRegionToZnifferRegion(
	region: number,
): ZnifferRegion {
	switch (region) {
		case ZnifferRegionLegacy.EU:
			return ZnifferRegion.Europe;
		case ZnifferRegionLegacy.US:
			return ZnifferRegion.USA;
		case ZnifferRegionLegacy.ANZ:
			return ZnifferRegion["Australia/New Zealand"];
		case ZnifferRegionLegacy.HK:
			return ZnifferRegion["Hong Kong"];
		case ZnifferRegionLegacy.IN:
			return ZnifferRegion.India;
		case ZnifferRegionLegacy.JP:
			return ZnifferRegion.Japan;
		case ZnifferRegionLegacy.RU:
			return ZnifferRegion.Russia;
		case ZnifferRegionLegacy.IL:
			return ZnifferRegion.Israel;
		case ZnifferRegionLegacy.KR:
			return ZnifferRegion.Korea;
		case ZnifferRegionLegacy.CN:
			return ZnifferRegion.China;
		// The 3-channel test frequencies behave like Japan
		case ZnifferRegionLegacy.TF_932_3CH:
		case ZnifferRegionLegacy.TF_940_3CH:
		case ZnifferRegionLegacy.TF_835_3CH:
		case ZnifferRegionLegacy.TF_840_3CH:
		case ZnifferRegionLegacy.TF_850_3CH:
			return ZnifferRegion.Japan;
		// Everything else (Malaysia, 2-channel test frequencies) uses the
		// default 2-channel configuration
		default:
			return ZnifferRegion.Unknown;
	}
}

export function znifferRegionToRFRegion(region: ZnifferRegion): RFRegion {
	switch (region) {
		// These Zniffer-only regions have no RFRegion counterpart. Map them to
		// the closest region with the same channel configuration
		case ZnifferRegion["USA (Long Range, backup)"]:
		case ZnifferRegion["USA (Long Range, end device)"]:
			return RFRegion["USA (Long Range)"];
		default:
			return region as unknown as RFRegion;
	}
}

export function rfRegionToRadioProtocolMode(
	region: RFRegion,
): RadioProtocolMode {
	switch (region) {
		case RFRegion.Japan:
		case RFRegion.Korea:
			return RadioProtocolMode.Classic3Channel;

		case RFRegion["USA (Long Range)"]:
		case RFRegion["Europe (Long Range)"]:
			return RadioProtocolMode.Classic2ChannelPlusLongRange;

		default:
			return RadioProtocolMode.Classic2Channel;
	}
	// End device configurations (two LR channels also exist, but they don't have a corresponding RF region)
}

export function getProtocolHeaderFormat(
	mode: RadioProtocolMode,
	channel: number,
): ProtocolHeaderFormat {
	if (mode === RadioProtocolMode.LongRange2Channel) {
		return ProtocolHeaderFormat.LongRange;
	}
	if (
		mode === RadioProtocolMode.Classic2ChannelPlusLongRange
		&& channel >= 3
	) {
		return ProtocolHeaderFormat.LongRange;
	}
	// The classic header format follows the channel configuration, which is a
	// property of the region. ITU-T G.9959 (01/2015), Table 7-3 defines
	// configuration 3 (Japan/Korea) with three R3 channels, whose frames use the
	// Figure 8-6 layout: "General MPDU format (Channel configuration 3)".
	// Configurations 1/2 use the Figure 8-5 layout on all their channels
	return mode === RadioProtocolMode.Classic3Channel
		? ProtocolHeaderFormat.Classic3Channel
		: ProtocolHeaderFormat.Classic2Channel;
}

/**
 * Determines the MPDU header format from the data rate a frame was sent with.
 * Prefer this over {@link getProtocolHeaderFormat} where the data rate is
 * known, since the channel numbers Long Range occupies depend on the channel
 * configuration.
 */
export function getProtocolHeaderFormatForDataRate(
	region: RFRegion,
	protocolDataRate: ProtocolDataRate,
): ProtocolHeaderFormat {
	if (protocolDataRate === ProtocolDataRate.LongRange_100k) {
		return ProtocolHeaderFormat.LongRange;
	}
	return rfRegionToRadioProtocolMode(region)
		=== RadioProtocolMode.Classic3Channel
		? ProtocolHeaderFormat.Classic3Channel
		: ProtocolHeaderFormat.Classic2Channel;
}
