import { promiseSequence } from "alcalzone-shared/async";
import { composeObject } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { Overwrite } from "alcalzone-shared/types";
import { EventEmitter } from "events";
import { CCAPI, CCAPIs } from "../commandclass/API";
import { CentralSceneCC } from "../commandclass/CentralSceneCC";
import {
	CommandClass,
	CommandClassInfo,
	getAPI,
	getCCConstructor,
	getImplementedVersion,
	StateKind,
} from "../commandclass/CommandClass";
import { CommandClasses, getCCName } from "../commandclass/CommandClasses";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import {
	ManufacturerSpecificCCGet,
	ManufacturerSpecificCCReport,
} from "../commandclass/ManufacturerSpecificCC";
import {
	MultiChannelCCEndPointGet,
	MultiChannelCCEndPointReport,
} from "../commandclass/MultiChannelCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import {
	VersionCCCommandClassGet,
	VersionCCCommandClassReport,
} from "../commandclass/VersionCC";
import {
	WakeUpCC,
	WakeUpCCIntervalGet,
	WakeUpCCIntervalReport,
	WakeUpCCIntervalSet,
	WakeUpCCNoMoreInformation,
	WakeUpCommand,
} from "../commandclass/WakeUpCC";
import {
	ZWavePlusCCGet,
	ZWavePlusCCReport,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "../commandclass/ZWavePlusCC";
import { lookupManufacturer } from "../config/Manufacturers";
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
import { SendDataRequest } from "../controller/SendDataMessages";
import { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { MessagePriority } from "../message/Constants";
import { log } from "../util/logger";
import { JSONObject } from "../util/misc";
import { num2hex, stringify } from "../util/strings";
import { CacheValue } from "../values/Cache";
import {
	BasicDeviceClasses,
	DeviceClass,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "./DeviceClass";
import { NodeUpdatePayload } from "./NodeInfo";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "./RequestNodeInfoMessages";
import {
	ValueAddedArgs,
	ValueBaseArgs,
	ValueDB,
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
export type ZWaveNodeValueAddedCallback = (
	args: ZWaveNodeValueAddedArgs,
) => void;
export type ZWaveNodeValueUpdatedCallback = (
	args: ZWaveNodeValueUpdatedArgs,
) => void;
export type ZWaveNodeValueRemovedCallback = (
	args: ZWaveNodeValueRemovedArgs,
) => void;

export interface ZWaveNodeValueEventCallbacks {
	"value added": ZWaveNodeValueAddedCallback;
	"value updated": ZWaveNodeValueUpdatedCallback;
	"value removed": ZWaveNodeValueRemovedCallback;
}

export type ZWaveNodeEventCallbacks = Overwrite<
	{
		[K in "wake up" | "sleep" | "interview completed" | "dead" | "alive"]: (
			node: ZWaveNode,
		) => void
	},
	ZWaveNodeValueEventCallbacks
>;

export type ZWaveNodeEvents = Extract<keyof ZWaveNodeEventCallbacks, string>;

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
}

// prettier-ignore
export enum InterviewStage {
	None,					// [✓] Query process hasn't started for this node
	ProtocolInfo,			// [✓] Retrieve protocol information
	NodeInfo,				// [✓] Retrieve info about supported and controlled command classes
	NodePlusInfo,			// [✓] Retrieve ZWave+ info and update device classes
	ManufacturerSpecific,	// [✓] Retrieve manufacturer name and product ids, overwrite node info with configuration data
	SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security
	Versions,				// [✓] Retrieve version information
	Endpoints,				// [✓] Retrieve information about multiple command class endpoints
	Static,					// (✓) Retrieve static information we haven't received yet (doesn't change)

	// ===== the stuff above should never change =====
	RestartFromCache,		// This marks the beginning of re-interviews on application startup.
	// 						   RestartFromCache and later stages will be serialized as "Complete" in the cache
	// 						   [✓] Ping each device upon restarting with cached config
	// ===== the stuff below changes frequently, so it has to be redone on every start =====

	// TODO: Heal network

	WakeUp,					// [✓] Configure wake up to point to the master controller
	Associations,			// [ ] Retrieve information about associations
	Neighbors,				// [✓] Retrieve node neighbor list
	Session,				// [ ] Retrieve session information (changes infrequently)
	Dynamic,				// [ ] Retrieve dynamic information (changes frequently)
	Configuration,			// [ ] Retrieve configurable parameter information (only done on request)
	Complete,				// [✓] Query process is completed for this node
}

export enum NodeStatus {
	Unknown,
	Asleep,
	Awake,
	Dead,
}
export class ZWaveNode extends EventEmitter {
	public constructor(
		public readonly id: number,
		private readonly driver: Driver,
		deviceClass?: DeviceClass,
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
	) {
		super();

		this._valueDB = new ValueDB();
		for (const event of [
			"value added",
			"value updated",
			"value removed",
		] as const) {
			this._valueDB.on(event, this.translateValueEvent.bind(this, event));
		}

		this._deviceClass = deviceClass;
		for (const cc of supportedCCs) this.addCC(cc, { isSupported: true });
		for (const cc of controlledCCs) this.addCC(cc, { isControlled: true });
	}

	/** Adds the speaking name of a command class to the raw event args of the ValueDB */
	private translateValueEvent<T extends ValueBaseArgs>(
		eventName: keyof ZWaveNodeValueEventCallbacks,
		arg: T,
	): void {
		// Try to retrieve the speaking CC name
		const commandClassName = getCCName(arg.commandClass);
		const outArg: T & { commandClassName: string } = {
			commandClassName,
			...arg,
		};
		// Try to retrieve the speaking property key
		if (arg.propertyKey != undefined) {
			const ccConstructor: typeof CommandClass =
				(getCCConstructor(arg.commandClass) as any) || CommandClass;
			const propertyKey = ccConstructor.translatePropertyKey(
				arg.propertyName,
				arg.propertyKey,
			);
			outArg.propertyKey = propertyKey;
		}
		this.emit(eventName, outArg);
	}

	//#region --- properties ---

	/** @internal */
	public readonly logPrefix = `[Node ${padStart(
		this.id.toString(),
		3,
		"0",
	)}] `;

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

	private _implementedCommandClasses = new Map<
		CommandClasses,
		CommandClassInfo
	>();
	/**
	 * @internal
	 * Information about the implemented Command Classes of this node.
	 */
	public get implementedCommandClasses(): ReadonlyMap<
		CommandClasses,
		CommandClassInfo
	> {
		return this._implementedCommandClasses;
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
	 * Retrieves a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The optional endpoint the value belongs to
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	public getValue(
		cc: CommandClasses,
		endpoint: number | undefined,
		propertyName: string,
		propertyKey?: number | string,
	): unknown {
		return this._valueDB.getValue(cc, endpoint, propertyName, propertyKey);
	}

	private _commandClassAPIs = new Map<CommandClasses, CCAPI>();
	private _commandClassAPIsProxy = new Proxy(this._commandClassAPIs, {
		get: (target, ccName: string) => {
			// The command classes are exposed to library users by their name, not the ID
			// Retrive the corresponding ID because we use it internally
			const ccId = (CommandClasses[ccName as any] as unknown) as
				| CommandClasses
				| undefined;
			if (ccId == undefined)
				throw new ZWaveError(
					`Command Class ${ccName} is not implemented! If you are sure that the name is correct, consider opening an issue at https://github.com/AlCalzone/node-zwave-js`,
					ZWaveErrorCodes.CC_NotImplemented,
				);

			// When accessing a CC API for the first time, we need to create it
			if (!target.has(ccId)) {
				const api = this.createAPI(ccId);
				target.set(ccId, api);
			}
			return target.get(ccId);
		},
	});
	/**
	 * Provides access to simplified APIs that are taylored to specific CCs.
	 * Make sure to check support of each API using `API.isSupported()` since
	 * all other API calls will throw if the API is not supported
	 */
	public get commandClasses(): CCAPIs {
		return (this._commandClassAPIsProxy as unknown) as CCAPIs;
	}

	/**
	 * @internal
	 * Creates an API instance for a given command class. Throws if no API is defined.
	 * @param ccId The command class to create an API instance for
	 */
	public createAPI(ccId: CommandClasses): CCAPI {
		const APIConstructor = getAPI(ccId);
		const ccName = CommandClasses[ccId];
		if (APIConstructor == undefined) {
			throw new ZWaveError(
				`Command Class ${ccName} has no associated API!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		const apiInstance = new APIConstructor(this.driver, this);
		return new Proxy(apiInstance, {
			get(target, property) {
				// Forbid access to the API if it is not supported by the node
				if (property !== "isSupported" && !target.isSupported()) {
					throw new ZWaveError(
						`Node ${
							this.id
						} does not support the Command Class ${ccName}!`,
						ZWaveErrorCodes.CC_NotSupported,
					);
				}
				return target[property as keyof CCAPI];
			},
		});
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

	/**
	 * Adds a CC to the list of command classes implemented by the node or updates the information.
	 * You shouldn't need to call this yourself.
	 * @param info The information about the command class. This is merged with existing information.
	 */
	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void {
		let ccInfo = this._implementedCommandClasses.has(cc)
			? this._implementedCommandClasses.get(cc)
			: {
					isSupported: false,
					isControlled: false,
					version: 0,
			  };
		ccInfo = Object.assign(ccInfo, info);
		this._implementedCommandClasses.set(cc, ccInfo);
	}

	/** Removes a CC from the list of command classes implemented by the node */
	public removeCC(cc: CommandClasses): void {
		this._implementedCommandClasses.delete(cc);
	}

	/** Tests if this node supports the given CommandClass */
	public supportsCC(cc: CommandClasses): boolean {
		return (
			this._implementedCommandClasses.has(cc) &&
			!!this._implementedCommandClasses.get(cc)!.isSupported
		);
	}

	/** Tests if this node controls the given CommandClass */
	public controlsCC(cc: CommandClasses): boolean {
		return (
			this._implementedCommandClasses.has(cc) &&
			!!this._implementedCommandClasses.get(cc)!.isControlled
		);
	}

	/**
	 * Retrieves the version of the given CommandClass this node implements.
	 * Returns 0 if the CC is not supported.
	 */
	public getCCVersion(cc: CommandClasses): number {
		const ccInfo = this._implementedCommandClasses.get(cc);
		return (ccInfo && ccInfo.version) || 0;
	}

	/**
	 * Creates an instance of the given CC, which is linked to this node.
	 * Throws if the CC is neither supported nor controlled by the node.
	 */
	// wotan-disable no-misused-generics
	public createCCInstance<T extends CommandClass>(
		cc: CommandClasses,
	): T | undefined {
		if (!this.supportsCC(cc) && !this.controlsCC(cc)) {
			throw new ZWaveError(
				`Cannot create an instance of the unsupported CC ${
					CommandClasses[cc]
				} (${num2hex(cc)})`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		const Constructor = getCCConstructor(cc);
		if (Constructor)
			return new Constructor(this.driver, { nodeId: this.id }) as T;
	}

	//#region --- interview ---

	/**
	 * @internal
	 * Interviews this node. Returns true when it succeeded, false otherwise
	 */
	public async interview(): Promise<boolean> {
		if (this.interviewStage === InterviewStage.Complete) {
			log(
				"controller",
				`${
					this.logPrefix
				}skipping interview because it is already completed`,
				"debug",
			);
			return true;
		} else {
			log(
				"controller",
				`${this.logPrefix}beginning interview... last completed step: ${
					InterviewStage[this.interviewStage]
				}`,
				"debug",
			);
		}

		// The interview is done in several stages. At each point, the interview process might be aborted
		// due to a stage failing. The reached stage is saved, so we can continue it later without
		// repeating stages unnecessarily

		if (this.interviewStage === InterviewStage.None) {
			// do a full interview starting with the protocol info
			log(
				"controller",
				`${this.logPrefix}new Node, doing a full interview...`,
				"debug",
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

		if (this.interviewStage === InterviewStage.NodeInfo) {
			await this.queryNodePlusInfo();
		}

		if (this.interviewStage === InterviewStage.NodePlusInfo) {
			// Request Manufacturer specific data
			await this.queryManufacturerSpecific();
			// TODO: Overwrite the reported config with configuration files (like OZW does)
		}

		// TODO:
		// SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security

		if (
			this.interviewStage ===
			InterviewStage.ManufacturerSpecific /* TODO: change .ManufacturerSpecific to .SecurityReport */
		) {
			await this.queryCCVersions();
		}

		if (this.interviewStage === InterviewStage.Versions) {
			await this.queryEndpoints();
		}

		if (this.interviewStage === InterviewStage.Endpoints) {
			await this.requestStaticValues();
		}

		// At this point the interview of new nodes is done. Start here when re-interviewing known nodes
		if (
			this.interviewStage === InterviewStage.RestartFromCache ||
			this.interviewStage === InterviewStage.Static
		) {
			// Configure the device so it notifies us of a wakeup
			await this.configureWakeup();
		}

		// TODO: Associations

		if (this.interviewStage === InterviewStage.WakeUp) {
			// TODO: change WakeUp to Associations
			// Request a list of this node's neighbors
			await this.queryNeighbors();
		}

		// for testing purposes we skip to the end
		await this.setInterviewStage(InterviewStage.Complete);
		log("controller", `${this.logPrefix}interview completed`, "debug");

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
			case InterviewStage.ManufacturerSpecific:
			case InterviewStage.NodeInfo:
			case InterviewStage.NodePlusInfo:
			case InterviewStage.Versions:
			case InterviewStage.Endpoints:
			case InterviewStage.Static:
			case InterviewStage.Complete:
				await this.driver.saveNetworkToCache();
		}
	}

	/** Step #1 of the node interview */
	protected async queryProtocolInfo(): Promise<void> {
		log("controller", `${this.logPrefix}querying protocol info`, "debug");
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

		// prettier-ignore
		{
		log("controller", `${this.logPrefix}received response for protocol info:`, "debug");
		if (this.deviceClass) {
			log("controller", `${this.logPrefix}  basic device class:    ${BasicDeviceClasses[this.deviceClass.basic]} (${num2hex(this.deviceClass.basic)})`, "debug");
			log("controller", `${this.logPrefix}  generic device class:  ${this.deviceClass.generic.name} (${num2hex(this.deviceClass.generic.key)})`, "debug");
			log("controller", `${this.logPrefix}  specific device class: ${this.deviceClass.specific.name} (${num2hex(this.deviceClass.specific.key)})`, "debug");
		}
		log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
		log("controller", `${this.logPrefix}  is frequent listening: ${this.isFrequentListening}`, "debug");
		log("controller", `${this.logPrefix}  is a routing device:   ${this.isRouting}`, "debug");
		log("controller", `${this.logPrefix}  is a secure device:    ${this.isSecure}`, "debug");
		log("controller", `${this.logPrefix}  is a beaming device:   ${this.isBeaming}`, "debug");
		log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
		log("controller", `${this.logPrefix}  maximum baud rate:     ${this.maxBaudRate} kbps`, "debug");
		log("controller", `${this.logPrefix}  version:               ${this.version}`, "debug");
		}

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
			log(
				"controller",
				`${this.logPrefix}not pinging the controller...`,
				"debug",
			);
		} else {
			log("controller", `${this.logPrefix}pinging the node...`, "debug");

			try {
				const request = new SendDataRequest(this.driver, {
					command: new NoOperationCC(this.driver, {
						nodeId: this.id,
					}),
				});
				// Don't retry sending ping packets
				request.maxSendAttempts = 1;
				// set the priority manually, as SendData can be Application level too
				await this.driver.sendMessage<SendDataRequest>(request, {
					priority: MessagePriority.NodeQuery,
				});
				log("controller", `${this.logPrefix}  ping succeeded`, "debug");
			} catch (e) {
				log(
					"controller",
					`${this.logPrefix}  ping failed: ${e.message}`,
					"debug",
				);
				return false;
			}
		}
		return true;
	}

	/** Step #5 of the node interview */
	protected async queryNodeInfo(): Promise<void> {
		if (this.isControllerNode()) {
			log(
				"controller",
				`${
					this.logPrefix
				}not querying node info from the controller...`,
				"debug",
			);
		} else {
			log("controller", `${this.logPrefix}querying node info`, "debug");
			const resp = await this.driver.sendMessage<
				RequestNodeInfoResponse | ApplicationUpdateRequest
			>(new RequestNodeInfoRequest(this.driver, { nodeId: this.id }));
			if (
				(resp instanceof RequestNodeInfoResponse && !resp.wasSent) ||
				resp instanceof ApplicationUpdateRequestNodeInfoRequestFailed
			) {
				log(
					"controller",
					`${this.logPrefix}  querying the node info failed`,
					"error",
				);
			} else if (
				resp instanceof ApplicationUpdateRequestNodeInfoReceived
			) {
				log(
					"controller",
					`${this.logPrefix}  received the node info`,
					"debug",
				);
				log("controller", `${this.logPrefix}  supported CCs:`, "debug");
				for (const cc of resp.nodeInformation.supportedCCs) {
					const ccName = CommandClasses[cc];
					log(
						"controller",
						`${this.logPrefix}    ${ccName ? ccName : num2hex(cc)}`,
						"debug",
					);
				}
				log(
					"controller",
					`${this.logPrefix}  controlled CCs:`,
					"debug",
				);
				for (const cc of resp.nodeInformation.controlledCCs) {
					const ccName = CommandClasses[cc];
					log(
						"controller",
						`${this.logPrefix}    ${ccName ? ccName : num2hex(cc)}`,
						"debug",
					);
				}
				this.updateNodeInfo(resp.nodeInformation);
				// TODO: Save the received values
			}
		}
		await this.setInterviewStage(InterviewStage.NodeInfo);
	}

	/** Step #6 of the node interview */
	protected async queryNodePlusInfo(): Promise<void> {
		if (!this.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
			log(
				"controller",
				`${
					this.logPrefix
				}skipping Z-Wave+ query because the device does not support it`,
				"debug",
			);
		} else {
			log(
				"controller",
				`${this.logPrefix}querying Z-Wave+ information`,
				"debug",
			);
			const cc = new ZWavePlusCCGet(this.driver, { nodeId: this.id });
			const request = new SendDataRequest(this.driver, { command: cc });
			try {
				// set the priority manually, as SendData can be Application level too
				const resp = await this.driver.sendMessage<SendDataRequest>(
					request,
					{ priority: MessagePriority.NodeQuery },
				);
				if (
					isCommandClassContainer(resp) &&
					resp.command instanceof ZWavePlusCCReport
				) {
					const zwavePlusResponse = resp.command;
					zwavePlusResponse.persistValues();
					// prettier-ignore
					{
					log("controller", `${this.logPrefix}received response for Z-Wave+ information:`, "debug");
					log("controller", `${this.logPrefix}  Z-Wave+ version: ${zwavePlusResponse.zwavePlusVersion}`, "debug");
					log("controller", `${this.logPrefix}  role type:       ${ZWavePlusRoleType[zwavePlusResponse.roleType]}`, "debug");
					log("controller", `${this.logPrefix}  node type:       ${ZWavePlusNodeType[zwavePlusResponse.nodeType]}`, "debug");
					log("controller", `${this.logPrefix}  installer icon:  ${num2hex(zwavePlusResponse.installerIcon)}`, "debug");
					log("controller", `${this.logPrefix}  user icon:       ${num2hex(zwavePlusResponse.userIcon)}`, "debug");
					}
				}
			} catch (e) {
				log(
					"controller",
					`${
						this.logPrefix
					}  querying the Z-Wave+ information failed: ${e.message}`,
					"error",
				);
				throw e;
			}
		}

		await this.setInterviewStage(InterviewStage.NodePlusInfo);
	}

	protected async queryManufacturerSpecific(): Promise<void> {
		if (this.isControllerNode()) {
			log(
				"controller",
				`${
					this.logPrefix
				}not querying manufacturer information from the controller...`,
				"debug",
			);
		} else {
			log(
				"controller",
				`${this.logPrefix}querying manufacturer information`,
				"debug",
			);
			const cc = new ManufacturerSpecificCCGet(this.driver, {
				nodeId: this.id,
			});
			const request = new SendDataRequest(this.driver, { command: cc });
			try {
				// set the priority manually, as SendData can be Application level too
				const resp = await this.driver.sendMessage<SendDataRequest>(
					request,
					{ priority: MessagePriority.NodeQuery },
				);
				if (
					isCommandClassContainer(resp) &&
					resp.command instanceof ManufacturerSpecificCCReport
				) {
					const mfResp = resp.command;
					mfResp.persistValues();
					// prettier-ignore
					{
					log("controller", `${this.logPrefix}received response for manufacturer information:`, "debug");
					log("controller", `${this.logPrefix}  manufacturer: ${await lookupManufacturer(mfResp.manufacturerId) || "unknown"} (${num2hex(mfResp.manufacturerId)})`, "debug");
					log("controller", `${this.logPrefix}  product type: ${num2hex(mfResp.productType)}`, "debug");
					log("controller", `${this.logPrefix}  product id:   ${num2hex(mfResp.productId)}`, "debug");
					}
				}
			} catch (e) {
				log(
					"controller",
					`${
						this.logPrefix
					}  querying the manufacturer information failed: ${
						e.message
					}`,
					"error",
				);
				throw e;
			}
		}

		await this.setInterviewStage(InterviewStage.ManufacturerSpecific);
	}

	/** Step #9 of the node interview */
	protected async queryCCVersions(): Promise<void> {
		log("controller", `${this.logPrefix}querying CC versions`, "debug");
		for (const [cc] of this._implementedCommandClasses.entries()) {
			// only query the ones we support a version > 1 for
			const maxImplemented = getImplementedVersion(cc);
			if (maxImplemented < 1) {
				// prettier-ignore
				log("controller", `${this.logPrefix}  skipping query for ${CommandClasses[cc]} (${num2hex(cc)}) because max implemented version is ${maxImplemented}`, "debug");
				continue;
			}
			const versionCC = new VersionCCCommandClassGet(this.driver, {
				nodeId: this.id,
				requestedCC: cc,
			});
			const request = new SendDataRequest(this.driver, {
				command: versionCC,
			});
			try {
				// prettier-ignore
				log("controller", `${this.logPrefix}  querying the CC version for ${CommandClasses[cc]} (${num2hex(cc)})`, "debug");
				// query the CC version
				const resp = await this.driver.sendMessage<SendDataRequest>(
					request,
					{ priority: MessagePriority.NodeQuery },
				);
				if (
					isCommandClassContainer(resp) &&
					resp.command instanceof VersionCCCommandClassReport
				) {
					const versionResponse = resp.command;
					// Remember which CC version this node supports
					const reqCC = versionResponse.requestedCC;
					const supportedVersion = versionResponse.ccVersion;
					if (supportedVersion > 0) {
						this.addCC(reqCC, { version: supportedVersion });
						// prettier-ignore
						log("controller", `${this.logPrefix}  supports CC ${CommandClasses[reqCC]} (${num2hex(reqCC)}) in version ${supportedVersion}`, "debug");
					} else {
						// We were lied to - the NIF said this CC is supported, now the node claims it isn't
						this.removeCC(reqCC);
						// prettier-ignore
						log("controller", `${this.logPrefix}  does NOT support CC ${CommandClasses[reqCC]} (${num2hex(reqCC)})`, "debug");
					}
				}
			} catch (e) {
				log(
					"controller",
					`${this.logPrefix}  querying the CC version failed: ${
						e.message
					}`,
					"error",
				);
				throw e;
			}
		}
		await this.setInterviewStage(InterviewStage.Versions);
	}

	/** Step #10 of the node interview */
	protected async queryEndpoints(): Promise<void> {
		if (this.supportsCC(CommandClasses["Multi Channel"])) {
			log(
				"controller",
				`${this.logPrefix}querying device endpoints`,
				"debug",
			);
			const cc = new MultiChannelCCEndPointGet(this.driver, {
				nodeId: this.id,
			});
			const request = new SendDataRequest(this.driver, { command: cc });
			try {
				// set the priority manually, as SendData can be Application level too
				const resp = await this.driver.sendMessage<SendDataRequest>(
					request,
					{ priority: MessagePriority.NodeQuery },
				);
				if (
					isCommandClassContainer(resp) &&
					resp.command instanceof MultiChannelCCEndPointReport
				) {
					const multiResponse = resp.command;
					multiResponse.persistValues();
					// prettier-ignore
					{
					log("controller", `${this.logPrefix}received response for device endpoints:`, "debug");
					log("controller", `${this.logPrefix}  endpoint count (individual): ${multiResponse.individualEndpointCount}`, "debug");
					log("controller", `${this.logPrefix}  count is dynamic:            ${multiResponse.isDynamicEndpointCount}`, "debug");
					log("controller", `${this.logPrefix}  identical capabilities:      ${multiResponse.identicalCapabilities}`, "debug");
					}
				}
			} catch (e) {
				log(
					"controller",
					`${this.logPrefix}  querying the device endpoints failed: ${
						e.message
					}`,
					"error",
				);
				throw e;
			}
		} else {
			log(
				"controller",
				`${
					this.logPrefix
				}skipping endpoint query because the device does not support it`,
				"debug",
			);
		}

		await this.setInterviewStage(InterviewStage.Endpoints);
	}

	/** Step #2 of the node interview */
	protected async configureWakeup(): Promise<void> {
		if (this.supportsCC(CommandClasses["Wake Up"])) {
			if (this.isControllerNode()) {
				log(
					"controller",
					`${
						this.logPrefix
					}skipping wakeup configuration for the controller`,
					"debug",
				);
			} else if (this.isFrequentListening) {
				log(
					"controller",
					`${
						this.logPrefix
					}skipping wakeup configuration for frequent listening device`,
					"debug",
				);
			} else {
				try {
					const getWakeupRequest = new SendDataRequest(this.driver, {
						command: new WakeUpCCIntervalGet(this.driver, {
							nodeId: this.id,
						}),
					});

					log(
						"controller",
						`${
							this.logPrefix
						}retrieving wakeup interval from the device`,
						"debug",
					);
					const getWakeupResp = await this.driver.sendMessage<
						SendDataRequest
					>(getWakeupRequest, {
						priority: MessagePriority.NodeQuery,
					});
					if (
						!isCommandClassContainer(getWakeupResp) ||
						!(
							getWakeupResp.command instanceof
							WakeUpCCIntervalReport
						)
					) {
						throw new ZWaveError(
							"Invalid response received!",
							ZWaveErrorCodes.CC_Invalid,
						);
					}

					const wakeupResp = getWakeupResp.command;
					// prettier-ignore
					{
					log("controller", `${this.logPrefix}received wakeup configuration:`, "debug");
					log("controller", `${this.logPrefix}  wakeup interval: ${wakeupResp.wakeupInterval} seconds`, "debug");
					log("controller", `${this.logPrefix}  controller node: ${wakeupResp.controllerNodeId}`, "debug");
					}

					log(
						"controller",
						`${this.logPrefix}configuring wakeup destination`,
						"debug",
					);
					const setWakeupRequest = new SendDataRequest(this.driver, {
						command: new WakeUpCCIntervalSet(this.driver, {
							nodeId: this.id,
							wakeupInterval: wakeupResp.wakeupInterval,
							controllerNodeId: this.driver.controller.ownNodeId!,
						}),
					});
					await this.driver.sendMessage(setWakeupRequest, {
						priority: MessagePriority.NodeQuery,
					});
					log("controller", `${this.logPrefix}  done!`, "debug");
				} catch (e) {
					log(
						"controller",
						`${
							this.logPrefix
						}  configuring the device wakeup failed: ${e.message}`,
						"error",
					);
					throw e;
				}
			}
		} else {
			log(
				"controller",
				`${this.logPrefix}skipping wakeup for non-sleeping device`,
				"debug",
			);
		}
		await this.setInterviewStage(InterviewStage.WakeUp);
	}

	protected async requestStaticValues(): Promise<void> {
		log("controller", `${this.logPrefix}requesting static values`, "debug");
		try {
			await this.requestState(StateKind.Static);
			log(
				"controller",
				`${this.logPrefix}  static values received`,
				"debug",
			);
		} catch (e) {
			log(
				"controller",
				`${this.logPrefix}  requesting the static values failed: ${
					e.message
				}`,
				"error",
			);
			throw e;
		}
		await this.setInterviewStage(InterviewStage.Static);
	}

	protected async queryNeighbors(): Promise<void> {
		log(
			"controller",
			`${this.logPrefix}requesting node neighbors`,
			"debug",
		);
		try {
			const resp = await this.driver.sendMessage<GetRoutingInfoResponse>(
				new GetRoutingInfoRequest(this.driver, {
					nodeId: this.id,
					removeBadLinks: false,
					removeNonRepeaters: false,
				}),
			);
			this._neighbors = resp.nodeIds;
			log(
				"controller",
				`${
					this.logPrefix
				}  node neighbors received: ${this._neighbors.join(", ")}`,
				"debug",
			);
		} catch (e) {
			log(
				"controller",
				`${this.logPrefix}  requesting the node neighbors failed: ${
					e.message
				}`,
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
		switch (command.ccId) {
			case CommandClasses["Central Scene"]: {
				const csCC = command as CentralSceneCC;
				log(
					"controller",
					`${
						this.logPrefix
					}received CentralScene command ${JSON.stringify(csCC)}`,
					"debug",
				);
				return;
			}
			case CommandClasses["Wake Up"]: {
				const wakeupCC = command as WakeUpCC;
				if (wakeupCC.ccCommand === WakeUpCommand.WakeUpNotification) {
					log(
						"controller",
						`${this.logPrefix}received wake up notification`,
						"debug",
					);
					this.setAwake(true);
					return;
				}
			}
		}
		log(
			"controller",
			`${
				this.logPrefix
			}TODO: no handler for application command ${stringify(command)}`,
			"debug",
		);
	}

	/**
	 * Requests the state for the CCs of this node
	 * @param kind The kind of state to be requested
	 * @param commandClasses The command classes to request the state for. Defaults to all
	 */
	public async requestState(
		kind: StateKind,
		commandClasses: CommandClasses[] = [
			...this._implementedCommandClasses.keys(),
		],
	): Promise<void> {
		// TODO: Support multiple instances
		const factories = commandClasses
			// This assertion is not nice, but I see no better way
			.map(
				cc =>
					(getCCConstructor(cc) as unknown) as
						| (typeof CommandClass)
						| undefined,
			)
			.filter(cc => !!cc)
			.map(cc => () => cc!.requestState(this.driver, this, kind));
		await promiseSequence(factories);
	}

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
						// If any exist, store the values aswell
						const ccInstance = this.createCCInstance(cc);
						if (ccInstance) {
							const ccValues = ccInstance.serializeValuesForCache();
							if (ccValues.length > 0) ret.values = ccValues;
						}
						return [num2hex(cc), ret] as [string, object];
					}),
			),
		};
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
		this.setAwake(true);
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
			key: keyof ZWaveNode,
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
				const { isSupported, isControlled, version, values } = ccDict[
					ccHex
				];
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
							// prettier-ignore
							log("controller", `${this.logPrefix}error during deserialization of CC values from cache:`, "error");
							log(
								"controller",
								`${this.logPrefix}  ${e}`,
								"error",
							);
						}
					}
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
		WakeUpCC.setAwake(this.driver, this, awake);
	}

	/** Returns whether the node is currently assumed awake */
	public isAwake(): boolean {
		const isAsleep =
			this.supportsCC(CommandClasses["Wake Up"]) &&
			!WakeUpCC.isAwake(this.driver, this);
		return !isAsleep;
	}

	private isSendingNoMoreInformation: boolean = false;
	/**
	 * @internal
	 * Sends the node a WakeUpCCNoMoreInformation so it can go back to sleep
	 */
	public async sendNoMoreInformation(): Promise<boolean> {
		// Avoid calling this method more than once
		if (this.isSendingNoMoreInformation) return false;
		this.isSendingNoMoreInformation = true;

		let msgSent = false;
		if (this.isAwake() && this.interviewStage === InterviewStage.Complete) {
			log(
				"controller",
				`${this.logPrefix}Sending node back to sleep`,
				"debug",
			);
			const wakeupCC = new WakeUpCCNoMoreInformation(this.driver, {
				nodeId: this.id,
			});
			const request = new SendDataRequest(this.driver, {
				command: wakeupCC,
			});

			await this.driver.sendMessage<SendDataRequest>(request, {
				priority: MessagePriority.WakeUp,
			});
			log("controller", `${this.logPrefix}  Node asleep`, "debug");

			msgSent = true;
		}

		this.isSendingNoMoreInformation = false;
		return msgSent;
	}
}

// export enum OpenHABInterviewStage {
// 	None,					// Query process hasn't started for this node
// 	ProtocolInfo1,			// Retrieve protocol information (IdentifyNode)
// 	Neighbors1,				// Retrieve node neighbor list

// 	// ===== the stuff below doesn't work for PC controllers =====

// 	WakeUp,					// Start wake up process if a sleeping node
// 	Ping,					// Ping device to see if alive
// 	ProtocolInfo2,			// Retrieve protocol information again (IdentifyNode)
// 	SecurityReport,			// Retrieve a list of Command Classes that require Security
// 	NodeInfo,				// Retrieve info about supported, controlled command classes
// 	ManufacturerSpecific,	// Retrieve manufacturer name and product ids if ProtocolInfo lets us
// 	Versions,				// Retrieve version information
// 	Instances,				// Retrieve information about multiple command class instances
// 	OverwriteFromDB,		// Overwrite the data with manual config files
// 	Static,					// Retrieve static information (doesn't change)

// 	Associations,			// Retrieve information about associations
// 	SetWakeUp,				// * Configure wake up to point to the master controller
// 	SetAssociations,		// * Set some associations to point to us
// 	DeleteSUCRoute,			// * For non-controller nodes delete the SUC return route if there's one
// 	AssignSUCRoute,			// * For non-controller nodes update the SUC return route if there's one
// 	Configuration,			// Retrieve configurable parameter information (only done on request)
// 	Dynamic,				// Retrieve dynamic information (changes frequently)
// 	DeleteReturnRoute,		// * delete the return route
// 	AssignReturnRoute,		// * update the return route
// 	Neighbors2,				// Retrieve updated neighbors
// 	Complete,				// Query process is completed for this node
// }
