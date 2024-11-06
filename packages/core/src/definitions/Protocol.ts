import { num2hex } from "@zwave-js/shared/safe";

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
	"unknown" = 0,
	"2.0" = 1,
	"4.2x / 5.0x" = 2,
	"4.5x / 6.0x" = 3,
}
