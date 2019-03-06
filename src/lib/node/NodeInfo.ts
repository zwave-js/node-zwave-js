import { CommandClasses } from "../commandclass/CommandClass";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";

export interface NodeInformationFrame {
	generic: GenericDeviceClass;
	specific: SpecificDeviceClass;
	supportedCCs: CommandClasses[];
	// controlledCCs isn't actually included in a NIF, but this way we can reuse the parser code
	controlledCCs: CommandClasses[];
}

export interface NodeUpdatePayload extends NodeInformationFrame {
	nodeId: number;
	basic: BasicDeviceClasses;
}

export function parseNodeUpdatePayload(nif: Buffer): NodeUpdatePayload {
	const ret = {
		nodeId: nif[0],
		// length is byte 1
		basic: nif[2],
	} as NodeUpdatePayload;
	Object.assign(ret, parseNodeInformationFrame(nif.slice(3)));
	return ret;
}

export function parseNodeInformationFrame(nif: Buffer): NodeInformationFrame {
	const ret = {
		generic: GenericDeviceClass.get(nif[0]),
		specific: SpecificDeviceClass.get(nif[0], nif[1]),
		supportedCCs: [] as CommandClasses[],
		controlledCCs: [] as CommandClasses[],
	};
	// split the CCs into supported/controlled
	// tslint:disable-next-line:variable-name
	const CCs = [...nif.slice(2)];
	let isAfterMark: boolean = false;
	for (const cc of CCs) {
		// CCs before the support/control mark are supported
		// CCs after the support/control mark are controlled
		if (cc === CommandClasses["Support/Control Mark"]) {
			isAfterMark = true;
			continue;
		}
		(isAfterMark
			? ret.controlledCCs
			: ret.supportedCCs
		).push(cc);
	}
	return ret;
}
