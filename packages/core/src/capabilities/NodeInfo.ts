import { sum } from "@zwave-js/shared/safe";
import { NodeIDType } from "../consts";
import { validatePayload } from "../util/misc";
import { CommandClasses } from "./CommandClasses";

export interface ApplicationNodeInformation {
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
}

export function parseApplicationNodeInformation(
	nif: Buffer,
): ApplicationNodeInformation {
	validatePayload(nif.length >= 2);
	return {
		genericDeviceClass: nif[0],
		specificDeviceClass: nif[1],
		supportedCCs: parseCCList(nif.subarray(2)).supportedCCs,
	};
}

export function encodeApplicationNodeInformation(
	nif: ApplicationNodeInformation,
): Buffer {
	const ccList = encodeCCList(nif.supportedCCs, []);
	return Buffer.concat([
		Buffer.from([nif.genericDeviceClass, nif.specificDeviceClass]),
		ccList,
	]);
}

export interface NodeUpdatePayload extends ApplicationNodeInformation {
	nodeId: number;
	basicDeviceClass: number;
}

export function parseNodeUpdatePayload(
	nif: Buffer,
	nodeIdType: NodeIDType = NodeIDType.Short,
): NodeUpdatePayload {
	let offset = 0;
	const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
		nif,
		nodeIdType,
		offset,
	);
	offset += nodeIdBytes;
	const remainingLength = nif[offset++];
	validatePayload(nif.length >= offset + remainingLength);
	return {
		nodeId,
		basicDeviceClass: nif[offset],
		...parseApplicationNodeInformation(
			nif.subarray(offset + 1, offset + remainingLength),
		),
	};
}

