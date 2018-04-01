import { CommandClasses } from "../commandclass/SendDataMessages";
import { Driver } from "../driver/Driver";
import { log } from "../util/logger";
import { num2hex, padStart } from "../util/strings";
import { BasicDeviceClasses, DeviceClass } from "./DeviceClass";
import { Baudrate, GetNodeProtocolInfoRequest, GetNodeProtocolInfoResponse } from "./GetNodeProtocolInfoMessages";

export class Node {

	constructor(
		public readonly id: number,
		private readonly driver: Driver,
	) {
		// TODO restore from cache
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

	private supportedCCs: CommandClasses[] = [];
	private controllableCCs: CommandClasses[] = [];

	/** This tells us which interview stage was last completed */
	public interviewStage: InterviewStage = InterviewStage.None;

//#endregion

	public async interview() {
		log("controller", `${this.logPrefix}beginning interview... last completed step: ${InterviewStage[this.interviewStage]}`, "debug");
		if (this.interviewStage === InterviewStage.None) {
			// do a full interview starting with the protocol info
			log("controller", `${this.logPrefix}new Node, doing a full interview...`, "debug");

			await this.queryProtocolInfo();
		}

		// for testing purposes we skip to the end
		this.interviewStage = InterviewStage.Complete;
		log("controller", `${this.logPrefix}interview completed`, "debug");
	}

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

}

export enum InterviewStage {
	None,					// Query process hasn't started for this node
	ProtocolInfo,			// Retrieve protocol information
	Probe,					// Ping device to see if alive
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
