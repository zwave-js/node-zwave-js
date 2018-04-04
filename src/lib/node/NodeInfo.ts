import { CommandClasses } from "../commandclass/CommandClass";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";

export interface NodeInformation {
	nodeId: number;
	basic: BasicDeviceClasses;
	generic: GenericDeviceClass;
	specific: SpecificDeviceClass;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

export function parseNodeInformation(nif: Buffer): NodeInformation {
	const ret = {
		nodeId: nif[0],
		// length is byte 1
		basic: nif[2],
		generic: GenericDeviceClass.get(nif[3]),
		specific: SpecificDeviceClass.get(nif[3], nif[4]),
		supportedCCs: [] as CommandClasses[],
		controlledCCs: [] as CommandClasses[],
	};
	// split the CCs into supported/controlled
	// tslint:disable-next-line:variable-name
	const CCs = [...nif.slice(5)];
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
