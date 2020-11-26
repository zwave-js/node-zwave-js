import type {
	MetadataUpdatedArgs,
	ValueAddedArgs,
	ValueID,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "@zwave-js/core";
import type { FirmwareUpdateStatus } from "../commandclass";
import type { NotificationCCReport } from "../commandclass/NotificationCC";
import type { ZWaveNode } from "./Node";

export interface TranslatedValueID extends ValueID {
	commandClassName: string;
	propertyName?: string;
	propertyKeyName?: string;
}

export type NodeInterviewFailedEventArgs = {
	errorMessage: string;
	isFinal: boolean;
} & (
	| {
			attempt: number;
			maxAttempts: number;
	  }
	// eslint-disable-next-line @typescript-eslint/ban-types
	| {}
);

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
	args: NodeInterviewFailedEventArgs,
) => void;
export type ZWaveNodeFirmwareUpdateProgressCallback = (
	node: ZWaveNode,
	sentFragments: number,
	totalFragments: number,
) => void;
export type ZWaveNodeFirmwareUpdateFinishedCallback = (
	node: ZWaveNode,
	status: FirmwareUpdateStatus,
	waitTime?: number,
) => void;
export type ZWaveNodeStatusChangeCallback = (
	node: ZWaveNode,
	oldStatus: NodeStatus,
) => void;

export interface ZWaveNodeValueEventCallbacks {
	"value added": ZWaveNodeValueAddedCallback;
	"value updated": ZWaveNodeValueUpdatedCallback;
	"value removed": ZWaveNodeValueRemovedCallback;
	"metadata updated": ZWaveNodeMetadataUpdatedCallback;
}

export interface ZWaveNodeEventCallbacks extends ZWaveNodeValueEventCallbacks {
	notification: ZWaveNotificationCallback;
	"interview failed": ZWaveInterviewFailedCallback;
	"firmware update progress": ZWaveNodeFirmwareUpdateProgressCallback;
	"firmware update finished": ZWaveNodeFirmwareUpdateFinishedCallback;
	"wake up": ZWaveNodeStatusChangeCallback;
	sleep: ZWaveNodeStatusChangeCallback;
	dead: ZWaveNodeStatusChangeCallback;
	alive: ZWaveNodeStatusChangeCallback;
	"interview completed": (node: ZWaveNode) => void;
	ready: (node: ZWaveNode) => void;
}

export type ZWaveNodeEvents = Extract<keyof ZWaveNodeEventCallbacks, string>;

// prettier-ignore
export enum InterviewStage {
	/** The interview process hasn't started for this node */
	None,
	/** The node's protocol information has been queried from the controller */
	ProtocolInfo,
	/** The node has been queried for supported and controlled command classes */
	NodeInfo,

	// ===== the stuff above should never change =====

	/**
	 * This marks the beginning of re-interviews on application startup.
	 * RestartFromCache and later stages will be serialized as "Complete" in the cache
	 */
	RestartFromCache,

	// ===== the stuff below changes frequently, so it has to be redone on every start =====

	/**
	 * Information for all command classes has been queried.
	 * This includes static information that is requested once as well as dynamic
	 * information that is requested on every restart.
	 */
	CommandClasses,

	// TODO: Heal network on startup

	/**
	 * Device information for the node has been loaded from a config file.
	 * If defined, some of the reported information will be overwritten based on the
	 * config file contents.
	 */
	OverwriteConfig,

	/** The node has been queried for its current neighbor list */
	Neighbors,

	/** The interview process has finished */
	Complete,
}

export enum NodeStatus {
	Unknown,
	Asleep,
	Awake,
	Dead,
	Alive,
}
