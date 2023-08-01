import {
	AssociationCC,
	ECDHProfiles,
	FLiRS2WakeUpTime,
	InclusionControllerCCComplete,
	InclusionControllerCCInitiate,
	InclusionControllerStatus,
	InclusionControllerStep,
	KEXFailType,
	KEXSchemes,
	ManufacturerSpecificCCValues,
	MultiChannelAssociationCC,
	Security2CCKEXFail,
	Security2CCKEXSet,
	Security2CCNetworkKeyGet,
	Security2CCNetworkKeyVerify,
	Security2CCPublicKeyReport,
	Security2CCTransferEnd,
	Security2Command,
	VersionCCValues,
	ZWaveProtocolCCAssignReturnRoute,
	ZWaveProtocolCCAssignReturnRoutePriority,
	ZWaveProtocolCCAssignSUCReturnRoute,
	ZWaveProtocolCCAssignSUCReturnRoutePriority,
	utils as ccUtils,
	inclusionTimeouts,
	type AssociationAddress,
	type AssociationGroup,
	type FirmwareUpdateResult,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EMPTY_ROUTE,
	MAX_NODES,
	NODE_ID_BROADCAST,
	NodeIDType,
	NodeType,
	ProtocolType,
	RFRegion,
	RouteKind,
	SecurityClass,
	TransmitStatus,
	UNKNOWN_STATE,
	ValueDB,
	ZWaveError,
	ZWaveErrorCodes,
	authHomeIdFromDSK,
	averageRSSI,
	computePRK,
	decodeX25519KeyDER,
	deriveTempKeys,
	dskFromString,
	dskToString,
	encodeX25519KeyDERSPKI,
	indexDBsByNode,
	isEmptyRoute,
	isValidDSK,
	isZWaveError,
	nwiHomeIdFromDSK,
	securityClassIsS2,
	securityClassOrder,
	type Firmware,
	type MaybeNotKnown,
	type MaybeUnknown,
	type ProtocolDataRate,
	type RSSI,
	type Route,
	type SinglecastCC,
	type ZWaveDataRate,
} from "@zwave-js/core";
import { migrateNVM } from "@zwave-js/nvmedit";
import {
	BootloaderChunkType,
	FunctionType,
	XModemMessageHeaders,
	type BootloaderChunk,
	type Message,
	type SuccessIndicator,
} from "@zwave-js/serial";
import {
	Mixin,
	TypedEventEmitter,
	createThrowingMap,
	flatMap,
	getEnumMemberName,
	getErrorMessage,
	num2hex,
	pick,
	type ReadonlyObjectKeyMap,
	type ReadonlyThrowingMap,
	type ThrowingMap,
} from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import {
	createDeferredPromise,
	type DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { roundTo } from "alcalzone-shared/math";
import { isObject } from "alcalzone-shared/typeguards";
import crypto from "crypto";
import util from "util";
import type { Driver } from "../driver/Driver";
import { cacheKeyUtils, cacheKeys } from "../driver/NetworkCache";
import type { StatisticsEventCallbacks } from "../driver/Statistics";
import { DeviceClass } from "../node/DeviceClass";
import { ZWaveNode } from "../node/Node";
import { VirtualNode } from "../node/VirtualNode";
import {
	InterviewStage,
	NodeStatus,
	type LifelineRoutes,
} from "../node/_Types";
import { ZWaveLibraryTypes, type ZWaveApiVersion } from "../serialapi/_Types";
import {
	ApplicationUpdateRequestNodeAdded,
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeRemoved,
	ApplicationUpdateRequestSmartStartHomeIDReceived,
	type ApplicationUpdateRequest,
} from "../serialapi/application/ApplicationUpdateRequest";
import {
	ShutdownRequest,
	type ShutdownResponse,
} from "../serialapi/application/ShutdownMessages";
import {
	GetControllerCapabilitiesRequest,
	type GetControllerCapabilitiesResponse,
} from "../serialapi/capability/GetControllerCapabilitiesMessages";
import {
	GetControllerVersionRequest,
	type GetControllerVersionResponse,
} from "../serialapi/capability/GetControllerVersionMessages";
import {
	GetProtocolVersionRequest,
	type GetProtocolVersionResponse,
} from "../serialapi/capability/GetProtocolVersionMessages";
import {
	GetSerialApiCapabilitiesRequest,
	type GetSerialApiCapabilitiesResponse,
} from "../serialapi/capability/GetSerialApiCapabilitiesMessages";
import {
	GetSerialApiInitDataRequest,
	type GetSerialApiInitDataResponse,
} from "../serialapi/capability/GetSerialApiInitDataMessages";
import { HardResetRequest } from "../serialapi/capability/HardResetRequest";
import {
	SerialAPISetupCommand,
	SerialAPISetup_CommandUnsupportedResponse,
	SerialAPISetup_GetLRMaximumPayloadSizeRequest,
	SerialAPISetup_GetMaximumPayloadSizeRequest,
	SerialAPISetup_GetPowerlevel16BitRequest,
	SerialAPISetup_GetPowerlevelRequest,
	SerialAPISetup_GetRFRegionRequest,
	SerialAPISetup_GetSupportedCommandsRequest,
	SerialAPISetup_SetNodeIDTypeRequest,
	SerialAPISetup_SetPowerlevel16BitRequest,
	SerialAPISetup_SetPowerlevelRequest,
	SerialAPISetup_SetRFRegionRequest,
	SerialAPISetup_SetTXStatusReportRequest,
	type SerialAPISetup_GetLRMaximumPayloadSizeResponse,
	type SerialAPISetup_GetMaximumPayloadSizeResponse,
	type SerialAPISetup_GetPowerlevel16BitResponse,
	type SerialAPISetup_GetPowerlevelResponse,
	type SerialAPISetup_GetRFRegionResponse,
	type SerialAPISetup_GetSupportedCommandsResponse,
	type SerialAPISetup_SetNodeIDTypeResponse,
	type SerialAPISetup_SetPowerlevel16BitResponse,
	type SerialAPISetup_SetPowerlevelResponse,
	type SerialAPISetup_SetRFRegionResponse,
	type SerialAPISetup_SetTXStatusReportResponse,
} from "../serialapi/capability/SerialAPISetupMessages";
import { SetApplicationNodeInformationRequest } from "../serialapi/capability/SetApplicationNodeInformationRequest";
import {
	GetControllerIdRequest,
	type GetControllerIdResponse,
} from "../serialapi/memory/GetControllerIdMessages";
import {
	GetBackgroundRSSIRequest,
	type GetBackgroundRSSIResponse,
} from "../serialapi/misc/GetBackgroundRSSIMessages";
import {
	SetRFReceiveModeRequest,
	type SetRFReceiveModeResponse,
} from "../serialapi/misc/SetRFReceiveModeMessages";
import {
	SetSerialApiTimeoutsRequest,
	type SetSerialApiTimeoutsResponse,
} from "../serialapi/misc/SetSerialApiTimeoutsMessages";
import {
	AddNodeDSKToNetworkRequest,
	AddNodeStatus,
	AddNodeToNetworkRequest,
	AddNodeType,
	EnableSmartStartListenRequest,
	computeNeighborDiscoveryTimeout,
	type AddNodeToNetworkRequestStatusReport,
} from "../serialapi/network-mgmt/AddNodeToNetworkRequest";
import { AssignPriorityReturnRouteRequest } from "../serialapi/network-mgmt/AssignPriorityReturnRouteMessages";
import {
	AssignPrioritySUCReturnRouteRequest,
	type AssignPrioritySUCReturnRouteRequestTransmitReport,
} from "../serialapi/network-mgmt/AssignPrioritySUCReturnRouteMessages";
import {
	AssignReturnRouteRequest,
	type AssignReturnRouteRequestTransmitReport,
} from "../serialapi/network-mgmt/AssignReturnRouteMessages";
import {
	AssignSUCReturnRouteRequest,
	type AssignSUCReturnRouteRequestTransmitReport,
} from "../serialapi/network-mgmt/AssignSUCReturnRouteMessages";
import {
	DeleteReturnRouteRequest,
	type DeleteReturnRouteRequestTransmitReport,
} from "../serialapi/network-mgmt/DeleteReturnRouteMessages";
import {
	DeleteSUCReturnRouteRequest,
	type DeleteSUCReturnRouteRequestTransmitReport,
} from "../serialapi/network-mgmt/DeleteSUCReturnRouteMessages";
import {
	GetPriorityRouteRequest,
	type GetPriorityRouteResponse,
} from "../serialapi/network-mgmt/GetPriorityRouteMessages";
import {
	GetRoutingInfoRequest,
	type GetRoutingInfoResponse,
} from "../serialapi/network-mgmt/GetRoutingInfoMessages";
import {
	GetSUCNodeIdRequest,
	type GetSUCNodeIdResponse,
} from "../serialapi/network-mgmt/GetSUCNodeIdMessages";
import {
	IsFailedNodeRequest,
	type IsFailedNodeResponse,
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
	RemoveNodeStatus,
	RemoveNodeType,
	type RemoveNodeFromNetworkRequestStatusReport,
} from "../serialapi/network-mgmt/RemoveNodeFromNetworkRequest";
import {
	ReplaceFailedNodeRequest,
	ReplaceFailedNodeStartFlags,
	ReplaceFailedNodeStatus,
	type ReplaceFailedNodeRequestStatusReport,
	type ReplaceFailedNodeResponse,
} from "../serialapi/network-mgmt/ReplaceFailedNodeRequest";
import {
	NodeNeighborUpdateStatus,
	RequestNodeNeighborUpdateRequest,
	type RequestNodeNeighborUpdateReport,
} from "../serialapi/network-mgmt/RequestNodeNeighborUpdateMessages";
import { SetPriorityRouteRequest } from "../serialapi/network-mgmt/SetPriorityRouteMessages";
import { SetSUCNodeIdRequest } from "../serialapi/network-mgmt/SetSUCNodeIDMessages";
import {
	ExtNVMReadLongBufferRequest,
	type ExtNVMReadLongBufferResponse,
} from "../serialapi/nvm/ExtNVMReadLongBufferMessages";
import {
	ExtNVMReadLongByteRequest,
	type ExtNVMReadLongByteResponse,
} from "../serialapi/nvm/ExtNVMReadLongByteMessages";
import {
	ExtNVMWriteLongBufferRequest,
	type ExtNVMWriteLongBufferResponse,
} from "../serialapi/nvm/ExtNVMWriteLongBufferMessages";
import {
	ExtNVMWriteLongByteRequest,
	type ExtNVMWriteLongByteResponse,
} from "../serialapi/nvm/ExtNVMWriteLongByteMessages";
import {
	FirmwareUpdateNVM_GetNewImageRequest,
	FirmwareUpdateNVM_InitRequest,
	FirmwareUpdateNVM_IsValidCRC16Request,
	FirmwareUpdateNVM_SetNewImageRequest,
	FirmwareUpdateNVM_UpdateCRC16Request,
	FirmwareUpdateNVM_WriteRequest,
	type FirmwareUpdateNVM_GetNewImageResponse,
	type FirmwareUpdateNVM_InitResponse,
	type FirmwareUpdateNVM_IsValidCRC16Response,
	type FirmwareUpdateNVM_SetNewImageResponse,
	type FirmwareUpdateNVM_UpdateCRC16Response,
	type FirmwareUpdateNVM_WriteResponse,
} from "../serialapi/nvm/FirmwareUpdateNVMMessages";
import {
	GetNVMIdRequest,
	nvmSizeToBufferSize,
	type GetNVMIdResponse,
	type NVMId,
} from "../serialapi/nvm/GetNVMIdMessages";
import {
	NVMOperationStatus,
	NVMOperationsCloseRequest,
	NVMOperationsOpenRequest,
	NVMOperationsReadRequest,
	NVMOperationsWriteRequest,
	type NVMOperationsResponse,
} from "../serialapi/nvm/NVMOperationsMessages";
import type { TransmitReport } from "../serialapi/transport/SendDataShared";
import {
	ControllerStatisticsHost,
	type ControllerStatistics,
} from "./ControllerStatistics";
import { ZWaveFeature, minFeatureVersions } from "./Features";
import {
	downloadFirmwareUpdate,
	getAvailableFirmwareUpdates,
} from "./FirmwareUpdateService";
import {
	ExclusionStrategy,
	InclusionState,
	InclusionStrategy,
	ProvisioningEntryStatus,
	RemoveNodeReason,
	SecurityBootstrapFailure,
	type ExclusionOptions,
	type FoundNode,
	type InclusionOptions,
	type InclusionOptionsInternal,
	type InclusionResult,
	type InclusionUserCallbacks,
	type PlannedProvisioningEntry,
	type ReplaceNodeOptions,
	type SmartStartProvisioningEntry,
} from "./Inclusion";
import { determineNIF } from "./NodeInformationFrame";
import type { UnknownZWaveChipType } from "./ZWaveChipTypes";
import { protocolVersionToSDKVersion } from "./ZWaveSDKVersions";
import {
	ControllerFirmwareUpdateStatus,
	type ControllerFirmwareUpdateProgress,
	type ControllerFirmwareUpdateResult,
	type FirmwareUpdateFileInfo,
	type FirmwareUpdateInfo,
	type GetFirmwareUpdatesOptions,
	type HealNetworkOptions,
	type HealNodeStatus,
	type SDKVersion,
} from "./_Types";
import {
	assertProvisioningEntry,
	sdkVersionGt,
	sdkVersionGte,
	sdkVersionLt,
	sdkVersionLte,
} from "./utils";

// Strongly type the event emitter events
interface ControllerEventCallbacks
	extends StatisticsEventCallbacks<ControllerStatistics> {
	"inclusion failed": () => void;
	"exclusion failed": () => void;
	"inclusion started": (secure: boolean, strategy: InclusionStrategy) => void;
	"exclusion started": () => void;
	"inclusion stopped": () => void;
	"exclusion stopped": () => void;
	"node found": (node: FoundNode) => void;
	"node added": (node: ZWaveNode, result: InclusionResult) => void;
	"node removed": (node: ZWaveNode, reason: RemoveNodeReason) => void;
	"heal network progress": (
		progress: ReadonlyMap<number, HealNodeStatus>,
	) => void;
	"heal network done": (result: ReadonlyMap<number, HealNodeStatus>) => void;
	"firmware update progress": (
		progress: ControllerFirmwareUpdateProgress,
	) => void;
	"firmware update finished": (
		result: ControllerFirmwareUpdateResult,
	) => void;
	identify: () => void;
}

export type ControllerEvents = Extract<keyof ControllerEventCallbacks, string>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ZWaveController extends ControllerStatisticsHost {}

@Mixin([ControllerStatisticsHost])
export class ZWaveController extends TypedEventEmitter<ControllerEventCallbacks> {
	/** @internal */
	public constructor(
		private readonly driver: Driver,
		bootloaderOnly: boolean = false,
	) {
		super();

		this._nodes = createThrowingMap((nodeId) => {
			throw new ZWaveError(
				`Node ${nodeId} was not found!`,
				ZWaveErrorCodes.Controller_NodeNotFound,
				nodeId,
			);
		});

		// Limit interaction with the controller in bootloader-only mode
		if (bootloaderOnly) return;

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

	private _type: MaybeNotKnown<ZWaveLibraryTypes>;
	public get type(): MaybeNotKnown<ZWaveLibraryTypes> {
		return this._type;
	}

	private _protocolVersion: MaybeNotKnown<string>;
	public get protocolVersion(): MaybeNotKnown<string> {
		return this._protocolVersion;
	}

	private _sdkVersion: MaybeNotKnown<string>;
	public get sdkVersion(): MaybeNotKnown<string> {
		return this._sdkVersion;
	}

	private _zwaveApiVersion: MaybeNotKnown<ZWaveApiVersion>;
	public get zwaveApiVersion(): MaybeNotKnown<ZWaveApiVersion> {
		return this._zwaveApiVersion;
	}

	private _zwaveChipType: MaybeNotKnown<string | UnknownZWaveChipType>;
	public get zwaveChipType(): MaybeNotKnown<string | UnknownZWaveChipType> {
		return this._zwaveChipType;
	}

	private _homeId: MaybeNotKnown<number>;
	/** A 32bit number identifying the current network */
	public get homeId(): MaybeNotKnown<number> {
		return this._homeId;
	}

	private _ownNodeId: MaybeNotKnown<number>;
	/** The ID of the controller in the current network */
	public get ownNodeId(): MaybeNotKnown<number> {
		return this._ownNodeId;
	}

	private _isPrimary: MaybeNotKnown<boolean>;
	public get isPrimary(): MaybeNotKnown<boolean> {
		return this._isPrimary;
	}

	private _isUsingHomeIdFromOtherNetwork: MaybeNotKnown<boolean>;
	public get isUsingHomeIdFromOtherNetwork(): MaybeNotKnown<boolean> {
		return this._isUsingHomeIdFromOtherNetwork;
	}

	private _isSISPresent: MaybeNotKnown<boolean>;
	public get isSISPresent(): MaybeNotKnown<boolean> {
		return this._isSISPresent;
	}

	private _wasRealPrimary: MaybeNotKnown<boolean>;
	public get wasRealPrimary(): MaybeNotKnown<boolean> {
		return this._wasRealPrimary;
	}

	private _isSIS: MaybeNotKnown<boolean>;
	public get isSIS(): MaybeNotKnown<boolean> {
		return this._isSIS;
	}

	private _isSUC: MaybeNotKnown<boolean>;
	public get isSUC(): MaybeNotKnown<boolean> {
		return this._isSUC;
	}

	private _nodeType: MaybeNotKnown<NodeType>;
	public get nodeType(): MaybeNotKnown<NodeType> {
		return this._nodeType;
	}

	/** Checks if the SDK version is greater than the given one */
	public sdkVersionGt(version: SDKVersion): MaybeNotKnown<boolean> {
		return sdkVersionGt(this._sdkVersion, version);
	}

	/** Checks if the SDK version is greater than or equal to the given one */
	public sdkVersionGte(version: SDKVersion): MaybeNotKnown<boolean> {
		return sdkVersionGte(this._sdkVersion, version);
	}

	/** Checks if the SDK version is lower than the given one */
	public sdkVersionLt(version: SDKVersion): MaybeNotKnown<boolean> {
		return sdkVersionLt(this._sdkVersion, version);
	}

	/** Checks if the SDK version is lower than or equal to the given one */
	public sdkVersionLte(version: SDKVersion): MaybeNotKnown<boolean> {
		return sdkVersionLte(this._sdkVersion, version);
	}

	private _manufacturerId: MaybeNotKnown<number>;
	public get manufacturerId(): MaybeNotKnown<number> {
		return this._manufacturerId;
	}

	private _productType: MaybeNotKnown<number>;
	public get productType(): MaybeNotKnown<number> {
		return this._productType;
	}

	private _productId: MaybeNotKnown<number>;
	public get productId(): MaybeNotKnown<number> {
		return this._productId;
	}

	private _firmwareVersion: MaybeNotKnown<string>;
	public get firmwareVersion(): MaybeNotKnown<string> {
		return this._firmwareVersion;
	}

	private _supportedFunctionTypes: MaybeNotKnown<FunctionType[]>;
	public get supportedFunctionTypes(): MaybeNotKnown<
		readonly FunctionType[]
	> {
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
	public supportsFeature(feature: ZWaveFeature): MaybeNotKnown<boolean> {
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

	private _sucNodeId: MaybeNotKnown<number>;
	public get sucNodeId(): MaybeNotKnown<number> {
		return this._sucNodeId;
	}

	private _supportsTimers: MaybeNotKnown<boolean>;
	public get supportsTimers(): MaybeNotKnown<boolean> {
		return this._supportsTimers;
	}

	/** Whether the controller is known to support soft reset */
	public get supportsSoftReset(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.controller.supportsSoftReset);
	}
	/** @internal */
	public set supportsSoftReset(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.controller.supportsSoftReset, value);
	}

	private _rfRegion: MaybeNotKnown<RFRegion>;
	/** Which RF region the controller is currently set to, or `undefined` if it could not be determined (yet). This value is cached and can be changed through {@link setRFRegion}. */
	public get rfRegion(): MaybeNotKnown<RFRegion> {
		return this._rfRegion;
	}

	private _nodes: ThrowingMap<number, ZWaveNode>;
	/** A dictionary of the nodes connected to this controller */
	public get nodes(): ReadonlyThrowingMap<number, ZWaveNode> {
		return this._nodes;
	}

	private _nodeIdType: NodeIDType = NodeIDType.Short;
	/** Whether the controller is configured to use 8 or 16 bit node IDs */
	public get nodeIdType(): NodeIDType {
		return this._nodeIdType;
	}

	/** Returns the node with the given DSK */
	public getNodeByDSK(dsk: Buffer | string): ZWaveNode | undefined {
		try {
			if (typeof dsk === "string") dsk = dskFromString(dsk);
		} catch (e) {
			// Return undefined if the DSK is invalid
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Argument_Invalid)
				return undefined;
			throw e;
		}
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

	/**
	 * Returns a reference to the (virtual) broadcast node, which allows sending commands to all nodes.
	 * This automatically groups nodes by security class, ignores nodes that cannot be controlled via multicast/broadcast, and will fall back to multicast(s) if necessary.
	 */
	public getBroadcastNode(): VirtualNode {
		return new VirtualNode(
			NODE_ID_BROADCAST,
			this.driver,
			this.nodes.values(),
		);
	}

	/**
	 * Creates a virtual node that can be used to send one or more multicast commands to several nodes.
	 * This automatically groups nodes by security class and ignores nodes that cannot be controlled via multicast.
	 */
	public getMulticastGroup(nodeIDs: number[]): VirtualNode {
		if (nodeIDs.length === 0) {
			throw new ZWaveError(
				"Cannot create an empty multicast group",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

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

		const entry = this.getProvisioningEntryInternal(dskOrNodeId);
		if (!entry) return;

		const index = provisioningList.indexOf(entry);
		if (index >= 0) {
			provisioningList.splice(index, 1);
			this.provisioningList = provisioningList;

			this.autoProvisionSmartStart();
		}
	}

	private getProvisioningEntryInternal(
		dskOrNodeId: string | number,
	): SmartStartProvisioningEntry | undefined {
		if (typeof dskOrNodeId === "string") {
			return this.provisioningList.find((e) => e.dsk === dskOrNodeId);
		} else {
			// The provisioning list may or may not contain the node ID for an entry, even if the node is already included.
			let ret = this.provisioningList.find(
				(e) => "nodeId" in e && e.nodeId === dskOrNodeId,
			);
			if (!ret) {
				// Try to get the DSK from the node instance
				const dsk = this.nodes.get(dskOrNodeId)?.dsk;
				if (dsk) {
					ret = this.provisioningList.find(
						(e) => e.dsk === dskToString(dsk),
					);
				}
			}
			return ret;
		}
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
		this._protocolVersion = version.libraryVersion;
		this._type = version.controllerType;
		this.driver.controllerLog.print(
			`received version info:
  controller type: ${getEnumMemberName(ZWaveLibraryTypes, this._type)}
  library version: ${this._protocolVersion}`,
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

			this._protocolVersion = protocol.protocolVersion;

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

		// The SDK version cannot be queried directly, but we can deduce it from the protocol version
		this._sdkVersion = protocolVersionToSDKVersion(this._protocolVersion);

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

		// Also query the controller's current RF region if possible
		if (
			this.isSerialAPISetupCommandSupported(
				SerialAPISetupCommand.GetRFRegion,
			)
		) {
			this.driver.controllerLog.print(`Querying configured RF region...`);
			const resp = await this.getRFRegion().catch(() => undefined);
			if (resp != undefined) {
				this.driver.controllerLog.print(
					`The controller is using RF region ${getEnumMemberName(
						RFRegion,
						resp,
					)}`,
				);
			} else {
				this.driver.controllerLog.print(
					`Querying the RF region failed!`,
					"warn",
				);
			}
		}

		// Switch to 16 bit node IDs if supported
		if (
			this.isSerialAPISetupCommandSupported(
				SerialAPISetupCommand.SetNodeIDType,
			)
		) {
			try {
				await this.setNodeIDType(NodeIDType.Long);
			} catch {
				// ignore
			}
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
		const nodeIds = [...initData.nodeIds];
		if (nodeIds.length === 0) {
			this.driver.controllerLog.print(
				`Controller reports no nodes in its network. This could be an indication of a corrupted controller memory.`,
				"warn",
			);
			nodeIds.push(this._ownNodeId!);
		}

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
			ManufacturerSpecificCCValues.manufacturerId.id,
			ManufacturerSpecificCCValues.manufacturerId.meta,
		);
		controllerValueDB.setMetadata(
			ManufacturerSpecificCCValues.productType.id,
			ManufacturerSpecificCCValues.productType.meta,
		);
		controllerValueDB.setMetadata(
			ManufacturerSpecificCCValues.productId.id,
			ManufacturerSpecificCCValues.productId.meta,
		);
		controllerValueDB.setValue(
			ManufacturerSpecificCCValues.manufacturerId.id,
			this._manufacturerId,
		);
		controllerValueDB.setValue(
			ManufacturerSpecificCCValues.productType.id,
			this._productType,
		);
		controllerValueDB.setValue(
			ManufacturerSpecificCCValues.productId.id,
			this._productId,
		);

		// Set firmware version information for the controller node
		controllerValueDB.setMetadata(
			VersionCCValues.firmwareVersions.id,
			VersionCCValues.firmwareVersions.meta,
		);
		controllerValueDB.setValue(VersionCCValues.firmwareVersions.id, [
			this._firmwareVersion,
		]);
		controllerValueDB.setMetadata(
			VersionCCValues.zWaveProtocolVersion.id,
			VersionCCValues.zWaveProtocolVersion.meta,
		);
		controllerValueDB.setValue(
			VersionCCValues.zWaveProtocolVersion.id,
			this._protocolVersion,
		);
		controllerValueDB.setMetadata(
			VersionCCValues.sdkVersion.id,
			VersionCCValues.sdkVersion.meta,
		);
		controllerValueDB.setValue(
			VersionCCValues.sdkVersion.id,
			this._sdkVersion,
		);

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
			const associations = this.nodes.get(this._ownNodeId!)?.associations;
			if (associations?.length) {
				this.driver.controllerLog.print(
					"Notifying associated nodes about reset...",
				);
				for (const nodeId of associations) {
					const node = this.nodes.get(nodeId);
					if (!node) continue;

					void node.sendResetLocallyNotification().catch(() => {
						// ignore
					});
				}
			}

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

	/**
	 * @internal
	 */
	public async shutdown(): Promise<boolean> {
		// begin the reset process
		try {
			this.driver.controllerLog.print("Shutting down the Z-Wave API...");
			const response = await this.driver.sendMessage<ShutdownResponse>(
				new ShutdownRequest(this.driver),
			);
			if (response.success) {
				this.driver.controllerLog.print("Z-Wave API was shut down");
			} else {
				this.driver.controllerLog.print(
					"Failed to shut down the Z-Wave API",
				);
			}
			return response.success;
		} catch (e) {
			this.driver.controllerLog.print(
				`shutdown failed: ${getErrorMessage(e)}`,
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
	private _exclusionOptions: ExclusionOptions | undefined;
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
	public async beginInclusion(
		options: InclusionOptions = {
			strategy: InclusionStrategy.Insecure,
		},
	): Promise<boolean> {
		if (
			this._inclusionState === InclusionState.Including ||
			this._inclusionState === InclusionState.Excluding ||
			this._inclusionState === InclusionState.Busy
		) {
			return false;
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
	 * @param options Influences the exclusion process and what happens with the Smart Start provisioning list.
	 */
	public async beginExclusion(
		options: ExclusionOptions = {
			strategy: ExclusionStrategy.DisableProvisioningEntry,
		},
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
			this._exclusionOptions = options;
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

	/** @internal */
	public async handleApplicationUpdateRequest(
		msg: ApplicationUpdateRequest,
	): Promise<void> {
		const nodeId = msg.getNodeId();
		let node: ZWaveNode | undefined;
		if (nodeId != undefined) {
			node = this.nodes.get(nodeId);
		}

		if (msg instanceof ApplicationUpdateRequestNodeInfoReceived) {
			if (node) {
				this.driver.controllerLog.logNode(node.id, {
					message: "Received updated node info",
					direction: "inbound",
				});
				node.updateNodeInfo(msg.nodeInformation);

				// This came from the node
				node.lastSeen = new Date();

				// Resolve active pings that would fail otherwise
				this.driver.resolvePendingPings(node.id);

				if (
					node.canSleep &&
					node.supportsCC(CommandClasses["Wake Up"])
				) {
					// In case this is a sleeping node and there are no messages in the queue, the node may go back to sleep very soon
					this.driver.debounceSendNodeToSleep(node);
				}

				return;
			}
		} else if (
			msg instanceof ApplicationUpdateRequestSmartStartHomeIDReceived
		) {
			// the controller is in Smart Start learn mode and a node requests inclusion via Smart Start
			this.driver.controllerLog.print(
				"Received Smart Start inclusion request",
			);

			if (
				this.inclusionState !== InclusionState.Idle &&
				this.inclusionState !== InclusionState.SmartStart
			) {
				this.driver.controllerLog.print(
					"Controller is busy and cannot handle this inclusion request right now...",
				);
				return;
			}

			// Check if the node is on the provisioning list
			const provisioningEntry = this.provisioningList.find((entry) =>
				nwiHomeIdFromDSK(dskFromString(entry.dsk)).equals(
					msg.nwiHomeId,
				),
			);
			if (!provisioningEntry) {
				this.driver.controllerLog.print(
					"NWI Home ID not found in provisioning list, ignoring request...",
				);
				return;
			} else if (
				provisioningEntry.status === ProvisioningEntryStatus.Inactive
			) {
				this.driver.controllerLog.print(
					"The provisioning entry for this node is inactive, ignoring request...",
				);
				return;
			}

			this.driver.controllerLog.print(
				"NWI Home ID found in provisioning list, including node...",
			);
			try {
				const result = await this.beginInclusionSmartStart(
					provisioningEntry,
				);
				if (!result) {
					this.driver.controllerLog.print(
						"Smart Start inclusion could not be started",
						"error",
					);
				}
			} catch (e) {
				this.driver.controllerLog.print(
					`Smart Start inclusion could not be started: ${getErrorMessage(
						e,
					)}`,
					"error",
				);
			}
		} else if (msg instanceof ApplicationUpdateRequestNodeRemoved) {
			// A node was removed by another controller
			const node = this.nodes.get(msg.nodeId);
			if (node) {
				this.driver.controllerLog.logNode(
					node.id,
					"was removed from the network by another controller",
				);

				this.emit("node removed", node, RemoveNodeReason.ProxyExcluded);
			}
		} else if (msg instanceof ApplicationUpdateRequestNodeAdded) {
			// A node was included by another controller
			const nodeId = msg.nodeId;
			const nodeInfo = msg.nodeInformation;

			// It can happen that this is received for a node that is already part of the network:
			// https://github.com/zwave-js/node-zwave-js/issues/5781
			// In this case, ignore this message to prevent chaos.

			if (this._nodes.has(nodeId)) {
				this.driver.controllerLog.print(
					`Node ${nodeId} was (supposedly) included by another controller, but it is already part of the network. Ignoring the message...`,
					"warn",
				);
				return;
			}

			this.setInclusionState(InclusionState.Busy);

			const deviceClass = new DeviceClass(
				this.driver.configManager,
				nodeInfo.basicDeviceClass,
				nodeInfo.genericDeviceClass,
				nodeInfo.specificDeviceClass,
			);

			const newNode = new ZWaveNode(
				nodeId,
				this.driver,
				deviceClass,
				nodeInfo.supportedCCs,
				undefined,
				// Create an empty value DB and specify that it contains no values
				// to avoid indexing the existing values
				this.createValueDBForNode(nodeId, new Set()),
			);
			this._nodes.set(nodeId, newNode);

			this.emit("node found", {
				id: nodeId,
				deviceClass,
				supportedCCs: nodeInfo.supportedCCs,
			});

			this.driver.controllerLog.print(
				`Node ${newNode.id} was included by another controller:
basic device class:    ${newNode.deviceClass?.basic.label}
generic device class:  ${newNode.deviceClass?.generic.label}
specific device class: ${newNode.deviceClass?.specific.label}
supported CCs: ${nodeInfo.supportedCCs
					.map((cc) => `\n  · ${CommandClasses[cc]} (${num2hex(cc)})`)
					.join("")}`,
			);

			this.driver.controllerLog.logNode(
				nodeId,
				"Waiting for initiate command to bootstrap node...",
			);

			// Handle inclusion in the background
			process.nextTick(async () => {
				// If an Inclusion Controller that does not support the Inclusion Controller Command Class includes a
				// new node in a network, the SIS will never receive an Inclusion Controller Initiate Command. If no
				// Initiate Command has been received approximately 10 seconds after a new node has been added to a
				// network, the SIS SHOULD start interviewing the newly included node

				const initiate = await this.driver
					.waitForCommand<
						SinglecastCC<InclusionControllerCCInitiate>
					>(
						(cc) =>
							cc instanceof InclusionControllerCCInitiate &&
							cc.isSinglecast() &&
							cc.includedNodeId === nodeId &&
							cc.step === InclusionControllerStep.ProxyInclusion,
						10000,
					)
					.catch(() => undefined);

				// Assume the device is alive
				// If it is actually a sleeping device, it will be marked as such later
				newNode.markAsAlive();

				let inclCtrlr: ZWaveNode | undefined;
				let bootstrapFailure: SecurityBootstrapFailure | undefined;

				if (initiate) {
					inclCtrlr = this.nodes.getOrThrow(initiate.nodeId);

					this.driver.controllerLog.logNode(
						nodeId,
						`Initiate command received from node ${inclCtrlr.id}`,
					);

					// Inclusion is handled by the inclusion controller, which (hopefully) sets the SUC return route
					newNode.hasSUCReturnRoute = true;

					// SIS, A, MUST request a Node Info Frame from Joining Node, B
					const requestedNodeInfo = await newNode
						.requestNodeInfo()
						.catch(() => undefined);
					if (requestedNodeInfo)
						newNode.updateNodeInfo(requestedNodeInfo);

					// Perform S0/S2 bootstrapping
					bootstrapFailure = await this.proxyBootstrap(
						newNode,
						inclCtrlr,
					);
				} else {
					// No command received, bootstrap node by ourselves
					this.driver.controllerLog.logNode(
						nodeId,
						"no initiate command received, bootstrapping node...",
					);

					// Assign SUC return route to make sure the node knows where to get its routes from
					newNode.hasSUCReturnRoute =
						await this.assignSUCReturnRoutes(newNode.id);

					// Include using the default inclusion strategy:
					// * Use S2 if possible,
					// * only use S0 if necessary,
					// * use no encryption otherwise
					if (newNode.supportsCC(CommandClasses["Security 2"])) {
						bootstrapFailure = await this.secureBootstrapS2(
							newNode,
						);
						if (bootstrapFailure == undefined) {
							const actualSecurityClass =
								newNode.getHighestSecurityClass();
							if (
								actualSecurityClass == undefined ||
								actualSecurityClass <
									SecurityClass.S2_Unauthenticated
							) {
								bootstrapFailure =
									SecurityBootstrapFailure.Unknown;
							}
						}
					} else if (
						newNode.supportsCC(CommandClasses.Security) &&
						(deviceClass.specific ?? deviceClass.generic)
							.requiresSecurity
					) {
						bootstrapFailure = await this.secureBootstrapS0(
							newNode,
						);
						if (bootstrapFailure == undefined) {
							const actualSecurityClass =
								newNode.getHighestSecurityClass();
							if (
								actualSecurityClass == undefined ||
								actualSecurityClass < SecurityClass.S0_Legacy
							) {
								bootstrapFailure =
									SecurityBootstrapFailure.Unknown;
							}
						}
					} else {
						// Remember that no security classes were granted
						for (const secClass of securityClassOrder) {
							newNode.securityClasses.set(secClass, false);
						}
					}
				}

				// We're done adding this node, notify listeners
				const result: InclusionResult =
					bootstrapFailure != undefined
						? {
								lowSecurity: true,
								lowSecurityReason: bootstrapFailure,
						  }
						: { lowSecurity: false };

				this.setInclusionState(InclusionState.Idle);
				this.emit("node added", newNode, result);

				if (inclCtrlr && initiate) {
					const inclCtrlrId = inclCtrlr.id;
					const step = initiate.step;
					newNode.once("ready", () => {
						this.driver.controllerLog.logNode(
							nodeId,
							`Notifying node ${inclCtrlrId} of finished inclusion`,
						);
						// Create API without checking for support
						const api = inclCtrlr!.createAPI(
							CommandClasses["Inclusion Controller"],
							false,
						);
						void api
							.completeStep(step, InclusionControllerStatus.OK)
							// eslint-disable-next-line @typescript-eslint/no-empty-function
							.catch(() => {});
					});
				}
			});
		}
	}

	/**
	 * @internal
	 * Handles replace requests from an inclusion controller
	 */
	public handleInclusionControllerCCInitiateReplace(
		initiate: InclusionControllerCCInitiate,
	): void {
		if (initiate.step !== InclusionControllerStep.ProxyInclusionReplace) {
			throw new ZWaveError(
				"Expected an inclusion controller replace request, but got a different step",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.setInclusionState(InclusionState.Busy);

		const inclCtrlr = this.nodes.getOrThrow(initiate.nodeId as number);

		const replacedNodeId = initiate.includedNodeId;
		const oldNode = this.nodes.get(replacedNodeId);
		if (oldNode) {
			this.emit("node removed", oldNode, RemoveNodeReason.ProxyReplaced);
			this._nodes.delete(oldNode.id);
		}

		// Create a fresh node instance and forget the old one
		const newNode = new ZWaveNode(
			replacedNodeId,
			this.driver,
			undefined,
			undefined,
			undefined,
			// Create an empty value DB and specify that it contains no values
			// to avoid indexing the existing values
			this.createValueDBForNode(replacedNodeId, new Set()),
		);
		this._nodes.set(newNode.id, newNode);

		this.emit("node found", {
			id: newNode.id,
		});

		// Assume the device is alive
		// If it is actually a sleeping device, it will be marked as such later
		newNode.markAsAlive();

		// Inclusion is handled by the inclusion controller, which (hopefully) sets the SUC return route
		newNode.hasSUCReturnRoute = true;

		// Handle communication with the node in the background
		process.nextTick(async () => {
			// SIS, A, MUST request a Node Info Frame from Joining Node, B
			const requestedNodeInfo = await newNode
				.requestNodeInfo()
				.catch(() => undefined);
			if (requestedNodeInfo) {
				newNode.updateNodeInfo(requestedNodeInfo);

				// TODO: Check if this stuff works for a normal replace too
				const deviceClass = new DeviceClass(
					this.driver.configManager,
					requestedNodeInfo.basicDeviceClass,
					requestedNodeInfo.genericDeviceClass,
					requestedNodeInfo.specificDeviceClass,
				);
				newNode["applyDeviceClass"](deviceClass);
			}

			// Perform S0/S2 bootstrapping
			const bootstrapFailure = await this.proxyBootstrap(
				newNode,
				inclCtrlr,
			);

			// We're done adding this node, notify listeners
			const result: InclusionResult =
				bootstrapFailure != undefined
					? {
							lowSecurity: true,
							lowSecurityReason: bootstrapFailure,
					  }
					: { lowSecurity: false };

			this.setInclusionState(InclusionState.Idle);
			this.emit("node added", newNode, result);

			// And notify the inclusion controller after we're done interviewing
			newNode.once("ready", () => {
				this.driver.controllerLog.logNode(
					inclCtrlr.nodeId,
					`Notifying inclusion controller of finished inclusion`,
				);
				// Create API without checking for support
				const api = inclCtrlr.createAPI(
					CommandClasses["Inclusion Controller"],
					false,
				);
				void api
					.completeStep(initiate.step, InclusionControllerStatus.OK)
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					.catch(() => {});
			});
		});
	}

	/**
	 * Handles bootstrapping the security keys for a node that was included by an inclusion controller
	 */
	private async proxyBootstrap(
		newNode: ZWaveNode,
		inclCtrlr: ZWaveNode,
	): Promise<SecurityBootstrapFailure | undefined> {
		// This part is to be done before the interview

		const deviceClass = newNode.deviceClass!;
		let bootstrapFailure: SecurityBootstrapFailure | undefined;

		// Include using the default inclusion strategy:
		// * Use S2 if possible,
		// * only use S0 if necessary,
		// * use no encryption otherwise
		if (newNode.supportsCC(CommandClasses["Security 2"])) {
			bootstrapFailure = await this.secureBootstrapS2(newNode);
			if (bootstrapFailure == undefined) {
				const actualSecurityClass = newNode.getHighestSecurityClass();
				if (
					actualSecurityClass == undefined ||
					actualSecurityClass < SecurityClass.S2_Unauthenticated
				) {
					bootstrapFailure = SecurityBootstrapFailure.Unknown;
				}
			}
		} else if (
			newNode.supportsCC(CommandClasses.Security) &&
			(deviceClass.specific ?? deviceClass.generic).requiresSecurity
		) {
			// S0 bootstrapping is deferred to the inclusion controller
			this.driver.controllerLog.logNode(
				newNode.id,
				`Waiting for node ${inclCtrlr.id} to perform S0 bootstrapping...`,
			);

			await inclCtrlr.commandClasses["Inclusion Controller"].initiateStep(
				newNode.id,
				InclusionControllerStep.S0Inclusion,
			);
			// Wait 60s for the S0 bootstrapping to complete
			const s0result = await this.driver
				.waitForCommand<InclusionControllerCCComplete>(
					(cc) =>
						cc.nodeId === inclCtrlr.id &&
						cc instanceof InclusionControllerCCComplete &&
						cc.step === InclusionControllerStep.S0Inclusion,
					60000,
				)
				.catch(() => undefined);

			this.driver.controllerLog.logNode(
				newNode.id,
				`S0 bootstrapping ${
					s0result == undefined
						? "timed out"
						: s0result.status === InclusionControllerStatus.OK
						? "succeeded"
						: "failed"
				}`,
			);
			bootstrapFailure =
				s0result == undefined
					? SecurityBootstrapFailure.Timeout
					: s0result.status === InclusionControllerStatus.OK
					? undefined
					: SecurityBootstrapFailure.Unknown;

			// When bootstrapping with S0, no other keys are granted
			for (const secClass of securityClassOrder) {
				if (secClass !== SecurityClass.S0_Legacy) {
					newNode.securityClasses.set(secClass, false);
				}
			}
			// Whether the S0 key is granted depends on the result
			// received from the inclusion controller
			newNode.securityClasses.set(
				SecurityClass.S0_Legacy,
				s0result?.status === InclusionControllerStatus.OK,
			);
		} else {
			// Remember that no security classes were granted
			for (const secClass of securityClassOrder) {
				newNode.securityClasses.set(secClass, false);
			}
		}

		return bootstrapFailure;
	}

	private async secureBootstrapS0(
		node: ZWaveNode,
		assumeSupported: boolean = false,
	): Promise<SecurityBootstrapFailure | undefined> {
		// When bootstrapping with S0, no other keys are granted
		for (const secClass of securityClassOrder) {
			if (secClass !== SecurityClass.S0_Legacy) {
				node.securityClasses.set(secClass, false);
			}
		}

		if (!this.driver.securityManager) {
			// Remember that the node was NOT granted the S0 security class
			node.securityClasses.set(SecurityClass.S0_Legacy, false);
			return SecurityBootstrapFailure.NoKeysConfigured;
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

			// At most 10s may pass between receiving each command. We enforce this twofold:
			// 1. by imposing a report timeout on the requests, so they don't linger too long. This does not consider
			//    the time it takes to transmit and receiv the ACK.
			// 2. by imposing a timeout around the whole API call.
			const S0_TIMEOUT = 10000;
			const api = node.commandClasses.Security.withOptions({
				reportTimeoutMs: S0_TIMEOUT,
			});

			const tasks: (() => Promise<any>)[] = [
				// Request security scheme (and ignore the result), because it is required by the specs
				() => api.getSecurityScheme(),
				// Request nonce (for network key) separately, so we can impose a timeout
				() => api.getNonce(),
				// send the network key
				() =>
					api.setNetworkKey(this.driver.securityManager!.networkKey),
			];
			if (this._includeController) {
				// Tell the controller which security scheme to use
				tasks.push(async () => {
					// Request nonce (for security scheme) manually, so it has the longer timeout
					await api.getNonce();
					await api.inheritSecurityScheme();
				});
			}

			for (const task of tasks) {
				const result = await Promise.race([
					wait(S0_TIMEOUT, true).then(() => false as const),
					task().catch(() => false as const),
				]);
				if (result === false) {
					throw new ZWaveError(
						`A secure inclusion timer has elapsed`,
						ZWaveErrorCodes.Controller_NodeTimeout,
					);
				}
			}

			// Remember that the node was granted the S0 security class
			node.securityClasses.set(SecurityClass.S0_Legacy, true);
		} catch (e) {
			let errorMessage = `Security S0 bootstrapping failed, the node was not granted the S0 security class`;
			let failure: SecurityBootstrapFailure =
				SecurityBootstrapFailure.Unknown;
			if (!isZWaveError(e)) {
				errorMessage += `: ${e as any}`;
			} else if (
				e.code !== ZWaveErrorCodes.Controller_MessageDropped &&
				e.code !== ZWaveErrorCodes.Controller_NodeTimeout
			) {
				errorMessage += `: ${e.message}`;
				failure = SecurityBootstrapFailure.Timeout;
			}
			this.driver.controllerLog.logNode(node.id, errorMessage, "warn");
			// Remember that the node was NOT granted the S0 security class
			node.securityClasses.set(SecurityClass.S0_Legacy, false);
			node.removeCC(CommandClasses.Security);

			return failure;
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
	): Promise<SecurityBootstrapFailure | undefined> {
		const unGrantSecurityClasses = () => {
			for (const secClass of securityClassOrder) {
				node.securityClasses.set(secClass, false);
			}
		};

		if (!this.driver.securityManager2) {
			// Remember that the node was NOT granted any S2 security classes
			unGrantSecurityClasses();
			return SecurityBootstrapFailure.NoKeysConfigured;
		}

		let userCallbacks: InclusionUserCallbacks;
		const inclusionOptions = this._inclusionOptions as
			| (InclusionOptionsInternal & {
					// This is the type when we end up here during normal inclusion
					strategy:
						| InclusionStrategy.Security_S2
						| InclusionStrategy.SmartStart;
			  })
			// And this when we do proxy bootstrapping for an inclusion controller
			| undefined;
		if (
			inclusionOptions &&
			"provisioning" in inclusionOptions &&
			!!inclusionOptions.provisioning
		) {
			const grantedSecurityClasses =
				inclusionOptions.provisioning.securityClasses;
			const fullDSK = inclusionOptions.provisioning.dsk;
			// SmartStart and S2 with QR code are pre-provisioned, so we don't need to ask the user for anything
			userCallbacks = {
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				abort() {},
				grantSecurityClasses: (requested) => {
					return Promise.resolve({
						clientSideAuth: false,
						securityClasses: requested.securityClasses.filter((r) =>
							grantedSecurityClasses.includes(r),
						),
					});
				},
				validateDSKAndEnterPIN: (dsk) => {
					const pin = fullDSK.slice(0, 5);
					// Make sure the DSK matches
					if (pin + dsk !== fullDSK) return Promise.resolve(false);
					return Promise.resolve(pin);
				},
			};
		} else if (
			inclusionOptions &&
			"userCallbacks" in inclusionOptions &&
			!!inclusionOptions.userCallbacks
		) {
			// Use the callbacks provided to this inclusion attempt
			userCallbacks = inclusionOptions.userCallbacks;
		} else if (this.driver.options.inclusionUserCallbacks) {
			// Use the callbacks defined in the driver options as fallback
			userCallbacks = this.driver.options.inclusionUserCallbacks;
		} else {
			// Cannot bootstrap S2 without user callbacks, abort.
			// Remember that the node was NOT granted any S2 security classes
			unGrantSecurityClasses();
			return SecurityBootstrapFailure.S2NoUserCallbacks;
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

		const deleteTempKey = () => {
			// Whatever happens, no further communication needs the temporary key
			this.driver.securityManager2?.deleteNonce(node.id);
			this.driver.securityManager2?.tempKeys.delete(node.id);
		};

		// Allow canceling the bootstrapping process
		this._bootstrappingS2NodeId = node.id;
		this.cancelBootstrapS2Promise = createDeferredPromise();

		try {
			const api = node.commandClasses["Security 2"].withOptions({
				// Do not wait for Nonce Reports after SET-type commands.
				// Timing is critical here
				s2VerifyDelivery: false,
			});
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

			const abortUser = async () => {
				setImmediate(() => {
					try {
						userCallbacks.abort();
					} catch {
						// ignore errors in application callbacks
					}
				});
				await abort(KEXFailType.BootstrappingCanceled);
				return SecurityBootstrapFailure.UserCanceled;
			};

			// Ask the node for its desired security classes and key exchange params
			const kexParams = await api
				.withOptions({ reportTimeoutMs: inclusionTimeouts.TA1 })
				.getKeyExchangeParameters();
			if (!kexParams) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: did not receive the node's desired security classes.`,
					level: "warn",
				});
				await abort();
				return SecurityBootstrapFailure.Timeout;
			}

			// Validate the response
			// At the time of implementation, only KEXScheme1 and Curve25519 are defined.
			// The certification testing ensures that no other bits are set, so we need to check that too.
			// Not sure why this choice is made, since it essentially breaks any forwards compatibility
			if (
				kexParams.supportedKEXSchemes.length !== 1 ||
				!kexParams.supportedKEXSchemes.includes(KEXSchemes.KEXScheme1)
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: No supported key exchange scheme or invalid list.`,
					level: "warn",
				});
				await abort(KEXFailType.NoSupportedScheme);
				return SecurityBootstrapFailure.ParameterMismatch;
			} else if (
				kexParams.supportedECDHProfiles.length !== 1 ||
				!kexParams.supportedECDHProfiles.includes(
					ECDHProfiles.Curve25519,
				)
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: No supported ECDH profile or invalid list.`,
					level: "warn",
				});
				await abort(KEXFailType.NoSupportedCurve);
				return SecurityBootstrapFailure.ParameterMismatch;
			}
			const supportedKeys = kexParams.requestedKeys.filter((k) =>
				securityClassOrder.includes(k as any),
			);
			if (!supportedKeys.length) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: None of the requested security classes are supported.`,
					level: "warn",
				});
				await abort(KEXFailType.NoKeyMatch);
				return SecurityBootstrapFailure.ParameterMismatch;
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
				await abort();
				return SecurityBootstrapFailure.NodeCanceled;
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

				let pinResult: string | false;
				if (
					inclusionOptions &&
					"dsk" in inclusionOptions &&
					typeof inclusionOptions.dsk === "string" &&
					isValidDSK(inclusionOptions.dsk)
				) {
					pinResult = inclusionOptions.dsk.slice(0, 5);
				} else {
					pinResult = await Promise.race([
						wait(tai2RemainingMs, true).then(() => false as const),
						userCallbacks
							.validateDSKAndEnterPIN(dsk)
							// ignore errors in application callbacks
							.catch(() => false as const),
					]);
				}

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
				await abort(keySetEcho);
				return SecurityBootstrapFailure.S2IncorrectPIN;
			}
			// Validate that the received command contains the correct list of keys
			if (keySetEcho instanceof Security2CCKEXFail) {
				this.driver.controllerLog.logNode(node.id, {
					message: `The joining node canceled the Security S2 bootstrapping.`,
					direction: "inbound",
					level: "warn",
				});
				await abort();
				return SecurityBootstrapFailure.NodeCanceled;
			} else if (!keySetEcho.echo) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: KEXSet received without echo flag`,
					direction: "inbound",
					level: "warn",
				});
				await abort(KEXFailType.WrongSecurityLevel);
				return SecurityBootstrapFailure.NodeCanceled;
			} else if (
				!keySetEcho.isEncapsulatedWith(
					CommandClasses["Security 2"],
					Security2Command.MessageEncapsulation,
				)
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: Command received without encryption`,
					direction: "inbound",
					level: "warn",
				});
				await abort(KEXFailType.WrongSecurityLevel);
				return SecurityBootstrapFailure.S2WrongSecurityLevel;
			} else if (
				keySetEcho.grantedKeys.length !== grantedKeys.length ||
				!keySetEcho.grantedKeys.every((k) => grantedKeys.includes(k))
			) {
				this.driver.controllerLog.logNode(node.id, {
					message: `Security S2 bootstrapping failed: Granted key mismatch.`,
					level: "warn",
				});
				await abort(KEXFailType.WrongSecurityLevel);
				return SecurityBootstrapFailure.S2WrongSecurityLevel;
			}
			// Confirm the keys - the node will start requesting the granted keys in response
			await api.confirmGrantedKeys({
				requestCSA: kexParams.requestCSA,
				requestedKeys: [...kexParams.requestedKeys],
				supportedECDHProfiles: [...kexParams.supportedECDHProfiles],
				supportedKEXSchemes: [...kexParams.supportedKEXSchemes],
				_reserved: kexParams._reserved,
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
					await abort();
					return SecurityBootstrapFailure.NodeCanceled;
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
					await abort(KEXFailType.WrongSecurityLevel);
					return SecurityBootstrapFailure.S2WrongSecurityLevel;
				} else if (!grantedKeys.includes(securityClass)) {
					// and that the requested key is one of the granted keys
					this.driver.controllerLog.logNode(node.id, {
						message: `Security S2 bootstrapping failed: Node used key it was not granted.`,
						level: "warn",
					});
					await abort(KEXFailType.KeyNotGranted);
					return SecurityBootstrapFailure.S2WrongSecurityLevel;
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
					await abort();
					return SecurityBootstrapFailure.NodeCanceled;
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
					await abort(KEXFailType.NoVerify);
					return SecurityBootstrapFailure.S2WrongSecurityLevel;
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
				await abort(KEXFailType.NoVerify);
				return SecurityBootstrapFailure.Timeout;
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
						msg.statusContext!.basicDeviceClass!,
						msg.statusContext!.genericDeviceClass!,
						msg.statusContext!.specificDeviceClass!,
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

				const supportedCCs = [
					...newNode.implementedCommandClasses.entries(),
				]
					.filter(([, info]) => info.isSupported)
					.map(([cc]) => cc);
				const controlledCCs = [
					...newNode.implementedCommandClasses.entries(),
				]
					.filter(([, info]) => info.isControlled)
					.map(([cc]) => cc);

				this.emit("node found", {
					id: newNode.id,
					deviceClass: newNode.deviceClass,
					supportedCCs,
					controlledCCs,
				});

				this.driver.controllerLog.print(
					`finished adding node ${newNode.id}:
  basic device class:    ${newNode.deviceClass?.basic.label}
  generic device class:  ${newNode.deviceClass?.generic.label}
  specific device class: ${newNode.deviceClass?.specific.label}
  supported CCs: ${supportedCCs
		.map((cc) => `\n  · ${CommandClasses[cc]} (${num2hex(cc)})`)
		.join("")}
  controlled CCs: ${controlledCCs
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
				newNode.hasSUCReturnRoute = await this.assignSUCReturnRoutes(
					newNode.id,
				);

				const opts = this._inclusionOptions;

				let bootstrapFailure: SecurityBootstrapFailure | undefined;
				let smartStartFailed = false;

				// A controller performing a SmartStart network inclusion shall perform S2 bootstrapping,
				// even if the joining node does not show the S2 Command Class in its supported Command Class list.
				let forceAddedS2Support = false;
				if (
					opts.strategy === InclusionStrategy.SmartStart &&
					!newNode.supportsCC(CommandClasses["Security 2"])
				) {
					this.driver.controllerLog.logNode(newNode.id, {
						message:
							"does not list S2 as supported, but was included using SmartStart which implies S2 support.",
						level: "warn",
					});

					forceAddedS2Support = true;
					newNode.addCC(CommandClasses["Security 2"], {
						isSupported: true,
						version: 1,
					});
				}

				// The default inclusion strategy is: Use S2 if possible, only use S0 if necessary, use no encryption otherwise
				if (
					newNode.supportsCC(CommandClasses["Security 2"]) &&
					(opts.strategy === InclusionStrategy.Default ||
						opts.strategy === InclusionStrategy.Security_S2 ||
						opts.strategy === InclusionStrategy.SmartStart)
				) {
					bootstrapFailure = await this.secureBootstrapS2(newNode);
					const actualSecurityClass =
						newNode.getHighestSecurityClass();

					if (bootstrapFailure == undefined) {
						if (actualSecurityClass == SecurityClass.S0_Legacy) {
							// Notify user about potential S0 downgrade attack.
							// S0 is considered insecure if both controller and node are S2-capable
							bootstrapFailure =
								SecurityBootstrapFailure.S0Downgrade;

							this.driver.controllerLog.logNode(newNode.id, {
								message:
									"Possible S0 downgrade attack detected!",
								level: "warn",
							});
						} else if (!securityClassIsS2(actualSecurityClass)) {
							bootstrapFailure = SecurityBootstrapFailure.Unknown;
						}
					} else if (opts.strategy === InclusionStrategy.SmartStart) {
						smartStartFailed = true;
					}

					if (
						forceAddedS2Support &&
						!securityClassIsS2(actualSecurityClass)
					) {
						// Remove the fake S2 support again
						newNode.removeCC(CommandClasses["Security 2"]);
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
					bootstrapFailure = await this.secureBootstrapS0(newNode);
					if (bootstrapFailure == undefined) {
						const actualSecurityClass =
							newNode.getHighestSecurityClass();
						if (actualSecurityClass == SecurityClass.S0_Legacy) {
							// If the user chose this, i.e. InclusionStrategy.Security_S0 was used,
							// then this is the expected outcome and not a failure
							if (
								opts.strategy !== InclusionStrategy.Security_S0
							) {
								// S0 is considered insecure if both controller and node are S2-capable
								const nif = await newNode
									.requestNodeInfo()
									.catch(() => undefined);
								if (
									nif?.supportedCCs.includes(
										CommandClasses["Security 2"],
									)
								) {
									// Notify user about potential S0 downgrade attack.
									bootstrapFailure =
										SecurityBootstrapFailure.S0Downgrade;

									this.driver.controllerLog.logNode(
										newNode.id,
										{
											message:
												"Possible S0 downgrade attack detected!",
											level: "warn",
										},
									);
								}
							}
						} else {
							bootstrapFailure = SecurityBootstrapFailure.Unknown;
						}
					}
				} else {
					// Remember that no security classes were granted
					for (const secClass of securityClassOrder) {
						newNode.securityClasses.set(secClass, false);
					}
				}
				this._includeController = false;

				// After an unsuccessful SmartStart inclusion, the node MUST leave the network and return to SmartStart learn mode
				// The controller should consider the node to be failed.
				if (smartStartFailed) {
					try {
						this.driver.controllerLog.logNode(newNode.id, {
							message:
								"SmartStart inclusion failed. Checking if the node needs to be removed.",
							level: "warn",
						});

						await this.removeFailedNodeInternal(
							newNode.id,
							RemoveNodeReason.SmartStartFailed,
						);

						this.driver.controllerLog.logNode(newNode.id, {
							message: "was removed",
						});

						// The node was removed. Do not emit the "node added" event
						this.setInclusionState(InclusionState.Idle);
						return true;
					} catch {
						// The node could not be removed, continue
						this.driver.controllerLog.logNode(newNode.id, {
							message:
								"The node is still part of the network, continuing with insecure communication.",
							level: "warn",
						});
					}
				}

				this.setInclusionState(InclusionState.Idle);

				// We're done adding this node, notify listeners
				const result: InclusionResult =
					bootstrapFailure != undefined
						? {
								lowSecurity: true,
								lowSecurityReason: bootstrapFailure,
						  }
						: { lowSecurity: false };

				this.emit("node added", newNode, result);

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
					this.emit(
						"node removed",
						this._nodePendingReplace,
						RemoveNodeReason.Replaced,
					);
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

					this.emit("node found", {
						id: newNode.id,
					});

					// We're communicating with the device, so assume it is alive
					// If it is actually a sleeping device, it will be marked as such later
					newNode.markAsAlive();

					// Assign SUC return route to make sure the node knows where to get its routes from
					newNode.hasSUCReturnRoute =
						await this.assignSUCReturnRoutes(newNode.id);

					// Try perform the security bootstrap process. When replacing a node, we don't know any supported CCs
					// yet, so we need to trust the chosen inclusion strategy.
					const strategy = this._inclusionOptions.strategy;
					let bootstrapFailure: SecurityBootstrapFailure | undefined;
					if (strategy === InclusionStrategy.Security_S2) {
						bootstrapFailure = await this.secureBootstrapS2(
							newNode,
							true,
						);
						if (bootstrapFailure == undefined) {
							const actualSecurityClass =
								newNode.getHighestSecurityClass();
							if (
								actualSecurityClass == undefined ||
								actualSecurityClass <
									SecurityClass.S2_Unauthenticated
							) {
								bootstrapFailure =
									SecurityBootstrapFailure.Unknown;
							}
						}
					} else if (strategy === InclusionStrategy.Security_S0) {
						bootstrapFailure = await this.secureBootstrapS0(
							newNode,
							true,
						);
						if (bootstrapFailure == undefined) {
							const actualSecurityClass =
								newNode.getHighestSecurityClass();
							if (
								actualSecurityClass == undefined ||
								actualSecurityClass < SecurityClass.S0_Legacy
							) {
								bootstrapFailure =
									SecurityBootstrapFailure.Unknown;
							}
						}
					} else {
						// Remember that no security classes were granted
						for (const secClass of securityClassOrder) {
							newNode.securityClasses.set(secClass, false);
						}
					}

					// We're done adding this node, notify listeners. This also kicks off the node interview
					const result: InclusionResult =
						bootstrapFailure != undefined
							? {
									lowSecurity: true,
									lowSecurityReason: bootstrapFailure,
							  }
							: { lowSecurity: false };

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

			case RemoveNodeStatus.Reserved_0x05:
			// The reserved status can be triggered on some controllers by doing the following:
			// - factory reset the controller without excluding nodes
			// - include a new node with the same node ID as one on the previous network
			// - attempt to exclude the old node while the new node is responsive
			case RemoveNodeStatus.Done: {
				// this is called when the exclusion was completed
				// stop the exclusion process so we don't accidentally remove another node
				try {
					await this.stopExclusionNoCallback();
				} catch {
					/* ok */
				}

				if (
					msg.status === RemoveNodeStatus.Reserved_0x05 ||
					!this._nodePendingExclusion
				) {
					// The exclusion did not succeed
					this.setInclusionState(InclusionState.Idle);
					return true;
				}

				const nodeId = this._nodePendingExclusion.id;
				this.driver.controllerLog.print(`Node ${nodeId} was removed`);

				// Avoid automatic re-inclusion using SmartStart if desired
				switch (this._exclusionOptions?.strategy) {
					case ExclusionStrategy.Unprovision:
						this.unprovisionSmartStartNode(nodeId);
						break;

					case ExclusionStrategy.DisableProvisioningEntry: {
						const entry = this.getProvisioningEntryInternal(nodeId);
						if (entry) {
							entry.status = ProvisioningEntryStatus.Inactive;
							this.provisionSmartStartNode(entry);
						}
						break;
					}
				}

				this._exclusionOptions = undefined;

				// notify listeners
				this.emit(
					"node removed",
					this._nodePendingExclusion,
					RemoveNodeReason.Excluded,
				);
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
	public beginHealingNetwork(options: HealNetworkOptions = {}): boolean {
		// Don't start the process twice
		if (this._healNetworkActive) return false;
		this._healNetworkActive = true;

		options.includeSleeping ??= true;

		this.driver.controllerLog.print(
			`starting network heal${
				options.includeSleeping ? "" : " for mains-powered nodes"
			}...`,
		);

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
			} else if (!options.includeSleeping && node.canSleep) {
				this._healNetworkProgress.set(id, "skipped");
			} else {
				this._healNetworkProgress.set(id, "pending");
			}
		}

		// Do the heal process in the background
		void this.healNetwork(options).catch(() => {
			/* ignore errors */
		});

		// And update the progress once at the start
		this.emit("heal network progress", new Map(this._healNetworkProgress));

		return true;
	}

	private async healNetwork(options: HealNetworkOptions): Promise<void> {
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
					if (options.includeSleeping) {
						this.driver.controllerLog.logNode(
							nodeId,
							"added to healing queue for sleeping nodes",
						);
						todoSleeping.push(nodeId);
					}
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

		if (options.includeSleeping) {
			// Now heal all sleeping nodes at once
			this.driver.controllerLog.print(
				"Healing sleeping nodes in parallel. Wake them up to heal.",
			);

			const tasks = todoSleeping.map((nodeId) => doHeal(nodeId));
			await Promise.all(tasks);
		}

		// Only emit the done event when the process wasn't stopped in the meantime
		if (this._healNetworkActive) {
			this.driver.controllerLog.print("network heal completed");

			this.emit("heal network done", new Map(this._healNetworkProgress));
		} else {
			this.driver.controllerLog.print("network heal aborted");
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
		// We cannot heal the controller
		if (nodeId === this._ownNodeId) {
			throw new ZWaveError(
				`Healing the controller itself is not possible!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

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
					const result = await this.discoverNodeNeighbors(nodeId);
					if (result) {
						this.driver.controllerLog.logNode(nodeId, {
							message: "neighbor list refreshed...",
							direction: "inbound",
						});
						// this step was successful, continue with the next
						break;
					} else {
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
			node.hasSUCReturnRoute ||= await this.assignSUCReturnRoutes(nodeId);

			// 3. delete all return routes to get rid of potential priority return routes
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				this.driver.controllerLog.logNode(nodeId, {
					message: `deleting return routes (attempt ${attempt})...`,
					direction: "outbound",
				});

				if (await this.deleteReturnRoutes(nodeId)) {
					break;
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

			// 4. Assign return routes to all association destinations.
			let associatedNodes: number[] = [];
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
			// One of those should probably be the controller. Not sure if the SUC return route is enough.
			if (!associatedNodes.includes(this._ownNodeId!)) {
				associatedNodes.unshift(this._ownNodeId!);
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

					if (
						await this.assignReturnRoutes(nodeId, destinationNodeId)
					) {
						// this step was successful, continue with the next
						break;
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

	// After a lot of experimenting, it seems to make sense to document how assigning return routes works in the controller.
	// Each node has a list of 4 return routes per destination (and probably a separate list for the SUC):
	// - #0, repeaters..., speed, wakeup
	// - #1, repeaters..., speed, wakeup
	// - #2, repeaters..., speed, wakeup
	// - #3, repeaters..., speed, wakeup
	//
	// Empty slots are filled with 0 repeaters, 9.6kbit/s, no wakeup
	//
	// Calling assignReturnRoute will assign all 4 slots, some of which may be empty.
	// Calling deleteReturnRoute will assign an empty route to all 4 slots.
	//
	// Priority return routes are indicated by a separate "pointer" byte which tells the node which route is the priority.
	// Calling assignPriorityReturnRoute will first assign 4 routes, one of which is then marked as priority.
	// This is not fully understood yet, but it seems that the priority route is actually the last non-empty route.
	// If the priority byte points to an empty route, it is ignored.
	//
	// Calling assignReturnRoute after having assigned a priority return route will not clear that pointer byte. This
	// means that a previously-assigned priority route can randomly change if assignReturnRoute assigns enough routes.
	// deleteReturnRoute does also clear the priority byte.

	/** @deprecated Use {@link assignSUCReturnRoutes} instead */
	public assignSUCReturnRoute(nodeId: number): Promise<boolean> {
		return this.assignSUCReturnRoutes(nodeId);
	}

	/**
	 * Instructs the controller to assign static routes from the given end node to the SUC.
	 * This will assign up to 4 routes, depending on the network topology (that the controller knows about).
	 */
	public async assignSUCReturnRoutes(nodeId: number): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning SUC return route...`,
			direction: "outbound",
		});

		// Since there is only one SUC, we can do the right thing here and delete all routes first, which clears any dangling priority return routes.
		// Afterwards, we'll set up all routes again anyways.
		await this.deleteSUCReturnRoutes(nodeId);

		try {
			const result =
				await this.driver.sendMessage<AssignSUCReturnRouteRequestTransmitReport>(
					new AssignSUCReturnRouteRequest(this.driver, {
						nodeId,
					}),
				);

			const success = this.handleRouteAssignmentTransmitReport(
				result,
				nodeId,
			);
			if (success) {
				// Custom assigned are no longer valid
				this.setCustomSUCReturnRoutesCached(nodeId, undefined);
			}
			return success;
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Assigning SUC return route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	/**
	 * Returns which custom static routes are currently assigned from the given end node to the SUC.
	 *
	 * **Note:** This only considers routes that were assigned using {@link assignCustomSUCReturnRoutes}.
	 * If another controller has assigned routes in the meantime, this information may be out of date.
	 */
	public getCustomSUCReturnRoutesCached(nodeId: number): Route[] {
		return (
			this.driver.cacheGet<Route[]>(
				cacheKeys.node(nodeId).customSUCReturnRoutes,
			) ?? []
		);
	}

	private setCustomSUCReturnRoutesCached(
		nodeId: number,
		routes: Route[] | undefined,
	): void {
		this.driver.cacheSet(
			cacheKeys.node(nodeId).customSUCReturnRoutes,
			routes,
		);
	}

	/**
	 * Assigns static routes from the given end node to the SUC. Unlike {@link assignSUCReturnRoutes}, this method assigns
	 * the given routes instead of having the controller calculate them. At most 4 routes can be assigned. If less are
	 * specified, the remaining routes are cleared.
	 *
	 * To mark a route as a priority route, pass it as the optional `priorityRoute` parameter. At most 3 routes of the
	 * `routes` array will then be used as fallback routes.
	 *
	 * **Note:** Calling {@link assignSUCReturnRoutes} or {@link deleteSUCReturnRoutes} will override the custom routes.
	 *
	 * Returns `true` when the process was successful, or `false` if at least one step failed.
	 */
	public async assignCustomSUCReturnRoutes(
		nodeId: number,
		routes: Route[],
		priorityRoute?: Route,
	): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning custom SUC return routes...`,
			direction: "outbound",
		});

		// Since there is only one SUC, we can do the right thing here and delete all routes first, which clears the priority return routes.
		await this.deleteSUCReturnRoutes(nodeId);

		let result = true;
		const MAX_ROUTES = 4;

		// Keep track of which routes have been assigned
		const assignedRoutes = new Array(MAX_ROUTES).fill(EMPTY_ROUTE);

		let priorityRouteIndex = -1;
		// If a priority route is given, add it to the end of the routes array to mimick what the Z-Wave controller does
		if (priorityRoute) {
			priorityRouteIndex = Math.min(MAX_ROUTES - 1, routes.length);
			routes[priorityRouteIndex] = priorityRoute;
		}

		for (let i = 0; i < MAX_ROUTES; i++) {
			const route = routes[i] ?? EMPTY_ROUTE;
			const isEmpty = isEmptyRoute(route);

			// We are always listening
			const targetWakeup = false;

			const cc = new ZWaveProtocolCCAssignSUCReturnRoute(this.driver, {
				nodeId,
				// Empty routes are marked with a nodeId of 0
				destinationNodeId: isEmpty ? 0 : this.ownNodeId ?? 1,
				routeIndex: i,
				repeaters: route.repeaters,
				destinationSpeed: route.routeSpeed,
				destinationWakeUp: FLiRS2WakeUpTime(targetWakeup ?? false),
			});

			try {
				await this.driver.sendZWaveProtocolCC(cc);

				// Remember that this route has been assigned
				if (i !== priorityRouteIndex) assignedRoutes[i] = route;
			} catch (e) {
				this.driver.controllerLog.logNode(nodeId, {
					message: `Assigning custom SUC return route #${i} failed`,
					direction: "outbound",
					level: "warn",
				});

				result = false;
			}
		}

		// If a priority route was passed, tell the node to use it
		if (priorityRouteIndex >= 0) {
			const cc = new ZWaveProtocolCCAssignSUCReturnRoutePriority(
				this.driver,
				{
					nodeId,
					targetNodeId: this.ownNodeId ?? 1,
					routeNumber: priorityRouteIndex,
				},
			);
			try {
				await this.driver.sendZWaveProtocolCC(cc);
			} catch (e) {
				this.driver.controllerLog.logNode(nodeId, {
					message: `Marking custom SUC return route as priority failed`,
					direction: "outbound",
					level: "warn",
				});

				result = false;
			}
		}

		// Trim empty routes off the end. We may end up with empty routes in the middle
		// if an assignment fails.
		while (
			assignedRoutes.length > 0 &&
			isEmptyRoute(assignedRoutes[assignedRoutes.length - 1])
		) {
			assignedRoutes.pop();
		}

		// Remember the routes we assigned
		this.setPrioritySUCReturnRouteCached(nodeId, priorityRoute);
		this.setCustomSUCReturnRoutesCached(nodeId, assignedRoutes);

		return result;
	}

	/** @deprecated use {@link deleteSUCReturnRoutes} instead */
	public deleteSUCReturnRoute(nodeId: number): Promise<boolean> {
		return this.deleteReturnRoutes(nodeId);
	}

	/**
	 * Instructs the controller to assign static routes from the given end node to the SUC.
	 * This will assign up to 4 routes, depending on the network topology (that the controller knows about).
	 */
	public async deleteSUCReturnRoutes(nodeId: number): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Deleting SUC return route...`,
			direction: "outbound",
		});

		try {
			const result =
				await this.driver.sendMessage<DeleteSUCReturnRouteRequestTransmitReport>(
					new DeleteSUCReturnRouteRequest(this.driver, {
						nodeId,
					}),
				);

			const success = this.handleRouteAssignmentTransmitReport(
				result,
				nodeId,
			);
			if (success) {
				// Custom assigned and priority return routes are no longer valid
				this.setPrioritySUCReturnRouteCached(nodeId, undefined);
				this.setCustomSUCReturnRoutesCached(nodeId, undefined);
			}
			return success;
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Deleting SUC return route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	/**
	 * Returns which custom static routes are currently assigned between the given end nodes.
	 *
	 * **Note:** This only considers routes that were assigned using {@link assignCustomReturnRoutes}.
	 * If another controller has assigned routes in the meantime, this information may be out of date.
	 */
	public getCustomReturnRoutesCached(
		nodeId: number,
		destinationNodeId: number,
	): Route[] {
		return (
			this.driver.cacheGet<Route[]>(
				cacheKeys.node(nodeId).customReturnRoutes(destinationNodeId),
			) ?? []
		);
	}

	private setCustomReturnRoutesCached(
		nodeId: number,
		destinationNodeId: number,
		routes: Route[] | undefined,
	): void {
		this.driver.cacheSet(
			cacheKeys.node(nodeId).customReturnRoutes(destinationNodeId),
			routes,
		);
	}

	private clearCustomReturnRoutesCached(nodeId: number): void {
		// This is a bit ugly, but the best we can do right now.
		for (let dest = 1; dest <= MAX_NODES; dest++) {
			this.setCustomReturnRoutesCached(nodeId, dest, undefined);
		}
	}

	/** @deprecated use {@link assignReturnRoutes} instead */
	public assignReturnRoute(
		nodeId: number,
		destinationNodeId: number,
	): Promise<boolean> {
		return this.assignReturnRoutes(nodeId, destinationNodeId);
	}

	/**
	 * Instructs the controller to assign static routes between the two given end nodes.
	 * This will assign up to 4 routes, depending on the network topology (that the controller knows about).
	 */
	public async assignReturnRoutes(
		nodeId: number,
		destinationNodeId: number,
	): Promise<boolean> {
		// Make sure this is not misused by passing the controller's node ID
		if (destinationNodeId === this.ownNodeId) {
			return this.assignSUCReturnRoutes(nodeId);
		}

		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning return routes to node ${destinationNodeId}...`,
			direction: "outbound",
		});

		try {
			const result =
				await this.driver.sendMessage<AssignReturnRouteRequestTransmitReport>(
					new AssignReturnRouteRequest(this.driver, {
						nodeId,
						destinationNodeId,
					}),
				);

			const success = this.handleRouteAssignmentTransmitReport(
				result,
				nodeId,
			);
			if (success) {
				// Custom assigned are no longer valid
				this.setCustomReturnRoutesCached(
					nodeId,
					destinationNodeId,
					undefined,
				);
				// The priority route probably is invalid too now, but it may also point to a random route
				if (
					this.hasPriorityReturnRouteCached(
						nodeId,
						destinationNodeId,
					) !== false
				) {
					this.setPriorityReturnRouteCached(
						nodeId,
						destinationNodeId,
						UNKNOWN_STATE,
					);
				}
			}
			return success;
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Assigning return routes failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	/**
	 * Assigns static routes between the two given end nodes. Unlike {@link assignReturnRoutes}, this method assigns
	 * the given routes instead of having the controller calculate them. At most 4 routes can be assigned. If less are
	 * specified, the remaining routes are cleared.
	 *
	 * **Note:** Calling {@link assignReturnRoutes} or {@link deleteReturnRoutes} will override the custom routes.
	 */
	public async assignCustomReturnRoutes(
		nodeId: number,
		destinationNodeId: number,
		routes: Route[],
		priorityRoute?: Route,
	): Promise<boolean> {
		// Make sure this is not misused by passing the controller's node ID
		if (destinationNodeId === this.ownNodeId) {
			return this.assignCustomSUCReturnRoutes(
				nodeId,
				routes,
				priorityRoute,
			);
		}

		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning custom return routes to node ${destinationNodeId}...`,
			direction: "outbound",
		});

		let result = true;
		const MAX_ROUTES = 4;

		// Keep track of which routes have been assigned
		const assignedRoutes = new Array(MAX_ROUTES).fill(EMPTY_ROUTE);

		let priorityRouteIndex = -1;
		// If a priority route is given, add it to the end of the routes array to mimick what the Z-Wave controller does
		if (priorityRoute) {
			priorityRouteIndex = Math.min(MAX_ROUTES - 1, routes.length);
			routes[priorityRouteIndex] = priorityRoute;
		}

		for (let i = 0; i < MAX_ROUTES; i++) {
			const route = routes[i] ?? EMPTY_ROUTE;
			const isEmpty = isEmptyRoute(route);

			const targetWakeup = !isEmpty
				? this.nodes.get(destinationNodeId)?.isFrequentListening
				: undefined;

			const cc = new ZWaveProtocolCCAssignReturnRoute(this.driver, {
				nodeId,
				// Empty routes are marked with a nodeId of 0
				destinationNodeId: isEmpty ? 0 : destinationNodeId,
				routeIndex: i,
				repeaters: route.repeaters,
				destinationSpeed: route.routeSpeed,
				destinationWakeUp: FLiRS2WakeUpTime(targetWakeup ?? false),
			});

			try {
				await this.driver.sendZWaveProtocolCC(cc);

				// Remember that this route has been assigned
				if (i !== priorityRouteIndex) assignedRoutes[i] = route;
			} catch (e) {
				this.driver.controllerLog.logNode(nodeId, {
					message: `Assigning custom return route #${i} failed`,
					direction: "outbound",
					level: "warn",
				});

				result = false;
			}
		}

		// If a priority route was passed, tell the node to use it
		if (priorityRouteIndex >= 0) {
			const cc = new ZWaveProtocolCCAssignReturnRoutePriority(
				this.driver,
				{
					nodeId,
					targetNodeId: destinationNodeId,
					routeNumber: priorityRouteIndex,
				},
			);
			try {
				await this.driver.sendZWaveProtocolCC(cc);
			} catch (e) {
				this.driver.controllerLog.logNode(nodeId, {
					message: `Marking custom return route as priority failed`,
					direction: "outbound",
					level: "warn",
				});

				result = false;
			}
		}

		// Trim empty routes off the end. We may end up with empty routes in the middle
		// if an assignment fails.
		while (
			assignedRoutes.length > 0 &&
			isEmptyRoute(assignedRoutes[assignedRoutes.length - 1])
		) {
			assignedRoutes.pop();
		}

		this.setCustomReturnRoutesCached(
			nodeId,
			destinationNodeId,
			assignedRoutes,
		);
		if (priorityRoute) {
			this.setPriorityReturnRouteCached(
				nodeId,
				destinationNodeId,
				priorityRoute,
			);
		} else if (
			this.hasPriorityReturnRouteCached(nodeId, destinationNodeId) !==
			false
		) {
			// The priority route is probably invalid now, but it may also point to a random route
			this.setPriorityReturnRouteCached(
				nodeId,
				destinationNodeId,
				UNKNOWN_STATE,
			);
		}

		return result;
	}

	/** @deprecated use {@link deleteReturnRoutes} instead */
	public deleteReturnRoute(nodeId: number): Promise<boolean> {
		return this.deleteReturnRoutes(nodeId);
	}

	/**
	 * Instructs the controller to delete all static routes between the given node and all
	 * other end nodes, including the priority return routes.
	 */
	public async deleteReturnRoutes(nodeId: number): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Deleting all return routes...`,
			direction: "outbound",
		});

		try {
			const result =
				await this.driver.sendMessage<DeleteReturnRouteRequestTransmitReport>(
					new DeleteReturnRouteRequest(this.driver, {
						nodeId,
					}),
				);

			const success = this.handleRouteAssignmentTransmitReport(
				result,
				nodeId,
			);
			if (success) {
				// All custom assigned routes are no longer valid
				this.clearPriorityReturnRoutesCached(nodeId);
				this.clearCustomReturnRoutesCached(nodeId);
			}
			return success;
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
	 * Assigns a priority route between two end nodes. This route will always be used for the first transmission attempt.
	 * @param nodeId The ID of the source node of the route
	 * @param destinationNodeId The ID of the destination node of the route
	 * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
	 * @param routeSpeed The transmission speed to use for the route
	 */
	public async assignPriorityReturnRoute(
		nodeId: number,
		destinationNodeId: number,
		repeaters: number[],
		routeSpeed: ZWaveDataRate,
	): Promise<boolean> {
		// Make sure this is not misused by passing the controller's node ID
		if (destinationNodeId === this.ownNodeId) {
			return this.assignPrioritySUCReturnRoute(
				nodeId,
				repeaters,
				routeSpeed,
			);
		}

		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning priority return route to node ${destinationNodeId}...`,
			direction: "outbound",
		});

		try {
			const result =
				await this.driver.sendMessage<AssignReturnRouteRequestTransmitReport>(
					new AssignPriorityReturnRouteRequest(this.driver, {
						nodeId,
						destinationNodeId,
						repeaters,
						routeSpeed,
					}),
				);

			const success = this.handleRouteAssignmentTransmitReport(
				result,
				nodeId,
			);
			if (success) {
				// Update the cached priority route
				this.setPriorityReturnRouteCached(nodeId, destinationNodeId, {
					repeaters,
					routeSpeed,
				});
			}
			return success;
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Assigning priority return route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	private hasPriorityReturnRouteCached(
		nodeId: number,
		destinationNodeId: number,
	): MaybeUnknown<boolean> {
		const ret = this.driver.cacheGet<MaybeUnknown<Route>>(
			cacheKeys.node(nodeId).priorityReturnRoute(destinationNodeId),
		);
		if (ret === UNKNOWN_STATE) return UNKNOWN_STATE;
		return ret !== undefined;
	}

	private setPriorityReturnRouteCached(
		nodeId: number,
		destinationNodeId: number,
		route: MaybeUnknown<Route> | undefined,
	): void {
		this.driver.cacheSet(
			cacheKeys.node(nodeId).priorityReturnRoute(destinationNodeId),
			route,
		);
	}

	private clearPriorityReturnRoutesCached(nodeId: number): void {
		// This is a bit ugly, but the best we can do right now.
		for (let dest = 1; dest <= MAX_NODES; dest++) {
			this.setPriorityReturnRouteCached(nodeId, dest, undefined);
		}
	}

	/**
	 * Returns which priority route is currently assigned between the given end nodes.
	 *
	 * **Note:** This is using cached information, since there's no way to query priority routes from a node.
	 * If another controller has assigned routes in the meantime, this information may be out of date.
	 */
	public getPriorityReturnRouteCached(
		nodeId: number,
		destinationNodeId: number,
	): MaybeUnknown<Route> | undefined {
		return this.driver.cacheGet(
			cacheKeys.node(nodeId).priorityReturnRoute(destinationNodeId),
		);
	}

	/**
	 * Assigns a priority route from an end node to the SUC. This route will always be used for the first transmission attempt.
	 * @param nodeId The ID of the end node for which to assign the route
	 * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
	 * @param routeSpeed The transmission speed to use for the route
	 */
	public async assignPrioritySUCReturnRoute(
		nodeId: number,
		repeaters: number[],
		routeSpeed: ZWaveDataRate,
	): Promise<boolean> {
		this.driver.controllerLog.logNode(nodeId, {
			message: `Assigning priority SUC return route...`,
			direction: "outbound",
		});

		try {
			const result =
				await this.driver.sendMessage<AssignPrioritySUCReturnRouteRequestTransmitReport>(
					new AssignPrioritySUCReturnRouteRequest(this.driver, {
						nodeId,
						repeaters,
						routeSpeed,
					}),
				);

			const success = this.handleRouteAssignmentTransmitReport(
				result,
				nodeId,
			);
			if (success) {
				// Update the cached priority route
				this.setPrioritySUCReturnRouteCached(nodeId, {
					repeaters,
					routeSpeed,
				});
				// The command above assigns a full set of new routes, so
				// custom SUC return routes are no longer valid
				this.setCustomSUCReturnRoutesCached(nodeId, undefined);
			}
			return success;
		} catch (e) {
			this.driver.controllerLog.logNode(
				nodeId,
				`Assigning priority SUC return route failed: ${getErrorMessage(
					e,
				)}`,
				"error",
			);
			return false;
		}
	}

	private setPrioritySUCReturnRouteCached(
		nodeId: number,
		route: Route | undefined,
	): void {
		this.driver.cacheSet(
			cacheKeys.node(nodeId).prioritySUCReturnRoute,
			route,
		);
	}

	/**
	 * Returns which priority route is currently assigned from the given end node to the SUC.
	 *
	 * **Note:** This is using cached information, since there's no way to query priority routes from a node.
	 * If another controller has assigned routes in the meantime, this information may be out of date.
	 */
	public getPrioritySUCReturnRouteCached(nodeId: number): Route | undefined {
		return this.driver.cacheGet(
			cacheKeys.node(nodeId).prioritySUCReturnRoute,
		);
	}

	private handleRouteAssignmentTransmitReport(
		msg: TransmitReport,
		nodeId: number,
	): boolean {
		switch (msg.transmitStatus) {
			case TransmitStatus.OK:
				return true;
			case TransmitStatus.NoAck:
				return false;
			case TransmitStatus.NoRoute:
				this.driver.controllerLog.logNode(
					nodeId,
					`Route resolution failed`,
					"warn",
				);
				return false;
			default:
				return false;
		}
	}

	/**
	 * Sets the priority route which will always be used for the first transmission attempt from the controller to the given node.
	 * @param destinationNodeId The ID of the node that should be reached via the priority route
	 * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
	 * @param routeSpeed The transmission speed to use for the route
	 */
	public async setPriorityRoute(
		destinationNodeId: number,
		repeaters: number[],
		routeSpeed: ZWaveDataRate,
	): Promise<boolean> {
		// 7.xx firmwares (up to at least 7.19.2) have a bug where the response to
		// SetPriorityRoute is missing the result byte when used with 16-bit node IDs.
		// So we temporarily switch back to 8-bit node IDs for this message

		if (
			this.isSerialAPISetupCommandSupported(
				SerialAPISetupCommand.SetNodeIDType,
			)
		) {
			try {
				await this.setNodeIDType(NodeIDType.Short);
			} catch {
				// ignore
			}
		}

		this.driver.controllerLog.print(
			`Setting priority route to node ${destinationNodeId}...`,
		);

		let ret: boolean;

		try {
			const result = await this.driver.sendMessage<
				Message & SuccessIndicator
			>(
				new SetPriorityRouteRequest(this.driver, {
					destinationNodeId,
					repeaters,
					routeSpeed,
				}),
			);

			ret = result.isOK();
		} catch (e) {
			this.driver.controllerLog.print(
				`Setting priority route failed: ${getErrorMessage(e)}`,
				"error",
			);
			ret = false;
		}

		// Switch back to 16-bit node IDs
		if (
			this.isSerialAPISetupCommandSupported(
				SerialAPISetupCommand.SetNodeIDType,
			)
		) {
			try {
				await this.setNodeIDType(NodeIDType.Long);
			} catch {
				// ignore
			}
		}

		return ret;
	}

	/**
	 * Removes the priority route used for the first transmission attempt from the controller to the given node.
	 * @param destinationNodeId The ID of the node that should be reached via the priority route
	 */
	public async removePriorityRoute(
		destinationNodeId: number,
	): Promise<boolean> {
		this.driver.controllerLog.print(
			`Removing priority route to node ${destinationNodeId}...`,
		);

		try {
			const result = await this.driver.sendMessage<
				Message & SuccessIndicator
			>(
				new SetPriorityRouteRequest(this.driver, {
					destinationNodeId,
					// no repeaters = remove
				}),
			);

			return result.isOK();
		} catch (e) {
			this.driver.controllerLog.print(
				`Removing priority route failed: ${getErrorMessage(e)}`,
				"error",
			);
			return false;
		}
	}

	/**
	 * Returns the priority route which is currently set for a node.
	 * If none is set, either the LWR or the NLWR is returned.
	 * If no route is known yet, this returns `undefined`.
	 *
	 * @param destinationNodeId The ID of the node for which the priority route should be returned
	 */
	public async getPriorityRoute(destinationNodeId: number): Promise<
		| {
				routeKind:
					| RouteKind.LWR
					| RouteKind.NLWR
					| RouteKind.Application;
				repeaters: number[];
				routeSpeed: ZWaveDataRate;
		  }
		| undefined
	> {
		this.driver.controllerLog.print(
			`Retrieving priority route to node ${destinationNodeId}...`,
		);

		try {
			const result =
				await this.driver.sendMessage<GetPriorityRouteResponse>(
					new GetPriorityRouteRequest(this.driver, {
						destinationNodeId,
					}),
				);

			if (result.routeKind === RouteKind.None) return undefined;

			// If we do not have any route statistics for the node yet, use this information to
			// to at least partially populate it
			const node = this.nodes.get(destinationNodeId);
			if (
				node &&
				(result.routeKind === RouteKind.LWR ||
					result.routeKind === RouteKind.NLWR)
			) {
				const routeName =
					result.routeKind === RouteKind.LWR ? "lwr" : "nlwr";

				if (!node.statistics[routeName]) {
					node.updateStatistics((current) => {
						const ret = { ...current };
						ret[routeName] = {
							repeaters: result.repeaters!,
							protocolDataRate:
								// ZWaveDataRate is a subset of ProtocolDataRate
								result.routeSpeed as unknown as ProtocolDataRate,
						};
						return ret;
					});
				}
			}

			return {
				routeKind: result.routeKind,
				repeaters: result.repeaters!,
				routeSpeed: result.routeSpeed!,
			};
		} catch (e) {
			this.driver.controllerLog.print(
				`Retrieving priority route failed: ${getErrorMessage(e)}`,
				"error",
			);
		}
	}

	/**
	 * Returns a dictionary of all association groups of this node or endpoint and their information.
	 * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
	 * This only works AFTER the interview process
	 */
	public getAssociationGroups(
		source: AssociationAddress,
	): ReadonlyMap<number, AssociationGroup> {
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);

		return ccUtils.getAssociationGroups(this.driver, endpoint);
	}

	/**
	 * Returns all association groups that exist on a node and all its endpoints.
	 * The returned map uses the endpoint index as keys and its values are maps of group IDs to their definition
	 */
	public getAllAssociationGroups(
		nodeId: number,
	): ReadonlyMap<number, ReadonlyMap<number, AssociationGroup>> {
		const node = this.nodes.getOrThrow(nodeId);
		return ccUtils.getAllAssociationGroups(this.driver, node);
	}

	/**
	 * Returns all associations (Multi Channel or normal) that are configured on the root device or an endpoint of a node.
	 * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
	 */
	public getAssociations(
		source: AssociationAddress,
	): ReadonlyMap<number, readonly AssociationAddress[]> {
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);

		return ccUtils.getAssociations(this.driver, endpoint);
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
		return ccUtils.getAllAssociations(this.driver, node);
	}

	/**
	 * Checks if a given association is allowed.
	 */
	public isAssociationAllowed(
		source: AssociationAddress,
		group: number,
		destination: AssociationAddress,
	): boolean {
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);

		return ccUtils.isAssociationAllowed(
			this.driver,
			endpoint,
			group,
			destination,
		);
	}

	/**
	 * Adds associations to a node or endpoint
	 */
	public async addAssociations(
		source: AssociationAddress,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void> {
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);

		await ccUtils.addAssociations(
			this.driver,
			endpoint,
			group,
			destinations,
		);

		// Nodes need a return route to be able to send commands to other nodes
		const destinationNodeIDs = distinct(
			destinations.map((d) => d.nodeId),
			// Except to the controller itself - this route is already known
		).filter((id) => id !== this.ownNodeId);
		for (const id of destinationNodeIDs) {
			await this.assignReturnRoutes(source.nodeId, id);
		}
	}

	/**
	 * Removes the given associations from a node or endpoint
	 */
	public removeAssociations(
		source: AssociationAddress,
		group: number,
		destinations: AssociationAddress[],
	): Promise<void> {
		const node = this.nodes.getOrThrow(source.nodeId);
		const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);

		return ccUtils.removeAssociations(
			this.driver,
			endpoint,
			group,
			destinations,
		);
	}

	/**
	 * Removes a node from all other nodes' associations
	 * WARNING: It is not recommended to await this method
	 */
	public async removeNodeFromAllAssociations(nodeId: number): Promise<void> {
		const tasks: Promise<any>[] = [];
		// Check each endpoint of each node if they have an association to this node
		for (const node of this.nodes.values()) {
			if (node.id === this._ownNodeId || node.id === nodeId) continue;
			if (node.interviewStage !== InterviewStage.Complete) continue;

			for (const endpoint of node.getAllEndpoints()) {
				// Prefer multi channel associations if that is available
				if (
					endpoint.commandClasses[
						"Multi Channel Association"
					].isSupported()
				) {
					const existing =
						MultiChannelAssociationCC.getAllDestinationsCached(
							this.driver,
							endpoint,
						);
					if (
						[...existing.values()].some((dests) =>
							dests.some((a) => a.nodeId === nodeId),
						)
					) {
						tasks.push(
							endpoint.commandClasses[
								"Multi Channel Association"
							].removeDestinations({
								nodeIds: [nodeId],
							}),
						);
					}
				} else if (endpoint.commandClasses.Association.isSupported()) {
					const existing = AssociationCC.getAllDestinationsCached(
						this.driver,
						endpoint,
					);
					if (
						[...existing.values()].some((dests) =>
							dests.some((a) => a.nodeId === nodeId),
						)
					) {
						tasks.push(
							endpoint.commandClasses.Association.removeNodeIdsFromAllGroups(
								[nodeId],
							),
						);
					}
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
		await this.removeFailedNodeInternal(
			nodeId,
			RemoveNodeReason.RemoveFailed,
		);
	}

	/** @internal */
	public async removeFailedNodeInternal(
		nodeId: number,
		reason: RemoveNodeReason,
	): Promise<void> {
		const node = this.nodes.getOrThrow(nodeId);

		// It is possible that this method is called while the node is still in the process of resetting or leaving the network
		// Therefore, we ping multiple times in case of success and wait a bit in between
		let didFail = false;
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			if (await node.ping()) {
				if (attempt < MAX_ATTEMPTS) await wait(2000);
				continue;
			}

			didFail = true;
			break;
		}
		if (!didFail) {
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
					this.emit("node removed", this.nodes.get(nodeId)!, reason);
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
		options: ReplaceNodeOptions = {
			strategy: InclusionStrategy.Insecure,
		},
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
		this._rfRegion = region;
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
		this._rfRegion = result.region;
		return result.region;
	}

	/** Configure the Powerlevel setting of the Z-Wave API */
	public async setPowerlevel(
		powerlevel: number,
		measured0dBm: number,
	): Promise<boolean> {
		let request: Message;
		if (
			this.supportedSerialAPISetupCommands?.includes(
				SerialAPISetupCommand.SetPowerlevel16Bit,
			)
		) {
			request = new SerialAPISetup_SetPowerlevel16BitRequest(
				this.driver,
				{
					powerlevel,
					measured0dBm,
				},
			);
		} else {
			request = new SerialAPISetup_SetPowerlevelRequest(this.driver, {
				powerlevel,
				measured0dBm,
			});
		}

		const result = await this.driver.sendMessage<
			| SerialAPISetup_SetPowerlevelResponse
			| SerialAPISetup_SetPowerlevel16BitResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(request);

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
		let request: Message;
		if (
			this.supportedSerialAPISetupCommands?.includes(
				SerialAPISetupCommand.GetPowerlevel16Bit,
			)
		) {
			request = new SerialAPISetup_GetPowerlevel16BitRequest(this.driver);
		} else {
			request = new SerialAPISetup_GetPowerlevelRequest(this.driver);
		}
		const result = await this.driver.sendMessage<
			| SerialAPISetup_GetPowerlevelResponse
			| SerialAPISetup_GetPowerlevel16BitResponse
			| SerialAPISetup_CommandUnsupportedResponse
		>(request);

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
		this.driver.controllerLog.print(
			`Switching serial API to ${
				nodeIdType === NodeIDType.Short ? 8 : 16
			}-bit node IDs...`,
		);

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
		} else {
			this.driver.controllerLog.print(
				`Switching to ${
					nodeIdType === NodeIDType.Short ? 8 : 16
				}-bit node IDs ${result.success ? "successful" : "failed"}`,
			);

			if (result.success) {
				this._nodeIdType = nodeIdType;
			}
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
	 * Instructs a node to (re-)discover its neighbors.
	 *
	 * **WARNING:** On some controllers, this can cause new SUC return routes to be assigned.
	 *
	 * @returns `true` if the update was successful and the new neighbors can be retrieved using
	 * {@link getNodeNeighbors}. `false` if the update failed.
	 */
	public async discoverNodeNeighbors(nodeId: number): Promise<boolean> {
		// TODO: Consider making this not block the send queue.
		// However, I haven't actually seen a UpdateStarted callback in the wild,
		// so we don't know if that would even work.

		// We cannot discover neighbors for the controller
		if (nodeId === this._ownNodeId) {
			throw new ZWaveError(
				`Discovering neighbors for the controller itself is not possible!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// During inclusion, the timeout is mainly required for the node to detect all neighbors
		// We do the same here, so we just reuse the timeout
		const discoveryTimeout = computeNeighborDiscoveryTimeout(
			this.driver,
			// Controllers take longer, just assume the worst case here
			NodeType.Controller,
		);

		const resp =
			await this.driver.sendMessage<RequestNodeNeighborUpdateReport>(
				new RequestNodeNeighborUpdateRequest(this.driver, {
					nodeId,
					discoveryTimeout,
				}),
			);
		const success =
			resp.updateStatus === NodeNeighborUpdateStatus.UpdateDone;

		if (success) {
			// Not sure why, but Zniffer traces show that a node neighbor update can cause the controller to
			// also do AssignSUCReturnRoute. As a result, we need to invalidate our route cache.
			this.setCustomSUCReturnRoutesCached(nodeId, undefined);
		}

		return success;
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
	 * Initialize the Firmware Update functionality and determine if the firmware can be updated.
	 */
	private async firmwareUpdateNVMInit(): Promise<boolean> {
		const ret =
			await this.driver.sendMessage<FirmwareUpdateNVM_InitResponse>(
				new FirmwareUpdateNVM_InitRequest(this.driver),
			);
		return ret.supported;
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Set the NEWIMAGE marker in the NVM (to the given value), which is used to signal that a new firmware image is present
	 */
	private async firmwareUpdateNVMSetNewImage(
		value: boolean = true,
	): Promise<void> {
		await this.driver.sendMessage<FirmwareUpdateNVM_SetNewImageResponse>(
			new FirmwareUpdateNVM_SetNewImageRequest(this.driver, {
				newImage: value,
			}),
		);
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Return the value of the NEWIMAGE marker in the NVM, which is used to signal that a new firmware image is present
	 */
	private async firmwareUpdateNVMGetNewImage(): Promise<boolean> {
		const ret =
			await this.driver.sendMessage<FirmwareUpdateNVM_GetNewImageResponse>(
				new FirmwareUpdateNVM_GetNewImageRequest(this.driver),
			);
		return ret.newImage;
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Calculates the CRC-16 for the specified block of data in the NVM
	 */
	private async firmwareUpdateNVMUpdateCRC16(
		offset: number,
		blockLength: number,
		crcSeed: number,
	): Promise<number> {
		const ret =
			await this.driver.sendMessage<FirmwareUpdateNVM_UpdateCRC16Response>(
				new FirmwareUpdateNVM_UpdateCRC16Request(this.driver, {
					offset,
					blockLength,
					crcSeed,
				}),
			);
		return ret.crc16;
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Writes the given data into the firmware update region of the NVM.
	 */
	private async firmwareUpdateNVMWrite(
		offset: number,
		buffer: Buffer,
	): Promise<void> {
		await this.driver.sendMessage<FirmwareUpdateNVM_WriteResponse>(
			new FirmwareUpdateNVM_WriteRequest(this.driver, {
				offset,
				buffer,
			}),
		);
	}

	/**
	 * **Z-Wave 500 series only**
	 *
	 * Checks if the firmware present in the NVM is valid
	 */
	private async firmwareUpdateNVMIsValidCRC16(): Promise<boolean> {
		const ret =
			await this.driver.sendMessage<FirmwareUpdateNVM_IsValidCRC16Response>(
				new FirmwareUpdateNVM_IsValidCRC16Request(this.driver),
			);
		return ret.isValid;
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
				// All 7.xx versions so far seem to have a bug where the NVM is not properly closed after reading
				// resulting in extremely strange controller behavior after a backup. To work around this, restart the stick if possible
				await this.driver.trySoftReset();
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
		const rssi = pick(ret, [
			"rssiChannel0",
			"rssiChannel1",
			"rssiChannel2",
		]);

		this.updateStatistics((current) => {
			const updated = { ...current };
			updated.backgroundRSSI = {} as any;

			// Average all channels, defaulting to the current measurement
			updated.backgroundRSSI!.channel0 = {
				current: rssi.rssiChannel0,
				average: averageRSSI(
					current.backgroundRSSI?.channel0.average,
					rssi.rssiChannel0,
					0.9,
				),
			};
			updated.backgroundRSSI!.channel1 = {
				current: rssi.rssiChannel1,
				average: averageRSSI(
					current.backgroundRSSI?.channel1.average,
					rssi.rssiChannel1,
					0.9,
				),
			};

			if (rssi.rssiChannel2 != undefined) {
				updated.backgroundRSSI!.channel2 = {
					current: rssi.rssiChannel2,
					average: averageRSSI(
						current.backgroundRSSI?.channel2?.average,
						rssi.rssiChannel2,
						0.9,
					),
				};
			}
			updated.backgroundRSSI!.timestamp = Date.now();

			return updated;
		});

		return rssi;
	}

	/**
	 *
	 * Returns whether an OTA firmware update is in progress for any node.
	 */
	public isAnyOTAFirmwareUpdateInProgress(): boolean {
		for (const node of this._nodes.values()) {
			if (!node.isControllerNode && node.isFirmwareUpdateInProgress())
				return true;
		}
		return false;
	}

	/**
	 * Retrieves the available firmware updates for the given node from the Z-Wave JS firmware update service.
	 *
	 * **Note:** Sleeping nodes need to be woken up for this to work. This method will throw when called for a sleeping node
	 * which did not wake up within a minute.
	 *
	 * **Note:** This requires an API key to be set in the driver options, or passed .
	 */
	public async getAvailableFirmwareUpdates(
		nodeId: number,
		options?: GetFirmwareUpdatesOptions,
	): Promise<FirmwareUpdateInfo[]> {
		const node = this.nodes.getOrThrow(nodeId);

		// Ensure the node is awake if it can sleep
		if (node.canSleep) {
			const didNodeWakeup = await Promise.race([
				wait(60000, true).then(() => false),
				node.waitForWakeup().then(() => true),
			]).catch(() => false);

			if (!didNodeWakeup) {
				throw new ZWaveError(
					`Cannot check for firmware updates for node ${nodeId}: The node did not wake up within 1 minute!`,
					ZWaveErrorCodes.FWUpdateService_MissingInformation,
				);
			}
		}

		// Do not rely on stale information, query everything fresh from the node
		const manufacturerResponse = await node.commandClasses[
			"Manufacturer Specific"
		].get();

		if (!manufacturerResponse) {
			throw new ZWaveError(
				`Cannot check for firmware updates for node ${nodeId}: Failed to query fingerprint from the node!`,
				ZWaveErrorCodes.FWUpdateService_MissingInformation,
			);
		}
		const { manufacturerId, productType, productId } = manufacturerResponse;

		const versionResponse = await node.commandClasses.Version.get();
		if (!versionResponse) {
			throw new ZWaveError(
				`Cannot check for firmware updates for node ${nodeId}: Failed to query firmware version from the node!`,
				ZWaveErrorCodes.FWUpdateService_MissingInformation,
			);
		}
		const firmwareVersion = versionResponse.firmwareVersions[0];

		// Now invoke the service
		try {
			return await getAvailableFirmwareUpdates(
				{
					manufacturerId,
					productType,
					productId,
					firmwareVersion,
					rfRegion: this.rfRegion,
				},
				{
					userAgent: this.driver.getUserAgentStringWithComponents(
						options?.additionalUserAgentComponents,
					),
					apiKey:
						options?.apiKey ??
						this.driver.options.apiKeys?.firmwareUpdateService,
					includePrereleases: options?.includePrereleases,
				},
			);
		} catch (e: any) {
			let message = `Cannot check for firmware updates for node ${nodeId}: `;
			if (e.response) {
				if (isObject(e.response.data)) {
					if (typeof e.response.data.error === "string") {
						message += `${e.response.data.error} `;
					} else if (typeof e.response.data.message === "string") {
						message += `${e.response.data.message} `;
					}
				}
				message += `[${e.response.status} ${e.response.statusText}]`;
			} else if (typeof e.message === "string") {
				message += e.message;
			} else {
				message += `Failed to download update information!`;
			}

			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FWUpdateService_RequestError,
			);
		}
	}

	/**
	 * Downloads the desired firmware update(s) from the Z-Wave JS firmware update service and updates the firmware of the given node.
	 *
	 * The return value indicates whether the update was successful.
	 * **WARNING:** This method will throw instead of returning `false` if invalid arguments are passed or downloading files or starting an update fails.
	 */
	public async firmwareUpdateOTA(
		nodeId: number,
		updates: FirmwareUpdateFileInfo[],
	): Promise<FirmwareUpdateResult> {
		if (updates.length === 0) {
			throw new ZWaveError(
				`At least one update must be provided`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Don't let two firmware updates happen in parallel
		if (this.isAnyOTAFirmwareUpdateInProgress()) {
			const message = `Failed to start the update: A firmware update is already in progress on this network!`;
			this.driver.controllerLog.print(message, "error");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy,
			);
		}
		// Don't allow updating firmware when the controller is currently updating its own firmware
		if (this.isFirmwareUpdateInProgress()) {
			const message = `Failed to start the update: The controller is currently being updated!`;
			this.driver.controllerLog.print(message, "error");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy,
			);
		}

		const node = this.nodes.getOrThrow(nodeId);
		this.driver.controllerLog.logNode(
			nodeId,
			`OTA firmware update started, downloading ${updates.length} updates...`,
		);

		const loglevel = this.driver.getLogConfig().level;

		const firmwares: Firmware[] = [];
		for (let i = 0; i < updates.length; i++) {
			const update = updates[i];
			let logMessage = `Downloading firmware update ${i} of ${updates.length}...`;
			if (loglevel === "silly") {
				logMessage += `
  URL:       ${update.url}
  integrity: ${update.integrity}`;
			}
			this.driver.controllerLog.logNode(nodeId, logMessage);

			try {
				const firmware = await downloadFirmwareUpdate(update);
				firmwares.push(firmware);
			} catch (e: any) {
				let message = `Downloading the firmware update for node ${nodeId} failed:\n`;
				if (isZWaveError(e)) {
					// Pass "real" Z-Wave errors through
					throw new ZWaveError(message + e.message, e.code);
				} else if (e.response) {
					// And construct a better error message for HTTP errors
					if (
						isObject(e.response.data) &&
						typeof e.response.data.message === "string"
					) {
						message += `${e.response.data.message} `;
					}
					message += `[${e.response.status} ${e.response.statusText}]`;
				} else if (typeof e.message === "string") {
					message += e.message;
				} else {
					message += `Failed to download firmware update!`;
				}

				throw new ZWaveError(
					message,
					ZWaveErrorCodes.FWUpdateService_RequestError,
				);
			}
		}

		this.driver.controllerLog.logNode(
			nodeId,
			`All updates downloaded, installing...`,
		);
		return node.updateFirmware(firmwares);
	}

	private _firmwareUpdateInProgress: boolean = false;

	/**
	 * Returns whether a firmware update is in progress for the controller.
	 */
	public isFirmwareUpdateInProgress(): boolean {
		return this._firmwareUpdateInProgress;
	}

	/**
	 * Updates the firmware of the controller using the given firmware file.
	 *
	 * The return value indicates whether the update was successful.
	 * **WARNING:** After a successful update, the Z-Wave driver will destroy itself so it can be restarted.
	 *
	 * **WARNING:** A failure during this process may put your controller in recovery mode, rendering it unusable until a correct firmware image is uploaded. Use at your own risk!
	 */
	public async firmwareUpdateOTW(
		data: Buffer,
	): Promise<ControllerFirmwareUpdateResult> {
		// Don't let two firmware updates happen in parallel
		if (this.isAnyOTAFirmwareUpdateInProgress()) {
			const message = `Failed to start the update: A firmware update is already in progress on this network!`;
			this.driver.controllerLog.print(message, "error");
			throw new ZWaveError(message, ZWaveErrorCodes.OTW_Update_Busy);
		}
		// Don't allow updating firmware when the controller is currently updating its own firmware
		if (this.isFirmwareUpdateInProgress()) {
			const message = `Failed to start the update: The controller is currently being updated!`;
			this.driver.controllerLog.print(message, "error");
			throw new ZWaveError(message, ZWaveErrorCodes.OTW_Update_Busy);
		}

		if (this.driver.isInBootloader() || this.sdkVersionGte("7.0")) {
			// If the controller is stuck in bootloader mode, always use the 700 series update method
			return this.firmwareUpdateOTW700(data);
		} else if (
			this.sdkVersionGte("6.50.0") &&
			this.supportedFunctionTypes?.includes(
				FunctionType.FirmwareUpdateNVM,
			)
		) {
			// This is 500 series
			const wasUpdated = await this.firmwareUpdateOTW500(data);
			if (wasUpdated.success) {
				// After updating the firmware on 500 series sticks, we MUST soft-reset them
				await this.driver.softResetAndRestart(
					"Activating new firmware and restarting driver...",
					"Controller firmware updates require a driver restart!",
				);
			}
			return wasUpdated;
		} else {
			throw new ZWaveError(
				`Firmware updates are not supported on this controller`,
				ZWaveErrorCodes.Controller_NotSupported,
			);
		}
	}

	private async firmwareUpdateOTW500(
		data: Buffer,
	): Promise<ControllerFirmwareUpdateResult> {
		this._firmwareUpdateInProgress = true;
		let turnedRadioOff = false;
		try {
			this.driver.controllerLog.print("Beginning firmware update");

			const canUpdate = await this.firmwareUpdateNVMInit();
			if (!canUpdate) {
				this.driver.controllerLog.print(
					"OTW update failed: This controller does not support firmware updates",
					"error",
				);

				const result: ControllerFirmwareUpdateResult = {
					success: false,
					status: ControllerFirmwareUpdateStatus.Error_NotSupported,
				};
				this.emit("firmware update finished", result);
				return result;
			}

			// Avoid interruption by incoming messages
			await this.toggleRF(false);
			turnedRadioOff = true;

			// Upload the firmware data
			const BLOCK_SIZE = 64;
			const numFragments = Math.ceil(data.length / BLOCK_SIZE);
			for (let fragment = 0; fragment < numFragments; fragment++) {
				const fragmentData = data.slice(
					fragment * BLOCK_SIZE,
					(fragment + 1) * BLOCK_SIZE,
				);
				await this.firmwareUpdateNVMWrite(
					fragment * BLOCK_SIZE,
					fragmentData,
				);

				// This progress is technically too low, but we can keep 100% for after CRC checking this way
				const progress: ControllerFirmwareUpdateProgress = {
					sentFragments: fragment,
					totalFragments: numFragments,
					progress: roundTo((fragment / numFragments) * 100, 2),
				};
				this.emit("firmware update progress", progress);
			}

			// Check if a valid image was written
			const isValidCRC = await this.firmwareUpdateNVMIsValidCRC16();
			if (!isValidCRC) {
				this.driver.controllerLog.print(
					"OTW update failed: The firmware image is invalid",
					"error",
				);

				const result: ControllerFirmwareUpdateResult = {
					success: false,
					status: ControllerFirmwareUpdateStatus.Error_Aborted,
				};
				this.emit("firmware update finished", result);
				return result;
			}

			this.emit("firmware update progress", {
				sentFragments: numFragments,
				totalFragments: numFragments,
				progress: 100,
			});

			// Enable the image
			await this.firmwareUpdateNVMSetNewImage();

			this.driver.controllerLog.print("Firmware update succeeded");

			const result: ControllerFirmwareUpdateResult = {
				success: true,
				status: ControllerFirmwareUpdateStatus.OK,
			};
			this.emit("firmware update finished", result);
			return result;
		} finally {
			this._firmwareUpdateInProgress = false;
			if (turnedRadioOff) await this.toggleRF(true);
		}
	}

	private async firmwareUpdateOTW700(
		data: Buffer,
	): Promise<ControllerFirmwareUpdateResult> {
		this._firmwareUpdateInProgress = true;
		let destroy = false;

		try {
			if (!this.driver.isInBootloader()) {
				await this.driver.enterBootloader();
			}

			// Start the update process
			this.driver.controllerLog.print("Beginning firmware upload");
			await this.driver.bootloader.beginUpload();

			// Wait for the bootloader to accept fragments
			try {
				await this.driver.waitForBootloaderChunk(
					(c) =>
						c.type === BootloaderChunkType.Message &&
						c.message === "begin upload",
					5000,
				);
				await this.driver.waitForBootloaderChunk(
					(c) =>
						c.type === BootloaderChunkType.FlowControl &&
						c.command === XModemMessageHeaders.C,
					1000,
				);
			} catch {
				this.driver.controllerLog.print(
					"OTW update failed: Expected response not received from the bootloader",
					"error",
				);
				const result: ControllerFirmwareUpdateResult = {
					success: false,
					status: ControllerFirmwareUpdateStatus.Error_Timeout,
				};
				this.emit("firmware update finished", result);
				return result;
			}

			const BLOCK_SIZE = 128;
			if (data.length % BLOCK_SIZE !== 0) {
				// Pad the data to a multiple of BLOCK_SIZE
				data = Buffer.concat([
					data,
					Buffer.alloc(BLOCK_SIZE - (data.length % BLOCK_SIZE), 0xff),
				]);
			}
			const numFragments = Math.ceil(data.length / BLOCK_SIZE);

			let aborted = false;

			transfer: for (
				let fragment = 1;
				fragment <= numFragments;
				fragment++
			) {
				const fragmentData = data.slice(
					(fragment - 1) * BLOCK_SIZE,
					fragment * BLOCK_SIZE,
				);

				retry: for (let retry = 0; retry < 3; retry++) {
					await this.driver.bootloader.uploadFragment(
						fragment,
						fragmentData,
					);
					let result: BootloaderChunk & {
						type: BootloaderChunkType.FlowControl;
					};
					try {
						result = await this.driver.waitForBootloaderChunk(
							(c) => c.type === BootloaderChunkType.FlowControl,
							1000,
						);
					} catch (e) {
						this.driver.controllerLog.print(
							"OTW update failed: The bootloader did not acknowledge the start of transfer.",
							"error",
						);

						const result: ControllerFirmwareUpdateResult = {
							success: false,
							status: ControllerFirmwareUpdateStatus.Error_Timeout,
						};
						this.emit("firmware update finished", result);
						return result;
					}

					switch (result.command) {
						case XModemMessageHeaders.ACK: {
							// The fragment was accepted
							const progress: ControllerFirmwareUpdateProgress = {
								sentFragments: fragment,
								totalFragments: numFragments,
								progress: roundTo(
									(fragment / numFragments) * 100,
									2,
								),
							};
							this.emit("firmware update progress", progress);

							// we've transmitted at least one fragment, so we need to destroy the driver afterwards
							destroy = true;

							continue transfer;
						}
						case XModemMessageHeaders.NAK:
							// The fragment was rejected, try again
							continue retry;
						case XModemMessageHeaders.CAN:
							// The bootloader aborted the update. We'll receive the reason afterwards as a message
							aborted = true;
							break transfer;
					}
				}

				this.driver.controllerLog.print(
					"OTW update failed: Maximum retry attempts reached",
					"error",
				);
				const result: ControllerFirmwareUpdateResult = {
					success: false,
					status: ControllerFirmwareUpdateStatus.Error_RetryLimitReached,
				};
				this.emit("firmware update finished", result);
				return result;
			}

			if (aborted) {
				// wait for the reason to craft a good error message
				const error = await this.driver
					.waitForBootloaderChunk<
						BootloaderChunk & { type: BootloaderChunkType.Message }
					>(
						(c) =>
							c.type === BootloaderChunkType.Message &&
							c.message.includes("error 0x"),
						1000,
					)
					.catch(() => undefined);

				// wait for the menu screen so it doesn't show up in logs
				await this.driver
					.waitForBootloaderChunk(
						(c) => c.type === BootloaderChunkType.Menu,
						1000,
					)
					.catch(() => undefined);

				let message = `OTW update was aborted by the bootloader.`;
				if (error) {
					message += ` ${error.message}`;
					// TODO: parse error code
				}
				this.driver.controllerLog.print(message, "error");

				const result: ControllerFirmwareUpdateResult = {
					success: false,
					status: ControllerFirmwareUpdateStatus.Error_Aborted,
				};
				this.emit("firmware update finished", result);
				return result;
			} else {
				// We're done, send EOT and wait for the menu screen
				await this.driver.bootloader.finishUpload();
				try {
					await this.driver.waitForBootloaderChunk(
						(c) =>
							c.type === BootloaderChunkType.Message &&
							c.message.includes("upload complete"),
						1000,
					);
					await this.driver.waitForBootloaderChunk(
						(c) => c.type === BootloaderChunkType.Menu,
						1000,
					);
				} catch (e) {
					this.driver.controllerLog.print(
						"OTW update failed: The bootloader did not acknowledge the end of transfer.",
						"error",
					);
					const result: ControllerFirmwareUpdateResult = {
						success: false,
						status: ControllerFirmwareUpdateStatus.Error_Timeout,
					};
					this.emit("firmware update finished", result);
					return result;
				}
			}

			this.driver.controllerLog.print("Firmware update succeeded");

			const result: ControllerFirmwareUpdateResult = {
				success: true,
				status: ControllerFirmwareUpdateStatus.OK,
			};
			this.emit("firmware update finished", result);
			return result;
		} finally {
			await this.driver.leaveBootloader(destroy);
			this._firmwareUpdateInProgress = false;
		}
	}
}
