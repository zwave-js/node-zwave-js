import { SendDataRequest } from "../controller/SendDataMessages";
import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ZWaveNode } from "../node/Node";
import { Maybe, unknownBoolean } from "../util/ValueTypes";
import { ccValue, CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion, StateKind } from "./CommandClass";

export enum VersionCommand {
	Get = 0x11,
	Report = 0x12,
	CommandClassGet = 0x13,
	CommandClassReport = 0x14,
	CapabilitiesGet = 0x15,
	CapabilitiesReport = 0x16,
	ZWaveSoftwareGet = 0x17,
	ZWaveSoftwareReport = 0x18,
}

function parseVersion(buffer: Buffer): string {
	if (
		buffer[0] ===  0
		&& buffer[1] === 0
		&& buffer[2] === 0
	) return "unused";
	return `${buffer[0]}.${buffer[1]}.${buffer[2]}`;
}

@commandClass(CommandClasses.Version)
@implementedVersion(3)
@expectedCCResponse(CommandClasses.Version)
export class VersionCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(driver: IDriver, nodeId?: number);
	constructor(
		driver: IDriver, nodeId: number,
		command: VersionCommand.Get
			| VersionCommand.CapabilitiesGet
			| VersionCommand.ZWaveSoftwareGet,
		);
	constructor(
		driver: IDriver, nodeId: number,
		command: VersionCommand.CommandClassGet,
		requestedCC: CommandClasses,
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public versionCommand?: VersionCommand,
		public requestedCC?: CommandClasses,
	) {
		super(driver, nodeId);
	}
	// tslint:enable:unified-signatures

	@ccValue() public libraryType: ZWaveLibraryTypes;
	@ccValue() public protocolVersion: string;
	@ccValue() public firmwareVersions: string[];
	@ccValue() public hardwareVersion: number;
	@ccValue() public sdkVersion: string;
	@ccValue() public applicationFrameworkAPIVersion: string;
	@ccValue() public applicationFrameworkBuildNumber: number;
	@ccValue() public hostInterfaceVersion: string;
	@ccValue() public hostInterfaceBuildNumber: number;
	@ccValue() public zWaveProtocolVersion: string;
	@ccValue() public zWaveProtocolBuildNumber: number;
	@ccValue() public applicationVersion: string;
	@ccValue() public applicationBuildNumber: number;

	public supportsCommand(cmd: VersionCommand): Maybe<boolean> {
		switch (cmd) {
			case VersionCommand.Get: return true; // This is mandatory
			case VersionCommand.CommandClassGet: return true; // This is mandatory
			case VersionCommand.CapabilitiesGet: return this.version >= 3;
			case VersionCommand.ZWaveSoftwareGet: return this._supportsZWaveSoftwareGet;
		}
		return super.supportsCommand(cmd);
	}
	private _supportsZWaveSoftwareGet: Maybe<boolean> = unknownBoolean;

	private _ccVersion: number;
	public get ccVersion(): number {
		return this._ccVersion;
	}

	public serialize(): Buffer {
		switch (this.versionCommand) {
			case VersionCommand.Get:
			case VersionCommand.CapabilitiesGet:
			case VersionCommand.ZWaveSoftwareGet:
				this.payload = Buffer.from([this.versionCommand]);
				break;
			case VersionCommand.CommandClassGet:
				this.payload = Buffer.from([
					this.versionCommand,
					this.requestedCC,
				]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Version CC with a command other than Get, CapabilitiesGet, ZWaveSoftwareGet or CommandClassGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.versionCommand = this.payload[0];
		switch (this.versionCommand) {
			case VersionCommand.Report:
				this.libraryType = this.payload[1];
				this.protocolVersion = `${this.payload[2]}.${this.payload[3]}`;
				this.firmwareVersions = [`${this.payload[4]}.${this.payload[5]}`];
				if (this.version >= 2) {
					this.hardwareVersion = this.payload[6];
					const additionalFirmwares = this.payload[7];
					for (let i = 0; i < additionalFirmwares; i++) {
						this.firmwareVersions.push(`${this.payload[8 + 2 * i]}.${this.payload[8 + 2 * i + 1]}`);
					}
				}
				break;

			case VersionCommand.CommandClassReport:
				this.requestedCC = this.payload[1];
				this._ccVersion = this.payload[2];
				break;

			case VersionCommand.CapabilitiesReport: {
				const capabilities = this.payload[1];
				this._supportsZWaveSoftwareGet = !!(capabilities & 0b100);
				break;
			}

			case VersionCommand.ZWaveSoftwareReport:
				this.sdkVersion = parseVersion(this.payload.slice(1));
				this.applicationFrameworkAPIVersion = parseVersion(this.payload.slice(4));
				if (this.applicationFrameworkAPIVersion !== "unused") {
					this.applicationFrameworkBuildNumber = this.payload.readUInt16BE(7);
				} else {
					this.applicationFrameworkBuildNumber = 0;
				}
				this.hostInterfaceVersion = parseVersion(this.payload.slice(9));
				if (this.hostInterfaceVersion !== "unused") {
					this.hostInterfaceBuildNumber = this.payload.readUInt16BE(12);
				} else {
					this.hostInterfaceBuildNumber = 0;
				}
				this.zWaveProtocolVersion = parseVersion(this.payload.slice(14));
				if (this.zWaveProtocolVersion !== "unused") {
					this.zWaveProtocolBuildNumber = this.payload.readUInt16BE(17);
				} else {
					this.zWaveProtocolBuildNumber = 0;
				}
				this.applicationVersion = parseVersion(this.payload.slice(14));
				if (this.applicationVersion !== "unused") {
					this.applicationBuildNumber = this.payload.readUInt16BE(17);
				} else {
					this.applicationBuildNumber = 0;
				}
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a Version CC with a command other than Report, CommandClassReport, CapabilitiesReport or ZWaveSoftwareReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

	/** Requests static or dynamic state for a given from a node */
	public static createStateRequest(driver: IDriver, node: ZWaveNode, kind: StateKind): SendDataRequest | void {
		// TODO: Check if we have requested that information before and store it
		if (kind & StateKind.Static) {
			const cc = new VersionCC(driver, node.id, VersionCommand.Get);
			return new SendDataRequest(driver, cc);
		}
	}

}
