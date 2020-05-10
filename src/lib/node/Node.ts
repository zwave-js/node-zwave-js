import type { Comparer } from "alcalzone-shared/comparable";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { EventEmitter } from "events";
import type { CCAPI } from "../commandclass/API";
import { getHasLifelineValueId } from "../commandclass/AssociationCC";
import { BasicCC, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import {
	CentralSceneCCNotification,
	CentralSceneKeys,
	getSceneValueId,
} from "../commandclass/CentralSceneCC";
import { ClockCCReport } from "../commandclass/ClockCC";
import {
	CommandClass,
	CommandClassInfo,
	getCCValueMetadata,
} from "../commandclass/CommandClass";
import {
	actuatorCCs,
	applicationCCs,
	CommandClasses,
	getCCName,
	sensorCCs,
} from "../commandclass/CommandClasses";
import {
	getManufacturerIdValueId,
	getProductIdValueId,
	getProductTypeValueId,
} from "../commandclass/ManufacturerSpecificCC";
import { getEndpointCCsValueId } from "../commandclass/MultiChannelCC";
import { NotificationCCReport } from "../commandclass/NotificationCC";
import {
	getDimmingDurationValueID,
	getSceneIdValueID,
	SceneActivationCCSet,
} from "../commandclass/SceneActivationCC";
import { getFirmwareVersionsValueId } from "../commandclass/VersionCC";
import {
	getWakeUpIntervalValueId,
	WakeUpCC,
	WakeUpCCWakeUpNotification,
} from "../commandclass/WakeUpCC";
import { DeviceConfig, lookupDevice } from "../config/Devices";
import { lookupNotification } from "../config/Notifications";
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
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { timespan } from "../util/date";
import { topologicalSort } from "../util/graph";
import { getEnumMemberName, JSONObject, Mixin } from "../util/misc";
import { num2hex, stringify } from "../util/strings";
import type { CacheMetadata, CacheValue } from "../values/Cache";
import type { ValueMetadata } from "../values/Metadata";
import {
	BasicDeviceClasses,
	DeviceClass,
	GenericDeviceClass,
	GenericDeviceClasses,
	SpecificDeviceClass,
} from "./DeviceClass";
import { Endpoint } from "./Endpoint";
import type { NodeUpdatePayload } from "./NodeInfo";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "./RequestNodeInfoMessages";
import { InterviewStage, NodeStatus } from "./Types";
import type {
	TranslatedValueID,
	ZWaveNodeEventCallbacks,
	ZWaveNodeEvents,
	ZWaveNodeValueEventCallbacks,
} from "./Types";
import {
	MetadataUpdatedArgs,
	ValueDB,
	ValueID,
	valueIdToString,
} from "./ValueDB";

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
	): this;
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
			"metadata updated",
		] as const) {
			this._valueDB.on(event, this.translateValueEvent.bind(this, event));
		}

		this._deviceClass = deviceClass;
		for (const cc of supportedCCs) this.addCC(cc, { isSupported: true });
		for (const cc of controlledCCs) this.addCC(cc, { isControlled: true });
	}

	/**
	 * Cleans up all resources used by this node
	 */
	public destroy(): void {
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
				`Cannot translate a value ID for the non-implemented CC ${getEnumMemberName(
					CommandClasses,
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
			log.controller.value(changeType as any, logArgument as any);
		} else if (changeTarget === "metadata") {
			log.controller.metadataUpdated(logArgument);
		}
		//Don't expose value events for internal value IDs and root values ID that mirrors endpoint functionality
		if (
			!isInternalValue &&
			!this.shouldHideValueID(
				arg,
				this._valueDB.getValues(arg.commandClass),
			)
		) {
			// And pass the translated event to our listeners
			this.emit(eventName, this, outArg as any);
		}
	}

	private _status: NodeStatus = NodeStatus.Unknown;
	/**
	 * Which status the node is believed to be in. Changing this emits the corresponding events.
	 * There should be no need to set this property from outside this library.
	 */
	public get status(): NodeStatus {
		return this._status;
	}
	public set status(value: NodeStatus) {
		const oldStatus = this._status;
		this._status = value;

		if (oldStatus !== this._status) {
			if (oldStatus === NodeStatus.Dead) {
				this.emit("alive", this);
			}
			if (this._status === NodeStatus.Asleep) {
				this.emit("sleep", this);
			} else if (this._status === NodeStatus.Awake) {
				this.emit("wake up", this);
			} else if (this._status === NodeStatus.Dead) {
				this.emit("dead", this);
			}
		}

		// To be marked ready, a node must be known to be not dead
		if (
			this.nodeMayBeReady &&
			// listening nodes must have communicated with us
			((this._isListening && this._status === NodeStatus.Awake) ||
				// sleeping nodes are assumed to be ready
				(!this._isListening && this._status !== NodeStatus.Dead))
		) {
			this.emitReadyEventOnce();
		}
	}

	// The node is only ready when the interview has been completed
	// to a certain degree
	private nodeMayBeReady = false;
	private nodeReadyEmitted = false;
	/** Emits the ready event if it has not been emitted yet */
	private emitReadyEventOnce(): void {
		if (this.nodeReadyEmitted) return;
		this.emit("ready", this);
		log.controller.logNode(this.id, `node is ready`, "warn");
		this.nodeReadyEmitted = true;
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

	private _isSecure: boolean | undefined;
	public get isSecure(): boolean | undefined {
		return this._isSecure;
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

	private nodeInfoReceived: boolean = false;

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
		const ret: TranslatedValueID[] = [];
		for (const endpoint of this.getAllEndpoints()) {
			for (const cc of endpoint.implementedCommandClasses.keys()) {
				const ccInstance = endpoint.createCCInstanceUnsafe(cc);
				if (ccInstance) {
					ret.push(
						...ccInstance
							.getDefinedValueIDs()
							.map((id) => this.translateValueID(id)),
					);
				}
			}
		}

		// Application command classes of the Root Device capabilities that are also advertised by at
		// least one End Point SHOULD be filtered out by controlling nodes before presenting the functionalities
		// via service discovery mechanisms like mDNS or to users in a GUI.
		return this.filterRootApplicationCCValueIDs(ret);
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
	private filterRootApplicationCCValueIDs(
		allValueIds: TranslatedValueID[],
	): TranslatedValueID[] {
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
		} catch (e) {
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
				if (emitErrorEvent) this.driver.emit("error", e.message);
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
			log.driver.print(
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

	/** Utility function to check if this node is the controller */
	public isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}

	/**
	 * @internal
	 * Interviews this node. Returns true when it succeeded, false otherwise
	 */
	public async interview(): Promise<boolean> {
		if (this.interviewStage === InterviewStage.Complete) {
			log.controller.logNode(
				this.id,
				`skipping interview because it is already completed`,
			);
			return true;
		} else {
			log.controller.interviewStart(this);
		}

		// Remember that we tried to interview this node
		this._interviewAttempts++;

		// The interview is done in several stages. At each point, the interview process might be aborted
		// due to a stage failing. The reached stage is saved, so we can continue it later without
		// repeating stages unnecessarily

		if (this.interviewStage === InterviewStage.None) {
			// do a full interview starting with the protocol info
			log.controller.logNode(
				this.id,
				`new node, doing a full interview...`,
			);
			await this.queryProtocolInfo();
		}

		if (this.interviewStage === InterviewStage.ProtocolInfo) {
			await this.queryNodeInfo();
		}

		// // TODO:
		// // SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security

		// The node is deemed ready when has been interviewed completely at least once
		if (this.interviewStage === InterviewStage.RestartFromCache) {
			// Mark the node as potentially ready. The first message will determine if it is
			this.nodeMayBeReady = true;
			// Sleeping nodes are assumed to be ready immediately. Otherwise the library would wait until 3 messages have timed out, which is weird.
			if (!this._isListening) this.emitReadyEventOnce();
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
			await this.queryNeighbors();
		}

		await this.setInterviewStage(InterviewStage.Complete);

		this.nodeMayBeReady = true;
		this.emitReadyEventOnce();

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
		log.controller.interviewStage(this);
	}

	/** Step #1 of the node interview */
	protected async queryProtocolInfo(): Promise<void> {
		log.controller.logNode(this.id, {
			message: "querying protocol info...",
			direction: "outbound",
		});
		const resp = await this.driver.sendMessage<GetNodeProtocolInfoResponse>(
			new GetNodeProtocolInfoRequest(this.driver, { nodeId: this.id }),
		);
		this._deviceClass = resp.deviceClass;
		this._isListening = resp.isListening;
		this._isFrequentListening = resp.isFrequentListening;
		this._isRouting = resp.isRouting;
		this._maxBaudRate = resp.maxBaudRate;
		this._isSecure = resp.isSecure;
		this._version = resp.version;
		this._isBeaming = resp.isBeaming;

		let logMessage = "received response for protocol info:";
		if (this.deviceClass) {
			logMessage += `
basic device class:    ${BasicDeviceClasses[this.deviceClass.basic]} (${num2hex(
				this.deviceClass.basic,
			)})
generic device class:  ${this.deviceClass.generic.name} (${num2hex(
				this.deviceClass.generic.key,
			)})
specific device class: ${this.deviceClass.specific.name} (${num2hex(
				this.deviceClass.specific.key,
			)})`;
		}
		logMessage += `
is a listening device: ${this.isListening}
is frequent listening: ${this.isFrequentListening}
is a routing device:   ${this.isRouting}
is a secure device:    ${this.isSecure}
is a beaming device:   ${this.isBeaming}
is a listening device: ${this.isListening}
maximum baud rate:     ${this.maxBaudRate} kbps
version:               ${this.version}`;
		log.controller.logNode(this.id, {
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
			this.setAwake(true);
		}

		await this.setInterviewStage(InterviewStage.ProtocolInfo);
	}

	/** Node interview: pings the node to see if it responds */
	protected async ping(): Promise<boolean> {
		if (this.isControllerNode()) {
			log.controller.logNode(this.id, "not pinging the controller");
		} else {
			log.controller.logNode(this.id, {
				message: "pinging the node...",
				direction: "outbound",
			});

			try {
				await this.commandClasses["No Operation"].send();
				log.controller.logNode(this.id, {
					message: "ping successful",
					direction: "inbound",
				});
			} catch (e) {
				log.controller.logNode(this.id, "ping failed: " + e.message);
				return false;
			}
		}
		return true;
	}

	/** Step #5 of the node interview */
	protected async queryNodeInfo(): Promise<void> {
		if (this.isControllerNode()) {
			log.controller.logNode(
				this.id,
				"not querying node info from the controller",
			);
		} else {
			log.controller.logNode(this.id, {
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
				log.controller.logNode(
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
				log.controller.logNode(this.id, {
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
			log.controller.logNode(this.id, "trying to load device config");
			this._deviceConfig = await lookupDevice(
				this.manufacturerId,
				this.productType,
				this.productId,
				this.firmwareVersion,
			);
			if (this._deviceConfig) {
				log.controller.logNode(this.id, "device config loaded");
			} else {
				log.controller.logNode(
					this.id,
					"no device config loaded",
					"warn",
				);
			}
		}
	}

	/** Step #? of the node interview */
	protected async interviewCCs(): Promise<boolean> {
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
				(cc2IsApplicationCC ? 1 : 0)) as any;
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

		const interviewRootEndpoint = async (
			cc: CommandClasses,
		): Promise<"continue" | boolean | void> => {
			let instance: CommandClass;
			try {
				instance = this.createCCInstance(cc)!;
			} catch (e) {
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

			try {
				await instance.interview(!instance.interviewComplete);
			} catch (e) {
				if (
					e instanceof ZWaveError &&
					(e.code === ZWaveErrorCodes.Controller_MessageDropped ||
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
				if (cc === CommandClasses.Version) {
					// After the version CC interview, we have enough info to load the correct device config file
					await this.loadDeviceConfig();
				}
				await this.driver.saveNetworkToCache();
			} catch (e) {
				log.controller.print(
					`${getEnumMemberName(
						CommandClasses,
						cc,
					)}: Error after interview:\n${e.message}`,
					"error",
				);
			}
		};

		// Now that we know the correct order, do the interview in sequence
		let rootCCIndex = 0;
		for (; rootCCIndex < rootInterviewOrder.length; rootCCIndex++) {
			const cc = rootInterviewOrder[rootCCIndex];
			// Once we reach the application CCs, pause the root endpoint interview
			if (applicationCCs.includes(cc)) break;
			const action = await interviewRootEndpoint(cc);
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
				let instance: CommandClass;
				try {
					instance = endpoint.createCCInstance(cc)!;
				} catch (e) {
					if (
						e instanceof ZWaveError &&
						e.code === ZWaveErrorCodes.CC_NotSupported
					) {
						// The CC is no longer supported. This can happen if the node tells us
						// something different in the Version interview than it did in its NIF
						continue;
					}
					// we want to pass all other errors through
					throw e;
				}

				try {
					await instance.interview(!instance.interviewComplete);
				} catch (e) {
					if (
						e instanceof ZWaveError &&
						(e.code === ZWaveErrorCodes.Controller_MessageDropped ||
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
					await this.driver.saveNetworkToCache();
				} catch (e) {
					log.controller.print(
						`${getEnumMemberName(
							CommandClasses,
							cc,
						)}: Error after interview:\n${e.message}`,
						"error",
					);
				}
			}
		}

		// Continue with the application CCs for the root endpoint
		for (; rootCCIndex < rootInterviewOrder.length; rootCCIndex++) {
			const cc = rootInterviewOrder[rootCCIndex];
			const action = await interviewRootEndpoint(cc);
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// If a node or endpoint supports any actuator CC, don't offer the Basic CC
		for (const endpoint of this.getAllEndpoints()) {
			endpoint.hideBasicCCInFavorOfActuatorCCs();
		}

		// TODO: Overwrite the reported config with configuration files (like OZW does)

		return true;
	}

	/**
	 * @internal
	 * Handles the receipt of a NIF / NodeUpdatePayload
	 */
	public updateNodeInfo(nodeInfo: NodeUpdatePayload): void {
		if (!this.nodeInfoReceived) {
			for (const cc of nodeInfo.supportedCCs)
				this.addCC(cc, { isSupported: true });
			for (const cc of nodeInfo.controlledCCs)
				this.addCC(cc, { isControlled: true });
			this.nodeInfoReceived = true;
		}

		// As the NIF is sent on wakeup, treat this as a sign that the node is awake
		if (!this.isAwake()) this.setAwake(true);

		// SDS14223 Unless unsolicited <XYZ> Report Commands are received,
		// a controlling node MUST probe the current values when the
		// supporting node issues a Wake Up Notification Command for sleeping nodes.

		// This is not the handler for wakeup notifications, but some legacy devices send this
		// message whenever there's an update
		if (this.requiresManualValueRefresh()) {
			log.controller.logNode(this.nodeId, {
				message: `Node does not send unsolicited updates, refreshing actuator and sensor values...`,
			});
			this.refreshValues();
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
				this.refreshCCValues(cc);
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
					log.controller.logNode(
						this.id,
						`failed to refresh values for ${getEnumMemberName(
							CommandClasses,
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
					log.controller.logNode(
						this.id,
						`failed to refresh values for ${getEnumMemberName(
							CommandClasses,
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
			// TODO: Override stuff
		}
		await this.setInterviewStage(InterviewStage.OverwriteConfig);
	}

	/** @internal */
	public async queryNeighborsInternal(): Promise<void> {
		log.controller.logNode(this.id, {
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
			this._neighbors = resp.nodeIds;
			log.controller.logNode(this.id, {
				message: `  node neighbors received: ${this._neighbors.join(
					", ",
				)}`,
				direction: "inbound",
			});
		} catch (e) {
			log.controller.logNode(
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
	public async handleCommand(command: CommandClass): Promise<void> {
		// If the node sent us an unsolicited update, our initial assumption
		// was wrong. Stop querying it regularly for updates
		this.cancelManualValueRefresh(command.ccId);

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
		}

		// Ignore all commands that don't need to be handled
		if (command.constructor.name.endsWith("Report")) {
			// Reports are either a response to a Get command or
			// automatically store their values in the Value DB.
			// No need to manually handle them
			return;
		}

		log.controller.logNode(this.id, {
			message: `TODO: no handler for application command`,
			direction: "inbound",
		});
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
	private async handleCentralSceneNotification(
		command: CentralSceneCCNotification,
	): Promise<void> {
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
			this.valueDB.setValue(valueId, key);
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
		log.controller.logNode(this.id, {
			message: `received CentralScene notification ${stringify(command)}`,
			direction: "inbound",
		});
	}

	/** The timestamp of the last received wakeup notification */
	private lastWakeUp: number | undefined;

	/** Handles the receipt of a Wake Up notification */
	private handleWakeUpNotification(): void {
		log.controller.logNode(this.id, {
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

		this.setAwake(true);

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

		// In case there are no messages in the queue, the node may go back to sleep very soon
		this.driver.debounceSendNodeToSleep(this);
	}

	/** Handles the receipt of a BasicCC Set or Report */
	private async handleBasicCommand(command: BasicCC): Promise<void> {
		// Retrieve the endpoint the command is coming from
		const sourceEndpoint =
			this.getEndpoint(command.endpointIndex ?? 0) ?? this;

		// Depending on the generic device class, we may need to map the basic command to other CCs
		let mappedTargetCC: CommandClass | undefined;
		switch (this.deviceClass?.generic.key) {
			case GenericDeviceClasses["Binary Sensor"]:
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
			case GenericDeviceClasses["Binary Switch"]:
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Binary Switch"],
				);
				break;
			case GenericDeviceClasses["Multilevel Switch"]:
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Multilevel Switch"],
				);
				break;
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
			// TODO: find out if that breaks other devices
			log.controller.logNode(this.id, {
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
			log.controller.logNode(this.id, {
				message: `received unsupported notification ${stringify(
					command,
				)}`,
				direction: "inbound",
			});
			return;
		}

		// Look up the received notification in the config
		const notificationConfig = lookupNotification(command.notificationType);

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

			log.controller.logNode(
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
				basic: this.deviceClass.basic,
				generic: this.deviceClass.generic.key,
				specific: this.deviceClass.specific.key,
			},
			isListening: this.isListening,
			isFrequentListening: this.isFrequentListening,
			isRouting: this.isRouting,
			maxBaudRate: this.maxBaudRate,
			isSecure: this.isSecure,
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
				endpoints: {} as JSONObject,
			} as JSONObject;
			// We store the support and version information in this location rather than in the version CC
			// Therefore request the information from all endpoints
			for (const endpoint of this.getAllEndpoints()) {
				if (endpoint.implementedCommandClasses.has(cc)) {
					serializedCC.endpoints[
						endpoint.index
					] = endpoint.implementedCommandClasses.get(cc);
				}
			}
			ret.commandClasses[num2hex(cc)] = serializedCC;
		}
		return ret;
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
				const genericDC = GenericDeviceClass.get(generic);
				this._deviceClass = new DeviceClass(
					basic,
					genericDC,
					SpecificDeviceClass.get(genericDC.key, specific),
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
		tryParse("isSecure", "boolean");
		tryParse("isBeaming", "boolean");
		tryParse("version", "number");

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
						const info = (endpoints as any)[
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

				// TODO: Remove this code in the next major version

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
							log.controller.logNode(this.id, {
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
							log.controller.logNode(this.id, {
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
	 * @internal
	 * Changes the assumed sleep state of the node
	 * @param awake Whether the node should be assumed awake
	 */
	public setAwake(awake: boolean): void {
		if (!this.supportsCC(CommandClasses["Wake Up"])) return;
		WakeUpCC.setAwake(this, awake);
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
			log.controller.logNode(this.id, {
				message: "Sending node back to sleep...",
				direction: "outbound",
			});
			await this.commandClasses["Wake Up"].sendNoMoreInformation();
			this.setAwake(false);
			log.controller.logNode(this.id, "  Node asleep");

			msgSent = true;
		}

		this.isSendingNoMoreInformation = false;
		return msgSent;
	}
}
