import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ccValue, CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum ManufacturerSpecificCommand {
	Get = 0x04,
	Report = 0x05,
}

@commandClass(CommandClasses["Manufacturer Specific"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(driver: IDriver, nodeId?: number);
	constructor(driver: IDriver, nodeId: number, ccCommand: ManufacturerSpecificCommand.Get);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ManufacturerSpecificCommand,
		...args: any[]
	) {
		super(driver, nodeId);
	}
	// tslint:enable:unified-signatures

	@ccValue() public manufacturerId: number;
	@ccValue() public productType: number;
	@ccValue() public productId: number;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ManufacturerSpecificCommand.Get:
				this.payload = Buffer.from([this.ccCommand]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a ManufacturerSpecific CC with a command other than Get",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case ManufacturerSpecificCommand.Report:
				this.manufacturerId = this.payload.readUInt16BE(1);
				this.productType = this.payload.readUInt16BE(3);
				this.productId = this.payload.readUInt16BE(5);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a ManufacturerSpecific CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
