import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Maybe } from "../values/Primitive";
import { ccValue, CommandClass, commandClass, expectedCCResponse, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ManufacturerSpecificCommand {
	Get = 0x04,
	Report = 0x05,
	DeviceSpecificGet = 0x06,
	DeviceSpecificReport = 0x07,
}

export enum DeviceIdType {
	FactoryDefault = 0x00,
	SerialNumber = 0x01,
	PseudoRandom = 0x02,
}

@commandClass(CommandClasses["Manufacturer Specific"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCC extends CommandClass {

	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(driver: IDriver, nodeId: number, ccCommand: ManufacturerSpecificCommand.Get);
	public constructor(
		driver: IDriver, nodeId: number,
		ccCommand: ManufacturerSpecificCommand.DeviceSpecificGet,
		deviceIdType: DeviceIdType,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ManufacturerSpecificCommand,
		...args: any[]
	) {
		super(driver, nodeId, ccCommand);
		if (ccCommand === ManufacturerSpecificCommand.DeviceSpecificGet) {
			this.deviceIdType = args[0];
		}
	}
	// tslint:enable:unified-signatures

	@ccValue() public manufacturerId: number;
	@ccValue() public productType: number;
	@ccValue() public productId: number;

	public deviceIdType: DeviceIdType;
	@ccValue() public deviceId: string;

	public supportsCommand(cmd: ManufacturerSpecificCommand): Maybe<boolean> {
		switch (cmd) {
			case ManufacturerSpecificCommand.Get: return true; // This is mandatory
			case ManufacturerSpecificCommand.DeviceSpecificGet: return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ManufacturerSpecificCommand.Get:
				// no real payload
				break;
			case ManufacturerSpecificCommand.DeviceSpecificGet:
				this.payload = Buffer.from([(this.deviceIdType || 0) & 0b111]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a ManufacturerSpecific CC with a command other than Get or DeviceSpecificGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case ManufacturerSpecificCommand.Report:
				this.manufacturerId = this.payload.readUInt16BE(0);
				this.productType = this.payload.readUInt16BE(2);
				this.productId = this.payload.readUInt16BE(4);
				break;

			case ManufacturerSpecificCommand.DeviceSpecificReport: {
				this.deviceIdType = this.payload[0] & 0b111;
				const dataFormat = (this.payload[1] >>> 5);
				const dataLength = this.payload[1] & 0b11111;
				const deviceIdData = this.payload.slice(2, 2 + dataLength);
				if (dataFormat === 0) { // utf8
					this.deviceId = deviceIdData.toString("utf8");
				} else {
					this.deviceId = "0x" + deviceIdData.toString("hex");
				}
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a ManufacturerSpecific CC with a command other than Report or DeviceSpecificReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
