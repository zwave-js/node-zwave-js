import {
	actuatorCCs,
	authHomeIdFromDSK,
	CommandClasses,
	computePRK,
	decodeX25519KeyDER,
	deriveTempKeys,
	dskFromString,
	dskToString,
	encodeX25519KeyDERSPKI,
	indexDBsByNode,
	isRecoverableZWaveError,
	isTransmissionError,
	isZWaveError,
	NodeType,
	NODE_ID_BROADCAST,
	nwiHomeIdFromDSK,
	ProtocolType,
	RFRegion,
	SecurityClass,
	securityClassIsS2,
	securityClassOrder,
	ValueDB,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { migrateNVM } from "@zwave-js/nvmedit";
import type { Message, SuccessIndicator } from "@zwave-js/serial";
import { FunctionType } from "@zwave-js/serial";
import {
	createThrowingMap,
	flatMap,
	getEnumMemberName,
	getErrorMessage,
	Mixin,
	num2hex,
	ObjectKeyMap,
	padVersion,
	pick,
	ReadonlyObjectKeyMap,
	ReadonlyThrowingMap,
	ThrowingMap,
	TypedEventEmitter,
} from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import crypto from "crypto";
import semver from "semver";
import util from "util";
import {
	Security2CCKEXFail,
	Security2CCKEXSet,
	Security2CCNetworkKeyGet,
	Security2CCNetworkKeyVerify,
	Security2CCPublicKeyReport,
	Security2CCTransferEnd,
} from "../commandclass";
import { AssociationCC } from "../commandclass/AssociationCC";
import { AssociationGroupInfoCC } from "../commandclass/AssociationGroupInfoCC";
import {
	getManufacturerIdValueId,
	getManufacturerIdValueMetadata,
	getProductIdValueId,
	getProductIdValueMetadata,
	getProductTypeValueId,
	getProductTypeValueMetadata,
} from "../commandclass/ManufacturerSpecificCC";
import { MultiChannelAssociationCC } from "../commandclass/MultiChannelAssociationCC";
import {
	ECDHProfiles,
	inclusionTimeouts,
	KEXFailType,
	KEXSchemes,
} from "../commandclass/Security2/shared";
import {
	getFirmwareVersionsMetadata,
	getFirmwareVersionsValueId,
	getSDKVersionMetadata,
	getSDKVersionValueId,
} from "../commandclass/VersionCC";
import type {
	AssociationAddress,
	AssociationGroup,
	EndpointAddress,
} from "../commandclass/_Types";
import type { Driver } from "../driver/Driver";
import { cacheKeys, cacheKeyUtils } from "../driver/NetworkCache";
import type { StatisticsEventCallbacks } from "../driver/Statistics";
import { DeviceClass } from "../node/DeviceClass";
import { ZWaveNode } from "../node/Node";
import { VirtualNode } from "../node/VirtualNode";
import { InterviewStage, LifelineRoutes, NodeStatus } from "../node/_Types";
import {
	GetControllerCapabilitiesRequest,
	GetControllerCapabilitiesResponse,
} from "../serialapi/capability/GetControllerCapabilitiesMessages";
import {
	GetControllerVersionRequest,
	GetControllerVersionResponse,
} from "../serialapi/capability/GetControllerVersionMessages";
import {
	GetProtocolVersionRequest,
	GetProtocolVersionResponse,
} from "../serialapi/capability/GetProtocolVersionMessages";
import {
	GetSerialApiCapabilitiesRequest,
	GetSerialApiCapabilitiesResponse,
} from "../serialapi/capability/GetSerialApiCapabilitiesMessages";
import {
	GetSerialApiInitDataRequest,
	GetSerialApiInitDataResponse,
} from "../serialapi/capability/GetSerialApiInitDataMessages";
import { HardResetRequest } from "../serialapi/capability/HardResetRequest";
import {
	SerialAPISetupCommand,
	SerialAPISetup_CommandUnsupportedResponse,
	SerialAPISetup_GetLRMaximumPayloadSizeRequest,
	SerialAPISetup_GetLRMaximumPayloadSizeResponse,
	SerialAPISetup_GetMaximumPayloadSizeRequest,
	SerialAPISetup_GetMaximumPayloadSizeResponse,
	SerialAPISetup_GetPowerlevelRequest,
	SerialAPISetup_GetPowerlevelResponse,
	SerialAPISetup_GetRFRegionRequest,
	SerialAPISetup_GetRFRegionResponse,
	SerialAPISetup_GetSupportedCommandsRequest,
	SerialAPISetup_GetSupportedCommandsResponse,
	SerialAPISetup_SetNodeIDTypeRequest,
	SerialAPISetup_SetNodeIDTypeResponse,
	SerialAPISetup_SetPowerlevelRequest,
	SerialAPISetup_SetPowerlevelResponse,
	SerialAPISetup_SetRFRegionRequest,
	SerialAPISetup_SetRFRegionResponse,
	SerialAPISetup_SetTXStatusReportRequest,
	SerialAPISetup_SetTXStatusReportResponse,
} from "../serialapi/capability/SerialAPISetupMessages";
import { SetApplicationNodeInformationRequest } from "../serialapi/capability/SetApplicationNodeInformationRequest";
import {
	GetControllerIdRequest,
	GetControllerIdResponse,
} from "../serialapi/memory/GetControllerIdMessages";
import {
	GetBackgroundRSSIRequest,
	GetBackgroundRSSIResponse,
} from "../serialapi/misc/GetBackgroundRSSIMessages";
import {
	SetRFReceiveModeRequest,
	SetRFReceiveModeResponse,
} from "../serialapi/misc/SetRFReceiveModeMessages";
import {
	SetSerialApiTimeoutsRequest,
	SetSerialApiTimeoutsResponse,
} from "../serialapi/misc/SetSerialApiTimeoutsMessages";
import {
	AddNodeDSKToNetworkRequest,
	AddNodeStatus,
	AddNodeToNetworkRequest,
	AddNodeToNetworkRequestStatusReport,
	AddNodeType,
	EnableSmartStartListenRequest,
} from "../serialapi/network-mgmt/AddNodeToNetworkRequest";
import { AssignReturnRouteRequest } from "../serialapi/network-mgmt/AssignReturnRouteMessages";
import { AssignSUCReturnRouteRequest } from "../serialapi/network-mgmt/AssignSUCReturnRouteMessages";
import { DeleteReturnRouteRequest } from "../serialapi/network-mgmt/DeleteReturnRouteMessages";
import { DeleteSUCReturnRouteRequest } from "../serialapi/network-mgmt/DeleteSUCReturnRouteMessages";
import {
	GetRoutingInfoRequest,
	GetRoutingInfoResponse,
} from "../serialapi/network-mgmt/GetRoutingInfoMessages";
import {
	GetSUCNodeIdRequest,
	GetSUCNodeIdResponse,
} from "../serialapi/network-mgmt/GetSUCNodeIdMessages";
import {
	IsFailedNodeRequest,
	IsFailedNodeResponse,
} from "../serialapi/network-mgmt/IsFailedNodeMessages";
import {
	RemoveFailedNodeRequest,
	RemoveFailedNodeResponse,
	RemoveFailedNodeStartFlags,
	RemoveFailedNodeStatus,
	type RemoveFailedNodeRequestStatusReport,
} from "../serialapi/network-mgmt/RemoveFailedNodeMessages";
import {
	RemoveNodeFromNetworkRequest,
	RemoveNodeFromNetworkRequestStatusReport,
	RemoveNodeStatus,
	RemoveNodeType,
} from "../serialapi/network-mgmt/RemoveNodeFromNetworkRequest";
import {
	ReplaceFailedNodeRequest,
	ReplaceFailedNodeRequestStatusReport,
	ReplaceFailedNodeResponse,
	ReplaceFailedNodeStartFlags,
	ReplaceFailedNodeStatus,
} from "../serialapi/network-mgmt/ReplaceFailedNodeRequest";
import {
	NodeNeighborUpdateStatus,
	RequestNodeNeighborUpdateReport,
	RequestNodeNeighborUpdateRequest,
} from "../serialapi/network-mgmt/RequestNodeNeighborUpdateMessages";
import { SetSUCNodeIdRequest } from "../serialapi/network-mgmt/SetSUCNodeIDMessages";
import {
	ExtNVMReadLongBufferRequest,
	ExtNVMReadLongBufferResponse,
} from "../serialapi/nvm/ExtNVMReadLongBufferMessages";
import {
	ExtNVMReadLongByteRequest,
	ExtNVMReadLongByteResponse,
} from "../serialapi/nvm/ExtNVMReadLongByteMessages";
import {
	ExtNVMWriteLongBufferRequest,
	ExtNVMWriteLongBufferResponse,
} from "../serialapi/nvm/ExtNVMWriteLongBufferMessages";
import {
	ExtNVMWriteLongByteRequest,
	ExtNVMWriteLongByteResponse,
} from "../serialapi/nvm/ExtNVMWriteLongByteMessages";
import {
	GetNVMIdRequest,
	GetNVMIdResponse,
	NVMId,
	nvmSizeToBufferSize,
} from "../serialapi/nvm/GetNVMIdMessages";
import {
	NVMOperationsCloseRequest,
	NVMOperationsOpenRequest,
	NVMOperationsReadRequest,
	NVMOperationsResponse,
	NVMOperationStatus,
	NVMOperationsWriteRequest,
} from "../serialapi/nvm/NVMOperationsMessages";
import {
	NodeIDType,
	ZWaveApiVersion,
	ZWaveLibraryTypes,
} from "../serialapi/_Types";
import {
	ControllerStatistics,
	ControllerStatisticsHost,
} from "./ControllerStatistics";
import { minFeatureVersions, ZWaveFeature } from "./Features";
import {
	InclusionOptions,
	InclusionOptionsInternal,
	InclusionResult,
	InclusionState,
	InclusionStrategy,
	InclusionUserCallbacks,
	PlannedProvisioningEntry,
	ProvisioningEntryStatus,
	ReplaceNodeOptions,
	SmartStartProvisioningEntry,
} from "./Inclusion";
import { determineNIF } from "./NodeInformationFrame";
import { assertProvisioningEntry } from "./utils";
import type { UnknownZWaveChipType } from "./ZWaveChipTypes";
import { protocolVersionToSDKVersion } from "./ZWaveSDKVersions";
import type { HealNodeStatus, RSSI, SDKVersion } from "./_Types";

// Strongly type the event emitter events
interface ControllerEventCallbacks
	extends StatisticsEventCallbacks<ControllerStatistics> {
	"inclusion failed": () => void;
	"exclusion failed": () => void;
	"inclusion started": (secure: boolean, strategy: InclusionStrategy) => void;
	"exclusion started": () => void;
	"inclusion stopped": () => void;
	"exclusion stopped": () => void;
	"node added": (node: ZWaveNode, result: InclusionResult) => void;
	"node removed": (node: ZWaveNode, replaced: boolean) => void;
	"heal network progress": (
		progress: ReadonlyMap<number, HealNodeStatus>,
	) => void;
	"heal network done": (result: ReadonlyMap<number, HealNodeStatus>) => void;
}

export type ControllerEvents = Extract<keyof ControllerEventCallbacks, string>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ZWaveController extends ControllerStatisticsHost {}

@Mixin([ControllerStatisticsHost])
export class ZWaveController extends TypedEventEmitter<ControllerEventCallbacks> {
	/** @internal */
	public constructor(private readonly driver: Driver) {
		super();

		this._nodes = createThrowingMap((nodeId) => {
			throw new ZWaveError(
				`Node ${nodeId} was not found!`,
				ZWaveErrorCodes.Controller_NodeNotFound,
			);
		});

		// register message handlers
		driver.registerRequestHandler(
			FunctionType.AddNodeToNetwork,
			this.handleAddNodeStatusReport.bind(this),
		);
		driver.registerRequestHandler(
			FunctionType.RemoveNodeFromNetwork,
			this.handleRemoveNodeStatusReport.bind(this),
		);
		driver.registerRequestHandler(
			FunctionType.ReplaceFailedNode,
			this.handleReplaceNodeStatusReport.bind(this),
		);
	}

	private _type: ZWaveLibraryTypes | undefined;
	public get type(): ZWaveLibraryTypes | undefined {
		return this._type;
	}

	private _sdkVersion: string | undefined;
	public get sdkVersion(): string | undefined {
		return this._sdkVersion;
	}

	private _zwaveApiVersion: ZWaveApiVersion | undefined;
	public get zwaveApiVersion(): ZWaveApiVersion | undefined {
		return this._zwaveApiVersion;
	}

	private _zwaveChipType: string | UnknownZWaveChipType | undefined;
	public get zwaveChipType(): string | UnknownZWaveChipType | undefined {
		return this._zwaveChipType;
	}

	private _homeId: number | undefined;
	/** A 32bit number identifying the current network */
	public get homeId(): number | undefined {
		return this._homeId;
	}

	private _ownNodeId: number | undefined;
	/** The ID of the controller in the current network */
	public get ownNodeId(): number | undefined {
		return this._ownNodeId;
	}

	private _isPrimary: boolean | undefined;
	public get isPrimary(): boolean | undefined {
		return this._isPrimary;
	}

	/** @deprecated Use {@link isPrimary} instead */
	public get isSecondary(): boolean | undefined {
		if (typeof this._isPrimary === "boolean") return !this._isPrimary;
	}

	private _isUsingHomeIdFromOtherNetwork: boolean | undefined;
	public get isUsingHomeIdFromOtherNetwork(): boolean | undefined {
		return this._isUsingHomeIdFromOtherNetwork;
	}

	private _isSISPresent: boolean | undefined;
	public get isSISPresent(): boolean | undefined {
		return this._isSISPresent;
	}

	private _wasRealPrimary: boolean | undefined;
	public get wasRealPrimary(): boolean | undefined {
		return this._wasRealPrimary;
	}

	private _isSIS: boolean | undefined;
	public get isSIS(): boolean | undefined {
		return this._isSIS;
	}

	private _isSUC: boolean | undefined;
	public get isSUC(): boolean | undefined {
		return this._isSUC;
	}

	/** @deprecated Use {@link isSUC} instead */
	public get isStaticUpdateController(): boolean | undefined {
		return this._isSUC;
	}

	private _nodeType: NodeType | undefined;
	public get nodeType(): NodeType | undefined {
		return this._nodeType;
	}

	/** @deprecated Use the {@link nodeType} property to check for Controller vs. End Node instead */
	public get isSlave(): boolean | undefined {
		if (this._nodeType != undefined) {
			return this._nodeType !== NodeType.Controller;
		}
	}

	/** Checks if the SDK version is greater than the given one */
	public sdkVersionGt(version: SDKVersion): boolean | undefined {
		if (this._sdkVersion === undefined) {
			return undefined;
		}
		const sdkVersion = protocolVersionToSDKVersion(this._sdkVersion);
		return semver.gt(padVersion(sdkVersion), padVersion(version));
	}

	/** Checks if the SDK version is greater than or equal to the given one */
	public sdkVersionGte(version: SDKVersion): boolean | undefined {
		if (this._sdkVersion === undefined) {
			return undefined;
		}
		const sdkVersion = protocolVersionToSDKVersion(this._sdkVersion);
		return semver.gte(padVersion(sdkVersion), padVersion(version));
	}

	/** Checks if the SDK version is lower than the given one */
	public sdkVersionLt(version: SDKVersion): boolean | undefined {
		if (this._sdkVersion === undefined) {
			return undefined;
		}
		const sdkVersion = protocolVersionToSDKVersion(this._sdkVersion);
		return semver.lt(padVersion(sdkVersion), padVersion(version));
	}

	/** Checks if the SDK version is lower than or equal to the given one */
	public sdkVersionLte(version: SDKVersion): boolean | undefined {
		if (this._sdkVersion === undefined) {
			return undefined;
		}
		const sdkVersion = protocolVersionToSDKVersion(this._sdkVersion);
		return semver.lte(padVersion(sdkVersion), padVersion(version));
	}

	private _manufacturerId: number | undefined;
	public get manufacturerId(): number | undefined {
		return this._manufacturerId;
	}

	private _productType: number | undefined;
	public get productType(): number | undefined {
		return this._productType;
	}

	private _productId: number | undefined;
	public get productId(): number | undefined {
		return this._productId;
	}

	private _firmwareVersion: string | undefined;
	public get firmwareVersion(): string | undefined {
		return this._firmwareVersion;
	}

	private _supportedFunctionTypes: FunctionType[] | undefined;
	public get supportedFunctionTypes(): readonly FunctionType[] | undefined {
		return this._supportedFunctionTypes;
	}

	/** Checks if a given Z-Wave function type is supported by this controller */
	public isFunctionSupported(functionType: FunctionType): boolean {
		if (this._supportedFunctionTypes == null) {
			throw new ZWaveError(
				"Cannot check yet if a function is supported by the controller. The interview process has not been completed.",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._supportedFunctionTypes.indexOf(functionType) > -1;
	}

	private _supportedSerialAPISetupCommands:
		| SerialAPISetupCommand[]
		| undefined;
	public get supportedSerialAPISetupCommands():
		| readonly SerialAPISetupCommand[]
		| undefined {
		return this._supportedSerialAPISetupCommands;
	}

	/** Checks if a given Serial API setup command is supported by this controller */
	public isSerialAPISetupCommandSupported(
		command: SerialAPISetupCommand,
	): boolean {
		if (!this._supportedSerialAPISetupCommands) {
			throw new ZWaveError(
				"Cannot check yet if a Serial API setup command is supported by the controller. The interview process has not been completed.",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._supportedSerialAPISetupCommands.indexOf(command) > -1;
	}

	/**
	 * Tests if the controller supports a certain feature.
	 * Returns `undefined` if this information isn't known yet.
	 */
	public supportsFeature(feature: ZWaveFeature): boolean | undefined {
		switch (feature) {
			case ZWaveFeature.SmartStart:
				return this.sdkVersionGte(minFeatureVersions[feature]);
		}
	}

	/** Throws if the controller does not support a certain feature */
	private assertFeature(feature: ZWaveFeature): void {
		if (!this.supportsFeature(feature)) {
			throw new ZWaveError(
				`The controller does not support the ${getEnumMemberName(
					ZWaveFeature,
					feature,
				)} feature`,
				ZWaveErrorCodes.Controller_NotSupported,
			);
		}
	}

	private _sucNodeId: number | undefined;
	public get sucNodeId(): number | undefined {
		return this._sucNodeId;
	}

	private _supportsTimers: boolean | undefined;
	public get supportsTimers(): boolean | undefined {
		return this._supportsTimers;
	}

	/** Whether the controller is known to support soft reset */
	public get supportsSoftReset(): boolean | undefined {
		return this.driver.cacheGet(cacheKeys.controller.supportsSoftReset);
	}
	/** @internal */
	public set supportsSoftReset(value: boolean | undefined) {
		this.driver.cacheSet(cacheKeys.controller.supportsSoftReset, value);
	}

	private _nodes: ThrowingMap<number, ZWaveNode>;
	/** A dictionary of the nodes connected to this controller */
	public get nodes(): ReadonlyThrowingMap<number, ZWaveNode> {
		return this._nodes;
	}

	/** Returns the node with the given DSK */
	public getNodeByDSK(dsk: Buffer | string): ZWaveNode | undefined {
		if (typeof dsk === "string") dsk = dskFromString(dsk);
		for (const node of this._nodes.values()) {
			if (node.dsk?.equals(dsk)) return node;
		}
	}

	/** Returns the controller node's value DB */
	public get valueDB(): ValueDB {
		return this._nodes.get(this._ownNodeId!)!.valueDB;
	}

	private _healNetworkActive: boolean = false;
	/** Returns whether the network or a node is currently being healed. */
	public get isHealNetworkActive(): boolean {
		return this._healNetworkActive;
	}

	/** Returns a reference to the (virtual) broadcast node, which allows sending commands to all nodes */
	public getBroadcastNode(): VirtualNode {
		return new VirtualNode(
			NODE_ID_BROADCAST,
			this.driver,
			this.nodes.values(),
		);
	}

	/** Creates a virtual node that can be used to send multicast commands to several nodes */
	public getMulticastGroup(nodeIDs: number[]): VirtualNode {
		const nodes = nodeIDs.map((id) => this._nodes.getOrThrow(id));
		return new VirtualNode(undefined, this.driver, nodes);
	}

	/** @internal */
	public get provisioningList(): readonly SmartStartProvisioningEntry[] {
		return (
			this.driver.cacheGet(cacheKeys.controller.provisioningList) ?? []
		);
	}
	private set provisioningList(
		value: readonly SmartStartProvisioningEntry[],
	) {
		this.driver.cacheSet(cacheKeys.controller.provisioningList, value);
	}

	/** Adds the given entry (DSK and security classes) to the controller's SmartStart provisioning list or replaces an existing entry */
	public provisionSmartStartNode(entry: PlannedProvisioningEntry): void {
		// Make sure the controller supports SmartStart
		this.assertFeature(ZWaveFeature.SmartStart);

		// And that the entry contains valid data
		assertProvisioningEntry(entry);

		const provisioningList = [...this.provisioningList];

		const index = provisioningList.findIndex((e) => e.dsk === entry.dsk);
		if (index === -1) {
			provisioningList.push(entry);
		} else {
			provisioningList[index] = entry;
		}
		this.provisioningList = provisioningList;

		this.autoProvisionSmartStart();
	}

	/**
	 * Removes the given DSK or node ID from the controller's SmartStart provisioning list.
	 *
	 * **Note:** If this entry corresponds to an included node, it will **NOT** be excluded
	 */
	public unprovisionSmartStartNode(dskOrNodeId: string | number): void {
		const provisioningList = [...this.provisioningList];

		const index = provisioningList.findIndex(
			(e) =>
				e.dsk === dskOrNodeId ||
				(typeof dskOrNodeId === "number" &&
					"nodeId" in e &&
					e.nodeId === dskOrNodeId),
		);
		if (index >= 0) {
			provisioningList.splice(index, 1);
			this.autoProvisionSmartStart();
			this.provisioningList = provisioningList;
		}
	}

	private getProvisioningEntryInternal(
		dskOrNodeId: string | number,
	): SmartStartProvisioningEntry | undefined {
		return this.provisioningList.find(
			(e) =>
				e.dsk === dskOrNodeId ||
				(typeof dskOrNodeId === "number" &&
					"nodeId" in e &&
					e.nodeId === dskOrNodeId),
		);
	}

	/**
	 * Returns the entry for the given DSK or node ID from the controller's SmartStart provisioning list.
	 */
	public getProvisioningEntry(
		dskOrNodeId: string | number,
	): Readonly<SmartStartProvisioningEntry> | undefined {
		const entry = this.getProvisioningEntryInternal(dskOrNodeId);
		// Try to look up the node ID for this entry
		if (entry) {
			const ret: SmartStartProvisioningEntry = {
				...entry,
			};
			const node =
				typeof dskOrNodeId === "string"
					? this.getNodeByDSK(dskOrNodeId)
					: this.nodes.get(dskOrNodeId);
			if (node) ret.nodeId = node.id;
			return ret;
		}
	}

	/**
	 * Returns all entries from the controller's SmartStart provisioning list.
	 */
	public getProvisioningEntries(): SmartStartProvisioningEntry[] {
		// Determine which DSKs belong to which node IDs
		const dskNodeMap = new Map<string, number>();
		for (const node of this.nodes.values()) {
			if (node.dsk) dskNodeMap.set(dskToString(node.dsk), node.id);
		}
		// Make copies so no one can modify the internal list (except for user info)
		return this.provisioningList.map((e) => {
			const { dsk, securityClasses, nodeId, ...rest } = e;
			return {
				dsk,
				securityClasses: [...securityClasses],
				...(dskNodeMap.has(dsk)
					? { nodeId: dskNodeMap.get(dsk)! }
					: {}),
				...rest,
			};
		});
	}

	/** Returns whether the SmartStart provisioning list contains active entries that have not been included yet */
	public hasPlannedProvisioningEntries(): boolean {
		return this.provisioningList.some(
			(e) =>
				(e.status == undefined ||
					e.status === ProvisioningEntryStatus.Active) &&
				!this.getNodeByDSK(e.dsk),
		);
	}

	/**
	 * @internal
	 * Automatically starts smart start inclusion if there are nodes pending inclusion.
	 */
	public autoProvisionSmartStart(): void {
		// Make sure the controller supports SmartStart
		if (!this.supportsFeature(ZWaveFeature.SmartStart)) return;

		if (this.hasPlannedProvisioningEntries()) {
			// SmartStart should be enabled
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			void this.enableSmartStart().catch(() => {});
		} else {
			// SmartStart should be disabled
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			void this.disableSmartStart().catch(() => {});
		}
	}

	/**
	 * @internal
	 * Queries the controller IDs and its Serial API capabilities
	 */
	public async identify(): Promise<void> {
		// get the home and node id of the controller
		this.driver.controllerLog.print(`querying controller IDs...`);
		const ids = await this.driver.sendMessage<GetControllerIdResponse>(
			new GetControllerIdRequest(this.driver),
			{ supportCheck: false },
		);
		this._homeId = ids.homeId;
		this._ownNodeId = ids.ownNodeId;
		this.driver.controllerLog.print(
			`received controller IDs:
  home ID:     ${num2hex(this._homeId)}
  own node ID: ${this._ownNodeId}`,
		);

		// Figure out what the serial API can do
		this.driver.controllerLog.print(`querying API capabilities...`);
		const apiCaps =
			await this.driver.sendMessage<GetSerialApiCapabilitiesResponse>(
				new GetSerialApiCapabilitiesRequest(this.driver),
				{
					supportCheck: false,
				},
			);
		this._firmwareVersion = apiCaps.firmwareVersion;
		this._manufacturerId = apiCaps.manufacturerId;
		this._productType = apiCaps.productType;
		this._productId = apiCaps.productId;
		this._supportedFunctionTypes = apiCaps.supportedFunctionTypes;
		this.driver.controllerLog.print(
			`received API capabilities:
  firmware version:    ${this._firmwareVersion}
  manufacturer ID:     ${num2hex(this._manufacturerId)}
  product type:        ${num2hex(this._productType)}
  product ID:          ${num2hex(this._productId)}
  supported functions: ${this._supportedFunctionTypes
		.map((fn) => `\n  · ${FunctionType[fn]} (${num2hex(fn)})`)
		.join("")}`,
		);
	}

	/**
	 * @internal
	 * Interviews the controller for the necessary information.
	 * @param restoreFromCache Asynchronous callback for the driver to restore the network from cache after nodes are created
	 */
	public async interview(
		restoreFromCache: () => Promise<void>,
	): Promise<void> {
		// get basic controller version info
		this.driver.controllerLog.print(`querying version info...`);
		const version =
			await this.driver.sendMessage<GetControllerVersionResponse>(
				new GetControllerVersionRequest(this.driver),
				{
					supportCheck: false,
				},
			);
		this._sdkVersion = version.libraryVersion;
		this._type = version.controllerType;
		this.driver.controllerLog.print(
			`received version info:
  controller type: ${getEnumMemberName(ZWaveLibraryTypes, this._type)}
  library version: ${this._sdkVersion}`,
		);

		// If supported, get more fine-grained version info
		if (this.isFunctionSupported(FunctionType.GetProtocolVersion)) {
			this.driver.controllerLog.print(
				`querying protocol version info...`,
			);
			const protocol =
				await this.driver.sendMessage<GetProtocolVersionResponse>(
					new GetProtocolVersionRequest(this.driver),
				);

			// Overwrite the SDK version with the more fine grained protocol version. We can assume this to be
			// valid for 7.x firmwares, where SDK and protocol version are the same.
			this._sdkVersion = protocol.protocolVersion;

			let message = `received protocol version info:
  protocol type:             ${getEnumMemberName(
		ProtocolType,
		protocol.protocolType,
  )}
  protocol version:          ${protocol.protocolVersion}`;
			if (protocol.applicationFrameworkBuildNumber) {
				message += `
  appl. framework build no.: ${protocol.applicationFrameworkBuildNumber}`;
			}
			if (protocol.gitCommitHash) {
				message += `
  git commit hash:           ${protocol.gitCommitHash}`;
			}

			this.driver.controllerLog.print(message);
		}

		this.driver.controllerLog.print(
			`supported Z-Wave features: ${Object.keys(ZWaveFeature)
				.filter((k) => /^\d+$/.test(k))
				.map((k) => parseInt(k) as ZWaveFeature)
				.filter((feat) => this.supportsFeature(feat))
				.map((feat) => `\n  · ${getEnumMemberName(ZWaveFeature, feat)}`)
				.join("")}`,
		);

		// find out what the controller can do
		this.driver.controllerLog.print(`querying controller capabilities...`);
		const ctrlCaps =
			await this.driver.sendMessage<GetControllerCapabilitiesResponse>(
				new GetControllerCapabilitiesRequest(this.driver),
				{
					supportCheck: false,
				},
			);
		this._isPrimary = !ctrlCaps.isSecondary;
		this._isUsingHomeIdFromOtherNetwork =
			ctrlCaps.isUsingHomeIdFromOtherNetwork;
		this._isSISPresent = ctrlCaps.isSISPresent;
		this._wasRealPrimary = ctrlCaps.wasRealPrimary;
		this._isSUC = ctrlCaps.isStaticUpdateController;
		this.driver.controllerLog.print(
			`received controller capabilities:
  controller role:      ${this._isPrimary ? "primary" : "secondary"}
  is the SUC:           ${this._isSUC}
  started this network: ${!this._isUsingHomeIdFromOtherNetwork}
  SIS is present:       ${this._isSISPresent}
  was real primary:     ${this._wasRealPrimary}`,
		);

		// Figure out which sub commands of SerialAPISetup are supported
		if (this.isFunctionSupported(FunctionType.SerialAPISetup)) {
			this.driver.controllerLog.print(
				`querying serial API setup capabilities...`,
			);
			const setupCaps =
				await this.driver.sendMessage<SerialAPISetup_GetSupportedCommandsResponse>(
					new SerialAPISetup_GetSupportedCommandsRequest(this.driver),
				);
			this._supportedSerialAPISetupCommands = setupCaps.supportedCommands;
			this.driver.controllerLog.print(
				`supported serial API setup commands:${this._supportedSerialAPISetupCommands
					.map(
						(cmd) =>
							`\n· ${getEnumMemberName(
								SerialAPISetupCommand,
								cmd,
							)}`,
					)
					.join("")}`,
			);
		} else {
			this._supportedSerialAPISetupCommands = [];
		}

		// Enable TX status report if supported
		if (
			this.isSerialAPISetupCommandSupported(
				SerialAPISetupCommand.SetTxStatusReport,
			)
		) {
			this.driver.controllerLog.print(`Enabling TX status report...`);
			const resp =
				await this.driver.sendMessage<SerialAPISetup_SetTXStatusReportResponse>(
					new SerialAPISetup_SetTXStatusReportRequest(this.driver, {
						enabled: true,
					}),
				);
			this.driver.controllerLog.print(
				`Enabling TX status report ${
					resp.success ? "successful" : "failed"
				}...`,
			);
		}

		// find the SUC
		this.driver.controllerLog.print(`finding SUC...`);
		const suc = await this.driver.sendMessage<GetSUCNodeIdResponse>(
			new GetSUCNodeIdRequest(this.driver),
			{ supportCheck: false },
		);
		this._sucNodeId = suc.sucNodeId;
		if (this._sucNodeId === 0) {
			this.driver.controllerLog.print(`No SUC present in the network`);
		} else if (this._sucNodeId === this._ownNodeId) {
			this.driver.controllerLog.print(`This is the SUC`);
		} else {
			this.driver.controllerLog.print(
				`SUC has node ID ${this.sucNodeId}`,
			);
		}

		// There needs to be a SUC/SIS in the network. If not, we promote ourselves to one if the following conditions are met:
		// We are the primary controller, but we are not SUC, there is no SUC and there is no SIS
		if (
			this._isPrimary &&
			this._sucNodeId === 0 &&
			!this._isSUC &&
			!this._isSISPresent
		) {
			this.driver.controllerLog.print(
				`There is no SUC/SIS in the network - promoting ourselves...`,
			);
			try {
				const result = await this.configureSUC(
					this._ownNodeId!,
					true,
					true,
				);
				if (result) {
					this._sucNodeId = this._ownNodeId;
				}
				this.driver.controllerLog.print(
					`Promotion to SUC/SIS ${result ? "succeeded" : "failed"}.`,
					result ? undefined : "warn",
				);
			} catch (e) {
				this.driver.controllerLog.print(
					`Error while promoting to SUC/SIS: ${getErrorMessage(e)}`,
					"error",
				);
			}
		}

		// if it's a bridge controller, request the virtual nodes
		if (
			this.type === ZWaveLibraryTypes["Bridge Controller"] &&
			this.isFunctionSupported(FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)
		) {
			// TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
		}

		// Request additional information about the controller/Z-Wave chip
		this.driver.controllerLog.print(
			`querying additional controller information...`,
		);
		const initData =
			await this.driver.sendMessage<GetSerialApiInitDataResponse>(
				new GetSerialApiInitDataRequest(this.driver),
			);
		// and remember the new info
		this._zwaveApiVersion = initData.zwaveApiVersion;
		this._zwaveChipType = initData.zwaveChipType;
		this._isPrimary = initData.isPrimary;
		this._isSIS = initData.isSIS;
		this._nodeType = initData.nodeType;
		this._supportsTimers = initData.supportsTimers;
		// ignore the initVersion, no clue what to do with it
		this.driver.controllerLog.print(
			`received additional controller information:
  Z-Wave API version:         ${this._zwaveApiVersion.version} (${
				this._zwaveApiVersion.kind
			})${
				this._zwaveChipType
					? `
  Z-Wave chip type:           ${
		typeof this._zwaveChipType === "string"
			? this._zwaveChipType
			: `unknown (type: ${num2hex(
					this._zwaveChipType.type,
			  )}, version: ${num2hex(this._zwaveChipType.version)})`
  }`
					: ""
			}
  node type                   ${getEnumMemberName(NodeType, this._nodeType)}
  controller role:            ${this._isPrimary ? "primary" : "secondary"}
  controller is the SIS:      ${this._isSIS}
  controller supports timers: ${this._supportsTimers}
  nodes in the network:       ${initData.nodeIds.join(", ")}`,
		);

		// Index the value DB for optimal performance
		const valueDBIndexes = indexDBsByNode([
			this.driver.valueDB!,
			this.driver.metadataDB!,
		]);
		// create an empty entry in the nodes map so we can initialize them afterwards
		for (const nodeId of initData.nodeIds) {
			this._nodes.set(
				nodeId,
				new ZWaveNode(
					nodeId,
					this.driver,
					undefined,
					undefined,
					undefined,
					// Use the previously created index to avoid doing extra work when creating the value DB
					this.createValueDBForNode(
						nodeId,
						valueDBIndexes.get(nodeId),
					),
				),
			);
		}

		// Now try to deserialize all nodes from the cache
		await restoreFromCache();

		// Set manufacturer information for the controller node
		const controllerValueDB = this.valueDB;
		controllerValueDB.setMetadata(
			getManufacturerIdValueId(),
			getManufacturerIdValueMetadata(),
		);
		controllerValueDB.setMetadata(
			getProductTypeValueId(),
			getProductTypeValueMetadata(),
		);
		controllerValueDB.setMetadata(
			getProductIdValueId(),
			getProductIdValueMetadata(),
		);
		controllerValueDB.setValue(
			getManufacturerIdValueId(),
			this._manufacturerId,
		);
		controllerValueDB.setValue(getProductTypeValueId(), this._productType);
		controllerValueDB.setValue(getProductIdValueId(), this._productId);

		// Set firmware version information for the controller node
		controllerValueDB.setMetadata(
			getFirmwareVersionsValueId(),
			getFirmwareVersionsMetadata(),
		);
		controllerValueDB.setValue(getFirmwareVersionsValueId(), [
			this._firmwareVersion,
		]);
		controllerValueDB.setMetadata(
			getSDKVersionValueId(),
			getSDKVersionMetadata(),
		);
		controllerValueDB.setValue(getSDKVersionValueId(), this._sdkVersion);

		if (
			this.type !== ZWaveLibraryTypes["Bridge Controller"] &&
			this.isFunctionSupported(FunctionType.SetSerialApiTimeouts)
		) {
			const { ack, byte } = this.driver.options.timeouts;
			this.driver.controllerLog.print(
				`setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`,
			);
			const resp =
				await this.driver.sendMessage<SetSerialApiTimeoutsResponse>(
					new SetSerialApiTimeoutsRequest(this.driver, {
						ackTimeout: ack,
						byteTimeout: byte,
					}),
				);
			this.driver.controllerLog.print(
				`serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`,
			);
		}

		this.driver.controllerLog.print("Interview completed");
	}

	private createValueDBForNode(nodeId: number, ownKeys?: Set<string>) {
		return new ValueDB(
			nodeId,
			this.driver.valueDB!,
			this.driver.metadataDB!,
			ownKeys,
		);
	}

	/**
	 * Sets the NIF of the controller to the Gateway device type and to include the CCs supported by Z-Wave JS.
	 * Warning: This only works when followed up by a hard-reset, so don't call this directly
	 * @internal
	 */
	public async setControllerNIF(): Promise<void> {
		this.driver.controllerLog.print("Updating the controller NIF...");
		await this.driver.sendMessage(
			new SetApplicationNodeInformationRequest(this.driver, {
				isListening: true,
				...determineNIF(),
			}),
		);
	}

	/**
	 * Performs a hard reset on the controller. This wipes out all configuration!
	 * Warning: The driver needs to re-interview the controller, so don't call this directly
	 * @internal
	 */
	public async hardReset(): Promise<void> {
		// begin the reset process
		try {
			this.driver.controllerLog.print("performing hard reset...");
			await this.driver.sendMessage(new HardResetRequest(this.driver), {
				supportCheck: false,
			});

			this.driver.controllerLog.print(`hard reset succeeded`);
			// Clean up
			this._nodes.forEach((node) => node.removeAllListeners());
			this._nodes.clear();
		} catch (e) {
			this.driver.controllerLog.print(
				`hard reset failed: ${getErrorMessage(e)}`,
				"error",
			);
			throw e;
		}
	}

	private _inclusionState: InclusionState = InclusionState.Idle;
	public get inclusionState(): InclusionState {
		return this._inclusionState;
	}

	/** @internal */
	public setInclusionState(state: InclusionState): void {
		if (this._inclusionState === state) return;
		this._inclusionState = state;
		if (
			state === InclusionState.Idle &&
			this._smartStartEnabled &&
			this.supportsFeature(ZWaveFeature.SmartStart)
		) {
			// If Smart Start was enabled before the inclusion/exclusion,
			// enable it again and ignore errors

			// eslint-disable-next-line @typescript-eslint/no-empty-function
			this.enableSmartStart().catch(() => {});
		}
	}

	private _smartStartEnabled: boolean = false;

	private _includeController: boolean = false;
	private _unprovisionRemovedNode: boolean | "inactive" = false;

	private _inclusionOptions: InclusionOptionsInternal | undefined;
	private _nodePendingInclusion: ZWaveNode | undefined;
	private _nodePendingExclusion: ZWaveNode | undefined;
	private _nodePendingReplace: ZWaveNode | undefined;
	private _replaceFailedPromise: DeferredPromise<boolean> | undefined;

	/**
	 * Starts the inclusion process of new nodes.
	 * Resolves to true when the process was started, and false if the inclusion was already active.
	 *
	 * @param options Defines the inclusion strategy to use.
	 */
	public async beginInclusion(options: InclusionOptions): Promise<boolean>;

	/**
	 * Starts the inclusion process of new nodes.
	 * Resolves to true when the process was started, and false if the inclusion was already active.
	 *
	 * @param includeNonSecure Whether the new node should be included non-securely, even if it supports Security S0. By default, S0 will be used.
	 * @deprecated Use the overload with options instead
	 */
	public async beginInclusion(includeNonSecure?: boolean): Promise<boolean>;

	public async beginInclusion(
		options?: InclusionOptions | boolean,
	): Promise<boolean> {
		if (
			this._inclusionState === InclusionState.Including ||
			this._inclusionState === InclusionState.Excluding ||
			this._inclusionState === InclusionState.Busy
		) {
			return false;
		}

		if (options == undefined) {
			options = {
				strategy: InclusionStrategy.Security_S0,
			};
		} else if (typeof options === "boolean") {
			options = {
				strategy: options
					? InclusionStrategy.Insecure
					: InclusionStrategy.Security_S0,
			};
		}

		// Protect against invalid inclusion options
		if (
			!(options.strategy in InclusionStrategy) ||
			// @ts-expect-error We're checking for user errors
			options.strategy === InclusionStrategy.SmartStart
		) {
			throw new ZWaveError(
				`Invalid inclusion strategy: ${options.strategy}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Leave SmartStart listening mode so we can switch to exclusion mode
		await this.pauseSmartStart();

		this.setInclusionState(InclusionState.Including);
		this._inclusionOptions = options;

		try {
			this.driver.controllerLog.print(
				`Starting inclusion process with strategy ${getEnumMemberName(
					InclusionStrategy,
					options.strategy,
				)}...`,
			);

			// kick off the inclusion process
			await this.driver.sendMessage(
				new AddNodeToNetworkRequest(this.driver, {
					addNodeType: AddNodeType.Any,
					highPower: true,
					networkWide: true,
				}),
			);

			this.driver.controllerLog.print(
				`The controller is now ready to add nodes`,
			);

			this.emit(
				"inclusion started",
				// TODO: Remove first parameter in next major version
				options.strategy !== InclusionStrategy.Insecure,
				options.strategy,
			);
		} catch (e) {
			this.setInclusionState(InclusionState.Idle);
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Controller_CallbackNOK
			) {
				this.driver.controllerLog.print(
					`Starting the inclusion failed`,
					"error",
				);
				throw new ZWaveError(
					"The inclusion could not be started.",
					ZWaveErrorCodes.Controller_InclusionFailed,
				);
			}
			throw e;
		}

		return true;
	}

	/** @internal */
	public async beginInclusionSmartStart(
		provisioningEntry: PlannedProvisioningEntry,
	): Promise<boolean> {
		if (
			this._inclusionState === InclusionState.Including ||
			this._inclusionState === InclusionState.Excluding ||
			this._inclusionState === InclusionState.Busy
		) {
			return false;
		}

		// Disable listening mode so we can switch to inclusion mode
		await this.stopInclusion();

		this.setInclusionState(InclusionState.Including);
		this._inclusionOptions = {
			strategy: InclusionStrategy.SmartStart,
			provisioning: provisioningEntry,
		};

		try {
			this.driver.controllerLog.print(
				`Including SmartStart node with DSK ${provisioningEntry.dsk}`,
			);

			// kick off the inclusion process
			const dskBuffer = dskFromString(provisioningEntry.dsk);
			await this.driver.sendMessage(
				new AddNodeDSKToNetworkRequest(this.driver, {
					nwiHomeId: nwiHomeIdFromDSK(dskBuffer),
					authHomeId: authHomeIdFromDSK(dskBuffer),
					highPower: true,
					networkWide: true,
				}),
			);

			this.emit(
				"inclusion started",
				// TODO: Remove first parameter in next major version
				true,
				InclusionStrategy.SmartStart,
			);
		} catch (e) {
			this.setInclusionState(InclusionState.Idle);
			// Error handling for this happens at the call site
			throw e;
		}

		return true;
	}

	/**
	 * Is used internally to stop an active inclusion process without waiting for a confirmation
	 * @internal
	 */
	public async stopInclusionNoCallback(): Promise<void> {
		await this.driver.sendMessage(
			new AddNodeToNetworkRequest(this.driver, {
				callbackId: 0, // disable callbacks
				addNodeType: AddNodeType.Stop,
				highPower: true,
				networkWide: true,
			}),
		);
		this.driver.controllerLog.print(`The inclusion process was stopped`);
		this.emit("inclusion stopped");
	}

	/**
	 * Finishes an inclusion process. This must only be called after the ProtocolDone status is received.
	 * Returns the ID of the newly added node.
	 */
	private async finishInclusion(): Promise<number> {
		this.driver.controllerLog.print(`finishing inclusion process...`);

		const response =
			await this.driver.sendMessage<AddNodeToNetworkRequestStatusReport>(
				new AddNodeToNetworkRequest(this.driver, {
					addNodeType: AddNodeType.Stop,
					highPower: true,
					networkWide: true,
				}),
			);
		if (response.status === AddNodeStatus.Done) {
			return response.statusContext!.nodeId;
		}

		this.driver.controllerLog.print(
			`Finishing the inclusion failed`,
			"error",
		);
		throw new ZWaveError(
			"Finishing the inclusion failed",
			ZWaveErrorCodes.Controller_InclusionFailed,
		);
	}

	/**
	 * Stops an active inclusion process. Resolves to true when the controller leaves inclusion mode,
	 * and false if the inclusion was not active.
	 */
	public async stopInclusion(): Promise<boolean> {
		if (this._inclusionState !== InclusionState.Including) {
			return false;
		}

		this.driver.controllerLog.print(`stopping inclusion process...`);

		try {
			// stop the inclusion process
			await this.driver.sendMessage(
				new AddNodeToNetworkRequest(this.driver, {
					addNodeType: AddNodeType.Stop,
					highPower: true,
					networkWide: true,
				}),
			);
			this.driver.controllerLog.print(
				`The inclusion process was stopped`,
			);
			this.emit("inclusion stopped");
			this.setInclusionState(InclusionState.Idle);
			return true;
		} catch (e) {
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Controller_CallbackNOK
			) {
				this.driver.controllerLog.print(
					`Stopping the inclusion failed`,
					"error",
				);
				throw new ZWaveError(
					"The inclusion could not be stopped.",
					ZWaveErrorCodes.Controller_InclusionFailed,
				);
			}
			throw e;
		}
	}

	/**
	 * Puts the controller into listening mode for Smart Start inclusion.
	 * Whenever a node on the provisioning list announces itself, it will automatically be added.
	 *
	 * Resolves to `true` when the listening mode is started or was active, and `false` if it is scheduled for later activation.
	 */
	private async enableSmartStart(): Promise<boolean> {
		if (!this.supportsFeature(ZWaveFeature.SmartStart)) {
			this.driver.controllerLog.print(
				`Smart Start is not supported by this controller, NOT enabling listening mode...`,
				"warn",
			);
		}

		this._smartStartEnabled = true;

		if (this._inclusionState === InclusionState.Idle) {
			this.setInclusionState(InclusionState.SmartStart);

			this.driver.controllerLog.print(
				`Enabling Smart Start listening mode...`,
			);
			try {
				await this.driver.sendMessage(
					new EnableSmartStartListenRequest(this.driver, {}),
				);
				this.driver.controllerLog.print(
					`Smart Start listening mode enabled`,
				);
				return true;
			} catch (e) {
				this.setInclusionState(InclusionState.Idle);
				this.driver.controllerLog.print(
					`Smart Start listening mode could not be enabled: ${getErrorMessage(
						e,
					)}`,
					"error",
				);
				throw e;
			}
		} else if (this._inclusionState === InclusionState.SmartStart) {
			return true;
		} else {
			this.driver.controllerLog.print(
				`Smart Start listening mode scheduled for later activation...`,
			);
			return false;
		}
	}

	/**
	 * Disables the listening mode for Smart Start inclusion.
	 *
	 * Resolves to `true` when the listening mode is stopped, and `false` if was not active.
	 */
	private async disableSmartStart(): Promise<boolean> {
		if (!this.supportsFeature(ZWaveFeature.SmartStart)) return true;
		this._smartStartEnabled = false;

		if (this._inclusionState === InclusionState.SmartStart) {
			this.setInclusionState(InclusionState.Idle);
			this.driver.controllerLog.print(
				`disabling Smart Start listening mode...`,
			);
			try {
				await this.driver.sendMessage(
					new AddNodeToNetworkRequest(this.driver, {
						callbackId: 0, // disable callbacks
						addNodeType: AddNodeType.Stop,
						highPower: true,
						networkWide: true,
					}),
				);
				this.driver.controllerLog.print(
					`Smart Start listening mode disabled`,
				);
				return true;
			} catch (e) {
				this.setInclusionState(InclusionState.SmartStart);
				this.driver.controllerLog.print(
					`Smart Start listening mode could not be disabled: ${getErrorMessage(
						e,
					)}`,
					"error",
				);
				throw e;
			}
		} else if (this._inclusionState === InclusionState.Idle) {
			return true;
		} else {
			this.driver.controllerLog.print(
				`Smart Start listening mode disabled`,
			);
			return true;
		}
	}

	private async pauseSmartStart(): Promise<boolean> {
		if (!this.supportsFeature(ZWaveFeature.SmartStart)) return true;

		if (this._inclusionState === InclusionState.SmartStart) {
			this.driver.controllerLog.print(
				`Leaving Smart Start listening mode...`,
			);
			try {
				await this.driver.sendMessage(
					new AddNodeToNetworkRequest(this.driver, {
						callbackId: 0, // disable callbacks
						addNodeType: AddNodeType.Stop,
						highPower: true,
						networkWide: true,
					}),
				);
				this.driver.controllerLog.print(
					`Left Smart Start listening mode`,
				);
				return true;
			} catch (e) {
				this.driver.controllerLog.print(
					`Smart Start listening mode could not be left: ${getErrorMessage(
						e,
					)}`,
					"error",
				);
				throw e;
			}
		} else {
			return true;
		}
	}

	/**
	 * Starts the exclusion process of new nodes.
	 * Resolves to true when the process was started, and false if an inclusion or exclusion process was already active.
	 *
	 * @param unprovision Whether the removed node should also be removed from the Smart Start provisioning list.
	 * A value of `"inactive"` will keep the provisioning entry, but disable it.
	 */
	public async beginExclusion(
		unprovision: boolean | "inactive" = false,
	): Promise<boolean> {
		if (
			this._inclusionState === InclusionState.Including ||
			this._inclusionState === InclusionState.Excluding ||
			this._inclusionState === InclusionState.Busy
		) {
			return false;
		}

		// Leave SmartStart listening mode so we can switch to exclusion mode
		await this.pauseSmartStart();

		this.setInclusionState(InclusionState.Excluding);
		this.driver.controllerLog.print(`starting exclusion process...`);

		try {
			// kick off the inclusion process
			await this.driver.sendMessage(
				new RemoveNodeFromNetworkRequest(this.driver, {
					removeNodeType: RemoveNodeType.Any,
					highPower: true,
					networkWide: true,
				}),
			);
			this.driver.controllerLog.print(
				`The controller is now ready to remove nodes`,
			);
			this._unprovisionRemovedNode = unprovision;
			this.emit("exclusion started");
			return true;
		} catch (e) {
			this.setInclusionState(InclusionState.Idle);
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Controller_CallbackNOK
			) {
				this.driver.controllerLog.print(
					`Starting the exclusion failed`,
					"error",
				);
				throw new ZWaveError(
					"The exclusion could not be started.",
					ZWaveErrorCodes.Controller_ExclusionFailed,
				);
			}
			throw e;
		}
	}

	/**
	 * Is used internally to stop an active exclusion process without waiting for confirmation
	 * @internal
	 */
	public async stopExclusionNoCallback(): Promise<void> {
		await this.driver.sendMessage(
			new RemoveNodeFromNetworkRequest(this.driver, {
				callbackId: 0, // disable callbacks
				removeNodeType: RemoveNodeType.Stop,
				highPower: true,
				networkWide: true,
			}),
		);
		this.driver.controllerLog.print(`the exclusion process was stopped`);
		this.emit("exclusion stopped");
	}

	/**
	 * Stops an active exclusion process. Resolves to true when the controller leaves exclusion mode,
	 * and false if the inclusion was not active.
	 */
	public async stopExclusion(): Promise<boolean> {
		if (this._inclusionState !== InclusionState.Excluding) {
			return false;
		}

		this.driver.controllerLog.print(`stopping exclusion process...`);

		try {
			// kick off the inclusion process
			await this.driver.sendMessage(
				new RemoveNodeFromNetworkRequest(this.driver, {
					removeNodeType: RemoveNodeType.Stop,
					highPower: true,
					networkWide: true,
				}),
			);
			this.driver.controllerLog.print(
				`the exclusion process was stopped`,
			);
			this.emit("exclusion stopped");
			this.setInclusionState(InclusionState.Idle);
			return true;
		} catch (e) {
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Controller_CallbackNOK
			) {
				this.driver.controllerLog.print(
					`Stopping the exclusion failed`,
					"error",
				);
				throw new ZWaveError(
					"The exclusion could not be stopped.",
					ZWaveErrorCodes.Controller_ExclusionFailed,
				);
			}
			throw e;
		}
	}

	private async secureBootstrapS0(
		node: ZWaveNode,
		assumeSupported: boolean = false,
	): Promise<void> {
		// When bootstrapping with S0, no other keys are granted
		for (const secClass of securityClassOrder) {
			if (secClass !== SecurityClass.S0_Legacy) {
				node.securityClasses.set(secClass, false);
			}
		}

		if (!this.driver.securityManager) {
			// Remember that the node was NOT granted the S0 security class
			node.securityClasses.set(SecurityClass.S0_Legacy, false);
			return;
		}

		// If security has been set up and we are allowed to include the node securely, try to do it
		try {
			// When replacing a node, we receive no NIF, so we cannot know that the Security CC is supported.
			// Querying the node info however kicks some devices out of secure inclusion mode.
			// Therefore we must assume that the node supports Security in order to support replacing a node securely
			if (assumeSupported && !node.supportsCC(CommandClasses.Security)) {
				node.addCC(CommandClasses.Security, {
					secure: true,
					isSupported: true,
					version: 1,
				});
			}

			// SDS13783 - impose a 10s timeout on each message
			const api = node.commandClasses.Security.withOptions({
				expire: 10000,
			});
			// Request security scheme, because it is required by the specs
			await api.getSecurityScheme(); // ignore the result

			// Request nonce separately, so we can impose a timeout
			await api.getNonce();

			// send the network key
			await api.setNetworkKey(this.driver.securityManager.networkKey);

			if (this._includeController) {
				// Tell the controller which security scheme to use
				await api.inheritSecurityScheme();
			}

			// Remember that the node was granted the S0 security class
			node.securityClasses.set(SecurityClass.S0_Legacy, true);
		} catch (e) {
			let errorMessage = `Security S0 bootstrapping failed, the node was not granted the S0 security class`;
			if (!isZWaveError(e)) {
				errorMessage += `: ${e as any}`;
			} else if (e.code === ZWaveErrorCodes.Controller_MessageExpired) {
				errorMessage += ": a secure inclusion timer has elapsed.";
			} else if (
				e.code !== ZWaveErrorCodes.Controller_MessageDropped &&
				e.code !== ZWaveErrorCodes.Controller_NodeTimeout
			) {
				errorMessage += `: ${e.message}`;
			}
			this.driver.controllerLog.logNode(node.id, errorMessage, "warn");
			// Remember that the node was NOT granted the S0 security class
			node.securityClasses.set(SecurityClass.S0_Legacy, false);
			node.removeCC(CommandClasses.Security);
		}
	}

	private _bootstrappingS2NodeId: number | undefined;
	/**
	 * @internal
	 * Returns which node is currently being bootstrapped with S2
	 */
	public get bootstrappingS2NodeId(): number | undefined {
		return this._bootstrappingS2NodeId;
	}

	private cancelBootstrapS2Promise: DeferredPromise<KEXFailType> | undefined;
	public cancelSecureBootstrapS2(reason: KEXFailType): void {
		if (this.cancelBootstrapS2Promise) {
			this.cancelBootstrapS2Promise.resolve(reason);
			this.cancelBootstrapS2Promise = undefined;
		}
	}

	private async secureBootstrapS2(
		node: ZWaveNode,
		assumeSupported: boolean = false,
	): Promise<void> {
		const unGrantSecurityClasses = () => {
			for (const secClass of securityClassOrder) {
				node.securityClasses.set(secClass, false);
			}
		};

		if (!this.driver.securityManager2) {
			// Remember that the node was NOT granted any S2 security classes
			unGrantSecurityClasses();
			return;
		}

		// When replacing a node, we receive no NIF, so we cannot know that the Security CC is supported.
		// Querying the node info however kicks some devices out of secure inclusion mode.
		// Therefore we must assume that the node supports Security in order to support replacing a node securely
		if (assumeSupported && !node.supportsCC(CommandClasses["Security 2"])) {
			node.addCC(CommandClasses["Security 2"], {
				secure: true,
				isSupported: true,
				version: 1,
			});
		}

		let userCallbacks: InclusionUserCallbacks;
		const inclusionOptions = this
			._inclusionOptions as InclusionOptionsInternal & {
			strategy:
				| InclusionStrategy.Security_S2
				| InclusionStrategy.SmartStart;
		};
		if ("provisioning" in inclusionOptions) {
			// SmartStart and S2 with QR code are pre-provisioned, so we don't need to ask the user for anything
			userCallbacks = {
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				abort() {},
				grantSecurityClasses: (requested) => {
					return Promise.resolve({
						clientSideAuth: false,
						securityClasses: requested.securityClasses.filter((r) =>
							inclusionOptions.provisioning.securityClasses.includes(
								r,
							),
						),
					});
				},
				validateDSKAndEnterPIN: (dsk) => {
					const fullDSK = inclusionOptions.provisioning.dsk;
					const pin = fullDSK.slice(0, 5);
					// Make sure the DSK matches
					if (pin + dsk !== fullDSK) return Promise.resolve(false);
					return Promise.resolve(pin);
				},
			};
		} else {
			// Use the provided callbacks
			userCallbacks = inclusionOptions.userCallbacks;
		}

		const deleteTempKey = () => {
			// Whatever happens, no further communication needs the temporary key
			this.driver.securityManager2?.deleteNonce(node.id);
			this.driver.securityManager2?.tempKeys.delete(node.id);
		};

		// Allow canceling the bootstrapping process
		this._bootstrappingS2NodeId = node.id;
		this.cancelBootstrapS2Promise = createDeferredPromise();

		try {
			const api = node.commandClasses["Security 2"];
			const abort = async (failType?: KEXFailType): Promise<void> => {
				if (failType != undefined) {
					try {
						await api.abortKeyExchange(failType);
					} catch {
						// ignore
					}
				}
				// Un-grant S2 security classes we might have granted
				unGrantSecurityClasses();
				deleteTempKey();
				// We're no longer bootstrapping
				this._bootstrappingS2NodeId = undefined;
				this.cancelBootstrapS2Promise = undefined;
			};

			const abortUser = () => {
				setImmediate(() => {
					try {
						userCallbacks.abort();
					} catch {
						// ignore errors in application callbacks
					}
				});
				return abort(KEXFailType.BootstrappingCanceled);
			};

			// Ask the node for its desired security classes and key exchange params
			const kexParams = await api
				.withOptions({ expire: inclusionTimeouts.TA1 })
				.getKeyExchangeParameters();
			if (!kexParams) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: did not receive the node's desired security classes.`,
					level: "warn",
				});
				return abort();
			}

			// Validate the response
			// At the time of implementation, only these are defined
			if (
				!kexParams.supportedKEXSchemes.includes(KEXSchemes.KEXScheme1)
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: No supported key exchange scheme.`,
					level: "warn",
				});
				return abort(KEXFailType.NoSupportedScheme);
			} else if (
				!kexParams.supportedECDHProfiles.includes(
					ECDHProfiles.Curve25519,
				)
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: No supported ECDH profile.`,
					level: "warn",
				});
				return abort(KEXFailType.NoSupportedCurve);
			}
			const supportedKeys = kexParams.requestedKeys.filter((k) =>
				securityClassOrder.includes(k as any),
			);
			if (!supportedKeys.length) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: None of the requested security classes are supported.`,
					level: "warn",
				});
				return abort(KEXFailType.NoKeyMatch);
			}

			// TODO: Validate client-side auth if requested
			const grantResult = await Promise.race([
				wait(inclusionTimeouts.TAI1, true).then(() => false as const),
				userCallbacks
					.grantSecurityClasses({
						securityClasses: supportedKeys,
						clientSideAuth: false,
					})
					// ignore errors in application callbacks
					.catch(() => false as const),
			]);
			if (grantResult === false) {
				// There was a timeout or the user did not confirm the request, abort
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: User rejected the requested security classes or interaction timed out.`,
					level: "warn",
				});
				return abortUser();
			}
			const grantedKeys = supportedKeys.filter((k) =>
				grantResult.securityClasses.includes(k),
			);
			if (!grantedKeys.length) {
				// The user did not grant any of the requested keys
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: None of the requested keys were granted by the user.`,
					level: "warn",
				});
				return abortUser();
			}

			// Tell the node how we want the inclusion to go and grant it the keys
			// It will send its public key in response
			await api.grantKeys({
				grantedKeys,
				permitCSA: false,
				selectedECDHProfile: ECDHProfiles.Curve25519,
				selectedKEXScheme: KEXSchemes.KEXScheme1,
			});

			const pubKeyResponse = await this.driver.waitForCommand<
				Security2CCPublicKeyReport | Security2CCKEXFail
			>(
				(cc) =>
					cc instanceof Security2CCPublicKeyReport ||
					cc instanceof Security2CCKEXFail,
				inclusionTimeouts.TA2,
			);
			if (
				pubKeyResponse instanceof Security2CCKEXFail ||
				pubKeyResponse.includingNode
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `The joining node canceled the Security S2 bootstrapping.`,
					direction: "inbound",
					level: "warn",
				});
				return abort();
			}
			const nodePublicKey = pubKeyResponse.publicKey;

			// This is the starting point of the timer TAI2.
			const timerStartTAI2 = Date.now();

			// Generate ECDH key pair. We need to immediately send the other node our public key,
			// so it won't abort bootstrapping
			const keyPair = await util.promisify(crypto.generateKeyPair)(
				"x25519",
			);
			const publicKey = decodeX25519KeyDER(
				keyPair.publicKey.export({
					type: "spki",
					format: "der",
				}),
			);
			await api.sendPublicKey(publicKey);
			// After this, the node will start sending us a KEX SET every 10 seconds.
			// We won't be able to decode it until the DSK was verified

			if (
				grantedKeys.includes(SecurityClass.S2_AccessControl) ||
				grantedKeys.includes(SecurityClass.S2_Authenticated)
			) {
				// For authenticated encryption, the DSK (first 16 bytes of the public key) is obfuscated (missing the first 2 bytes)
				// Request the user to enter the missing part as a 5-digit PIN
				const dsk = dskToString(nodePublicKey.slice(0, 16)).slice(5);

				// The time the user has to enter the PIN is limited by the timeout TAI2
				const tai2RemainingMs =
					inclusionTimeouts.TAI2 - (Date.now() - timerStartTAI2);

				const pinResult = await Promise.race([
					wait(tai2RemainingMs, true).then(() => false as const),
					userCallbacks
						.validateDSKAndEnterPIN(dsk)
						// ignore errors in application callbacks
						.catch(() => false as const),
				]);
				if (
					typeof pinResult !== "string" ||
					!/^\d{5}$/.test(pinResult)
				) {
					// There was a timeout, the user did not confirm the DSK or entered an invalid PIN
					this.driver.controllerLog.logNode(node.id, {
						message: `Security S2 bootstrapping failed: User rejected the DSK, entered an invalid PIN or the interaction timed out.`,
						level: "warn",
					});
					return abortUser();
				}

				// Fill in the missing two bytes of the public key
				nodePublicKey.writeUInt16BE(parseInt(pinResult, 10), 0);
			}

			// After the user has verified the DSK, we can derive the shared secret
			// Z-Wave works with the "raw" keys, so this is a tad complicated
			const sharedSecret = crypto.diffieHellman({
				publicKey: crypto.createPublicKey({
					key: encodeX25519KeyDERSPKI(nodePublicKey),
					format: "der",
					type: "spki",
				}),
				privateKey: keyPair.privateKey,
			});

			// Derive temporary key from ECDH key pair - this will allow us to receive the node's KEX SET commands
			const tempKeys = deriveTempKeys(
				computePRK(sharedSecret, publicKey, nodePublicKey),
			);
			this.driver.securityManager2.deleteNonce(node.id);
			this.driver.securityManager2.tempKeys.set(node.id, {
				keyCCM: tempKeys.tempKeyCCM,
				personalizationString: tempKeys.tempPersonalizationString,
			});

			// Now wait for the next KEXSet from the node (if there is even time left)
			const tai2RemainingMs =
				inclusionTimeouts.TAI2 - (Date.now() - timerStartTAI2);
			if (tai2RemainingMs < 1) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: a secure inclusion timer has elapsed`,
					level: "warn",
				});
				return abortUser();
			}

			const keySetEcho = await Promise.race([
				this.driver.waitForCommand<
					Security2CCKEXSet | Security2CCKEXFail
				>(
					(cc) =>
						cc instanceof Security2CCKEXSet ||
						cc instanceof Security2CCKEXFail,
					tai2RemainingMs,
				),
				this.cancelBootstrapS2Promise,
			]);
			if (typeof keySetEcho === "number") {
				// The bootstrapping process was canceled - this is most likely because the PIN was incorrect
				// and the node's commands cannot be decoded
				return abort(keySetEcho);
			}
			// Validate that the received command contains the correct list of keys
			if (keySetEcho instanceof Security2CCKEXFail || !keySetEcho.echo) {
				this.driver.controllerLog.logNode(node.id, {
					message: `The joining node canceled the Security S2 bootstrapping.`,
					direction: "inbound",
					level: "warn",
				});
				return abort();
			} else if (
				keySetEcho.grantedKeys.length !== grantedKeys.length ||
				!keySetEcho.grantedKeys.every((k) => grantedKeys.includes(k))
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: Granted key mismatch.`,
					level: "warn",
				});
				return abort(KEXFailType.WrongSecurityLevel);
			}
			// Confirm the keys - the node will start requesting the granted keys in response
			await api.confirmGrantedKeys({
				requestCSA: kexParams.requestCSA,
				requestedKeys: [...kexParams.requestedKeys],
				supportedECDHProfiles: [...kexParams.supportedECDHProfiles],
				supportedKEXSchemes: [...kexParams.supportedKEXSchemes],
			});

			for (let i = 0; i < grantedKeys.length; i++) {
				// Wait for the key request
				const keyRequest = await this.driver.waitForCommand<
					Security2CCNetworkKeyGet | Security2CCKEXFail
				>(
					(cc) =>
						cc instanceof Security2CCNetworkKeyGet ||
						cc instanceof Security2CCKEXFail,
					inclusionTimeouts.TA3,
				);
				if (keyRequest instanceof Security2CCKEXFail) {
					this.driver.controllerLog.logNode(node.id, {
						message: `The joining node canceled the Security S2 bootstrapping.`,
						direction: "inbound",
						level: "warn",
					});
					return abort();
				}

				const securityClass = keyRequest.requestedKey;
				// Ensure it was received encrypted with the temporary key
				if (
					!this.driver.securityManager2.hasUsedSecurityClass(
						node.id,
						SecurityClass.Temporary,
					)
				) {
					this.driver.controllerLog.logNode(node.id, {
						message: `Security S2 bootstrapping failed: Node used wrong key to communicate.`,
						level: "warn",
					});
					return abort(KEXFailType.WrongSecurityLevel);
				} else if (!grantedKeys.includes(securityClass)) {
					// and that the requested key is one of the granted keys
					this.driver.controllerLog.logNode(node.id, {
						message: `Security S2 bootstrapping failed: Node used key it was not granted.`,
						level: "warn",
					});
					return abort(KEXFailType.KeyNotGranted);
				}

				// Send the node the requested key
				await api.sendNetworkKey(
					securityClass,
					this.driver.securityManager2.getKeysForSecurityClass(
						securityClass,
					).pnk,
				);
				// We need to temporarily mark this security class as granted, so the following exchange will use this
				// key for decryption
				node.securityClasses.set(securityClass, true);

				// And wait for verification
				const verify = await this.driver.waitForCommand<
					Security2CCNetworkKeyVerify | Security2CCKEXFail
				>(
					(cc) =>
						cc instanceof Security2CCNetworkKeyVerify ||
						cc instanceof Security2CCKEXFail,
					inclusionTimeouts.TA4,
				);
				if (verify instanceof Security2CCKEXFail) {
					this.driver.controllerLog.logNode(node.id, {
						message: `The joining node canceled the Security S2 bootstrapping.`,
						direction: "inbound",
						level: "warn",
					});
					return abort();
				}

				if (
					!this.driver.securityManager2.hasUsedSecurityClass(
						node.id,
						securityClass,
					)
				) {
					this.driver.controllerLog.logNode(node.id, {
						message: `Security S2 bootstrapping failed: Node used wrong key to communicate.`,
						level: "warn",
					});
					return abort(KEXFailType.NoVerify);
				}

				// Tell the node that verification was successful. We need to reset the SPAN state
				// so the temporary key will be used again. Also we don't know in which order the node requests the keys
				// so our logic to use the highest security class for decryption might be problematic. Therefore delete the
				// security class for now.
				node.securityClasses.delete(securityClass);
				this.driver.securityManager2.deleteNonce(node.id);
				await api.confirmKeyVerification();
			}

			// After all keys were sent and verified, we need to wait for the node to confirm that it is done
			const transferEnd =
				await this.driver.waitForCommand<Security2CCTransferEnd>(
					(cc) => cc instanceof Security2CCTransferEnd,
					inclusionTimeouts.TA5,
				);
			if (!transferEnd.keyRequestComplete) {
				// S2 bootstrapping failed
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: Node did not confirm completion of the key exchange`,
					level: "warn",
				});
				return abort();
			}

			// Remember all security classes we have granted
			for (const securityClass of securityClassOrder) {
				node.securityClasses.set(
					securityClass,
					grantedKeys.includes(securityClass),
				);
			}
			// Remember the DSK (first 16 bytes of the public key)
			node.dsk = nodePublicKey.slice(0, 16);

			this.driver.controllerLog.logNode(node.id, {
				message: `Security S2 bootstrapping successful with these security classes:${[
					...node.securityClasses.entries(),
				]
					.filter(([, v]) => v)
					.map(([k]) => `\n· ${getEnumMemberName(SecurityClass, k)}`)
					.join("")}`,
			});

			// success 🎉
		} catch (e) {
			let errorMessage = `Security S2 bootstrapping failed, the node was not granted any S2 security class`;
			if (!isZWaveError(e)) {
				errorMessage += `: ${e as any}`;
			} else if (e.code === ZWaveErrorCodes.Controller_MessageExpired) {
				errorMessage += ": a secure inclusion timer has elapsed.";
			} else if (
				e.code !== ZWaveErrorCodes.Controller_MessageDropped &&
				e.code !== ZWaveErrorCodes.Controller_NodeTimeout
			) {
				errorMessage += `: ${e.message}`;
			}
			this.driver.controllerLog.logNode(node.id, errorMessage, "warn");
			// Remember that the node was NOT granted any S2 security classes
			unGrantSecurityClasses();
			node.removeCC(CommandClasses["Security 2"]);
		} finally {
			// Whatever happens, no further communication needs the temporary key
			deleteTempKey();
			// And we're no longer bootstrapping
			this._bootstrappingS2NodeId = undefined;
			this.cancelBootstrapS2Promise = undefined;
		}
	}

	/** Ensures that the node knows where to reach the controller */
	private async bootstrapLifelineAndWakeup(node: ZWaveNode): Promise<void> {
		// If the node was bootstrapped with S2, all these requests must happen securely
		if (securityClassIsS2(node.getHighestSecurityClass())) {
			for (const cc of [
				CommandClasses["Wake Up"],
				CommandClasses.Association,
				CommandClasses["Multi Channel Association"],
				CommandClasses.Version,
			]) {
				if (node.supportsCC(cc)) {
					node.addCC(cc, { secure: true });
				}
			}
		}

		if (node.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
			// SDS11846: The Z-Wave+ lifeline must be assigned to a node as the very first thing
			if (
				node.supportsCC(CommandClasses.Association) ||
				node.supportsCC(CommandClasses["Multi Channel Association"])
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Configuring Z-Wave+ Lifeline association...`,
					direction: "none",
				});
				const ownNodeId = this.driver.controller.ownNodeId!;

				try {
					if (node.supportsCC(CommandClasses.Association)) {
						await node.commandClasses.Association.addNodeIds(
							1,
							ownNodeId,
						);
					} else {
						await node.commandClasses[
							"Multi Channel Association"
						].addDestinations({
							groupId: 1,
							endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
						});
					}

					// After setting the association, make sure the node knows how to reach us
					await this.assignReturnRoute(node.id, ownNodeId);
				} catch (e) {
					if (isTransmissionError(e) || isRecoverableZWaveError(e)) {
						this.driver.controllerLog.logNode(node.id, {
							message: `Failed to configure Z-Wave+ Lifeline association: ${e.message}`,
							direction: "none",
							level: "warn",
						});
					} else {
						throw e;
					}
				}
			} else {
				this.driver.controllerLog.logNode(node.id, {
					message: `Cannot configure Z-Wave+ Lifeline association: Node does not support associations...`,
					direction: "none",
					level: "warn",
				});
			}
		}

		if (node.supportsCC(CommandClasses["Wake Up"])) {
			try {
				// Query the version, so we can setup the wakeup destination correctly.
				let supportedVersion: number | undefined;
				if (node.supportsCC(CommandClasses.Version)) {
					supportedVersion =
						await node.commandClasses.Version.getCCVersion(
							CommandClasses["Wake Up"],
						);
				}
				// If querying the version can't be done, we should at least assume that it supports V1
				supportedVersion ??= 1;
				if (supportedVersion > 0) {
					node.addCC(CommandClasses["Wake Up"], {
						version: supportedVersion,
					});
					const instance = node.createCCInstance(
						CommandClasses["Wake Up"],
					)!;
					await instance.interview(this.driver);
				}
			} catch (e) {
				if (isTransmissionError(e) || isRecoverableZWaveError(e)) {
					this.driver.controllerLog.logNode(node.id, {
						message: `Cannot configure wakeup destination: ${e.message}`,
						direction: "none",
						level: "warn",
					});
				} else {
					// we want to pass all other errors through
					throw e;
				}
			}
		}
	}

	/**
	 * Is called when an AddNode request is received from the controller.
	 * Handles and controls the inclusion process.
	 */
	private async handleAddNodeStatusReport(
		msg: AddNodeToNetworkRequestStatusReport,
	): Promise<boolean> {
		this.driver.controllerLog.print(
			`handling add node request (status = ${AddNodeStatus[msg.status]})`,
		);

		if (
			this._inclusionState !== InclusionState.Including ||
			this._inclusionOptions == undefined
		) {
			this.driver.controllerLog.print(
				`  inclusion is NOT active, ignoring it...`,
			);
			return true; // Don't invoke any more handlers
		}

		switch (msg.status) {
			case AddNodeStatus.Failed:
				// This code is handled elsewhere for starting the inclusion, so this means
				// that adding a node failed
				this.driver.controllerLog.print(
					`Adding the node failed`,
					"error",
				);
				this.emit("inclusion failed");

				// in any case, stop the inclusion process so we don't accidentally add another node
				try {
					await this.stopInclusion();
				} catch {
					/* ok */
				}
				return true; // Don't invoke any more handlers
			case AddNodeStatus.AddingController:
				this._includeController = true;
			// fall through!
			case AddNodeStatus.AddingSlave: {
				// this is called when a new node is added
				this._nodePendingInclusion = new ZWaveNode(
					msg.statusContext!.nodeId,
					this.driver,
					new DeviceClass(
						this.driver.configManager,
						msg.statusContext!.basic!,
						msg.statusContext!.generic!,
						msg.statusContext!.specific!,
					),
					msg.statusContext!.supportedCCs,
					msg.statusContext!.controlledCCs,
					// Create an empty value DB and specify that it contains no values
					// to avoid indexing the existing values
					this.createValueDBForNode(
						msg.statusContext!.nodeId,
						new Set(),
					),
				);
				// TODO: According to INS13954, there are several more steps and different timeouts when including a controller
				// For now do the absolute minimum - that is include the controller
				return true; // Don't invoke any more handlers
			}
			case AddNodeStatus.ProtocolDone: {
				// this is called after a new node is added
				// stop the inclusion process so we don't accidentally add another node
				let nodeId: number | undefined;
				try {
					nodeId = await this.finishInclusion();
				} catch {
					// ignore the error
				}

				// It is recommended to send another STOP command to the controller
				try {
					await this.stopInclusionNoCallback();
				} catch {
					// ignore the error
				}

				if (!nodeId || !this._nodePendingInclusion) {
					// The inclusion did not succeed
					this.setInclusionState(InclusionState.Idle);
					this._nodePendingInclusion = undefined;
					return true;
				} else if (nodeId === NODE_ID_BROADCAST) {
					// No idea how this can happen but it dit at least once
					this.driver.controllerLog.print(
						`Cannot add a node with the Node ID ${NODE_ID_BROADCAST}, aborting...`,
						"warn",
					);
					this.setInclusionState(InclusionState.Idle);
					this._nodePendingInclusion = undefined;
					return true;
				}

				// We're technically done with the inclusion but should not include
				// anything else until the node has been bootstrapped
				this.setInclusionState(InclusionState.Busy);

				// Inclusion is now completed, bootstrap the node
				const newNode = this._nodePendingInclusion;
				const supportedCommandClasses = [
					...newNode.implementedCommandClasses.entries(),
				]
					.filter(([, info]) => info.isSupported)
					.map(([cc]) => cc);
				const controlledCommandClasses = [
					...newNode.implementedCommandClasses.entries(),
				]
					.filter(([, info]) => info.isControlled)
					.map(([cc]) => cc);
				this.driver.controllerLog.print(
					`finished adding node ${newNode.id}:
  basic device class:    ${newNode.deviceClass?.basic.label}
  generic device class:  ${newNode.deviceClass?.generic.label}
  specific device class: ${newNode.deviceClass?.specific.label}
  supported CCs: ${supportedCommandClasses
		.map((cc) => `\n  · ${CommandClasses[cc]} (${num2hex(cc)})`)
		.join("")}
  controlled CCs: ${controlledCommandClasses
		.map((cc) => `\n  · ${CommandClasses[cc]} (${num2hex(cc)})`)
		.join("")}`,
				);
				// remember the node
				this._nodes.set(newNode.id, newNode);
				this._nodePendingInclusion = undefined;

				// We're communicating with the device, so assume it is alive
				// If it is actually a sleeping device, it will be marked as such later
				newNode.markAsAlive();

				// Assign SUC return route to make sure the node knows where to get its routes from
				newNode.hasSUCReturnRoute = await this.assignSUCReturnRoute(
					newNode.id,
				);

				const opts = this._inclusionOptions;
				// The default inclusion strategy is: Use S2 if possible, only use S0 if necessary, use no encryption otherwise
				let lowSecurity = false;
				if (
					newNode.supportsCC(CommandClasses["Security 2"]) &&
					(opts.strategy === InclusionStrategy.Default ||
						opts.strategy === InclusionStrategy.Security_S2 ||
						opts.strategy === InclusionStrategy.SmartStart)
				) {
					await this.secureBootstrapS2(newNode);
					const actualSecurityClass =
						newNode.getHighestSecurityClass();
					if (
						actualSecurityClass == undefined ||
						actualSecurityClass < SecurityClass.S2_Unauthenticated
					) {
						lowSecurity = true;
					}
				} else if (
					newNode.supportsCC(CommandClasses.Security) &&
					(opts.strategy === InclusionStrategy.Security_S0 ||
						(opts.strategy === InclusionStrategy.Default &&
							(opts.forceSecurity ||
								(
									newNode.deviceClass?.specific ??
									newNode.deviceClass?.generic
								)?.requiresSecurity)))
				) {
					await this.secureBootstrapS0(newNode);
					const actualSecurityClass =
						newNode.getHighestSecurityClass();
					if (
						actualSecurityClass == undefined ||
						actualSecurityClass < SecurityClass.S0_Legacy
					) {
						lowSecurity = true;
					}
				} else {
					// Remember that no security classes were granted
					for (const secClass of securityClassOrder) {
						newNode.securityClasses.set(secClass, false);
					}
				}
				this._includeController = false;

				// Bootstrap the node's lifelines, so it knows where the controller is
				await this.bootstrapLifelineAndWakeup(newNode);

				// We're done adding this node, notify listeners
				const result: InclusionResult = {};
				if (lowSecurity) result.lowSecurity = true;
				this.emit("node added", newNode, result);

				this.setInclusionState(InclusionState.Idle);
				return true; // Don't invoke any more handlers
			}
		}
		// not sure what to do with this message
		return false;
	}

	/**
	 * Is called when an ReplaceFailed request is received from the controller.
	 * Handles and controls the replace process.
	 */
	private async handleReplaceNodeStatusReport(
		msg: ReplaceFailedNodeRequestStatusReport,
	): Promise<boolean> {
		this.driver.controllerLog.print(
			`handling replace node request (status = ${
				ReplaceFailedNodeStatus[msg.replaceStatus]
			})`,
		);

		if (this._inclusionOptions == undefined) {
			this.driver.controllerLog.print(
				`  currently NOT replacing a node, ignoring it...`,
			);
			return true; // Don't invoke any more handlers
		}

		switch (msg.replaceStatus) {
			case ReplaceFailedNodeStatus.NodeOK:
				this.setInclusionState(InclusionState.Idle);
				this._replaceFailedPromise?.reject(
					new ZWaveError(
						`The node could not be replaced because it has responded`,
						ZWaveErrorCodes.ReplaceFailedNode_NodeOK,
					),
				);
				break;
			case ReplaceFailedNodeStatus.FailedNodeReplaceFailed:
				this.setInclusionState(InclusionState.Idle);
				this._replaceFailedPromise?.reject(
					new ZWaveError(
						`The failed node has not been replaced`,
						ZWaveErrorCodes.ReplaceFailedNode_Failed,
					),
				);
				break;
			case ReplaceFailedNodeStatus.FailedNodeReplace:
				// failed node is now ready to be replaced and controller is ready to add a new
				// node with the nodeID of the failed node
				this.driver.controllerLog.print(
					`The failed node is ready to be replaced, inclusion started...`,
				);
				this.emit(
					"inclusion started",
					// TODO: Remove first parameter in next major version
					this._inclusionOptions.strategy !==
						InclusionStrategy.Insecure,
					this._inclusionOptions.strategy,
				);
				this.setInclusionState(InclusionState.Including);
				this._replaceFailedPromise?.resolve(true);

				// stop here, don't emit inclusion failed
				return true;
			case ReplaceFailedNodeStatus.FailedNodeReplaceDone:
				this.driver.controllerLog.print(`The failed node was replaced`);
				this.emit("inclusion stopped");

				if (this._nodePendingReplace) {
					this.emit("node removed", this._nodePendingReplace, true);
					this._nodes.delete(this._nodePendingReplace.id);

					// We're technically done with the replacing but should not include
					// anything else until the node has been bootstrapped
					this.setInclusionState(InclusionState.Busy);

					// Create a fresh node instance and forget the old one
					const newNode = new ZWaveNode(
						this._nodePendingReplace.id,
						this.driver,
						undefined,
						undefined,
						undefined,
						// Create an empty value DB and specify that it contains no values
						// to avoid indexing the existing values
						this.createValueDBForNode(
							this._nodePendingReplace.id,
							new Set(),
						),
					);
					this._nodePendingReplace = undefined;
					this._nodes.set(newNode.id, newNode);

					// We're communicating with the device, so assume it is alive
					// If it is actually a sleeping device, it will be marked as such later
					newNode.markAsAlive();

					// Assign SUC return route to make sure the node knows where to get its routes from
					newNode.hasSUCReturnRoute = await this.assignSUCReturnRoute(
						newNode.id,
					);

					// Try perform the security bootstrap process. When replacing a node, we don't know any supported CCs
					// yet, so we need to trust the chosen inclusion strategy.
					const strategy = this._inclusionOptions.strategy;
					let lowSecurity = false;
					if (strategy === InclusionStrategy.Security_S2) {
						await this.secureBootstrapS2(newNode, true);
						const actualSecurityClass =
							newNode.getHighestSecurityClass();
						if (
							actualSecurityClass == undefined ||
							actualSecurityClass <
								SecurityClass.S2_Unauthenticated
						) {
							lowSecurity = true;
						}
					} else if (strategy === InclusionStrategy.Security_S0) {
						await this.secureBootstrapS0(newNode, true);
						const actualSecurityClass =
							newNode.getHighestSecurityClass();
						if (
							actualSecurityClass == undefined ||
							actualSecurityClass < SecurityClass.S0_Legacy
						) {
							lowSecurity = true;
						}
					} else {
						// Remember that no security classes were granted
						for (const secClass of securityClassOrder) {
							newNode.securityClasses.set(secClass, false);
						}
					}

					// Bootstrap the node's lifelines, so it knows where the controller is
					await this.bootstrapLifelineAndWakeup(newNode);

					// We're done adding this node, notify listeners. This also kicks off the node interview
					const result: InclusionResult = {};
					if (lowSecurity) result.lowSecurity = true;

					this.setInclusionState(InclusionState.Idle);
					this.emit("node added", newNode, result);
				}

				// stop here, don't emit inclusion failed
				return true;
		}

		this.emit("inclusion failed");

		return false; // Don't invoke any more handlers
	}

	/**
	 * Is called when a RemoveNode request is received from the controller.
	 * Handles and controls the exclusion process.
	 */
	private async handleRemoveNodeStatusReport(
		msg: RemoveNodeFromNetworkRequestStatusReport,
	): Promise<boolean> {
		this.driver.controllerLog.print(
			`handling remove node request (status = ${
				RemoveNodeStatus[msg.status]
			})`,
		);
		if (this._inclusionState !== InclusionState.Excluding) {
			this.driver.controllerLog.print(
				`  exclusion is NOT active, ignoring it...`,
			);
			return true; // Don't invoke any more handlers
		}

		switch (msg.status) {
			case RemoveNodeStatus.Failed:
				// This code is handled elsewhere for starting the exclusion, so this means
				// that removing a node failed
				this.driver.controllerLog.print(
					`Removing the node failed`,
					"error",
				);
				this.emit("exclusion failed");

				// in any case, stop the exclusion process so we don't accidentally remove another node
				try {
					await this.stopExclusion();
				} catch {
					/* ok */
				}
				return true; // Don't invoke any more handlers

			case RemoveNodeStatus.RemovingSlave:
			case RemoveNodeStatus.RemovingController: {
				// this is called when a node is removed
				this._nodePendingExclusion = this.nodes.get(
					msg.statusContext!.nodeId,
				);
				return true; // Don't invoke any more handlers
			}

			case RemoveNodeStatus.Done: {
				// this is called when the exclusion was completed
				// stop the exclusion process so we don't accidentally remove another node
				try {
					await this.stopExclusionNoCallback();
				} catch {
					/* ok */
				}

				if (!this._nodePendingExclusion) {
					// The exclusion did not succeed
					this.setInclusionState(InclusionState.Idle);
					return true;
				}

				const nodeId = this._nodePendingExclusion.id;
				this.driver.controllerLog.print(`Node ${nodeId} was removed`);

				// Avoid automatic re-inclusion using SmartStart if desired
				if (this._unprovisionRemovedNode === true) {
					this.unprovisionSmartStartNode(nodeId);
				} else if (this._unprovisionRemovedNode === "inactive") {
					const entry = this.getProvisioningEntryInternal(nodeId);
					if (entry) {
						entry.status = ProvisioningEntryStatus.Inactive;
						this.provisionSmartStartNode(entry);
					}
				}
				this._unprovisionRemovedNode = false;

				// notify listeners
				this.emit("node removed", this._nodePendingExclusion, false);
				// and forget the node
				this._nodes.delete(nodeId);
				this._nodePendingExclusion = undefined;

				this.setInclusionState(InclusionState.Idle);
				return true; // Don't invoke any more handlers
			}
		}
		// not sure what to do with this message
		return false;
	}

	private _healNetworkProgress = new Map<number, HealNodeStatus>();

	/**
	 * Performs a healing process for all alive nodes in the network,
	 * requesting updated neighbor lists and assigning fresh routes to
	 * association targets.
	 */
	public beginHealingNetwork(): boolean {
		// Don't start the process twice
		if (this._healNetworkActive) return false;
		this._healNetworkActive = true;

		this.driver.controllerLog.print(`starting network heal...`);

		// Reset all nodes to "not healed"
		this._healNetworkProgress.clear();
		for (const [id, node] of this._nodes) {
			if (id === this._ownNodeId) continue;
			if (
				// The node is known to be dead
				node.status === NodeStatus.Dead ||
				// The node is assumed asleep but has never been interviewed.
				// It is most likely dead
				(node.status === NodeStatus.Asleep &&
					node.interviewStage === InterviewStage.ProtocolInfo)
			) {
				// Don't heal dead nodes
				this.driver.controllerLog.logNode(
					id,
					`Skipping heal because the node is not responding.`,
				);
				this._healNetworkProgress.set(id, "skipped");
			} else {
				this._healNetworkProgress.set(id, "pending");
			}
		}

		// Do the heal process in the background
		void this.healNetwork().catch(() => {
			/* ignore errors */
		});

		// And update the progress once at the start
		this.emit("heal network progress", new Map(this._healNetworkProgress));

		return true;
	}

	private async healNetwork(): Promise<void> {
		const pendingNodes = new Set(
			[...this._healNetworkProgress]
				.filter(([, status]) => status === "pending")
				.map(([nodeId]) => nodeId),
		);

		const todoListening: number[] = [];
		const todoSleeping: number[] = [];

		const addTodo = (nodeId: number) => {
			if (pendingNodes.has(nodeId)) {
				pendingNodes.delete(nodeId);
				const node = this.nodes.getOrThrow(nodeId);
				if (node.canSleep) {
					this.driver.controllerLog.logNode(
						nodeId,
						"added to healing queue for sleeping nodes",
					);
					todoSleeping.push(nodeId);
				} else {
					this.driver.controllerLog.logNode(
						nodeId,
						"added to healing queue for listening nodes",
					);
					todoListening.push(nodeId);
				}
			}
		};

		// We heal outwards from the controller and start with non-sleeping nodes that are healed one by one
		try {
			const neighbors = await this.getNodeNeighbors(this._ownNodeId!);
			neighbors.forEach((id) => addTodo(id));
		} catch {
			// ignore
		}

		const doHeal = async (nodeId: number) => {
			// await the heal process for each node and treat errors as a non-successful heal
			const result = await this.healNodeInternal(nodeId).catch(
				() => false,
			);
			if (!this._healNetworkActive) return;

			// Track the success in a map
			this._healNetworkProgress.set(nodeId, result ? "done" : "failed");
			// Notify listeners about the progress
			this.emit(
				"heal network progress",
				new Map(this._healNetworkProgress),
			);

			// Figure out which nodes to heal next
			try {
				const neighbors = await this.getNodeNeighbors(nodeId);
				neighbors.forEach((id) => addTodo(id));
			} catch {
				// ignore
			}
		};

		// First try to heal as many nodes as possible one by one
		while (todoListening.length > 0) {
			const nodeId = todoListening.shift()!;
			await doHeal(nodeId);
			if (!this._healNetworkActive) return;
		}

		// We might end up with a few unconnected listening nodes, try to heal them too
		pendingNodes.forEach((nodeId) => addTodo(nodeId));
		while (todoListening.length > 0) {
			const nodeId = todoListening.shift()!;
			await doHeal(nodeId);
			if (!this._healNetworkActive) return;
		}

		// Now heal all sleeping nodes at once
		this.driver.controllerLog.print(
			"Healing sleeping nodes in parallel. Wake them up to heal.",
		);

		const tasks = todoSleeping.map((nodeId) => doHeal(nodeId));
		await Promise.all(tasks);

		// Only emit the done event when the process wasn't stopped in the meantime
		if (this._healNetworkActive) {
			this.emit("heal network done", new Map(this._healNetworkProgress));
		}
		// We're done!
		this._healNetworkActive = false;
	}

	/**
	 * Stops an network healing process. Resolves false if the process was not active, true otherwise.
	 */
	public stopHealingNetwork(): boolean {
		// don't stop it twice
		if (!this._healNetworkActive) return false;
		this._healNetworkActive = false;

		this.driver.controllerLog.print(`stopping network heal...`);

		// Cancel all transactions that were created by the healing process
		this.driver.rejectTransactions(
			(t) =>
				t.message instanceof RequestNodeNeighborUpdateRequest ||
				t.message instanceof DeleteReturnRouteRequest ||
				t.message instanceof AssignReturnRouteRequest,
		);

		return true;
	}

	/**
	 * Performs a healing process for a single alive node in the network,
	 * updating the neighbor list and assigning fresh routes to
	 * association targets.
	 *
	 * Returns `true` if the process succeeded, `false` otherwise.
	 */
	public async healNode(nodeId: number): Promise<boolean> {
		const node = this.nodes.getOrThrow(nodeId);

		// Don't start the process twice
		if (this._healNetworkActive) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Skipping individual node heal because another heal is in progress.`,
			);
			return false;
		}
		this._healNetworkActive = true;

		// Don't try to heal actually dead nodes
		if (
			// The node is known to be dead
			node.status === NodeStatus.Dead ||
			// The node is assumed asleep but has never been interviewed.
			// It is most likely dead
			(node.status === NodeStatus.Asleep &&
				node.interviewStage === InterviewStage.ProtocolInfo)
		) {
			// To avoid skipping the heal when the node has a flaky connection, ping first though
			if (!(await node.ping())) {
				this.driver.controllerLog.logNode(
					nodeId,
					`Skipping heal because the node is not responding.`,
				);
				return false;
			}
		}

		try {
			return await this.healNodeInternal(nodeId);
		} finally {
			this._healNetworkActive = false;
		}
	}

	private async healNodeInternal(nodeId: number): Promise<boolean> {
		const node = this.nodes.getOrThrow(nodeId);

		// Keep battery powered nodes awake during the healing process
		// and make sure that the flag gets reset at the end
		const keepAwake = node.keepAwake;
		try {
			node.keepAwake = true;

			this.driver.controllerLog.logNode(nodeId, {
				message: `Healing node...`,
				direction: "none",
			});

			// The healing process consists of four steps
			// Each step is tried up to 5 times before the healing process is considered failed
			const maxAttempts = 5;

			// 1. command the node to refresh its neighbor list
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				// If the process was stopped in the meantime, cancel
				if (!this._healNetworkActive) return false;

				this.driver.controllerLog.logNode(nodeId, {
					message: `refreshing neighbor list (attempt ${attempt})...`,
					direction: "outbound",
				});
				try {
					const resp =
						await this.driver.sendMessage<RequestNodeNeighborUpdateReport>(
							new RequestNodeNeighborUpdateRequest(this.driver, {
								nodeId,
							}),
						);
					if (
						resp.updateStatus ===
						NodeNeighborUpdateStatus.UpdateDone
					) {
						this.driver.controllerLog.logNode(nodeId, {
							message: "neighbor list refreshed...",
							direction: "inbound",
						});
						// this step was successful, continue with the next
						break;
					} else {
						// UpdateFailed
						this.driver.controllerLog.logNode(nodeId, {
							message: "refreshing neighbor list failed...",
							direction: "inbound",
							level: "warn",
						});
					}
				} catch (e) {
					this.driver.controllerLog.logNode(
						nodeId,
						`refreshing neighbor list failed: ${getErrorMessage(
							e,
						)}`,
						"warn",
					);
				}
				if (attempt === maxAttempts) {
					this.driver.controllerLog.logNode(nodeId, {
						message: `failed to update the neighbor list after ${maxAttempts} attempts, healing failed`,
						level: "warn",
						direction: "none",
					});
					return false;
				}
			}

			// 2. re-create the SUC return route, just in case
			if (await this.deleteSUCReturnRoute(nodeId)) {
				node.hasSUCReturnRoute = false;
			}
			node.hasSUCReturnRoute = await this.assignSUCReturnRoute(nodeId);

			// 3. delete all return routes so we can assign new ones
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				this.driver.controllerLog.logNode(nodeId, {
					message: `deleting return routes (attempt ${attempt})...`,
					direction: "outbound",
				});

				try {
					await this.driver.sendMessage(
						new DeleteReturnRouteRequest(this.driver, { nodeId }),
					);
					// this step was successful, continue with the next
					break;
				} catch (e) {
					this.driver.controllerLog.logNode(
						nodeId,
						`deleting return routes failed: ${getErrorMessage(e)}`,
						"warn",
					);
				}
				if (attempt === maxAttempts) {
					this.driver.controllerLog.logNode(nodeId, {
						message: `failed to delete return routes after ${maxAttempts} attempts, healing failed`,
						level: "warn",
						direction: "none",
					});
					return false;
				}
			}

			// 4. Assign up to 4 return routes for associations, one of which should be the controller
			let associatedNodes: number[] = [];
			const maxReturnRoutes = 4;
			try {
				associatedNodes = distinct(
					flatMap<number, AssociationAddress[]>(
						[...(this.getAssociations({ nodeId }).values() as any)],
						(assocs: AssociationAddress[]) =>
							assocs.map((a) => a.nodeId),
					),
				).sort();
			} catch {
				/* ignore */
			}
			// Always include ourselves first
			if (!associatedNodes.includes(this._ownNodeId!)) {
				associatedNodes.unshift(this._ownNodeId!);
			}
			if (associatedNodes.length > maxReturnRoutes) {
				associatedNodes = associatedNodes.slice(0, maxReturnRoutes);
			}
			this.driver.controllerLog.logNode(nodeId, {
				message: `assigning return routes to the following nodes:
${associatedNodes.join(", ")}`,
				direction: "outbound",
			});
			for (const destinationNodeId of associatedNodes) {
				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					this.driver.controllerLog.logNode(nodeId, {
						message: `assigning return route to node ${destinationNodeId} (attempt ${attempt})...`,
						direction: "outbound",
					});

					try {
						await this.driver.sendMessage(
							new AssignReturnRouteRequest(this.driver, {
								nodeId,
								destinationNodeId,
							}),
						);
						// this step was successful, continue with the next
						break;
					} catch (e) {
						this.driver.controllerLog.logNode(
							nodeId,
							`assigning return route failed: ${getErrorMessage(
								e,
							)}`,
							"warn",
						);
					}
					if (attempt === maxAttempts) {
						this.driver.controllerLog.logNode(nodeId, {
							message: `failed to assign return route after ${maxAttempts} attempts, healing failed`,
							level: "warn",
							direction: "none",
						});
						return false;
					}
				}
			}

			this.driver.controllerLog.logNode(nodeId, {
				message: `healed successfully`,
				direction: "none",
			});

			return true;
		} finally {
			node.keepAwake = keepAwake;
			if (!keepAwake) {
				setImmediate(() => {
					this.driver.debounceSendNodeToSleep(node);
				});
			}
		}
	}

	/** Configures the given Node to be SUC/SIS or not */
	public async configureSUC(
		nodeId: number,
		enableSUC: boolean,
		enableSIS: boolean,
	): Promise<boolean> {
		const result = await this.driver.sendMessage<
			Message & SuccessIndicator
		>(
			new SetSUCNodeIdRequest(this.driver, {
				sucNodeId: nodeId,
				enableSUC,
				enableSIS,
			}),
		);

		return result.isOK();
	}

	public async assignSUCReturnRoute(nodeId: number): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning SUC return route...`,
			direction: "outbound",
		});

		try {
			const result = await this.driver.sendMessage<
				Message & SuccessIndicator
			>(
				new AssignSUCReturnRouteRequest(this.driver, {
					nodeId,
				}),
			);

			return result.isOK();
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Assigning SUC return route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	public async deleteSUCReturnRoute(nodeId: number): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Deleting SUC return route...`,
			direction: "outbound",
		});

		try {
			const result = await this.driver.sendMessage<
				Message & SuccessIndicator
			>(
				new DeleteSUCReturnRouteRequest(this.driver, {
					nodeId,
				}),
			);

			return result.isOK();
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Deleting SUC return route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	public async assignReturnRoute(
		nodeId: number,
		destinationNodeId: number,
	): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning return route to node ${destinationNodeId}...`,
			direction: "outbound",
		});

		try {
			const result = await this.driver.sendMessage<
				Message & SuccessIndicator
			>(
				new AssignReturnRouteRequest(this.driver, {
					nodeId,
					destinationNodeId,
				}),
			);

			return result.isOK();
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Assigning return route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	public async deleteReturnRoute(nodeId: number): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Deleting all return routes...`,
			direction: "outbound",
		});

		try {
			const result = await this.driver.sendMessage<
				Message & SuccessIndicator
			>(
				new DeleteReturnRouteRequest(this.driver, {
					nodeId,
				}),
			);

			return result.isOK();
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Deleting return routes failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	/**
	 * Returns a dictionary of all association groups of this node or endpoint and their information.
	 * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
	 * This only works AFTER the interview process
	 */
	public getAssociationGroups(
		source: AssociationAddress,
	): ReadonlyMap<number, AssociationGroup>;

	/**
	 * Returns a dictionary of all association groups for the root device (endpoint 0) of this node.
	 *
	 * @deprecated Use the overload with `source: AssociationAddress` instead
	 */
	public getAssociationGroups(
		nodeId: number,
	): ReadonlyMap<number, AssociationGroup>;

	public getAssociationGroups(
		source: number | AssociationAddress,
	): ReadonlyMap<number, AssociationGroup> {
		const nodeId = typeof source === "number" ? source : source.nodeId;
		const endpointIndex =
			typeof source === "number" ? 0 : source.endpoint ?? 0;

		const node = this.nodes.getOrThrow(nodeId);
		const endpoint = node.getEndpointOrThrow(endpointIndex);

		// Check whether we have multi channel support or not
		let assocInstance: typeof AssociationCC;
		let mcInstance: typeof MultiChannelAssociationCC | undefined;
		if (endpoint.supportsCC(CommandClasses.Association)) {
			assocInstance = AssociationCC;
		} else {
			throw new ZWaveError(
				`Node ${nodeId}${
					endpointIndex > 0 ? `, endpoint ${endpointIndex}` : ""
				} does not support associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
			mcInstance = MultiChannelAssociationCC;
		}

		const assocGroupCount =
			assocInstance.getGroupCountCached(this.driver, endpoint) ?? 0;
		const mcGroupCount =
			mcInstance?.getGroupCountCached(this.driver, endpoint) ?? 0;
		const groupCount = Math.max(assocGroupCount, mcGroupCount);

		const ret = new Map<number, AssociationGroup>();

		if (
			endpoint.supportsCC(CommandClasses["Association Group Information"])
		) {
			// We can read all information we need from the AGI CC
			const agiInstance = AssociationGroupInfoCC;
			for (let group = 1; group <= groupCount; group++) {
				const assocConfig =
					node.deviceConfig?.getAssociationConfigForEndpoint(
						endpointIndex,
						group,
					);
				const multiChannel = !!mcInstance && group <= mcGroupCount;
				ret.set(group, {
					maxNodes:
						(multiChannel
							? mcInstance!
							: assocInstance
						).getMaxNodesCached(this.driver, endpoint, group) || 1,
					// AGI implies Z-Wave+ where group 1 is the lifeline
					isLifeline: group === 1,
					label:
						// prefer the configured label if we have one
						assocConfig?.label ??
						// the ones reported by AGI are sometimes pretty bad
						agiInstance.getGroupNameCached(
							this.driver,
							endpoint,
							group,
						) ??
						// but still better than "unnamed"
						`Unnamed group ${group}`,
					multiChannel,
					profile: agiInstance.getGroupProfileCached(
						this.driver,
						endpoint,
						group,
					),
					issuedCommands: agiInstance.getIssuedCommandsCached(
						this.driver,
						endpoint,
						group,
					),
				});
			}
		} else {
			// we need to consult the device config
			for (let group = 1; group <= groupCount; group++) {
				const assocConfig =
					node.deviceConfig?.getAssociationConfigForEndpoint(
						endpointIndex,
						group,
					);
				const multiChannel = !!mcInstance && group <= mcGroupCount;
				ret.set(group, {
					maxNodes:
						(multiChannel
							? mcInstance!
							: assocInstance
						).getMaxNodesCached(this.driver, endpoint, group) ||
						assocConfig?.maxNodes ||
						1,
					isLifeline: assocConfig?.isLifeline ?? group === 1,
					label: assocConfig?.label ?? `Unnamed group ${group}`,
					multiChannel,
				});
			}
		}
		return ret;
	}

	/**
	 * Returns all association groups that exist on a node and all its endpoints.
	 * The returned map uses the endpoint index as keys and its values are maps of group IDs to their definition
	 */
	public getAllAssociationGroups(
		nodeId: number,
	): ReadonlyMap<number, ReadonlyMap<number, AssociationGroup>> {
		const node = this.nodes.getOrThrow(nodeId);

		const ret = new Map<number, ReadonlyMap<number, AssociationGroup>>();
		for (const endpoint of node.getAllEndpoints()) {
			if (endpoint.supportsCC(CommandClasses.Association)) {
				ret.set(
					endpoint.index,
					this.getAssociationGroups({
						nodeId,
						endpoint: endpoint.index,
					}),
				);
			}
		}
		return ret;
	}

	/**
	 * Returns all associations (Multi Channel or normal) that are configured on the root device or an endpoint of a node.
	 * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
	 */
	public getAssociations(
		source: AssociationAddress,
	): ReadonlyMap<number, readonly AssociationAddress[]>;

	/**
	 * Returns all associations (Multi Channel or normal) that are configured on the root device (endpoint 0) of this node.
	 * @deprecated Use the overload with `source: AssociationAddress` instead
	 */
	public getAssociations(
		nodeId: number,
	): ReadonlyMap<number, readonly AssociationAddress[]>;

	public getAssociations(
		source: number | AssociationAddress,
	): ReadonlyMap<number, readonly AssociationAddress[]> {
		const nodeId = typeof source === "number" ? source : source.nodeId;
		const endpointIndex =
			typeof source === "number" ? 0 : source.endpoint ?? 0;

		const node = this.nodes.getOrThrow(nodeId);
		const endpoint = node.getEndpointOrThrow(endpointIndex);

		const ret = new Map<number, readonly AssociationAddress[]>();

		if (endpoint.supportsCC(CommandClasses.Association)) {
			const destinations = AssociationCC.getAllDestinationsCached(
				this.driver,
				endpoint,
			);
			for (const [groupId, assocs] of destinations) {
				ret.set(groupId, assocs);
			}
		} else {
			throw new ZWaveError(
				`Node ${nodeId}${
					endpointIndex > 0 ? `, endpoint ${endpointIndex}` : ""
				} does not support associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// Merge the "normal" destinations with multi channel destinations
		if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
			const destinations =
				MultiChannelAssociationCC.getAllDestinationsCached(
					this.driver,
					endpoint,
				);
			for (const [groupId, assocs] of destinations) {
				if (ret.has(groupId)) {
					const normalAssociations = ret.get(groupId)!;
					ret.set(groupId, [
						...normalAssociations,
						// Eliminate potential duplicates
						...assocs.filter(
							(a1) =>
								normalAssociations.findIndex(
									(a2) =>
										a1.nodeId === a2.nodeId &&
										a1.endpoint === a2.endpoint,
								) === -1,
						),
					]);
				} else {
					ret.set(groupId, assocs);
				}
			}
		}

		return ret;
	}

	/**
	 * Returns all associations (Multi Channel or normal) that are configured on a node and all its endpoints.
	 * The returned map uses the source node+endpoint as keys and its values are a map of association group IDs to target node+endpoint.
	 */
	public getAllAssociations(
		nodeId: number,
	): ReadonlyObjectKeyMap<
		AssociationAddress,
		ReadonlyMap<number, readonly AssociationAddress[]>
	> {
		const node = this.nodes.getOrThrow(nodeId);

		const ret = new ObjectKeyMap<
			AssociationAddress,
			ReadonlyMap<number, readonly AssociationAddress[]>
		>();
		for (const endpoint of node.getAllEndpoints()) {
			const address: AssociationAddress = {
				nodeId,
				endpoint: endpoint.index,
			};
			if (endpoint.supportsCC(CommandClasses.Association)) {
				ret.set(address, this.getAssociations(address));
			}
		}
		return ret;
	}

	/**
	 * Checks if a given association is allowed.
	 */
	public isAssociationAllowed(
		source: AssociationAddress,
		group: number,
		destination: AssociationAddress,
	): boolean;

	/**
	 * Checks if a given association is allowed.
	 * @deprecated Use the overload with param type `source: AssociationAddress` instead.
	 */
	public isAssociationAllowed(
		nodeId: number,
		group: number,
		destination: AssociationAddress,
	): boolean;

	public isAssociationAllowed(
		source: number | AssociationAddress,
		group: number,
		destination: AssociationAddress,
	): boolean {
		if (typeof source === "number") {
			source = { nodeId: source };
		}
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);

		// Check that the target endpoint exists except when adding an association to the controller
		const targetNode = this.nodes.getOrThrow(destination.nodeId);
		const targetEndpoint =
			destination.nodeId === this._ownNodeId
				? targetNode
				: targetNode.getEndpointOrThrow(destination.endpoint ?? 0);

		// SDS14223:
		// A controlling node MUST NOT associate Node A to a Node B destination that does not support
		// the Command Class that the Node A will be controlling
		//
		// To determine this, the node must support the AGI CC or we have no way of knowing which
		// CCs the node will control
		if (
			!endpoint.supportsCC(CommandClasses.Association) &&
			!endpoint.supportsCC(CommandClasses["Multi Channel Association"])
		) {
			throw new ZWaveError(
				`Node ${node.id}${
					endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
				} does not support associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (
			!endpoint.supportsCC(
				CommandClasses["Association Group Information"],
			)
		) {
			return true;
		}

		// The following checks don't apply to Lifeline associations
		if (destination.nodeId === this._ownNodeId) return true;

		const groupCommandList = AssociationGroupInfoCC.getIssuedCommandsCached(
			this.driver,
			endpoint,
			group,
		);
		if (!groupCommandList || !groupCommandList.size) {
			// We don't know which CCs this group controls, just allow it
			return true;
		}
		const groupCCs = [...groupCommandList.keys()];

		// A controlling node MAY create an association to a destination supporting an
		// actuator Command Class if the actual association group sends Basic Control Command Class.
		if (
			groupCCs.includes(CommandClasses.Basic) &&
			actuatorCCs.some((cc) => targetEndpoint?.supportsCC(cc))
		) {
			return true;
		}

		// Enforce that at least one issued CC is supported
		return groupCCs.some((cc) => targetEndpoint?.supportsCC(cc));
	}

	/**
	 * Adds associations to a node or endpoint
	 */
	public addAssociations(
		source: AssociationAddress,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void>;

	/**
	 * Adds associations to a node or endpoint
	 * @deprecated Use the overload with param type `source: AssociationAddress` instead.
	 */
	public addAssociations(
		nodeId: number,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void>;

	/**
	 * Adds associations to a node or endpoint
	 */
	public async addAssociations(
		source: number | AssociationAddress,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void> {
		if (typeof source === "number") {
			source = { nodeId: source };
		}
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
		const nodeAndEndpointString = `${node.id}${
			endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
		}`;

		// Check whether we should add any associations the device does not have support for
		let assocInstance: typeof AssociationCC | undefined;
		let mcInstance: typeof MultiChannelAssociationCC | undefined;
		// Split associations into conventional and endpoint associations
		const nodeAssociations = distinct(
			destinations
				.filter((a) => a.endpoint == undefined)
				.map((a) => a.nodeId),
		);
		const endpointAssociations = destinations.filter(
			(a) => a.endpoint != undefined,
		) as EndpointAddress[];

		if (endpoint.supportsCC(CommandClasses.Association)) {
			assocInstance = AssociationCC;
		} else if (nodeAssociations.length > 0) {
			throw new ZWaveError(
				`Node ${nodeAndEndpointString} does not support associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
			mcInstance = MultiChannelAssociationCC;
		} else if (endpointAssociations.length > 0) {
			throw new ZWaveError(
				`Node ${nodeAndEndpointString} does not support multi channel associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		const assocGroupCount =
			assocInstance?.getGroupCountCached(this.driver, endpoint) ?? 0;
		const mcGroupCount =
			mcInstance?.getGroupCountCached(this.driver, endpoint) ?? 0;
		const groupCount = Math.max(assocGroupCount, mcGroupCount);
		if (group > groupCount) {
			throw new ZWaveError(
				`Group ${group} does not exist on node ${nodeAndEndpointString}`,
				ZWaveErrorCodes.AssociationCC_InvalidGroup,
			);
		}

		const groupIsMultiChannel =
			!!mcInstance &&
			group <= mcGroupCount &&
			node.deviceConfig?.associations?.get(group)?.multiChannel !== false;

		if (groupIsMultiChannel) {
			// Check that all associations are allowed
			const disallowedAssociations = destinations.filter(
				(a) =>
					!this.isAssociationAllowed(
						source as AssociationAddress,
						group,
						a,
					),
			);
			if (disallowedAssociations.length) {
				let message = `The following associations are not allowed:`;
				message += disallowedAssociations
					.map(
						(a) =>
							`\n· Node ${a.nodeId}${
								a.endpoint ? `, endpoint ${a.endpoint}` : ""
							}`,
					)
					.join("");
				throw new ZWaveError(
					message,
					ZWaveErrorCodes.AssociationCC_NotAllowed,
				);
			}

			// And add them
			await endpoint.commandClasses[
				"Multi Channel Association"
			].addDestinations({
				groupId: group,
				nodeIds: nodeAssociations,
				endpoints: endpointAssociations,
			});
			// Refresh the association list
			await endpoint.commandClasses["Multi Channel Association"].getGroup(
				group,
			);
		} else {
			// Although the node supports multi channel associations, this group only supports "normal" associations
			if (destinations.some((a) => a.endpoint != undefined)) {
				throw new ZWaveError(
					`Node ${nodeAndEndpointString}, group ${group} does not support multi channel associations!`,
					ZWaveErrorCodes.CC_NotSupported,
				);
			}

			// Check that all associations are allowed
			const disallowedAssociations = destinations.filter(
				(a) =>
					!this.isAssociationAllowed(
						source as AssociationAddress,
						group,
						a,
					),
			);
			if (disallowedAssociations.length) {
				throw new ZWaveError(
					`The associations to the following nodes are not allowed: ${disallowedAssociations
						.map((a) => a.nodeId)
						.join(", ")}`,
					ZWaveErrorCodes.AssociationCC_NotAllowed,
				);
			}

			await endpoint.commandClasses.Association.addNodeIds(
				group,
				...destinations.map((a) => a.nodeId),
			);
			// Refresh the association list
			await endpoint.commandClasses.Association.getGroup(group);
		}
	}

	/**
	 * Removes the given associations from a node or endpoint
	 */
	public removeAssociations(
		source: AssociationAddress,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void>;

	/**
	 * Removes the given associations from a node or endpoint
	 * @deprecated Use the overload with param type `source: AssociationAddress` instead.
	 */
	public removeAssociations(
		nodeId: number,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void>;

	/**
	 * Removes the given associations from a node or endpoint
	 */
	public async removeAssociations(
		source: number | AssociationAddress,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void> {
		if (typeof source === "number") {
			source = { nodeId: source };
		}
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
		const nodeAndEndpointString = `${node.id}${
			endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
		}`;

		// Split associations into conventional and endpoint associations
		const nodeAssociations = distinct(
			destinations
				.filter((a) => a.endpoint == undefined)
				.map((a) => a.nodeId),
		);
		const endpointAssociations = destinations.filter(
			(a) => a.endpoint != undefined,
		) as EndpointAddress[];

		// Removing associations is not either/or - we could have a device with duplicated associations between
		// Association CC and Multi Channel Association CC
		// Figure out what we need to use to remove the associations

		let groupExistsAsMultiChannel = false;
		let groupExistsAsNodeAssociation = false;

		let mcInstance: typeof MultiChannelAssociationCC | undefined;
		let assocInstance: typeof AssociationCC | undefined;

		// To remove a multi channel association, we need to make sure that the group exists
		// and the node supports multi channel associations
		if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
			mcInstance = MultiChannelAssociationCC;
			if (
				group <= mcInstance.getGroupCountCached(this.driver, endpoint)
			) {
				groupExistsAsMultiChannel = true;
			}
		} else if (endpointAssociations.length > 0) {
			throw new ZWaveError(
				`Node ${nodeAndEndpointString} does not support multi channel associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// To remove a normal association, we need to make sure that the group exists either as a normal association
		// or as a multi channel association
		if (endpoint.supportsCC(CommandClasses.Association)) {
			assocInstance = AssociationCC;
			if (
				group <=
				assocInstance.getGroupCountCached(this.driver, endpoint)
			) {
				groupExistsAsNodeAssociation = true;
			}
		}

		if (!mcInstance && !assocInstance) {
			throw new ZWaveError(
				`Node ${nodeAndEndpointString} does not support associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// Ensure the group exists and can be used
		if (!groupExistsAsMultiChannel && !groupExistsAsNodeAssociation) {
			throw new ZWaveError(
				` Association group ${group} does not exist for node ${nodeAndEndpointString}`,
				ZWaveErrorCodes.AssociationCC_InvalidGroup,
			);
		}
		if (endpointAssociations.length > 0 && !groupExistsAsMultiChannel) {
			throw new ZWaveError(
				`Node ${nodeAndEndpointString}, association group ${group} does not support multi channel associations!`,
				ZWaveErrorCodes.AssociationCC_InvalidGroup,
			);
		}

		// Even if we only remove node associations, we use both CCs since it has been found that some
		// devices do not correctly share the node list between the two commands
		if (
			assocInstance &&
			nodeAssociations.length > 0 &&
			groupExistsAsNodeAssociation
		) {
			await endpoint.commandClasses.Association.removeNodeIds({
				groupId: group,
				nodeIds: nodeAssociations,
			});
			// Refresh the association list
			await endpoint.commandClasses.Association.getGroup(group);
		}

		if (mcInstance && groupExistsAsMultiChannel) {
			await endpoint.commandClasses[
				"Multi Channel Association"
			].removeDestinations({
				groupId: group,
				nodeIds: nodeAssociations,
				endpoints: endpointAssociations,
			});
			// Refresh the multi channel association list
			await endpoint.commandClasses["Multi Channel Association"].getGroup(
				group,
			);
		}
	}

	/**
	 * Removes a node from all other nodes' associations
	 * WARNING: It is not recommended to await this method
	 */
	public async removeNodeFromAllAssociations(nodeId: number): Promise<void> {
		const tasks: Promise<any>[] = [];
		for (const node of this.nodes.values()) {
			if (node.id === this._ownNodeId || node.id === nodeId) continue;
			for (const endpoint of node.getAllEndpoints()) {
				// Prefer multi channel associations if that is available
				if (
					endpoint.commandClasses[
						"Multi Channel Association"
					].isSupported()
				) {
					return endpoint.commandClasses[
						"Multi Channel Association"
					].removeDestinations({
						nodeIds: [nodeId],
					});
				} else if (endpoint.commandClasses.Association.isSupported()) {
					return endpoint.commandClasses.Association.removeNodeIdsFromAllGroups(
						[nodeId],
					);
				}
			}
		}

		await Promise.all(tasks);
	}

	/**
	 * Tests if a node is marked as failed in the controller's memory
	 * @param nodeId The id of the node in question
	 */
	public async isFailedNode(nodeId: number): Promise<boolean> {
		const result = await this.driver.sendMessage<IsFailedNodeResponse>(
			new IsFailedNodeRequest(this.driver, { failedNodeId: nodeId }),
		);
		return result.result;
	}

	/**
	 * Removes a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
	 * @param nodeId The id of the node to remove
	 */
	public async removeFailedNode(nodeId: number): Promise<void> {
		const node = this.nodes.getOrThrow(nodeId);
		if (await node.ping()) {
			throw new ZWaveError(
				`The node removal process could not be started because the node responded to a ping.`,
				ZWaveErrorCodes.RemoveFailedNode_Failed,
			);
		}

		const result = await this.driver.sendMessage<
			RemoveFailedNodeRequestStatusReport | RemoveFailedNodeResponse
		>(new RemoveFailedNodeRequest(this.driver, { failedNodeId: nodeId }));

		if (result instanceof RemoveFailedNodeResponse) {
			// This implicates that the process was unsuccessful.
			let message = `The node removal process could not be started due to the following reasons:`;
			if (
				!!(
					result.removeStatus &
					RemoveFailedNodeStartFlags.NotPrimaryController
				)
			) {
				message += "\n· This controller is not the primary controller";
			}
			if (
				!!(
					result.removeStatus &
					RemoveFailedNodeStartFlags.NodeNotFound
				)
			) {
				message += `\n· Node ${nodeId} is not in the list of failed nodes`;
			}
			if (
				!!(
					result.removeStatus &
					RemoveFailedNodeStartFlags.RemoveProcessBusy
				)
			) {
				message += `\n· The node removal process is currently busy`;
			}
			if (
				!!(
					result.removeStatus &
					RemoveFailedNodeStartFlags.RemoveFailed
				)
			) {
				message += `\n· The controller is busy or the node has responded`;
			}
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.RemoveFailedNode_Failed,
			);
		} else {
			switch (result.removeStatus) {
				case RemoveFailedNodeStatus.NodeOK:
					throw new ZWaveError(
						`The node could not be removed because it has responded`,
						ZWaveErrorCodes.RemoveFailedNode_NodeOK,
					);
				case RemoveFailedNodeStatus.NodeNotRemoved:
					throw new ZWaveError(
						`The removal process could not be completed`,
						ZWaveErrorCodes.RemoveFailedNode_Failed,
					);
				default:
					// If everything went well, the status is RemoveFailedNodeStatus.NodeRemoved

					// Emit the removed event so the driver and applications can react
					this.emit("node removed", this.nodes.get(nodeId)!, false);
					// and forget the node
					this._nodes.delete(nodeId);

					return;
			}
		}
	}

	/**
	 * Replace a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
	 * @param nodeId The id of the node to replace
	 * @param options Defines the inclusion strategy to use for the replacement node
	 */
	public async replaceFailedNode(
		nodeId: number,
		options: ReplaceNodeOptions,
	): Promise<boolean>;

	/**
	 * Replace a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
	 * @param nodeId The id of the node to replace
	 * @param includeNonSecure Whether the new node should be included non-securely, even if it supports Security S0. By default, S0 will be used.
	 * @deprecated Use the overload with options instead
	 */
	public async replaceFailedNode(
		nodeId: number,
		includeNonSecure?: boolean,
	): Promise<boolean>;

	public async replaceFailedNode(
		nodeId: number,
		options?: ReplaceNodeOptions | boolean,
	): Promise<boolean> {
		if (
			this._inclusionState === InclusionState.Including ||
			this._inclusionState === InclusionState.Excluding ||
			this._inclusionState === InclusionState.Busy
		) {
			return false;
		}

		// Leave SmartStart listening mode so we can switch to exclusion mode
		await this.pauseSmartStart();

		this.setInclusionState(InclusionState.Busy);

		if (options == undefined) {
			options = {
				strategy: InclusionStrategy.Security_S0,
			};
		} else if (typeof options === "boolean") {
			options = {
				strategy: options
					? InclusionStrategy.Insecure
					: InclusionStrategy.Security_S0,
			};
		}

		this.driver.controllerLog.print(
			`starting replace failed node process...`,
		);

		const node = this.nodes.getOrThrow(nodeId);
		if (await node.ping()) {
			this.setInclusionState(InclusionState.Idle);
			throw new ZWaveError(
				`The node replace process could not be started because the node responded to a ping.`,
				ZWaveErrorCodes.ReplaceFailedNode_Failed,
			);
		}

		this._inclusionOptions = options;

		const result = await this.driver.sendMessage<ReplaceFailedNodeResponse>(
			new ReplaceFailedNodeRequest(this.driver, {
				failedNodeId: nodeId,
			}),
		);

		if (!result.isOK()) {
			// This implicates that the process was unsuccessful.
			let message = `The node replace process could not be started due to the following reasons:`;
			if (
				!!(
					result.replaceStatus &
					ReplaceFailedNodeStartFlags.NotPrimaryController
				)
			) {
				message += "\n· This controller is not the primary controller";
			}
			if (
				!!(
					result.replaceStatus &
					ReplaceFailedNodeStartFlags.NodeNotFound
				)
			) {
				message += `\n· Node ${nodeId} is not in the list of failed nodes`;
			}
			if (
				!!(
					result.replaceStatus &
					ReplaceFailedNodeStartFlags.ReplaceProcessBusy
				)
			) {
				message += `\n· The node replace process is currently busy`;
			}
			if (
				!!(
					result.replaceStatus &
					ReplaceFailedNodeStartFlags.ReplaceFailed
				)
			) {
				message += `\n· The controller is busy or the node has responded`;
			}
			this.setInclusionState(InclusionState.Idle);
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.ReplaceFailedNode_Failed,
			);
		} else {
			// Remember which node we're trying to replace
			this._nodePendingReplace = this.nodes.get(nodeId);
			this._replaceFailedPromise = createDeferredPromise();
			return this._replaceFailedPromise;
		}
	}

	/** Configure the RF region at the Z-Wave API Module */
	public async setRFRegion(region: RFRegion): Promise<boolean> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_SetRFRegionResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(new SerialAPISetup_SetRFRegionRequest(this.driver, { region }));
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support setting the RF region!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}

		if (result.success) await this.driver.trySoftReset();
		return result.success;
	}

	/** Request the current RF region configured at the Z-Wave API Module */
	public async getRFRegion(): Promise<RFRegion> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_GetRFRegionResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(new SerialAPISetup_GetRFRegionRequest(this.driver));
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support getting the RF region!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		return result.region;
	}

	/** Configure the Powerlevel setting of the Z-Wave API */
	public async setPowerlevel(
		powerlevel: number,
		measured0dBm: number,
	): Promise<boolean> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_SetPowerlevelResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(
			new SerialAPISetup_SetPowerlevelRequest(this.driver, {
				powerlevel,
				measured0dBm,
			}),
		);
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support setting the powerlevel!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		return result.success;
	}

	/** Request the Powerlevel setting of the Z-Wave API */
	public async getPowerlevel(): Promise<
		Pick<
			SerialAPISetup_GetPowerlevelResponse,
			"powerlevel" | "measured0dBm"
		>
	> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_GetPowerlevelResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(new SerialAPISetup_GetPowerlevelRequest(this.driver));
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support getting the powerlevel!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		return pick(result, ["powerlevel", "measured0dBm"]);
	}

	/**
	 * @internal
	 * Configure whether the Z-Wave API should use short (8 bit) or long (16 bit) Node IDs
	 */
	public async setNodeIDType(nodeIdType: NodeIDType): Promise<boolean> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_SetNodeIDTypeResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(
			new SerialAPISetup_SetNodeIDTypeRequest(this.driver, {
				nodeIdType,
			}),
		);
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support switching between short and long node IDs!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		return result.success;
	}

	/**
	 * @internal
	 * Request the maximum payload that the Z-Wave API Module can accept for transmitting Z-Wave frames. This value depends on the RF Profile
	 */
	public async getMaxPayloadSize(): Promise<number> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_GetMaximumPayloadSizeResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(new SerialAPISetup_GetMaximumPayloadSizeRequest(this.driver), {
			supportCheck: false,
		});
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support getting the max. payload size!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		return result.maxPayloadSize;
	}

	/**
	 * @internal
	 * Request the maximum payload that the Z-Wave API Module can accept for transmitting Z-Wave Long Range frames. This value depends on the RF Profile
	 */
	public async getMaxPayloadSizeLongRange(): Promise<number> {
		const result = await this.driver.sendMessage<
			| SerialAPISetup_GetLRMaximumPayloadSizeResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(new SerialAPISetup_GetLRMaximumPayloadSizeRequest(this.driver));
		if (result instanceof SerialAPISetup_CommandUnsupportedResponse) {
			throw new ZWaveError(
				`Your hardware does not support getting the max. long range payload size!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		return result.maxPayloadSize;
	}

	/**
	 * Returns the known list of neighbors for a node
	 */
	public async getNodeNeighbors(
		nodeId: number,
		onlyRepeaters: boolean = false,
	): Promise<readonly number[]> {
		this.driver.controllerLog.logNode(nodeId, {
			message: "requesting node neighbors...",
			direction: "outbound",
		});
		try {
			const resp = await this.driver.sendMessage<GetRoutingInfoResponse>(
				new GetRoutingInfoRequest(this.driver, {
					nodeId,
					removeBadLinks: false,
					removeNonRepeaters: onlyRepeaters,
				}),
			);
			this.driver.controllerLog.logNode(nodeId, {
				message: `node neighbors received: ${resp.nodeIds.join(", ")}`,
				direction: "inbound",
			});
			return resp.nodeIds;
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`requesting the node neighbors failed: ${getErrorMessage(e)}`,
				"error",
			);
			throw e;
		}
	}

	/**
	 * Returns the known routes the controller will use to communicate with the nodes.
	 *
	 * This information is dynamically built using TX status reports and may not be accurate at all times.
	 * Also, it may not be available immediately after startup or at all if the controller doesn't support this feature.
	 *
	 * **Note:** To keep information returned by this method updated, use the information contained in each node's `"statistics"` event.
	 */
	public getKnownLifelineRoutes(): ReadonlyMap<number, LifelineRoutes> {
		const ret = new Map<number, LifelineRoutes>();
		for (const node of this.nodes.values()) {
			if (node.isControllerNode) continue;
			ret.set(node.id, {
				lwr: node.statistics.lwr,
				nlwr: node.statistics.nlwr,
			});
		}
		return ret;
	}

	/**
	 * @internal
	 * Deserializes the controller information and all nodes from the cache.
	 */
	public async deserialize(): Promise<void> {
		if (!this.driver.networkCache) return;
		const cache = this.driver.networkCache;

		// Deserialize information for all nodes
		for (const node of this.nodes.values()) {
			await node.deserialize();
		}

		// Remove nodes which no longer exist from the cache
		// TODO: Do the same when removing a node
		for (const cacheKey of cache.keys()) {
			const nodeId = cacheKeyUtils.nodeIdFromKey(cacheKey);
			if (nodeId && !this.nodes.has(nodeId)) {
				cache.delete(cacheKey);
			}
		}
	}

	/** Turns the Z-Wave radio on or off */
	public async toggleRF(enabled: boolean): Promise<boolean> {
		try {
			this.driver.controllerLog.print(
				`Turning RF ${enabled ? "on" : "off"}...`,
			);
			const ret = await this.driver.sendMessage<SetRFReceiveModeResponse>(
				new SetRFReceiveModeRequest(this.driver, { enabled }),
			);
			return ret.isOK();
		} catch (e) {
			this.driver.controllerLog.print(
				`Error turning RF ${enabled ? "on" : "off"}: ${getErrorMessage(
					e,
				)}`,
				"error",
			);
			return false;
		}
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Returns information of the controller's external NVM
	 */
	public async getNVMId(): Promise<NVMId> {
		const ret = await this.driver.sendMessage<GetNVMIdResponse>(
			new GetNVMIdRequest(this.driver),
		);
		return pick(ret, ["nvmManufacturerId", "memoryType", "memorySize"]);
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Reads a byte from the external NVM at the given offset
	 */
	public async externalNVMReadByte(offset: number): Promise<number> {
		const ret = await this.driver.sendMessage<ExtNVMReadLongByteResponse>(
			new ExtNVMReadLongByteRequest(this.driver, { offset }),
		);
		return ret.byte;
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Writes a byte to the external NVM at the given offset
	 * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
	 * Take care not to accidentally overwrite the protocol NVM area!
	 *
	 * @returns `true` when writing succeeded, `false` otherwise
	 */
	public async externalNVMWriteByte(
		offset: number,
		data: number,
	): Promise<boolean> {
		const ret = await this.driver.sendMessage<ExtNVMWriteLongByteResponse>(
			new ExtNVMWriteLongByteRequest(this.driver, { offset, byte: data }),
		);
		return ret.success;
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Reads a buffer from the external NVM at the given offset
	 */
	public async externalNVMReadBuffer(
		offset: number,
		length: number,
	): Promise<Buffer> {
		const ret = await this.driver.sendMessage<ExtNVMReadLongBufferResponse>(
			new ExtNVMReadLongBufferRequest(this.driver, {
				offset,
				length,
			}),
		);
		return ret.buffer;
	}

	/**
	 * **Z-Wave 700 series only**
	 *
	 * Reads a buffer from the external NVM at the given offset
	 */
	public async externalNVMReadBuffer700(
		offset: number,
		length: number,
	): Promise<{ buffer: Buffer; endOfFile: boolean }> {
		const ret = await this.driver.sendMessage<NVMOperationsResponse>(
			new NVMOperationsReadRequest(this.driver, {
				offset,
				length,
			}),
		);
		if (!ret.isOK()) {
			let message = "Could not read from the external NVM";
			if (ret.status === NVMOperationStatus.Error_OperationInterference) {
				message += ": interference between read and write operation.";
			} else if (
				ret.status === NVMOperationStatus.Error_OperationMismatch
			) {
				message += ": wrong operation requested.";
			}
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.Controller_CommandError,
			);
		}

		return {
			buffer: ret.buffer,
			endOfFile: ret.status === NVMOperationStatus.EndOfFile,
		};
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Writes a buffer to the external NVM at the given offset
	 * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
	 * Take care not to accidentally overwrite the protocol NVM area!
	 *
	 * @returns `true` when writing succeeded, `false` otherwise
	 */
	public async externalNVMWriteBuffer(
		offset: number,
		buffer: Buffer,
	): Promise<boolean> {
		const ret =
			await this.driver.sendMessage<ExtNVMWriteLongBufferResponse>(
				new ExtNVMWriteLongBufferRequest(this.driver, {
					offset,
					buffer,
				}),
			);
		return ret.success;
	}

	/**
	 * **Z-Wave 700 series only**
	 *
	 * Writes a buffer to the external NVM at the given offset
	 * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
	 * Take care not to accidentally overwrite the protocol NVM area!
	 */
	public async externalNVMWriteBuffer700(
		offset: number,
		buffer: Buffer,
	): Promise<{ endOfFile: boolean }> {
		const ret = await this.driver.sendMessage<NVMOperationsResponse>(
			new NVMOperationsWriteRequest(this.driver, {
				offset,
				buffer,
			}),
		);

		if (!ret.isOK()) {
			let message = "Could not write to the external NVM";
			if (ret.status === NVMOperationStatus.Error_OperationInterference) {
				message += ": interference between read and write operation.";
			} else if (
				ret.status === NVMOperationStatus.Error_OperationMismatch
			) {
				message += ": wrong operation requested.";
			}
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.Controller_CommandError,
			);
		}

		return {
			endOfFile: ret.status === NVMOperationStatus.EndOfFile,
		};
	}

	/**
	 * **Z-Wave 700 series only**
	 *
	 * Opens the controller's external NVM for reading/writing and returns the NVM size
	 */
	public async externalNVMOpen(): Promise<number> {
		const ret = await this.driver.sendMessage<NVMOperationsResponse>(
			new NVMOperationsOpenRequest(this.driver),
		);
		if (!ret.isOK()) {
			throw new ZWaveError(
				"Failed to open the external NVM",
				ZWaveErrorCodes.Controller_CommandError,
			);
		}
		return ret.offsetOrSize;
	}

	/**
	 * **Z-Wave 700 series only**
	 *
	 * Closes the controller's external NVM
	 */
	public async externalNVMClose(): Promise<void> {
		const ret = await this.driver.sendMessage<NVMOperationsResponse>(
			new NVMOperationsCloseRequest(this.driver),
		);
		if (!ret.isOK()) {
			throw new ZWaveError(
				"Failed to close the external NVM",
				ZWaveErrorCodes.Controller_CommandError,
			);
		}
	}

	/**
	 * Creates a backup of the NVM and returns the raw data as a Buffer. The Z-Wave radio is turned off/on automatically.
	 * @param onProgress Can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size
	 * @returns The raw NVM buffer
	 */
	public async backupNVMRaw(
		onProgress?: (bytesRead: number, total: number) => void,
	): Promise<Buffer> {
		this.driver.controllerLog.print("Backing up NVM...");

		// Turn Z-Wave radio off to avoid having the protocol write to the NVM while dumping it
		if (!(await this.toggleRF(false))) {
			throw new ZWaveError(
				"Could not turn off the Z-Wave radio before creating NVM backup!",
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		}

		let ret: Buffer;
		try {
			if (this.sdkVersionGte("7.0")) {
				ret = await this.backupNVMRaw700(onProgress);
			} else {
				ret = await this.backupNVMRaw500(onProgress);
			}
			this.driver.controllerLog.print("NVM backup completed");
		} finally {
			// Whatever happens, turn Z-Wave radio back on
			await this.toggleRF(true);
		}

		// TODO: You can also get away with eliding all the 0xff pages. The NVR also holds the page size of the NVM (NVMP),
		// so you can figure out which pages you don't have to save or restore. If you do this, you need to make sure to issue a
		// "factory reset" before restoring the NVM - that'll blank out the NVM to 0xffs before initializing it.

		return ret;
	}

	private async backupNVMRaw500(
		onProgress?: (bytesRead: number, total: number) => void,
	): Promise<Buffer> {
		const size = nvmSizeToBufferSize((await this.getNVMId()).memorySize);
		if (!size) {
			throw new ZWaveError(
				"Unknown NVM size - cannot backup!",
				ZWaveErrorCodes.Controller_NotSupported,
			);
		}

		const ret = Buffer.allocUnsafe(size);
		let offset = 0;
		// Try reading the maximum size at first, the Serial API should return chunks in a size it supports
		// For some reason, there is no documentation and no official command for this
		let chunkSize: number = Math.min(0xffff, ret.length);
		while (offset < ret.length) {
			const chunk = await this.externalNVMReadBuffer(
				offset,
				Math.min(chunkSize, ret.length - offset),
			);
			if (chunk.length === 0) {
				// Some SDK versions return an empty buffer when trying to read a buffer that is too long
				// Fallback to a sane (but maybe slow) size
				chunkSize = 48;
				continue;
			}
			chunk.copy(ret, offset);
			offset += chunk.length;
			if (chunkSize > chunk.length) chunkSize = chunk.length;

			// Report progress for listeners
			if (onProgress) setImmediate(() => onProgress(offset, size));
		}
		return ret;
	}

	private async backupNVMRaw700(
		onProgress?: (bytesRead: number, total: number) => void,
	): Promise<Buffer> {
		// Open NVM for reading
		const size = await this.externalNVMOpen();

		const ret = Buffer.allocUnsafe(size);
		let offset = 0;
		// Try reading the maximum size at first, the Serial API should return chunks in a size it supports
		// For some reason, there is no documentation and no official command for this
		let chunkSize: number = Math.min(0xff, ret.length);
		try {
			while (offset < ret.length) {
				const { buffer: chunk, endOfFile } =
					await this.externalNVMReadBuffer700(
						offset,
						Math.min(chunkSize, ret.length - offset),
					);
				if (chunkSize === 0xff && chunk.length === 0) {
					// Some SDK versions return an empty buffer when trying to read a buffer that is too long
					// Fallback to a sane (but maybe slow) size
					chunkSize = 48;
					continue;
				}
				chunk.copy(ret, offset);
				offset += chunk.length;
				if (chunkSize > chunk.length) chunkSize = chunk.length;

				// Report progress for listeners
				if (onProgress) setImmediate(() => onProgress(offset, size));

				if (endOfFile) break;
			}
		} finally {
			// Whatever happens, close the NVM
			await this.externalNVMClose();
		}

		return ret;
	}

	/**
	 * Restores an NVM backup that was created with `backupNVMRaw`. The Z-Wave radio is turned off/on automatically.
	 * If the given buffer is in a different NVM format, it is converted automatically. If a conversion is required but not supported, the operation will be aborted.
	 *
	 * **WARNING:** If both the source and target NVM use an an unsupported format, they will NOT be checked for compatibility!
	 *
	 * **WARNING:** A failure during this process may brick your controller. Use at your own risk!
	 *
	 * @param nvmData The NVM backup to be restored
	 * @param convertProgress Can be used to monitor the progress of the NVM conversion, which may take several seconds up to a few minutes depending on the NVM size
	 * @param restoreProgress Can be used to monitor the progress of the restore operation, which may take several seconds up to a few minutes depending on the NVM size
	 */
	public async restoreNVM(
		nvmData: Buffer,
		convertProgress?: (bytesRead: number, total: number) => void,
		restoreProgress?: (bytesWritten: number, total: number) => void,
	): Promise<void> {
		// Turn Z-Wave radio off to avoid having the protocol write to the NVM while dumping it
		if (!(await this.toggleRF(false))) {
			throw new ZWaveError(
				"Could not turn off the Z-Wave radio before restoring NVM backup!",
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		}

		// Restoring a potentially incompatible NVM happens in three steps:
		// 1. the current NVM is read
		// 2. the given NVM data is converted to match the current format
		// 3. the converted data is written to the NVM

		try {
			this.driver.controllerLog.print(
				"Converting NVM to target format...",
			);
			let targetNVM: Buffer;
			if (this.sdkVersionGte("7.0")) {
				targetNVM = await this.backupNVMRaw700(convertProgress);
			} else {
				targetNVM = await this.backupNVMRaw500(convertProgress);
			}
			const convertedNVM = migrateNVM(nvmData, targetNVM);

			this.driver.controllerLog.print("Restoring NVM backup...");
			if (this.sdkVersionGte("7.0")) {
				await this.restoreNVMRaw700(convertedNVM, restoreProgress);
			} else {
				await this.restoreNVMRaw500(convertedNVM, restoreProgress);
			}
			this.driver.controllerLog.print("NVM backup restored");
		} finally {
			// Whatever happens, turn Z-Wave radio back on
			await this.toggleRF(true);
		}

		// After restoring an NVM backup, the controller's capabilities may have changed.
		// At the very least reset the information about the soft reset capability.
		this.supportsSoftReset = undefined;
		// Also, we could be talking to different nodes than the cache file contains.
		// Reset all info about all nodes, so they get re-interviewed.
		this._nodes.clear();

		// Normally we'd only need to soft reset the stick, but we also need to re-interview the controller and potentially all nodes.
		// Just forcing a restart of the driver seems easier.

		await this.driver.softResetAndRestart(
			"Restarting driver to activate restored NVM backup...",
			"Applying the NVM backup requires a driver restart!",
		);
	}

	/**
	 * Restores an NVM backup that was created with `backupNVMRaw`. The Z-Wave radio is turned off/on automatically.
	 *
	 * **WARNING:** The given buffer is NOT checked for compatibility with the current stick. To have Z-Wave JS do that, use the {@link restoreNVM} method instead.
	 *
	 * **WARNING:** A failure during this process may brick your controller. Use at your own risk!
	 * @param nvmData The raw NVM backup to be restored
	 * @param onProgress Can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size
	 */
	public async restoreNVMRaw(
		nvmData: Buffer,
		onProgress?: (bytesWritten: number, total: number) => void,
	): Promise<void> {
		this.driver.controllerLog.print("Restoring NVM...");

		// Turn Z-Wave radio off to avoid having the protocol write to the NVM while dumping it
		if (!(await this.toggleRF(false))) {
			throw new ZWaveError(
				"Could not turn off the Z-Wave radio before restoring NVM backup!",
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		}

		try {
			if (this.sdkVersionGte("7.0")) {
				await this.restoreNVMRaw700(nvmData, onProgress);
			} else {
				await this.restoreNVMRaw500(nvmData, onProgress);
			}
			this.driver.controllerLog.print("NVM backup restored");
		} finally {
			// Whatever happens, turn Z-Wave radio back on
			await this.toggleRF(true);
		}

		// TODO: You can also get away with eliding all the 0xff pages. The NVR also holds the page size of the NVM (NVMP),
		// so you can figure out which pages you don't have to save or restore. If you do this, you need to make sure to issue a
		// "factory reset" before restoring the NVM - that'll blank out the NVM to 0xffs before initializing it.

		// After a restored NVM backup, the controller's capabilities may have changed. At the very least reset the information
		// about soft reset capability
		this.supportsSoftReset = undefined;

		// Normally we'd only need to soft reset the stick, but we also need to re-interview the controller and potentially all nodes.
		// Just forcing a restart of the driver seems easier.

		// if (this.driver.options.enableSoftReset) {
		// 	this.driver.controllerLog.print(
		// 		"Activating restored NVM backup...",
		// 	);
		// 	await this.driver.softReset();
		// } else {
		// 	this.driver.controllerLog.print(
		// 		"Soft reset not enabled, cannot automatically activate restored NVM backup!",
		// 		"warn",
		// 	);
		// }

		this.driver.controllerLog.print(
			"Restarting driver to activate restored NVM backup...",
		);

		this.driver.emit(
			"error",
			new ZWaveError(
				"Activating the NVM backup requires a driver restart!",
				ZWaveErrorCodes.Driver_Failed,
			),
		);
		await this.driver.destroy();
	}

	private async restoreNVMRaw500(
		nvmData: Buffer,
		onProgress?: (bytesWritten: number, total: number) => void,
	): Promise<void> {
		const size = nvmSizeToBufferSize((await this.getNVMId()).memorySize);
		if (!size) {
			throw new ZWaveError(
				"Unknown NVM size - cannot restore!",
				ZWaveErrorCodes.Controller_NotSupported,
			);
		} else if (size !== nvmData.length) {
			// This might be a converted NVM buffer which contains only the first relevant part.
			// The first two bytes must point to the last byte in the buffer then
			const actualSize = 1 + nvmData.readUInt16BE(0);
			if (actualSize !== nvmData.length) {
				throw new ZWaveError(
					"The given data does not match the NVM size - cannot restore!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			// Now we only need to figure out which part of the NVM needs to be overwritten when restoring
			const oldSize =
				1 + (await this.externalNVMReadBuffer(0, 2)).readUInt16BE(0);
			if (oldSize > actualSize) {
				// Pad the rest with 0xff
				nvmData = Buffer.concat([
					nvmData,
					Buffer.alloc(oldSize - actualSize, 0xff),
				]);
			}
		}

		// Figure out the maximum chunk size the Serial API supports
		// For some reason, there is no documentation and no official command for this
		// The write requests need 5 bytes more than the read response, so subtract 5 from the returned length
		const chunkSize =
			(await this.externalNVMReadBuffer(0, 0xffff)).length - 5;

		for (let offset = 0; offset < nvmData.length; offset += chunkSize) {
			await this.externalNVMWriteBuffer(
				offset,
				nvmData.slice(offset, offset + chunkSize),
			);
			// Report progress for listeners
			if (onProgress)
				setImmediate(() => onProgress(offset, nvmData.length));
		}
	}

	private async restoreNVMRaw700(
		nvmData: Buffer,
		onProgress?: (bytesWritten: number, total: number) => void,
	): Promise<void> {
		// Open NVM for reading
		const size = await this.externalNVMOpen();

		if (size !== nvmData.length) {
			throw new ZWaveError(
				"The given data does not match the NVM size - cannot restore!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Figure out the maximum chunk size the Serial API supports
		// For some reason, there is no documentation and no official command for this
		// The write requests have the same size as the read response - if this yields no
		// data, default to a sane (but maybe slow) size
		const chunkSize =
			(await this.externalNVMReadBuffer700(0, 0xff)).buffer.length || 48;

		// Close NVM and re-open again for writing
		await this.externalNVMClose();
		await this.externalNVMOpen();

		for (let offset = 0; offset < nvmData.length; offset += chunkSize) {
			const { endOfFile } = await this.externalNVMWriteBuffer700(
				offset,
				nvmData.slice(offset, offset + chunkSize),
			);

			// Report progress for listeners
			if (onProgress) setImmediate(() => onProgress(offset, size));

			if (endOfFile) break;
		}
		// Close NVM
		await this.externalNVMClose();
	}

	/**
	 * Request the most recent background RSSI levels detected by the controller.
	 *
	 * **Note:** This only returns useful values if something was transmitted recently.
	 */
	public async getBackgroundRSSI(): Promise<{
		rssiChannel0: RSSI;
		rssiChannel1: RSSI;
		rssiChannel2?: RSSI;
	}> {
		const ret = await this.driver.sendMessage<GetBackgroundRSSIResponse>(
			new GetBackgroundRSSIRequest(this.driver),
		);
		return pick(ret, ["rssiChannel0", "rssiChannel1", "rssiChannel2"]);
	}
}
