import type { CommandClass } from "@zwave-js/cc";
import {
	AckLongRangeMPDU,
	AckZWaveMPDU,
	ExplorerZWaveMPDU,
	InclusionRequestExplorerZWaveMPDU,
	LongRangeMPDU,
	MPDU,
	type MPDULogContext,
	type MPDUParsingContext,
	type MessageOrCCLogEntry,
	type MessageRecord,
	MulticastZWaveMPDU,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	NormalExplorerZWaveMPDU,
	ProtocolDataRate,
	Protocols,
	type RSSI,
	RoutedZWaveMPDU,
	SearchResultExplorerZWaveMPDU,
	SinglecastLongRangeMPDU,
	SinglecastZWaveMPDU,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveMPDU,
	type ZnifferProtocolDataRate,
	type ZnifferRegion,
	longRangeBeamPowerIndexToDBm,
	padNodeId,
	protocolDataRateToString,
	rssiToString,
	validatePayload,
	znifferProtocolDataRateToProtocolDataRate,
	znifferRegionToRFRegion,
} from "@zwave-js/core";
import {
	type ZnifferDataMessage,
	type ZnifferFrameInfo,
	ZnifferFrameType,
} from "@zwave-js/serial";
import {
	type AllOrNone,
	type Bytes,
	type BytesView,
	buffer2hex,
} from "@zwave-js/shared";

import { LongRangeFrameType, ZWaveFrameType } from "./_Types.js";

/** MPDULogContext extends MPDUParsingContext, so one context serves both purposes */
export function znifferFrameInfoToMPDUParsingContext(
	frameInfo: ZnifferFrameInfo,
): MPDUParsingContext {
	return {
		channel: frameInfo.channel,
		region: znifferRegionToRFRegion(frameInfo.region),
		protocolDataRate: znifferProtocolDataRateToProtocolDataRate(
			frameInfo.protocolDataRate,
		),
	};
}

export function znifferFrameInfoToMPDULogContext(
	frameInfo: ZnifferFrameInfo,
): MPDULogContext {
	return {
		...znifferFrameInfoToMPDUParsingContext(frameInfo),
		rssi: frameInfo.rssi,
		rssiRaw: frameInfo.rssiRaw,
	};
}

export function parseMPDU(
	frame: ZnifferDataMessage,
	frameInfo: ZnifferFrameInfo,
): ZWaveMPDU | LongRangeMPDU {
	return MPDU.parse(
		frame.payload,
		znifferFrameInfoToMPDUParsingContext(frameInfo),
	);
}

export function parseBeamFrame(
	frame: ZnifferDataMessage,
	frameInfo: ZnifferFrameInfo,
): ZWaveBeamStart | LongRangeBeamStart | BeamStop {
	if (frame.frameType === ZnifferFrameType.BeamStop) {
		return new BeamStop();
	}

	// The channels Long Range occupies depend on the channel configuration,
	// e.g. the end device configurations put Long Range on channels 0 and 1
	const ctx = znifferFrameInfoToMPDUParsingContext(frameInfo);
	if (ctx.protocolDataRate === ProtocolDataRate.LongRange_100k) {
		return LongRangeBeamStart.parse(frame.payload, ctx);
	}
	if (
		ctx.protocolDataRate === ProtocolDataRate.ZWave_9k6
		|| ctx.protocolDataRate === ProtocolDataRate.ZWave_40k
		|| ctx.protocolDataRate === ProtocolDataRate.ZWave_100k
	) {
		return ZWaveBeamStart.parse(frame.payload, ctx);
	}
	validatePayload.fail(
		`Unsupported protocol/data rate ${protocolDataRateToString(
			ctx.protocolDataRate,
		)}. Beam payload: ${buffer2hex(frame.payload)}`,
	);
}

export interface ZWaveBeamStartOptions {
	destinationNodeId: number;
	homeIdHash?: number;
}

/** The Zniffer signals the start of a beam with a separate frame */
export class ZWaveBeamStart {
	public constructor(options: ZWaveBeamStartOptions) {
		this.destinationNodeId = options.destinationNodeId;
		this.homeIdHash = options.homeIdHash;
	}

