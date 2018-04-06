import { CommandClass, CommandClasses } from "../commandclass/CommandClass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { SendDataRequest, SendDataResponse, TransmitStatus } from "../commandclass/SendDataMessages";
import { ApplicationUpdateRequest, ApplicationUpdateTypes } from "../controller/ApplicationUpdateRequest";
import { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { log } from "../util/logger";
import { num2hex, padStart, stringify } from "../util/strings";
import { BasicDeviceClasses, DeviceClass } from "./DeviceClass";
import { Baudrate, GetNodeProtocolInfoRequest, GetNodeProtocolInfoResponse } from "./GetNodeProtocolInfoMessages";
import { isNodeQuery } from "./INodeQuery";
import { RequestNodeInfoRequest, RequestNodeInfoResponse } from "./RequestNodeInfoMessages";

/** Finds the ID of the target or source node in a message, if it contains that information */
export function getNodeId(msg: Message): number {
	if (isNodeQuery(msg)) return msg.nodeId;
	if (isCommandClassContainer(msg)) return msg.command.nodeId;
}

export class ZWaveNode {

	constructor(
		public readonly id: number,
		private readonly driver: Driver,
		deviceClass?: DeviceClass,
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
	) {
		// TODO restore from cache
		this._deviceClass = deviceClass;
		this._supportedCCs = supportedCCs;
		this._controlledCCs = controlledCCs;
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

	private _supportedCCs: CommandClasses[];
	public get supportedCCs(): CommandClasses[] {
		return this._supportedCCs;
	}

	private _controlledCCs: CommandClasses[];
	public get controlledCCs(): CommandClasses[] {
		return this._controlledCCs;
	}

	/** This tells us which interview stage was last completed */
	public interviewStage: InterviewStage = InterviewStage.None;

	//#endregion

	public isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}

	/** Tests if this node supports the given CommandClass */
	public supportsCC(cc: CommandClasses): boolean {
		return this._supportedCCs.indexOf(cc) !== -1;
	}

	/** Tests if this node controls the given CommandClass */
	public controlsCC(cc: CommandClasses): boolean {
		return this._controlledCCs.indexOf(cc) !== -1;
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
		// TODO: delay pinging of nodes that are not listening or sleeping
		if (this.interviewStage === InterviewStage.ProtocolInfo) {
			// after getting the protocol info, ping the nodes
			await this.ping();
		}
		// TODO: WakeUp
		// TODO: ManufacturerSpecific1
		if (this.interviewStage === InterviewStage.Ping) {
			await this.getNodeInfo();
		}

		// for testing purposes we skip to the end
		this.interviewStage = InterviewStage.Complete;
		log("controller", `${this.logPrefix}interview completed`, "debug");
	}

	/** Step #1 of the node interview */
	private async queryProtocolInfo() {
		log("controller", `${this.logPrefix}querying protocol info`, "debug");
		const resp = await this.driver.sendMessage<GetNodeProtocolInfoResponse>(
			new GetNodeProtocolInfoRequest(this.id),
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

		this.interviewStage = InterviewStage.ProtocolInfo;
	}

	/** Step #2 of the node interview */
	private async ping() {
		if (this.isControllerNode()) {
			log("controller", `${this.logPrefix}not pinging the controller...`, "debug");
		} else {
			log("controller", `${this.logPrefix}pinging the node...`, "debug");

			try {
				const request = new SendDataRequest(new NoOperationCC(this.id));
				// set the priority manually, as SendData can be Application level too
				const response = await this.driver.sendMessage<SendDataRequest>(request, MessagePriority.NodeQuery);
				log("controller", `${this.logPrefix}  ping succeeded`, "debug");
				// TODO: time out the ping
			} catch (e) {
				log("controller", `${this.logPrefix}  ping failed: ${e.message}`, "debug");
			}
		}
		this.interviewStage = InterviewStage.Ping;
	}

	/** Step #5 of the node interview */
	private async getNodeInfo() {
		log("controller", `${this.logPrefix}querying node info`, "debug");
		const resp = await this.driver.sendMessage<RequestNodeInfoResponse | ApplicationUpdateRequest>(
			new RequestNodeInfoRequest(this.id),
		);
		if (
			resp instanceof RequestNodeInfoResponse && !resp.wasSent
			|| resp instanceof ApplicationUpdateRequest && resp.updateType === ApplicationUpdateTypes.NodeInfo_RequestFailed
		) {
			log("controller", `${this.logPrefix}  querying the node info failed`, "debug");
		} else if (resp instanceof ApplicationUpdateRequest) {
			// TODO: log the received values
			log("controller", `${this.logPrefix}  received the node info`, "debug");
			this._supportedCCs = resp.nodeInformation.supportedCCs;
			this._controlledCCs = resp.nodeInformation.controlledCCs;
		}
		this.interviewStage = InterviewStage.NodeInfo;
	}

	//#endregion

	/** Handles an ApplicationCommandRequest sent from a node */
	public async handleCommand(command: CommandClass): Promise<void> {
		log("controller", `${this.logPrefix}handling application command ${stringify(command)} - TODO`, "debug");
		// TODO
	}

}

// TODO: This order is not optimal, check how OpenHAB does it
export enum InterviewStage {
	None,					// Query process hasn't started for this node
	ProtocolInfo,			// Retrieve protocol information
	Ping,					// Ping device to see if alive
	WakeUp,					// Start wake up process if a sleeping node
	ManufacturerSpecific1,	// Retrieve manufacturer name and product ids if ProtocolInfo lets us
	NodeInfo,				// Retrieve info about supported, controlled command classes
	NodePlusInfo,			// Retrieve ZWave+ info and update device classes
	SecurityReport,			// Retrieve a list of Command Classes that require Security
	ManufacturerSpecific2,	// Retrieve manufacturer name and product ids
	Versions,				// Retrieve version information
	Instances,				// Retrieve information about multiple command class instances
	Static,					// Retrieve static information (doesn't change)

	// ===== the stuff above should never change =====
	// ===== the stuff below changes frequently, so it has to be redone on every start =====

	CacheLoad,				// Ping a device upon restarting with cached config for the device
	Associations,			// Retrieve information about associations
	Neighbors,				// Retrieve node neighbor list
	Session,				// Retrieve session information (changes infrequently)
	Dynamic,				// Retrieve dynamic information (changes frequently)
	Configuration,			// Retrieve configurable parameter information (only done on request)
	Complete,				// Query process is completed for this node
}
