import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

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
	Node = 0x00, // ZWave+ Node
	IPGateway = 0x02, // ZWave+ for IP Gateway
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Z-Wave Plus Info"])
export class ZWavePlusCC extends CommandClass {
	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ZWavePlusCommand.Get,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ZWavePlusCommand,
	) {
		super(driver, nodeId, ccCommand);
	}
	// tslint:enable:unified-signatures

	@ccValue() public zwavePlusVersion: number;
	@ccValue() public nodeType: ZWavePlusNodeType;
	@ccValue() public roleType: ZWavePlusRoleType;
	@ccValue() public installerIcon: number;
	@ccValue() public userIcon: number;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ZWavePlusCommand.Get:
				// no real payload
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

		switch (this.ccCommand) {
			case ZWavePlusCommand.Report:
				this.zwavePlusVersion = this.payload[0];
				this.roleType = this.payload[1];
				this.nodeType = this.payload[2];
				this.installerIcon = this.payload.readUInt16BE(3);
				this.userIcon = this.payload.readUInt16BE(5);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a ZWavePlus CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