	public static parse(data: Bytes, ctx: MPDUParsingContext): ZWaveBeamStart {
		if (ctx.channel > 2) {
			validatePayload.fail(
				`Channel ${ctx.channel} (ZWLR) must be parsed as a LongRangeBeamStart!`,
			);
		}

		const destinationNodeId = data[1];
		let homeIdHash: number | undefined;
		// The home ID hash is optional in G.9959. The Zniffer output
		// indicates its presence with a 0x01 marker byte
		if (data[2] === 0x01) {
			homeIdHash = data[3];
		}

		return new ZWaveBeamStart({
			destinationNodeId,
			homeIdHash,
		});
	}

	public readonly homeIdHash?: number;
	public readonly destinationNodeId: number;

	public toLogEntry(ctx: MPDULogContext): MessageOrCCLogEntry {
		const tags = [`BEAM » ${padNodeId(this.destinationNodeId)}`];

		const message: MessageRecord = {
			channel: ctx.channel,
			"protocol/data rate": protocolDataRateToString(
				ctx.protocolDataRate,
			),
		};
		if (ctx.rssi != undefined) {
			message.RSSI = rssiToString(ctx.rssi);
		} else if (ctx.rssiRaw != undefined) {
			message.RSSI = ctx.rssiRaw.toString();
		}
		return {
			tags,
			message,
		};
	}
}

export interface LongRangeBeamStartOptions {
	txPower: number;
	destinationNodeId: number;
	homeIdHash: number;
}

/** The Zniffer signals the start of a Long Range beam with a separate frame */
export class LongRangeBeamStart {
	public constructor(options: LongRangeBeamStartOptions) {
		this.txPower = options.txPower;
		this.destinationNodeId = options.destinationNodeId;
		this.homeIdHash = options.homeIdHash;
	}

	public static parse(
		data: Bytes,
		ctx: MPDUParsingContext,
	): LongRangeBeamStart {
		if (ctx.channel <= 2) {
			validatePayload.fail(
				`Channel ${ctx.channel} (Mesh) must be parsed as a ZWaveBeamStart!`,
			);
		}

		validatePayload(data.length >= 4);
		const txPower = longRangeBeamPowerIndexToDBm(data[1] >>> 4);
		const destinationNodeId = data.readUInt16BE(1) & 0x0fff;
		// Unlike classic beams, LR beams always include the home ID hash
		const homeIdHash = data[3];

		return new LongRangeBeamStart({
			txPower,
			destinationNodeId,
			homeIdHash,
		});
	}

	public readonly homeIdHash: number;
	public readonly destinationNodeId: number;
	public readonly txPower: number;

	public toLogEntry(ctx: MPDULogContext): MessageOrCCLogEntry {
		const tags = [`BEAM » ${padNodeId(this.destinationNodeId)}`];

		const message: MessageRecord = {
			channel: ctx.channel,
			"protocol/data rate": protocolDataRateToString(
				ctx.protocolDataRate,
			),
			"TX power": `${this.txPower} dBm`,
		};
		if (ctx.rssi != undefined) {
			message.RSSI = rssiToString(ctx.rssi);
		} else if (ctx.rssiRaw != undefined) {
			message.RSSI = ctx.rssiRaw.toString();
		}
		return {
			tags,
			message,
		};
	}
}

