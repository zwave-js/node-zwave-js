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
	MAX_NODES,
	Maybe,
	MetadataUpdatedArgs,
	NodeUpdatePayload,
	sensorCCs,
	timespan,
	topologicalSort,
	unknownBoolean,
	ValueDB,
	ValueID,
	valueIdToString,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	getEnumMemberName,
	JSONObject,
	Mixin,
	num2hex,
	pick,
	stringify,
} from "@zwave-js/shared";
import type { Comparer, CompareResult } from "alcalzone-shared/comparable";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { randomBytes } from "crypto";
import { EventEmitter } from "events";
import { CCAPI, ignoreTimeout } from "../commandclass/API";
import { getHasLifelineValueId } from "../commandclass/AssociationCC";
import { BasicCC, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import {
	CentralSceneCCNotification,
	CentralSceneKeys,
	getSceneValueId,
} from "../commandclass/CentralSceneCC";
import { ClockCCReport } from "../commandclass/ClockCC";
import { CommandClass, getCCValueMetadata } from "../commandclass/CommandClass";
import {
	FirmwareUpdateMetaDataCC,
	FirmwareUpdateMetaDataCCGet,
	FirmwareUpdateMetaDataCCStatusReport,
	FirmwareUpdateRequestStatus,
	FirmwareUpdateStatus,
} from "../commandclass/FirmwareUpdateMetaDataCC";
import { HailCC } from "../commandclass/HailCC";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import {
	getManufacturerIdValueId,
	getProductIdValueId,
	getProductTypeValueId,
} from "../commandclass/ManufacturerSpecificCC";
import { getEndpointCCsValueId } from "../commandclass/MultiChannelCC";
import {
	getNodeLocationValueId,
	getNodeNameValueId,
} from "../commandclass/NodeNamingCC";
import {
	NotificationCC,
	NotificationCCReport,
} from "../commandclass/NotificationCC";
import {
	getDimmingDurationValueID,
	getSceneIdValueID,
	SceneActivationCCSet,
} from "../commandclass/SceneActivationCC";
import {
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import { getFirmwareVersionsValueId } from "../commandclass/VersionCC";
import {
	getWakeUpIntervalValueId,
	WakeUpCC,
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
	Baudrate,
	GetNodeProtocolInfoRequest,
	GetNodeProtocolInfoResponse,
} from "../controller/GetNodeProtocolInfoMessages";
import {
	GetRoutingInfoRequest,
	GetRoutingInfoResponse,
} from "../controller/GetRoutingInfoMessages";
import type { Driver } from "../driver/Driver";
import { Extended, interpretEx } from "../driver/StateMachineShared";
import type { Message } from "../message/Message";
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
	TranslatedValueID,
	ZWaveNodeEventCallbacks,
	ZWaveNodeEvents,
	ZWaveNodeValueEventCallbacks,
} from "./Types";
import { InterviewStage, NodeStatus } from "./Types";

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
	) {
		// Define this node's intrinsic endpoint as the root device (0)
		super(id, driver, 0);

		this._valueDB = new ValueDB(id, driver.valueDB!, driver.metadataDB!);
		for (const event of [
			"value added",
			"value updated",
			"value removed",
			"value notification",
			"metadata updated",
		] as const) {
			this._valueDB.on(event, this.translateValueEvent.bind(this, event));
		}

		this._deviceClass = deviceClass;
		// Add mandatory CCs
		if (deviceClass) {
			for (const cc of deviceClass.mandatorySupportedCCs) {
				this.addCC(cc, { isSupported: true });
			}
			for (const cc of deviceClass.mandatoryControlledCCs) {
				this.addCC(cc, { isControlled: true });
			}
		}
		// Add optional CCs
		for (const cc of supportedCCs) this.addCC(cc, { isSupported: true });
		for (const cc of controlledCCs) this.addCC(cc, { isControlled: true });

		// Create and hook up the status machine
		this.statusMachine = interpretEx(
			createNodeStatusMachine(
				this,
				{
					notifyAwakeTimeoutElapsed: () => {
						this.driver.driverLog.print(
							`The awake timeout for node ${this.id} has elapsed. Assuming it is asleep.`,
							"verbose",
						);
					},
				},
				driver.options.timeouts,
			),
		);
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
			this.sceneActivationResetTimeout,
			this.centralSceneKeyHeldDownContext?.timeout,
			...this.notificationIdleTimeouts.values(),
			...this.manualRefreshTimers.values(),
		]) {
			if (timeout) clearTimeout(timeout);
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
			applicationCCs.includes(arg.commandClass)
		) {
			// Iterate through all possible non-root endpoints of this node and
			// check if there is a value ID that mirrors root endpoint functionality
			for (
				let endpoint = 1;
				endpoint <= this.getEndpointCount();
				endpoint++
			) {
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

	/**
	 * @internal
	 * Call this whenever a node responds to an active request to refresh the time it is assumed awake
	 */
	public refreshAwakeTimer(): void {
		this.statusMachine.send("TRANSACTION_COMPLETE");
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

	private _deviceClass: DeviceClass | undefined;
	public get deviceClass(): DeviceClass | undefined {
		return this._deviceClass;
	}

	private _isListening: boolean | undefined;
	public get isListening(): boolean | undefined {
		return this._isListening;
	}

	private _isFrequentListening: boolean | undefined;
	public get isFrequentListening(): boolean | undefined {
		return this._isFrequentListening;
	}

	private _isRouting: boolean | undefined;
	public get isRouting(): boolean | undefined {
		return this._isRouting;
	}

	private _maxBaudRate: Baudrate | undefined;
	public get maxBaudRate(): Baudrate | undefined {
		return this._maxBaudRate;
	}

	private _isSecure: Maybe<boolean> | undefined;
	public get isSecure(): Maybe<boolean> | undefined {
		return this._isSecure;
	}
	public set isSecure(value: Maybe<boolean> | undefined) {
		this._isSecure = value;
	}

	private _version: number | undefined;
	/** The Z-Wave protocol version this node implements */
	public get version(): number | undefined {
		return this._version;
	}

	private _isBeaming: boolean | undefined;
	public get isBeaming(): boolean | undefined {
		return this._isBeaming;
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

	public get nodeType(): ZWavePlusNodeType | undefined {
		return this.getValue(getNodeTypeValueId());
	}

	public get roleType(): ZWavePlusRoleType | undefined {
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

	private _neighbors: readonly number[] = [];
	/** The IDs of all direct neighbors of this node */
	public get neighbors(): readonly number[] {
		return this._neighbors;
	}

	private _nodeInfoReceived: boolean = false;

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
		for (const endpoint of this.getAllEndpoints()) {
			for (const [cc, info] of endpoint.implementedCommandClasses) {
				// Don't return value IDs which are only controlled
				if (!info.isSupported) continue;
				const ccInstance = endpoint.createCCInstanceUnsafe(cc);
				if (ccInstance) {
					ret.push(...ccInstance.getDefinedValueIDs());
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
			return true;
		} catch (e: unknown) {
			// Define which errors during setValue are expected and won't crash
			// the driver:
			if (e instanceof ZWaveError) {
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

	private getEndpointCCs(index: number): CommandClasses[] | undefined {
		return this.getValue(
			getEndpointCCsValueId(
				this.endpointsHaveIdenticalCapabilities ? 1 : index,
			),
		);
	}

	/** Returns the current endpoint count of this node */
	public getEndpointCount(): number {
		return (
			(this.individualEndpointCount || 0) +
			(this.aggregatedEndpointCount || 0)
		);
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
		// Check if the requested endpoint exists on the physical node
		if (index > this.getEndpointCount()) return undefined;
		// Check if the Multi Channel CC interview for this node is completed,
		// because we don't have all the information before that
		if (!this.isMultiChannelInterviewComplete) {
			this.driver.driverLog.print(
				`Node ${this.nodeId}, Endpoint ${index}: Trying to access endpoint instance before Multi Channel interview`,
				"error",
			);
			return undefined;
		}
		// Create an endpoint instance if it does not exist
		if (!this._endpointInstances.has(index)) {
			this._endpointInstances.set(
				index,
				new Endpoint(
					this.id,
					this.driver,
					index,
					this.getEndpointCCs(index),
				),
			);
		}
		return this._endpointInstances.get(index)!;
	}

	/** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
	public getAllEndpoints(): Endpoint[] {
		const ret: Endpoint[] = [this];
		// Check if the Multi Channel CC interview for this node is completed,
		// because we don't have all the endpoint information before that
		if (this.isMultiChannelInterviewComplete) {
			for (let i = 1; i <= this.getEndpointCount(); i++) {
				// Iterating over the endpoint count ensures that we don't get undefined
				ret.push(this.getEndpoint(i)!);
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
	 *
	 * WARNING: Take care NOT to call this method when the node is already being interviewed.
	 * Otherwise the node information may become inconsistent.
	 */
	public async refreshInfo(): Promise<void> {
		this._interviewAttempts = 0;
		this.interviewStage = InterviewStage.None;
		this._nodeInfoReceived = false;
		this._ready = false;
		this._deviceClass = undefined;
		this._isListening = undefined;
		this._isFrequentListening = undefined;
		this._isRouting = undefined;
		this._maxBaudRate = undefined;
		this._isSecure = undefined;
		this._version = undefined;
		this._isBeaming = undefined;
		this._deviceConfig = undefined;
		this._neighbors = [];
		this._hasEmittedNoNetworkKeyError = false;
		this._valueDB.clear({ noEvent: true });
		this._endpointInstances.clear();
		super.reset();

		// Restart all state machines
		this.readyMachine.restart();
		this.statusMachine.restart();

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
				if (
					e instanceof ZWaveError &&
					(e.code === ZWaveErrorCodes.Controller_NodeTimeout ||
						e.code === ZWaveErrorCodes.Controller_ResponseNOK ||
						e.code === ZWaveErrorCodes.Controller_CallbackNOK ||
						e.code === ZWaveErrorCodes.Controller_MessageDropped)
				) {
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
			await this.queryProtocolInfo();
		}

		if (this.interviewStage === InterviewStage.ProtocolInfo) {
			// Ping node to check if it is alive/asleep/...
			// TODO: #739, point 3 -> Do this automatically for the first message
			await this.ping();
			if (!(await tryInterviewStage(() => this.queryNodeInfo()))) {
				return false;
			}
		}

		// The node is deemed ready when has been interviewed completely at least once
		if (this.interviewStage === InterviewStage.RestartFromCache) {
			// Mark listening nodes as potentially ready. The first message will determine if it is
			this.readyMachine.send("RESTART_INTERVIEW_FROM_CACHE");

			// Ping node to check if it is alive/asleep/...
			// TODO: #739, point 3 -> Do this automatically for the first message
			await this.ping();
		}

		// At this point the basic interview of new nodes is done. Start here when re-interviewing known nodes
		// to get updated information about command classes
		if (
			this.interviewStage === InterviewStage.RestartFromCache ||
			this.interviewStage === InterviewStage.NodeInfo
		) {
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
			if (!(await tryInterviewStage(() => this.queryNeighbors()))) {
				return false;
			}
		}

		await this.setInterviewStage(InterviewStage.Complete);
		this.readyMachine.send("INTERVIEW_DONE");

		// Regularly query listening nodes for updated values
		this.scheduleManualValueRefreshesForListeningNodes();

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
		if (
			process.env.NODE_ENV !== "test" &&
			!(resp instanceof GetNodeProtocolInfoResponse)
		) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const Sentry: typeof import("@sentry/node") = require("@sentry/node");
			Sentry.captureMessage(
				"Response to GetNodeProtocolInfoRequest is not a GetNodeProtocolInfoResponse",
				{
					contexts: {
						message: {
							name: ((resp as any) as Message).constructor.name,
							type: ((resp as any) as Message).type,
							functionType: ((resp as any) as Message)
								.functionType,
							...((resp as any) as Message).toLogEntry(),
						},
					},
				},
			);
		}
		this._deviceClass = resp.deviceClass;
		for (const cc of this._deviceClass.mandatorySupportedCCs) {
			this.addCC(cc, { isSupported: true });
		}
		for (const cc of this._deviceClass.mandatoryControlledCCs) {
			this.addCC(cc, { isControlled: true });
		}
		this._isListening = resp.isListening;
		this._isFrequentListening = resp.isFrequentListening;
		this._isRouting = resp.isRouting;
		this._maxBaudRate = resp.maxBaudRate;
		// Many nodes don't have this flag set, even if they are included securely
		// So we treat false as "unknown"
		this._isSecure = resp.isSecure || unknownBoolean;
		this._version = resp.version;
		this._isBeaming = resp.isBeaming;

		const logMessage = `received response for protocol info:
basic device class:    ${this._deviceClass.basic.label}
generic device class:  ${this._deviceClass.generic.label}
specific device class: ${this._deviceClass.specific.label}
is a listening device: ${this.isListening}
is frequent listening: ${this.isFrequentListening}
is a routing device:   ${this.isRouting}
is a secure device:    ${this.isSecure}
is a beaming device:   ${this.isBeaming}
maximum baud rate:     ${this.maxBaudRate} kbps
version:               ${this.version}`;
		this.driver.controllerLog.logNode(this.id, {
			message: logMessage,
			direction: "inbound",
		});

		if (!this.isListening && !this.isFrequentListening) {
			// This is a "sleeping" device which must support the WakeUp CC.
			// We are requesting the supported CCs later, but those commands may need to go into the
			// wakeup queue. Thus we need to mark WakeUp as supported
			this.addCC(CommandClasses["Wake Up"], {
				isSupported: true,
			});
			// Assume the node is awake, after all we're communicating with it.
			this.markAsAwake();
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
			if (
				(resp instanceof RequestNodeInfoResponse && !resp.wasSent) ||
				resp instanceof ApplicationUpdateRequestNodeInfoRequestFailed
			) {
				this.driver.controllerLog.logNode(
					this.id,
					`querying the node info failed`,
					"error",
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
	 * @param withFirmwareVersion Whether the firmware version should be considered while looking up the file
	 */
	protected async loadDeviceConfig(
		withFirmwareVersion: boolean = true,
	): Promise<void> {
		// But the configuration definitions might change
		if (
			this.manufacturerId != undefined &&
			this.productType != undefined &&
			this.productId != undefined
		) {
			// Try to load the config file
			this.driver.controllerLog.logNode(
				this.id,
				"trying to load device config",
			);
			this._deviceConfig = await this.driver.configManager.lookupDevice(
				this.manufacturerId,
				this.productType,
				this.productId,
				withFirmwareVersion ? this.firmwareVersion : false,
			);
			if (this._deviceConfig) {
				this.driver.controllerLog.logNode(
					this.id,
					"device config loaded",
				);
			} else {
				this.driver.controllerLog.logNode(
					this.id,
					"no device config loaded",
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
					e instanceof ZWaveError &&
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

			try {
				const task = () =>
					instance.interview(!instance.interviewComplete);
				if (actuatorCCs.includes(cc) || sensorCCs.includes(cc)) {
					// Ignore missing node responses for sensor and actuator CCs
					// because they sometimes don't respond to stuff they should respond to
					await ignoreTimeout(task);
				} else {
					// For all other CCs, abort the node interview since we're very likely missing critical information
					await task();
				}
			} catch (e: unknown) {
				if (
					e instanceof ZWaveError &&
					(e.code === ZWaveErrorCodes.Controller_MessageDropped ||
						e.code === ZWaveErrorCodes.Controller_CallbackNOK ||
						e.code === ZWaveErrorCodes.Controller_ResponseNOK ||
						e.code === ZWaveErrorCodes.Controller_NodeTimeout)
				) {
					// We had a CAN or timeout during the interview
					// or the node is presumed dead. Abort the process
					return false;
				}
				// we want to pass all other errors through
				throw e;
			}

			try {
				if (
					cc === CommandClasses["Manufacturer Specific"] &&
					endpoint.index === 0
				) {
					// After the manufacturer specific interview we have enough info to load
					// fallback config files without firmware version
					await this.loadDeviceConfig(false);
				} else if (
					cc === CommandClasses.Version &&
					endpoint.index === 0
				) {
					// After the version CC interview of the root endpoint, we have enough info to load the correct device config file
					await this.loadDeviceConfig();
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
				const action = await interviewEndpoint(
					this,
					CommandClasses.Security,
				);
				if (this._isSecure === true && action === false) {
					// The node is definitely included securely, but we got no response to the interview question
					return false;
				} else if (action === false || action === "continue") {
					// Assume that the node is not actually included securely
					this.driver.controllerLog.logNode(
						this.nodeId,
						`The node is not included securely. Continuing interview non-securely.`,
					);
					this._isSecure = false;
				} else {
					// We got a response, so we know the node is included securely
					if (this._isSecure !== true) {
						this.driver.controllerLog.logNode(
							this.nodeId,
							`The node is included securely.`,
						);
					}
					this._isSecure = true;
				}
			}
		} else if (
			!this.supportsCC(CommandClasses.Security) &&
			this._isSecure === unknownBoolean
		) {
			// Remember that this node is not secure
			this._isSecure = false;
		}

		// Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
		// to map the Basic CC to other CCs
		if (!this._deviceConfig?.compat?.disableBasicMapping) {
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
		for (
			let endpointIndex = 1;
			endpointIndex <= this.getEndpointCount();
			endpointIndex++
		) {
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

			// Don't offer or interview the Basic CC if any actuator CC is supported
			endpoint.hideBasicCCInFavorOfActuatorCCs();

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
		if (!this._nodeInfoReceived) {
			for (const cc of nodeInfo.supportedCCs)
				this.addCC(cc, { isSupported: true });
			for (const cc of nodeInfo.controlledCCs)
				this.addCC(cc, { isControlled: true });
			this._nodeInfoReceived = true;
		}

		// As the NIF is sent on wakeup, treat this as a sign that the node is awake
		this.markAsAwake();

		// SDS14223 Unless unsolicited <XYZ> Report Commands are received,
		// a controlling node MUST probe the current values when the
		// supporting node issues a Wake Up Notification Command for sleeping nodes.

		// This is not the handler for wakeup notifications, but some legacy devices send this
		// message whenever there's an update
		if (this.requiresManualValueRefresh()) {
			this.driver.controllerLog.logNode(this.nodeId, {
				message: `Node does not send unsolicited updates, refreshing actuator and sensor values...`,
			});
			void this.refreshValues();
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
	 * Schedules the regular refreshes of some CC values
	 */
	private scheduleManualValueRefreshesForListeningNodes(): void {
		// Only schedule this for listening nodes. Sleeping nodes are queried on wakeup
		if (this.supportsCC(CommandClasses["Wake Up"])) return;
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
	 * Refreshes all non-static values of a single CC from this node.
	 * WARNING: It is not recommended to await this method!
	 */
	private async refreshCCValues(cc: CommandClasses): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			const instance = endpoint.createCCInstanceUnsafe(cc);
			if (instance) {
				// Don't do a complete interview, only dynamic values
				try {
					await instance.interview(false);
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
	 * Refreshes all non-static values from this node.
	 * WARNING: It is not recommended to await this method!
	 */
	private async refreshValues(): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			for (const cc of endpoint.getSupportedCCInstances()) {
				// Only query actuator and sensor CCs
				if (
					!actuatorCCs.includes(cc.ccId) &&
					!sensorCCs.includes(cc.ccId)
				) {
					continue;
				}
				// Don't do a complete interview, only dynamic values
				try {
					await cc.interview(false);
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
		}

		await this.setInterviewStage(InterviewStage.OverwriteConfig);
	}

	/** @internal */
	public async queryNeighborsInternal(): Promise<void> {
		this.driver.controllerLog.logNode(this.id, {
			message: "requesting node neighbors...",
			direction: "outbound",
		});
		try {
			const resp = await this.driver.sendMessage<GetRoutingInfoResponse>(
				new GetRoutingInfoRequest(this.driver, {
					nodeId: this.id,
					removeBadLinks: false,
					removeNonRepeaters: false,
				}),
			);
			if (
				process.env.NODE_ENV !== "test" &&
				!(resp instanceof GetRoutingInfoResponse)
			) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const Sentry: typeof import("@sentry/node") = require("@sentry/node");
				Sentry.captureMessage(
					"Response to GetRoutingInfoRequest is not a GetRoutingInfoResponse",
					{
						contexts: {
							message: {
								name: ((resp as any) as Message).constructor
									.name,
								type: ((resp as any) as Message).type,
								functionType: ((resp as any) as Message)
									.functionType,
								...((resp as any) as Message).toLogEntry(),
							},
						},
					},
				);
			}
			this._neighbors = resp.nodeIds;
			this.driver.controllerLog.logNode(this.id, {
				message: `  node neighbors received: ${this._neighbors.join(
					", ",
				)}`,
				direction: "inbound",
			});
		} catch (e) {
			this.driver.controllerLog.logNode(
				this.id,
				`  requesting the node neighbors failed: ${e.message}`,
				"error",
			);
			throw e;
		}
	}

	/** Queries a node for its neighbor nodes during the node interview */
	protected async queryNeighbors(): Promise<void> {
		await this.queryNeighborsInternal();
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

		// If this is a report for the root endpoint and the node does not support Multi Channel Association CC V3+,
		// we need to map it to endpoint 1
		if (
			command.endpointIndex === 0 &&
			command.constructor.name.endsWith("Report") &&
			this.getEndpointCount() >= 1 &&
			// Don't check for MCA support or devices without it won't be handled
			// Instead rely on the version. If MCA is not supported, this will be 0
			this.getCCVersion(CommandClasses["Multi Channel Association"]) < 3
		) {
			// Force the CC to store its values again under endpoint 1
			command.endpointIndex = 1;
			command.persistValues();
		}

		if (command instanceof BasicCC) {
			return this.handleBasicCommand(command);
		} else if (command instanceof CentralSceneCCNotification) {
			return this.handleCentralSceneNotification(command);
		} else if (command instanceof WakeUpCCWakeUpNotification) {
			return this.handleWakeUpNotification();
		} else if (command instanceof NotificationCCReport) {
			return this.handleNotificationReport(command);
		} else if (command instanceof SceneActivationCCSet) {
			return this.handleSceneActivationSet(command);
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
		}

		// Ignore all commands that don't need to be handled
		if (command.constructor.name.endsWith("Report")) {
			// Reports are either a response to a Get command or
			// automatically store their values in the Value DB.
			// No need to manually handle them - other than what we've already done
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
		this.driver.rejectTransactions(
			(t) =>
				t.message.getNodeId() === this.nodeId &&
				isCommandClassContainer(t.message) &&
				t.message.command instanceof SecurityCCNonceReport,
			`Duplicate NonceReport was dropped`,
			ZWaveErrorCodes.Controller_MessageDropped,
		);

		// And also delete all previous nonces we sent the node since they
		// should no longer be used - except if a config flag forbids it
		// Devices using this flag may only delete the old nonce after the new one was acknowledged
		const keepUntilNext = !!this.deviceConfig?.compat?.keepS0NonceUntilNext;
		if (keepUntilNext) {
			this.driver.securityManager.deleteAllNoncesForReceiver(this.id);
		}

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
			if (this.centralSceneKeyHeldDownContext) {
				clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
			}
			this.centralSceneKeyHeldDownContext = {
				sceneNumber: command.sceneNumber,
				// Unref'ing long running timers allows the process to exit mid-timeout
				timeout: setTimeout(
					forceKeyUp,
					command.slowRefresh ? 60000 : 400,
				).unref(),
			};
		} else if (command.keyAttribute === CentralSceneKeys.KeyReleased) {
			// Stop the release timer
			if (this.centralSceneKeyHeldDownContext) {
				clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
				this.centralSceneKeyHeldDownContext = undefined;
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
				this.getValue<number>(getWakeUpIntervalValueId()) ?? 0;
			// The wakeup interval is specified in seconds. Also add 5 seconds tolerance to avoid
			// unnecessary queries since there might be some delay
			if ((now - this.lastWakeUp) / 1000 > wakeUpInterval + 5) {
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
			switch (this.deviceClass?.generic.key) {
				case 0x20: // Binary Sensor
					mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
						CommandClasses["Binary Sensor"],
					);
					break;
				// TODO: Which sensor type to use here?
				// case GenericDeviceClasses["Multilevel Sensor"]:
				// 	mappedTargetCC = this.createCCInstanceUnsafe(
				// 		CommandClasses["Multilevel Sensor"],
				// 	);
				// 	break;
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
			// Some devices send their current state using `BasicCCSet`s to their associations
			// instead of using reports. We still interpret them like reports
			this.driver.controllerLog.logNode(this.id, {
				message: "treating BasicCC Set as a report",
			});

			// Try to set the mapped value on the target CC
			const didSetMappedValue = mappedTargetCC?.setMappedBasicValue(
				command.targetValue,
			);

			// Otherwise fall back to setting it ourselves
			if (!didSetMappedValue) {
				// Sets cannot store their value automatically, so store the values manually
				this._valueDB.setValue(
					{
						commandClass: CommandClasses.Basic,
						endpoint: command.endpointIndex,
						property: "currentValue",
					},
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
			setTimeout(handler, 5 * 3600 * 1000 /* 5 minutes */).unref(),
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
				this.emit(
					"notification",
					this,
					valueConfig.label,
					command.eventParameters,
				);
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
			// Nodes before V8 don't necessarily reset the notification to idle
			// Set a fallback timer in case the node does not reset it.
			if (
				allowIdleReset &&
				this.driver.getSafeCCVersionForNode(
					CommandClasses.Notification,
					this.id,
				) <= 7
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

	private sceneActivationResetTimeout: NodeJS.Timeout | undefined;
	/** Handles the receipt of a SceneActivation Set and the automatic reset of the value */
	private handleSceneActivationSet(command: SceneActivationCCSet): void {
		if (this.sceneActivationResetTimeout) {
			clearTimeout(this.sceneActivationResetTimeout);
		}
		// Schedule a reset of the CC values
		this.sceneActivationResetTimeout = setTimeout(() => {
			this.sceneActivationResetTimeout = undefined;
			// Reset scene and duration to undefined
			this.valueDB.setValue(
				getSceneIdValueID(command.endpointIndex),
				undefined,
			);
			this.valueDB.setValue(
				getDimmingDurationValueID(command.endpointIndex),
				undefined,
			);
		}, command.dimmingDuration?.toMilliseconds() ?? 0).unref();
		// Unref'ing long running timeouts allows to quit the application before the timeout elapses
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
			if (!endpoint) return;

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
			firmwareId: meta.firmwareId,
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
				e instanceof ZWaveError &&
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
				e instanceof ZWaveError &&
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

	/**
	 * @internal
	 * Serializes this node in order to store static data in a cache
	 */
	public serialize(): JSONObject {
		const ret = {
			id: this.id,
			interviewStage:
				this.interviewStage >= InterviewStage.RestartFromCache
					? InterviewStage[InterviewStage.Complete]
					: InterviewStage[this.interviewStage],
			deviceClass: this.deviceClass && {
				basic: this.deviceClass.basic.key,
				generic: this.deviceClass.generic.key,
				specific: this.deviceClass.specific.key,
			},
			neighbors: [...this._neighbors].sort(),
			isListening: this.isListening,
			isFrequentListening: this.isFrequentListening,
			isRouting: this.isRouting,
			maxBaudRate: this.maxBaudRate,
			isSecure: this.isSecure ?? unknownBoolean,
			isBeaming: this.isBeaming,
			version: this.version,
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
		tryParse("isListening", "boolean");
		tryParse("isFrequentListening", "boolean");
		tryParse("isRouting", "boolean");
		tryParse("maxBaudRate", "number");
		// isSecure may be boolean or "unknown"
		tryParse("isSecure", "string");
		tryParse("isSecure", "boolean");
		tryParse("isBeaming", "boolean");
		tryParse("version", "number");

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

	/** Returns whether the node is currently assumed awake */
	public isAwake(): boolean {
		const isAsleep =
			this.supportsCC(CommandClasses["Wake Up"]) &&
			!WakeUpCC.isAwake(this);
		return !isAsleep;
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
		if (this.isAwake() && this.interviewStage === InterviewStage.Complete) {
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
