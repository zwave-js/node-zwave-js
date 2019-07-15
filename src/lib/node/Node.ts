import { promiseSequence } from "alcalzone-shared/async";
import { composeObject } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { Overwrite } from "alcalzone-shared/types";
import { EventEmitter } from "events";
import { CCAPI, CCAPIs } from "../commandclass/API";
import {
	CentralSceneCC,
	CentralSceneCCNotification,
	CentralSceneKeys,
} from "../commandclass/CentralSceneCC";
import {
	CommandClass,
	getCCConstructor,
	getImplementedVersion,
	StateKind,
} from "../commandclass/CommandClass";
import { CommandClasses, getCCName } from "../commandclass/CommandClasses";
import { ConfigurationCC } from "../commandclass/ConfigurationCC";
import { NotificationCCReport } from "../commandclass/NotificationCC";
import { WakeUpCC, WakeUpCCWakeUpNotification } from "../commandclass/WakeUpCC";
import {
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "../commandclass/ZWavePlusCC";
import { lookupDevice } from "../config/Devices";
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
import { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject, Mixin } from "../util/misc";
import { num2hex, stringify } from "../util/strings";
import { CacheValue } from "../values/Cache";
import {
	BasicDeviceClasses,
	DeviceClass,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "./DeviceClass";
import { Endpoint } from "./Endpoint";
import { InterviewStage, IZWaveNode, NodeStatus } from "./INode";
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
		) => void;
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
		// Log the value change
		// I don't like the splitting and any but its the easiest solution here
		log.controller.value(eventName.split(" ")[1] as any, outArg as any);
		// And pass the translated event to our listeners
		this.emit(eventName, outArg as any);
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

	public get manufacturerId(): number | undefined {
		return this.getValue(
			CommandClasses["Manufacturer Specific"],
			0,
			"manufacturerId",
		);
	}

	public get productId(): number | undefined {
		return this.getValue(
			CommandClasses["Manufacturer Specific"],
			0,
			"productId",
		);
	}

	public get productType(): number | undefined {
		return this.getValue(
			CommandClasses["Manufacturer Specific"],
			0,
			"productType",
		);
	}

	public get firmwareVersion(): string | undefined {
		return this.getValue(CommandClasses.Version, 0, "firmwareVersion");
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
	 * Retrieves a stored value for a given property of a given CommandClass.
	 * This does not request an updated value from the node!
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	/* wotan-disable-next-line no-misused-generics */
	public getValue<T = unknown>(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey?: number | string,
	): T | undefined {
		return this._valueDB.getValue(cc, endpoint, propertyName, propertyKey);
	}

	/**
	 * Updates a value for a given property of a given CommandClass on the node.
	 * This will communicate with the node!
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	public async setValue(
		{
			cc,
			endpoint,
			propertyName,
			propertyKey,
		}: {
			cc: CommandClasses;
			endpoint: number;
			propertyName: string;
			propertyKey?: number | string;
		},
		value: unknown,
	): Promise<boolean> {
		// Try to retrieve the corresponding CC API
		try {
			// Access the CC API by name
			const api = this.getEndpoint(endpoint).commandClasses[
				(cc as unknown) as keyof CCAPIs
			] as CCAPI;
			// Check if the setValue method is implemented
			if (!api.setValue) return false;
			// And call it
			await api.setValue({ propertyName, propertyKey, value });
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

	/** Cache for this node's endpoint instances */
	private _endpoints = new Map<number, Endpoint>();
	/** Returns an endpoint of this node with the given index */
	public getEndpoint(index: number): Endpoint {
		if (index < 0)
			throw new ZWaveError(
				"The endpoint index must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		// Zero is the root endpoint - i.e. this node
		if (index === 0) return this;
		// TODO: Check if the requested endpoint exists on the physical node
		// Create an endpoint instance if it does not exist
		if (!this._endpoints.has(index)) {
			this._endpoints.set(
				index,
				new Endpoint(this.id, this.driver, index),
			);
		}
		return this._endpoints.get(index)!;
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
			// Load a config file for this node if it exists and overwrite the reported
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
			case InterviewStage.ManufacturerSpecific:
			case InterviewStage.NodeInfo:
			case InterviewStage.NodePlusInfo:
			case InterviewStage.Versions:
			case InterviewStage.Endpoints:
			case InterviewStage.Static:
			case InterviewStage.Complete:
				await this.driver.saveNetworkToCache();
		}
		log.controller.interviewStage(this);
	}

	/** Step #1 of the node interview */
	protected async queryProtocolInfo(): Promise<void> {
		// TODO: add direction
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
					logLines.push(`  ${ccName ? ccName : num2hex(cc)}`);
				}
				logLines.push("controlled CCs:");
				for (const cc of resp.nodeInformation.controlledCCs) {
					const ccName = CommandClasses[cc];
					logLines.push(`  ${ccName ? ccName : num2hex(cc)}`);
				}
				log.controller.logNode(this.id, {
					message: logLines.join("\n"),
					direction: "inbound",
				});
				this.updateNodeInfo(resp.nodeInformation);
				// TODO: Save the received values
			}
		}
		await this.setInterviewStage(InterviewStage.NodeInfo);
	}

	/** Step #6 of the node interview */
	protected async queryNodePlusInfo(): Promise<void> {
		if (!this.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
			log.controller.logNode(
				this.id,
				"skipping Z-Wave+ query because the device does not support it",
			);
		} else {
			log.controller.logNode(this.id, {
				message: "querying Z-Wave+ information...",
				direction: "outbound",
			});
			try {
				const zwavePlusResponse = await this.commandClasses[
					"Z-Wave Plus Info"
				].get();

				const logMessage = `received response for Z-Wave+ information:
  Z-Wave+ version: ${zwavePlusResponse.zwavePlusVersion}
  role type:       ${ZWavePlusRoleType[zwavePlusResponse.roleType]}
  node type:       ${ZWavePlusNodeType[zwavePlusResponse.nodeType]}
  installer icon:  ${num2hex(zwavePlusResponse.installerIcon)}
  user icon:       ${num2hex(zwavePlusResponse.userIcon)}`;
				log.controller.logNode(this.id, {
					message: logMessage,
					direction: "inbound",
				});
			} catch (e) {
				log.controller.logNode(
					this.id,
					`  querying the Z-Wave+ information failed: ${e.message}`,
					"error",
				);
				throw e;
			}
		}

		await this.setInterviewStage(InterviewStage.NodePlusInfo);
	}

	protected async queryManufacturerSpecific(): Promise<void> {
		if (this.isControllerNode()) {
			log.controller.logNode(
				this.id,
				"not querying manufacturer information from the controller...",
			);
		} else {
			log.controller.logNode(this.id, {
				message: "querying manufacturer information...",
				direction: "outbound",
			});
			try {
				const mfResp = await this.commandClasses[
					"Manufacturer Specific"
				].get();
				const logMessage = `received response for manufacturer information:
  manufacturer: ${(await lookupManufacturer(mfResp.manufacturerId)) ||
		"unknown"} (${num2hex(mfResp.manufacturerId)})
  product type: ${num2hex(mfResp.productType)}
  product id:   ${num2hex(mfResp.productId)}`;
				log.controller.logNode(this.id, {
					message: logMessage,
					direction: "inbound",
				});
			} catch (e) {
				log.controller.logNode(
					this.id,
					`  querying the manufacturer information failed: ${e.message}`,
					"error",
				);
				throw e;
			}
		}

		await this.setInterviewStage(InterviewStage.ManufacturerSpecific);
	}

	/** Step #9 of the node interview */
	protected async queryCCVersions(): Promise<void> {
		log.controller.logNode(this.id, {
			message: "querying CC versions...",
			direction: "outbound",
		});
		for (const [cc] of this.implementedCommandClasses.entries()) {
			// only query the ones we support a version > 1 for
			const maxImplemented = getImplementedVersion(cc);
			if (maxImplemented < 1) {
				log.controller.logNode(
					this.id,
					`  skipping query for ${CommandClasses[cc]} (${num2hex(
						cc,
					)}) because max implemented version is ${maxImplemented}`,
				);
				continue;
			}
			try {
				log.controller.logNode(this.id, {
					message: `  querying the CC version for ${
						CommandClasses[cc]
					} (${num2hex(cc)})...`,
					direction: "outbound",
				});
				// query the CC version
				const supportedVersion = await this.commandClasses.Version.getCCVersion(
					cc,
				);
				// Remember which CC version this node supports
				let logMessage: string;
				if (supportedVersion > 0) {
					this.addCC(cc, { version: supportedVersion });
					logMessage = `  supports CC ${
						CommandClasses[cc]
					} (${num2hex(cc)}) in version ${supportedVersion}`;
				} else {
					// We were lied to - the NIF said this CC is supported, now the node claims it isn't
					this.removeCC(cc);
					logMessage = `  does NOT support CC ${
						CommandClasses[cc]
					} (${num2hex(cc)})`;
				}
				log.controller.logNode(this.id, logMessage);
			} catch (e) {
				log.controller.logNode(
					this.id,
					`  querying the CC versions failed: ${e.message}`,
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
			log.controller.logNode(this.id, {
				message: "querying device endpoints...",
				direction: "outbound",
			});
			try {
				const multiResponse = await this.commandClasses[
					"Multi Channel"
				].getEndpoints();

				let logMessage = `received response for device endpoints:
  endpoint count (individual): ${multiResponse.individualEndpointCount}
  count is dynamic:            ${multiResponse.isDynamicEndpointCount}
  identical capabilities:      ${multiResponse.identicalCapabilities}`;
				if (multiResponse.aggregatedEndpointCount != undefined) {
					logMessage += `
  endpoint count (aggregated): ${multiResponse.aggregatedEndpointCount}`;
				}
				log.controller.logNode(this.id, {
					message: logMessage,
					direction: "inbound",
				});

				// Find out how many endpoints we need to query.
				// If all of them have identical capabilities, 1 is enough
				const totalEndpointCount = multiResponse.identicalCapabilities
					? 1
					: multiResponse.individualEndpointCount +
					  (multiResponse.aggregatedEndpointCount || 0);
				for (
					let endpointIndex = 1;
					endpointIndex <= totalEndpointCount;
					endpointIndex++
				) {
					log.controller.logNode(this.id, {
						message: `querying capabilities for endpoint #${endpointIndex}...`,
						direction: "outbound",
					});
					const caps = await this.commandClasses[
						"Multi Channel"
					].getEndpointCapabilities(endpointIndex);
					logMessage = `received response for endpoint capabilities (#${endpointIndex}):
  generic device class:  ${caps.generic.name} (${num2hex(caps.generic.key)})
  specific device class: ${caps.specific.name} (${num2hex(caps.specific.key)})
  is dynamic end point:  ${caps.isDynamic}
  supported CCs:`;
					for (const cc of caps.supportedCCs) {
						const ccName = CommandClasses[cc];
						logMessage += `\n  · ${ccName ? ccName : num2hex(cc)}`;
					}
					log.controller.logNode(this.id, {
						message: logMessage,
						direction: "inbound",
					});

					// TODO: Save this information
				}
			} catch (e) {
				log.controller.logNode(
					this.id,
					`  querying the device endpoints failed: ${e.message}`,
					"error",
				);
				throw e;
			}
		} else {
			log.controller.logNode(
				this.id,
				`skipping endpoint query because the device does not support it`,
			);
		}

		await this.setInterviewStage(InterviewStage.Endpoints);
	}

	/** Step #2 of the node interview */
	protected async configureWakeup(): Promise<void> {
		if (this.supportsCC(CommandClasses["Wake Up"])) {
			if (this.isControllerNode()) {
				log.controller.logNode(
					this.id,
					`skipping wakeup configuration for the controller`,
				);
			} else if (this.isFrequentListening) {
				log.controller.logNode(
					this.id,
					`skipping wakeup configuration for frequent listening device`,
				);
			} else {
				try {
					log.controller.logNode(this.id, {
						message:
							"retrieving wakeup interval from the device...",
						direction: "outbound",
					});
					const wakeupResp = await this.commandClasses[
						"Wake Up"
					].getInterval();
					const logMessage = `received wakeup configuration:
  wakeup interval: ${wakeupResp.wakeupInterval} seconds
  controller node: ${wakeupResp.controllerNodeId}`;
					log.controller.logNode(this.id, {
						message: logMessage,
						direction: "inbound",
					});

					log.controller.logNode(this.id, {
						message: "configuring wakeup destination",
						direction: "outbound",
					});

					await this.commandClasses["Wake Up"].setInterval(
						wakeupResp.wakeupInterval,
						this.driver.controller.ownNodeId!,
					);
					log.controller.logNode(this.id, "  done!");
				} catch (e) {
					log.controller.logNode(
						this.id,
						`  configuring the device wakeup failed: ${e.message}`,
						"error",
					);
					throw e;
				}
			}
		} else {
			log.controller.logNode(
				this.id,
				`skipping wakeup for non-sleeping device`,
			);
		}
		await this.setInterviewStage(InterviewStage.WakeUp);
	}

	protected async requestStaticValues(): Promise<void> {
		log.controller.logNode(this.id, {
			message: "requesting static values...",
			direction: "outbound",
		});
		try {
			await this.requestState(StateKind.Static);
			log.controller.logNode(this.id, {
				message: `  static values received`,
				direction: "inbound",
			});
		} catch (e) {
			log.controller.logNode(
				this.id,
				`  requesting the static values failed: ${e.message}`,
				"error",
			);
			throw e;
		}
		await this.setInterviewStage(InterviewStage.Static);
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
			return this.handleWakeUpNotification(command);
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
			const propName = `scene${padStart(sceneNumber.toString(), 3, "0")}`;
			this.valueDB.setValue(
				command.ccId,
				command.endpoint,
				propName,
				CentralSceneCC.translatePropertyKey(propName, key),
			);
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
				timeout: setTimeout(
					forceKeyUp,
					command.slowRefresh ? 60000 : 400,
				),
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
	private handleWakeUpNotification(
		// TODO: Do we need this parameter?
		_command: WakeUpCCWakeUpNotification,
	): void {
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

	/**
	 * Requests the state for the CCs of this node
	 * @param kind The kind of state to be requested
	 * @param commandClasses The command classes to request the state for. Defaults to all
	 */
	public async requestState(
		kind: StateKind,
		commandClasses: CommandClasses[] = [
			...this.implementedCommandClasses.keys(),
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
							log.controller.logNode(this.id, {
								message: `Error during deserialization of CC values from cache:\n${e}`,
								level: "error",
							});
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
