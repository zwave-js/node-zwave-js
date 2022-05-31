import type { CommandClasses } from "../capabilities/CommandClasses";
import type { MulticastDestination } from "../consts";
import type { VirtualNodeBase, ZWaveNodeBase } from "./ZWaveNodeBase";

export interface ZWaveEndpointBase {
	readonly nodeId: number;
	readonly index: number;
	readonly virtual: false;
	getCCVersion(cc: CommandClasses): number;
	supportsCC(cc: CommandClasses): boolean;
	controlsCC(cc: CommandClasses): boolean;
	isCCSecure(cc: CommandClasses): boolean;
	getNodeUnsafe(): ZWaveNodeBase | undefined;
}

export interface VirtualEndpointBase {
	readonly nodeId: number | MulticastDestination;
	readonly node: VirtualNodeBase;
	readonly index: number;
	readonly virtual: true;
	getCCVersion(cc: CommandClasses): number;
	supportsCC(cc: CommandClasses): boolean;
}
