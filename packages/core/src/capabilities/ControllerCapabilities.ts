import { type NodeType } from "./NodeInfo";
import { type ZWaveApiVersion } from "./ZWaveApiVersion";
import { type UnknownZWaveChipType } from "./ZWaveChipTypes";

export enum ControllerCapabilityFlags {
	Secondary = 0x01, // Controller is a secondary
	OnOtherNetwork = 0x02, // Controller is using a home ID from another network
	SISPresent = 0x04, // There's a SUC id server (SIS) on the network
	WasRealPrimary = 0x08, // Before the SIS was added, the controller was the primary
	SUC = 0x10, // Controller is a static update controller (SUC)
	NoNodesIncluded = 0x20, // Not sure why some controllers with nodes included have this set
}

export interface ControllerCapabilities {
	isPrimary: boolean;
	isUsingHomeIdFromOtherNetwork: boolean;
	isSISPresent: boolean;
	wasRealPrimary: boolean;
	isSUC: boolean;
}

export interface SerialApiInitData {
	zwaveApiVersion: ZWaveApiVersion;
	isPrimary: boolean;
	nodeType: NodeType;
	supportsTimers: boolean;
	isSIS: boolean;
	nodeIds: number[];
	zwaveChipType?: string | UnknownZWaveChipType;
}
