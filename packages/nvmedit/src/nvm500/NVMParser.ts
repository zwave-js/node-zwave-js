import { type CommandClasses } from "@zwave-js/core/safe";
import { type Route } from "../lib/common/routeCache";
import { type SUCUpdateEntry } from "../lib/common/sucUpdateEntry";
import { type NVM500NodeInfo } from "../lib/nvm500/EntryParsers";
import { type NVM500Impl } from "../lib/nvm500/shared";

export interface NVM500JSON {
	// To distinguish between 700 and 500 series JSONs better
	format: 500;
	meta?: NVM500Meta;
	controller: NVM500JSONController;
	nodes: Record<number, NVM500JSONNode>;
}

export interface NVM500Meta {
	manufacturerID: number;
	firmwareID: number;
	productType: number;
	productID: number;
	library: NVM500Impl["library"];
}

export interface NVM500JSONController {
	protocolVersion: string;
	applicationVersion: string;
	ownHomeId: string;
	learnedHomeId?: string | null;
	nodeId: number;
	lastNodeId: number;
	staticControllerNodeId: number;
	sucLastIndex: number;
	controllerConfiguration: number;
	sucUpdateEntries: SUCUpdateEntry[];
	maxNodeId: number;
	reservedId: number;
	systemState: number;
	watchdogStarted: number;
	rfConfig: NVM500JSONControllerRFConfig;
	preferredRepeaters: number[];

	// These are only the insecure ones
	commandClasses: CommandClasses[];
	applicationData?: string | null;
}

export interface NVM500JSONControllerRFConfig {
	powerLevelNormal: number[];
	powerLevelLow: number[];
	powerMode: number;
	powerModeExtintEnable: number;
	powerModeWutTimeout: number;
}

export interface NVM500JSONNodeWithInfo extends NVM500NodeInfo {
	isVirtual: boolean;

	neighbors: number[];
	sucUpdateIndex: number;

	appRouteLock: boolean;
	routeSlaveSUC: boolean;
	sucPendingUpdate: boolean;
	pendingDiscovery: boolean;

	lwr?: Route | null;
	nlwr?: Route | null;
}

export interface NVM500JSONVirtualNode {
	isVirtual: true;
}

export type NVM500JSONNode = NVM500JSONNodeWithInfo | NVM500JSONVirtualNode;