export function encodeNodeUpdatePayload(
	nif: NodeUpdatePayload,
	nodeIdType: NodeIDType = NodeIDType.Short,
): Buffer {
	const ccList = encodeCCList(nif.supportedCCs, []);
	const nodeId = encodeNodeID(nif.nodeId, nodeIdType);
	return Buffer.concat([
		nodeId,
		Buffer.from([
			3 + ccList.length,
			nif.basicDeviceClass,
			nif.genericDeviceClass,
			nif.specificDeviceClass,
		]),
		ccList,
	]);
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

export function parseCCList(payload: Buffer, isLongRange: boolean = false): {
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
} {
	const ret = {
		supportedCCs: [] as CommandClasses[],
		controlledCCs: [] as CommandClasses[],
	};
	let offset = 0;
	let isAfterMark = false;
	let listEnd = payload.length;
	if (isLongRange) {
		validatePayload(payload.length >= offset + 1);
		const listLength = payload[offset++];
		listEnd = offset + listLength;
		validatePayload(payload.length >= listEnd);
	}
	while (offset < listEnd) {
		// Read either the normal or extended ccId
		const { ccId: cc, bytesRead } = parseCCId(payload, offset);
		offset += bytesRead;
		// CCs before the support/control mark are supported
		// CCs after the support/control mark are controlled
		// BUGBUG: does the "mark" and support/control convention apply to isLongRange?
		if (cc === CommandClasses["Support/Control Mark"]) {
			isAfterMark = true;
			continue;
		}
		(isAfterMark ? ret.controlledCCs : ret.supportedCCs).push(cc);
	}
	// BUGBUG: isLongRange prohibits CC from 0x00..0x20 from being advertised here, as does 4.3.2.1.1.17
	// BUGBUG: how do >0xFF CC get advertised? I don't immediately see a mechanism for indicating a multi-byte CC
	return ret;
}

export function encodeCCList(
	supportedCCs: readonly CommandClasses[],
	controlledCCs: readonly CommandClasses[],
	isLongRange: boolean = false,
): Buffer {
	const bufferLength = (isLongRange ? 1 : 0)
		+ sum(supportedCCs.map((cc) => (isExtendedCCId(cc) ? 2 : 1)))
		+ (controlledCCs.length > 0 ? 1 : 0) // support/control mark
		+ sum(controlledCCs.map((cc) => (isExtendedCCId(cc) ? 2 : 1)));

	const ret = Buffer.allocUnsafe(bufferLength);
	let offset = 0;
	if (isLongRange) {
		// BUGBUG: validate bufferLength - 1 is <= 0xFF
		ret[offset++] = bufferLength - 1;
	}
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
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass">
{
	basicDeviceClass: number;
	genericDeviceClass: number;
	specificDeviceClass: number;
}

export type NodeInformationFrame =
	& NodeProtocolInfoAndDeviceClass
	& ApplicationNodeInformation;

export function parseNodeProtocolInfo(
	buffer: Buffer,
	offset: number,
	isLongRange: boolean = false,
): NodeProtocolInfo {
	validatePayload(buffer.length >= offset + 3);

	const isListening = !!(buffer[offset] & 0b10_000_000);
	let isRouting = false;
	if (!isLongRange) {
		isRouting = !!(buffer[offset] & 0b01_000_000);
	}

	const supportedDataRates: DataRate[] = [];
	if (isLongRange) {
		const speedExtension = buffer[offset + 2] & 0b111;
		if (speedExtension & 0b010) {
			supportedDataRates.push(100000);
		}
	} else {
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
	}

	// BUGBUG: what's the correct protocol version here for long range?
	const protocolVersion = isLongRange
		? 0
		: buffer[offset] & 0b111;

	const capability = buffer[offset + 1];
	const optionalFunctionality = (!isLongRange)
		&& !!(capability & 0b1000_0000);
	let isFrequentListening: FLiRS;
	switch (capability & (isLongRange ? 0b0100_0000 : 0b0110_0000)) {
		case 0b0100_0000:
			isFrequentListening = "1000ms";
			break;
		case 0b0010_0000:
			isFrequentListening = "250ms";
			break;
		default:
			isFrequentListening = false;
	}
	const supportsBeaming = (!isLongRange) && !!(capability & 0b0001_0000);

	let nodeType: NodeType;

	switch (
		isLongRange
			? (0b1_0000_0000 | (capability & 0b0010))
			: (capability && 0b1010)
	) {
		case 0b0_0000_1000:
		case 0b1_0000_0000:
			nodeType = NodeType["End Node"];
			break;
		case 0b0_0000_0010:
		case 0b1_0000_0010:
		default:
			// BUGBUG: is Controller correct for default && isLongRange?
			nodeType = NodeType.Controller;
			break;
	}

	const hasSpecificDeviceClass = isLongRange || !!(capability & 0b100);
	// BUGBUG: can we assume security is true?
	const supportsSecurity = isLongRange || !!(capability & 0b1);

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

export function encodeNodeProtocolInfo(
	info: NodeProtocolInfo,
	isLongRange: boolean = false,
): Buffer {
	const ret = Buffer.alloc(3, 0);
	// Byte 0 and 2
	if (info.isListening) ret[0] |= 0b10_000_000;
	if (isLongRange) {
		if (info.supportedDataRates.includes(100000)) ret[2] |= 0b010;
	} else {
		if (info.isRouting) ret[0] |= 0b01_000_000;
		if (info.supportedDataRates.includes(40000)) ret[0] |= 0b00_010_000;
		if (info.supportedDataRates.includes(9600)) ret[0] |= 0b00_001_000;
		if (info.supportedDataRates.includes(100000)) ret[2] |= 0b001;
		ret[0] |= info.protocolVersion & 0b111;
	}

	// Byte 1
	if (!isLongRange) {
		if (info.optionalFunctionality) ret[1] |= 0b1000_0000;
	}
	if (info.isFrequentListening === "1000ms") ret[1] |= 0b0100_0000;
	else if (!isLongRange && info.isFrequentListening === "250ms") {
		ret[1] |= 0b0010_0000;
	}

	if (!isLongRange) {
		if (info.supportsBeaming) ret[1] |= 0b0001_0000;
		if (info.supportsSecurity) ret[1] |= 0b1;
	}

	if (info.nodeType === NodeType["End Node"]) {
		if (!isLongRange) ret[1] |= 0b1000;
	} else ret[1] |= 0b0010; // Controller

	if (!isLongRange && info.hasSpecificDeviceClass) ret[1] |= 0b100;

	return ret;
}

export function parseNodeProtocolInfoAndDeviceClass(
	buffer: Buffer,
	isLongRange: boolean = false,
): {
	info: NodeProtocolInfoAndDeviceClass;
	bytesRead: number;
} {
	validatePayload(buffer.length >= 5);
	const protocolInfo = parseNodeProtocolInfo(buffer, 0, isLongRange);
	let offset = 3;
	// BUGBUG: 4.3.2.1.1.14 says this is omitted if the Controller field is set to 0, yet we always parse it?
	let basic = 0x100; // BUGBUG: is there an assume one here, or...?
	if (!isLongRange) {
		basic = buffer[offset++];
	}
	const generic = buffer[offset++];
	let specific = 0;
	if (protocolInfo.hasSpecificDeviceClass) {
		validatePayload(buffer.length >= offset + 1);
		specific = buffer[offset++];
	}
	return {
		info: {
			...protocolInfo,
			basicDeviceClass: basic,
			genericDeviceClass: generic,
			specificDeviceClass: specific,
		},
		bytesRead: offset,
	};
}

export function encodeNodeProtocolInfoAndDeviceClass(
	info: NodeProtocolInfoAndDeviceClass,
	isLongRange: boolean = false,
): Buffer {
	const deviceClasses = isLongRange
		? Buffer.from([
			info.genericDeviceClass,
			info.specificDeviceClass,
		])
		: Buffer.from([
			info.basicDeviceClass,
			info.genericDeviceClass,
			info.specificDeviceClass,
		]);
	return Buffer.concat([
		encodeNodeProtocolInfo({ ...info, hasSpecificDeviceClass: true }),
		deviceClasses,
	]);
}

export function parseNodeInformationFrame(
	buffer: Buffer,
	isLongRange: boolean = false,
): NodeInformationFrame {
	const { info, bytesRead: offset } = parseNodeProtocolInfoAndDeviceClass(
		buffer,
		isLongRange,
	);
	const supportedCCs =
		parseCCList(buffer.subarray(offset), isLongRange).supportedCCs;

	return {
		...info,
		supportedCCs,
	};
}

export function encodeNodeInformationFrame(
	info: NodeInformationFrame,
	isLongRange: boolean = false,
): Buffer {
	return Buffer.concat([
		encodeNodeProtocolInfoAndDeviceClass(info, isLongRange),
		encodeCCList(info.supportedCCs, [], isLongRange),
	]);
}

export function parseNodeID(
	buffer: Buffer,
	type: NodeIDType = NodeIDType.Short,
	offset: number = 0,
): {
	nodeId: number;
	bytesRead: number;
} {
	validatePayload(buffer.length >= offset + type);
	const nodeId = buffer.readUIntBE(offset, type);
	return { nodeId, bytesRead: type };
}

export function encodeNodeID(
	nodeId: number,
	type: NodeIDType = NodeIDType.Short,
): Buffer {
	const ret = Buffer.allocUnsafe(type);
	ret.writeUIntBE(nodeId, 0, type);
	return ret;
}
