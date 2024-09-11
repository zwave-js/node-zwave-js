import { type Expand } from "@zwave-js/shared";
import {
	type ApplicationCCsFile,
	type ApplicationRFConfigFile,
	type ApplicationTypeFile,
	type ControllerInfoFile,
	type LRNodeInfo,
	type NodeInfo,
	type Route,
	type SUCUpdateEntry,
} from "../../files";

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
	open(access: NVMAccess): Promise<NVMAccess>;
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
	read(offset: number, length: number): Promise<Buffer>;

	/**
	 * Writes a chunk of data with the given length from the NVM.
	 * The returned value indicates how many bytes were actually written.
	 */
	write(offset: number, data: Buffer): Promise<number>;

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
	/** Reads a controller-related property from the NVM */
	get<T extends ControllerNVMProperty>(
		property: T,
	): Promise<ControllerNVMPropertyToDataType<T> | undefined>;

	/** Reads a node-related property from the NVM */
	get<T extends NodeNVMProperty>(
		property: T,
	): Promise<NodeNVMPropertyToDataType<T> | undefined>;

	/**
	 * Changes a controller-related property to be written to the NVM later
	 */
	set<T extends ControllerNVMProperty>(
		property: T,
		value: ControllerNVMPropertyToDataType<T>,
	): Promise<void>;

	/**
	 * Changes a node-related property to be written to the NVM later
	 */
	set<T extends NodeNVMProperty>(
		property: T,
		value: NodeNVMPropertyToDataType<T>,
	): Promise<void>;

	/**
	 * Marks a property for deletion from the NVM. In some implementations,
	 * deleting one property may delete multiple properties that are stored together.
	 */
	delete(property: ControllerNVMProperty | NodeNVMProperty): Promise<void>;

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
		applicationFileFormat: number;
		applicationData: Buffer;
		applicationName: string;
		preferredRepeaters?: number[];
		sucUpdateEntries: SUCUpdateEntry[];
		appRouteLock: number[];
		routeSlaveSUC: number[];
		sucPendingUpdate: number[];
		pendingDiscovery: number[];
		nodeIds: number[];
		lrNodeIds: number[];
	}
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
	// FIXME: This feels weird
	& Pick<
		ApplicationCCsFile,
		| "includedInsecurely"
		| "includedSecurelyInsecureCCs"
		| "includedSecurelySecureCCs"
	>
	& Pick<
		ApplicationRFConfigFile,
		| "rfRegion"
		| "txPower"
		| "measured0dBm"
		| "enablePTI"
		| "maxTXPower"
		| "nodeIdType"
	>
	& Pick<
		ApplicationTypeFile,
		| "isListening"
		| "optionalFunctionality"
		| "genericDeviceClass"
		| "specificDeviceClass"
	>
>;

export interface NodeNVMPropertyTypes {
	// FIXME: isVirtual?
	info: NodeInfo;
	routes: { lwr: Route; nlwr: Route };
}

export interface LRNodeNVMPropertyTypes {
	info: LRNodeInfo;
}

export type ControllerNVMProperty = {
	domain: "controller";
	type: keyof ControllerNVMPropertyTypes;
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
