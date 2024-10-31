import { type CommandClasses } from "@zwave-js/core";
import { type Expand } from "@zwave-js/shared";
import {
	type ApplicationCCsFile,
	type ApplicationRFConfigFile,
	type ApplicationTypeFile,
	type ControllerInfoFile,
	type LRNodeInfo,
	type NodeInfo,
} from "../nvm3/files/index.js";
import { type Route } from "./routeCache.js";
import { type SUCUpdateEntry } from "./sucUpdateEntry.js";

export enum NVMAccess {
	None,
	Read,
	Write,
	ReadWrite,
}

/** Provides an abstraction to access the contents of an NVM at the binary level */
export interface NVMIO {
	/**
	 * Opens the NVM for reading and/or writing.
	 * Since different NVM implementations may or may not allow reading and writing at the same time,
	 * the returned value indicates which access patterns are actually allowed.
	 */
	open(access: NVMAccess.Read | NVMAccess.Write): Promise<NVMAccess>;

	/** Returns the size of the NVM, after it has been opened */
	get size(): number;
	/** Returns which access is currently allowed for this NVM implementation */
	get accessMode(): NVMAccess;

	/**
	 * Determines the size of the data chunks that can be used for writing.
	 * Requires the NVM to be readable.
	 */
	determineChunkSize(): Promise<number>;

	/**
	 * Reads a chunk of data with the given length from the NVM.
	 * If the length is longer than the chunk size, or the end of the NVM is reached,
	 * the returned buffer will be shorter than the requested length.
	 */
	read(
		offset: number,
		length: number,
	): Promise<{ buffer: Uint8Array; endOfFile: boolean }>;

	/**
	 * Writes a chunk of data with the given length from the NVM.
	 * The returned value indicates how many bytes were actually written.
	 */
	write(
		offset: number,
		data: Uint8Array,
	): Promise<{ bytesWritten: number; endOfFile: boolean }>;

	/** Closes the NVM */
	close(): Promise<void>;
}

/** A specific NVM implementation */
export interface NVM<ID, Data> {
	/** Checks if a property exists in the NVM */
	has(property: ID): Promise<boolean>;

	/** Reads a property from the NVM */
	get(property: ID): Promise<Data | undefined>;

	/** Writes a property to the NVM */
	set(property: ID, value: Data): Promise<void>;

	/** Deletes the property from the NVM */
	delete(property: ID): Promise<void>;
}

/**
 * Provides an application-level abstraction over an NVM implementation
 */
export interface NVMAdapter {
	/** Reads a property from the NVM */
	get<T extends NVMProperty, R extends boolean = boolean>(
		property: T,
		required?: R,
	): Promise<
		R extends true ? NVMPropertyToDataType<T>
			: (NVMPropertyToDataType<T> | undefined)
	>;

	/**
	 * Changes a property to be written to the NVM later
	 */
	set<T extends NVMProperty>(
		property: T,
		value: NVMPropertyToDataType<T>,
	): Promise<void>;

	/**
	 * Marks a property for deletion from the NVM. In some implementations,
	 * deleting one property may delete multiple properties that are stored together.
	 */
	delete(property: NVMProperty): Promise<void>;

	/** Returns whether there are pending changes that weren't written to the NVM yet */
	hasPendingChanges(): boolean;

	/** Writes all pending changes to the NVM */
	commit(): Promise<void>;
}

export type ControllerNVMPropertyTypes = Expand<
	& {
		protocolVersion: string;
		protocolFileFormat: number;
		applicationVersion: string;
		applicationData: Uint8Array;
		preferredRepeaters?: number[];
		sucUpdateEntries: SUCUpdateEntry[];
		appRouteLock: number[];
		routeSlaveSUC: number[];
		sucPendingUpdate: number[];
		pendingDiscovery: number[];
		virtualNodeIds: number[];
		nodeIds: number[];
	}
	// 700+ series only
	& Partial<{
		applicationFileFormat: number;
		applicationName: string;
		lrNodeIds: number[];
	}>
	// 500 series only
	& Partial<{
		learnedHomeId: Uint8Array;
		commandClasses: CommandClasses[];
		systemState: number;
		watchdogStarted: number;
		powerLevelNormal: number[];
		powerLevelLow: number[];
		powerMode: number;
		powerModeExtintEnable: number;
		powerModeWutTimeout: number;
	}>
	& Pick<
		ControllerInfoFile,
		| "homeId"
		| "nodeId"
		| "lastNodeId"
		| "staticControllerNodeId"
		| "sucLastIndex"
		| "controllerConfiguration"
		| "sucAwarenessPushNeeded"
		| "maxNodeId"
		| "reservedId"
		| "systemState"
		| "lastNodeIdLR"
		| "maxNodeIdLR"
		| "reservedIdLR"
		| "primaryLongRangeChannelId"
		| "dcdcConfig"
	>
	// 700+ series only
	& Partial<
		Pick<
			ApplicationCCsFile,
			| "includedInsecurely"
			| "includedSecurelyInsecureCCs"
			| "includedSecurelySecureCCs"
		>
	>
	// 700+ series only
	& Partial<
		Pick<
			ApplicationRFConfigFile,
			| "rfRegion"
			| "txPower"
			| "measured0dBm"
			| "enablePTI"
			| "maxTXPower"
			| "nodeIdType"
		>
	>
	// 700+ series only
	& Partial<
		Pick<
			ApplicationTypeFile,
			| "isListening"
			| "optionalFunctionality"
			| "genericDeviceClass"
			| "specificDeviceClass"
		>
	>
>;

export interface NodeNVMPropertyTypes {
	info: NodeInfo;
	routes: { lwr?: Route; nlwr?: Route };
}

export interface LRNodeNVMPropertyTypes {
	info: LRNodeInfo;
}

export type ControllerNVMProperty = {
	domain: "controller";
	type: keyof ControllerNVMPropertyTypes;
	nodeId?: undefined;
};

export type ControllerNVMPropertyToDataType<P extends ControllerNVMProperty> =
	ControllerNVMPropertyTypes[P["type"]];

export type NodeNVMProperty = {
	domain: "node";
	type: keyof NodeNVMPropertyTypes;
	nodeId: number;
};

export type NodeNVMPropertyToDataType<P extends NodeNVMProperty> =
	P["type"] extends keyof NodeNVMPropertyTypes
		? NodeNVMPropertyTypes[P["type"]]
		: never;

export type LRNodeNVMProperty = {
	domain: "lrnode";
	type: keyof LRNodeNVMPropertyTypes;
	nodeId: number;
};

export type LRNodeNVMPropertyToDataType<P extends LRNodeNVMProperty> =
	P["type"] extends keyof LRNodeNVMPropertyTypes
		? LRNodeNVMPropertyTypes[P["type"]]
		: never;

export type NVMProperty =
	| ControllerNVMProperty
	| NodeNVMProperty
	| LRNodeNVMProperty;

export type NVMPropertyToDataType<P extends NVMProperty> = P extends
	ControllerNVMProperty ? ControllerNVMPropertyToDataType<P>
	: P extends NodeNVMProperty ? NodeNVMPropertyToDataType<P>
	: P extends LRNodeNVMProperty ? LRNodeNVMPropertyToDataType<P>
	: never;
