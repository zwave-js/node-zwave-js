import type {
	DeviceConfig,
	Notification,
	NotificationValueDefinition,
} from "@zwave-js/config";
import {
	actuatorCCs,
	applicationCCs,
	CacheBackedMap,
	CommandClasses,
	CRC16_CCITT,
	DataRate,
	FLiRS,
	getCCName,
	isTransmissionError,
	isZWaveError,
	Maybe,
	MetadataUpdatedArgs,
	NodeType,
	NodeUpdatePayload,
	nonApplicationCCs,
	normalizeValueID,
	ProtocolVersion,
	SecurityClass,
	securityClassIsS2,
	securityClassOrder,
	SecurityClassOwner,
	sensorCCs,
	timespan,
	topologicalSort,
	unknownBoolean,
	ValueDB,
	ValueID,
	valueIdToString,
	ValueMetadata,
	ValueMetadataNumeric,
	ValueRemovedArgs,
	ValueUpdatedArgs,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveNodeBase } from "@zwave-js/host";
import type { Message } from "@zwave-js/serial";
import { MessagePriority } from "@zwave-js/serial";
import {
	discreteLinearSearch,
	formatId,
	getEnumMemberName,
	getErrorMessage,
	Mixin,
	num2hex,
	ObjectKeyMap,
	pick,
	stringify,
	TypedEventEmitter,
} from "@zwave-js/shared";
import { roundTo } from "alcalzone-shared/math";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { randomBytes } from "crypto";
import { EventEmitter } from "events";
import { isDeepStrictEqual } from "util";
import type {
	CCAPI,
	PollValueImplementation,
	SetValueAPIOptions,
} from "../commandclass/API";
import { getHasLifelineValueId } from "../commandclass/AssociationCC";
import {
	BasicCC,
	BasicCCReport,
	BasicCCSet,
	getCompatEventValueId as getBasicCCCompatEventValueId,
	getCurrentValueValueId as getBasicCCCurrentValueValueId,
} from "../commandclass/BasicCC";
import {
	CentralSceneCCNotification,
	getSceneValueId,
	getSlowRefreshValueId,
} from "../commandclass/CentralSceneCC";
import { ClockCCReport } from "../commandclass/ClockCC";
import { CommandClass, getCCValueMetadata } from "../commandclass/CommandClass";
import { getCurrentModeValueId as getCurrentLockModeValueId } from "../commandclass/DoorLockCC";
import { EntryControlCCNotification } from "../commandclass/EntryControlCC";
import {
	FirmwareUpdateMetaDataCC,
	FirmwareUpdateMetaDataCCGet,
	FirmwareUpdateMetaDataCCReport,
	FirmwareUpdateMetaDataCCStatusReport,
} from "../commandclass/FirmwareUpdateMetaDataCC";
import { HailCC } from "../commandclass/HailCC";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import { getLockedValueId } from "../commandclass/LockCC";
import {
	getManufacturerIdValueId,
	getProductIdValueId,
	getProductTypeValueId,
} from "../commandclass/ManufacturerSpecificCC";
import {
	getEndpointCCsValueId,
	getEndpointDeviceClassValueId,
} from "../commandclass/MultiChannelCC";
import {
	getCompatEventValueId as getMultilevelSwitchCCCompatEventValueId,
	MultilevelSwitchCC,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
} from "../commandclass/MultilevelSwitchCC";
import {
	getNodeLocationValueId,
	getNodeNameValueId,
} from "../commandclass/NodeNamingCC";
import {
	getNotificationValueMetadata,
	getNotificationValueMetadataUnknownType,
	NotificationCC,
	NotificationCCReport,
} from "../commandclass/NotificationCC";
import { PowerlevelCCTestNodeReport } from "../commandclass/PowerlevelCC";
import { SceneActivationCCSet } from "../commandclass/SceneActivationCC";
import {
	Security2CCNonceGet,
	Security2CCNonceReport,
} from "../commandclass/Security2CC";
import {
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import {
	getFirmwareVersionsValueId,
	getSDKVersionValueId,
} from "../commandclass/VersionCC";
import {
	getWakeUpIntervalValueId,
	getWakeUpOnDemandSupportedValueId,
	WakeUpCCWakeUpNotification,
} from "../commandclass/WakeUpCC";
import {
	getNodeTypeValueId,
	getRoleTypeValueId,
	getZWavePlusVersionValueId,
	ZWavePlusCCGet,
} from "../commandclass/ZWavePlusCC";
import {
	CentralSceneKeys,
	DoorLockMode,
	FirmwareUpdateCapabilities,
	FirmwareUpdateRequestStatus,
	FirmwareUpdateStatus,
	MultilevelSwitchCommand,
	Powerlevel,
	PowerlevelTestStatus,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "../commandclass/_Types";
import { isRssiError, RSSI, RssiError, TXReport } from "../controller/_Types";
import type { Driver, SendCommandOptions } from "../driver/Driver";
import { cacheKeys } from "../driver/NetworkCache";
import { Extended, interpretEx } from "../driver/StateMachineShared";
import type { StatisticsEventCallbacksWithSelf } from "../driver/Statistics";
import type { Transaction } from "../driver/Transaction";
import {
	ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
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
	NodeReadyInterpreter,
} from "./NodeReadyMachine";
import {
	NodeStatistics,
	NodeStatisticsHost,
	RouteStatistics,
	routeStatisticsEquals,
} from "./NodeStatistics";
import {
	createNodeStatusMachine,
	NodeStatusInterpreter,
	nodeStatusMachineStateToNodeStatus,
} from "./NodeStatusMachine";
import * as nodeUtils from "./utils";
import type {
	LifelineHealthCheckResult,
	LifelineHealthCheckSummary,
	RefreshInfoOptions,
	RouteHealthCheckResult,
	RouteHealthCheckSummary,
	TranslatedValueID,
	ZWaveNodeEventCallbacks,
	ZWaveNodeValueEventCallbacks,
} from "./_Types";
import { InterviewStage, NodeStatus } from "./_Types";

interface ScheduledPoll {
	timeout: NodeJS.Timeout;
	expectedValue?: unknown;
}

export interface NodeSchedulePollOptions {
	/** The timeout after which the poll is to be scheduled */
	timeoutMs?: number;
	/**
	 * The expected value that's should be verified with this poll.
	 * When this value is received in the meantime, the poll will be cancelled.
	 */
	expectedValue?: unknown;
}

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
	implements SecurityClassOwner, ZWaveNodeBase
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
			...this.manualRefreshTimers.values(),
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
		// @ts-expect-error This can happen for value updated events
		if ("source" in outArg) delete outArg.source;

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
		const isInternalValue = ccInstance?.isInternalValue(
			arg.property as any,
		);
		// Check whether this value change may be logged
		const isSecretValue = !!ccInstance?.isSecretValue(arg.property as any);
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
				if (this.valueDB.hasValue(possiblyMirroredValueID)) return;
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
	public get isListening(): boolean | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).isListening);
	}
	private set isListening(value: boolean | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).isListening, value);
	}

	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	public get isFrequentListening(): FLiRS | undefined {
		return this.driver.cacheGet(
			cacheKeys.node(this.id).isFrequentListening,
		);
	}
	private set isFrequentListening(value: FLiRS | undefined) {
		this.driver.cacheSet(
			cacheKeys.node(this.id).isFrequentListening,
			value,
		);
	}

	public get canSleep(): boolean | undefined {
		if (this.isListening == undefined) return undefined;
		if (this.isFrequentListening == undefined) return undefined;
		return !this.isListening && !this.isFrequentListening;
	}

	/** Whether the node supports routing/forwarding messages. */
	public get isRouting(): boolean | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).isRouting);
	}
	private set isRouting(value: boolean | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).isRouting, value);
	}

	public get supportedDataRates(): readonly DataRate[] | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportedDataRates);
	}
	private set supportedDataRates(value: readonly DataRate[] | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportedDataRates, value);
	}

	public get maxDataRate(): DataRate | undefined {
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
	public get isSecure(): Maybe<boolean> {
		const securityClass = this.getHighestSecurityClass();
		if (securityClass == undefined) return unknownBoolean;
		if (securityClass === SecurityClass.None) return false;
		return true;
	}

	public hasSecurityClass(securityClass: SecurityClass): Maybe<boolean> {
		return this.securityClasses.get(securityClass) ?? unknownBoolean;
	}

	public setSecurityClass(
		securityClass: SecurityClass,
		granted: boolean,
	): void {
		this.securityClasses.set(securityClass, granted);
	}

	/** Returns the highest security class this node was granted or `undefined` if that information isn't known yet */
	public getHighestSecurityClass(): SecurityClass | undefined {
		if (this.securityClasses.size === 0) return undefined;
		let missingSome = false;
		for (const secClass of securityClassOrder) {
			if (this.securityClasses.get(secClass) === true) return secClass;
			if (!this.securityClasses.has(secClass)) {
				missingSome = true;
			}
		}
		// If we don't have the info for every security class, we don't know the highest one yet
		return missingSome ? undefined : SecurityClass.None;
	}

	/** The Z-Wave protocol version this node implements */
	public get protocolVersion(): ProtocolVersion | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).protocolVersion);
	}
	private set protocolVersion(value: ProtocolVersion | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).protocolVersion, value);
	}

	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	public get nodeType(): NodeType | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).nodeType);
	}
	private set nodeType(value: NodeType | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).nodeType, value);
	}

	/**
	 * Whether this node supports security (S0 or S2).
	 * **WARNING:** Nodes often report this incorrectly - do not blindly trust it.
	 */
	public get supportsSecurity(): boolean | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportsSecurity);
	}
	private set supportsSecurity(value: boolean | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportsSecurity, value);
	}

	/** Whether this node can issue wakeup beams to FLiRS nodes */
	public get supportsBeaming(): boolean | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportsBeaming);
	}
	private set supportsBeaming(value: boolean | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportsBeaming, value);
	}

	public get manufacturerId(): number | undefined {
		return this.getValue(getManufacturerIdValueId());
	}

	public get productId(): number | undefined {
		return this.getValue(getProductIdValueId());
	}

	public get productType(): number | undefined {
		return this.getValue(getProductTypeValueId());
	}

	public get firmwareVersion(): string | undefined {
		// We're only interested in the first (main) firmware
		const ret = this.getValue<string[]>(getFirmwareVersionsValueId())?.[0];

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

	public get sdkVersion(): string | undefined {
		return this.getValue(getSDKVersionValueId());
	}

	public get zwavePlusVersion(): number | undefined {
		return this.getValue(getZWavePlusVersionValueId());
	}

	public get zwavePlusNodeType(): ZWavePlusNodeType | undefined {
		return this.getValue(getNodeTypeValueId());
	}

	public get zwavePlusRoleType(): ZWavePlusRoleType | undefined {
		return this.getValue(getRoleTypeValueId());
	}

	public get supportsWakeUpOnDemand(): boolean | undefined {
		return this.getValue(getWakeUpOnDemandSupportedValueId());
	}

	public get shouldRequestWakeUpOnDemand(): boolean {
		return (
			!!this.supportsWakeUpOnDemand &&
			this.status === NodeStatus.Asleep &&
			this.driver.hasPendingTransactions(
				(t) =>
					t.requestWakeUpOnDemand &&
					t.message.getNodeId() === this.id,
			)
		);
	}

	/**
	 * The user-defined name of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
	 *
	 * **Note:** Setting this value only updates the name locally. To permanently change the name of the node, use
	 * the `commandClasses` API.
	 */
	public get name(): string | undefined {
		return this.getValue(getNodeNameValueId());
	}
	public set name(value: string | undefined) {
		if (value != undefined) {
			this._valueDB.setValue(getNodeNameValueId(), value);
		} else {
			this._valueDB.removeValue(getNodeNameValueId());
		}
	}

	/**
	 * The user-defined location of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
	 *
	 * **Note:** Setting this value only updates the location locally. To permanently change the location of the node, use
	 * the `commandClasses` API.
	 */
	public get location(): string | undefined {
		return this.getValue(getNodeLocationValueId());
	}
	public set location(value: string | undefined) {
		if (value != undefined) {
			this._valueDB.setValue(getNodeLocationValueId(), value);
		} else {
			this._valueDB.removeValue(getNodeLocationValueId());
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

	public get deviceDatabaseUrl(): string | undefined {
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
	public getValue<T = unknown>(valueId: ValueID): T | undefined {
		return this._valueDB.getValue(valueId);
	}

	/**
	 * Retrieves metadata for a given value id.
	 * This can be used to enhance the user interface of an application
	 */
	public getValueMetadata(valueId: ValueID): ValueMetadata {
		const { commandClass, property } = valueId;
		return {
			// Merge static metadata
			...getCCValueMetadata(commandClass, property),
			// with potentially existing dynamic metadata
			...this._valueDB.getMetadata(valueId),
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
	): Promise<boolean> {
		// Try to retrieve the corresponding CC API
		try {
			// Access the CC API by name
			const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
			if (!endpointInstance) return false;
			const api = (endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI;
			// Check if the setValue method is implemented
			if (!api.setValue) return false;
			// And call it
			await api.setValue(
				{
					property: valueId.property,
					propertyKey: valueId.propertyKey,
				},
				value,
				options,
			);
			if (api.isSetValueOptimistic(valueId)) {
				// If the call did not throw, assume that the call was successful and remember the new value
				this._valueDB.setValue(
					valueId,
					value,
					!!this.driver.options.emitValueUpdateAfterSetValue
						? { source: "driver" }
						: { noEvent: true },
				);
			}

			return true;
		} catch (e) {
			// Define which errors during setValue are expected and won't crash
			// the driver:
			if (isZWaveError(e)) {
				let handled = false;
				let emitErrorEvent = false;
				switch (e.code) {
					// This CC or API is not implemented
					case ZWaveErrorCodes.CC_NotImplemented:
					case ZWaveErrorCodes.CC_NoAPI:
						handled = true;
						break;
					// A user tried to set an invalid value
					case ZWaveErrorCodes.Argument_Invalid:
						handled = true;
						emitErrorEvent = true;
						break;
				}
				if (emitErrorEvent) this.driver.emit("error", e);
				if (handled) return false;
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
	): Promise<T | undefined> {
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
		return (api.pollValue as PollValueImplementation<T>)({
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
				await api.pollValue!(valueId);
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
			actualValue != undefined &&
			poll.expectedValue != undefined &&
			!isDeepStrictEqual(poll.expectedValue, actualValue)
		) {
			return false;
		}

		clearTimeout(poll.timeout);
		this.scheduledPolls.delete(valueId);

		return true;
	}

	public get endpointCountIsDynamic(): boolean | undefined {
		return nodeUtils.endpointCountIsDynamic(this.driver, this);
	}

	public get endpointsHaveIdenticalCapabilities(): boolean | undefined {
		return nodeUtils.endpointsHaveIdenticalCapabilities(this.driver, this);
	}

	public get individualEndpointCount(): number | undefined {
		return nodeUtils.getIndividualEndpointCount(this.driver, this);
	}

	public get aggregatedEndpointCount(): number | undefined {
		return nodeUtils.getAggregatedEndpointCount(this.driver, this);
	}

	/** Returns the device class of an endpoint. Falls back to the node's device class if the information is not known. */
	private getEndpointDeviceClass(index: number): DeviceClass | undefined {
		const deviceClass = this.getValue<{
			generic: number;
			specific: number;
		}>(
			getEndpointDeviceClassValueId(
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

	private getEndpointCCs(index: number): CommandClasses[] | undefined {
		const ret = this.getValue(
			getEndpointCCsValueId(
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

		const { resetSecurityClasses = false, waitForWakeup = true } = options;
		// Unless desired, don't forget the information about sleeping nodes immediately, so they continue to function
		if (
			waitForWakeup &&
			this.canSleep &&
			this.supportsCC(CommandClasses["Wake Up"])
		) {
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			await this.waitForWakeup().catch(() => {});
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
		void this.driver.interviewNode(this);
	}

	/**
	 * @internal
	 * Interviews this node. Returns true when it succeeded, false otherwise
	 *
	 * WARNING: Do not call this method from application code. To refresh the information
	 * for a specific node, use `node.refreshInfo()` instead
	 */
	public async interview(): Promise<boolean> {
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
				if (!(await tryInterviewStage(() => this.queryNodeInfo()))) {
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

		// Assume that sleeping nodes start asleep
		if (this.canSleep) {
			if (this.status === NodeStatus.Alive) {
				// unless it was just inluded and is currently communicating with us
				// In that case we need to switch from alive/dead to awake/asleep
				this.markAsAwake();
			} else {
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
	protected async queryNodeInfo(): Promise<void> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot query node info",
				"warn",
			);
			return;
		}

		this.driver.controllerLog.logNode(this.id, {
			message: "querying node info...",
			direction: "outbound",
		});
		const resp = await this.driver.sendMessage<
			RequestNodeInfoResponse | ApplicationUpdateRequest
		>(new RequestNodeInfoRequest(this.driver, { nodeId: this.id }));
		if (resp instanceof RequestNodeInfoResponse && !resp.wasSent) {
			// TODO: handle this in SendThreadMachine
			this.driver.controllerLog.logNode(
				this.id,
				`Querying the node info failed`,
				"error",
			);
			throw new ZWaveError(
				`Querying the node info failed`,
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		} else if (
			resp instanceof ApplicationUpdateRequestNodeInfoRequestFailed
		) {
			// TODO: handle this in SendThreadMachine
			this.driver.controllerLog.logNode(
				this.id,
				`Querying the node info failed`,
				"error",
			);
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
			logLines.push("controlled CCs:");
			for (const cc of resp.nodeInformation.controlledCCs) {
				const ccName = CommandClasses[cc];
				logLines.push(`· ${ccName ? ccName : num2hex(cc)}`);
			}
			this.driver.controllerLog.logNode(this.id, {
				message: logLines.join("\n"),
				direction: "inbound",
			});
			this.updateNodeInfo(resp.nodeInformation);
		}
		this.setInterviewStage(InterviewStage.NodeInfo);
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

		const interviewEndpoint = async (
			endpoint: Endpoint,
			cc: CommandClasses,
		): Promise<"continue" | false | void> => {
			let instance: CommandClass;
			try {
				instance = endpoint.createCCInstance(cc)!;
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
			if (instance.interviewComplete) return "continue";

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
				if (this.hasSecurityClass(secClass) === unknownBoolean) {
					this.securityClasses.set(secClass, false);
				}
			}
		}

		if (this.supportsCC(CommandClasses.Security)) {
			// Security S0 is always supported *securely*
			this.addCC(CommandClasses.Security, { secure: true });

			// Query supported CCs unless we know for sure that the node wasn't assigned the S0 security class
			if (this.hasSecurityClass(SecurityClass.S0_Legacy) !== false) {
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
				this.hasSecurityClass(SecurityClass.S0_Legacy) ===
				unknownBoolean
			) {
				// Remember that this node hasn't been granted the S0 security class
				this.securityClasses.set(SecurityClass.S0_Legacy, false);
			}
		}

		// Manufacturer Specific and Version CC need to be handled before the other CCs because they are needed to
		// identify the device and apply device configurations
		if (this.supportsCC(CommandClasses["Manufacturer Specific"])) {
			await interviewEndpoint(
				this,
				CommandClasses["Manufacturer Specific"],
			);
		}

		if (this.supportsCC(CommandClasses.Version)) {
			await interviewEndpoint(this, CommandClasses.Version);

			// After the version CC interview of the root endpoint, we have enough info to load the correct device config file
			await this.loadDeviceConfig();

			// At this point we may need to make some changes to the CCs the device reports
			this.applyCommandClassesCompatFlag();
		}

		// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
		// to map the Basic CC to other CCs or expose Basic Set as an event
		const compat = this._deviceConfig?.compat;
		if (compat?.treatBasicSetAsEvent) {
			// To create the compat event value, we need to force a Basic CC interview
			this.addCC(CommandClasses.Basic, {
				isSupported: true,
				version: 1,
			});
		} else if (!compat?.disableBasicMapping) {
			this.hideBasicCCInFavorOfActuatorCCs();
		}

		// We determine the correct interview order of the remaining CCs by topologically sorting two dependency graph
		// In order to avoid emitting unnecessary value events for the root endpoint,
		// we defer the application CC interview until after the other endpoints have been interviewed
		const rootInterviewGraphBeforeEndpoints = this.buildCCInterviewGraph([
			CommandClasses.Security,
			CommandClasses["Security 2"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
			...applicationCCs,
		]);
		let rootInterviewOrderBeforeEndpoints: CommandClasses[];

		const rootInterviewGraphAfterEndpoints = this.buildCCInterviewGraph([
			CommandClasses.Security,
			CommandClasses["Security 2"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
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

		// Now that we know the correct order, do the interview in sequence
		for (const cc of rootInterviewOrderBeforeEndpoints) {
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

			// Always interview Security first because it changes the interview order
			// The root endpoint has been interviewed, so we know if the device supports security and which security classes it has
			const securityClass = this.getHighestSecurityClass();

			if (endpoint.supportsCC(CommandClasses["Security 2"])) {
				// Security S2 is always supported *securely*
				endpoint.addCC(CommandClasses["Security 2"], { secure: true });

				// If S2 is the highest security class, interview it for the endpoint
				if (
					securityClass != undefined &&
					securityClassIsS2(securityClass) &&
					!!this.driver.securityManager2
				) {
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
					const action = await interviewEndpoint(
						endpoint,
						CommandClasses.Security,
					);
					if (typeof action === "boolean") return action;
				}
			}

			if (
				endpoint.supportsCC(CommandClasses.Security) &&
				// The root endpoint has been interviewed, so we know if the device supports security
				this.hasSecurityClass(SecurityClass.S0_Legacy) === true &&
				// Only interview SecurityCC if the network key was set
				this.driver.securityManager
			) {
				// Security is always supported *securely*
				endpoint.addCC(CommandClasses.Security, { secure: true });
			}

			// The Security S0/S2 CC adds new CCs to the endpoint, so we need to once more remove those
			// that aren't actually properly supported by the device.
			this.applyCommandClassesCompatFlag(endpoint.index);

			// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
			// to map the Basic CC to other CCs or expose Basic Set as an event
			if (!compat?.disableBasicMapping && !compat?.treatBasicSetAsEvent) {
				endpoint.hideBasicCCInFavorOfActuatorCCs();
			}

			const endpointInterviewGraph = endpoint.buildCCInterviewGraph([
				CommandClasses.Security,
				CommandClasses["Security 2"],
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

			// Now that we know the correct order, do the interview in sequence
			for (const cc of endpointInterviewOrder) {
				const action = await interviewEndpoint(endpoint, cc);
				if (action === "continue") continue;
				else if (typeof action === "boolean") return action;
			}
		}

		// Continue with the application CCs for the root endpoint
		for (const cc of rootInterviewOrderAfterEndpoints) {
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
			for (const cc of nodeInfo.controlledCCs)
				this.addCC(cc, { isControlled: true });
		}

		// As the NIF is sent on wakeup, treat this as a sign that the node is awake
		this.markAsAwake();

		// SDS14223 Unless unsolicited <XYZ> Report Commands are received,
		// a controlling node MUST probe the current values when the
		// supporting node issues a Wake Up Notification Command for sleeping nodes.

		// This is not the handler for wakeup notifications, but some legacy devices send this
		// message whenever there's an update.
		if (this.requiresManualValueRefresh()) {
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

	/** Returns whether a manual refresh of non-static values is likely necessary for this node */
	public requiresManualValueRefresh(): boolean {
		// If there was no lifeline configured, we assume that the controller
		// does not receive unsolicited updates from the node
		return (
			this.interviewStage === InterviewStage.Complete &&
			!this.supportsCC(CommandClasses["Z-Wave Plus Info"]) &&
			!this.valueDB.getValue(getHasLifelineValueId())
		);
	}

	/**
	 * @internal
	 * Schedules the regular refreshes of some CC values
	 */
	public scheduleManualValueRefreshes(): void {
		// Only schedule this for listening nodes. Sleeping nodes are queried on wakeup
		if (!this.canSleep) return;
		// Only schedule this if we don't expect any unsolicited updates
		if (!this.requiresManualValueRefresh()) return;

		// TODO: The timespan definitions should be on the CCs themselves (probably as decorators)
		this.scheduleManualValueRefresh(
			CommandClasses.Battery,
			// The specs say once per month, but that's a bit too unfrequent IMO
			// Also the maximum that setInterval supports is ~24.85 days
			timespan.days(7),
		);
		this.scheduleManualValueRefresh(
			CommandClasses.Meter,
			timespan.hours(6),
		);
		this.scheduleManualValueRefresh(
			CommandClasses["Multilevel Sensor"],
			timespan.hours(6),
		);
		if (
			this.supportsCC(CommandClasses.Notification) &&
			this.createCCInstance(NotificationCC)?.notificationMode === "pull"
		) {
			this.scheduleManualValueRefresh(
				CommandClasses.Notification,
				timespan.hours(6),
			);
		}
	}

	private manualRefreshTimers = new Map<CommandClasses, NodeJS.Timeout>();
	/**
	 * Is used to schedule a manual value refresh for nodes that don't send unsolicited commands
	 */
	private scheduleManualValueRefresh(
		cc: CommandClasses,
		timeout: number,
	): void {
		// // Avoid triggering the refresh multiple times
		// this.cancelManualValueRefresh(cc);
		this.manualRefreshTimers.set(
			cc,
			setInterval(() => {
				void this.refreshCCValues(cc);
			}, timeout).unref(),
		);
	}

	private cancelManualValueRefresh(cc: CommandClasses): void {
		if (this.manualRefreshTimers.has(cc)) {
			const timeout = this.manualRefreshTimers.get(cc)!;
			clearTimeout(timeout);
			this.manualRefreshTimers.delete(cc);
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
	public handleCommand(command: CommandClass): Promise<void> | void {
		// If the node sent us an unsolicited update, our initial assumption
		// was wrong. Stop querying it regularly for updates
		this.cancelManualValueRefresh(command.ccId);

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
				command.persistValues();
			}
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
		} else if (command instanceof Security2CCNonceGet) {
			return this.handleSecurity2NonceGet();
		} else if (command instanceof Security2CCNonceReport) {
			return this.handleSecurity2NonceReport(command);
		} else if (command instanceof HailCC) {
			return this.handleHail(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCGet) {
			return this.handleFirmwareUpdateGet(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCStatusReport) {
			return this.handleFirmwareUpdateStatusReport(command);
		} else if (command instanceof EntryControlCCNotification) {
			return this.handleEntryControlNotification(command);
		} else if (command instanceof PowerlevelCCTestNodeReport) {
			return this.handlePowerlevelTestNodeReport(command);
		} else if (command instanceof ZWavePlusCCGet) {
			return this.handleZWavePlusGet(command);
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
	private handleSecurity2NonceReport(command: Security2CCNonceReport): void {
		const secMan = this.driver.securityManager2;
		if (!secMan) return;

		if (command.SOS && command.receiverEI) {
			// The node couldn't decrypt the last command we sent it. Invalidate
			// the shared SPAN, since it did the same
			secMan.storeRemoteEI(this.nodeId, command.receiverEI);
		}

		this.driver.controllerLog.logNode(this.id, {
			message: `received S2 nonce, not sure what to do with it`,
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
			const valueId = getSceneValueId(sceneNumber);
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
				this.valueDB.getValue<boolean>(getSlowRefreshValueId());
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
				this.valueDB.setValue(getSlowRefreshValueId(), true);
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
		this.addCC(CommandClasses["Wake Up"], {
			isSupported: true,
			version: 1,
		});

		this.markAsAwake();

		// From the specs:
		// A controlling node SHOULD read the Wake Up Interval of a supporting node when the delays between
		// Wake Up periods are larger than what was last set at the supporting node.
		const now = Date.now();
		if (this.lastWakeUp) {
			// we've already measured the wake up interval, so we can check whether a refresh is necessary
			const wakeUpInterval =
				this.getValue<number>(getWakeUpIntervalValueId()) ?? 1;
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

		// Some devices expect us to query them on wake up in order to function correctly
		if (this._deviceConfig?.compat?.queryOnWakeup) {
			// Don't wait
			void this.compatDoWakeupQueries();
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
				mappedTargetCC?.setMappedBasicValue(command.currentValue);

			// Otherwise fall back to setting it ourselves
			if (!didSetMappedValue) {
				// Store the value in the value DB now
				command.persistValues();

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
					getBasicCCCompatEventValueId(command.endpointIndex),
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
					!!mappedTargetCC?.setMappedBasicValue(command.targetValue);

				// Otherwise handle the command ourselves
				if (!didSetMappedValue) {
					// Basic Set commands cannot store their value automatically, so store the values manually
					this._valueDB.setValue(
						getBasicCCCurrentValueValueId(command.endpointIndex),
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
				getMultilevelSwitchCCCompatEventValueId(command.endpointIndex),
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
				{ eventType: MultilevelSwitchCommand.StopLevelChange },
			);
		}
	}

	private async handleZWavePlusGet(_command: ZWavePlusCCGet): Promise<void> {
		// treat this as a sign that the node is awake
		this.markAsAwake();

		await this.commandClasses["Z-Wave Plus Info"].sendReport({
			zwavePlusVersion: 2,
			roleType: ZWavePlusRoleType.CentralStaticController,
			nodeType: ZWavePlusNodeType.Node,
			installerIcon: 0x0500, // Generic Gateway
			userIcon: 0x0500, // Generic Gateway
		});
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
			clearTimeout(this.notificationIdleTimeouts.get(key)!);
			this.notificationIdleTimeouts.delete(key);
		}
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

		// Fallback for V2 notifications that don't allow us to predefine the metadata during the interview.
		// Instead of defining useless values for each possible notification event, we build the metadata on demand
		const extendValueMetadata = (
			valueId: ValueID,
			notificationConfig: Notification,
			valueConfig: NotificationValueDefinition & { type: "state" },
		) => {
			if (command.version === 2 || !this.valueDB.hasMetadata(valueId)) {
				const metadata = getNotificationValueMetadata(
					this.valueDB.getMetadata(valueId) as
						| ValueMetadataNumeric
						| undefined,
					notificationConfig,
					valueConfig,
				);
				this.valueDB.setMetadata(valueId, metadata);
			}
		};
		const ensureValueMetadataUnknownType = (
			valueId: ValueID,
			notificationConfig: Notification,
		) => {
			if (command.version === 2 && !this.valueDB.hasMetadata(valueId)) {
				const metadata = getNotificationValueMetadataUnknownType(
					notificationConfig.id,
				);
				this.valueDB.setMetadata(valueId, metadata);
			}
		};

		// Look up the received notification in the config
		const notificationConfig = this.driver.configManager.lookupNotification(
			command.notificationType,
		);

		if (notificationConfig) {
			// This is a known notification (status or event)
			const property = notificationConfig.name;

			/** Returns a single notification state to idle */
			const setStateIdle = (prevValue: number): void => {
				const valueConfig = notificationConfig.lookupValue(prevValue);
				// Only known variables may be reset to idle
				if (!valueConfig || valueConfig.type !== "state") return;
				// Some properties may not be reset to idle
				if (!valueConfig.idle) return;

				const propertyKey = valueConfig.variableName;
				const valueId: ValueID = {
					commandClass: command.ccId,
					endpoint: command.endpointIndex,
					property,
					propertyKey,
				};
				// Since the node has reset the notification itself, we don't need the idle reset
				this.clearNotificationIdleReset(valueId);
				extendValueMetadata(valueId, notificationConfig, valueConfig);
				this.valueDB.setValue(valueId, 0 /* idle */);
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
								v.property === property &&
								typeof v.value === "number" &&
								v.value !== 0,
						);
					for (const v of nonIdleValues) {
						setStateIdle(v.value as number);
					}
				}
				return;
			}

			let propertyKey: string;
			// Find out which property we need to update
			const valueConfig = notificationConfig.lookupValue(value);

			// Perform some heuristics on the known notification
			this.handleKnownNotification(command);

			let allowIdleReset: boolean;
			if (!valueConfig) {
				// This is an unknown value, collect it in an unknown bucket
				propertyKey = "unknown";
				// We don't know what this notification refers to, so we don't force a reset
				allowIdleReset = false;
			} else if (valueConfig.type === "state") {
				propertyKey = valueConfig.variableName;
				allowIdleReset = valueConfig.idle;
			} else {
				this.emit("notification", this, CommandClasses.Notification, {
					type: command.notificationType,
					event: value,
					label: notificationConfig.name,
					eventLabel: valueConfig.label,
					parameters: command.eventParameters,
				});
				return;
			}

			// Now that we've gathered all we need to know, update the value in our DB
			const valueId: ValueID = {
				commandClass: command.ccId,
				endpoint: command.endpointIndex,
				property,
				propertyKey,
			};
			if (valueConfig) {
				extendValueMetadata(valueId, notificationConfig, valueConfig);
			} else {
				ensureValueMetadataUnknownType(valueId, notificationConfig);
			}
			this.valueDB.setValue(valueId, value);

			// Nodes before V8 (and some misbehaving V8 ones) don't necessarily reset the notification to idle.
			// The specifications advise to auto-reset the variables, but it has been found that this interferes
			// with some motion sensors that don't refresh their active notification. Therefore, we set a fallback
			// timer if the `forceNotificationIdleReset` compat flag is set.
			if (
				allowIdleReset &&
				!!this._deviceConfig?.compat?.forceNotificationIdleReset
			) {
				this.scheduleNotificationIdleReset(valueId, () =>
					setStateIdle(value),
				);
			}
		} else {
			// This is an unknown notification
			const property = `UNKNOWN_${num2hex(command.notificationType)}`;
			const valueId: ValueID = {
				commandClass: command.ccId,
				endpoint: command.endpointIndex,
				property,
			};
			this.valueDB.setValue(valueId, command.notificationEvent);
			// We don't know what this notification refers to, so we don't force a reset
		}
	}

	private handleKnownNotification(command: NotificationCCReport): void {
		const lockEvents = [0x01, 0x03, 0x05, 0x09];
		const unlockEvents = [0x02, 0x04, 0x06];
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
					getCurrentLockModeValueId(command.endpointIndex),
					isLocked ? DoorLockMode.Secured : DoorLockMode.Unsecured,
				);
			}
			if (this.supportsCC(CommandClasses.Lock)) {
				this.valueDB.setValue(
					getLockedValueId(command.endpointIndex),
					isLocked,
				);
			}
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
			const endpoint = command.getEndpoint(this.driver);
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

	private _firmwareUpdateStatus:
		| {
				progress: number;
				fragmentSize: number;
				numFragments: number;
				data: Buffer;
				abort: boolean;
				/** This is set when waiting for the update status */
				statusTimeout?: NodeJS.Timeout;
				/** This is set when waiting for a get request */
				getTimeout?: NodeJS.Timeout;
		  }
		| undefined;

	/** Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update */
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
	 * Starts an OTA firmware update process for this node.
	 *
	 * **WARNING: Use at your own risk! We don't take any responsibility if your devices don't work after an update.**
	 *
	 * @param data The firmware image
	 * @param target The firmware target (i.e. chip) to upgrade. 0 updates the Z-Wave chip, >=1 updates others if they exist
	 */
	public async beginFirmwareUpdate(
		data: Buffer,
		target: number = 0,
	): Promise<void> {
		// Don't start the process twice
		if (this._firmwareUpdateStatus) {
			throw new ZWaveError(
				`Failed to start the update: A firmware upgrade is already in progress!`,
				ZWaveErrorCodes.FirmwareUpdateCC_Busy,
			);
		}
		this._firmwareUpdateStatus = {
			data,
			fragmentSize: 0,
			numFragments: 0,
			progress: 0,
			abort: false,
		};

		const version = this.getCCVersion(
			CommandClasses["Firmware Update Meta Data"],
		);
		const api = this.commandClasses["Firmware Update Meta Data"];

		// Check if this update is possible
		const meta = await api.getMetaData();
		if (!meta) {
			this.resetFirmwareUpdateStatus();
			throw new ZWaveError(
				`Failed to start the update: The node did not respond in time!`,
				ZWaveErrorCodes.Controller_NodeTimeout,
			);
		}

		if (target === 0) {
			if (!meta.firmwareUpgradable) {
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: The Z-Wave chip firmware is not upgradable!`,
					ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
				);
			}
		} else {
			if (version < 3) {
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: The node does not support upgrading a different firmware target than 0!`,
					ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
				);
			} else if (meta.additionalFirmwareIDs[target - 1] == undefined) {
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: Firmware target #${target} not found on this node!`,
					ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
				);
			}
		}

		// Determine the fragment size
		const fcc = new FirmwareUpdateMetaDataCC(this.driver, {
			nodeId: this.id,
		});
		const maxNetPayloadSize =
			this.driver.computeNetCCPayloadSize(fcc) -
			2 - // report number
			(version >= 2 ? 2 : 0); // checksum
		// Use the smallest allowed payload
		this._firmwareUpdateStatus.fragmentSize = Math.min(
			maxNetPayloadSize,
			meta.maxFragmentSize ?? Number.POSITIVE_INFINITY,
		);
		this._firmwareUpdateStatus.numFragments = Math.ceil(
			data.length / this._firmwareUpdateStatus.fragmentSize,
		);

		this.driver.controllerLog.logNode(this.id, {
			message: `Starting firmware update...`,
			direction: "outbound",
		});

		// Request the node to start the upgrade
		// TODO: Should manufacturer id and firmware id be provided externally?
		const status = await api.requestUpdate({
			manufacturerId: meta.manufacturerId,
			firmwareId:
				target == 0
					? meta.firmwareId
					: meta.additionalFirmwareIDs[target - 1],
			firmwareTarget: target,
			fragmentSize: this._firmwareUpdateStatus.fragmentSize,
			checksum: CRC16_CCITT(data),
		});
		switch (status) {
			case FirmwareUpdateRequestStatus.Error_AuthenticationExpected:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: A manual authentication event (e.g. button push) was expected!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_BatteryLow:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: The battery level is too low!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_FirmwareUpgradeInProgress:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: A firmware upgrade is already in progress!`,
					ZWaveErrorCodes.FirmwareUpdateCC_Busy,
				);
			case FirmwareUpdateRequestStatus.Error_InvalidManufacturerOrFirmwareID:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: Invalid manufacturer or firmware id!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_InvalidHardwareVersion:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: Invalid hardware version!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_NotUpgradable:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: Firmware target #${target} is not upgradable!`,
					ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
				);
			case FirmwareUpdateRequestStatus.Error_FragmentSizeTooLarge:
				this.resetFirmwareUpdateStatus();
				throw new ZWaveError(
					`Failed to start the update: The chosen fragment size is too large!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.OK:
				// All good, we have started!
				// Keep the node awake until the update is done.
				this.keepAwake = true;
				// Timeout the update when no get request has been received for a while
				this._firmwareUpdateStatus.getTimeout = setTimeout(
					() => this.timeoutFirmwareUpdate(),
					30000,
				).unref();
				return;
		}
	}

	/**
	 * Aborts an active firmware update process
	 */
	public async abortFirmwareUpdate(): Promise<void> {
		// Don't stop the process twice
		if (!this._firmwareUpdateStatus || this._firmwareUpdateStatus.abort) {
			return;
		} else if (
			this._firmwareUpdateStatus.numFragments > 0 &&
			this._firmwareUpdateStatus.progress ===
				this._firmwareUpdateStatus.numFragments
		) {
			throw new ZWaveError(
				`The firmware update was transmitted completely, cannot abort anymore.`,
				ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort,
			);
		}

		this.driver.controllerLog.logNode(this.id, {
			message: `Aborting firmware update...`,
			direction: "outbound",
		});

		this._firmwareUpdateStatus.abort = true;

		try {
			await this.driver.waitForCommand<FirmwareUpdateMetaDataCCStatusReport>(
				(cc) =>
					cc.nodeId === this.nodeId &&
					cc instanceof FirmwareUpdateMetaDataCCStatusReport &&
					cc.status === FirmwareUpdateStatus.Error_TransmissionFailed,
				5000,
			);
			this.driver.controllerLog.logNode(this.id, {
				message: `Firmware update aborted`,
				direction: "inbound",
			});

			// Clean up
			this.resetFirmwareUpdateStatus();
		} catch (e) {
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Controller_NodeTimeout
			) {
				throw new ZWaveError(
					`The node did not acknowledge the aborted update`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort,
				);
			}
			throw e;
		}
	}

	private async sendCorruptedFirmwareUpdateReport(
		reportNum: number,
		fragment?: Buffer,
	): Promise<void> {
		if (!fragment) {
			let fragmentSize = this._firmwareUpdateStatus?.fragmentSize;
			if (!fragmentSize) {
				// We don't know the fragment size, so we send a fragment with the maximum possible size
				const fcc = new FirmwareUpdateMetaDataCC(this.driver, {
					nodeId: this.id,
				});
				fragmentSize =
					this.driver.computeNetCCPayloadSize(fcc) -
					2 - // report number
					(fcc.version >= 2 ? 2 : 0); // checksum
			}
			fragment = randomBytes(fragmentSize);
		} else {
			// If we already have data, corrupt it
			for (let i = 0; i < fragment.length; i++) {
				fragment[i] = fragment[i] ^ 0xff;
			}
		}
		await this.commandClasses[
			"Firmware Update Meta Data"
		].sendFirmwareFragment(reportNum, true, fragment);
	}

	private handleFirmwareUpdateGet(
		command: FirmwareUpdateMetaDataCCGet,
	): void {
		if (this._firmwareUpdateStatus == undefined) {
			this.driver.controllerLog.logNode(this.id, {
				message: `Received Firmware Update Get, but no firmware update is in progress. Forcing the node to abort...`,
				direction: "inbound",
			});
			this.sendCorruptedFirmwareUpdateReport(command.reportNumber).catch(
				() => {
					/* ignore */
				},
			);
			return;
		} else if (
			command.reportNumber > this._firmwareUpdateStatus.numFragments
		) {
			this.driver.controllerLog.logNode(this.id, {
				message: `Received Firmware Update Get for an out-of-bounds fragment. Forcing the node to abort...`,
				direction: "inbound",
			});
			this.sendCorruptedFirmwareUpdateReport(command.reportNumber).catch(
				() => {
					/* ignore */
				},
			);
			return;
		}

		// Refresh the get timeout
		if (this._firmwareUpdateStatus.getTimeout) {
			// console.warn("refreshed get timeout");
			this._firmwareUpdateStatus.getTimeout =
				this._firmwareUpdateStatus.getTimeout.refresh().unref();
		}

		// When a node requests a firmware update fragment, it must be awake
		try {
			this.markAsAwake();
		} catch {
			/* ignore */
		}

		// Send the response(s) in the background
		void (async () => {
			const { numFragments, data, fragmentSize, abort } =
				this._firmwareUpdateStatus!;
			for (
				let num = command.reportNumber;
				num < command.reportNumber + command.numReports;
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

				if (abort) {
					await this.sendCorruptedFirmwareUpdateReport(num, fragment);
					return;
				} else {
					// Avoid queuing duplicate fragments
					const isCurrentFirmwareFragment = (t: Transaction) =>
						t.message.getNodeId() === this.nodeId &&
						isCommandClassContainer(t.message) &&
						t.message.command instanceof
							FirmwareUpdateMetaDataCCReport &&
						t.message.command.reportNumber === num;
					if (
						this.driver.hasPendingTransactions(
							isCurrentFirmwareFragment,
						)
					) {
						this.driver.controllerLog.logNode(this.id, {
							message: `Firmware fragment ${num} already queued`,
							level: "warn",
						});
						continue;
					}

					this.driver.controllerLog.logNode(this.id, {
						message: `Sending firmware fragment ${num} / ${numFragments}`,
						direction: "outbound",
					});
					const isLast = num === numFragments;
					if (isLast) {
						// Don't send the node to sleep now
						this.keepAwake = true;
					}
					await this.commandClasses[
						"Firmware Update Meta Data"
					].sendFirmwareFragment(num, isLast, fragment);
					// Remember the progress
					this._firmwareUpdateStatus!.progress = num;
					// And notify listeners
					this.emit(
						"firmware update progress",
						this,
						num,
						numFragments,
					);

					// If that was the last one wait for status report from the node and restart interview
					if (isLast) {
						// The update was completed, we don't need to timeout get requests anymore
						if (this._firmwareUpdateStatus?.getTimeout) {
							clearTimeout(this._firmwareUpdateStatus.getTimeout);
							this._firmwareUpdateStatus.getTimeout = undefined;
						}
						void this.finishFirmwareUpdate().catch(() => {
							/* ignore */
						});
					}
				}
			}
		})().catch((e) => {
			this.driver.controllerLog.logNode(
				this.nodeId,
				`Error while sending firmware fragment: ${e.message}`,
				"error",
			);
		});
	}

	private timeoutFirmwareUpdate(): void {
		// In some cases it can happen that the device stops requesting update frames
		// We need to timeout the update in this case so it can be restarted

		this.driver.controllerLog.logNode(this.id, {
			message: `Firmware update timed out`,
			direction: "none",
			level: "warn",
		});

		// clean up
		this.resetFirmwareUpdateStatus();

		// Notify listeners
		this.emit(
			"firmware update finished",
			this,
			FirmwareUpdateStatus.Error_Timeout,
		);
	}

	private handleFirmwareUpdateStatusReport(
		report: FirmwareUpdateMetaDataCCStatusReport,
	): void {
		// If no firmware update is in progress, we don't care
		if (!this._firmwareUpdateStatus) return;

		const { status, waitTime } = report;

		// Actually, OK_WaitingForActivation should never happen since we don't allow
		// delayed activation in the RequestGet command
		const success = status >= FirmwareUpdateStatus.OK_WaitingForActivation;

		this.driver.controllerLog.logNode(this.id, {
			message: `Firmware update ${
				success ? "completed" : "failed"
			} with status ${getEnumMemberName(FirmwareUpdateStatus, status)}`,
			direction: "inbound",
		});

		// clean up
		this.resetFirmwareUpdateStatus();

		// Notify listeners
		this.emit(
			"firmware update finished",
			this,
			status,
			success ? waitTime : undefined,
		);
	}

	private async finishFirmwareUpdate(): Promise<void> {
		try {
			const report =
				await this.driver.waitForCommand<FirmwareUpdateMetaDataCCStatusReport>(
					(cc) =>
						cc.nodeId === this.nodeId &&
						cc instanceof FirmwareUpdateMetaDataCCStatusReport,
					// Wait up to 5 minutes. It should never take that long, but the specs
					// don't say anything specific
					5 * 60000,
				);

			this.handleFirmwareUpdateStatusReport(report);
		} catch (e) {
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Controller_NodeTimeout
			) {
				this.driver.controllerLog.logNode(
					this.id,
					`The node did not acknowledge the completed update`,
					"warn",
				);
				// clean up
				this.resetFirmwareUpdateStatus();

				// Notify listeners
				this.emit(
					"firmware update finished",
					this,
					FirmwareUpdateStatus.Error_Timeout,
				);
			}
			throw e;
		}
	}

	private resetFirmwareUpdateStatus(): void {
		this._firmwareUpdateStatus = undefined;
		this.keepAwake = false;
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
		this.emit(
			"notification",
			this,
			CommandClasses["Entry Control"],
			pick(command, ["eventType", "dataType", "eventData"]),
		);
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

		// Poll the status of the test regularly
		const pollFrequencyMs =
			expectedDurationMs >= 60000
				? 10000
				: expectedDurationMs >= 10000
				? 5000
				: 1000;

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

	/**
	 * Checks the health of connection between the controller and this node and returns the results.
	 */
	public async checkLifelineHealth(
		rounds: number = 5,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
		) => void,
	): Promise<LifelineHealthCheckSummary> {
		if (rounds > 10 || rounds < 1) {
			throw new ZWaveError(
				"The number of health check rounds must be between 1 and 10!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

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

		if (this.canSleep && this.status !== NodeStatus.Awake) {
			// Wait for node to wake up to avoid incorrectly long delays in the first health check round
			this.driver.controllerLog.logNode(
				this.id,
				`waiting for node to wake up...`,
			);
			await this.waitForWakeup();
		}

		const results: LifelineHealthCheckResult[] = [];
		for (let round = 1; round <= rounds; round++) {
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
				const start = Date.now();
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
					snrMargin =
						rssi - (backgroundRSSI as any)[`rssiChannel${channel}`];
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
					return failedPingsController === 0;
				};
				try {
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor,
					);
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
			onProgress?.(round, rounds, ret.rating);
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
		) => void,
	): Promise<RouteHealthCheckSummary> {
		if (rounds > 10 || rounds < 1) {
			throw new ZWaveError(
				"The number of health check rounds must be between 1 and 10!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

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
				"Route health checks require that nodes which can sleep support Powerlevel CC!",
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
		for (let round = 1; round <= rounds; round++) {
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
			onProgress?.(round, rounds, ret.rating);
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
}
