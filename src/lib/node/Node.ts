import { promiseSequence } from "alcalzone-shared/async";
import { composeObject } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { EventEmitter } from "events";
import { CentralSceneCC } from "../commandclass/CentralSceneCC";
import { CommandClass, CommandClasses, CommandClassInfo, getCCConstructor, getCommandClassStatic, getImplementedVersion, StateKind } from "../commandclass/CommandClass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import { ManufacturerSpecificCC, ManufacturerSpecificCommand } from "../commandclass/ManufacturerSpecificCC";
import { MultiChannelCC, MultiChannelCommand } from "../commandclass/MultiChannelCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { VersionCC, VersionCommand } from "../commandclass/VersionCC";
import { WakeUpCC, WakeUpCommand } from "../commandclass/WakeUpCC";
import { ApplicationUpdateRequest, ApplicationUpdateTypes } from "../controller/ApplicationUpdateRequest";
import { Baudrate, GetNodeProtocolInfoRequest, GetNodeProtocolInfoResponse } from "../controller/GetNodeProtocolInfoMessages";
import { SendDataRequest, SendDataResponse, TransmitStatus } from "../controller/SendDataMessages";
import { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { log } from "../util/logger";
import { num2hex, stringify } from "../util/strings";
import { BasicDeviceClasses, DeviceClass } from "./DeviceClass";
import { isNodeQuery } from "./INodeQuery";
import { RequestNodeInfoRequest, RequestNodeInfoResponse } from "./RequestNodeInfoMessages";
import { ValueDB, ValueUpdatedArgs } from "./ValueDB";

export interface ZWaveNode {
	on(event: "value updated", cb: (args: ValueUpdatedArgs) => void): this;
	removeListener(event: "value updated", cb: (args: ValueUpdatedArgs) => void): this;

	removeAllListeners(event?: "value updated"): this;
}

export class ZWaveNode extends EventEmitter {

	constructor(
		public readonly id: number,
		private readonly driver: Driver,
		deviceClass?: DeviceClass,
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
	) {
		super();

		this._valueDB = new ValueDB();
		this.on("value updated", (args) => this.emit("value updated", args));

		// TODO restore from cache
		this._deviceClass = deviceClass;
		for (const cc of supportedCCs) this.addCC(cc, { isSupported: true });
		for (const cc of controlledCCs) this.addCC(cc, { isControlled: true });
	}

	//#region --- properties ---

	private readonly logPrefix = `[Node ${padStart(this.id.toString(), 3, "0")}] `;

	private _deviceClass: DeviceClass;
	public get deviceClass(): DeviceClass {
		return this._deviceClass;
	}

	private _isListening: boolean;
	public get isListening(): boolean {
		return this._isListening;
	}

	private _isFrequentListening: boolean;
	public get isFrequentListening(): boolean {
		return this._isFrequentListening;
	}

	private _isRouting: boolean;
	public get isRouting(): boolean {
		return this._isRouting;
	}

	private _maxBaudRate: Baudrate;
	public get maxBaudRate(): Baudrate {
		return this._maxBaudRate;
	}

	private _isSecure: boolean;
	public get isSecure(): boolean {
		return this._isSecure;
	}

	private _version: number;
	public get version(): number {
		return this._version;
	}

	private _isBeaming: boolean;
	public get isBeaming(): boolean {
		return this._isBeaming;
	}

	private _implementedCommandClasses = new Map<CommandClasses, CommandClassInfo>();
	public get implementedCommandClasses(): Map<CommandClasses, CommandClassInfo> {
		return this._implementedCommandClasses;
	}

	private _valueDB = new ValueDB();
	public get valueDB(): ValueDB {
		return this._valueDB;
	}

	/** This tells us which interview stage was last completed */
	public interviewStage: InterviewStage = InterviewStage.None;

	//#endregion

	public isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}

	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>) {
		let ccInfo = this._implementedCommandClasses.has(cc)
			? this._implementedCommandClasses.get(cc)
			: {
				isSupported: false,
				isControlled: false,
				version: 0,
			} as CommandClassInfo
			;
		ccInfo = Object.assign(ccInfo, info);
		this._implementedCommandClasses.set(cc, ccInfo);
	}

	/** Tests if this node supports the given CommandClass */
	public supportsCC(cc: CommandClasses): boolean {
		return this._implementedCommandClasses.has(cc) && this._implementedCommandClasses.get(cc).isSupported;
	}

	/** Tests if this node controls the given CommandClass */
	public controlsCC(cc: CommandClasses): boolean {
		return this._implementedCommandClasses.has(cc) && this._implementedCommandClasses.get(cc).isControlled;
	}

	/** Checks the supported version of a given CommandClass */
	public getCCVersion(cc: CommandClasses): number {
		return this._implementedCommandClasses.has(cc) ? this._implementedCommandClasses.get(cc).version : 0;
	}

	/** Creates an instance of the given CC linked to this node */
	public createCCInstance<T extends CommandClass>(cc: CommandClasses): T {
		if (!this.supportsCC(cc)) {
			throw new ZWaveError(`Cannot create an instance of the unsupported CC ${CommandClasses[cc]} (${num2hex(cc)})`, ZWaveErrorCodes.CC_NotSupported);
		}
		// tslint:disable-next-line: variable-name
		const Constructor = getCCConstructor(cc);
		return new Constructor(this.driver, this.id) as T;
	}

	//#region --- interview ---

	public async interview() {
		log("controller", `${this.logPrefix}beginning interview... last completed step: ${InterviewStage[this.interviewStage]}`, "debug");

		// before each step check if it is necessary

		if (this.interviewStage === InterviewStage.None) {
			// do a full interview starting with the protocol info
			log("controller", `${this.logPrefix}new Node, doing a full interview...`, "debug");

			await this.queryProtocolInfo();
		}

		if (this.interviewStage === InterviewStage.ProtocolInfo) {
			// Wait until we can communicate with the device
			await this.waitForWakeup();
		}

		if (this.interviewStage === InterviewStage.WakeUp) {
			// Make sure the device answers
			await this.ping();
		}

		if (this.interviewStage === InterviewStage.Ping) {
			// Request Manufacturer specific data
			await this.queryManufacturerSpecific();
		}

		if (this.interviewStage === InterviewStage.ManufacturerSpecific1) {
			await this.queryNodeInfo();
		}

		// TODO:
		// NodePlusInfo,			// [ ] Retrieve ZWave+ info and update device classes
		// SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security
		// ManufacturerSpecific2,	// [ ] Retrieve manufacturer name and product ids

		if (this.interviewStage === InterviewStage.NodeInfo /* TODO: change .NodeInfo to .ManufacturerSpecific2 */) {
			await this.queryCCVersions();
		}

		if (this.interviewStage === InterviewStage.Versions) {
			await this.queryEndpoints();
		}

		if (this.interviewStage === InterviewStage.Endpoints) {
			await this.requestStaticValues();
		}

		// TODO: Save the current state

		// for testing purposes we skip to the end
		await this.setInterviewStage(InterviewStage.Complete);
		log("controller", `${this.logPrefix}interview completed`, "debug");
	}

	private async setInterviewStage(completedStage: InterviewStage) {
		this.interviewStage = completedStage;
		// Also save to the cache after certain stages
		switch (completedStage) {
			case InterviewStage.ProtocolInfo:
			case InterviewStage.ManufacturerSpecific1:
			case InterviewStage.NodeInfo:
			case InterviewStage.Versions:
			case InterviewStage.Endpoints:
			case InterviewStage.Static:
			case InterviewStage.Complete:
				await this.driver.saveNetworkToCache();
		}
	}

	/** Step #1 of the node interview */
	private async queryProtocolInfo() {
		log("controller", `${this.logPrefix}querying protocol info`, "debug");
		const resp = await this.driver.sendMessage<GetNodeProtocolInfoResponse>(
			new GetNodeProtocolInfoRequest(this.driver, this.id),
		);
		this._deviceClass = resp.deviceClass;
		this._isListening = resp.isListening;
		this._isFrequentListening = resp.isFrequentListening;
		this._isRouting = resp.isRouting;
		this._maxBaudRate = resp.maxBaudRate;
		this._isSecure = resp.isSecure;
		this._version = resp.version;
		this._isBeaming = resp.isBeaming;

		log("controller", `${this.logPrefix}received response for protocol info:`, "debug");
		log("controller", `${this.logPrefix}  basic device class:    ${BasicDeviceClasses[this.deviceClass.basic]} (${num2hex(this.deviceClass.basic)})`, "debug");
		log("controller", `${this.logPrefix}  generic device class:  ${this.deviceClass.generic.name} (${num2hex(this.deviceClass.generic.key)})`, "debug");
		log("controller", `${this.logPrefix}  specific device class: ${this.deviceClass.specific.name} (${num2hex(this.deviceClass.specific.key)})`, "debug");
		log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
		log("controller", `${this.logPrefix}  is frequent listening: ${this.isFrequentListening}`, "debug");
		log("controller", `${this.logPrefix}  is a routing device:   ${this.isRouting}`, "debug");
		log("controller", `${this.logPrefix}  is a secure device:    ${this.isSecure}`, "debug");
		log("controller", `${this.logPrefix}  is a beaming device:   ${this.isBeaming}`, "debug");
		log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
		log("controller", `${this.logPrefix}  maximum baud rate:     ${this.maxBaudRate} kbps`, "debug");
		log("controller", `${this.logPrefix}  version:               ${this.version}`, "debug");

		if (!this.isListening && !this.isFrequentListening) {
			// This is a "sleeping" device which must support the WakeUp CC.
			// We are requesting the supported CCs later, but those commands may need to go into the
			// wakeup queue. Thus we need to mark WakeUp as supported
			this.addCC(CommandClasses["Wake Up"], {
				isSupported: true,
			});
			// Assume the node is awake, after all we're communicating with it.
			this.createCCInstance<WakeUpCC>(CommandClasses["Wake Up"]).setAwake(true);
		}

		await this.setInterviewStage(InterviewStage.ProtocolInfo);
	}

	/** Step #2 of the node interview */
	private async waitForWakeup() {
		if (this.supportsCC(CommandClasses["Wake Up"])) {
			if (this.isControllerNode()) {
				log("controller", `${this.logPrefix}skipping wakeup for the controller`, "debug");
			} else if (this.isFrequentListening) {
				log("controller", `${this.logPrefix}skipping wakeup for frequent listening device`, "debug");
			} else {
				log("controller", `${this.logPrefix}waiting for device to wake up`, "debug");

				const wakeupCC = new WakeUpCC(this.driver, this.id, WakeUpCommand.IntervalGet);
				const request = new SendDataRequest(this.driver, wakeupCC);

				try {
					const response = await this.driver.sendMessage<SendDataRequest>(request, MessagePriority.WakeUp);
					log("controller", `${this.logPrefix}  device is awake`, "debug");
				} catch (e) {
					log("controller", `${this.logPrefix}  device wakeup failed: ${e.message}`, "debug");
				}
			}
		} else {
			log("controller", `${this.logPrefix}skipping wakeup for non-sleeping device`, "debug");
		}
		await this.setInterviewStage(InterviewStage.WakeUp);
	}

	/** Step #3 of the node interview */
	private async ping() {
		if (this.isControllerNode()) {
			log("controller", `${this.logPrefix}not pinging the controller...`, "debug");
		} else {
			log("controller", `${this.logPrefix}pinging the node...`, "debug");

			try {
				const request = new SendDataRequest(this.driver, new NoOperationCC(this.driver, this.id));
				// set the priority manually, as SendData can be Application level too
				const response = await this.driver.sendMessage<SendDataRequest>(request, MessagePriority.NodeQuery);
				log("controller", `${this.logPrefix}  ping succeeded`, "debug");
				// TODO: time out the ping
			} catch (e) {
				log("controller", `${this.logPrefix}  ping failed: ${e.message}`, "debug");
			}
		}
		await this.setInterviewStage(InterviewStage.Ping);
	}

	/** Step #5 of the node interview */
	private async queryNodeInfo() {
		if (this.isControllerNode()) {
			log("controller", `${this.logPrefix}not querying node info from the controller...`, "debug");
		} else {
			log("controller", `${this.logPrefix}querying node info`, "debug");
			const resp = await this.driver.sendMessage<RequestNodeInfoResponse | ApplicationUpdateRequest>(
				new RequestNodeInfoRequest(this.driver, this.id),
			);
			if (
				resp instanceof RequestNodeInfoResponse && !resp.wasSent
				|| resp instanceof ApplicationUpdateRequest && resp.updateType === ApplicationUpdateTypes.NodeInfo_RequestFailed
			) {
				log("controller", `${this.logPrefix}  querying the node info failed`, "debug");
			} else if (resp instanceof ApplicationUpdateRequest) {
				log("controller", `${this.logPrefix}  received the node info`, "debug");
				for (const cc of resp.nodeInformation.supportedCCs) this.addCC(cc, { isSupported: true });
				for (const cc of resp.nodeInformation.controlledCCs) this.addCC(cc, { isControlled: true });
				// TODO: Save the received values
			}
		}
		await this.setInterviewStage(InterviewStage.NodeInfo);
	}

	private async queryManufacturerSpecific() {
		if (this.isControllerNode()) {
			log("controller", `${this.logPrefix}not querying manufacturer information from the controller...`, "debug");
		} else {
			log("controller", `${this.logPrefix}querying manufacturer information`, "debug");
			const cc = new ManufacturerSpecificCC(this.driver, this.id, ManufacturerSpecificCommand.Get);
			const request = new SendDataRequest(this.driver, cc);
			try {
				// set the priority manually, as SendData can be Application level too
				const resp = await this.driver.sendMessage<SendDataRequest>(request, MessagePriority.NodeQuery);
				if (isCommandClassContainer(resp)) {
					const manufacturerResponse = resp.command as ManufacturerSpecificCC;
					log("controller", `${this.logPrefix}received response for manufacturer information:`, "debug");
					log("controller", `${this.logPrefix}  manufacturer id: ${num2hex(manufacturerResponse.manufacturerId)}`, "debug");
					log("controller", `${this.logPrefix}  product type:    ${num2hex(manufacturerResponse.productType)}`, "debug");
					log("controller", `${this.logPrefix}  product id:      ${num2hex(manufacturerResponse.productId)}`, "debug");
				}
			} catch (e) {
				log("controller", `${this.logPrefix}  querying the manufacturer information failed: ${e.message}`, "debug");
			}
		}

		await this.setInterviewStage(InterviewStage.ManufacturerSpecific1);
	}

	/** Step #9 of the node interview */
	private async queryCCVersions() {
		log("controller", `${this.logPrefix}querying CC versions`, "debug");
		for (const [cc, info] of this._implementedCommandClasses.entries()) {
			// only query the ones we support a version > 1 for
			const maxImplemented = getImplementedVersion(cc);
			if (maxImplemented < 1) {
				log("controller", `${this.logPrefix}  skipping query for ${CommandClasses[cc]} (${num2hex(cc)}) because max implemented version is ${maxImplemented}`, "debug");
				continue;
			}
			const versionCC = new VersionCC(this.driver, this.id, VersionCommand.CommandClassGet, cc);
			const request = new SendDataRequest(this.driver, versionCC);
			try {
				log("controller", `${this.logPrefix}  querying the CC version for ${CommandClasses[cc]} (${num2hex(cc)})`, "debug");
				// query the CC version
				const resp = await this.driver.sendMessage<SendDataRequest>(request, MessagePriority.NodeQuery);
				if (isCommandClassContainer(resp)) {
					const versionResponse = resp.command as VersionCC;
					// Remember which CC version this node supports
					const reqCC = versionResponse.requestedCC;
					const supportedVersion = versionResponse.ccVersion;
					this.addCC(reqCC, { version: supportedVersion });
					log("controller", `${this.logPrefix}  supports CC ${CommandClasses[reqCC]} (${num2hex(reqCC)}) in version ${supportedVersion}`, "debug");
				}
			} catch (e) {
				log("controller", `${this.logPrefix}  querying the CC version failed: ${e.message}`, "debug");
			}
		}
		await this.setInterviewStage(InterviewStage.Versions);
	}

	/** Step #10 of the node interview */
	private async queryEndpoints() {
		if (this.supportsCC(CommandClasses["Multi Channel"])) {
			log("controller", `${this.logPrefix}querying device endpoints`, "debug");
			const cc = new MultiChannelCC(this.driver, this.id, MultiChannelCommand.EndPointGet);
			const request = new SendDataRequest(this.driver, cc);
			try {
				// set the priority manually, as SendData can be Application level too
				const resp = await this.driver.sendMessage<SendDataRequest>(request, MessagePriority.NodeQuery);
				if (isCommandClassContainer(resp)) {
					const multiResponse = resp.command as MultiChannelCC;
					log("controller", `${this.logPrefix}received response for device endpoints:`, "debug");
					log("controller", `${this.logPrefix}  endpoint count: ${multiResponse.endpointCount}`, "debug");
					log("controller", `${this.logPrefix}  dynamic:        ${multiResponse.isDynamicEndpointCount}`, "debug");
					log("controller", `${this.logPrefix}  identical caps: ${multiResponse.identicalCapabilities}`, "debug");
				}
			} catch (e) {
				log("controller", `${this.logPrefix}  querying the device endpoints failed: ${e.message}`, "debug");
			}
		} else {
			log("controller", `${this.logPrefix}skipping endpoint query because the device does not support it`, "debug");
		}

		await this.setInterviewStage(InterviewStage.Endpoints);
	}

	private async requestStaticValues() {
		log("controller", `${this.logPrefix}requesting static values`, "debug");
		try {
			await this.requestState(StateKind.Static);
			log("controller", `${this.logPrefix}  static values received`, "debug");
		} catch (e) {
			log("controller", `${this.logPrefix}  requesting the static values failed: ${e.message}`, "debug");
		}
		await this.setInterviewStage(InterviewStage.Static);
	}

	//#endregion

	// TODO: Add a handler around for each CC to interpret the received data

	/** Handles an ApplicationCommandRequest sent from a node */
	public async handleCommand(command: CommandClass): Promise<void> {
		switch (command.command) {
			case CommandClasses["Central Scene"]: {
				// The node reported its supported versions
				const csCC = command as CentralSceneCC;
				log("controller", `${this.logPrefix}received CentralScene command ${JSON.stringify(csCC)}`, "debug");
				break;
			}
			default: {
				log("controller", `${this.logPrefix}TODO: no handler for application command ${stringify(command)}`, "debug");
			}
		}
	}

	/**
	 * Requests the state for the CCs of this node
	 * @param kind The kind of state to be requested
	 * @param commandClasses The command classes to request the state for. Defaults to all
	 */
	public async requestState(
		kind: StateKind,
		commandClasses: CommandClasses[] = [...this._implementedCommandClasses.keys()],
	): Promise<void> {
		// TODO: Support multiple instances
		const requests = commandClasses
			.map(cc => getCCConstructor(cc) as typeof CommandClass)
			.filter(cc => !!cc)
			.map(cc => cc.createStateRequest(this.driver, this, kind))
			.filter(req => !!req) as SendDataRequest[]
			;
		const factories = requests
			.map(req => () => this.driver.sendMessage<SendDataRequest>(req, MessagePriority.NodeQuery))
			;
		await promiseSequence(factories);
	}

	/** Serializes this node in order to store static data in a cache */
	public serialize() {
		return {
			id: this.id,
			interviewStage: InterviewStage[this.interviewStage],
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
						return [num2hex(cc), {
							name: CommandClasses[cc],
							...info,
						}] as [string, object];
					}),
			),
		};
	}

}

