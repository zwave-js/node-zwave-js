import { type NodeType } from "./NodeInfo.js";
import { type ZWaveApiVersion } from "./ZWaveApiVersion.js";
import { type UnknownZWaveChipType } from "./ZWaveChipTypes.js";

// These flags are a mess and sometimes have a different meaning than their name implies
export enum ControllerCapabilityFlags {
	// The controller is a secondary controller and no SIS is present on the network,
	// so it can not include or exclude other nodes.
	// Fully redundant with the SISPresent flag: Secondary == !SISPresent (?)
	Secondary = 0x01,
	// The controller is a secondary controller
	// in a network it did not start (?) TODO: confirm
	OnOtherNetwork = 0x02,
	// There's a Node ID server (SIS) on the network
	SISPresent = 0x04,
	// This is the primary controller that started this network
	// TODO: Figure out if this changes on transferring the primary role
	WasRealPrimary = 0x08,
	// This controller is the SUC
	SUC = 0x10,
	// This controller is the primary and hasn't included any other nodes yet
	NoNodesIncluded = 0x20,
}

export enum ControllerRole {
	/** The controller is the primary controller */
	Primary,
	/** The controller is a secondary controller that cannot perform any network functions */
	Secondary,
	/**
	 * The controller is a secondary controller.
	 * Either itself or the primary is the SIS, so it can perform network functions
	 */
	Inclusion,
}

export interface ControllerCapabilities {
	isSecondary: boolean;
	isUsingHomeIdFromOtherNetwork: boolean;
	isSISPresent: boolean;
	wasRealPrimary: boolean;
	isSUC: boolean;
	noNodesIncluded: boolean;
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
