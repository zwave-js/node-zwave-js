import { sum } from "@zwave-js/shared/safe";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import { CommandClasses } from "./CommandClasses";

export interface NodeInformationFrame {
	generic: number;
	specific: number;
	supportedCCs: CommandClasses[];
}

export interface ExtendedNodeInformationFrame extends NodeInformationFrame {
	// controlledCCs isn't actually included in a NIF, but this way we can reuse the parser code
	controlledCCs: CommandClasses[];
}

// This is sometimes used interchangeably with the NIF
export interface NodeUpdatePayload extends ExtendedNodeInformationFrame {
	nodeId: number;
	basic: number;
}

export function parseNodeUpdatePayload(nif: Buffer): NodeUpdatePayload {
	return {
		nodeId: nif[0],
		// length is byte 1
		basic: nif[2],
		...internalParseNodeInformationFrame(nif.slice(3)),
	};
}

function internalParseNodeInformationFrame(
	nif: Buffer,
): ExtendedNodeInformationFrame {
	validatePayload(nif.length >= 2);
	return {
		generic: nif[0],
		specific: nif[1],
		...parseCCList(nif.slice(2)),
	};
}

export function isExtendedCCId(ccId: CommandClasses): boolean {
	return ccId >= 0xf1;
}

/**
 * Reads a CC id from the given buffer, returning the parsed CC id and the number of bytes read
 * @param offset The offset at which the CC id is located
 */
export function parseCCId(
	payload: Buffer,
	offset: number = 0,
): { ccId: CommandClasses; bytesRead: number } {
	const isExtended = isExtendedCCId(payload[offset]);
	validatePayload(payload.length >= offset + (isExtended ? 2 : 1));
	if (isExtended) {
		return { ccId: payload.readUInt16BE(offset), bytesRead: 2 };
	} else {
		return { ccId: payload.readUInt8(offset), bytesRead: 1 };
	}
}

/**
 * Writes the given CC id into the given buffer at the given location
 * @returns The number of bytes written
 */
export function encodeCCId(
	ccId: CommandClasses,
	payload: Buffer,
	offset: number = 0,
): number {
	if (isExtendedCCId(ccId)) {
		payload.writeUInt16BE(ccId, offset);
		return 2;
	} else {
		payload.writeUInt8(ccId, offset);
		return 1;
	}
}

export function parseCCList(payload: Buffer): {
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
} {
	const ret = {
		supportedCCs: [] as CommandClasses[],
		controlledCCs: [] as CommandClasses[],
	};
	let offset = 0;
	let isAfterMark = false;
	while (offset < payload.length) {
		// Read either the normal or extended ccId
		const { ccId: cc, bytesRead } = parseCCId(payload, offset);
		offset += bytesRead;
		// CCs before the support/control mark are supported
		// CCs after the support/control mark are controlled
		if (cc === CommandClasses["Support/Control Mark"]) {
			isAfterMark = true;
			continue;
		}
		(isAfterMark ? ret.controlledCCs : ret.supportedCCs).push(cc);
	}
	return ret;
}

export function encodeCCList(
	supportedCCs: readonly CommandClasses[],
	controlledCCs: readonly CommandClasses[],
): Buffer {
	const bufferLength =
		sum(supportedCCs.map((cc) => (isExtendedCCId(cc) ? 2 : 1))) +
		(controlledCCs.length > 0 ? 1 : 0) + // support/control mark
		sum(controlledCCs.map((cc) => (isExtendedCCId(cc) ? 2 : 1)));

	const ret = Buffer.allocUnsafe(bufferLength);
	let offset = 0;
	for (const cc of supportedCCs) {
		offset += encodeCCId(cc, ret, offset);
	}
	if (controlledCCs.length > 0) {
		ret[offset++] = CommandClasses["Support/Control Mark"];
		for (const cc of controlledCCs) {
			offset += encodeCCId(cc, ret, offset);
		}
	}

	return ret;
}

export function parseNodeInformationFrame(nif: Buffer): NodeInformationFrame {
	const { controlledCCs, ...ret } = internalParseNodeInformationFrame(nif);
	return ret;
}

export enum ProtocolVersion {
	"unknown" = 0,
	"2.0" = 1,
	"4.2x / 5.0x" = 2,
	"4.5x / 6.0x" = 3,
}

export type FLiRS = false | "250ms" | "1000ms";

export type DataRate = 9600 | 40000 | 100000;

