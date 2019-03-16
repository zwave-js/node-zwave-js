import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum ZWavePlusCommand {
	Get = 0x01,
	Report = 0x02,
}

export enum ZWavePlusRoleType {
	CentralStaticController = 0x00,
	SubStaticController = 0x01,
	PortableController = 0x02,
	PortableReportingController = 0x03,
	PortableSlave = 0x04,
	AlwaysOnSlave = 0x05,
	SleepingReportingSlave = 0x06,
	SleepingListeningSlave = 0x07,
}

export enum ZWavePlusNodeType {
	Node = 0x00,		// ZWave+ Node
	IPGateway = 0x02,	// ZWave+ for IP Gateway
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Z-Wave Plus Info"])
export class ZWavePlusCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(
		driver: IDriver,
		nodeId?: number,
	);
	constructor(
		driver: IDriver,
		nodeId: number,
		command: ZWavePlusCommand.Get,
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ZWavePlusCommand,
	) {
		super(driver, nodeId);
	}
	// tslint:enable:unified-signatures

	private _zwavePlusVersion: number;
	public get zwavePlusVersion(): number {
		return this._zwavePlusVersion;
	}

	private _nodeType: ZWavePlusNodeType;
	public get nodeType(): ZWavePlusNodeType {
		return this._nodeType;
	}

	private _roleType: ZWavePlusRoleType;
	public get roleType(): ZWavePlusRoleType {
		return this._roleType;
	}

	private _installerIcon: number;
	public get installerIcon(): number {
		return this._installerIcon;
	}

	private _userIcon: number;
	public get userIcon(): number {
		return this._userIcon;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ZWavePlusCommand.Get:
				this.payload = Buffer.from([this.ccCommand]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a ZWavePlus CC with a command other than Get",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case ZWavePlusCommand.Report:
				this._zwavePlusVersion = this.payload[1];
				this._roleType = this.payload[2];
				this._nodeType = this.payload[3];
				this._installerIcon = this.payload.readUInt16BE(4);
				this._userIcon = this.payload.readUInt16BE(6);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a ZWavePlus CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
