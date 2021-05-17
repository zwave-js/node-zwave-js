import type { DeviceConfig } from "@zwave-js/config";
import {
	actuatorCCs,
	applicationCCs,
	CacheMetadata,
	CacheValue,
	CommandClasses,
	CommandClassInfo,
	CRC16_CCITT,
	getCCName,
	isTransmissionError,
	isZWaveError,
	MAX_NODES,
	Maybe,
	MetadataUpdatedArgs,
	NodeUpdatePayload,
	normalizeValueID,
	sensorCCs,
	timespan,
	topologicalSort,
	unknownBoolean,
	ValueDB,
	ValueID,
	valueIdToString,
	ValueMetadata,
	ValueRemovedArgs,
	ValueUpdatedArgs,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	formatId,
	getEnumMemberName,
	JSONObject,
	Mixin,
	num2hex,
	ObjectKeyMap,
	pick,
	stringify,
} from "@zwave-js/shared";
import type { Comparer, CompareResult } from "alcalzone-shared/comparable";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { randomBytes } from "crypto";
import { EventEmitter } from "events";
import type { CCAPI, PollValueImplementation } from "../commandclass/API";
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
	CentralSceneKeys,
	getSceneValueId,
	getSlowRefreshValueId,
} from "../commandclass/CentralSceneCC";
import { ClockCCReport } from "../commandclass/ClockCC";
import { CommandClass, getCCValueMetadata } from "../commandclass/CommandClass";
import {
	DoorLockMode,
	getCurrentModeValueId as getCurrentLockModeValueId,
} from "../commandclass/DoorLockCC";
import { EntryControlCCNotification } from "../commandclass/EntryControlCC";
import {
	FirmwareUpdateMetaDataCC,
	FirmwareUpdateMetaDataCCGet,
	FirmwareUpdateMetaDataCCStatusReport,
	FirmwareUpdateRequestStatus,
	FirmwareUpdateStatus,
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
	getEndpointIndizesValueId,
} from "../commandclass/MultiChannelCC";
import {
	getNodeLocationValueId,
	getNodeNameValueId,
} from "../commandclass/NodeNamingCC";
import {
	NotificationCC,
	NotificationCCReport,
} from "../commandclass/NotificationCC";
import { SceneActivationCCSet } from "../commandclass/SceneActivationCC";
import {
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import { getFirmwareVersionsValueId } from "../commandclass/VersionCC";
import {
	getWakeUpIntervalValueId,
	WakeUpCCWakeUpNotification,
} from "../commandclass/WakeUpCC";
import {
	getNodeTypeValueId,
	getRoleTypeValueId,
	getZWavePlusVersionValueId,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "../commandclass/ZWavePlusCC";
import {
	ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../controller/ApplicationUpdateRequest";
import {
	GetNodeProtocolInfoRequest,
	GetNodeProtocolInfoResponse,
} from "../controller/GetNodeProtocolInfoMessages";
import type { Driver, SendCommandOptions } from "../driver/Driver";
import { Extended, interpretEx } from "../driver/StateMachineShared";
import type { Transaction } from "../driver/Transaction";
import { MessagePriority } from "../message/Constants";
import { DeviceClass } from "./DeviceClass";
import { Endpoint } from "./Endpoint";
import {
	createNodeReadyMachine,
	NodeReadyInterpreter,
} from "./NodeReadyMachine";
import {
	createNodeStatusMachine,
	NodeStatusInterpreter,
	nodeStatusMachineStateToNodeStatus,
} from "./NodeStatusMachine";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "./RequestNodeInfoMessages";
import type {
	DataRate,
	FLiRS,
	TranslatedValueID,
	ZWaveNodeEventCallbacks,
	ZWaveNodeEvents,
	ZWaveNodeValueEventCallbacks,
} from "./Types";
import { InterviewStage, NodeStatus, NodeType, ProtocolVersion } from "./Types";

/** Returns a Value ID that can be used to store node specific data without relating it to a CC */
function getNodeMetaValueID(property: string): ValueID {
	return {
		commandClass: CommandClasses._NONE,
		property,
	};
}

export interface ZWaveNode {
	on<TEvent extends ZWaveNodeEvents>(
		event: TEvent,
		callback: ZWaveNodeEventCallbacks[TEvent],
	): this;
	once<TEvent extends ZWaveNodeEvents>(
		event: TEvent,
		callback: ZWaveNodeEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends ZWaveNodeEvents>(
		event: TEvent,
		callback: ZWaveNodeEventCallbacks[TEvent],
	): this;
	off<TEvent extends ZWaveNodeEvents>(
		event: TEvent,
		callback: ZWaveNodeEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: ZWaveNodeEvents): this;

	emit<TEvent extends ZWaveNodeEvents>(
		event: TEvent,
		...args: Parameters<ZWaveNodeEventCallbacks[TEvent]>
	): boolean;
}

/**
 * A ZWaveNode represents a node in a Z-Wave network. It is also an instance
 * of its root endpoint (index 0)
 */
@Mixin([EventEmitter])
export class ZWaveNode extends Endpoint {
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
					if (this.cancelScheduledPoll(args)) {
						this.driver.controllerLog.logNode(
							this.nodeId,
							"Scheduled poll canceled because value was updated",
							"verbose",
						);
					}
				},
			);
		}

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

		// Clear all scheduled polls that would interfere with the interview
		for (const valueId of this.scheduledPolls.keys()) {
			this.cancelScheduledPoll(valueId);
		}
	}

	/**
	 * Enhances a value id so it can be consumed better by applications
	 */
	private translateValueID<T extends ValueID>(
		valueId: T,
	): T & TranslatedValueID {
		// Try to retrieve the speaking CC name
		const commandClassName = getCCName(valueId.commandClass);
		const ret: T & TranslatedValueID = {
			commandClassName,
			...valueId,
		};
		const ccInstance = this.createCCInstanceInternal(valueId.commandClass);
		if (!ccInstance) {
			throw new ZWaveError(
				`Cannot translate a value ID for the non-implemented CC ${getCCName(
					valueId.commandClass,
				)}`,
				ZWaveErrorCodes.CC_NotImplemented,
			);
		}

		// Retrieve the speaking property name
		ret.propertyName = ccInstance.translateProperty(
			valueId.property,
			valueId.propertyKey,
		);
		// Try to retrieve the speaking property key
		if (valueId.propertyKey != undefined) {
			const propertyKey = ccInstance.translatePropertyKey(
				valueId.property,
				valueId.propertyKey,
			);
			ret.propertyKeyName = propertyKey;
		}
		return ret;
	}

	/**
	 * Enhances the raw event args of the ValueDB so it can be consumed better by applications
	 */
	private translateValueEvent<T extends ValueID>(
		eventName: keyof ZWaveNodeValueEventCallbacks,
		arg: T,
	): void {
		// Try to retrieve the speaking CC name
		const outArg = this.translateValueID(arg);
		// If this is a metadata event, make sure we return the merged metadata
		if ("metadata" in outArg) {
			((outArg as unknown) as MetadataUpdatedArgs).metadata = this.getValueMetadata(
				arg,
			);
		}
		// Log the value change
		const ccInstance = this.createCCInstanceInternal(arg.commandClass);
		const isInternalValue =
			ccInstance && ccInstance.isInternalValue(arg.property as any);
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
		//Don't expose value events for internal value IDs...
		if (isInternalValue) return;
		// ... and root values ID that mirrors endpoint functionality
		if (
			// Only root endpoint values need to be filtered
			!arg.endpoint &&
			// Only application CCs need to be filtered
			applicationCCs.includes(arg.commandClass) &&
			// and only if a config file does not force us to expose the root endpoint
			!this._deviceConfig?.compat?.preserveRootApplicationCCValueIDs
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

	private _isListening: boolean | undefined;
	/** Whether this node is always listening or not */
	public get isListening(): boolean | undefined {
		return this._isListening;
	}

	private _isFrequentListening: FLiRS | undefined;
	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	public get isFrequentListening(): FLiRS | undefined {
		return this._isFrequentListening;
	}

	public get canSleep(): boolean | undefined {
		if (this._isListening == undefined) return undefined;
		if (this._isFrequentListening == undefined) return undefined;
		return !this._isListening && !this._isFrequentListening;
	}

	private _isRouting: boolean | undefined;
	/** Whether the node supports routing/forwarding messages. */
	public get isRouting(): boolean | undefined {
		return this._isRouting;
	}

	private _supportedDataRates: readonly DataRate[] | undefined;
	public get supportedDataRates(): readonly DataRate[] | undefined {
		return this._supportedDataRates;
	}

	public get maxDataRate(): DataRate | undefined {
		if (this._supportedDataRates) {
			return Math.max(...this._supportedDataRates) as DataRate;
		}
	}

	private _isSecure: Maybe<boolean> | undefined;
	public get isSecure(): Maybe<boolean> | undefined {
		return this._isSecure;
	}
	public set isSecure(value: Maybe<boolean> | undefined) {
		this._isSecure = value;
	}

	private _protocolVersion: ProtocolVersion | undefined;
	/** The Z-Wave protocol version this node implements */
	public get protocolVersion(): ProtocolVersion | undefined {
		return this._protocolVersion;
	}

	private _nodeType: NodeType | undefined;
	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	public get nodeType(): NodeType | undefined {
		return this._nodeType;
	}

	private _supportsSecurity: boolean | undefined;
	/**
	 * Whether this node supports security (S0 or S2).
	 * **WARNING:** Nodes often report this incorrectly - do not blindly trust it.
	 */
	public get supportsSecurity(): boolean | undefined {
		return this._supportsSecurity;
	}

	private _supportsBeaming: boolean | undefined;
	/** Whether this node can issue wakeup beams to FLiRS nodes */
	public get supportsBeaming(): boolean | undefined {
		return this._supportsBeaming;
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
		return this.getValue<string[]>(getFirmwareVersionsValueId())?.[0];
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
		return !!this.valueDB.getValue<boolean>(
			getNodeMetaValueID("hasSUCReturnRoute"),
		);
	}
	public set hasSUCReturnRoute(value: boolean) {
		this.valueDB.setValue(getNodeMetaValueID("hasSUCReturnRoute"), value);
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

	private _neighbors: readonly number[] = [];
	/**
	 * The IDs of all direct neighbors of this node
	 * @deprecated Request the current known neighbors using `controller.getNodeNeighbors` instead.
	 */
	public get neighbors(): readonly number[] {
		return this._neighbors;
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
	/* wotan-disable-next-line no-misused-generics */
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
		let ret: ValueID[] = [];
		const allowControlled: CommandClasses[] = [
			CommandClasses["Scene Activation"],
		];
		for (const endpoint of this.getAllEndpoints()) {
			for (const [cc, info] of endpoint.implementedCommandClasses) {
				// Only expose value IDs for CCs that are supported
				// with some exceptions that are controlled
				if (
					info.isSupported ||
					(info.isControlled && allowControlled.includes(cc))
				) {
					const ccInstance = endpoint.createCCInstanceUnsafe(cc);
					if (ccInstance) {
						ret.push(...ccInstance.getDefinedValueIDs());
					}
				}
			}
		}

		if (!this._deviceConfig?.compat?.preserveRootApplicationCCValueIDs) {
			// Application command classes of the Root Device capabilities that are also advertised by at
			// least one End Point SHOULD be filtered out by controlling nodes before presenting the functionalities
			// via service discovery mechanisms like mDNS or to users in a GUI.
			ret = this.filterRootApplicationCCValueIDs(ret);
		}

		// Translate the remaining value IDs before exposing them to applications
		return ret.map((id) => this.translateValueID(id));
	}

	private shouldHideValueID(
		valueId: ValueID,
		allValueIds: ValueID[],
	): boolean {
		// Non-root endpoint values don't need to be filtered
		if (!!valueId.endpoint) return false;
		// Non-application CCs don't need to be filtered
		if (!applicationCCs.includes(valueId.commandClass)) return false;
		// Filter out root values if an identical value ID exists for another endpoint
		const valueExistsOnAnotherEndpoint = allValueIds.some(
			(other) =>
				// same CC
				other.commandClass === valueId.commandClass &&
				// non-root endpoint
				!!other.endpoint &&
				// same property and key
				other.property === valueId.property &&
				other.propertyKey === valueId.propertyKey,
		);
		return valueExistsOnAnotherEndpoint;
	}

	/**
	 * Removes all Value IDs from an array that belong to a root endpoint and have a corresponding
	 * Value ID on a non-root endpoint
	 */
	private filterRootApplicationCCValueIDs(allValueIds: ValueID[]): ValueID[] {
		return allValueIds.filter(
			(vid) => !this.shouldHideValueID(vid, allValueIds),
		);
	}

	/**
	 * Updates a value for a given property of a given CommandClass on the node.
	 * This will communicate with the node!
	 */
	public async setValue(valueId: ValueID, value: unknown): Promise<boolean> {
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
			);
			if (api.isSetValueOptimistic(valueId)) {
				// If the call did not throw, assume that the call was successful and remember the new value
				this._valueDB.setValue(valueId, value, { noEvent: true });
			}

			return true;
		} catch (e: unknown) {
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
	// wotan-disable-next-line no-misused-generics
	public pollValue<T extends unknown = unknown>(
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

		const api = ((endpointInstance.commandClasses as any)[
			valueId.commandClass
		] as CCAPI).withOptions({
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

	protected scheduledPolls = new ObjectKeyMap<ValueID, NodeJS.Timeout>();
	/**
	 * @internal
	 * Schedules a value to be polled after a given time. Only one schedule can be active for a given value ID.
	 * @returns `true` if the poll was scheduled, `false` otherwise
	 */
	public schedulePoll(
		valueId: ValueID,
		timeoutMs: number = this.driver.options.timeouts.refreshValue,
	): boolean {
		// Avoid false positives or false negatives due to a mis-formatted value ID
		valueId = normalizeValueID(valueId);

		// Try to retrieve the corresponding CC API
		const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
		if (!endpointInstance) return false;

		const api = ((endpointInstance.commandClasses as any)[
			valueId.commandClass
		] as CCAPI).withOptions({
			// We do not want to delay more important communication by polling, so give it
			// the lowest priority and don't retry unless overwritten by the options
			maxSendAttempts: 1,
			priority: MessagePriority.Poll,
		});

		// Check if the pollValue method is implemented
		if (!api.pollValue) return false;

		// make sure there is only one timeout instance per poll
		this.cancelScheduledPoll(valueId);
		this.scheduledPolls.set(
			valueId,
			setTimeout(async () => {
				this.cancelScheduledPoll(valueId);
				try {
					await api.pollValue!(valueId);
				} catch {
					/* ignore */
				}
			}, timeoutMs).unref(),
		);
		return true;
	}

	/**
	 * @internal
	 * Cancels a poll that has been scheduled with schedulePoll
	 */
	public cancelScheduledPoll(valueId: ValueID): boolean {
		// Avoid false positives or false negatives due to a mis-formatted value ID
		valueId = normalizeValueID(valueId);

		if (this.scheduledPolls.has(valueId)) {
			clearTimeout(this.scheduledPolls.get(valueId)!);
			this.scheduledPolls.delete(valueId);
			return true;
		}
		return false;
	}

	public get endpointCountIsDynamic(): boolean | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			property: "countIsDynamic",
		});
	}

	public get endpointsHaveIdenticalCapabilities(): boolean | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			property: "identicalCapabilities",
		});
	}

	public get individualEndpointCount(): number | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			property: "individualCount",
		});
	}

	public get aggregatedEndpointCount(): number | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			property: "aggregatedCount",
		});
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
		if (deviceClass && this._deviceClass) {
			return new DeviceClass(
				this.driver.configManager,
				this._deviceClass.basic.key,
				deviceClass.generic,
				deviceClass.specific,
			);
		}
		// fall back to the node's device class if it is known
		return this._deviceClass;
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
		return (
			(this.individualEndpointCount || 0) +
			(this.aggregatedEndpointCount || 0)
		);
	}

	/**
	 * Returns indizes of all endpoints on the node.
	 */
	public getEndpointIndizes(): number[] {
		let ret = this.getValue<number[]>(getEndpointIndizesValueId());
		if (!ret) {
			// Endpoint indizes not stored, assume sequential endpoints
			ret = [];
			for (let i = 1; i <= this.getEndpointCount(); i++) {
				ret.push(i);
			}
		}
		return ret;
	}

	/** Whether the Multi Channel CC has been interviewed and all endpoint information is known */
	private get isMultiChannelInterviewComplete(): boolean {
		return !!this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			endpoint: 0,
			property: "interviewComplete",
		});
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
		const ret: Endpoint[] = [this];
		// Check if the Multi Channel CC interview for this node is completed,
		// because we don't have all the endpoint information before that
		if (this.isMultiChannelInterviewComplete) {
			for (const i of this.getEndpointIndizes()) {
				const endpoint = this.getEndpoint(i);
				if (endpoint) ret.push(endpoint);
			}
		}
		return ret;
	}

	/**
	 * This tells us which interview stage was last completed
	 */
	public interviewStage: InterviewStage = InterviewStage.None;

	private _interviewAttempts: number = 0;
	/** How many attempts to interview this node have already been made */
	public get interviewAttempts(): number {
		return this._interviewAttempts;
	}

	private _hasEmittedNoNetworkKeyError: boolean = false;

	/** Utility function to check if this node is the controller */
	public isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}

	/**
	 * Resets all information about this node and forces a fresh interview.
	 * **Note:** This does nothing for the controller node.
	 *
	 * **WARNING:** Take care NOT to call this method when the node is already being interviewed.
	 * Otherwise the node information may become inconsistent.
	 */
	public async refreshInfo(): Promise<void> {
		// It does not make sense to re-interview the controller. All important information is queried
		// directly via the serial API
		if (this.isControllerNode()) return;

		// preserve the node name and location, since they might not be stored on the node
		const name = this.name;
		const location = this.location;

		this._interviewAttempts = 0;
		this.interviewStage = InterviewStage.None;
		this._ready = false;
		this._deviceClass = undefined;
		this._isListening = undefined;
		this._isFrequentListening = undefined;
		this._isRouting = undefined;
		this._supportedDataRates = undefined;
		this._isSecure = undefined;
		this._protocolVersion = undefined;
		this._nodeType = undefined;
		this._supportsSecurity = undefined;
		this._supportsBeaming = undefined;
		this._deviceConfig = undefined;
		this._neighbors = [];
		this._hasEmittedNoNetworkKeyError = false;
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

		// Also remove the information from the cache
		await this.driver.saveNetworkToCache();

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
			} catch (e: unknown) {
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
				await this.setInterviewStage(InterviewStage.CommandClasses);
			} else {
				return false;
			}
		}

		if (this.interviewStage === InterviewStage.CommandClasses) {
			// Load a config file for this node if it exists and overwrite the previously reported information
			await this.overwriteConfig();
		}

		if (this.interviewStage === InterviewStage.OverwriteConfig) {
			// Request a list of this node's neighbors
			// wotan-disable-next-line no-unstable-api-use
			if (!(await tryInterviewStage(() => this.queryNeighbors()))) {
				return false;
			}
		}

		await this.setInterviewStage(InterviewStage.Complete);
		this.readyMachine.send("INTERVIEW_DONE");

		// Tell listeners that the interview is completed
		// The driver will then send this node to sleep
		this.emit("interview completed", this);
		return true;
	}

	/** Updates this node's interview stage and saves to cache when appropriate */
	private async setInterviewStage(
		completedStage: InterviewStage,
	): Promise<void> {
		this.interviewStage = completedStage;
		this.emit(
			"interview stage completed",
			this,
			getEnumMemberName(InterviewStage, completedStage),
		);
		// Also save to the cache after certain stages
		switch (completedStage) {
			case InterviewStage.ProtocolInfo:
			case InterviewStage.NodeInfo:
			case InterviewStage.CommandClasses:
			case InterviewStage.Complete:
				await this.driver.saveNetworkToCache();
		}
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
		this._isListening = resp.isListening;
		this._isFrequentListening = resp.isFrequentListening;
		this._isRouting = resp.isRouting;
		this._supportedDataRates = resp.supportedDataRates;
		this._protocolVersion = resp.protocolVersion;
		this._nodeType = resp.nodeType;
		this._supportsSecurity = resp.supportsSecurity;
		this._supportsBeaming = resp.supportsBeaming;
		this._isSecure = unknownBoolean;

		this.applyDeviceClass(resp.deviceClass);

		const logMessage = `received response for protocol info:
basic device class:    ${this.deviceClass!.basic.label}
generic device class:  ${this.deviceClass!.generic.label}
specific device class: ${this.deviceClass!.specific.label}
node type:             ${getEnumMemberName(NodeType, this._nodeType)}
is always listening:   ${this.isListening}
is frequent listening: ${this.isFrequentListening}
can route messages:    ${this.isRouting}
supports security:     ${this._supportsSecurity}
supports beaming:      ${this._supportsBeaming}
maximum data rate:     ${this.maxDataRate} kbps
protocol version:      ${this._protocolVersion}`;
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

		await this.setInterviewStage(InterviewStage.ProtocolInfo);
	}

	/** Node interview: pings the node to see if it responds */
	public async ping(): Promise<boolean> {
		if (this.isControllerNode()) {
			this.driver.controllerLog.logNode(
				this.id,
				"not pinging the controller",
			);
		} else {
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
			} catch (e) {
				this.driver.controllerLog.logNode(
					this.id,
					`ping failed: ${e.message}`,
				);
				return false;
			}
		}
		return true;
	}

	/**
	 * Step #5 of the node interview
	 * Request node info
	 */
	protected async queryNodeInfo(): Promise<void> {
		if (this.isControllerNode()) {
			this.driver.controllerLog.logNode(
				this.id,
				"not querying node info from the controller",
			);
		} else {
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
			} else if (
				resp instanceof ApplicationUpdateRequestNodeInfoReceived
			) {
				const logLines: string[] = [
					"node info received",
					"supported CCs:",
				];
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
		}
		await this.setInterviewStage(InterviewStage.NodeInfo);
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
		const interviewEndpoint = async (
			endpoint: Endpoint,
			cc: CommandClasses,
		): Promise<"continue" | false | void> => {
			let instance: CommandClass;
			try {
				instance = endpoint.createCCInstance(cc)!;
			} catch (e: unknown) {
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
			if (endpoint.isCCSecure(cc) && !this.driver.securityManager) {
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
				await instance.interview();
			} catch (e: unknown) {
				if (isTransmissionError(e)) {
					// We had a CAN or timeout during the interview
					// or the node is presumed dead. Abort the process
					return false;
				}
				// we want to pass all other errors through
				throw e;
			}

			try {
				if (cc === CommandClasses.Version && endpoint.index === 0) {
					// After the version CC interview of the root endpoint, we have enough info to load the correct device config file
					await this.loadDeviceConfig();
					if (this._deviceConfig?.compat?.treatBasicSetAsEvent) {
						// To create the compat event value, we need to force a Basic CC interview
						this.addCC(CommandClasses.Basic, {
							isSupported: true,
							version: 1,
						});
					}
				}
				await this.driver.saveNetworkToCache();
			} catch (e) {
				this.driver.controllerLog.print(
					`${getCCName(cc)}: Error after interview:\n${e.message}`,
					"error",
				);
			}
		};

		// Always interview Security first because it changes the interview order
		if (
			this.supportsCC(CommandClasses.Security) &&
			// At this point we're not sure if the node is included securely
			this._isSecure !== false
		) {
			// Security is always supported *securely*
			this.addCC(CommandClasses.Security, { secure: true });

			if (!this.driver.securityManager) {
				if (!this._hasEmittedNoNetworkKeyError) {
					// Cannot interview a secure device securely without a network key
					const errorMessage = `supports Security, but no network key was configured. Continuing interview non-securely.`;
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
					this._hasEmittedNoNetworkKeyError = true;
				}
			} else {
				await interviewEndpoint(this, CommandClasses.Security);
			}
		} else if (
			!this.supportsCC(CommandClasses.Security) &&
			this._isSecure === unknownBoolean
		) {
			// Remember that this node is not secure
			this._isSecure = false;
		}

		// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
		// to map the Basic CC to other CCs or expose Basic Set as an event
		const compat = this._deviceConfig?.compat;
		if (!compat?.disableBasicMapping && !compat?.treatBasicSetAsEvent) {
			this.hideBasicCCInFavorOfActuatorCCs();
		}

		// We determine the correct interview order by topologically sorting a dependency graph
		const rootInterviewGraph = this.buildCCInterviewGraph();
		let rootInterviewOrder: CommandClasses[];

		// In order to avoid emitting unnecessary value events for the root endpoint,
		// we defer the application CC interview until after the other endpoints
		// have been interviewed
		const deferApplicationCCs: Comparer<CommandClasses> = (cc1, cc2) => {
			const cc1IsApplicationCC = applicationCCs.includes(cc1);
			const cc2IsApplicationCC = applicationCCs.includes(cc2);
			return ((cc1IsApplicationCC ? 1 : 0) -
				(cc2IsApplicationCC ? 1 : 0)) as CompareResult;
		};
		try {
			rootInterviewOrder = topologicalSort(
				rootInterviewGraph,
				deferApplicationCCs,
			);
		} catch (e) {
			// This interview cannot be done
			throw new ZWaveError(
				"The CC interview cannot be completed because there are circular dependencies between CCs!",
				ZWaveErrorCodes.CC_Invalid,
			);
		}

		// Now that we know the correct order, do the interview in sequence
		let rootCCIndex = 0;
		for (; rootCCIndex < rootInterviewOrder.length; rootCCIndex++) {
			const cc = rootInterviewOrder[rootCCIndex];
			// Once we reach the application CCs, pause the root endpoint interview
			if (applicationCCs.includes(cc)) break;
			const action = await interviewEndpoint(this, cc);
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// Now query ALL endpoints
		for (const endpointIndex of this.getEndpointIndizes()) {
			const endpoint = this.getEndpoint(endpointIndex);
			if (!endpoint) continue;

			// Always interview Security first because it changes the interview order
			if (
				endpoint.supportsCC(CommandClasses.Security) &&
				// The root endpoint has been interviewed, so we know it the device supports security
				this._isSecure === true &&
				// Only interview SecurityCC if the network key was set
				this.driver.securityManager
			) {
				// Security is always supported *securely*
				endpoint.addCC(CommandClasses.Security, { secure: true });

				const action = await interviewEndpoint(
					endpoint,
					CommandClasses.Security,
				);
				if (typeof action === "boolean") return action;
			}

			// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
			// to map the Basic CC to other CCs or expose Basic Set as an event
			if (!compat?.disableBasicMapping && !compat?.treatBasicSetAsEvent) {
				endpoint.hideBasicCCInFavorOfActuatorCCs();
			}

			const endpointInterviewGraph = endpoint.buildCCInterviewGraph();
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
		for (; rootCCIndex < rootInterviewOrder.length; rootCCIndex++) {
			const cc = rootInterviewOrder[rootCCIndex];
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
					await instance.interview();
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to interview CC ${getCCName(cc)}, endpoint ${
							endpoint.index
						}: ${e.message}`,
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
					await instance.refreshValues();
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to refresh values for ${getCCName(
							cc,
						)}, endpoint ${endpoint.index}: ${e.message}`,
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
					await cc.refreshValues();
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to refresh values for ${getCCName(
							cc.ccId,
						)}, endpoint ${endpoint.index}: ${e.message}`,
						"error",
					);
				}
			}
		}
	}

	/** Overwrites the reported configuration with information from a config file */
	protected async overwriteConfig(): Promise<void> {
		if (this.isControllerNode()) {
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

		await this.setInterviewStage(InterviewStage.OverwriteConfig);
	}

	/**
	 * Queries the controller for a node's neighbor nodes during the node interview
	 * @deprecated This should be done on demand, not once
	 */
	protected async queryNeighbors(): Promise<void> {
		this._neighbors = await this.driver.controller.getNodeNeighbors(
			this.id,
		);
		await this.setInterviewStage(InterviewStage.Neighbors);
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
			// skip the root to endpoint mapping if the root endpoint values are not meant to mirror endpoint 1
			!this._deviceConfig?.compat?.preserveRootApplicationCCValueIDs
		) {
			// Find the first endpoint that supports the received CC - if there is none, we don't map the report
			for (const endpoint of this.getAllEndpoints()) {
				if (endpoint.index === 0) continue;
				if (!endpoint.supportsCC(command.ccId)) continue;
				// Force the CC to store its values again under the supporting endpoint
				this.driver.controllerLog.logNode(
					this.nodeId,
					`Mapping unsolicited report from root device to first supporting endpoint #${endpoint.index}`,
				);
				command.endpointIndex = endpoint.index;
				command.persistValues();
				break;
			}
		}

		if (command instanceof BasicCC) {
			return this.handleBasicCommand(command);
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
		} else if (command instanceof HailCC) {
			return this.handleHail(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCGet) {
			return this.handleFirmwareUpdateGet(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCStatusReport) {
			return this.handleFirmwareUpdateStatusReport(command);
		} else if (command instanceof EntryControlCCNotification) {
			return this.handleEntryControlNotification(command);
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
		const { queue, currentTransaction } = this.driver[
			"sendThread"
		].state.context;
		const isNonceReport = (t: Transaction | undefined) =>
			!!t &&
			t.message.getNodeId() === this.nodeId &&
			isCommandClassContainer(t.message) &&
			t.message.command instanceof SecurityCCNonceReport;
		if (
			isNonceReport(currentTransaction) ||
			queue.find((t) => isNonceReport(t))
		) {
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
				message: `failed to send nonce: ${e}`,
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

	private handleHail(_command: HailCC): void {
		// treat this as a sign that the node is awake
		this.markAsAwake();

		this.driver.controllerLog.logNode(this.nodeId, {
			message: `Hail received from node, refreshing actuator and sensor values...`,
		});
		void this.refreshValues();
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
			// The wakeup interval is specified in seconds. Also add 5 seconds tolerance to avoid
			// unnecessary queries since there might be some delay. A wakeup interval of 0 means manual wakeup,
			// so the interval shouldn't be verified
			if (
				wakeUpInterval > 0 &&
				(now - this.lastWakeUp) / 1000 > wakeUpInterval + 5
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
				API = ((this.commandClasses as any)[
					ccName
				] as CCAPI).withOptions({
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
					message: `error during API call: ${e}`,
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
		if (command.alarmType) {
			// This is a V1 alarm, just store the only two values it has
			command.persistValues();
			return;
		} else if (command.notificationType == undefined) {
			this.driver.controllerLog.logNode(this.id, {
				message: `received unsupported notification ${stringify(
					command,
				)}`,
				direction: "inbound",
			});
			return;
		}

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

	private handleClockReport(command: ClockCCReport): void {
		// A Z-Wave Plus node SHOULD issue a Clock Report Command via the Lifeline Association Group if they
		// suspect to have inaccurate time and/or weekdays (e.g. after battery removal).
		// A controlling node SHOULD compare the received time and weekday with its current time and set the
		// time again at the supporting node if a deviation is observed (e.g. different weekday or more than a
		// minute difference)
		const now = new Date();
		// local time
		const hours = now.getHours();
		let minutes = now.getMinutes();
		// A sending node knowing the current time with seconds precision SHOULD round its
		// current time to the nearest minute when sending this command.
		if (now.getSeconds() >= 30) {
			minutes = (minutes + 1) % 60;
		}
		// Sunday is 0 in JS, but 7 in Z-Wave
		let weekday = now.getDay();
		if (weekday === 0) weekday = 7;

		if (
			command.weekday !== weekday ||
			command.hour !== hours ||
			command.minute !== minutes
		) {
			const endpoint = command.getEndpoint();
			if (!endpoint || !endpoint.commandClasses.Clock.isSupported()) {
				// Make sure the endpoint supports the CC (GH#1704)
				return;
			}

			this.driver.controllerLog.logNode(
				this.nodeId,
				`detected a deviation of the node's clock, updating it...`,
			);
			endpoint.commandClasses.Clock.set(hours, minutes, weekday).catch(
				() => {
					// Don't throw when the update fails
				},
			);
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
			throw new ZWaveError(
				`The node did not respond in time`,
				ZWaveErrorCodes.Controller_NodeTimeout,
			);
		}
		if (target === 0 && !meta.firmwareUpgradable) {
			throw new ZWaveError(
				`The Z-Wave chip firmware is not upgradable`,
				ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
			);
		} else if (version < 3 && target !== 0) {
			throw new ZWaveError(
				`Upgrading different firmware targets requires version 3+`,
				ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
			);
		} else if (
			target < 0 ||
			(target > 0 && meta.additionalFirmwareIDs.length < target)
		) {
			throw new ZWaveError(
				`Firmware target #${target} not found!`,
				ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
			);
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
			this._firmwareUpdateStatus = undefined;
			this.keepAwake = false;
		} catch (e: unknown) {
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
			this._firmwareUpdateStatus.getTimeout = this._firmwareUpdateStatus.getTimeout
				.refresh()
				.unref();
		}

		// When a node requests a firmware update fragment, it must be awake
		try {
			this.markAsAwake();
		} catch {
			/* ignore */
		}

		// Send the response(s) in the background
		void (async () => {
			const {
				numFragments,
				data,
				fragmentSize,
				abort,
			} = this._firmwareUpdateStatus!;
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
		this._firmwareUpdateStatus = undefined;
		this.keepAwake = false;

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
		this._firmwareUpdateStatus = undefined;
		this.keepAwake = false;

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
			const report = await this.driver.waitForCommand<FirmwareUpdateMetaDataCCStatusReport>(
				(cc) =>
					cc.nodeId === this.nodeId &&
					cc instanceof FirmwareUpdateMetaDataCCStatusReport,
				// Wait up to 5 minutes. It should never take that long, but the specs
				// don't say anything specific
				5 * 60000,
			);

			this.handleFirmwareUpdateStatusReport(report);
		} catch (e: unknown) {
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
				this._firmwareUpdateStatus = undefined;
				this.keepAwake = false;

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

	private recentEntryControlNotificationSequenceNumbers: number[] = [];
	private handleEntryControlNotification(
		command: EntryControlCCNotification,
	): void {
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

		// Notify listeners
		this.emit(
			"notification",
			this,
			CommandClasses["Entry Control"],
			pick(command, ["eventType", "dataType", "eventData"]),
		);
	}

	/**
	 * @internal
	 * Serializes this node in order to store static data in a cache
	 */
	public serialize(): JSONObject {
		const ret = {
			id: this.id,
			interviewStage: InterviewStage[this.interviewStage],
			deviceClass: this.deviceClass && {
				basic: this.deviceClass.basic.key,
				generic: this.deviceClass.generic.key,
				specific: this.deviceClass.specific.key,
			},
			neighbors: [...this._neighbors].sort(),
			isListening: this.isListening,
			isFrequentListening: this.isFrequentListening,
			isRouting: this.isRouting,
			supportedDataRates: this.supportedDataRates,
			protocolVersion: this.protocolVersion,
			nodeType:
				this.nodeType != undefined
					? NodeType[this.nodeType]
					: undefined,
			supportsSecurity: this.supportsSecurity,
			supportsBeaming: this.supportsBeaming,
			isSecure: this.isSecure ?? unknownBoolean,
			commandClasses: {} as JSONObject,
		};
		// Sort the CCs by their key before writing to the object
		const sortedCCs = [
			...this.implementedCommandClasses.keys(),
		].sort((a, b) => Math.sign(a - b));
		for (const cc of sortedCCs) {
			const serializedCC = {
				name: CommandClasses[cc],
				endpoints: {} as Record<string, CommandClassInfo>,
			};
			// We store the support and version information in this location rather than in the version CC
			// Therefore request the information from all endpoints
			for (const endpoint of this.getAllEndpoints()) {
				if (endpoint.implementedCommandClasses.has(cc)) {
					serializedCC.endpoints[
						endpoint.index.toString()
					] = endpoint.implementedCommandClasses.get(cc)!;
				}
			}
			ret.commandClasses[num2hex(cc)] = serializedCC as any;
		}
		return (ret as any) as JSONObject;
	}

	/**
	 * @internal
	 * Deserializes the information of this node from a cache.
	 */
	public async deserialize(obj: any): Promise<void> {
		if (obj.interviewStage in InterviewStage) {
			this.interviewStage =
				typeof obj.interviewStage === "number"
					? obj.interviewStage
					: InterviewStage[obj.interviewStage];

			// Mark already-interviewed nodes as potentially ready
			if (this.interviewStage === InterviewStage.Complete) {
				this.readyMachine.send("RESTART_FROM_CACHE");
			}
		}
		if (isObject(obj.deviceClass)) {
			const { basic, generic, specific } = obj.deviceClass;
			if (
				typeof basic === "number" &&
				typeof generic === "number" &&
				typeof specific === "number"
			) {
				this._deviceClass = new DeviceClass(
					this.driver.configManager,
					basic,
					generic,
					specific,
				);
			}
		}

		// Parse single properties
		const tryParse = (
			key: Extract<keyof ZWaveNode, string>,
			type: "boolean" | "number" | "string",
		): void => {
			if (typeof obj[key] === type)
				this[`_${key}` as keyof this] = obj[key];
		};
		const tryParseLegacy = (
			keys: string[],
			types: ("boolean" | "number" | "string")[],
		): void => {
			for (const key of keys) {
				if (types.includes(typeof obj[key] as any)) {
					this[`_${keys[0]}` as keyof this] = obj[key];
					return;
				}
			}
		};
		tryParse("isListening", "boolean");
		tryParseLegacy(["isFrequentListening"], ["string", "boolean"]);
		if ((this._isFrequentListening as any) === true) {
			// fallback for legacy cache files
			this._isFrequentListening = "1000ms";
		}
		tryParse("isRouting", "boolean");
		// isSecure may be boolean or "unknown"
		tryParse("isSecure", "string");
		tryParse("isSecure", "boolean");
		tryParse("supportsSecurity", "boolean");
		tryParse("supportsBeaming", "boolean");
		tryParseLegacy(["supportsBeaming", "isBeaming"], ["string"]);
		tryParse("protocolVersion", "number");
		if (!this._protocolVersion) {
			// The legacy version field was off by 1
			if (typeof obj.version === "number") {
				this._protocolVersion = obj.version - 1;
			}
		}
		if (obj.nodeType in NodeType) {
			this._nodeType = NodeType[obj.nodeType] as any;
		}
		if (typeof obj.maxBaudRate === "number") {
			this._supportedDataRates = [obj.maxBaudRate];
		}
		if (
			isArray(obj.supportedDataRates) &&
			obj.supportedDataRates.every((r: unknown) => typeof r === "number")
		) {
			this._supportedDataRates = obj.supportedDataRates;
		}

		if (isArray(obj.neighbors)) {
			// parse only valid node IDs
			this._neighbors = obj.neighbors.filter(
				(n: any) => typeof n === "number" && n > 0 && n <= MAX_NODES,
			);
		}

		function enforceType(
			val: any,
			type: "boolean" | "number" | "string",
		): any {
			return typeof val === type ? val : undefined;
		}

		// We need to cache the endpoint CC support until all CCs have been deserialized
		const endpointCCSupport = new Map<
			number,
			Map<number, Partial<CommandClassInfo>>
		>();

		// Parse CommandClasses
		if (isObject(obj.commandClasses)) {
			const ccDict = obj.commandClasses;
			for (const ccHex of Object.keys(ccDict)) {
				// First make sure this key describes a valid CC
				if (!/^0x[0-9a-fA-F]+$/.test(ccHex)) continue;
				const ccNum = parseInt(ccHex);
				if (!(ccNum in CommandClasses)) continue;

				// Parse the information we have
				const {
					values,
					metadata,
					// Starting with v2.4.2, the CC versions are stored in the endpoints object
					endpoints,
					// These are for compatibility with older versions
					isSupported,
					isControlled,
					version,
				} = ccDict[ccHex];
				if (isObject(endpoints)) {
					// New cache file with a dictionary of CC support information
					const support = new Map<
						number,
						Partial<CommandClassInfo>
					>();
					for (const endpointIndex of Object.keys(endpoints)) {
						// First make sure this key is a number
						if (!/^\d+$/.test(endpointIndex)) continue;
						const numEndpointIndex = parseInt(endpointIndex, 10);

						// Verify the info object
						const info = endpoints[
							endpointIndex
						] as CommandClassInfo;
						info.isSupported = enforceType(
							info.isSupported,
							"boolean",
						);
						info.isControlled = enforceType(
							info.isControlled,
							"boolean",
						);
						info.version = enforceType(info.version, "number");

						// Update the root endpoint immediately, save non-root endpoint information for later
						if (numEndpointIndex === 0) {
							this.addCC(ccNum, info);
						} else {
							support.set(numEndpointIndex, info);
						}
					}
					endpointCCSupport.set(ccNum, support);
				} else {
					// Legacy cache with single properties for the root endpoint
					this.addCC(ccNum, {
						isSupported: enforceType(isSupported, "boolean"),
						isControlled: enforceType(isControlled, "boolean"),
						version: enforceType(version, "number"),
					});
				}

				// In pre-3.0 cache files, the metadata and values array must be deserialized before creating endpoints
				// Post 3.0, the driver takes care of loading them before deserializing nodes
				// In order to understand pre-3.0 cache files, leave this deserialization code in

				// Metadata must be deserialized before values since that may be necessary to correctly translate value IDs
				if (isArray(metadata) && metadata.length > 0) {
					// If any exist, deserialize the metadata aswell
					const ccInstance = this.createCCInstanceUnsafe(ccNum);
					if (ccInstance) {
						// In v2.0.0, propertyName was changed to property. The network caches might still reference the old property names
						for (const m of metadata) {
							if ("propertyName" in m) {
								m.property = m.propertyName;
								delete m.propertyName;
							}
						}
						try {
							ccInstance.deserializeMetadataFromCache(
								metadata as CacheMetadata[],
							);
						} catch (e) {
							this.driver.controllerLog.logNode(this.id, {
								message: `Error during deserialization of CC value metadata from cache:\n${e}`,
								level: "error",
							});
						}
					}
				}
				if (isArray(values) && values.length > 0) {
					// If any exist, deserialize the values aswell
					const ccInstance = this.createCCInstanceUnsafe(ccNum);
					if (ccInstance) {
						// In v2.0.0, propertyName was changed to property. The network caches might still reference the old property names
						for (const v of values) {
							if ("propertyName" in v) {
								v.property = v.propertyName;
								delete v.propertyName;
							}
						}
						try {
							ccInstance.deserializeValuesFromCache(
								values as CacheValue[],
							);
						} catch (e) {
							this.driver.controllerLog.logNode(this.id, {
								message: `Error during deserialization of CC values from cache:\n${e}`,
								level: "error",
							});
						}
					}
				}
			}
		}

		// Now restore the CC versions for each non-root endpoint
		for (const [cc, support] of endpointCCSupport) {
			for (const [endpointIndex, info] of support) {
				const endpoint = this.getEndpoint(endpointIndex);
				if (!endpoint) continue;
				endpoint.addCC(cc, info);
			}
		}

		// And restore the device config
		await this.loadDeviceConfig();
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
}