/** The Zniffer signals the end of an ongoing beam with a separate frame */
export class BeamStop {
	public toLogEntry(ctx: MPDULogContext): MessageOrCCLogEntry {
		const tags = ["BEAM STOP"];

		const message: MessageRecord = {
			channel: ctx.channel,
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
	{
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
			| // Singlecast frame, either routed or not
			  ({
					type: ZWaveFrameType.Singlecast;
					destinationNodeId: number;
					ackRequested: boolean;
					payload: BytesView | CommandClass;
			  }
					// Only present in routed frames:
					& AllOrNone<
						{
							direction: "outbound" | "inbound";
							hop: number;
							repeaters: number[];
							repeaterRSSI?: RSSI[];
						}
							// Different kinds of routed frames:
							// Normal frame
							& (
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
					>)
			// Broadcast frame. This is technically a singlecast frame,
			// but the destination node ID is always 255 and it is not routed
			| {
					type: ZWaveFrameType.Broadcast;
					destinationNodeId: typeof NODE_ID_BROADCAST;
					ackRequested: boolean;
					payload: BytesView | CommandClass;
			  }
			| {
					// Multicast frame, not routed
					type: ZWaveFrameType.Multicast;
					destinationNodeIds: number[];
					payload: BytesView | CommandClass;
			  }
			| {
					// Ack frame, not routed
					type: ZWaveFrameType.AckDirect;
					destinationNodeId: number;
			  }
			// Different kind of explorer frames
			| ((
					| {
							type: ZWaveFrameType.ExplorerNormal;
							payload: BytesView | CommandClass;
					  }
					| {
							type: ZWaveFrameType.ExplorerSearchResult;
							searchingNodeId: number;
							frameHandle: number;
							resultTTL: number;
							resultRepeaters: readonly number[];
					  }
					| {
							type: ZWaveFrameType.ExplorerInclusionRequest;
							networkHomeId: number;
							payload: BytesView | CommandClass;
					  }
			  )
					// Common fields for all explorer frames
					& {
						destinationNodeId: number;
						ackRequested: boolean;
						direction: "outbound" | "inbound";
						repeaters: number[];
						ttl: number;
					})
		);

export type LongRangeFrame =
	// Common fields for all Long Range frames
	{
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
					payload: BytesView | CommandClass;
			  }
			| {
					// Broadcast frame. This is technically a singlecast frame,
					// but the destination node ID is always 4095
					type: LongRangeFrameType.Broadcast;
					destinationNodeId: typeof NODE_ID_BROADCAST_LR;
					ackRequested: boolean;
					payload: BytesView | CommandClass;
			  }
			| {
					// Acknowledgement frame
					type: LongRangeFrameType.Ack;
					incomingRSSI: RSSI;
					payload: BytesView;
			  }
		);

export type BeamFrame =
	// Common fields for all Beam frames
	{
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

export type Frame = ZWaveFrame | LongRangeFrame | BeamFrame;

export type CorruptedFrame = {
	channel: number;
	region: number;
	rssiRaw: number;
	rssi?: RSSI;

	protocolDataRate: ZnifferProtocolDataRate;

	payload: BytesView;
};

export function mpduToFrame(
	mpdu: MPDU,
	frameInfo: ZnifferFrameInfo,
	payloadCC?: CommandClass,
): Frame {
	if (mpdu instanceof ZWaveMPDU) {
		return mpduToZWaveFrame(mpdu, frameInfo, payloadCC);
	} else if (mpdu instanceof LongRangeMPDU) {
		return mpduToLongRangeFrame(mpdu, frameInfo, payloadCC);
	}

	throw new ZWaveError(
		`mpduToFrame not supported for ${mpdu.constructor.name}`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function mpduToZWaveFrame(
	mpdu: ZWaveMPDU,
	frameInfo: ZnifferFrameInfo,
	payloadCC?: CommandClass,
): ZWaveFrame {
	const retBase = {
		protocol: Protocols.ZWave as const,

		channel: frameInfo.channel,
		region: frameInfo.region,
		rssiRaw: frameInfo.rssiRaw,
		rssi: frameInfo.rssi,

		protocolDataRate: frameInfo.protocolDataRate,
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
	frameInfo: ZnifferFrameInfo,
	payloadCC?: CommandClass,
): LongRangeFrame {
	const retBase = {
		protocol: Protocols.ZWaveLongRange as const,

		channel: frameInfo.channel,
		region: frameInfo.region,
		protocolDataRate: frameInfo.protocolDataRate,

		rssiRaw: frameInfo.rssiRaw,
		rssi: frameInfo.rssi,
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
	frameInfo: ZnifferFrameInfo,
): Frame {
	const retBase = {
		channel: frameInfo.channel,
		region: frameInfo.region,
		rssiRaw: frameInfo.rssiRaw,
		rssi: frameInfo.rssi,

		protocolDataRate: frameInfo.protocolDataRate,
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
		const isLR = frameInfo.channel === 4;
		if (isLR) {
			return {
				protocol: Protocols.ZWaveLongRange,
				type: LongRangeFrameType.BeamStop,
				channel: frameInfo.channel,
			};
		} else {
			return {
				protocol: Protocols.ZWave,
				type: ZWaveFrameType.BeamStop,
				channel: frameInfo.channel,
			};
		}
	}
}

export function znifferDataMessageToCorruptedFrame(
	msg: ZnifferDataMessage,
	frameInfo: ZnifferFrameInfo,
): CorruptedFrame {
	if (msg.checksumOK) {
		throw new ZWaveError(
			`znifferDataMessageToCorruptedFrame expects the checksum to be incorrect`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	return {
		channel: frameInfo.channel,
		region: frameInfo.region,
		rssiRaw: frameInfo.rssiRaw,
		rssi: frameInfo.rssi,
		protocolDataRate: frameInfo.protocolDataRate,
		payload: msg.payload,
	};
}
