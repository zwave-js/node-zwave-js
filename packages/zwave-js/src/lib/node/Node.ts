import {
	AssociationGroupInfoProfile,
	CentralSceneKeys,
	ClockCommand,
	CommandClass,
	DeviceResetLocallyCommand,
	DoorLockMode,
	EntryControlDataTypes,
	FirmwareUpdateRequestStatus,
	FirmwareUpdateStatus,
	InclusionControllerCCInitiate,
	InclusionControllerStep,
	IndicatorCCSet,
	IndicatorCCSupportedGet,
	MultiCommandCCCommandEncapsulation,
	MultilevelSwitchCommand,
	Powerlevel,
	PowerlevelTestStatus,
	ScheduleEntryLockCommand,
	Security2Command,
	TimeCCDateGet,
	TimeCCTimeGet,
	TimeCCTimeOffsetGet,
	TimeCommand,
	TimeParametersCommand,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
	defaultCCValueOptions,
	entryControlEventTypeLabels,
	getCCValues,
	isCommandClassContainer,
	type CCAPI,
	type CCValueOptions,
	type FirmwareUpdateCapabilities,
	type FirmwareUpdateMetaData,
	type FirmwareUpdateProgress,
	type FirmwareUpdateResult,
	type PollValueImplementation,
	type SetValueAPIOptions,
	type ValueIDProperties,
} from "@zwave-js/cc";
import {
	AssociationCCGet,
	AssociationCCRemove,
	AssociationCCSet,
	AssociationCCSupportedGroupingsGet,
	AssociationCCValues,
} from "@zwave-js/cc/AssociationCC";
import {
	AssociationGroupInfoCCCommandListGet,
	AssociationGroupInfoCCInfoGet,
	AssociationGroupInfoCCNameGet,
} from "@zwave-js/cc/AssociationGroupInfoCC";
import {
	BasicCC,
	BasicCCReport,
	BasicCCSet,
	BasicCCValues,
} from "@zwave-js/cc/BasicCC";
import {
	CentralSceneCCNotification,
	CentralSceneCCValues,
} from "@zwave-js/cc/CentralSceneCC";
import { ClockCCReport } from "@zwave-js/cc/ClockCC";
import { DoorLockCCValues } from "@zwave-js/cc/DoorLockCC";
import { EntryControlCCNotification } from "@zwave-js/cc/EntryControlCC";
import {
	FirmwareUpdateMetaDataCC,
	FirmwareUpdateMetaDataCCGet,
	FirmwareUpdateMetaDataCCReport,
	FirmwareUpdateMetaDataCCStatusReport,
	FirmwareUpdateMetaDataCCValues,
} from "@zwave-js/cc/FirmwareUpdateMetaDataCC";
import { HailCC } from "@zwave-js/cc/HailCC";
import { LockCCValues } from "@zwave-js/cc/LockCC";
import { ManufacturerSpecificCCValues } from "@zwave-js/cc/ManufacturerSpecificCC";
import { MultiChannelCCValues } from "@zwave-js/cc/MultiChannelCC";
import {
	MultilevelSwitchCC,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
	MultilevelSwitchCCValues,
} from "@zwave-js/cc/MultilevelSwitchCC";
import { NodeNamingAndLocationCCValues } from "@zwave-js/cc/NodeNamingCC";
import {
	NotificationCCReport,
	NotificationCCValues,
	getNotificationStateValueWithEnum,
	getNotificationValueMetadata,
} from "@zwave-js/cc/NotificationCC";
import { PowerlevelCCTestNodeReport } from "@zwave-js/cc/PowerlevelCC";
import { SceneActivationCCSet } from "@zwave-js/cc/SceneActivationCC";
import {
	Security2CCCommandsSupportedGet,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
} from "@zwave-js/cc/Security2CC";
import {
	SecurityCCCommandsSupportedGet,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "@zwave-js/cc/SecurityCC";
import {
	VersionCCCommandClassGet,
	VersionCCGet,
	VersionCCValues,
} from "@zwave-js/cc/VersionCC";
import {
	WakeUpCCValues,
	WakeUpCCWakeUpNotification,
} from "@zwave-js/cc/WakeUpCC";
import { ZWavePlusCCGet, ZWavePlusCCValues } from "@zwave-js/cc/ZWavePlusCC";
import {
	SetValueStatus,
	supervisionResultToSetValueResult,
	type SetValueResult,
} from "@zwave-js/cc/safe";
import type {
	DeviceConfig,
	Notification,
	NotificationValueDefinition,
} from "@zwave-js/config";
import {
	CRC16_CCITT,
	CacheBackedMap,
	CommandClasses,
	EncapsulationFlags,
	MessagePriority,
	NOT_KNOWN,
	NodeType,
	RssiError,
	SecurityClass,
	SupervisionStatus,
	UNKNOWN_STATE,
	ValueDB,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLibraryTypes,
	actuatorCCs,
	applicationCCs,
	getCCName,
	getDSTInfo,
	isRssiError,
	isSupervisionResult,
	isTransmissionError,
	isUnsupervisedOrSucceeded,
	isZWaveError,
	nonApplicationCCs,
	normalizeValueID,
	securityClassIsS2,
	securityClassOrder,
	sensorCCs,
	supervisedCommandFailed,
	supervisedCommandSucceeded,
	timespan,
	topologicalSort,
	valueIdToString,
	type DataRate,
	type FLiRS,
	type Firmware,
	type IZWaveNode,
	type MaybeNotKnown,
	type MetadataUpdatedArgs,
	type NodeUpdatePayload,
	type ProtocolVersion,
	type RSSI,
	type SecurityClassOwner,
	type SendCommandOptions,
	type SetValueOptions,
	type SinglecastCC,
	type TXReport,
	type TranslatedValueID,
	type ValueID,
	type ValueMetadataNumeric,
	type ValueRemovedArgs,
	type ValueUpdatedArgs,
} from "@zwave-js/core";
import type { NodeSchedulePollOptions } from "@zwave-js/host";
import type { Message } from "@zwave-js/serial";
import {
	Mixin,
	ObjectKeyMap,
	discreteLinearSearch,
	formatId,
	getEnumMemberName,
	getErrorMessage,
	num2hex,
	pick,
	stringify,
	type TypedEventEmitter,
} from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import {
	createDeferredPromise,
	type DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { roundTo } from "alcalzone-shared/math";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { randomBytes } from "crypto";
import { EventEmitter } from "events";
import { isDeepStrictEqual } from "util";
import { determineNIF } from "../controller/NodeInformationFrame";
import type { Driver } from "../driver/Driver";
import { cacheKeys } from "../driver/NetworkCache";
import { interpretEx, type Extended } from "../driver/StateMachineShared";
import type { StatisticsEventCallbacksWithSelf } from "../driver/Statistics";
import type { Transaction } from "../driver/Transaction";
import {
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
	type ApplicationUpdateRequest,
} from "../serialapi/application/ApplicationUpdateRequest";
import {
	GetNodeProtocolInfoRequest,
	type GetNodeProtocolInfoResponse,
} from "../serialapi/network-mgmt/GetNodeProtocolInfoMessages";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "../serialapi/network-mgmt/RequestNodeInfoMessages";
import { DeviceClass } from "./DeviceClass";
import { Endpoint } from "./Endpoint";
import {
	formatLifelineHealthCheckSummary,
	formatRouteHealthCheckSummary,
	healthCheckTestFrameCount,
} from "./HealthCheck";
import {
	createNodeReadyMachine,
	type NodeReadyInterpreter,
} from "./NodeReadyMachine";
import {
	NodeStatisticsHost,
	routeStatisticsEquals,
	type NodeStatistics,
	type RouteStatistics,
} from "./NodeStatistics";
import {
	createNodeStatusMachine,
	nodeStatusMachineStateToNodeStatus,
	type NodeStatusInterpreter,
} from "./NodeStatusMachine";
import type {
	LifelineHealthCheckResult,
	LifelineHealthCheckSummary,
	RefreshInfoOptions,
	RouteHealthCheckResult,
	RouteHealthCheckSummary,
	ZWaveNodeEventCallbacks,
	ZWaveNodeValueEventCallbacks,
} from "./_Types";
import { InterviewStage, NodeStatus } from "./_Types";
import * as nodeUtils from "./utils";

interface ScheduledPoll {
	timeout: NodeJS.Timeout;
	expectedValue?: unknown;
}

interface AbortFirmwareUpdateContext {
	abort: boolean;
	tooLateToAbort: boolean;
	abortPromise: DeferredPromise<boolean>;
}

const MAX_ASSOCIATIONS = 1;

export interface ZWaveNode
	extends TypedEventEmitter<
			ZWaveNodeEventCallbacks &
				StatisticsEventCallbacksWithSelf<ZWaveNode, NodeStatistics>
		>,
		NodeStatisticsHost {}

/**
 * A ZWaveNode represents a node in a Z-Wave network. It is also an instance
 * of its root endpoint (index 0)
 */
@Mixin([EventEmitter, NodeStatisticsHost])
export class ZWaveNode
	extends Endpoint
	implements SecurityClassOwner, IZWaveNode
{
	public constructor(
		public readonly id: number,
		driver: Driver,
		deviceClass?: DeviceClass,
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
		valueDB?: ValueDB,
	) {
		// Define this node's intrinsic endpoint as the root device (0)
		super(id, driver, 0, deviceClass, supportedCCs);
		this._valueDB =
			valueDB ?? new ValueDB(id, driver.valueDB!, driver.metadataDB!);
		// Pass value events to our listeners
		for (const event of [
			"value added",
			"value updated",
			"value removed",
			"value notification",
			"metadata updated",
		] as const) {
			this._valueDB.on(event, this.translateValueEvent.bind(this, event));
		}

		// Also avoid verifying a value change for which we recently received an update
		for (const event of ["value updated", "value removed"] as const) {
			this._valueDB.on(
				event,
				(args: ValueUpdatedArgs | ValueRemovedArgs) => {
					// Value updates caused by the driver should never cancel a scheduled poll
					if ("source" in args && args.source === "driver") return;

					if (
						this.cancelScheduledPoll(
							args,
							(args as ValueUpdatedArgs).newValue,
						)
					) {
						this.driver.controllerLog.logNode(
							this.nodeId,
							"Scheduled poll canceled because expected value was received",
							"verbose",
						);
					}
				},
			);
		}

		this.securityClasses = new CacheBackedMap(this.driver.networkCache, {
			prefix: cacheKeys.node(this.id)._securityClassBaseKey + ".",
			suffixSerializer: (value: SecurityClass) =>
				getEnumMemberName(SecurityClass, value),
			suffixDeserializer: (key: string) => {
				if (
					key in SecurityClass &&
					typeof (SecurityClass as any)[key] === "number"
				) {
					return (SecurityClass as any)[key];
				}
			},
		});

		// Add optional controlled CCs - endpoints don't have this
		for (const cc of controlledCCs) this.addCC(cc, { isControlled: true });

		// Create and hook up the status machine
		this.statusMachine = interpretEx(createNodeStatusMachine(this));
		this.statusMachine.onTransition((state) => {
			if (state.changed) {
				this.onStatusChange(
					nodeStatusMachineStateToNodeStatus(state.value as any),
				);
			}
		});
		this.statusMachine.start();

		this.readyMachine = interpretEx(createNodeReadyMachine());
		this.readyMachine.onTransition((state) => {
			if (state.changed) {
				this.onReadyChange(state.value === "ready");
			}
		});
		this.readyMachine.start();
	}

	/**
	 * Cleans up all resources used by this node
	 */
	public destroy(): void {
		// Stop all state machines
		this.statusMachine.stop();
		this.readyMachine.stop();

		// Remove all timeouts
		for (const timeout of [
			this.centralSceneKeyHeldDownContext?.timeout,
			...this.notificationIdleTimeouts.values(),
		]) {
			if (timeout) clearTimeout(timeout);
		}

		// Remove all event handlers
		this.removeAllListeners();

		// Clear all scheduled polls that would interfere with the interview
		for (const valueId of this.scheduledPolls.keys()) {
			this.cancelScheduledPoll(valueId);
		}
	}

	/**
	 * Enhances the raw event args of the ValueDB so it can be consumed better by applications
	 */
	private translateValueEvent<T extends ValueID>(
		eventName: keyof ZWaveNodeValueEventCallbacks,
		arg: T,
	): void {
		// Try to retrieve the speaking CC name
		const outArg = nodeUtils.translateValueID(this.driver, this, arg);
		// This can happen for value updated events
		if ("source" in outArg) delete outArg.source;

		const loglevel = this.driver.getLogConfig().level;

		// If this is a metadata event, make sure we return the merged metadata
		if ("metadata" in outArg) {
			(outArg as unknown as MetadataUpdatedArgs).metadata =
				this.getValueMetadata(arg);
		}

		const ccInstance = CommandClass.createInstanceUnchecked(
			this.driver,
			this,
			arg.commandClass,
		);
		const isInternalValue = !!ccInstance?.isInternalValue(arg);
		// Check whether this value change may be logged
		const isSecretValue = !!ccInstance?.isSecretValue(arg);

		if (loglevel === "silly") {
			this.driver.controllerLog.logNode(this.id, {
				message: `[translateValueEvent: ${eventName}]
  commandClass: ${getCCName(arg.commandClass)}
  endpoint:     ${arg.endpoint}
  property:     ${arg.property}
  propertyKey:  ${arg.propertyKey}
  internal:     ${isInternalValue}
  secret:       ${isSecretValue}
  event source: ${(arg as any as ValueUpdatedArgs).source}`,
				level: "silly",
			});
		}

		if (
			!isSecretValue &&
			(arg as any as ValueUpdatedArgs).source !== "driver"
		) {
			// Log the value change, except for updates caused by the driver itself
			// I don't like the splitting and any but its the easiest solution here
			const [changeTarget, changeType] = eventName.split(" ");
			const logArgument = {
				...outArg,
				nodeId: this.nodeId,
				internal: isInternalValue,
			};
			if (changeTarget === "value") {
				this.driver.controllerLog.value(
					changeType as any,
					logArgument as any,
				);
			} else if (changeTarget === "metadata") {
				this.driver.controllerLog.metadataUpdated(logArgument);
			}
		}

		//Don't expose value events for internal value IDs...
		if (isInternalValue) return;

		if (loglevel === "silly") {
			this.driver.controllerLog.logNode(this.id, {
				message: `[translateValueEvent: ${eventName}]
  is root endpoint:        ${!arg.endpoint}
  is application CC:       ${applicationCCs.includes(arg.commandClass)}
  should hide root values: ${nodeUtils.shouldHideRootApplicationCCValues(
		this.driver,
		this,
  )}`,
				level: "silly",
			});
		}

		// ... and root values ID that mirrors endpoint functionality
		if (
			// Only root endpoint values need to be filtered
			!arg.endpoint &&
			// Only application CCs need to be filtered
			applicationCCs.includes(arg.commandClass) &&
			// and only if the endpoints are not unnecessary and the root values mirror them
			nodeUtils.shouldHideRootApplicationCCValues(this.driver, this)
		) {
			// Iterate through all possible non-root endpoints of this node and
			// check if there is a value ID that mirrors root endpoint functionality
			for (const endpoint of this.getEndpointIndizes()) {
				const possiblyMirroredValueID: ValueID = {
					// same CC, property and key
					...pick(arg, ["commandClass", "property", "propertyKey"]),
					// but different endpoint
					endpoint,
				};
				if (this.valueDB.hasValue(possiblyMirroredValueID)) {
					if (loglevel === "silly") {
						this.driver.controllerLog.logNode(this.id, {
							message: `[translateValueEvent: ${eventName}] found mirrored value ID on different endpoint, ignoring event:
  commandClass: ${getCCName(possiblyMirroredValueID.commandClass)}
  endpoint:     ${possiblyMirroredValueID.endpoint}
  property:     ${possiblyMirroredValueID.property}
  propertyKey:  ${possiblyMirroredValueID.propertyKey}`,
							level: "silly",
						});
					}

					return;
				}
			}
		}
		// And pass the translated event to our listeners
		this.emit(eventName, this, outArg as any);
	}

	private statusMachine: Extended<NodeStatusInterpreter>;
	private _status: NodeStatus = NodeStatus.Unknown;

	private onStatusChange(newStatus: NodeStatus) {
		// Ignore duplicate events
		if (newStatus === this._status) return;

		const oldStatus = this._status;
		this._status = newStatus;
		if (this._status === NodeStatus.Asleep) {
			this.emit("sleep", this, oldStatus);
		} else if (this._status === NodeStatus.Awake) {
			this.emit("wake up", this, oldStatus);
		} else if (this._status === NodeStatus.Dead) {
			this.emit("dead", this, oldStatus);
		} else if (this._status === NodeStatus.Alive) {
			this.emit("alive", this, oldStatus);
		}

		// To be marked ready, a node must be known to be not dead.
		// This means that listening nodes must have communicated with us and
		// sleeping nodes are assumed to be ready
		this.readyMachine.send(
			this._status !== NodeStatus.Unknown &&
				this._status !== NodeStatus.Dead
				? "NOT_DEAD"
				: "MAYBE_DEAD",
		);
	}

	/**
	 * Which status the node is believed to be in
	 */
	public get status(): NodeStatus {
		return this._status;
	}

	/**
	 * @internal
	 * Marks this node as dead (if applicable)
	 */
	public markAsDead(): void {
		this.statusMachine.send("DEAD");
	}

	/**
	 * @internal
	 * Marks this node as alive (if applicable)
	 */
	public markAsAlive(): void {
		this.statusMachine.send("ALIVE");
	}

	/**
	 * @internal
	 * Marks this node as asleep (if applicable)
	 */
	public markAsAsleep(): void {
		this.statusMachine.send("ASLEEP");
	}

	/**
	 * @internal
	 * Marks this node as awake (if applicable)
	 */
	public markAsAwake(): void {
		this.statusMachine.send("AWAKE");
	}

	/** Returns a promise that resolves when the node wakes up the next time or immediately if the node is already awake. */
	public waitForWakeup(): Promise<void> {
		if (!this.canSleep || !this.supportsCC(CommandClasses["Wake Up"])) {
			throw new ZWaveError(
				`Node ${this.id} does not support wakeup!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (this._status === NodeStatus.Awake) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			this.once("wake up", () => resolve());
		});
	}

	// The node is only ready when the interview has been completed
	// to a certain degree

	private readyMachine: Extended<NodeReadyInterpreter>;
	private _ready: boolean = false;

	private onReadyChange(ready: boolean) {
		// Ignore duplicate events
		if (ready === this._ready) return;

		this._ready = ready;
		if (ready) this.emit("ready", this);
	}

	/**
	 * Whether the node is ready to be used
	 */
	public get ready(): boolean {
		return this._ready;
	}

	/** Whether this node is always listening or not */
	public get isListening(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).isListening);
	}
	private set isListening(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).isListening, value);
	}

	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	public get isFrequentListening(): MaybeNotKnown<FLiRS> {
		return this.driver.cacheGet(
			cacheKeys.node(this.id).isFrequentListening,
		);
	}
	private set isFrequentListening(value: MaybeNotKnown<FLiRS>) {
		this.driver.cacheSet(
			cacheKeys.node(this.id).isFrequentListening,
			value,
		);
	}

	public get canSleep(): MaybeNotKnown<boolean> {
		// The controller node can never sleep (apparently it can report otherwise though)
		if (this.isControllerNode) return false;
		if (this.isListening == NOT_KNOWN) return NOT_KNOWN;
		if (this.isFrequentListening == NOT_KNOWN) return NOT_KNOWN;
		return !this.isListening && !this.isFrequentListening;
	}

	/** Whether the node supports routing/forwarding messages. */
	public get isRouting(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).isRouting);
	}
	private set isRouting(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).isRouting, value);
	}

	public get supportedDataRates(): MaybeNotKnown<readonly DataRate[]> {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportedDataRates);
	}
	private set supportedDataRates(value: MaybeNotKnown<readonly DataRate[]>) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportedDataRates, value);
	}

	public get maxDataRate(): MaybeNotKnown<DataRate> {
		if (this.supportedDataRates) {
			return Math.max(...this.supportedDataRates) as DataRate;
		}
	}

	/** @internal */
	// This a CacheBackedMap that's assigned in the constructor
	public readonly securityClasses: Map<SecurityClass, boolean>;

	/**
	 * The device specific key (DSK) of this node in binary format.
	 * This is only set if included with Security S2.
	 */
	public get dsk(): Buffer | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).dsk);
	}
	/** @internal */
	public set dsk(value: Buffer | undefined) {
		const cacheKey = cacheKeys.node(this.id).dsk;
		this.driver.cacheSet(cacheKey, value);
	}

	/** Whether the node was granted at least one security class */
	public get isSecure(): MaybeNotKnown<boolean> {
		const securityClass = this.getHighestSecurityClass();
		if (securityClass == undefined) return NOT_KNOWN;
		if (securityClass === SecurityClass.None) return false;
		return true;
	}

	public hasSecurityClass(
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean> {
		return this.securityClasses.get(securityClass);
	}

	public setSecurityClass(
		securityClass: SecurityClass,
		granted: boolean,
	): void {
		this.securityClasses.set(securityClass, granted);
	}

	/** Returns the highest security class this node was granted or `undefined` if that information isn't known yet */
	public getHighestSecurityClass(): MaybeNotKnown<SecurityClass> {
		if (this.securityClasses.size === 0) return undefined;
		let missingSome = false;
		for (const secClass of securityClassOrder) {
			if (this.securityClasses.get(secClass) === true) return secClass;
			if (!this.securityClasses.has(secClass)) {
				missingSome = true;
			}
		}
		// If we don't have the info for every security class, we don't know the highest one yet
		return missingSome ? NOT_KNOWN : SecurityClass.None;
	}

	/** The Z-Wave protocol version this node implements */
	public get protocolVersion(): MaybeNotKnown<ProtocolVersion> {
		return this.driver.cacheGet(cacheKeys.node(this.id).protocolVersion);
	}
	private set protocolVersion(value: MaybeNotKnown<ProtocolVersion>) {
		this.driver.cacheSet(cacheKeys.node(this.id).protocolVersion, value);
	}

	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	public get nodeType(): MaybeNotKnown<NodeType> {
		return this.driver.cacheGet(cacheKeys.node(this.id).nodeType);
	}
	private set nodeType(value: MaybeNotKnown<NodeType>) {
		this.driver.cacheSet(cacheKeys.node(this.id).nodeType, value);
	}

	/**
	 * Whether this node supports security (S0 or S2).
	 * **WARNING:** Nodes often report this incorrectly - do not blindly trust it.
	 */
	public get supportsSecurity(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportsSecurity);
	}
	private set supportsSecurity(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportsSecurity, value);
	}

	/** Whether this node can issue wakeup beams to FLiRS nodes */
	public get supportsBeaming(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportsBeaming);
	}
	private set supportsBeaming(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportsBeaming, value);
	}

	public get manufacturerId(): MaybeNotKnown<number> {
		return this.getValue(ManufacturerSpecificCCValues.manufacturerId.id);
	}

	public get productId(): MaybeNotKnown<number> {
		return this.getValue(ManufacturerSpecificCCValues.productId.id);
	}

	public get productType(): MaybeNotKnown<number> {
		return this.getValue(ManufacturerSpecificCCValues.productType.id);
	}

	public get firmwareVersion(): MaybeNotKnown<string> {
		// On supporting nodes, use the applicationVersion, which MUST be
		// same as the first (main) firmware, plus the patch version.
		const firmware0Version = this.getValue<string[]>(
			VersionCCValues.firmwareVersions.id,
		)?.[0];
		const applicationVersion = this.getValue<string>(
			VersionCCValues.applicationVersion.id,
		);

		let ret = firmware0Version;
		if (applicationVersion) {
			// If the application version is set, we cannot blindly trust that it is the firmware version.
			// Some nodes incorrectly set this field to the Z-Wave Application Framework API Version
			if (!ret || applicationVersion.startsWith(`${ret}.`)) {
				ret = applicationVersion;
			}
		}

		// Special case for the official 700 series firmwares which are aligned with the SDK version
		// We want to work with the full x.y.z firmware version here.
		if (ret && this.isControllerNode) {
			const sdkVersion = this.sdkVersion;
			if (sdkVersion && sdkVersion.startsWith(`${ret}.`)) {
				return sdkVersion;
			}
		}
		// For all others, just return the simple x.y firmware version
		return ret;
	}

	public get sdkVersion(): MaybeNotKnown<string> {
		return this.getValue(VersionCCValues.sdkVersion.id);
	}

	public get zwavePlusVersion(): MaybeNotKnown<number> {
		return this.getValue(ZWavePlusCCValues.zwavePlusVersion.id);
	}

	public get zwavePlusNodeType(): MaybeNotKnown<ZWavePlusNodeType> {
		return this.getValue(ZWavePlusCCValues.nodeType.id);
	}

	public get zwavePlusRoleType(): MaybeNotKnown<ZWavePlusRoleType> {
		return this.getValue(ZWavePlusCCValues.roleType.id);
	}

	public get supportsWakeUpOnDemand(): MaybeNotKnown<boolean> {
		return this.getValue(WakeUpCCValues.wakeUpOnDemandSupported.id);
	}

	/**
	 * The user-defined name of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
	 *
	 * **Note:** Setting this value only updates the name locally. To permanently change the name of the node, use
	 * the `commandClasses` API.
	 */
	public get name(): MaybeNotKnown<string> {
		return this.getValue(NodeNamingAndLocationCCValues.name.id);
	}
	public set name(value: string | undefined) {
		if (value != undefined) {
			this._valueDB.setValue(
				NodeNamingAndLocationCCValues.name.id,
				value,
			);
		} else {
			this._valueDB.removeValue(NodeNamingAndLocationCCValues.name.id);
		}
	}

	/**
	 * The user-defined location of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
	 *
	 * **Note:** Setting this value only updates the location locally. To permanently change the location of the node, use
	 * the `commandClasses` API.
	 */
	public get location(): MaybeNotKnown<string> {
		return this.getValue(NodeNamingAndLocationCCValues.location.id);
	}
	public set location(value: string | undefined) {
		if (value != undefined) {
			this._valueDB.setValue(
				NodeNamingAndLocationCCValues.location.id,
				value,
			);
		} else {
			this._valueDB.removeValue(
				NodeNamingAndLocationCCValues.location.id,
			);
		}
	}

	/** Whether a SUC return route was configured for this node */
	public get hasSUCReturnRoute(): boolean {
		return !!this.driver.cacheGet(
			cacheKeys.node(this.id).hasSUCReturnRoute,
		);
	}
	public set hasSUCReturnRoute(value: boolean) {
		this.driver.cacheSet(cacheKeys.node(this.id).hasSUCReturnRoute, value);
	}

	/** @internal Which associations are currently configured */
	public get associations(): readonly number[] {
		return (
			this.driver.cacheGet(cacheKeys.node(this.id).associations(1)) ?? []
		);
	}

	private set associations(value: readonly number[]) {
		this.driver.cacheSet(cacheKeys.node(this.id).associations(1), value);
	}

	private _deviceConfig: DeviceConfig | undefined;
	/**
	 * Contains additional information about this node, loaded from a config file
	 */
	public get deviceConfig(): DeviceConfig | undefined {
		return this._deviceConfig;
	}

	public get label(): string | undefined {
		return this._deviceConfig?.label;
	}

	public get deviceDatabaseUrl(): MaybeNotKnown<string> {
		if (
			this.manufacturerId != undefined &&
			this.productType != undefined &&
			this.productId != undefined
		) {
			const manufacturerId = formatId(this.manufacturerId);
			const productType = formatId(this.productType);
			const productId = formatId(this.productId);
			const firmwareVersion = this.firmwareVersion || "0.0";
			return `https://devices.zwave-js.io/?jumpTo=${manufacturerId}:${productType}:${productId}:${firmwareVersion}`;
		}
	}

	/** The last time a message was received from this node */
	public get lastSeen(): MaybeNotKnown<Date> {
		return this.driver.cacheGet(cacheKeys.node(this.id).lastSeen);
	}
	/** @internal */
	public set lastSeen(value: MaybeNotKnown<Date>) {
		this.driver.cacheSet(cacheKeys.node(this.id).lastSeen, value);
		// Also update statistics
		this.updateStatistics((cur) => ({
			...cur,
			lastSeen: value,
		}));
	}

	private _valueDB: ValueDB;
	/**
	 * Provides access to this node's values
	 * @internal
	 */
	public get valueDB(): ValueDB {
		return this._valueDB;
	}

	/**
	 * Retrieves a stored value for a given value id.
	 * This does not request an updated value from the node!
	 */
	public getValue<T = unknown>(valueId: ValueID): MaybeNotKnown<T> {
		return this._valueDB.getValue(valueId);
	}

	/**
	 * Returns when the given value id was last updated by an update from the node.
	 */
	public getValueTimestamp(valueId: ValueID): MaybeNotKnown<number> {
		return this._valueDB.getTimestamp(valueId);
	}

	/**
	 * Retrieves metadata for a given value id.
	 * This can be used to enhance the user interface of an application
	 */
	public getValueMetadata(valueId: ValueID): ValueMetadata {
		// Check if a corresponding CC value is defined for this value ID
		// so we can extend the returned metadata
		const definedCCValues = getCCValues(valueId.commandClass);
		let valueOptions: Required<CCValueOptions> | undefined;
		let meta: ValueMetadata | undefined;
		if (definedCCValues) {
			const value = Object.values(definedCCValues).find((v) =>
				v?.is(valueId),
			);
			if (value && typeof value !== "function") {
				meta = value.meta;
				valueOptions = value.options;
			}
		}

		// The priority for returned metadata is valueDB > defined value > Any (default)
		return {
			...(this._valueDB.getMetadata(valueId) ??
				meta ??
				ValueMetadata.Any),
			// Don't allow overriding these flags:
			stateful: valueOptions?.stateful ?? defaultCCValueOptions.stateful,
			secret: valueOptions?.secret ?? defaultCCValueOptions.secret,
		};
	}

	/** Returns a list of all value names that are defined on all endpoints of this node */
	public getDefinedValueIDs(): TranslatedValueID[] {
		return nodeUtils.getDefinedValueIDs(this.driver, this);
	}

	/**
	 * Updates a value for a given property of a given CommandClass on the node.
	 * This will communicate with the node!
	 */
	public async setValue(
		valueId: ValueID,
		value: unknown,
		options?: SetValueAPIOptions,
	): Promise<SetValueResult> {
		// Ensure we're dealing with a valid value ID, with no extra properties
		valueId = normalizeValueID(valueId);

		const loglevel = this.driver.getLogConfig().level;

		// Try to retrieve the corresponding CC API
		try {
			// Access the CC API by name
			const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
			if (!endpointInstance) {
				return {
					status: SetValueStatus.EndpointNotFound,
					message: `Endpoint ${valueId.endpoint} does not exist on Node ${this.id}`,
				};
			}
			let api = (endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI;
			// Check if the setValue method is implemented
			if (!api.setValue) {
				return {
					status: SetValueStatus.NotImplemented,
					message: `The ${getCCName(
						valueId.commandClass,
					)} CC does not support setting values`,
				};
			}

			if (loglevel === "silly") {
				this.driver.controllerLog.logNode(this.id, {
					message: `[setValue] calling SET_VALUE API ${
						api.constructor.name
					}:
  property:     ${valueId.property}
  property key: ${valueId.propertyKey}
  optimistic:   ${api.isSetValueOptimistic(valueId)}`,
					level: "silly",
				});
			}

			const valueIdProps: ValueIDProperties = {
				property: valueId.property,
				propertyKey: valueId.propertyKey,
			};

			const hooks = api.setValueHooks?.(valueIdProps, value, options);

			if (hooks?.supervisionDelayedUpdates) {
				api = api.withOptions({
					requestStatusUpdates: true,
					onUpdate: async (update) => {
						try {
							if (update.status === SupervisionStatus.Success) {
								await hooks.supervisionOnSuccess();
							} else if (
								update.status === SupervisionStatus.Fail
							) {
								await hooks.supervisionOnFailure();
							}
						} catch {
							// TODO: Log error?
						}
					},
				});
			}

			// And call it
			const result = await api.setValue!.call(
				api,
				valueIdProps,
				value,
				options,
			);

			if (loglevel === "silly") {
				let message = `[setValue] result of SET_VALUE API call for ${api.constructor.name}:`;
				if (result) {
					if (isSupervisionResult(result)) {
						message += ` (SupervisionResult)
  status:   ${getEnumMemberName(SupervisionStatus, result.status)}`;
						if (result.remainingDuration) {
							message += `
  duration: ${result.remainingDuration.toString()}`;
						}
					} else {
						message +=
							" (other) " + JSON.stringify(result, null, 2);
					}
				} else {
					message += " undefined";
				}
				this.driver.controllerLog.logNode(this.id, {
					message,
					level: "silly",
				});
			}

			// Remember the new value for the value we just set, if...
			// ... the call did not throw (assume that the call was successful)
			// ... the call was supervised and successful
			if (
				api.isSetValueOptimistic(valueId) &&
				isUnsupervisedOrSucceeded(result)
			) {
				const emitEvent =
					!!result ||
					!!this.driver.options.emitValueUpdateAfterSetValue;

				if (loglevel === "silly") {
					const message = emitEvent
						? "updating value with event"
						: "updating value without event";
					this.driver.controllerLog.logNode(this.id, {
						message: `[setValue] ${message}`,
						level: "silly",
					});
				}

				const options: SetValueOptions = {};
				// We need to emit an event if applications opted in, or if this was a supervised call
				// because in this case there won't be a verification query which would result in an update
				if (emitEvent) {
					options.source = "driver";
				} else {
					options.noEvent = true;
				}
				// Only update the timestamp of the value for successful supervised commands. Otherwise we don't know
				// if the command was actually executed. If it wasn't, we'd have a wrong timestamp.
				options.updateTimestamp = supervisedCommandSucceeded(result);

				this._valueDB.setValue(valueId, value, options);
			} else if (loglevel === "silly") {
				this.driver.controllerLog.logNode(this.id, {
					message: `[setValue] not updating value`,
					level: "silly",
				});
			}

			// Depending on the settings of the SET_VALUE implementation, we may have to
			// optimistically update a different value and/or verify the changes
			if (hooks) {
				const supervisedAndSuccessful =
					isSupervisionResult(result) &&
					result.status === SupervisionStatus.Success;

				const shouldUpdateOptimistically =
					api.isSetValueOptimistic(valueId) &&
					// For successful supervised commands, we know that an optimistic update is ok
					(supervisedAndSuccessful ||
						// For unsupervised commands that did not fail, we let the applciation decide whether
						// to update related value optimistically
						(!this.driver.options.disableOptimisticValueUpdate &&
							result == undefined));

				// The actual API implementation handles additional optimistic updates
				if (shouldUpdateOptimistically) {
					hooks.optimisticallyUpdateRelatedValues?.(
						supervisedAndSuccessful,
					);
				}

				// Verify the current value after a delay, unless...
				// ...the command was supervised and successful
				// ...and the CC API decides not to verify anyways
				if (
					!supervisedCommandSucceeded(result) ||
					hooks.forceVerifyChanges?.()
				) {
					// Let the CC API implementation handle the verification.
					// It may still decide not to do it.
					await hooks.verifyChanges?.();
				}
			}

			return supervisionResultToSetValueResult(result);
		} catch (e) {
			// Define which errors during setValue are expected and won't throw an error
			if (isZWaveError(e)) {
				let result: SetValueResult | undefined;
				switch (e.code) {
					// This CC or API is not implemented
					case ZWaveErrorCodes.CC_NotImplemented:
					case ZWaveErrorCodes.CC_NoAPI:
						result = {
							status: SetValueStatus.NotImplemented,
							message: e.message,
						};
						break;
					// A user tried to set an invalid value
					case ZWaveErrorCodes.Argument_Invalid:
						result = {
							status: SetValueStatus.InvalidValue,
							message: e.message,
						};
						break;
				}

				if (loglevel === "silly") {
					this.driver.controllerLog.logNode(this.id, {
						message: `[setValue] raised ZWaveError (${
							!!result ? "handled" : "not handled"
						}, code ${getEnumMemberName(
							ZWaveErrorCodes,
							e.code,
						)}): ${e.message}`,
						level: "silly",
					});
				}

				if (result) return result;
			}
			throw e;
		}
	}

	/**
	 * Requests a value for a given property of a given CommandClass by polling the node.
	 * **Warning:** Some value IDs share a command, so make sure not to blindly call this for every property
	 */
	public pollValue<T = unknown>(
		valueId: ValueID,
		sendCommandOptions: SendCommandOptions = {},
	): Promise<MaybeNotKnown<T>> {
		// Ensure we're dealing with a valid value ID, with no extra properties
		valueId = normalizeValueID(valueId);

		// Try to retrieve the corresponding CC API
		const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
		if (!endpointInstance) {
			throw new ZWaveError(
				`Endpoint ${valueId.endpoint} does not exist on Node ${this.id}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const api = (
			(endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI
		).withOptions({
			// We do not want to delay more important communication by polling, so give it
			// the lowest priority and don't retry unless overwritten by the options
			maxSendAttempts: 1,
			priority: MessagePriority.Poll,
			...sendCommandOptions,
		});

		// Check if the pollValue method is implemented
		if (!api.pollValue) {
			throw new ZWaveError(
				`The pollValue API is not implemented for CC ${getCCName(
					valueId.commandClass,
				)}!`,
				ZWaveErrorCodes.CC_NoAPI,
			);
		}

		// And call it
		return (api.pollValue as PollValueImplementation<T>).call(api, {
			property: valueId.property,
			propertyKey: valueId.propertyKey,
		});
	}

	/**
	 * @internal
	 * All polls that are currently scheduled for this node
	 */
	public scheduledPolls = new ObjectKeyMap<ValueID, ScheduledPoll>();

	/**
	 * @internal
	 * Schedules a value to be polled after a given time. Only one schedule can be active for a given value ID.
	 * @returns `true` if the poll was scheduled, `false` otherwise
	 */
	public schedulePoll(
		valueId: ValueID,
		options: NodeSchedulePollOptions = {},
	): boolean {
		const {
			timeoutMs = this.driver.options.timeouts.refreshValue,
			expectedValue,
		} = options;

		// Avoid false positives or false negatives due to a mis-formatted value ID
		valueId = normalizeValueID(valueId);

		// Try to retrieve the corresponding CC API
		const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
		if (!endpointInstance) return false;

		const api = (
			(endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI
		).withOptions({
			// We do not want to delay more important communication by polling, so give it
			// the lowest priority and don't retry unless overwritten by the options
			maxSendAttempts: 1,
			priority: MessagePriority.Poll,
		});

		// Check if the pollValue method is implemented
		if (!api.pollValue) return false;

		// make sure there is only one timeout instance per poll
		this.cancelScheduledPoll(valueId);
		const timeout = setTimeout(async () => {
			// clean up after the timeout
			this.cancelScheduledPoll(valueId);
			try {
				await api.pollValue!.call(api, valueId);
			} catch {
				/* ignore */
			}
		}, timeoutMs).unref();
		this.scheduledPolls.set(valueId, { timeout, expectedValue });

		return true;
	}

	/**
	 * @internal
	 * Cancels a poll that has been scheduled with schedulePoll.
	 *
	 * @param actualValue If given, this indicates the value that was received by a node, which triggered the poll to be canceled.
	 * If the scheduled poll expects a certain value and this matches the expected value for the scheduled poll, the poll will be canceled.
	 */
	public cancelScheduledPoll(
		valueId: ValueID,
		actualValue?: unknown,
	): boolean {
		// Avoid false positives or false negatives due to a mis-formatted value ID
		valueId = normalizeValueID(valueId);

		const poll = this.scheduledPolls.get(valueId);
		if (!poll) return false;

		if (
			actualValue !== undefined &&
			poll.expectedValue !== undefined &&
			!isDeepStrictEqual(poll.expectedValue, actualValue)
		) {
			return false;
		}

		clearTimeout(poll.timeout);
		this.scheduledPolls.delete(valueId);

		return true;
	}

	public get endpointCountIsDynamic(): MaybeNotKnown<boolean> {
		return nodeUtils.endpointCountIsDynamic(this.driver, this);
	}

	public get endpointsHaveIdenticalCapabilities(): MaybeNotKnown<boolean> {
		return nodeUtils.endpointsHaveIdenticalCapabilities(this.driver, this);
	}

	public get individualEndpointCount(): MaybeNotKnown<number> {
		return nodeUtils.getIndividualEndpointCount(this.driver, this);
	}

	public get aggregatedEndpointCount(): MaybeNotKnown<number> {
		return nodeUtils.getAggregatedEndpointCount(this.driver, this);
	}

	/** Returns the device class of an endpoint. Falls back to the node's device class if the information is not known. */
	private getEndpointDeviceClass(index: number): MaybeNotKnown<DeviceClass> {
		const deviceClass = this.getValue<{
			generic: number;
			specific: number;
		}>(
			MultiChannelCCValues.endpointDeviceClass.endpoint(
				this.endpointsHaveIdenticalCapabilities ? 1 : index,
			),
		);
		if (deviceClass && this.deviceClass) {
			return new DeviceClass(
				this.driver.configManager,
				this.deviceClass.basic.key,
				deviceClass.generic,
				deviceClass.specific,
			);
		}
		// fall back to the node's device class if it is known
		return this.deviceClass;
	}

	private getEndpointCCs(index: number): MaybeNotKnown<CommandClasses[]> {
		const ret = this.getValue(
			MultiChannelCCValues.endpointCCs.endpoint(
				this.endpointsHaveIdenticalCapabilities ? 1 : index,
			),
		);
		// Workaround for the change in #1977
		if (isArray(ret)) {
			// The value is set up correctly, return it
			return ret as CommandClasses[];
		} else if (isObject(ret) && "supportedCCs" in ret) {
			return ret.supportedCCs as CommandClasses[];
		}
	}

	/**
	 * Returns the current endpoint count of this node.
	 *
	 * If you want to enumerate the existing endpoints, use `getEndpointIndizes` instead.
	 * Some devices are known to contradict themselves.
	 */
	public getEndpointCount(): number {
		return nodeUtils.getEndpointCount(this.driver, this);
	}

	/**
	 * Returns indizes of all endpoints on the node.
	 */
	public getEndpointIndizes(): number[] {
		return nodeUtils.getEndpointIndizes(this.driver, this);
	}

	/** Whether the Multi Channel CC has been interviewed and all endpoint information is known */
	private get isMultiChannelInterviewComplete(): boolean {
		return nodeUtils.isMultiChannelInterviewComplete(this.driver, this);
	}

	/** Cache for this node's endpoint instances */
	private _endpointInstances = new Map<number, Endpoint>();
	/**
	 * Returns an endpoint of this node with the given index. 0 returns the node itself.
	 */
	public getEndpoint(index: 0): Endpoint;
	public getEndpoint(index: number): Endpoint | undefined;
	public getEndpoint(index: number): Endpoint | undefined {
		if (index < 0)
			throw new ZWaveError(
				"The endpoint index must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		// Zero is the root endpoint - i.e. this node
		if (index === 0) return this;
		// Check if the Multi Channel CC interview for this node is completed,
		// because we don't have all the information before that
		if (!this.isMultiChannelInterviewComplete) {
			this.driver.driverLog.print(
				`Node ${this.nodeId}, Endpoint ${index}: Trying to access endpoint instance before Multi Channel interview`,
				"error",
			);
			return undefined;
		}
		// Check if the endpoint index is in the list of known endpoint indizes
		if (!this.getEndpointIndizes().includes(index)) return undefined;

		// Create an endpoint instance if it does not exist
		if (!this._endpointInstances.has(index)) {
			this._endpointInstances.set(
				index,
				new Endpoint(
					this.id,
					this.driver,
					index,
					this.getEndpointDeviceClass(index),
					this.getEndpointCCs(index),
				),
			);
		}
		return this._endpointInstances.get(index)!;
	}

	public getEndpointOrThrow(index: number): Endpoint {
		const ret = this.getEndpoint(index);
		if (!ret) {
			throw new ZWaveError(
				`Endpoint ${index} does not exist on Node ${this.id}`,
				ZWaveErrorCodes.Controller_EndpointNotFound,
			);
		}
		return ret;
	}

	/** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
	public getAllEndpoints(): Endpoint[] {
		return nodeUtils.getAllEndpoints(this.driver, this) as Endpoint[];
	}

	/**
	 * This tells us which interview stage was last completed
	 */

	public get interviewStage(): InterviewStage {
		return (
			this.driver.cacheGet(cacheKeys.node(this.id).interviewStage) ??
			InterviewStage.None
		);
	}
	public set interviewStage(value: InterviewStage) {
		this.driver.cacheSet(cacheKeys.node(this.id).interviewStage, value);
	}

	private _interviewAttempts: number = 0;
	/** How many attempts to interview this node have already been made */
	public get interviewAttempts(): number {
		return this._interviewAttempts;
	}

	private _hasEmittedNoS2NetworkKeyError: boolean = false;
	private _hasEmittedNoS0NetworkKeyError: boolean = false;

	/** Returns whether this node is the controller */
	public get isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}

	/**
	 * Starts or resumes a deferred initial interview of this node.
	 *
	 * **WARNING:** This is only allowed when the initial interview was deferred using the
	 * `interview.disableOnNodeAdded` option. Otherwise, this method will throw an error.
	 *
	 * **NOTE:** It is advised to NOT await this method as it can take a very long time (minutes to hours)!
	 */
	public async interview(): Promise<void> {
		// The initial interview of the controller node is always done
		// and cannot be deferred.
		if (this.isControllerNode) return;

		if (!this.driver.options.interview?.disableOnNodeAdded) {
			throw new ZWaveError(
				`Calling ZWaveNode.interview() is not allowed because automatic node interviews are enabled. Wait for the driver to interview the node or use ZWaveNode.refreshInfo() to re-interview a node.`,
				ZWaveErrorCodes.Driver_FeatureDisabled,
			);
		}

		return this.driver.interviewNodeInternal(this);
	}

	private _refreshInfoPending: boolean = false;

	/**
	 * Resets all information about this node and forces a fresh interview.
	 * **Note:** This does nothing for the controller node.
	 *
	 * **WARNING:** Take care NOT to call this method when the node is already being interviewed.
	 * Otherwise the node information may become inconsistent.
	 */
	public async refreshInfo(options: RefreshInfoOptions = {}): Promise<void> {
		// It does not make sense to re-interview the controller. All important information is queried
		// directly via the serial API
		if (this.isControllerNode) return;

		// The driver does deduplicate re-interview requests, but only at the end of this method.
		// Without blocking here, many re-interview tasks for sleeping nodes may be queued, leading to parallel interviews
		if (this._refreshInfoPending) return;
		this._refreshInfoPending = true;

		const { resetSecurityClasses = false, waitForWakeup = true } = options;
		// Unless desired, don't forget the information about sleeping nodes immediately, so they continue to function
		let didWakeUp = false;
		if (
			waitForWakeup &&
			this.canSleep &&
			this.supportsCC(CommandClasses["Wake Up"])
		) {
			didWakeUp = await this.waitForWakeup()
				.then(() => true)
				.catch(() => false);
		}

		// preserve the node name and location, since they might not be stored on the node
		const name = this.name;
		const location = this.location;

		// Force a new detection of security classes if desired
		if (resetSecurityClasses) this.securityClasses.clear();

		this._interviewAttempts = 0;
		this.interviewStage = InterviewStage.None;
		this._ready = false;
		this.deviceClass = undefined;
		this.isListening = undefined;
		this.isFrequentListening = undefined;
		this.isRouting = undefined;
		this.supportedDataRates = undefined;
		this.protocolVersion = undefined;
		this.nodeType = undefined;
		this.supportsSecurity = undefined;
		this.supportsBeaming = undefined;
		this._deviceConfig = undefined;
		this._hasEmittedNoS0NetworkKeyError = false;
		this._hasEmittedNoS2NetworkKeyError = false;
		this._valueDB.clear({ noEvent: true });
		this._endpointInstances.clear();
		super.reset();

		// Restart all state machines
		this.readyMachine.restart();
		this.statusMachine.restart();

		// Remove queued polls that would interfere with the interview
		for (const valueId of this.scheduledPolls.keys()) {
			this.cancelScheduledPoll(valueId);
		}

		// Restore the previously saved name/location
		if (name != undefined) this.name = name;
		if (location != undefined) this.location = location;

		// Don't keep the node awake after the interview
		this.keepAwake = false;

		// If we did wait for the wakeup, mark the node as awake again so it does not
		// get considered asleep after querying protocol info.
		if (didWakeUp) this.markAsAwake();

		void this.driver.interviewNodeInternal(this);
		this._refreshInfoPending = false;
	}

	/**
	 * @internal
	 * Interviews this node. Returns true when it succeeded, false otherwise
	 *
	 * WARNING: Do not call this method from application code. To refresh the information
	 * for a specific node, use `node.refreshInfo()` instead
	 */
	public async interviewInternal(): Promise<boolean> {
		if (this.interviewStage === InterviewStage.Complete) {
			this.driver.controllerLog.logNode(
				this.id,
				`skipping interview because it is already completed`,
			);
			return true;
		} else {
			this.driver.controllerLog.interviewStart(this);
		}

		// Remember that we tried to interview this node
		this._interviewAttempts++;

		// Wrapper around interview methods to return false in case of a communication error
		// This way the single methods don't all need to have the same error handler
		const tryInterviewStage = async (
			method: () => Promise<void>,
		): Promise<boolean> => {
			try {
				await method();
				return true;
			} catch (e) {
				if (isTransmissionError(e)) {
					return false;
				}
				throw e;
			}
		};

		// The interview is done in several stages. At each point, the interview process might be aborted
		// due to a stage failing. The reached stage is saved, so we can continue it later without
		// repeating stages unnecessarily

		if (this.interviewStage === InterviewStage.None) {
			// do a full interview starting with the protocol info
			this.driver.controllerLog.logNode(
				this.id,
				`new node, doing a full interview...`,
			);
			this.emit("interview started", this);
			await this.queryProtocolInfo();
		}

		if (!this.isControllerNode) {
			if (
				(this.isListening || this.isFrequentListening) &&
				this.status !== NodeStatus.Alive
			) {
				// Ping non-sleeping nodes to determine their status
				await this.ping();
			}

			if (this.interviewStage === InterviewStage.ProtocolInfo) {
				if (
					!(await tryInterviewStage(() => this.interviewNodeInfo()))
				) {
					return false;
				}
			}

			// At this point the basic interview of new nodes is done. Start here when re-interviewing known nodes
			// to get updated information about command classes
			if (this.interviewStage === InterviewStage.NodeInfo) {
				// Only advance the interview if it was completed, otherwise abort
				if (await this.interviewCCs()) {
					this.setInterviewStage(InterviewStage.CommandClasses);
				} else {
					return false;
				}
			}
		}

		if (
			(this.isControllerNode &&
				this.interviewStage === InterviewStage.ProtocolInfo) ||
			(!this.isControllerNode &&
				this.interviewStage === InterviewStage.CommandClasses)
		) {
			// Load a config file for this node if it exists and overwrite the previously reported information
			await this.overwriteConfig();
		}

		this.setInterviewStage(InterviewStage.Complete);
		this.readyMachine.send("INTERVIEW_DONE");

		// Tell listeners that the interview is completed
		// The driver will then send this node to sleep
		this.emit("interview completed", this);
		return true;
	}

	/** Updates this node's interview stage and saves to cache when appropriate */
	private setInterviewStage(completedStage: InterviewStage): void {
		this.interviewStage = completedStage;
		this.emit(
			"interview stage completed",
			this,
			getEnumMemberName(InterviewStage, completedStage),
		);
		this.driver.controllerLog.interviewStage(this);
	}

	/** Step #1 of the node interview */
	protected async queryProtocolInfo(): Promise<void> {
		this.driver.controllerLog.logNode(this.id, {
			message: "querying protocol info...",
			direction: "outbound",
		});
		const resp = await this.driver.sendMessage<GetNodeProtocolInfoResponse>(
			new GetNodeProtocolInfoRequest(this.driver, {
				requestedNodeId: this.id,
			}),
		);
		this.isListening = resp.isListening;
		this.isFrequentListening = resp.isFrequentListening;
		this.isRouting = resp.isRouting;
		this.supportedDataRates = resp.supportedDataRates;
		this.protocolVersion = resp.protocolVersion;
		this.nodeType = resp.nodeType;
		this.supportsSecurity = resp.supportsSecurity;
		this.supportsBeaming = resp.supportsBeaming;

		const deviceClass = new DeviceClass(
			this.driver.configManager,
			resp.basicDeviceClass,
			resp.genericDeviceClass,
			resp.specificDeviceClass,
		);
		this.applyDeviceClass(deviceClass);

		const logMessage = `received response for protocol info:
basic device class:    ${this.deviceClass!.basic.label}
generic device class:  ${this.deviceClass!.generic.label}
specific device class: ${this.deviceClass!.specific.label}
node type:             ${getEnumMemberName(NodeType, this.nodeType)}
is always listening:   ${this.isListening}
is frequent listening: ${this.isFrequentListening}
can route messages:    ${this.isRouting}
supports security:     ${this.supportsSecurity}
supports beaming:      ${this.supportsBeaming}
maximum data rate:     ${this.maxDataRate} kbps
protocol version:      ${this.protocolVersion}`;
		this.driver.controllerLog.logNode(this.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Assume that sleeping nodes start asleep (unless we know it is awake)
		if (this.canSleep) {
			if (this.status === NodeStatus.Alive) {
				// If it was just included and is currently communicating with us,
				// then we didn't know yet that it can sleep. So we need to switch from alive/dead to awake/asleep
				this.markAsAwake();
			} else if (this.status !== NodeStatus.Awake) {
				this.markAsAsleep();
			}
		}

		this.setInterviewStage(InterviewStage.ProtocolInfo);
	}

	/** Node interview: pings the node to see if it responds */
	public async ping(): Promise<boolean> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot ping",
				"warn",
			);
			return true;
		}

		this.driver.controllerLog.logNode(this.id, {
			message: "pinging the node...",
			direction: "outbound",
		});

		try {
			await this.commandClasses["No Operation"].send();
			this.driver.controllerLog.logNode(this.id, {
				message: "ping successful",
				direction: "inbound",
			});
			return true;
		} catch (e) {
			this.driver.controllerLog.logNode(
				this.id,
				`ping failed: ${getErrorMessage(e)}`,
			);
			return false;
		}
	}

	/**
	 * Step #5 of the node interview
	 * Request node info
	 */
	protected async interviewNodeInfo(): Promise<void> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot query node info",
				"warn",
			);
			return;
		}

		// If we incorrectly assumed a sleeping node to be awake, this step will fail.
		// In order to fail the interview, we retry here
		for (let attempts = 1; attempts <= 2; attempts++) {
			this.driver.controllerLog.logNode(this.id, {
				message: "querying node info...",
				direction: "outbound",
			});
			try {
				const nodeInfo = await this.requestNodeInfo();
				const logLines: string[] = [
					"node info received",
					"supported CCs:",
				];
				for (const cc of nodeInfo.supportedCCs) {
					const ccName = CommandClasses[cc];
					logLines.push(`· ${ccName ? ccName : num2hex(cc)}`);
				}
				this.driver.controllerLog.logNode(this.id, {
					message: logLines.join("\n"),
					direction: "inbound",
				});
				this.updateNodeInfo(nodeInfo);
				break;
			} catch (e) {
				if (isZWaveError(e)) {
					if (
						attempts === 1 &&
						this.canSleep &&
						this.status !== NodeStatus.Asleep &&
						e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						this.driver.controllerLog.logNode(
							this.id,
							`Querying the node info failed, the node is probably asleep. Retrying after wakeup...`,
							"error",
						);
						// We assumed the node to be awake, but it is not.
						this.markAsAsleep();
						// Retry the query when the node wakes up
						continue;
					}

					if (
						e.code === ZWaveErrorCodes.Controller_ResponseNOK ||
						e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						this.driver.controllerLog.logNode(
							this.id,
							`Querying the node info failed`,
							"error",
						);
					}
					throw e;
				}
			}
		}

		this.setInterviewStage(InterviewStage.NodeInfo);
	}

	public async requestNodeInfo(): Promise<NodeUpdatePayload> {
		const resp = await this.driver.sendMessage<
			RequestNodeInfoResponse | ApplicationUpdateRequest
		>(new RequestNodeInfoRequest(this.driver, { nodeId: this.id }));
		if (resp instanceof RequestNodeInfoResponse && !resp.wasSent) {
			// TODO: handle this in SendThreadMachine
			throw new ZWaveError(
				`Querying the node info failed`,
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		} else if (
			resp instanceof ApplicationUpdateRequestNodeInfoRequestFailed
		) {
			// TODO: handle this in SendThreadMachine
			throw new ZWaveError(
				`Querying the node info failed`,
				ZWaveErrorCodes.Controller_CallbackNOK,
			);
		} else if (resp instanceof ApplicationUpdateRequestNodeInfoReceived) {
			const logLines: string[] = ["node info received", "supported CCs:"];
			for (const cc of resp.nodeInformation.supportedCCs) {
				const ccName = CommandClasses[cc];
				logLines.push(`· ${ccName ? ccName : num2hex(cc)}`);
			}
			this.driver.controllerLog.logNode(this.id, {
				message: logLines.join("\n"),
				direction: "inbound",
			});
			return resp.nodeInformation;
		}
		throw new ZWaveError(
			`Received unexpected response to RequestNodeInfoRequest`,
			ZWaveErrorCodes.Controller_CommandError,
		);
	}

	/**
	 * Loads the device configuration for this node from a config file
	 */
	protected async loadDeviceConfig(): Promise<void> {
		// But the configuration definitions might change
		if (
			this.manufacturerId != undefined &&
			this.productType != undefined &&
			this.productId != undefined
		) {
			// Try to load the config file
			this._deviceConfig = await this.driver.configManager.lookupDevice(
				this.manufacturerId,
				this.productType,
				this.productId,
				this.firmwareVersion,
			);
			if (this._deviceConfig) {
				this.driver.controllerLog.logNode(
					this.id,
					`${
						this._deviceConfig.isEmbedded
							? "Embedded"
							: "User-provided"
					} device config loaded`,
				);
			} else {
				this.driver.controllerLog.logNode(
					this.id,
					"No device config found",
					"warn",
				);
			}
		}
	}

	/** Step #? of the node interview */
	protected async interviewCCs(): Promise<boolean> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot interview CCs",
				"warn",
			);
			return true;
		}

		/**
		 * @param force When this is `true`, the interview will be attempted even when the CC is not supported by the endpoint.
		 */
		const interviewEndpoint = async (
			endpoint: Endpoint,
			cc: CommandClasses,
			force: boolean = false,
		): Promise<"continue" | false | void> => {
			let instance: CommandClass;
			try {
				if (force) {
					instance = CommandClass.createInstanceUnchecked(
						this.driver,
						endpoint,
						cc,
					)!;
				} else {
					instance = endpoint.createCCInstance(cc)!;
				}
			} catch (e) {
				if (
					isZWaveError(e) &&
					e.code === ZWaveErrorCodes.CC_NotSupported
				) {
					// The CC is no longer supported. This can happen if the node tells us
					// something different in the Version interview than it did in its NIF
					return "continue";
				}
				// we want to pass all other errors through
				throw e;
			}
			if (
				endpoint.isCCSecure(cc) &&
				!this.driver.securityManager &&
				!this.driver.securityManager2
			) {
				// The CC is only supported securely, but the network key is not set up
				// Skip the CC
				this.driver.controllerLog.logNode(
					this.id,
					`Skipping interview for secure CC ${getCCName(
						cc,
					)} because no network key is configured!`,
					"error",
				);
				return "continue";
			}

			// Skip this step if the CC was already interviewed
			if (instance.isInterviewComplete(this.driver)) return "continue";

			try {
				await instance.interview(this.driver);
			} catch (e) {
				if (isTransmissionError(e)) {
					// We had a CAN or timeout during the interview
					// or the node is presumed dead. Abort the process
					return false;
				}
				// we want to pass all other errors through
				throw e;
			}
		};

		// Always interview Security first because it changes the interview order
		if (this.supportsCC(CommandClasses["Security 2"])) {
			// Security S2 is always supported *securely*
			this.addCC(CommandClasses["Security 2"], { secure: true });

			// Query supported CCs unless we know for sure that the node wasn't assigned a S2 security class
			const securityClass = this.getHighestSecurityClass();
			if (
				securityClass == undefined ||
				securityClassIsS2(securityClass)
			) {
				this.driver.controllerLog.logNode(
					this.nodeId,
					"Root device interview: Security S2",
					"silly",
				);

				if (!this.driver.securityManager2) {
					if (!this._hasEmittedNoS2NetworkKeyError) {
						// Cannot interview a secure device securely without a network key
						const errorMessage = `supports Security S2, but no S2 network keys were configured. The interview might not include all functionality.`;
						this.driver.controllerLog.logNode(
							this.nodeId,
							errorMessage,
							"error",
						);
						this.driver.emit(
							"error",
							new ZWaveError(
								`Node ${padStart(
									this.id.toString(),
									3,
									"0",
								)} ${errorMessage}`,
								ZWaveErrorCodes.Controller_NodeInsecureCommunication,
							),
						);
						this._hasEmittedNoS2NetworkKeyError = true;
					}
				} else {
					await interviewEndpoint(this, CommandClasses["Security 2"]);
				}
			}
		} else {
			// If there is any doubt about granted S2 security classes, we now know they are not granted
			for (const secClass of [
				SecurityClass.S2_AccessControl,
				SecurityClass.S2_Authenticated,
				SecurityClass.S2_Unauthenticated,
			] as const) {
				if (this.hasSecurityClass(secClass) === UNKNOWN_STATE) {
					this.securityClasses.set(secClass, false);
				}
			}
		}

		if (this.supportsCC(CommandClasses.Security)) {
			// Security S0 is always supported *securely*
			this.addCC(CommandClasses.Security, { secure: true });

			// Query supported CCs unless we know for sure that the node wasn't assigned the S0 security class
			if (this.hasSecurityClass(SecurityClass.S0_Legacy) !== false) {
				this.driver.controllerLog.logNode(
					this.nodeId,
					"Root device interview: Security S0",
					"silly",
				);

				if (!this.driver.securityManager) {
					if (!this._hasEmittedNoS0NetworkKeyError) {
						// Cannot interview a secure device securely without a network key
						const errorMessage = `supports Security S0, but the S0 network key was not configured. The interview might not include all functionality.`;
						this.driver.controllerLog.logNode(
							this.nodeId,
							errorMessage,
							"error",
						);
						this.driver.emit(
							"error",
							new ZWaveError(
								`Node ${padStart(
									this.id.toString(),
									3,
									"0",
								)} ${errorMessage}`,
								ZWaveErrorCodes.Controller_NodeInsecureCommunication,
							),
						);
						this._hasEmittedNoS0NetworkKeyError = true;
					}
				} else {
					await interviewEndpoint(this, CommandClasses.Security);
				}
			}
		} else {
			if (
				this.hasSecurityClass(SecurityClass.S0_Legacy) === UNKNOWN_STATE
			) {
				// Remember that this node hasn't been granted the S0 security class
				this.securityClasses.set(SecurityClass.S0_Legacy, false);
			}
		}

		// Manufacturer Specific and Version CC need to be handled before the other CCs because they are needed to
		// identify the device and apply device configurations
		if (this.supportsCC(CommandClasses["Manufacturer Specific"])) {
			this.driver.controllerLog.logNode(
				this.nodeId,
				"Root device interview: Manufacturer Specific",
				"silly",
			);

			await interviewEndpoint(
				this,
				CommandClasses["Manufacturer Specific"],
			);
		}

		// Basic CC MUST only be used/interviewed when no other actuator CC is supported. If Basic CC is not in the NIF
		// or list of supported CCs, we need to add it here manually, so its version can get queried.
		this.maybeAddBasicCCAsFallback();

		if (this.supportsCC(CommandClasses.Version)) {
			this.driver.controllerLog.logNode(
				this.nodeId,
				"Root device interview: Version",
				"silly",
			);

			await interviewEndpoint(this, CommandClasses.Version);

			// After the version CC interview of the root endpoint, we have enough info to load the correct device config file
			await this.loadDeviceConfig();

			// At this point we may need to make some changes to the CCs the device reports
			this.applyCommandClassesCompatFlag();
		}

		// The Wakeup interview should be done as early as possible
		if (this.supportsCC(CommandClasses["Wake Up"])) {
			this.driver.controllerLog.logNode(
				this.nodeId,
				"Root device interview: Wake Up",
				"silly",
			);

			await interviewEndpoint(this, CommandClasses["Wake Up"]);
		}

		// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
		// to map the Basic CC to other CCs or expose Basic Set as an event
		this.modifySupportedCCBeforeInterview(this);

		// We determine the correct interview order of the remaining CCs by topologically sorting two dependency graph
		// In order to avoid emitting unnecessary value events for the root endpoint,
		// we defer the application CC interview until after the other endpoints have been interviewed
		const priorityCCs = [
			CommandClasses.Security,
			CommandClasses["Security 2"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
			CommandClasses["Wake Up"],
		];
		const rootInterviewGraphBeforeEndpoints = this.buildCCInterviewGraph([
			...priorityCCs,
			...applicationCCs,
		]);
		let rootInterviewOrderBeforeEndpoints: CommandClasses[];

		const rootInterviewGraphAfterEndpoints = this.buildCCInterviewGraph([
			...priorityCCs,
			...nonApplicationCCs,
		]);
		let rootInterviewOrderAfterEndpoints: CommandClasses[];

		try {
			rootInterviewOrderBeforeEndpoints = topologicalSort(
				rootInterviewGraphBeforeEndpoints,
			);
			rootInterviewOrderAfterEndpoints = topologicalSort(
				rootInterviewGraphAfterEndpoints,
			);
		} catch (e) {
			// This interview cannot be done
			throw new ZWaveError(
				"The CC interview cannot be completed because there are circular dependencies between CCs!",
				ZWaveErrorCodes.CC_Invalid,
			);
		}

		this.driver.controllerLog.logNode(
			this.nodeId,
			`Root device interviews before endpoints: ${rootInterviewOrderBeforeEndpoints
				.map((cc) => `\n· ${getCCName(cc)}`)
				.join("")}`,
			"silly",
		);

		this.driver.controllerLog.logNode(
			this.nodeId,
			`Root device interviews after endpoints: ${rootInterviewOrderAfterEndpoints
				.map((cc) => `\n· ${getCCName(cc)}`)
				.join("")}`,
			"silly",
		);

		// Now that we know the correct order, do the interview in sequence
		for (const cc of rootInterviewOrderBeforeEndpoints) {
			this.driver.controllerLog.logNode(
				this.nodeId,
				`Root device interview: ${getCCName(cc)}`,
				"silly",
			);

			const action = await interviewEndpoint(this, cc);
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// Before querying the endpoints, we may need to make some more changes to the CCs the device reports
		// This time, the non-root endpoints are relevant
		this.applyCommandClassesCompatFlag();

		// Now query ALL endpoints
		for (const endpointIndex of this.getEndpointIndizes()) {
			const endpoint = this.getEndpoint(endpointIndex);
			if (!endpoint) continue;

			// The root endpoint has been interviewed, so we know if the device supports security and which security classes it has
			const securityClass = this.getHighestSecurityClass();

			// From the specs, Multi Channel Capability Report Command:
			// Non-secure End Point capabilities MUST also be supported securely and MUST also be advertised in
			// the S0/S2 Commands Supported Report Commands unless they are encapsulated outside Security or
			// Security themselves.
			// Nodes supporting S2 MUST support addressing every End Point with S2 encapsulation and MAY
			// explicitly list S2 in the non-secure End Point capabilities.

			// This means we need to explicitly add S2 to the list of supported CCs of the endpoint, if the node is using S2.
			// Otherwise the communication will incorrectly use no encryption.
			const endpointMissingS2 =
				securityClassIsS2(securityClass) &&
				this.supportsCC(CommandClasses["Security 2"]) &&
				!endpoint.supportsCC(CommandClasses["Security 2"]);
			if (endpointMissingS2) {
				endpoint.addCC(
					CommandClasses["Security 2"],
					this.implementedCommandClasses.get(
						CommandClasses["Security 2"],
					)!,
				);
			}

			// Always interview Security first because it changes the interview order

			if (endpoint.supportsCC(CommandClasses["Security 2"])) {
				// Security S2 is always supported *securely*
				endpoint.addCC(CommandClasses["Security 2"], { secure: true });

				// If S2 is the highest security class, interview it for the endpoint
				if (
					securityClassIsS2(securityClass) &&
					!!this.driver.securityManager2
				) {
					this.driver.controllerLog.logNode(this.nodeId, {
						endpoint: endpoint.index,
						message: `Endpoint ${endpoint.index} interview: Security S2`,
						level: "silly",
					});

					const action = await interviewEndpoint(
						endpoint,
						CommandClasses["Security 2"],
					);
					if (typeof action === "boolean") return action;
				}
			}

			if (endpoint.supportsCC(CommandClasses.Security)) {
				// Security S0 is always supported *securely*
				endpoint.addCC(CommandClasses.Security, { secure: true });

				// If S0 is the highest security class, interview it for the endpoint
				if (
					securityClass === SecurityClass.S0_Legacy &&
					!!this.driver.securityManager
				) {
					this.driver.controllerLog.logNode(this.nodeId, {
						endpoint: endpoint.index,
						message: `Endpoint ${endpoint.index} interview: Security S0`,
						level: "silly",
					});

					const action = await interviewEndpoint(
						endpoint,
						CommandClasses.Security,
					);
					if (typeof action === "boolean") return action;
				}
			}

			// It has been found that legacy nodes do not always advertise the S0 Command Class in their Multi
			// Channel Capability Report and still accept all their Command Class using S0 encapsulation.
			// A controlling node SHOULD try to control End Points with S0 encapsulation even if S0 is not
			// listed in the Multi Channel Capability Report.

			const endpointMissingS0 =
				securityClass === SecurityClass.S0_Legacy &&
				this.supportsCC(CommandClasses.Security) &&
				!endpoint.supportsCC(CommandClasses.Security);

			if (endpointMissingS0) {
				// Define which CCs we can use to test this - and if supported, how
				const possibleTests: {
					ccId: CommandClasses;
					// The test must return a truthy value if the check was successful
					test: () => Promise<unknown>;
				}[] = [
					{
						ccId: CommandClasses["Z-Wave Plus Info"],
						test: () =>
							endpoint.commandClasses["Z-Wave Plus Info"].get(),
					},
					{
						ccId: CommandClasses["Binary Switch"],
						test: () =>
							endpoint.commandClasses["Binary Switch"].get(),
					},
					{
						ccId: CommandClasses["Binary Sensor"],
						test: () =>
							endpoint.commandClasses["Binary Sensor"].get(),
					},
					{
						ccId: CommandClasses["Multilevel Switch"],
						test: () =>
							endpoint.commandClasses["Multilevel Switch"].get(),
					},
					{
						ccId: CommandClasses["Multilevel Sensor"],
						test: () =>
							endpoint.commandClasses["Multilevel Sensor"].get(),
					},
					// TODO: add other tests if necessary
				];

				const foundTest = possibleTests.find((t) =>
					endpoint.supportsCC(t.ccId),
				);
				if (foundTest) {
					this.driver.controllerLog.logNode(this.nodeId, {
						endpoint: endpoint.index,
						message: `is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Testing if it accepts secure commands anyways.`,
						level: "silly",
					});

					const { ccId, test } = foundTest;

					// Temporarily mark the CC as secure so we can use it to test
					endpoint.addCC(ccId, { secure: true });

					// Perform the test and treat errors as negative results
					const success = !!(await test().catch(() => false));

					if (success) {
						this.driver.controllerLog.logNode(this.nodeId, {
							endpoint: endpoint.index,
							message: `Endpoint ${endpoint.index} accepts/expects secure commands`,
							level: "silly",
						});
						// Mark all endpoint CCs as secure
						for (const [ccId] of endpoint.getCCs()) {
							endpoint.addCC(ccId, { secure: true });
						}
					} else {
						this.driver.controllerLog.logNode(this.nodeId, {
							endpoint: endpoint.index,
							message: `Endpoint ${endpoint.index} is actually not using S0`,
							level: "silly",
						});
						// Mark the CC as not secure again
						endpoint.addCC(ccId, { secure: false });
					}
				} else {
					this.driver.controllerLog.logNode(this.nodeId, {
						endpoint: endpoint.index,
						message: `is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Found no way to test if accepts secure commands anyways.`,
						level: "silly",
					});
				}
			}

			// Basic CC MUST only be used/interviewed when no other actuator CC is supported. If Basic CC is not in the NIF
			// or list of supported CCs, we need to add it here manually, so its version can get queried.
			this.maybeAddBasicCCAsFallback();

			// This intentionally checks for Version CC support on the root device.
			// Endpoints SHOULD not support this CC, but we still need to query their
			// CCs that the root device may or may not support
			if (this.supportsCC(CommandClasses.Version)) {
				this.driver.controllerLog.logNode(this.nodeId, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: ${getCCName(
						CommandClasses.Version,
					)}`,
					level: "silly",
				});

				await interviewEndpoint(endpoint, CommandClasses.Version, true);
			}

			// The Security S0/S2 CC adds new CCs to the endpoint, so we need to once more remove those
			// that aren't actually properly supported by the device.
			this.applyCommandClassesCompatFlag(endpoint.index);

			// We need to add/remove some CCs based on other criteria
			this.modifySupportedCCBeforeInterview(endpoint);

			const endpointInterviewGraph = endpoint.buildCCInterviewGraph([
				CommandClasses.Security,
				CommandClasses["Security 2"],
				CommandClasses.Version,
			]);
			let endpointInterviewOrder: CommandClasses[];
			try {
				endpointInterviewOrder = topologicalSort(
					endpointInterviewGraph,
				);
			} catch (e) {
				// This interview cannot be done
				throw new ZWaveError(
					"The CC interview cannot be completed because there are circular dependencies between CCs!",
					ZWaveErrorCodes.CC_Invalid,
				);
			}

			this.driver.controllerLog.logNode(this.nodeId, {
				endpoint: endpoint.index,
				message: `Endpoint ${
					endpoint.index
				} interview order: ${endpointInterviewOrder
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join("")}`,
				level: "silly",
			});

			// Now that we know the correct order, do the interview in sequence
			for (const cc of endpointInterviewOrder) {
				this.driver.controllerLog.logNode(this.nodeId, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: ${getCCName(
						cc,
					)}`,
					level: "silly",
				});

				const action = await interviewEndpoint(endpoint, cc);
				if (action === "continue") continue;
				else if (typeof action === "boolean") return action;
			}
		}

		// Continue with the application CCs for the root endpoint
		for (const cc of rootInterviewOrderAfterEndpoints) {
			this.driver.controllerLog.logNode(
				this.nodeId,
				`Root device interview: ${getCCName(cc)}`,
				"silly",
			);

			const action = await interviewEndpoint(this, cc);
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		return true;
	}

	/**
	 * @internal
	 * Handles the receipt of a NIF / NodeUpdatePayload
	 */
	public updateNodeInfo(nodeInfo: NodeUpdatePayload): void {
		if (this.interviewStage < InterviewStage.NodeInfo) {
			for (const cc of nodeInfo.supportedCCs)
				this.addCC(cc, { isSupported: true });
		}

		// As the NIF is sent on wakeup, treat this as a sign that the node is awake
		this.markAsAwake();

		// SDS14223 Unless unsolicited <XYZ> Report Commands are received,
		// a controlling node MUST probe the current values when the
		// supporting node issues a Wake Up Notification Command for sleeping nodes.

		// This is not the handler for wakeup notifications, but some legacy devices send this
		// message whenever there's an update and want to be polled.
		if (
			this.interviewStage === InterviewStage.Complete &&
			!this.supportsCC(CommandClasses["Z-Wave Plus Info"]) &&
			!this.valueDB.getValue(AssociationCCValues.hasLifeline.id)
		) {
			const delay =
				this.deviceConfig?.compat?.manualValueRefreshDelayMs || 0;
			this.driver.controllerLog.logNode(this.nodeId, {
				message: `Node does not send unsolicited updates; refreshing actuator and sensor values${
					delay > 0 ? ` in ${delay} ms` : ""
				}...`,
			});
			setTimeout(() => this.refreshValues(), delay);
		}
	}

	/**
	 * Rediscovers all capabilities of a single CC on this node and all endpoints.
	 * This can be considered a more targeted variant of `refreshInfo`.
	 *
	 * WARNING: It is not recommended to await this method!
	 */
	public async interviewCC(cc: CommandClasses): Promise<void> {
		const endpoints = this.getAllEndpoints();
		// Interview the node itself last
		endpoints.push(endpoints.shift()!);
		for (const endpoint of endpoints) {
			const instance = endpoint.createCCInstanceUnsafe(cc);
			if (instance) {
				try {
					await instance.interview(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to interview CC ${getCCName(cc)}, endpoint ${
							endpoint.index
						}: ${getErrorMessage(e)}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Refreshes all non-static values of a single CC from this node (all endpoints).
	 * WARNING: It is not recommended to await this method!
	 */
	public async refreshCCValues(cc: CommandClasses): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			const instance = endpoint.createCCInstanceUnsafe(cc);
			if (instance) {
				try {
					await instance.refreshValues(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to refresh values for ${getCCName(
							cc,
						)}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Refreshes all non-static values from this node's actuator and sensor CCs.
	 * WARNING: It is not recommended to await this method!
	 */
	public async refreshValues(): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			for (const cc of endpoint.getSupportedCCInstances()) {
				// Only query actuator and sensor CCs
				if (
					!actuatorCCs.includes(cc.ccId) &&
					!sensorCCs.includes(cc.ccId)
				) {
					continue;
				}
				try {
					await cc.refreshValues(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to refresh values for ${getCCName(
							cc.ccId,
						)}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Refreshes the values of all CCs that should be reporting regularly, but haven't been
	 * @internal
	 */
	public async autoRefreshValues(): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			for (const cc of endpoint.getSupportedCCInstances() as readonly SinglecastCC<CommandClass>[]) {
				if (!cc.shouldRefreshValues(this.driver)) continue;

				this.driver.controllerLog.logNode(this.id, {
					message: `${getCCName(
						cc.ccId,
					)} CC values may be stale, refreshing...`,
					endpoint: endpoint.index,
					direction: "outbound",
				});

				try {
					await cc.refreshValues(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(this.id, {
						message: `failed to refresh values for ${getCCName(
							cc.ccId,
						)} CC: ${getErrorMessage(e)}`,
						endpoint: endpoint.index,
						level: "error",
					});
				}
			}
		}
	}

	/**
	 * Uses the `commandClasses` compat flag defined in the node's config file to
	 * override the reported command classes.
	 * @param endpointIndex If given, limits the application of the compat flag to the given endpoint.
	 */
	private applyCommandClassesCompatFlag(endpointIndex?: number): void {
		if (this.deviceConfig) {
			// Add CCs the device config file tells us to
			const addCCs = this.deviceConfig.compat?.addCCs;
			if (addCCs) {
				for (const [cc, { endpoints }] of addCCs) {
					if (endpointIndex === undefined) {
						for (const [ep, info] of endpoints) {
							this.getEndpoint(ep)?.addCC(cc, info);
						}
					} else if (endpoints.has(endpointIndex)) {
						this.getEndpoint(endpointIndex)?.addCC(
							cc,
							endpoints.get(endpointIndex)!,
						);
					}
				}
			}
			// And remove those that it marks as unsupported
			const removeCCs = this.deviceConfig.compat?.removeCCs;
			if (removeCCs) {
				for (const [cc, endpoints] of removeCCs) {
					if (endpoints === "*") {
						if (endpointIndex === undefined) {
							for (const ep of this.getAllEndpoints()) {
								ep.removeCC(cc);
							}
						} else {
							this.getEndpoint(endpointIndex)?.removeCC(cc);
						}
					} else {
						if (endpointIndex === undefined) {
							for (const ep of endpoints) {
								this.getEndpoint(ep)?.removeCC(cc);
							}
						} else if (endpoints.includes(endpointIndex)) {
							this.getEndpoint(endpointIndex)?.removeCC(cc);
						}
					}
				}
			}
		}
	}

	/**
	 * Updates the supported CCs of the given endpoint depending on compat flags
	 * and certification requirements
	 */
	private modifySupportedCCBeforeInterview(endpoint: Endpoint): void {
		const compat = this._deviceConfig?.compat;

		// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
		// to map the Basic CC to other CCs or expose Basic Set as an event
		if (compat?.treatBasicSetAsEvent) {
			if (endpoint.index === 0) {
				// To create the compat event value, we need to force a Basic CC interview
				endpoint.addCC(CommandClasses.Basic, {
					isSupported: true,
					version: 1,
				});
			}
		} else if (!compat?.disableBasicMapping) {
			endpoint.hideBasicCCInFavorOfActuatorCCs();
		}

		// Window Covering CC:
		// CL:006A.01.51.01.2: A controlling node MUST NOT interview and provide controlling functionalities for the
		// Multilevel Switch Command Class for a node (or endpoint) supporting the Window Covering CC, as it is a fully
		// redundant and less precise application functionality.
		if (
			endpoint.supportsCC(CommandClasses["Multilevel Switch"]) &&
			endpoint.supportsCC(CommandClasses["Window Covering"])
		) {
			endpoint.removeCC(CommandClasses["Multilevel Switch"]);
		}
	}

	/** Overwrites the reported configuration with information from a config file */
	protected async overwriteConfig(): Promise<void> {
		if (this.isControllerNode) {
			// The device config was not loaded prior to this step because the Version CC is not interviewed.
			// Therefore do it here.
			await this.loadDeviceConfig();
		}

		if (this.deviceConfig) {
			// Add CCs the device config file tells us to
			const addCCs = this.deviceConfig.compat?.addCCs;
			if (addCCs) {
				for (const [cc, { endpoints }] of addCCs) {
					for (const [ep, info] of endpoints) {
						this.getEndpoint(ep)?.addCC(cc, info);
					}
				}
			}
			// And remove those that it marks as unsupported
			const removeCCs = this.deviceConfig.compat?.removeCCs;
			if (removeCCs) {
				for (const [cc, endpoints] of removeCCs) {
					if (endpoints === "*") {
						for (const ep of this.getAllEndpoints()) {
							ep.removeCC(cc);
						}
					} else {
						for (const ep of endpoints) {
							this.getEndpoint(ep)?.removeCC(cc);
						}
					}
				}
			}
		}

		this.setInterviewStage(InterviewStage.OverwriteConfig);
	}

	/**
	 * @internal
	 * Handles a CommandClass that was received from this node
	 */
	public async handleCommand(command: CommandClass): Promise<void> {
		// If this is a report for the root endpoint and the node supports the CC on another endpoint,
		// we need to map it to endpoint 1. Either it does not support multi channel associations or
		// it is misbehaving. In any case, we would hide this report if we didn't map it
		if (
			command.endpointIndex === 0 &&
			command.constructor.name.endsWith("Report") &&
			this.getEndpointCount() >= 1 &&
			// Only map reports from the root device to an endpoint if we know which one
			this._deviceConfig?.compat?.mapRootReportsToEndpoint != undefined
		) {
			const endpoint = this.getEndpoint(
				this._deviceConfig?.compat?.mapRootReportsToEndpoint,
			);
			if (endpoint && endpoint.supportsCC(command.ccId)) {
				// Force the CC to store its values again under the supporting endpoint
				this.driver.controllerLog.logNode(
					this.nodeId,
					`Mapping unsolicited report from root device to endpoint #${endpoint.index}`,
				);
				command.endpointIndex = endpoint.index;
				command.persistValues(this.driver);
			}
		}

		// If we're being queried by another node, treat this as a sign that the other node is awake
		if (
			command.constructor.name.endsWith("Get") &&
			// Nonces can be sent while asleep though
			!(command instanceof SecurityCCNonceGet) &&
			!(command instanceof Security2CCNonceGet)
		) {
			this.markAsAwake();
		}

		if (command instanceof BasicCC) {
			return this.handleBasicCommand(command);
		} else if (command instanceof MultilevelSwitchCC) {
			return this.handleMultilevelSwitchCommand(command);
		} else if (command instanceof CentralSceneCCNotification) {
			return this.handleCentralSceneNotification(command);
		} else if (command instanceof WakeUpCCWakeUpNotification) {
			return this.handleWakeUpNotification();
		} else if (command instanceof NotificationCCReport) {
			return this.handleNotificationReport(command);
		} else if (command instanceof ClockCCReport) {
			return this.handleClockReport(command);
		} else if (command instanceof SecurityCCNonceGet) {
			return this.handleSecurityNonceGet();
		} else if (command instanceof SecurityCCNonceReport) {
			return this.handleSecurityNonceReport(command);
		} else if (command instanceof SecurityCCCommandsSupportedGet) {
			return this.handleSecurityCommandsSupportedGet(command);
		} else if (command instanceof Security2CCNonceGet) {
			return this.handleSecurity2NonceGet();
		} else if (command instanceof Security2CCNonceReport) {
			return this.handleSecurity2NonceReport(command);
		} else if (command instanceof Security2CCCommandsSupportedGet) {
			return this.handleSecurity2CommandsSupportedGet(command);
		} else if (command instanceof HailCC) {
			return this.handleHail(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCGet) {
			return this.handleUnexpectedFirmwareUpdateGet(command);
		} else if (command instanceof EntryControlCCNotification) {
			return this.handleEntryControlNotification(command);
		} else if (command instanceof PowerlevelCCTestNodeReport) {
			return this.handlePowerlevelTestNodeReport(command);
		} else if (command instanceof TimeCCTimeGet) {
			return this.handleTimeGet(command);
		} else if (command instanceof TimeCCDateGet) {
			return this.handleDateGet(command);
		} else if (command instanceof TimeCCTimeOffsetGet) {
			return this.handleTimeOffsetGet(command);
		} else if (command instanceof ZWavePlusCCGet) {
			return this.handleZWavePlusGet(command);
		} else if (command instanceof VersionCCGet) {
			return this.handleVersionGet(command);
		} else if (command instanceof VersionCCCommandClassGet) {
			return this.handleVersionCommandClassGet(command);
		} else if (command instanceof AssociationGroupInfoCCNameGet) {
			return this.handleAGINameGet(command);
		} else if (command instanceof AssociationGroupInfoCCInfoGet) {
			return this.handleAGIInfoGet(command);
		} else if (command instanceof AssociationGroupInfoCCCommandListGet) {
			return this.handleAGICommandListGet(command);
		} else if (command instanceof AssociationCCSupportedGroupingsGet) {
			return this.handleAssociationSupportedGroupingsGet(command);
		} else if (command instanceof AssociationCCGet) {
			return this.handleAssociationGet(command);
		} else if (command instanceof AssociationCCSet) {
			return this.handleAssociationSet(command);
		} else if (command instanceof AssociationCCRemove) {
			return this.handleAssociationRemove(command);
		} else if (command instanceof IndicatorCCSupportedGet) {
			return this.handleIndicatorSupportedGet(command);
		} else if (command instanceof IndicatorCCSet) {
			return this.handleIndicatorSet(command);
		} else if (command instanceof InclusionControllerCCInitiate) {
			// Inclusion controller commands are handled by the controller class
			if (
				command.step === InclusionControllerStep.ProxyInclusionReplace
			) {
				return this.driver.controller.handleInclusionControllerCCInitiateReplace(
					command,
				);
			}
		} else if (command instanceof MultiCommandCCCommandEncapsulation) {
			// Handle each encapsulated command individually
			for (const cmd of command.encapsulated) {
				await this.handleCommand(cmd);
			}
			return;
		} else if (
			command instanceof Security2CCMessageEncapsulation &&
			command.encapsulated == undefined
		) {
			// Some S2 commands contain only extensions. Those are handled by the CC implementation.
			return;
		}

		// Ignore all commands that don't need to be handled
		switch (true) {
			// Reports are either a response to a Get command or
			// automatically store their values in the Value DB.
			// No need to manually handle them - other than what we've already done
			case command.constructor.name.endsWith("Report"):

			// When this command is received, its values get emitted as an event.
			// Nothing else to do here
			case command instanceof SceneActivationCCSet:
				return;
		}

		this.driver.controllerLog.logNode(this.id, {
			message: `TODO: no handler for application command`,
			direction: "inbound",
		});
	}

	private hasLoggedNoNetworkKey = false;

	/**
	 * @internal
	 * Handles a nonce request
	 */
	public async handleSecurityNonceGet(): Promise<void> {
		// Only reply if secure communication is set up
		if (!this.driver.securityManager) {
			if (!this.hasLoggedNoNetworkKey) {
				this.hasLoggedNoNetworkKey = true;
				this.driver.controllerLog.logNode(this.id, {
					message: `cannot reply to NonceGet because no network key was configured!`,
					direction: "inbound",
					level: "warn",
				});
			}
			return;
		}

		// When a node asks us for a nonce, it must support Security CC
		this.addCC(CommandClasses.Security, {
			isSupported: true,
			version: 1,
			// Security CC is always secure
			secure: true,
		});

		// Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
		const isNonceReport = (t: Transaction) =>
			t.message.getNodeId() === this.nodeId &&
			isCommandClassContainer(t.message) &&
			t.message.command instanceof SecurityCCNonceReport;

		if (this.driver.hasPendingTransactions(isNonceReport)) {
			this.driver.controllerLog.logNode(this.id, {
				message:
					"in the process of replying to a NonceGet, won't send another NonceReport",
				level: "warn",
			});
			return;
		}

		// Delete all previous nonces we sent the node, since they should no longer be used
		this.driver.securityManager.deleteAllNoncesForReceiver(this.id);

		// Now send the current nonce
		try {
			await this.commandClasses.Security.sendNonce();
		} catch (e) {
			this.driver.controllerLog.logNode(this.id, {
				message: `failed to send nonce: ${getErrorMessage(e)}`,
				direction: "inbound",
			});
		}
	}

	/**
	 * Is called when a nonce report is received that does not belong to any transaction.
	 * The received nonce reports are stored as "free" nonces
	 */
	private handleSecurityNonceReport(command: SecurityCCNonceReport): void {
		const secMan = this.driver.securityManager;
		if (!secMan) return;

		secMan.setNonce(
			{
				issuer: this.id,
				nonceId: secMan.getNonceId(command.nonce),
			},
			{
				nonce: command.nonce,
				receiver: this.driver.controller.ownNodeId!,
			},
			{ free: true },
		);
	}

	/**
	 * @internal
	 * Handles a nonce request for S2
	 */
	public async handleSecurity2NonceGet(): Promise<void> {
		// Only reply if secure communication is set up
		if (!this.driver.securityManager2) {
			if (!this.hasLoggedNoNetworkKey) {
				this.hasLoggedNoNetworkKey = true;
				this.driver.controllerLog.logNode(this.id, {
					message: `cannot reply to NonceGet (S2) because no network key was configured!`,
					direction: "inbound",
					level: "warn",
				});
			}
			return;
		}

		// When a node asks us for a nonce, it must support Security 2 CC
		this.addCC(CommandClasses["Security 2"], {
			isSupported: true,
			version: 1,
			// Security 2 CC is always secure
			secure: true,
		});

		// Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
		const isNonceReport = (t: Transaction) =>
			t.message.getNodeId() === this.nodeId &&
			isCommandClassContainer(t.message) &&
			t.message.command instanceof Security2CCNonceReport;

		if (this.driver.hasPendingTransactions(isNonceReport)) {
			this.driver.controllerLog.logNode(this.id, {
				message:
					"in the process of replying to a NonceGet, won't send another NonceReport",
				level: "warn",
			});
			return;
		}

		try {
			await this.commandClasses["Security 2"].sendNonce();
		} catch (e) {
			this.driver.controllerLog.logNode(this.id, {
				message: `failed to send nonce: ${getErrorMessage(e)}`,
				direction: "inbound",
			});
		}
	}

	/**
	 * Is called when a nonce report is received that does not belong to any transaction.
	 */
	private handleSecurity2NonceReport(_command: Security2CCNonceReport): void {
		// const secMan = this.driver.securityManager2;
		// if (!secMan) return;

		// This has the potential of resetting our SPAN state in the middle of a transaction which may expect it to be valid
		// So we probably shouldn't react here, and instead handle the NonceReport we'll get in response to the next command we send

		// if (command.SOS && command.receiverEI) {
		// 	// The node couldn't decrypt the last command we sent it. Invalidate
		// 	// the shared SPAN, since it did the same
		// 	secMan.storeRemoteEI(this.nodeId, command.receiverEI);
		// }

		// Since we landed here, this is not in response to any command we sent
		this.driver.controllerLog.logNode(this.id, {
			message: `received S2 nonce without an active transaction, not sure what to do with it`,
			level: "warn",
			direction: "inbound",
		});
	}

	private busyPollingAfterHail: boolean = false;
	private async handleHail(_command: HailCC): Promise<void> {
		// treat this as a sign that the node is awake
		this.markAsAwake();

		if (this.busyPollingAfterHail) {
			this.driver.controllerLog.logNode(this.nodeId, {
				message: `Hail received from node, but still busy with previous one...`,
			});
			return;
		}

		this.busyPollingAfterHail = true;
		this.driver.controllerLog.logNode(this.nodeId, {
			message: `Hail received from node, refreshing actuator and sensor values...`,
		});
		try {
			await this.refreshValues();
		} catch {
			// ignore
		}
		this.busyPollingAfterHail = false;
	}

	/** Stores information about a currently held down key */
	private centralSceneKeyHeldDownContext:
		| {
				timeout: NodeJS.Timeout;
				sceneNumber: number;
		  }
		| undefined;
	private lastCentralSceneNotificationSequenceNumber: number | undefined;
	private centralSceneForcedKeyUp = false;

	/** Handles the receipt of a Central Scene notifification */
	private handleCentralSceneNotification(
		command: CentralSceneCCNotification,
	): void {
		// Did we already receive this command?
		if (
			command.sequenceNumber ===
			this.lastCentralSceneNotificationSequenceNumber
		) {
			return;
		} else {
			this.lastCentralSceneNotificationSequenceNumber =
				command.sequenceNumber;
		}
		/*
		If the Slow Refresh field is false:
		- A new Key Held Down notification MUST be sent every 200ms until the key is released.
		- The Sequence Number field MUST be updated at each notification transmission.
		- If not receiving a new Key Held Down notification within 400ms, a controlling node SHOULD use an adaptive timeout approach as described in 4.17.1:
		A controller SHOULD apply an adaptive approach based on the reception of the Key Released Notification.
		Initially, the controller SHOULD time out if not receiving any Key Held Down Notification refresh after
		400ms and consider this to be a Key Up Notification. If, however, the controller subsequently receives a
		Key Released Notification, the controller SHOULD consider the sending node to be operating with the Slow
		Refresh capability enabled.

		If the Slow Refresh field is true:
		- A new Key Held Down notification MUST be sent every 55 seconds until the key is released.
		- The Sequence Number field MUST be updated at each notification refresh.
		- If not receiving a new Key Held Down notification within 60 seconds after the most recent Key Held Down
		notification, a receiving node MUST respond as if it received a Key Release notification.
		*/

		const setSceneValue = (
			sceneNumber: number,
			key: CentralSceneKeys,
		): void => {
			const valueId = CentralSceneCCValues.scene(sceneNumber).id;
			this.valueDB.setValue(valueId, key, { stateful: false });
		};

		const forceKeyUp = (): void => {
			this.centralSceneForcedKeyUp = true;
			// force key up event
			setSceneValue(
				this.centralSceneKeyHeldDownContext!.sceneNumber,
				CentralSceneKeys.KeyReleased,
			);
			// clear old timer
			clearTimeout(this.centralSceneKeyHeldDownContext!.timeout);
			// clear the key down context
			this.centralSceneKeyHeldDownContext = undefined;
		};

		if (
			this.centralSceneKeyHeldDownContext &&
			this.centralSceneKeyHeldDownContext.sceneNumber !==
				command.sceneNumber
		) {
			// The user pressed another button, force release
			forceKeyUp();
		}

		const slowRefreshValueId = CentralSceneCCValues.slowRefresh.endpoint(
			this.index,
		);
		if (command.keyAttribute === CentralSceneKeys.KeyHeldDown) {
			// Set or refresh timer to force a release of the key
			this.centralSceneForcedKeyUp = false;
			if (this.centralSceneKeyHeldDownContext) {
				clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
			}
			// If the node does not advertise support for the slow refresh capability, we might still be dealing with a
			// slow refresh node. We use the stored value for fallback behavior
			const slowRefresh =
				command.slowRefresh ??
				this.valueDB.getValue<boolean>(slowRefreshValueId);
			this.centralSceneKeyHeldDownContext = {
				sceneNumber: command.sceneNumber,
				// Unref'ing long running timers allows the process to exit mid-timeout
				timeout: setTimeout(
					forceKeyUp,
					slowRefresh ? 60000 : 400,
				).unref(),
			};
		} else if (command.keyAttribute === CentralSceneKeys.KeyReleased) {
			// Stop the release timer
			if (this.centralSceneKeyHeldDownContext) {
				clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
				this.centralSceneKeyHeldDownContext = undefined;
			} else if (this.centralSceneForcedKeyUp) {
				// If we timed out and the controller subsequently receives a Key Released Notification,
				// we SHOULD consider the sending node to be operating with the Slow Refresh capability enabled.
				this.valueDB.setValue(slowRefreshValueId, true);
				// Do not raise the duplicate event
				return;
			}
		}

		setSceneValue(command.sceneNumber, command.keyAttribute);
		this.driver.controllerLog.logNode(this.id, {
			message: `received CentralScene notification ${stringify(command)}`,
			direction: "inbound",
		});
	}

	/** The timestamp of the last received wakeup notification */
	private lastWakeUp: number | undefined;

	/** Handles the receipt of a Wake Up notification */
	private handleWakeUpNotification(): void {
		this.driver.controllerLog.logNode(this.id, {
			message: `received wakeup notification`,
			direction: "inbound",
		});

		// It can happen that the node has not told us that it supports the Wake Up CC
		// https://sentry.io/share/issue/6a681729d7db46d591f1dcadabe8d02e/
		// To avoid a crash, mark it as supported
		if (this.getCCVersion(CommandClasses["Wake Up"]) === 0) {
			this.addCC(CommandClasses["Wake Up"], {
				isSupported: true,
				version: 1,
			});
		}

		this.markAsAwake();

		// From the specs:
		// A controlling node SHOULD read the Wake Up Interval of a supporting node when the delays between
		// Wake Up periods are larger than what was last set at the supporting node.
		const now = Date.now();
		if (this.lastWakeUp) {
			// we've already measured the wake up interval, so we can check whether a refresh is necessary
			const wakeUpInterval =
				this.getValue<number>(WakeUpCCValues.wakeUpInterval.id) ?? 1;
			// The wakeup interval is specified in seconds. Also add 5 minutes tolerance to avoid
			// unnecessary queries since there might be some delay. A wakeup interval of 0 means manual wakeup,
			// so the interval shouldn't be verified
			if (
				wakeUpInterval > 0 &&
				(now - this.lastWakeUp) / 1000 > wakeUpInterval + 5 * 60
			) {
				this.commandClasses["Wake Up"].getInterval().catch(() => {
					// Don't throw if there's an error
				});
			}
		}
		this.lastWakeUp = now;

		// Some legacy devices expect us to query them on wake up in order to function correctly
		if (this._deviceConfig?.compat?.queryOnWakeup) {
			void this.compatDoWakeupQueries();
		} else if (!this._deviceConfig?.compat?.disableAutoRefresh) {
			// For other devices we may have to refresh their values from time to time
			void this.autoRefreshValues().catch(() => {
				// ignore
			});
		}

		// In case there are no messages in the queue, the node may go back to sleep very soon
		this.driver.debounceSendNodeToSleep(this);
	}

	private async compatDoWakeupQueries(): Promise<void> {
		if (!this._deviceConfig?.compat?.queryOnWakeup) return;
		this.driver.controllerLog.logNode(this.id, {
			message: `expects some queries after wake up, so it shall receive`,
			direction: "none",
		});

		for (const [ccName, apiMethod, ...args] of this._deviceConfig.compat
			.queryOnWakeup) {
			this.driver.controllerLog.logNode(this.id, {
				message: `compat query "${ccName}"::${apiMethod}(${args
					.map((arg) => JSON.stringify(arg))
					.join(", ")})`,
				direction: "none",
			});

			// Try to access the API - if it doesn't work, skip this option
			let API: CCAPI;
			try {
				API = (
					(this.commandClasses as any)[ccName] as CCAPI
				).withOptions({
					// Tag the resulting transactions as compat queries
					tag: "compat",
					// Do not retry them or they may cause congestion if the node is asleep again
					maxSendAttempts: 1,
					// This is for a sleeping node - there's no point in keeping the transactions when the node is asleep
					expire: 10000,
				});
			} catch {
				this.driver.controllerLog.logNode(this.id, {
					message: `could not access API, skipping query`,
					direction: "none",
					level: "warn",
				});
				continue;
			}
			if (!API.isSupported()) {
				this.driver.controllerLog.logNode(this.id, {
					message: `API not supported, skipping query`,
					direction: "none",
					level: "warn",
				});
				continue;
			} else if (!(API as any)[apiMethod]) {
				this.driver.controllerLog.logNode(this.id, {
					message: `method ${apiMethod} not found on API, skipping query`,
					direction: "none",
					level: "warn",
				});
				continue;
			}

			// Retrieve the method
			// eslint-disable-next-line
			const method = (API as any)[apiMethod].bind(API) as Function;
			// And replace "smart" arguments with their corresponding value
			const methodArgs = args.map<unknown>((arg) => {
				if (isObject(arg)) {
					const valueId = {
						commandClass: API.ccId,
						...arg,
					};
					return this.getValue(valueId);
				}
				return arg;
			});

			// Do the API call and ignore/log any errors
			try {
				await method(...methodArgs);
				this.driver.controllerLog.logNode(this.id, {
					message: `API call successful`,
					direction: "none",
				});
			} catch (e) {
				this.driver.controllerLog.logNode(this.id, {
					message: `error during API call: ${getErrorMessage(e)}`,
					direction: "none",
					level: "warn",
				});
				if (
					isZWaveError(e) &&
					e.code === ZWaveErrorCodes.Controller_MessageExpired
				) {
					// A compat query expired - no point in trying the others too
					return;
				}
			}
		}
	}

	/** Handles the receipt of a BasicCC Set or Report */
	private handleBasicCommand(command: BasicCC): void {
		// Retrieve the endpoint the command is coming from
		const sourceEndpoint =
			this.getEndpoint(command.endpointIndex ?? 0) ?? this;

		// Depending on the generic device class, we may need to map the basic command to other CCs
		let mappedTargetCC: CommandClass | undefined;
		// Do not map the basic CC if the device config forbids it
		if (!this._deviceConfig?.compat?.disableBasicMapping) {
			switch (sourceEndpoint.deviceClass?.generic.key) {
				case 0x20: // Binary Sensor
					mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
						CommandClasses["Binary Sensor"],
					);
					break;
				case 0x10: // Binary Switch
					mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
						CommandClasses["Binary Switch"],
					);
					break;
				case 0x11: // Multilevel Switch
					mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
						CommandClasses["Multilevel Switch"],
					);
					break;
				case 0x12: // Remote Switch
					switch (sourceEndpoint.deviceClass.specific.key) {
						case 0x01: // Binary Remote Switch
							mappedTargetCC =
								sourceEndpoint.createCCInstanceUnsafe(
									CommandClasses["Binary Switch"],
								);
							break;
						case 0x02: // Multilevel Remote Switch
							mappedTargetCC =
								sourceEndpoint.createCCInstanceUnsafe(
									CommandClasses["Multilevel Switch"],
								);
							break;
					}
			}
		}

		if (command instanceof BasicCCReport) {
			// Try to set the mapped value on the target CC
			const didSetMappedValue =
				typeof command.currentValue === "number" &&
				mappedTargetCC?.setMappedBasicValue(
					this.driver,
					command.currentValue,
				);

			// Otherwise fall back to setting it ourselves
			if (!didSetMappedValue) {
				// Store the value in the value DB now
				command.persistValues(this.driver);

				// Since the node sent us a Basic report, we are sure that it is at least supported
				// If this is the only supported actuator CC, add it to the support list,
				// so the information lands in the network cache
				if (!actuatorCCs.some((cc) => sourceEndpoint.supportsCC(cc))) {
					sourceEndpoint.addCC(CommandClasses.Basic, {
						isControlled: true,
					});
				}
			}
		} else if (command instanceof BasicCCSet) {
			// Treat BasicCCSet as value events if desired
			if (this._deviceConfig?.compat?.treatBasicSetAsEvent) {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: command.endpointIndex,
					message: "treating BasicCC::Set as a value event",
				});
				this._valueDB.setValue(
					BasicCCValues.compatEvent.endpoint(command.endpointIndex),
					command.targetValue,
					{
						stateful: false,
					},
				);
				return;
			} else {
				// Some devices send their current state using `BasicCCSet`s to their associations
				// instead of using reports. We still interpret them like reports
				this.driver.controllerLog.logNode(this.id, {
					endpoint: command.endpointIndex,
					message: "treating BasicCC::Set as a report",
				});

				// If enabled in a config file, try to set the mapped value on the target CC first
				const didSetMappedValue =
					!!this._deviceConfig?.compat?.enableBasicSetMapping &&
					!!mappedTargetCC?.setMappedBasicValue(
						this.driver,
						command.targetValue,
					);

				// Otherwise handle the command ourselves
				if (!didSetMappedValue) {
					// Basic Set commands cannot store their value automatically, so store the values manually
					this._valueDB.setValue(
						BasicCCValues.currentValue.endpoint(
							command.endpointIndex,
						),
						command.targetValue,
					);
					// Since the node sent us a Basic command, we are sure that it is at least controlled
					// Add it to the support list, so the information lands in the network cache
					if (!sourceEndpoint.controlsCC(CommandClasses.Basic)) {
						sourceEndpoint.addCC(CommandClasses.Basic, {
							isControlled: true,
						});
					}
				}
			}
		}
	}

	/** Handles the receipt of a MultilevelCC Set or Report */
	private handleMultilevelSwitchCommand(command: MultilevelSwitchCC): void {
		if (command instanceof MultilevelSwitchCCSet) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message: "treating MultiLevelSwitchCCSet::Set as a value event",
			});
			this._valueDB.setValue(
				MultilevelSwitchCCValues.compatEvent.endpoint(
					command.endpointIndex,
				),
				command.targetValue,
				{
					stateful: false,
				},
			);
		} else if (command instanceof MultilevelSwitchCCStartLevelChange) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message:
					"treating MultilevelSwitchCC::StartLevelChange as a notification",
			});
			this.emit(
				"notification",
				this,
				CommandClasses["Multilevel Switch"],
				{
					eventType: MultilevelSwitchCommand.StartLevelChange,
					eventTypeLabel: "Start level change",
					direction: command.direction,
				},
			);
		} else if (command instanceof MultilevelSwitchCCStopLevelChange) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message:
					"treating MultilevelSwitchCC::StopLevelChange as a notification",
			});
			this.emit(
				"notification",
				this,
				CommandClasses["Multilevel Switch"],
				{
					eventType: MultilevelSwitchCommand.StopLevelChange,
					eventTypeLabel: "Stop level change",
				},
			);
		}
	}

	private async handleZWavePlusGet(command: ZWavePlusCCGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		await endpoint.commandClasses["Z-Wave Plus Info"]
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			})
			.sendReport({
				zwavePlusVersion: 2,
				roleType: ZWavePlusRoleType.CentralStaticController,
				nodeType: ZWavePlusNodeType.Node,
				installerIcon: 0x0500, // Generic Gateway
				userIcon: 0x0500, // Generic Gateway
			});
	}

	private async handleVersionGet(command: VersionCCGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Version, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		await api.sendReport({
			libraryType: ZWaveLibraryTypes["Static Controller"],
			protocolVersion: this.driver.controller.protocolVersion!,
			firmwareVersions: [this.driver.controller.firmwareVersion!],
		});
	}

	private async handleVersionCommandClassGet(
		command: VersionCCCommandClassGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Version, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		await api.reportCCVersion(command.requestedCC);
	}

	private async handleAGINameGet(
		command: AssociationGroupInfoCCNameGet,
	): Promise<void> {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Association Group Information"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		await api.reportGroupName(1, "Lifeline");
	}

	private async handleAGIInfoGet(
		command: AssociationGroupInfoCCInfoGet,
	): Promise<void> {
		if (!command.listMode && command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Association Group Information"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		await api.reportGroupInfo({
			isListMode: command.listMode ?? false,
			hasDynamicInfo: false,
			groups: [
				{
					groupId: 1,
					eventCode: 0, // ignored anyways
					profile: AssociationGroupInfoProfile["General: Lifeline"],
					mode: 0, // ignored anyways
				},
			],
		});
	}

	private async handleAGICommandListGet(
		command: AssociationGroupInfoCCCommandListGet,
	): Promise<void> {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Association Group Information"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		await api.reportCommands(
			command.groupId,
			new Map([
				[
					CommandClasses["Device Reset Locally"],
					[DeviceResetLocallyCommand.Notification],
				],
			]),
		);
	}

	private async handleAssociationSupportedGroupingsGet(
		command: AssociationCCSupportedGroupingsGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Association, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		// We only "support" the lifeline group
		await api.reportGroupCount(1);
	}

	private async handleAssociationGet(
		command: AssociationCCGet,
	): Promise<void> {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const controllerNode = this.driver.controller.nodes.get(
			this.driver.controller.ownNodeId!,
		)!;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Association, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		await api.sendReport({
			groupId: command.groupId,
			maxNodes: MAX_ASSOCIATIONS,
			nodeIds: [...(controllerNode?.associations ?? [])],
			reportsToFollow: 0,
		});
	}

	private handleAssociationSet(command: AssociationCCSet): void {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const controllerNode = this.driver.controller.nodes.get(
			this.driver.controller.ownNodeId!,
		);
		if (!controllerNode) return;

		controllerNode.associations = [
			...controllerNode.associations,
			...command.nodeIds,
		].slice(0, MAX_ASSOCIATIONS);
	}

	private handleAssociationRemove(command: AssociationCCRemove): void {
		// Allow accessing the lifeline group or all groups (which is the same)
		if (!!command.groupId && command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const controllerNode = this.driver.controller.nodes.get(
			this.driver.controller.ownNodeId!,
		);
		if (!controllerNode) return;

		if (!command.nodeIds) {
			// clear
			controllerNode.associations = [];
		} else {
			controllerNode.associations = controllerNode.associations.filter(
				(nodeId) => !command.nodeIds!.includes(nodeId),
			);
		}
	}

	private handleIndicatorSupportedGet(
		command: IndicatorCCSupportedGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Indicator, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags &
					~EncapsulationFlags.Supervision,
			});

		switch (command.indicatorId) {
			case 0:
			// 0 must be answered with the first supported indicator ID.
			// We only support identify (0x50)
			case 0x50:
				// Identify
				return api.reportSupported(0x50, [0x03, 0x04, 0x05], 0);
			default:
				// A supporting node receiving a non-zero Indicator ID that is
				// not supported MUST set all fields to 0x00 in the returned response.
				return api.reportSupported(0, [], 0);
		}
	}

	private handleIndicatorSet(command: IndicatorCCSet): void {
		// We only support "identify"
		if (command.values?.length !== 3) return;
		const [v1, v2, v3] = command.values;
		if (v1.indicatorId !== 0x50 || v1.propertyId !== 0x03) return;
		if (v2.indicatorId !== 0x50 || v2.propertyId !== 0x04) return;
		if (v3.indicatorId !== 0x50 || v3.propertyId !== 0x05) return;

		this.driver.controllerLog.logNode(this.id, {
			message: "Received identify command",
			direction: "inbound",
		});

		this.driver.controller.emit("identify");
	}

	private async handleSecurityCommandsSupportedGet(
		command: SecurityCCCommandsSupportedGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		if (this.getHighestSecurityClass() === SecurityClass.S0_Legacy) {
			const { supportedCCs } = determineNIF();
			await endpoint.commandClasses.Security.reportSupportedCommands(
				supportedCCs,
				// We don't report controlled CCs
				[],
			);
		} else {
			// S0 is not the highest class. Return an empty list
			await endpoint.commandClasses.Security.reportSupportedCommands(
				[],
				[],
			);
		}
	}

	private async handleSecurity2CommandsSupportedGet(
		command: Security2CCCommandsSupportedGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const highestSecurityClass = this.getHighestSecurityClass();
		const actualSecurityClass = (
			command.getEncapsulatingCC(
				CommandClasses["Security 2"],
				Security2Command.MessageEncapsulation,
			) as Security2CCMessageEncapsulation | undefined
		)?.securityClass;

		if (
			highestSecurityClass !== undefined &&
			highestSecurityClass === actualSecurityClass
		) {
			// The command was received using the highest security class. Return the list of supported CCs
			await endpoint.commandClasses["Security 2"].reportSupportedCommands(
				determineNIF().supportedCCs.filter(
					(cc) =>
						// CC:009F.01.0E.11.00F
						// The Security 0 and Security 2 Command Class MUST NOT be advertised in this command
						// The Transport Service Command Class MUST NOT be advertised in this command.
						cc !== CommandClasses.Security &&
						cc !== CommandClasses["Security 2"] &&
						cc !== CommandClasses["Transport Service"],
				),
			);
		} else if (securityClassIsS2(actualSecurityClass)) {
			// The command was received using a lower security class. Return an empty list
			await endpoint.commandClasses["Security 2"]
				.withOptions({
					s2OverrideSecurityClass: actualSecurityClass,
				})
				.reportSupportedCommands([]);
		} else {
			// Do not respond
		}
	}

	/**
	 * Allows automatically resetting notification values to idle if the node does not do it itself
	 */
	private notificationIdleTimeouts = new Map<string, NodeJS.Timeout>();
	/** Schedules a notification value to be reset */
	private scheduleNotificationIdleReset(
		valueId: ValueID,
		handler: () => void,
	): void {
		this.clearNotificationIdleReset(valueId);
		const key = valueIdToString(valueId);
		this.notificationIdleTimeouts.set(
			key,
			// Unref'ing long running timeouts allows to quit the application before the timeout elapses
			setTimeout(handler, 5 * 60 * 1000 /* 5 minutes */).unref(),
		);
	}

	/** Removes a scheduled notification reset */
	private clearNotificationIdleReset(valueId: ValueID): void {
		const key = valueIdToString(valueId);
		if (this.notificationIdleTimeouts.has(key)) {
			clearTimeout(this.notificationIdleTimeouts.get(key));
			this.notificationIdleTimeouts.delete(key);
		}
	}

	// Fallback for V2 notifications that don't allow us to predefine the metadata during the interview.
	// Instead of defining useless values for each possible notification event, we build the metadata on demand
	private extendNotificationValueMetadata(
		valueId: ValueID,
		notificationConfig: Notification,
		valueConfig: NotificationValueDefinition & { type: "state" },
	) {
		const ccVersion = this.driver.getSupportedCCVersion(
			CommandClasses.Notification,
			this.nodeId,
			this.index,
		);
		if (ccVersion === 2 || !this.valueDB.hasMetadata(valueId)) {
			const metadata = getNotificationValueMetadata(
				this.valueDB.getMetadata(valueId) as
					| ValueMetadataNumeric
					| undefined,
				notificationConfig,
				valueConfig,
			);
			this.valueDB.setMetadata(valueId, metadata);
		}
	}

	/**
	 * Manually resets a single notification value to idle.
	 */
	public manuallyIdleNotificationValue(valueId: ValueID): void;

	public manuallyIdleNotificationValue(
		notificationType: number,
		prevValue: number,
		endpointIndex?: number,
	): void;

	public manuallyIdleNotificationValue(
		notificationTypeOrValueID: number | ValueID,
		prevValue?: number,
		endpointIndex: number = 0,
	): void {
		let notificationType: number | undefined;
		if (typeof notificationTypeOrValueID === "number") {
			notificationType = notificationTypeOrValueID;
		} else {
			notificationType = this.valueDB.getMetadata(
				notificationTypeOrValueID,
			)?.ccSpecific?.notificationType as number | undefined;
			if (notificationType === undefined) {
				return;
			}
			prevValue = this.valueDB.getValue(notificationTypeOrValueID);
			endpointIndex = notificationTypeOrValueID.endpoint ?? 0;
		}

		if (
			!this.getEndpoint(endpointIndex)?.supportsCC(
				CommandClasses.Notification,
			)
		) {
			return;
		}

		const notificationConfig =
			this.driver.configManager.lookupNotification(notificationType);
		if (!notificationConfig) return;

		return this.manuallyIdleNotificationValueInternal(
			notificationConfig,
			prevValue!,
			endpointIndex,
		);
	}

	/** Manually resets a single notification value to idle */
	private manuallyIdleNotificationValueInternal(
		notificationConfig: Notification,
		prevValue: number,
		endpointIndex: number,
	): void {
		const valueConfig = notificationConfig.lookupValue(prevValue);
		// Only known variables may be reset to idle
		if (!valueConfig || valueConfig.type !== "state") return;
		// Some properties may not be reset to idle
		if (!valueConfig.idle) return;

		const notificationName = notificationConfig.name;
		const variableName = valueConfig.variableName;
		const valueId = NotificationCCValues.notificationVariable(
			notificationName,
			variableName,
		).endpoint(endpointIndex);

		// Make sure the value is actually set to the previous value
		if (this.valueDB.getValue(valueId) !== prevValue) return;

		// Since the node has reset the notification itself, we don't need the idle reset
		this.clearNotificationIdleReset(valueId);
		this.extendNotificationValueMetadata(
			valueId,
			notificationConfig,
			valueConfig,
		);
		this.valueDB.setValue(valueId, 0 /* idle */);
	}

	/**
	 * Handles the receipt of a Notification Report
	 */
	private handleNotificationReport(command: NotificationCCReport): void {
		if (command.notificationType == undefined) {
			if (command.alarmType == undefined) {
				this.driver.controllerLog.logNode(this.id, {
					message: `received unsupported notification ${stringify(
						command,
					)}`,
					direction: "inbound",
				});
			}
			return;
		}

		// Look up the received notification in the config
		const notificationConfig = this.driver.configManager.lookupNotification(
			command.notificationType,
		);

		if (notificationConfig) {
			// This is a known notification (status or event)
			const notificationName = notificationConfig.name;

			this.driver.controllerLog.logNode(this.id, {
				message: `[handleNotificationReport] notificationName: ${notificationName}`,
				level: "silly",
			});

			/** Returns a single notification state to idle */
			const setStateIdle = (prevValue: number): void => {
				this.manuallyIdleNotificationValueInternal(
					notificationConfig,
					prevValue,
					command.endpointIndex,
				);
			};

			const value = command.notificationEvent!;
			if (value === 0) {
				// Generic idle notification, this contains a value to be reset
				if (
					Buffer.isBuffer(command.eventParameters) &&
					command.eventParameters.length
				) {
					// The target value is the first byte of the event parameters
					setStateIdle(command.eventParameters[0]);
				} else {
					// Reset all values to idle
					const nonIdleValues = this.valueDB
						.getValues(CommandClasses.Notification)
						.filter(
							(v) =>
								(v.endpoint || 0) === command.endpointIndex &&
								v.property === notificationName &&
								typeof v.value === "number" &&
								v.value !== 0,
						);
					for (const v of nonIdleValues) {
						setStateIdle(v.value as number);
					}
				}
				return;
			}

			// Find out which property we need to update
			const valueConfig = notificationConfig.lookupValue(value);

			if (valueConfig) {
				this.driver.controllerLog.logNode(this.id, {
					message: `[handleNotificationReport] valueConfig:
  label: ${valueConfig.label}
  ${
		valueConfig.type === "event"
			? "type: event"
			: `type: state
  variableName: ${valueConfig.variableName}`
  }`,
					level: "silly",
				});
			} else {
				this.driver.controllerLog.logNode(this.id, {
					message: `[handleNotificationReport] valueConfig: undefined`,
					level: "silly",
				});
			}

			// Perform some heuristics on the known notification
			this.handleKnownNotification(command);

			let allowIdleReset: boolean;
			if (!valueConfig) {
				// We don't know what this notification refers to, so we don't force a reset
				allowIdleReset = false;
			} else if (valueConfig.type === "state") {
				allowIdleReset = valueConfig.idle;
			} else {
				// This is an event
				this.emit("notification", this, CommandClasses.Notification, {
					type: command.notificationType,
					event: value,
					label: notificationConfig.name,
					eventLabel: valueConfig.label,
					parameters: command.eventParameters,
				});

				// We may need to reset some linked states to idle
				if (valueConfig.idleVariables?.length) {
					for (const variable of valueConfig.idleVariables) {
						setStateIdle(variable);
					}
				}
				return;
			}

			// Now that we've gathered all we need to know, update the value in our DB
			let valueId: ValueID;
			if (valueConfig) {
				valueId = NotificationCCValues.notificationVariable(
					notificationName,
					valueConfig.variableName,
				).endpoint(command.endpointIndex);

				this.extendNotificationValueMetadata(
					valueId,
					notificationConfig,
					valueConfig,
				);
			} else {
				// Collect unknown values in an "unknown" bucket
				const unknownValue =
					NotificationCCValues.unknownNotificationVariable(
						command.notificationType,
						notificationName,
					);
				valueId = unknownValue.endpoint(command.endpointIndex);

				if (command.version === 2) {
					if (!this.valueDB.hasMetadata(valueId)) {
						this.valueDB.setMetadata(valueId, unknownValue.meta);
					}
				}
			}
			if (typeof command.eventParameters === "number") {
				// This notification contains an enum value. We set "fake" values for these to distinguish them
				// from states without enum values
				const valueWithEnum = getNotificationStateValueWithEnum(
					value,
					command.eventParameters,
				);
				this.valueDB.setValue(valueId, valueWithEnum);
			} else {
				this.valueDB.setValue(valueId, value);
			}

			// Nodes before V8 (and some misbehaving V8 ones) don't necessarily reset the notification to idle.
			// The specifications advise to auto-reset the variables, but it has been found that this interferes
			// with some motion sensors that don't refresh their active notification. Therefore, we set a fallback
			// timer if the `forceNotificationIdleReset` compat flag is set.
			if (
				allowIdleReset &&
				!!this._deviceConfig?.compat?.forceNotificationIdleReset
			) {
				this.driver.controllerLog.logNode(this.id, {
					message: `[handleNotificationReport] scheduling idle reset`,
					level: "silly",
				});
				this.scheduleNotificationIdleReset(valueId, () =>
					setStateIdle(value),
				);
			}
		} else {
			// This is an unknown notification
			const valueId = NotificationCCValues.unknownNotificationType(
				command.notificationType,
			).endpoint(command.endpointIndex);

			this.valueDB.setValue(valueId, command.notificationEvent);
			// We don't know what this notification refers to, so we don't force a reset
		}
	}

	private handleKnownNotification(command: NotificationCCReport): void {
		const lockEvents = [0x01, 0x03, 0x05, 0x09];
		const unlockEvents = [0x02, 0x04, 0x06];
		const doorStatusEvents = [
			// Actual status
			0x16, 0x17,
			// Synthetic status with enum
			0x1600, 0x1601,
		];
		if (
			// Access Control, manual/keypad/rf/auto (un)lock operation
			command.notificationType === 0x06 &&
			(lockEvents.includes(command.notificationEvent as number) ||
				unlockEvents.includes(command.notificationEvent as number)) &&
			(this.supportsCC(CommandClasses["Door Lock"]) ||
				this.supportsCC(CommandClasses.Lock))
		) {
			// The Door Lock Command Class is constrained to the S2 Access Control key,
			// while the Notification Command Class, in the same device, could use a
			// different key. This way the device can notify devices which don't belong
			// to the S2 Access Control key group of changes in its state.

			const isLocked = lockEvents.includes(
				command.notificationEvent as number,
			);

			// Update the current lock status
			if (this.supportsCC(CommandClasses["Door Lock"])) {
				this.valueDB.setValue(
					DoorLockCCValues.currentMode.endpoint(
						command.endpointIndex,
					),
					isLocked ? DoorLockMode.Secured : DoorLockMode.Unsecured,
				);
			}
			if (this.supportsCC(CommandClasses.Lock)) {
				this.valueDB.setValue(
					LockCCValues.locked.endpoint(command.endpointIndex),
					isLocked,
				);
			}
		} else if (
			command.notificationType === 0x06 &&
			doorStatusEvents.includes(command.notificationEvent as number)
		) {
			// https://github.com/zwave-js/node-zwave-js/pull/5394 added support for
			// notification enums. Unfortunately, there's no way to discover which nodes
			// actually support them, which makes working with the Door state variable
			// very cumbersome. Also, this is currently the only notification where the enum values
			// extend the state value.
			// To work around this, we hard-code a notification value for the door status
			// which only includes the "legacy" states for open/closed.

			this.valueDB.setValue(
				NotificationCCValues.doorStateSimple.endpoint(
					command.endpointIndex,
				),
				command.notificationEvent === 0x17 ? 0x17 : 0x16,
			);
		}
	}

	private busySettingClock: boolean = false;
	private async handleClockReport(command: ClockCCReport): Promise<void> {
		if (this.busySettingClock) return;

		// A Z-Wave Plus node SHOULD issue a Clock Report Command via the Lifeline Association Group if they
		// suspect to have inaccurate time and/or weekdays (e.g. after battery removal).
		// A controlling node SHOULD compare the received time and weekday with its current time and set the
		// time again at the supporting node if a deviation is observed (e.g. different weekday or more than a
		// minute difference)

		// A sending node knowing the current time with seconds precision SHOULD round its
		// current time to the nearest minute when sending this command.
		let now = new Date();
		const seconds = now.getSeconds();
		if (seconds >= 30) {
			now = new Date(now.getTime() + (60 - seconds) * 1000);
		}

		// Get desired time in local time
		const hours = now.getHours();
		const minutes = now.getMinutes();
		// Sunday is 0 in JS, but 7 in Z-Wave
		let weekday = now.getDay();
		if (weekday === 0) weekday = 7;

		if (
			command.weekday !== weekday ||
			command.hour !== hours ||
			command.minute !== minutes
		) {
			const endpoint = this.driver.tryGetEndpoint(command);
			if (!endpoint /*|| !endpoint.commandClasses.Clock.isSupported()*/) {
				// Make sure the endpoint supports the CC (GH#1704)
				return;
			}

			this.driver.controllerLog.logNode(
				this.nodeId,
				`detected a deviation of the node's clock, updating it...`,
			);
			this.busySettingClock = true;
			try {
				await endpoint.commandClasses.Clock.set(
					hours,
					minutes,
					weekday,
				);
			} catch {
				// ignore
			}
			this.busySettingClock = false;
		}
	}

	private async handleTimeGet(command: TimeCCTimeGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();

		try {
			// We are being queried, so the device may actually not support the CC, just control it.
			// Using the commandClasses property would throw in that case
			const api = endpoint
				.createAPI(CommandClasses.Time, false)
				.withOptions({
					// Answer with the same encapsulation as asked, but omit
					// Supervision as it shouldn't be used for Get-Report flows
					encapsulationFlags:
						command.encapsulationFlags &
						~EncapsulationFlags.Supervision,
				});
			await api.reportTime(hours, minutes, seconds);
		} catch (e: any) {
			this.driver.controllerLog.logNode(this.nodeId, {
				message: e.message,
				level: "error",
			});
			// ignore
		}
	}

	private async handleDateGet(command: TimeCCDateGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const day = now.getDate();

		try {
			// We are being queried, so the device may actually not support the CC, just control it.
			// Using the commandClasses property would throw in that case
			const api = endpoint
				.createAPI(CommandClasses.Time, false)
				.withOptions({
					// Answer with the same encapsulation as asked, but omit
					// Supervision as it shouldn't be used for Get-Report flows
					encapsulationFlags:
						command.encapsulationFlags &
						~EncapsulationFlags.Supervision,
				});
			await api.reportDate(year, month, day);
		} catch (e: any) {
			this.driver.controllerLog.logNode(this.nodeId, {
				message: e.message,
				level: "error",
			});
			// ignore
		}
	}

	private async handleTimeOffsetGet(
		command: TimeCCTimeOffsetGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const timezone = getDSTInfo(new Date());

		try {
			// We are being queried, so the device may actually not support the CC, just control it.
			// Using the commandClasses property would throw in that case
			const api = endpoint
				.createAPI(CommandClasses.Time, false)
				.withOptions({
					// Answer with the same encapsulation as asked, but omit
					// Supervision as it shouldn't be used for Get-Report flows
					encapsulationFlags:
						command.encapsulationFlags &
						~EncapsulationFlags.Supervision,
				});
			await api.reportTimezone(timezone);
		} catch (e) {
			// ignore
		}
	}

	private _firmwareUpdateInProgress: boolean = false;
	/**
	 * Returns whether a firmware update is in progress for this node.
	 */
	public isFirmwareUpdateInProgress(): boolean {
		if (this.isControllerNode) {
			return this.driver.controller.isFirmwareUpdateInProgress();
		} else {
			return this._firmwareUpdateInProgress;
		}
	}

	private _abortFirmwareUpdate: (() => Promise<void>) | undefined;

	/** Is used to remember fragment requests that came in before they were able to be handled */
	private _firmwareUpdatePrematureRequest:
		| FirmwareUpdateMetaDataCCGet
		| undefined;

	/**
	 * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
	 * This method uses cached information from the most recent interview.
	 */
	public getFirmwareUpdateCapabilitiesCached(): FirmwareUpdateCapabilities {
		const firmwareUpgradable = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.firmwareUpgradable.id,
		);
		const supportsActivation = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.supportsActivation.id,
		);
		const continuesToFunction = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.continuesToFunction.id,
		);
		const additionalFirmwareIDs = this.getValue<number[]>(
			FirmwareUpdateMetaDataCCValues.additionalFirmwareIDs.id,
		);

		// Ensure all information was queried
		if (
			!firmwareUpgradable ||
			supportsActivation == undefined ||
			continuesToFunction == undefined ||
			!isArray(additionalFirmwareIDs)
		) {
			return { firmwareUpgradable: false };
		}

		return {
			firmwareUpgradable: true,
			firmwareTargets: distinct([0, ...additionalFirmwareIDs]),
			continuesToFunction,
			supportsActivation,
		};
	}

	/**
	 * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getFirmwareUpdateCapabilities(): Promise<FirmwareUpdateCapabilities> {
		const api = this.commandClasses["Firmware Update Meta Data"];
		const meta = await api.getMetaData();
		if (!meta) {
			throw new ZWaveError(
				`Failed to request firmware update capabilities: The node did not respond in time!`,
				ZWaveErrorCodes.Controller_NodeTimeout,
			);
		} else if (!meta.firmwareUpgradable) {
			return {
				firmwareUpgradable: false,
			};
		}

		return {
			firmwareUpgradable: true,
			firmwareTargets: [0, ...meta.additionalFirmwareIDs],
			continuesToFunction: meta.continuesToFunction,
			supportsActivation: meta.supportsActivation,
		};
	}

	/**
	 * Performs an OTA firmware upgrade of one or more chips on this node.
	 *
	 * This method will resolve after the process has **COMPLETED**. Failure to start any one of the provided updates will throw an error.
	 *
	 * **WARNING: Use at your own risk! We don't take any responsibility if your devices don't work after an update.**
	 *
	 * @param updates An array of firmware updates that will be done in sequence
	 *
	 * @returns Whether all of the given updates were successful.
	 */
	public async updateFirmware(
		updates: Firmware[],
	): Promise<FirmwareUpdateResult> {
		if (updates.length === 0) {
			throw new ZWaveError(
				`At least one update must be provided`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Check that each update has a buffer with at least 1 byte
		if (updates.some((u) => u.data.length === 0)) {
			throw new ZWaveError(
				`All firmware updates must have a non-empty data buffer`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Check that the targets are not duplicates
		if (
			distinct(updates.map((u) => u.firmwareTarget ?? 0)).length !==
			updates.length
		) {
			throw new ZWaveError(
				`The target of all provided firmware updates must be unique`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Don't start the process twice
		if (this.isFirmwareUpdateInProgress()) {
			throw new ZWaveError(
				`Failed to start the update: A firmware upgrade is already in progress!`,
				ZWaveErrorCodes.FirmwareUpdateCC_Busy,
			);
		}

		// Don't let two firmware updates happen in parallel
		if (this.driver.controller.isAnyOTAFirmwareUpdateInProgress()) {
			throw new ZWaveError(
				`Failed to start the update: A firmware update is already in progress on this network!`,
				ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy,
			);
		}
		this._firmwareUpdateInProgress = true;

		// Support aborting the update
		const abortContext: {
			abort: boolean;
			tooLateToAbort: boolean;
			abortPromise: DeferredPromise<boolean>;
		} = {
			abort: false,
			tooLateToAbort: false,
			abortPromise: createDeferredPromise<boolean>(),
		};

		this._abortFirmwareUpdate = async () => {
			if (abortContext.tooLateToAbort) {
				throw new ZWaveError(
					`The firmware update was transmitted completely, cannot abort anymore.`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort,
				);
			}

			this.driver.controllerLog.logNode(this.id, {
				message: `Aborting firmware update...`,
				direction: "outbound",
			});

			// Trigger the abort
			abortContext.abort = true;
			const aborted = await abortContext.abortPromise;
			if (!aborted) {
				throw new ZWaveError(
					`The node did not acknowledge the aborted update`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort,
				);
			}
			this.driver.controllerLog.logNode(this.id, {
				message: `Firmware update aborted`,
				direction: "inbound",
			});
		};

		// If the node isn't supposed to be kept awake yet, do it
		this.keepAwake = true;

		// Reset persisted state after the update
		const restore = (keepAwake: boolean) => {
			this.keepAwake = keepAwake;
			this._firmwareUpdateInProgress = false;
			this._abortFirmwareUpdate = undefined;
			this._firmwareUpdatePrematureRequest = undefined;
		};

		// Prepare the firmware update
		let fragmentSize: number;
		let meta: FirmwareUpdateMetaData;
		try {
			const prepareResult = await this.prepareFirmwareUpdateInternal(
				updates.map((u) => u.firmwareTarget ?? 0),
				abortContext,
			);

			// Handle early aborts
			if (abortContext.abort) {
				const result: FirmwareUpdateResult = {
					success: false,
					status: FirmwareUpdateStatus.Error_TransmissionFailed,
					reInterview: false,
				};
				this.emit("firmware update finished", this, result);
				restore(false);
				return result;
			}

			// If the firmware update was not aborted, prepareResult is definitely defined
			({ fragmentSize, ...meta } = prepareResult!);
		} catch {
			restore(false);
			// Not sure what the error is, but we'll label it "transmission failed"
			const result: FirmwareUpdateResult = {
				success: false,
				status: FirmwareUpdateStatus.Error_TransmissionFailed,
				reInterview: false,
			};

			return result;
		}

		// Perform all firmware updates in sequence
		let updateResult!: Awaited<
			ReturnType<ZWaveNode["doFirmwareUpdateInternal"]>
		>;
		let conservativeWaitTime: number;

		const totalFragments: number = updates.reduce(
			(total, update) =>
				total + Math.ceil(update.data.length / fragmentSize),
			0,
		);
		let sentFragmentsOfPreviousFiles = 0;

		for (let i = 0; i < updates.length; i++) {
			this.driver.controllerLog.logNode(
				this.id,
				`Updating firmware (part ${i + 1} / ${updates.length})...`,
			);

			const { firmwareTarget: target = 0, data } = updates[i];
			// Tell the node to start requesting fragments
			await this.beginFirmwareUpdateInternal(
				data,
				target,
				meta,
				fragmentSize,
			);

			// And handle them
			updateResult = await this.doFirmwareUpdateInternal(
				data,
				fragmentSize,
				abortContext,
				(fragment, total) => {
					const progress: FirmwareUpdateProgress = {
						currentFile: i + 1,
						totalFiles: updates.length,
						sentFragments: fragment,
						totalFragments: total,
						progress: roundTo(
							((sentFragmentsOfPreviousFiles + fragment) /
								totalFragments) *
								100,
							2,
						),
					};
					this.emit("firmware update progress", this, progress);

					// When this file is done, add the fragments to the total, so we can compute the total progress correctly
					if (fragment === total) {
						sentFragmentsOfPreviousFiles += fragment;
					}
				},
			);

			// If we wait, wait a bit longer than the device told us, so it is actually ready to use
			conservativeWaitTime =
				this.driver.getConservativeWaitTimeAfterFirmwareUpdate(
					updateResult.waitTime,
				);

			if (!updateResult.success) {
				this.driver.controllerLog.logNode(this.id, {
					message: `Firmware update (part ${i + 1} / ${
						updates.length
					}) failed with status ${getEnumMemberName(
						FirmwareUpdateStatus,
						updateResult.status,
					)}`,
					direction: "inbound",
				});

				const result: FirmwareUpdateResult = {
					...updateResult,
					waitTime: undefined,
					reInterview: false,
				};
				this.emit("firmware update finished", this, result);
				restore(false);
				return result;
			} else if (i < updates.length - 1) {
				// Update succeeded, but we're not done yet

				this.driver.controllerLog.logNode(this.id, {
					message: `Firmware update (part ${i + 1} / ${
						updates.length
					}) succeeded with status ${getEnumMemberName(
						FirmwareUpdateStatus,
						updateResult.status,
					)}`,
					direction: "inbound",
				});

				this.driver.controllerLog.logNode(
					this.id,
					`Continuing with next part in ${conservativeWaitTime} seconds...`,
				);
			}
		}

		const result: FirmwareUpdateResult = {
			...updateResult,
			waitTime: conservativeWaitTime!,
			reInterview: true,
		};

		this.emit("firmware update finished", this, result);

		restore(true);
		return result;
	}

	/** Prepares the firmware update of a single target by collecting the necessary information */
	private async prepareFirmwareUpdateInternal(
		targets: number[],
		abortContext: AbortFirmwareUpdateContext,
	): Promise<
		| undefined
		| (FirmwareUpdateMetaData & {
				fragmentSize: number;
		  })
	> {
		const api = this.commandClasses["Firmware Update Meta Data"];

		// ================================
		// STEP 1:
		// Check if this update is possible
		const meta = await api.getMetaData();
		if (!meta) {
			throw new ZWaveError(
				`Failed to start the update: The node did not respond in time!`,
				ZWaveErrorCodes.Controller_NodeTimeout,
			);
		}

		for (const target of targets) {
			if (target === 0) {
				if (!meta.firmwareUpgradable) {
					throw new ZWaveError(
						`Failed to start the update: The Z-Wave chip firmware is not upgradable!`,
						ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
					);
				}
			} else {
				if (api.version < 3) {
					throw new ZWaveError(
						`Failed to start the update: The node does not support upgrading a different firmware target than 0!`,
						ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
					);
				} else if (
					meta.additionalFirmwareIDs[target - 1] == undefined
				) {
					throw new ZWaveError(
						`Failed to start the update: Firmware target #${target} not found on this node!`,
						ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
					);
				}
			}
		}

		// ================================
		// STEP 2:
		// Determine the fragment size
		const fcc = new FirmwareUpdateMetaDataCC(this.driver, {
			nodeId: this.id,
		});
		const maxNetPayloadSize =
			this.driver.computeNetCCPayloadSize(fcc) -
			2 - // report number
			(fcc.version >= 2 ? 2 : 0); // checksum
		// Use the smallest allowed payload
		const fragmentSize = Math.min(
			maxNetPayloadSize,
			meta.maxFragmentSize ?? Number.POSITIVE_INFINITY,
		);

		if (abortContext.abort) {
			abortContext.abortPromise.resolve(true);
			return;
		} else {
			return { ...meta, fragmentSize };
		}
	}

	/** Kicks off a firmware update of a single target */
	private async beginFirmwareUpdateInternal(
		data: Buffer,
		target: number,
		meta: FirmwareUpdateMetaData,
		fragmentSize: number,
	): Promise<void> {
		const api = this.commandClasses["Firmware Update Meta Data"];

		// ================================
		// STEP 3:
		// Start the update
		this.driver.controllerLog.logNode(this.id, {
			message: `Starting firmware update...`,
			direction: "outbound",
		});

		// Request the node to start the upgrade
		// TODO: Should manufacturer id and firmware id be provided externally?
		const requestUpdateStatus = await api.requestUpdate({
			manufacturerId: meta.manufacturerId,
			firmwareId:
				target == 0
					? meta.firmwareId
					: meta.additionalFirmwareIDs[target - 1],
			firmwareTarget: target,
			fragmentSize,
			checksum: CRC16_CCITT(data),
		});
		switch (requestUpdateStatus) {
			case FirmwareUpdateRequestStatus.Error_AuthenticationExpected:
				throw new ZWaveError(
					`Failed to start the update: A manual authentication event (e.g. button push) was expected!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_BatteryLow:
				throw new ZWaveError(
					`Failed to start the update: The battery level is too low!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_FirmwareUpgradeInProgress:
				throw new ZWaveError(
					`Failed to start the update: A firmware upgrade is already in progress!`,
					ZWaveErrorCodes.FirmwareUpdateCC_Busy,
				);
			case FirmwareUpdateRequestStatus.Error_InvalidManufacturerOrFirmwareID:
				throw new ZWaveError(
					`Failed to start the update: Invalid manufacturer or firmware id!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_InvalidHardwareVersion:
				throw new ZWaveError(
					`Failed to start the update: Invalid hardware version!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_NotUpgradable:
				throw new ZWaveError(
					`Failed to start the update: Firmware target #${target} is not upgradable!`,
					ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
				);
			case FirmwareUpdateRequestStatus.Error_FragmentSizeTooLarge:
				throw new ZWaveError(
					`Failed to start the update: The chosen fragment size is too large!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.OK:
				// All good, we have started!
				// Keep the node awake until the update is done.
				this.keepAwake = true;
		}
	}

	/** Performs the firmware update of a single target */
	private async doFirmwareUpdateInternal(
		data: Buffer,
		fragmentSize: number,
		abortContext: AbortFirmwareUpdateContext,
		onProgress: (fragment: number, total: number) => void,
	): Promise<
		Pick<FirmwareUpdateResult, "status" | "waitTime"> & {
			success: boolean;
		}
	> {
		const numFragments = Math.ceil(data.length / fragmentSize);

		// Make sure we're not responding to an outdated request immediately
		this._firmwareUpdatePrematureRequest = undefined;

		// ================================
		// STEP 4:
		// Respond to fragment requests from the node
		update: while (true) {
			// During ongoing firmware updates, it can happen that the next request is received before the callback for the previous response
			// is back. In that case we can immediately handle the premature request. Otherwise wait for the next request.
			const fragmentRequest =
				this._firmwareUpdatePrematureRequest ??
				(await this.driver
					.waitForCommand<FirmwareUpdateMetaDataCCGet>(
						(cc) =>
							cc.nodeId === this.nodeId &&
							cc instanceof FirmwareUpdateMetaDataCCGet,
						// Wait up to 2 minutes for each fragment request.
						// Some users try to update devices with unstable connections, where 30s can be too short.
						timespan.minutes(2),
					)
					.catch(() => undefined));
			this._firmwareUpdatePrematureRequest = undefined;

			if (!fragmentRequest) {
				// In some cases it can happen that the device stops requesting update frames
				// We need to timeout the update in this case so it can be restarted

				this.driver.controllerLog.logNode(this.id, {
					message: `Firmware update timed out`,
					direction: "none",
					level: "warn",
				});

				return {
					success: false,
					status: FirmwareUpdateStatus.Error_Timeout,
				};
			}
			// When a node requests a firmware update fragment, it must be awake
			try {
				this.markAsAwake();
			} catch {
				/* ignore */
			}

			if (fragmentRequest.reportNumber > numFragments) {
				this.driver.controllerLog.logNode(this.id, {
					message: `Received Firmware Update Get for an out-of-bounds fragment. Forcing the node to abort...`,
					direction: "inbound",
				});
				await this.sendCorruptedFirmwareUpdateReport(
					fragmentRequest.reportNumber,
					randomBytes(fragmentSize),
				);
				// This will cause the node to abort the process, wait for that
				break update;
			}

			// Actually send the requested frames
			request: for (
				let num = fragmentRequest.reportNumber;
				num < fragmentRequest.reportNumber + fragmentRequest.numReports;
				num++
			) {
				// Check if the node requested more fragments than are left
				if (num > numFragments) {
					break;
				}
				const fragment = data.slice(
					(num - 1) * fragmentSize,
					num * fragmentSize,
				);

				if (abortContext.abort) {
					await this.sendCorruptedFirmwareUpdateReport(
						fragmentRequest.reportNumber,
						randomBytes(fragment.length),
					);
					// This will cause the node to abort the process, wait for that
					break update;
				} else {
					// Avoid queuing duplicate fragments
					if (this.hasPendingFirmwareUpdateFragment(num)) {
						this.driver.controllerLog.logNode(this.id, {
							message: `Firmware fragment ${num} already queued`,
							level: "warn",
						});
						continue request;
					}

					this.driver.controllerLog.logNode(this.id, {
						message: `Sending firmware fragment ${num} / ${numFragments}`,
						direction: "outbound",
					});
					const isLast = num === numFragments;

					try {
						await this.commandClasses[
							"Firmware Update Meta Data"
						].sendFirmwareFragment(num, isLast, fragment);

						onProgress(num, numFragments);

						// If that was the last one wait for status report from the node and restart interview
						if (isLast) {
							abortContext.tooLateToAbort = true;
							break update;
						}
					} catch {
						// When transmitting fails, simply stop responding to this request and wait for the node to re-request the fragment
						this.driver.controllerLog.logNode(this.id, {
							message: `Failed to send firmware fragment ${num} / ${numFragments}`,
							direction: "outbound",
							level: "warn",
						});
						break request;
					}
				}
			}
		}

		// ================================
		// STEP 5:
		// Finalize the update process

		const statusReport = await this.driver
			.waitForCommand<FirmwareUpdateMetaDataCCStatusReport>(
				(cc) =>
					cc.nodeId === this.nodeId &&
					cc instanceof FirmwareUpdateMetaDataCCStatusReport,
				// Wait up to 5 minutes. It should never take that long, but the specs
				// don't say anything specific
				5 * 60000,
			)
			.catch(() => undefined);

		if (abortContext.abort) {
			abortContext.abortPromise.resolve(
				statusReport?.status ===
					FirmwareUpdateStatus.Error_TransmissionFailed,
			);
		}

		if (!statusReport) {
			this.driver.controllerLog.logNode(
				this.id,
				`The node did not acknowledge the completed update`,
				"warn",
			);

			return {
				success: false,
				status: FirmwareUpdateStatus.Error_Timeout,
			};
		}

		const { status, waitTime } = statusReport;

		// Actually, OK_WaitingForActivation should never happen since we don't allow
		// delayed activation in the RequestGet command
		const success = status >= FirmwareUpdateStatus.OK_WaitingForActivation;

		return {
			success,
			status,
			waitTime,
		};
	}

	/**
	 * Aborts an active firmware update process
	 */
	public async abortFirmwareUpdate(): Promise<void> {
		if (!this._abortFirmwareUpdate) return;
		await this._abortFirmwareUpdate();
	}

	private async sendCorruptedFirmwareUpdateReport(
		reportNum: number,
		fragment: Buffer,
	): Promise<void> {
		try {
			await this.commandClasses[
				"Firmware Update Meta Data"
			].sendFirmwareFragment(reportNum, true, fragment);
		} catch {
			// ignore
		}
	}

	private hasPendingFirmwareUpdateFragment(fragmentNumber: number): boolean {
		// Avoid queuing duplicate fragments
		const isCurrentFirmwareFragment = (t: Transaction) =>
			t.message.getNodeId() === this.nodeId &&
			isCommandClassContainer(t.message) &&
			t.message.command instanceof FirmwareUpdateMetaDataCCReport &&
			t.message.command.reportNumber === fragmentNumber;

		return this.driver.hasPendingTransactions(isCurrentFirmwareFragment);
	}

	private async handleUnexpectedFirmwareUpdateGet(
		command: FirmwareUpdateMetaDataCCGet,
	): Promise<void> {
		// This method will only be called under two circumstances:
		// 1. The node is currently busy responding to a firmware update request -> remember the request
		if (this.isFirmwareUpdateInProgress()) {
			this._firmwareUpdatePrematureRequest = command;
			return;
		}

		// 2. No firmware update is in progress -> abort
		this.driver.controllerLog.logNode(this.id, {
			message: `Received Firmware Update Get, but no firmware update is in progress. Forcing the node to abort...`,
			direction: "inbound",
		});

		// Since no update is in progress, we need to determine the fragment size again
		const fcc = new FirmwareUpdateMetaDataCC(this.driver, {
			nodeId: this.id,
		});
		const fragmentSize =
			this.driver.computeNetCCPayloadSize(fcc) -
			2 - // report number
			(fcc.version >= 2 ? 2 : 0); // checksum
		const fragment = randomBytes(fragmentSize);
		try {
			await this.sendCorruptedFirmwareUpdateReport(
				command.reportNumber,
				fragment,
			);
		} catch {
			// ignore
		}
	}

	private recentEntryControlNotificationSequenceNumbers: number[] = [];
	private handleEntryControlNotification(
		command: EntryControlCCNotification,
	): void {
		if (
			!this._deviceConfig?.compat?.disableStrictEntryControlDataValidation
		) {
			if (
				this.recentEntryControlNotificationSequenceNumbers.includes(
					command.sequenceNumber,
				)
			) {
				this.driver.controllerLog.logNode(
					this.id,
					`Received duplicate Entry Control Notification (sequence number ${command.sequenceNumber}), ignoring...`,
					"warn",
				);
				return;
			}

			// Keep track of the last 5 sequence numbers
			this.recentEntryControlNotificationSequenceNumbers.unshift(
				command.sequenceNumber,
			);
			if (this.recentEntryControlNotificationSequenceNumbers.length > 5) {
				this.recentEntryControlNotificationSequenceNumbers.pop();
			}
		}

		// Notify listeners
		this.emit("notification", this, CommandClasses["Entry Control"], {
			...pick(command, ["eventType", "dataType", "eventData"]),
			eventTypeLabel: entryControlEventTypeLabels[command.eventType],
			dataTypeLabel: getEnumMemberName(
				EntryControlDataTypes,
				command.dataType,
			),
		});
	}

	private handlePowerlevelTestNodeReport(
		command: PowerlevelCCTestNodeReport,
	): void {
		// Notify listeners
		this.emit(
			"notification",
			this,
			CommandClasses.Powerlevel,
			pick(command, ["testNodeId", "status", "acknowledgedFrames"]),
		);
	}

	/**
	 * @internal
	 * Deserializes the information of this node from a cache.
	 */
	public async deserialize(): Promise<void> {
		if (!this.driver.networkCache) return;

		// Restore the device config
		await this.loadDeviceConfig();

		// Remove the Basic CC if it should be hidden
		// TODO: Do this as part of loadDeviceConfig
		const compat = this._deviceConfig?.compat;
		if (!compat?.disableBasicMapping && !compat?.treatBasicSetAsEvent) {
			for (const endpoint of this.getAllEndpoints()) {
				endpoint.hideBasicCCInFavorOfActuatorCCs();
			}
		}

		// Mark already-interviewed nodes as potentially ready
		if (this.interviewStage === InterviewStage.Complete) {
			this.readyMachine.send("RESTART_FROM_CACHE");
		}
	}

	/**
	 * Whether the node should be kept awake when there are no pending messages.
	 */
	public keepAwake: boolean = false;

	private isSendingNoMoreInformation: boolean = false;
	/**
	 * @internal
	 * Sends the node a WakeUpCCNoMoreInformation so it can go back to sleep
	 */
	public async sendNoMoreInformation(): Promise<boolean> {
		// Don't send the node back to sleep if it should be kept awake
		if (this.keepAwake) return false;

		// Avoid calling this method more than once
		if (this.isSendingNoMoreInformation) return false;
		this.isSendingNoMoreInformation = true;

		let msgSent = false;
		if (
			this.status === NodeStatus.Awake &&
			this.interviewStage === InterviewStage.Complete
		) {
			this.driver.controllerLog.logNode(this.id, {
				message: "Sending node back to sleep...",
				direction: "outbound",
			});
			try {
				// it is important that we catch errors in this call
				// otherwise, this method will not work anymore because
				// isSendingNoMoreInformation is stuck on `true`
				await this.commandClasses["Wake Up"].sendNoMoreInformation();
				msgSent = true;
			} catch {
				/* ignore */
			} finally {
				this.markAsAsleep();
			}
		}

		this.isSendingNoMoreInformation = false;
		return msgSent;
	}

	/**
	 * Instructs the node to send powerlevel test frames to the other node using the given powerlevel. Returns how many frames were acknowledged during the test.
	 *
	 * **Note:** Depending on the number of test frames, this may take a while
	 */
	public async testPowerlevel(
		testNodeId: number,
		powerlevel: Powerlevel,
		healthCheckTestFrameCount: number,
		onProgress?: (acknowledged: number, total: number) => void,
	): Promise<number> {
		const api = this.commandClasses.Powerlevel;

		// Keep sleeping nodes awake
		const wasKeptAwake = this.keepAwake;
		if (this.canSleep) this.keepAwake = true;
		const result = <T>(value: T) => {
			// And undo the change when we're done
			this.keepAwake = wasKeptAwake;
			return value;
		};

		// Start the process
		await api.startNodeTest(
			testNodeId,
			powerlevel,
			healthCheckTestFrameCount,
		);

		// Each frame will take a few ms to be sent, let's assume 5 per second
		// to estimate how long the test will take
		const expectedDurationMs = Math.round(
			(healthCheckTestFrameCount / 5) * 1000,
		);

		// Poll the status of the test regularly, but not too frequently. Especially for quick tests, polling too often
		// increases the likelyhood of us querying the node at the same time it sends an unsolicited update.
		// If using Security S2, this can cause a desync.
		const pollFrequencyMs = expectedDurationMs >= 60000 ? 20000 : 5000;

		// Track how often we failed to get a response from the node, so we can abort if the connection is too bad
		let continuousErrors = 0;
		// Also track how many times in a row there was no progress, which also indicates a bad connection
		let previousProgress = 0;
		while (true) {
			// The node might send an unsolicited update when it finishes the test
			const report = await this.driver
				.waitForCommand<PowerlevelCCTestNodeReport>(
					(cc) =>
						cc.nodeId === this.id &&
						cc instanceof PowerlevelCCTestNodeReport,
					pollFrequencyMs,
				)
				.catch(() => undefined);

			const status = report
				? pick(report, ["status", "acknowledgedFrames"])
				: // If it didn't come in the wait time, poll for an update
				  await api.getNodeTestStatus().catch(() => undefined);

			// Safeguard against infinite loop:
			// If we didn't get a result, or there was no progress, try again next iteration
			if (
				!status ||
				(status.status === PowerlevelTestStatus["In Progress"] &&
					status.acknowledgedFrames === previousProgress)
			) {
				if (continuousErrors > 5) return result(0);
				continuousErrors++;
				continue;
			} else {
				previousProgress = status.acknowledgedFrames;
				continuousErrors = 0;
			}

			if (status.status === PowerlevelTestStatus.Failed) {
				return result(0);
			} else if (status.status === PowerlevelTestStatus.Success) {
				return result(status.acknowledgedFrames);
			} else if (onProgress) {
				// Notify the caller of the test progress
				onProgress(
					status.acknowledgedFrames,
					healthCheckTestFrameCount,
				);
			}
		}
	}

	private _healthCheckInProgress: boolean = false;
	/**
	 * Returns whether a health check is currently in progress for this node
	 */
	public isHealthCheckInProgress(): boolean {
		return this._healthCheckInProgress;
	}

	private _healthCheckAborted: boolean = false;
	private _abortHealthCheckPromise: DeferredPromise<void> | undefined;

	/**
	 * Aborts an ongoing health check if one is currently in progress.
	 *
	 * **Note:** The health check may take a few seconds to actually be aborted.
	 * When it is, the promise returned by {@link checkLifelineHealth} or
	 * {@link checkRouteHealth} will be resolved with the results obtained so far.
	 */
	public abortHealthCheck(): void {
		this._healthCheckAborted = true;
		this._abortHealthCheckPromise?.resolve();
	}

	/**
	 * Checks the health of connection between the controller and this node and returns the results.
	 */
	public async checkLifelineHealth(
		rounds: number = 5,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: LifelineHealthCheckResult,
		) => void,
	): Promise<LifelineHealthCheckSummary> {
		if (this._healthCheckInProgress) {
			throw new ZWaveError(
				"A health check is already in progress for this node!",
				ZWaveErrorCodes.HealthCheck_Busy,
			);
		}

		if (rounds > 10 || rounds < 1) {
			throw new ZWaveError(
				"The number of health check rounds must be between 1 and 10!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		try {
			this._healthCheckInProgress = true;
			this._abortHealthCheckPromise = createDeferredPromise();

			return await this.checkLifelineHealthInternal(rounds, onProgress);
		} finally {
			this._healthCheckInProgress = false;
			this._healthCheckAborted = false;
			this._abortHealthCheckPromise = undefined;
		}
	}

	private async checkLifelineHealthInternal(
		rounds: number,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: LifelineHealthCheckResult,
		) => void,
	): Promise<LifelineHealthCheckSummary> {
		// No. of pings per round
		const start = Date.now();

		/** Computes a health rating from a health check result */
		const computeRating = (result: LifelineHealthCheckResult) => {
			const failedPings = Math.max(
				result.failedPingsController ?? 0,
				result.failedPingsNode,
			);
			const numNeighbors = result.numNeighbors;
			const minPowerlevel = result.minPowerlevel ?? Powerlevel["-6 dBm"];
			const snrMargin = result.snrMargin ?? 17;
			const latency = result.latency;

			if (failedPings === 10) return 0;
			if (failedPings > 2) return 1;
			if (failedPings === 2 || latency > 1000) return 2;
			if (failedPings === 1 || latency > 500) return 3;
			if (latency > 250) return 4;
			if (latency > 100) return 5;
			if (minPowerlevel < Powerlevel["-6 dBm"] || snrMargin < 17) {
				// Lower powerlevel reductions (= higher power) have lower numeric values
				return numNeighbors > 2 ? 7 : 6;
			}
			if (numNeighbors <= 2) return 8;
			if (latency > 50) return 9;
			return 10;
		};

		this.driver.controllerLog.logNode(
			this.id,
			`Starting lifeline health check (${rounds} round${
				rounds !== 1 ? "s" : ""
			})...`,
		);

		const results: LifelineHealthCheckResult[] = [];
		const aborted = () => {
			this.driver.controllerLog.logNode(
				this.id,
				`Lifeline health check aborted`,
			);
			if (results.length === 0) {
				return {
					rating: 0,
					results: [],
				};
			} else {
				return {
					rating: Math.min(...results.map((r) => r.rating)),
					results,
				};
			}
		};

		if (this.canSleep && this.status !== NodeStatus.Awake) {
			// Wait for node to wake up to avoid incorrectly long delays in the first health check round
			this.driver.controllerLog.logNode(
				this.id,
				`waiting for node to wake up...`,
			);
			await Promise.race([
				this.waitForWakeup(),
				this._abortHealthCheckPromise,
			]);
			if (this._healthCheckAborted) return aborted();
		}

		for (let round = 1; round <= rounds; round++) {
			if (this._healthCheckAborted) return aborted();

			// Determine the number of repeating neighbors
			const numNeighbors = (
				await this.driver.controller.getNodeNeighbors(this.nodeId, true)
			).length;

			// Ping the node 10x, measuring the RSSI
			let txReport: TXReport | undefined;
			let routeChanges: number | undefined;
			let rssi: RSSI | undefined;
			let channel: number | undefined;
			let snrMargin: number | undefined;
			let failedPingsNode = 0;
			let latency = 0;
			const pingAPI = this.commandClasses["No Operation"].withOptions({
				onTXReport: (report) => {
					txReport = report;
				},
			});

			for (let i = 1; i <= healthCheckTestFrameCount; i++) {
				if (this._healthCheckAborted) return aborted();

				const start = Date.now();
				// Reset TX report before each ping
				txReport = undefined as any;
				const pingResult = await pingAPI.send().then(
					() => true,
					() => false,
				);
				const rtt = Date.now() - start;
				latency = Math.max(
					latency,
					txReport ? txReport.txTicks * 10 : rtt,
				);
				if (!pingResult) {
					failedPingsNode++;
				} else if (txReport) {
					routeChanges ??= 0;
					if (txReport.routingAttempts > 1) {
						routeChanges++;
					}
					rssi = txReport.ackRSSI;
					channel = txReport.ackChannelNo;
				}
			}

			// If possible, compute the SNR margin from the test results
			if (
				rssi != undefined &&
				rssi < RssiError.NoSignalDetected &&
				channel != undefined
			) {
				const backgroundRSSI =
					await this.driver.controller.getBackgroundRSSI();
				if (`rssiChannel${channel}` in backgroundRSSI) {
					const bgRSSI = (backgroundRSSI as any)[
						`rssiChannel${channel}`
					];
					if (isRssiError(bgRSSI)) {
						if (bgRSSI === RssiError.ReceiverSaturated) {
							// RSSI is too high to measure, so there can't be any margin left
							snrMargin = 0;
						} else if (bgRSSI === RssiError.NoSignalDetected) {
							// It is very quiet, assume -128 dBm
							snrMargin = rssi + 128;
						} else {
							snrMargin = undefined;
						}
					} else {
						snrMargin = rssi - bgRSSI;
					}
				}
			}

			const ret: LifelineHealthCheckResult = {
				latency,
				failedPingsNode,
				numNeighbors,
				routeChanges,
				snrMargin,
				rating: 0,
			};

			// Now instruct the node to ping the controller, figuring out the minimum powerlevel
			if (this.supportsCC(CommandClasses.Powerlevel)) {
				// Do a binary search and find the highest reduction in powerlevel for which there are no errors
				let failedPingsController = 0;

				const executor = async (powerlevel: Powerlevel) => {
					// Abort the search if the health check was aborted
					if (this._healthCheckAborted) return undefined;

					this.driver.controllerLog.logNode(
						this.id,
						`Sending ${healthCheckTestFrameCount} pings to controller at ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}...`,
					);
					const result = await this.testPowerlevel(
						this.driver.controller.ownNodeId!,
						powerlevel,
						healthCheckTestFrameCount,
					);
					failedPingsController = healthCheckTestFrameCount - result;
					this.driver.controllerLog.logNode(
						this.id,
						`At ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}, ${result}/${healthCheckTestFrameCount} pings were acknowledged...`,
					);

					// Wait a second for things to settle down
					await wait(1000);

					return failedPingsController === 0;
				};
				try {
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor,
					);
					if (this._healthCheckAborted) return aborted();

					if (powerlevel == undefined) {
						// There were still failures at normal power, report it
						ret.minPowerlevel = Powerlevel["Normal Power"];
						ret.failedPingsController = failedPingsController;
					} else {
						ret.minPowerlevel = powerlevel;
					}
				} catch (e) {
					if (
						isZWaveError(e) &&
						e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The node is dead, treat this as a failure
						ret.minPowerlevel = Powerlevel["Normal Power"];
						ret.failedPingsController = healthCheckTestFrameCount;
					} else {
						throw e;
					}
				}
			}

			ret.rating = computeRating(ret);
			results.push(ret);
			onProgress?.(round, rounds, ret.rating, { ...ret });
		}

		const duration = Date.now() - start;

		const rating = Math.min(...results.map((r) => r.rating));
		const summary = { results, rating };
		this.driver.controllerLog.logNode(
			this.id,
			`Lifeline health check complete in ${duration} ms
${formatLifelineHealthCheckSummary(summary)}`,
		);

		return summary;
	}

	/**
	 * Checks the health of connection between this node and the target node and returns the results.
	 */
	public async checkRouteHealth(
		targetNodeId: number,
		rounds: number = 5,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: RouteHealthCheckResult,
		) => void,
	): Promise<RouteHealthCheckSummary> {
		if (this._healthCheckInProgress) {
			throw new ZWaveError(
				"A health check is already in progress for this node!",
				ZWaveErrorCodes.HealthCheck_Busy,
			);
		}

		if (rounds > 10 || rounds < 1) {
			throw new ZWaveError(
				"The number of health check rounds must be between 1 and 10!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		try {
			this._healthCheckInProgress = true;
			this._abortHealthCheckPromise = createDeferredPromise();

			return await this.checkRouteHealthInternal(
				targetNodeId,
				rounds,
				onProgress,
			);
		} finally {
			this._healthCheckInProgress = false;
			this._healthCheckAborted = false;
			this._abortHealthCheckPromise = undefined;
		}
	}

	private async checkRouteHealthInternal(
		targetNodeId: number,
		rounds: number,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: RouteHealthCheckResult,
		) => void,
	): Promise<RouteHealthCheckSummary> {
		const otherNode = this.driver.controller.nodes.getOrThrow(targetNodeId);
		if (otherNode.canSleep) {
			throw new ZWaveError(
				"Nodes which can sleep are not a valid target for a route health check!",
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (
			this.canSleep &&
			!this.supportsCC(CommandClasses.Powerlevel)
		) {
			throw new ZWaveError(
				"For a route health check, nodes which can sleep must support Powerlevel CC!",
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (
			!this.supportsCC(CommandClasses.Powerlevel) &&
			!otherNode.supportsCC(CommandClasses.Powerlevel)
		) {
			throw new ZWaveError(
				"For a route health check, at least one of the nodes must support Powerlevel CC!",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// No. of pings per round
		const healthCheckTestFrameCount = 10;
		const start = Date.now();

		/** Computes a health rating from a health check result */
		const computeRating = (result: RouteHealthCheckResult) => {
			const failedPings = Math.max(
				result.failedPingsToSource ?? 0,
				result.failedPingsToTarget ?? 0,
			);
			const numNeighbors = result.numNeighbors;
			const minPowerlevel = Math.max(
				result.minPowerlevelSource ?? Powerlevel["-6 dBm"],
				result.minPowerlevelTarget ?? Powerlevel["-6 dBm"],
			);

			if (failedPings === 10) return 0;
			if (failedPings > 2) return 1;
			if (failedPings === 2) return 2;
			if (failedPings === 1) return 3;
			if (minPowerlevel < Powerlevel["-6 dBm"]) {
				// Lower powerlevel reductions (= higher power) have lower numeric values
				return numNeighbors > 2 ? 7 : 6;
			}
			if (numNeighbors <= 2) return 8;
			return 10;
		};

		this.driver.controllerLog.logNode(
			this.id,
			`Starting route health check to node ${targetNodeId} (${rounds} round${
				rounds !== 1 ? "s" : ""
			})...`,
		);

		const results: RouteHealthCheckResult[] = [];
		const aborted = () => {
			this.driver.controllerLog.logNode(
				this.id,
				`Route health check to node ${targetNodeId} aborted`,
			);
			if (results.length === 0) {
				return {
					rating: 0,
					results: [],
				};
			} else {
				return {
					rating: Math.min(...results.map((r) => r.rating)),
					results,
				};
			}
		};

		if (this.canSleep && this.status !== NodeStatus.Awake) {
			// Wait for node to wake up to avoid incorrectly long delays in the first health check round
			this.driver.controllerLog.logNode(
				this.id,
				`waiting for node to wake up...`,
			);
			await Promise.race([
				this.waitForWakeup(),
				this._abortHealthCheckPromise,
			]);
			if (this._healthCheckAborted) return aborted();
		}

		for (let round = 1; round <= rounds; round++) {
			if (this._healthCheckAborted) return aborted();

			// Determine the minimum number of repeating neighbors between the
			// source and target node
			const numNeighbors = Math.min(
				(
					await this.driver.controller.getNodeNeighbors(
						this.nodeId,
						true,
					)
				).length,
				(
					await this.driver.controller.getNodeNeighbors(
						targetNodeId,
						true,
					)
				).length,
			);

			let failedPings = 0;
			let failedPingsToSource: number | undefined;
			let minPowerlevelSource: Powerlevel | undefined;
			let failedPingsToTarget: number | undefined;
			let minPowerlevelTarget: Powerlevel | undefined;
			const executor =
				(node: ZWaveNode, otherNode: ZWaveNode) =>
				async (powerlevel: Powerlevel) => {
					// Abort the search if the health check was aborted
					if (this._healthCheckAborted) return undefined;

					this.driver.controllerLog.logNode(
						node.id,
						`Sending ${healthCheckTestFrameCount} pings to node ${
							otherNode.id
						} at ${getEnumMemberName(Powerlevel, powerlevel)}...`,
					);
					const result = await node.testPowerlevel(
						otherNode.id,
						powerlevel,
						healthCheckTestFrameCount,
					);
					failedPings = healthCheckTestFrameCount - result;
					this.driver.controllerLog.logNode(
						node.id,
						`At ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}, ${result}/${healthCheckTestFrameCount} pings were acknowledged by node ${
							otherNode.id
						}...`,
					);

					// Wait a second for things to settle down
					await wait(1000);

					return failedPings === 0;
				};

			// Now instruct this node to ping the other one, figuring out the minimum powerlevel
			if (this.supportsCC(CommandClasses.Powerlevel)) {
				try {
					// We have to start with the maximum powerlevel and work our way down
					// Otherwise some nodes get stuck trying to complete the check at a bad powerlevel
					// causing the following measurements to fail.
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor(this, otherNode),
					);
					if (this._healthCheckAborted) return aborted();

					if (powerlevel == undefined) {
						// There were still failures at normal power, report it
						minPowerlevelSource = Powerlevel["Normal Power"];
						failedPingsToTarget = failedPings;
					} else {
						minPowerlevelSource = powerlevel;
						failedPingsToTarget = 0;
					}
				} catch (e) {
					if (
						isZWaveError(e) &&
						e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The node is dead, treat this as a failure
						minPowerlevelSource = Powerlevel["Normal Power"];
						failedPingsToTarget = healthCheckTestFrameCount;
					} else {
						throw e;
					}
				}
			}

			if (this._healthCheckAborted) return aborted();

			// And do the same with the other node - unless the current node is a sleeping node, then this doesn't make sense
			if (
				!this.canSleep &&
				otherNode.supportsCC(CommandClasses.Powerlevel)
			) {
				try {
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor(otherNode, this),
					);
					if (powerlevel == undefined) {
						// There were still failures at normal power, report it
						minPowerlevelTarget = Powerlevel["Normal Power"];
						failedPingsToSource = failedPings;
					} else {
						minPowerlevelTarget = powerlevel;
						failedPingsToSource = 0;
					}
				} catch (e) {
					if (
						isZWaveError(e) &&
						e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The node is dead, treat this as a failure
						minPowerlevelTarget = Powerlevel["Normal Power"];
						failedPingsToSource = healthCheckTestFrameCount;
					} else {
						throw e;
					}
				}
			}

			const ret: RouteHealthCheckResult = {
				numNeighbors,
				failedPingsToSource,
				failedPingsToTarget,
				minPowerlevelSource,
				minPowerlevelTarget,
				rating: 0,
			};
			ret.rating = computeRating(ret);
			results.push(ret);
			onProgress?.(round, rounds, ret.rating, { ...ret });
		}

		const duration = Date.now() - start;

		const rating = Math.min(...results.map((r) => r.rating));
		const summary = { results, rating };
		this.driver.controllerLog.logNode(
			this.id,
			`Route health check to node ${
				otherNode.id
			} complete in ${duration} ms
${formatRouteHealthCheckSummary(this.id, otherNode.id, summary)}`,
		);

		return summary;
	}

	/**
	 * Updates the average RTT of this node
	 * @internal
	 */
	public updateRTT(sentMessage: Message): void {
		if (sentMessage.rtt) {
			const rttMs = sentMessage.rtt / 1e6;
			this.updateStatistics((current) => ({
				...current,
				rtt:
					current.rtt != undefined
						? roundTo(current.rtt * 0.75 + rttMs * 0.25, 1)
						: roundTo(rttMs, 1),
			}));
		}
	}

	/**
	 * Updates route/transmission statistics for this node
	 * @internal
	 */
	public updateRouteStatistics(txReport: TXReport): void {
		this.updateStatistics((current) => {
			const ret = { ...current };
			// Update ACK RSSI
			if (txReport.ackRSSI != undefined) {
				ret.rssi =
					ret.rssi == undefined || isRssiError(txReport.ackRSSI)
						? txReport.ackRSSI
						: Math.round(ret.rssi * 0.75 + txReport.ackRSSI * 0.25);
			}

			// Update the LWR's statistics
			const newStats: RouteStatistics = {
				protocolDataRate: txReport.routeSpeed,
				repeaters: (txReport.repeaterNodeIds ?? []) as number[],
				rssi:
					txReport.ackRSSI ?? ret.lwr?.rssi ?? RssiError.NotAvailable,
			};
			if (txReport.ackRepeaterRSSI != undefined) {
				newStats.repeaterRSSI = txReport.ackRepeaterRSSI as number[];
			}
			if (
				txReport.failedRouteLastFunctionalNodeId &&
				txReport.failedRouteFirstNonFunctionalNodeId
			) {
				newStats.routeFailedBetween = [
					txReport.failedRouteLastFunctionalNodeId,
					txReport.failedRouteFirstNonFunctionalNodeId,
				];
			}

			if (ret.lwr && !routeStatisticsEquals(ret.lwr, newStats)) {
				// The old LWR becomes the NLWR
				ret.nlwr = ret.lwr;
			}
			ret.lwr = newStats;
			return ret;
		});
	}

	/**
	 * Sets the current date, time and timezone (or a subset of those) on the node using one or more of the respective CCs.
	 * Returns whether the operation was successful.
	 */
	public async setDateAndTime(now: Date = new Date()): Promise<boolean> {
		// There are multiple ways to communicate the current time to a node:
		// 1. Time Parameters CC
		// 2. Clock CC
		// 3. Time CC, but only in response to requests from the node
		const timeParametersAPI = this.commandClasses["Time Parameters"];
		const timeAPI = this.commandClasses.Time;
		const clockAPI = this.commandClasses.Clock;
		const scheduleEntryLockAPI = this.commandClasses["Schedule Entry Lock"];

		if (
			timeParametersAPI.isSupported() &&
			timeParametersAPI.supportsCommand(TimeParametersCommand.Set)
		) {
			try {
				const result = await timeParametersAPI.set(now);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		} else if (
			clockAPI.isSupported() &&
			clockAPI.supportsCommand(ClockCommand.Set)
		) {
			try {
				// Get desired time in local time
				const hours = now.getHours();
				const minutes = now.getMinutes();
				// Sunday is 0 in JS, but 7 in Z-Wave
				let weekday = now.getDay();
				if (weekday === 0) weekday = 7;

				const result = await clockAPI.set(hours, minutes, weekday);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		} else if (
			timeAPI.isSupported() &&
			timeAPI.supportsCommand(TimeCommand.DateReport) &&
			timeAPI.supportsCommand(TimeCommand.TimeReport)
		) {
			// According to https://github.com/zwave-js/node-zwave-js/issues/6032#issuecomment-1641945555
			// some devices update their date and time when they receive an unsolicited Time CC report.
			// Even if this isn't intended, we should at least try.

			const api = timeAPI.withOptions({
				useSupervision: false,
			});
			try {
				// First date
				const year = now.getFullYear();
				const month = now.getMonth() + 1;
				const day = now.getDate();
				await api.reportDate(year, month, day);

				const verification = await api.getDate();
				if (
					!verification ||
					verification.year !== year ||
					verification.month !== month ||
					verification.day !== day
				) {
					// Didn't work
					return false;
				}
			} catch {
				return false;
			}

			try {
				// Then time
				const hour = now.getHours();
				const minute = now.getMinutes();
				const second = now.getSeconds();
				await api.reportTime(hour, minute, second);

				const verification = await api.getTime();
				if (!verification) return false;
				// To leave a bit of tolerance for communication delays, we compare the seconds since midnight
				const secondsPerDay = 24 * 60 * 60;
				const expected = hour * 60 * 60 + minute * 60 + second;
				const expectedMin = expected - 30;
				const expectedMax = expected + 30;
				const actual =
					verification.hour * 60 * 60 +
					verification.minute * 60 +
					verification.second;
				// The time may have wrapped around midnight since we set the date
				if (actual >= expectedMin && actual <= expectedMax) {
					// ok
				} else if (
					actual + secondsPerDay >= expectedMin &&
					actual + secondsPerDay <= expectedMax
				) {
					// ok
				} else {
					// Didn't work
					return false;
				}
			} catch {
				return false;
			}
		}

		// We might also have to change the timezone. That is done with the Time CC.
		// Or in really strange cases using the Schedule Entry Lock CC
		const timezone = getDSTInfo(now);
		if (
			timeAPI.isSupported() &&
			timeAPI.supportsCommand(TimeCommand.TimeOffsetSet)
		) {
			try {
				const result = await timeAPI.setTimezone(timezone);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		} else if (
			scheduleEntryLockAPI.isSupported() &&
			scheduleEntryLockAPI.supportsCommand(
				ScheduleEntryLockCommand.TimeOffsetSet,
			)
		) {
			try {
				const result = await scheduleEntryLockAPI.setTimezone(timezone);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		}

		return true;
	}

	public async sendResetLocallyNotification(): Promise<void> {
		// We don't care if the CC is supported by the receiving node
		const api = this.createAPI(
			CommandClasses["Device Reset Locally"],
			false,
		);

		await api.sendNotification();
	}
}
