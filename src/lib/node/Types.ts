import type { Overwrite } from "alcalzone-shared/types";
import type { NotificationCCReport } from "../commandclass/NotificationCC";
import { MAX_NODES } from "../controller/NodeBitMask";
import type { ZWaveNode } from "./Node";
import type {
	MetadataUpdatedArgs,
	ValueAddedArgs,
	ValueID,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "./ValueDB";

/** The broadcast target node id */
export const NODE_ID_BROADCAST = 0xff;
/** The highest allowed node id */
export const NODE_ID_MAX = MAX_NODES;

export interface TranslatedValueID extends ValueID {
	commandClassName: string;
	propertyName?: string;
	propertyKeyName?: string;
}

export type ZWaveNodeValueAddedArgs = ValueAddedArgs & TranslatedValueID;
export type ZWaveNodeValueUpdatedArgs = ValueUpdatedArgs & TranslatedValueID;
export type ZWaveNodeValueRemovedArgs = ValueRemovedArgs & TranslatedValueID;
export type ZWaveNodeMetadataUpdatedArgs = MetadataUpdatedArgs &
	TranslatedValueID;
export type ZWaveNodeValueAddedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueAddedArgs,
) => void;
export type ZWaveNodeValueUpdatedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueUpdatedArgs,
) => void;
export type ZWaveNodeValueRemovedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueRemovedArgs,
) => void;
export type ZWaveNodeMetadataUpdatedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeMetadataUpdatedArgs,
) => void;
export type ZWaveNotificationCallback = (
	node: ZWaveNode,
	notificationLabel: string,
	parameters?: NotificationCCReport["eventParameters"],
) => void;
export type ZWaveInterviewFailedCallback = (
	node: ZWaveNode,
	additionalInfo: string,
) => void;

export interface ZWaveNodeValueEventCallbacks {
	"value added": ZWaveNodeValueAddedCallback;
	"value updated": ZWaveNodeValueUpdatedCallback;
	"value removed": ZWaveNodeValueRemovedCallback;
	"metadata updated": ZWaveNodeMetadataUpdatedCallback;
	notification: ZWaveNotificationCallback;
	"interview failed": ZWaveInterviewFailedCallback;
}

export type ZWaveNodeEventCallbacks = Overwrite<
	{
		[K in
			| "wake up"
			| "sleep"
			| "interview completed"
			| "ready"
			| "dead"
			| "alive"]: (node: ZWaveNode) => void;
	},
	ZWaveNodeValueEventCallbacks
>;

export type ZWaveNodeEvents = Extract<keyof ZWaveNodeEventCallbacks, string>;

// prettier-ignore
export enum InterviewStage {
	None,					// [✓] Query process hasn't started for this node
	ProtocolInfo,			// [✓] Retrieve protocol information
	NodeInfo,				// [✓] Retrieve info about supported and controlled command classes
	// SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security

	// ===== the stuff above should never change =====
	RestartFromCache,		// This marks the beginning of re-interviews on application startup.
	// 						   RestartFromCache and later stages will be serialized as "Complete" in the cache
	// 						   [✓] Ping each device upon restarting with cached config
	// ===== the stuff below changes frequently, so it has to be redone on every start =====
	CommandClasses,			// [ ] Retrieve info about all command classes. This includes static information that is requested once
	// 						       as well as dynamic information that is requested on every restart

	// TODO: Heal network

	OverwriteConfig,		// [ ] Load node configuration from a configuration file
	Neighbors,				// [✓] Retrieve node neighbor list
	Configuration,			// [ ] Retrieve configurable parameter information (only done on request)
	Complete,				// [✓] Query process is completed for this node
}

export enum NodeStatus {
	Unknown,
	Asleep,
	Awake,
	Dead,
}
