import { CommandClasses } from "../commandclass/CommandClass";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";

export interface EndpointInformation {
	generic: GenericDeviceClass;
	specific: SpecificDeviceClass;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[]; // This does not actually exist for endpoints, but the code is nicer this way
}

export interface NodeInformation extends EndpointInformation{
	nodeId: number;
	basic: BasicDeviceClasses;
}

export function parseNodeInformation(nif: Buffer): NodeInformation {
	const ret = {
		nodeId: nif[0],
		// length is byte 1
		basic: nif[2],
	} as NodeInformation;
	Object.assign(ret, parseEndpointInformation(nif.slice(3)));
	return ret;
}

export function parseEndpointInformation(eif: Buffer): EndpointInformation {
	const ret = {
		generic: GenericDeviceClass.get(eif[0]),
		specific: SpecificDeviceClass.get(eif[0], eif[1]),
		supportedCCs: [] as CommandClasses[],
		controlledCCs: [] as CommandClasses[],
	};
	// split the CCs into supported/controlled
	// tslint:disable-next-line:variable-name
	const CCs = [...eif.slice(2)];
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
