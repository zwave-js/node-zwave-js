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

export function znifferProtocolDataRateToString(
	rate: ZnifferProtocolDataRate,
): string {
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
	return `Unknown (${num2hex(rate)})`;
}

export const protocolDataRateMask = 0b111;

export enum ProtocolType {
	"Z-Wave" = 0,
	"Z-Wave AV" = 1,
	"Z-Wave for IP" = 2,
}

export enum RouteKind {
	None = 0x00,
	/** Last Working Route */
	LWR = 0x01,
	/** Next to Last Working Route */
	NLWR = 0x02,
	/** Application-defined priority route */
	Application = 0x10,
}

export interface Route {
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}

export const EMPTY_ROUTE: Route = {
	repeaters: [],
	routeSpeed: ZWaveDataRate["9k6"],
};

export function isEmptyRoute(route: Route): boolean {
	return (
		route.repeaters.length === 0
		&& route.routeSpeed === ZWaveDataRate["9k6"]
	);
}

export enum LongRangeChannel {
	Unknown = 0x00, // Reserved
	A = 0x01,
	B = 0x02,
	// 0x03..0xFF are reserved and must not be used
}

export function isLongRangeNodeId(nodeId: number): boolean {
	return nodeId > 255;
}

export enum MPDUHeaderType {
	Singlecast = 0x1,
	Multicast = 0x2,
	Acknowledgement = 0x3,
	Routed = 0x8,
}

export enum BeamingInfo {
	None = 0b00,
	ShortContinuous = 0b01,
	LongContinuous = 0b10,
	Fragmented = 0b100,
}
