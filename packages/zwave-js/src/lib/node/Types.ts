import type {
	MetadataUpdatedArgs,
	ValueAddedArgs,
	ValueID,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "@zwave-js/core";
import type { FirmwareUpdateStatus } from "../commandclass";
import type { ZWaveNotificationCallbackParams_EntryControlCC } from "../commandclass/EntryControlCC";
import type { ZWaveNotificationCallbackParams_NotificationCC } from "../commandclass/NotificationCC";
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
export type ZWaveNodeValueNotificationArgs = ValueNotificationArgs &
	TranslatedValueID;

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
export type ZWaveNodeValueNotificationCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueNotificationArgs,
) => void;
export type ZWaveNodeMetadataUpdatedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeMetadataUpdatedArgs,
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

export type ZWaveNotificationCallback = (
	...args:
		| ZWaveNotificationCallbackParams_NotificationCC
		| ZWaveNotificationCallbackParams_EntryControlCC
) => void;

export interface ZWaveNodeValueEventCallbacks {
	"value added": ZWaveNodeValueAddedCallback;
	"value updated": ZWaveNodeValueUpdatedCallback;
	"value removed": ZWaveNodeValueRemovedCallback;
	"metadata updated": ZWaveNodeMetadataUpdatedCallback;
	"value notification": ZWaveNodeValueNotificationCallback;
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
	"interview stage completed": (node: ZWaveNode, stageName: string) => void;
	"interview started": (node: ZWaveNode) => void;
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

export enum ProtocolVersion {
	"unknown" = 0,
	"2.0" = 1,
	"4.2x / 5.0x" = 2,
	"4.5x / 6.0x" = 3,
}

export type FLiRS = false | "250ms" | "1000ms";

export type DataRate = 9600 | 40000 | 100000;

export enum NodeType {
	Controller,
	"Routing End Node",
}
