import { composeObject } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { Overwrite } from "alcalzone-shared/types";
import { EventEmitter } from "events";
import { CCAPI } from "../commandclass/API";
import {
	CentralSceneCC,
	CentralSceneCCNotification,
	CentralSceneKeys,
} from "../commandclass/CentralSceneCC";
import {
	CommandClass,
	getCCConstructor,
	getCCValueMetadata,
} from "../commandclass/CommandClass";
import { CommandClasses, getCCName } from "../commandclass/CommandClasses";
import { ConfigurationCC } from "../commandclass/ConfigurationCC";
import { ManufacturerSpecificCC } from "../commandclass/ManufacturerSpecificCC";
import { NotificationCCReport } from "../commandclass/NotificationCC";
import { VersionCC } from "../commandclass/VersionCC";
import { WakeUpCC, WakeUpCCWakeUpNotification } from "../commandclass/WakeUpCC";
import { ZWavePlusCC } from "../commandclass/ZWavePlusCC";
import { lookupDevice } from "../config/Devices";
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
import { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject, Mixin } from "../util/misc";
import { num2hex, stringify } from "../util/strings";
import { CacheMetadata, CacheValue } from "../values/Cache";
import { ValueMetadata } from "../values/Metadata";
import {
	BasicDeviceClasses,
	DeviceClass,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "./DeviceClass";
import { Endpoint, EndpointCapabilities } from "./Endpoint";
import { InterviewStage, IZWaveNode, NodeStatus } from "./INode";
import { NodeUpdatePayload } from "./NodeInfo";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "./RequestNodeInfoMessages";
import {
	MetadataUpdatedArgs,
	ValueAddedArgs,
	ValueDB,
	ValueID,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "./ValueDB";

export interface ZWaveNodeValueAddedArgs extends ValueAddedArgs {
	commandClassName: string;
}
export interface ZWaveNodeValueUpdatedArgs extends ValueUpdatedArgs {
	commandClassName: string;
}
export interface ZWaveNodeValueRemovedArgs extends ValueRemovedArgs {
	commandClassName: string;
}
export interface ZWaveNodeMetadataUpdatedArgs extends MetadataUpdatedArgs {
	commandClassName: string;
}
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
export type ZWaveNodeMetadataUpdatedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeMetadataUpdatedArgs,
) => void;

interface ZWaveNodeValueEventCallbacks {
	"value added": ZWaveNodeValueAddedCallback;
	"value updated": ZWaveNodeValueUpdatedCallback;
	"value removed": ZWaveNodeValueRemovedCallback;
	"metadata updated": ZWaveNodeMetadataUpdatedCallback;
}

type ZWaveNodeEventCallbacks = Overwrite<
	{
		[K in "wake up" | "sleep" | "interview completed" | "dead" | "alive"]: (
			node: ZWaveNode,
		) => void;
	},
	ZWaveNodeValueEventCallbacks
>;

type ZWaveNodeEvents = Extract<keyof ZWaveNodeEventCallbacks, string>;

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
export class ZWaveNode extends Endpoint implements IZWaveNode {
	public constructor(
		public readonly id: number,
		driver: Driver,
		deviceClass?: DeviceClass,
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
	) {
		// Define this node's intrinsic endpoint as the root device (0)
		super(id, driver, 0);

		this._valueDB = new ValueDB();
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

	/** Adds the speaking name of a command class to the raw event args of the ValueDB */
	private translateValueEvent<T extends ValueID>(
		eventName: keyof ZWaveNodeValueEventCallbacks,
		arg: T,
	): void {
		// Try to retrieve the speaking CC name
		const commandClassName = getCCName(arg.commandClass);
		const outArg: T & { commandClassName: string } = {
			commandClassName,
			...arg,
		};
		const ccConstructor: typeof CommandClass =
			(getCCConstructor(arg.commandClass) as any) || CommandClass;
		// Try to retrieve the speaking property key
		if (arg.propertyKey != undefined) {
			const propertyKey = ccConstructor.translatePropertyKey(
				arg.propertyName,
				arg.propertyKey,
			);
			outArg.propertyKey = propertyKey;
		}
		// If this is a metadata event, make sure we return the merged metadata
		if ("metadata" in outArg) {
			((outArg as unknown) as MetadataUpdatedArgs).metadata = this.getValueMetadata(
				arg,
			);
		}
		// Log the value change
		const ccInstance = this.internalCreateCCInstance(arg.commandClass);
		const isInternalValue =
			ccInstance && ccInstance.isInternalValue(arg.propertyName as any);
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
		if (!isInternalValue) {
			// And pass the translated event to our listeners
			this.emit(eventName, this, outArg as any);
		}
	}

	//#region --- properties ---

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
		if (oldStatus === this._status) return;

		if (oldStatus !== NodeStatus.Unknown) {
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
		return this.getValue({
			commandClass: CommandClasses["Manufacturer Specific"],
			propertyName: "manufacturerId",
		});
	}

	public get productId(): number | undefined {
		return this.getValue({
			commandClass: CommandClasses["Manufacturer Specific"],
			propertyName: "productId",
		});
	}

	public get productType(): number | undefined {
		return this.getValue({
			commandClass: CommandClasses["Manufacturer Specific"],
			propertyName: "productType",
		});
	}

	public get firmwareVersion(): string | undefined {
		return this.getValue({
			commandClass: CommandClasses.Version,
			propertyName: "firmwareVersion",
		});
	}

	private _neighbors: readonly number[] = [];
	/** The IDs of all direct neighbors of this node */
	public get neighbors(): readonly number[] {
		return this._neighbors;
	}

	private nodeInfoReceived: boolean = false;

	private _valueDB = new ValueDB();
	/** @internal */
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
		const { commandClass, propertyName } = valueId;
		return {
			// Merge static metadata
			...getCCValueMetadata(commandClass, propertyName),
			// with potentially existing dynamic metadata
			...this._valueDB.getMetadata(valueId),
		};
	}

	/** Returns a list of all value names that are defined on all endpoints of this node */
	public getDefinedValueIDs(): ValueID[] {
		const ret: ValueID[] = [];
		for (const endpoint of this.getAllEndpoints()) {
			for (const cc of endpoint.implementedCommandClasses.keys()) {
				const ccInstance = this.createCCInstance(cc);
				if (ccInstance) {
					ret.push(
						...ccInstance
							.getDefinedPropertyNames()
							.filter(
								propertyName =>
									!ccInstance.isInternalValue(
										propertyName as any,
									),
							)
							.map(propertyName => ({
								commandClass: cc,
								endpoint: endpoint.index,
								propertyName,
							})),
					);
				}
			}
		}
		return ret;
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
					propertyName: valueId.propertyName,
					propertyKey: valueId.propertyKey,
				},
				value,
			);
			return true;
		} catch (e) {
			if (
				e instanceof ZWaveError &&
				(e.code === ZWaveErrorCodes.CC_NotImplemented ||
					e.code === ZWaveErrorCodes.CC_NoAPI)
			) {
				// This CC or API is not implemented
				return false;
			}
			throw e;
		}
	}

	public get endpointCountIsDynamic(): boolean | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			propertyName: "_endpointCountIsDynamic",
		});
	}

	public get endpointsHaveIdenticalCapabilities(): boolean | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			propertyName: "_endpointsHaveIdenticalCapabilities",
		});
	}

	public get individualEndpointCount(): number | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			propertyName: "_individualEndpointCount",
		});
	}

	public get aggregatedEndpointCount(): number | undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			propertyName: "_aggregatedEndpointCount",
		});
	}

	private get endpointCapabilities():
		| Map<number, EndpointCapabilities>
		| undefined {
		return this.getValue({
			commandClass: CommandClasses["Multi Channel"],
			propertyName: "_endpointCapabilities",
		});
	}

	private getEndpointCapabilities(
		index: number,
	): EndpointCapabilities | undefined {
		if (this.endpointCapabilities) {
			return this.endpointCapabilities.get(
				this.endpointsHaveIdenticalCapabilities ? 1 : index,
			);
		}
	}

	/** Returns the current endpoint count of this node */
	public getEndpointCount(): number {
		return (
			(this.individualEndpointCount || 0) +
			(this.aggregatedEndpointCount || 0)
		);
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
		// Create an endpoint instance if it does not exist
		if (!this._endpointInstances.has(index)) {
			this._endpointInstances.set(
				index,
				new Endpoint(
					this.id,
					this.driver,
					index,
					this.getEndpointCapabilities(index),
				),
			);
		}
		return this._endpointInstances.get(index)!;
	}

	/** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
	public getAllEndpoints(): Endpoint[] {
		const ret: Endpoint[] = [this];
		for (let i = 1; i < this.getEndpointCount(); i++) {
			// Iterating over the endpoint count ensures that we don't get undefined
			ret.push(this.getEndpoint(i)!);
		}
		return ret;
	}

	/**
	 * This tells us which interview stage was last completed
	 */
	public interviewStage: InterviewStage = InterviewStage.None;

	//#endregion

	/** Utility function to check if this node is the controller */
	public isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}

	//#region --- interview ---

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

		// The following stages require communication with the node. Before continuing, we
		// ping the node to see if it is alive and awake

		if (this.interviewStage >= InterviewStage.ProtocolInfo) {
			// Make sure the device answers
			if (!(await this.ping())) return false;
		}

		if (this.interviewStage === InterviewStage.ProtocolInfo) {
			await this.queryNodeInfo();
		}

		// TODO: Part of this should be done after the cache restart
		if (this.interviewStage === InterviewStage.NodeInfo) {
			await this.interviewCCs();
		}

		// // TODO:
		// // SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security

		// At this point the interview of new nodes is done. Start here when re-interviewing known nodes
		if (
			this.interviewStage === InterviewStage.RestartFromCache ||
			this.interviewStage === InterviewStage.CommandClasses
		) {
			// Load a config file for this node if it exists and overwrite the previously reported information
			await this.overwriteConfig();
		}

		if (this.interviewStage === InterviewStage.OverwriteConfig) {
			// Request a list of this node's neighbors
			await this.queryNeighbors();
		}

		// for testing purposes we skip to the end
		await this.setInterviewStage(InterviewStage.Complete);

		// Tell listeners that the interview is completed
		// The driver will send this node to sleep
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

	/** Step #3 of the node interview */
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

	/** Step #? of the node interview */
	protected async interviewCCs(): Promise<void> {
		// 1. Find out which device this is
		if (this.supportsCC(CommandClasses["Manufacturer Specific"])) {
			if (!ManufacturerSpecificCC.getInterviewComplete(this)) {
				await ManufacturerSpecificCC.interview(this.driver, this);
				await this.driver.saveNetworkToCache();
			}
		}
		// TODO: Overwrite the reported config with configuration files (like OZW does)

		// 2. Find out which versions we can use
		// This conditional is not necessary, but saves us a bunch of headaches during testing
		if (this.supportsCC(CommandClasses.Version)) {
			if (!VersionCC.getInterviewComplete(this)) {
				await VersionCC.interview(this.driver, this);
				await this.driver.saveNetworkToCache();
			}
		}

		// TODO: (GH#215) Correctly order CC interviews
		// All CCs require Version
		// ZW+ requires Multi Channel (if it is supported)
		// what else?...
		if (this.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
			if (!ZWavePlusCC.getInterviewComplete(this)) {
				await ZWavePlusCC.interview(this.driver, this);
				await this.driver.saveNetworkToCache();
			}
		}

		// TODO: (GH#214) Also query ALL endpoints!
		// 3. Perform all other CCs interviews
		const ccConstructors = [...this.implementedCommandClasses.keys()]
			.filter(
				cc =>
					cc !== CommandClasses.Version &&
					cc !== CommandClasses["Manufacturer Specific"] &&
					cc !== CommandClasses["Z-Wave Plus Info"],
			)
			// This assertion is not nice, but I see no better way
			.map(
				cc =>
					(getCCConstructor(cc) as unknown) as
						| (typeof CommandClass)
						| undefined,
			)
			.filter(cc => !!cc) as (typeof CommandClass)[];
		for (const cc of ccConstructors) {
			try {
				if (!cc.getInterviewComplete(this)) {
					await cc.interview(this.driver, this);
					await this.driver.saveNetworkToCache();
				}
			} catch (e) {
				log.controller.print(
					`${cc.name}: Interview failed:\n${e.message}`,
					"error",
				);
			}
		}
		await this.setInterviewStage(InterviewStage.CommandClasses);
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
			// TODO: Trigger a cache save
		}

		// As the NIF is sent on wakeup, treat this as a sign that the node is awake
		this.setAwake(true);
	}

	protected async overwriteConfig(): Promise<void> {
		if (this.isControllerNode()) {
			log.controller.logNode(
				this.id,
				"not loading device config for the controller",
			);
		} else if (
			this.manufacturerId == undefined ||
			this.productId == undefined ||
			this.productType == undefined
		) {
			log.controller.logNode(
				this.id,
				"device information incomplete, cannot load config file",
				"error",
			);
		} else {
			log.controller.logNode(this.id, "trying to load device config");
			const config = await lookupDevice(
				this.manufacturerId,
				this.productId,
				this.productType,
				this.firmwareVersion,
			);
			if (config) {
				if (isObject(config.configuration)) {
					const configCC = this.createCCInstance<ConfigurationCC>(
						CommandClasses.Configuration,
					)!;
					configCC.deserializeParamInformationFromConfig(
						config.configuration,
					);
				} else {
					log.controller.logNode(
						this.id,
						"  invalid config file!",
						"error",
					);
				}
			} else {
				log.controller.logNode(
					this.id,
					"  no device config file found!",
				);
			}
		}
		await this.setInterviewStage(InterviewStage.OverwriteConfig);
	}

	protected async queryNeighbors(): Promise<void> {
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
		await this.setInterviewStage(InterviewStage.Neighbors);
	}

	//#endregion

	// TODO: Add a handler around for each CC to interpret the received data

	/**
	 * @internal
	 * Handles an ApplicationCommandRequest received from this node
	 */
	public async handleCommand(command: CommandClass): Promise<void> {
		if (command instanceof CentralSceneCCNotification) {
			return this.handleCentralSceneNotification(command);
		} else if (command instanceof WakeUpCCWakeUpNotification) {
			return this.handleWakeUpNotification();
		} else if (command instanceof NotificationCCReport) {
			return this.handleNotificationReport(command);
		}

		log.controller.logNode(this.id, {
			message: `TODO: no handler for application command ${stringify(
				command,
			)}`,
			direction: "inbound",
		});
	}

	/** Stores information about a currently held down key */
	private centralSceneKeyHeldDownContext:
		| {
				timeout: NodeJS.Timer;
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
			const paddedSceneNumber = padStart(sceneNumber.toString(), 3, "0");
			const propertyName = `scene${paddedSceneNumber}`;
			const valueId = {
				commandClass: command.ccId,
				endpoint: command.endpoint,
				propertyName,
			};
			this.valueDB.setValue(
				valueId,
				CentralSceneCC.translatePropertyKey(propertyName, key),
			);
			this.valueDB.setMetadata(valueId, {
				...ValueMetadata.ReadOnly,
				label: `Scene ${paddedSceneNumber}`,
			});
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

	/** Handles the receipt of a Wake Up notification */
	private handleWakeUpNotification(): void {
		log.controller.logNode(this.id, {
			message: `received wakeup notification`,
			direction: "inbound",
		});
		this.setAwake(true);
	}

	/** Handles the receipt of a Notification Report */
	private handleNotificationReport(command: NotificationCCReport): void {
		// TODO: Do we need this?
		log.controller.logNode(this.id, {
			message: `received Notification ${stringify(command)}`,
			direction: "inbound",
		});
	}

	// /**
	//  * Requests the state for the CCs of this node
	//  * @param kind The kind of state to be requested
	//  * @param commandClasses The command classes to request the state for. Defaults to all
	//  */
	// public async requestState(
	// 	kind: StateKind,
	// 	commandClasses: CommandClasses[] = [
	// 		...this.implementedCommandClasses.keys(),
	// 	],
	// ): Promise<void> {
	// 	// TODO: Support multiple endpoints
	// 	const factories = commandClasses
	// 		// This assertion is not nice, but I see no better way
	// 		.map(
	// 			cc =>
	// 				(getCCConstructor(cc) as unknown) as
	// 					| (typeof CommandClass)
	// 					| undefined,
	// 		)
	// 		.filter(cc => !!cc)
	// 		.map(cc => () => cc!.requestState(this.driver, this, kind));
	// 	await promiseSequence(factories);
	// }

	/**
	 * @internal
	 * Serializes this node in order to store static data in a cache
	 */
	public serialize(): JSONObject {
		return {
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
			commandClasses: composeObject(
				[...this.implementedCommandClasses.entries()]
					.sort((a, b) => Math.sign(a[0] - b[0]))
					.map(([cc, info]) => {
						// Store the normal CC info
						const ret = {
							name: CommandClasses[cc],
							...info,
						} as any;
						// If the CC is implemented and has values or value metadata,
						// store them
						const ccInstance = this.createCCInstance(cc);
						if (ccInstance) {
							// Store values if there ara any
							const ccValues = ccInstance.serializeValuesForCache();
							if (ccValues.length > 0) ret.values = ccValues;
							const ccMetadata = ccInstance.serializeMetadataForCache();
							if (ccMetadata.length > 0)
								ret.metadata = ccMetadata;
						}
						return [num2hex(cc), ret] as [string, object];
					}),
			),
			endpointCountIsDynamic: this.endpointCountIsDynamic,
			endpointsHaveIdenticalCapabilities: this
				.endpointsHaveIdenticalCapabilities,
			individualEndpointCount: this.individualEndpointCount,
			aggregatedEndpointCount: this.aggregatedEndpointCount,
			endpoints:
				this.endpointCapabilities &&
				composeObject(
					[...this.endpointCapabilities.entries()]
						.sort((a, b) => Math.sign(a[0] - b[0]))
						.map(([cc, caps]) => {
							return [
								cc.toString(),
								{
									genericClass: caps.genericClass.key,
									specificClass: caps.specificClass.key,
									isDynamic: caps.isDynamic,
									supportedCCs: caps.supportedCCs,
								},
							] as [string, object];
						}),
				),
		};
	}

	/**
	 * @internal
	 * Deserializes the information of this node from a cache.
	 */
	public deserialize(obj: any): void {
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
					isSupported,
					isControlled,
					version,
					values,
					metadata,
				} = ccDict[ccHex];
				this.addCC(ccNum, {
					isSupported: enforceType(isSupported, "boolean"),
					isControlled: enforceType(isControlled, "boolean"),
					version: enforceType(version, "number"),
				});
				if (isArray(values) && values.length > 0) {
					// If any exist, deserialize the values aswell
					const ccInstance = this.createCCInstance(ccNum);
					if (ccInstance) {
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
				if (isArray(metadata) && metadata.length > 0) {
					// If any exist, deserialize the values aswell
					const ccInstance = this.createCCInstance(ccNum);
					if (ccInstance) {
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
			}
		}
		// Parse endpoint capabilities
		tryParse("endpointCountIsDynamic", "boolean");
		tryParse("endpointsHaveIdenticalCapabilities", "boolean");
		tryParse("individualEndpointCount", "number");
		tryParse("aggregatedEndpointCount", "number");
		if (isObject(obj.endpoints)) {
			const endpointDict = obj.endpoints;
			// Make sure the endpointCapabilities Map exists
			if (!this.endpointCapabilities) {
				this.valueDB.setValue(
					{
						commandClass: CommandClasses["Multi Channel"],
						endpoint: 0,
						propertyName: "_endpointCapabilities",
					},
					new Map(),
				);
			}
			for (const index of Object.keys(endpointDict)) {
				// First make sure this key describes a valid endpoint
				const indexNum = parseInt(index);
				if (
					indexNum < 1 ||
					indexNum >
						(this.individualEndpointCount || 0) +
							(this.aggregatedEndpointCount || 0)
				) {
					continue;
				}

				// Parse the information we have
				const {
					genericClass,
					specificClass,
					isDynamic,
					supportedCCs,
				} = endpointDict[index];
				if (
					typeof genericClass === "number" &&
					typeof specificClass === "number" &&
					typeof isDynamic === "boolean" &&
					isArray(supportedCCs) &&
					supportedCCs.every(cc => typeof cc === "number")
				) {
					this.endpointCapabilities!.set(indexNum, {
						genericClass: GenericDeviceClass.get(genericClass),
						specificClass: SpecificDeviceClass.get(
							genericClass,
							specificClass,
						),
						isDynamic,
						supportedCCs,
					});
				}
			}
		}
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
