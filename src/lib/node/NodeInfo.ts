import { parseCCId } from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { validatePayload } from "../util/misc";
import {
	BasicDeviceClasses,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "./DeviceClass";

export interface NodeInformationFrame {
	generic: GenericDeviceClass;
	specific: SpecificDeviceClass;
	supportedCCs: CommandClasses[];
}

interface ExtendedNodeInformationFrame extends NodeInformationFrame {
	// controlledCCs isn't actually included in a NIF, but this way we can reuse the parser code
	controlledCCs: CommandClasses[];
}

// This is sometimes used interchangeably with the NIF
export interface NodeUpdatePayload extends ExtendedNodeInformationFrame {
	nodeId: number;
	basic: BasicDeviceClasses;
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
		generic: GenericDeviceClass.get(nif[0]),
		specific: SpecificDeviceClass.get(nif[0], nif[1]),
		...parseCCList(nif.slice(2)),
	};
}

export function parseCCList(
	payload: Buffer,
): {
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

export function parseNodeInformationFrame(nif: Buffer): NodeInformationFrame {
	const { controlledCCs, ...ret } = internalParseNodeInformationFrame(nif);
	return ret;
}
