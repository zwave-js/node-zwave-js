import { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum ManufacturerSpecificCommand {
	Get = 0x04,
	Report = 0x05,
}

@commandClass(CommandClasses["Manufacturer Specific"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(driver: Driver, nodeId?: number);
	constructor(driver: Driver, nodeId: number, ccCommand: ManufacturerSpecificCommand.Get);

	constructor(
		driver: Driver,
		public nodeId: number,
		public ccCommand?: ManufacturerSpecificCommand,
		...args: any[]
	) {
		super(driver, nodeId);
	}
	// tslint:enable:unified-signatures

	private _manufacturerId: number;
	public get manufacturerId(): number {
		return this._manufacturerId;
	}

	private _productType: number;
	public get productType(): number {
		return this._productType;
	}

	private _productId: number;
	public get productId(): number {
		return this._productId;
	}

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
				this._manufacturerId = this.payload.readUInt16BE(1);
				this._productType = this.payload.readUInt16BE(3);
				this._productId = this.payload.readUInt16BE(5);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a ManufacturerSpecific CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