export enum NodeType {
	Controller,
	/** @deprecated Use `NodeType["End Node"]` instead */
	"Routing End Node",
	"End Node" = 1,
}

export interface NodeProtocolInfo {
	/** Whether this node is always listening or not */
	isListening: boolean;
	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	isFrequentListening: FLiRS;
	/** Whether the node supports routing/forwarding messages. */
	isRouting: boolean;
	supportedDataRates: DataRate[];
	protocolVersion: ProtocolVersion;
	/** Whether this node supports additional CCs besides the mandatory minimum */
	optionalFunctionality: boolean;
	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	nodeType: NodeType;
	/** Whether this node supports (legacy) network security */
	supportsSecurity: boolean;
	/** Whether this node can issue wakeup beams to FLiRS nodes */
	supportsBeaming: boolean;
	/** Whether this node's device class has the specific part */
	hasSpecificDeviceClass: boolean;
}

export interface NodeProtocolInfoAndDeviceClass
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
	basicDeviceClass: number;
	genericDeviceClass: number;
	specificDeviceClass: number;
}

export function parseNodeProtocolInfo(
	buffer: Buffer,
	offset: number,
): NodeProtocolInfo {
	if (buffer.length < offset + 3) {
		throw new ZWaveError(
			"Cannot parse protocol info, the buffer is too short!",
			ZWaveErrorCodes.PacketFormat_Truncated,
		);
	}

	const isListening = !!(buffer[offset] & 0b10_000_000);
	const isRouting = !!(buffer[offset] & 0b01_000_000);

	const supportedDataRates: DataRate[] = [];
	const maxSpeed = buffer[offset] & 0b00_011_000;
	const speedExtension = buffer[offset + 2] & 0b111;
	if (maxSpeed & 0b00_010_000) {
		supportedDataRates.push(40000);
	}
	if (maxSpeed & 0b00_001_000) {
		supportedDataRates.push(9600);
	}
	if (speedExtension & 0b001) {
		supportedDataRates.push(100000);
	}
	if (supportedDataRates.length === 0) {
		supportedDataRates.push(9600);
	}

	const protocolVersion = buffer[offset] & 0b111;

	const capability = buffer[offset + 1];
	const optionalFunctionality = !!(capability & 0b1000_0000);
	let isFrequentListening: FLiRS;
	switch (capability & 0b0110_0000) {
		case 0b0100_0000:
			isFrequentListening = "1000ms";
			break;
		case 0b0010_0000:
			isFrequentListening = "250ms";
			break;
		default:
			isFrequentListening = false;
	}
	const supportsBeaming = !!(capability & 0b0001_0000);

	let nodeType: NodeType;
	switch (capability & 0b1010) {
		case 0b1000:
			nodeType = NodeType["End Node"];
			break;
		case 0b0010:
		default:
			nodeType = NodeType.Controller;
			break;
	}

	const hasSpecificDeviceClass = !!(capability & 0b100);
	const supportsSecurity = !!(capability & 0b1);

	return {
		isListening,
		isFrequentListening,
		isRouting,
		supportedDataRates,
		protocolVersion,
		optionalFunctionality,
		nodeType,
		supportsSecurity,
		supportsBeaming,
		hasSpecificDeviceClass,
	};
}

export function encodeNodeProtocolInfo(info: NodeProtocolInfo): Buffer {
	const ret = Buffer.alloc(3, 0);
	// Byte 0 and 2
	if (info.isListening) ret[0] |= 0b10_000_000;
	if (info.isRouting) ret[0] |= 0b01_000_000;
	if (info.supportedDataRates.includes(40000)) ret[0] |= 0b00_010_000;
	if (info.supportedDataRates.includes(9600)) ret[0] |= 0b00_001_000;
	if (info.supportedDataRates.includes(100000)) ret[2] |= 0b001;
	ret[0] |= info.protocolVersion & 0b111;

	// Byte 1
	if (info.optionalFunctionality) ret[1] |= 0b1000_0000;
	if (info.isFrequentListening === "1000ms") ret[1] |= 0b0100_0000;
	else if (info.isFrequentListening === "250ms") ret[1] |= 0b0010_0000;

	if (info.supportsBeaming) ret[1] |= 0b0001_0000;
	if (info.supportsSecurity) ret[1] |= 0b1;
	if (info.nodeType === NodeType["End Node"]) ret[1] |= 0b1000;
	else ret[1] |= 0b0010; // Controller

	if (info.hasSpecificDeviceClass) ret[1] |= 0b100;

	return ret;
}