// TODO: This order is not optimal, check how OpenHAB does it
export enum InterviewStage {
	None,					// [✓] Query process hasn't started for this node
	ProtocolInfo,			// [✓] Retrieve protocol information
	WakeUp,					// [✓] Wait for "sleeping" nodes to wake up
	Ping,					// [✓] Ping device to see if alive
	ManufacturerSpecific1,	// [✓] Retrieve manufacturer name and product ids if ProtocolInfo lets us
	NodeInfo,				// [✓] Retrieve info about supported, controlled command classes
	NodePlusInfo,			// [ ] Retrieve ZWave+ info and update device classes
	SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security
	ManufacturerSpecific2,	// [ ] Retrieve manufacturer name and product ids
	Versions,				// [✓] Retrieve version information
	Endpoints,				// [✓] Retrieve information about multiple command class endpoints
	Static,					// (✓) Retrieve static information we haven't received yet (doesn't change)

	// ===== the stuff above should never change =====
	// ===== the stuff below changes frequently, so it has to be redone on every start =====

	CacheLoad,				// [ ] Ping a device upon restarting with cached config for the device
	// 	SetWakeUp,			// [ ] * Configure wake up to point to the master controller
	Associations,			// [ ] Retrieve information about associations
	Neighbors,				// [ ] Retrieve node neighbor list
	Session,				// [ ] Retrieve session information (changes infrequently)
	Dynamic,				// [ ] Retrieve dynamic information (changes frequently)
	Configuration,			// [ ] Retrieve configurable parameter information (only done on request)
	Complete,				// [ ] Query process is completed for this node
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
