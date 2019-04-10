import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { parseBitMask } from "../values/Primitive";
import { ccValue, CommandClass, commandClass, expectedCCResponse, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum BinarySensorCommand {
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x01,
	SupportedReport = 0x04,
}

@commandClass(CommandClasses["Binary Sensor"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Binary Sensor"])
export class BinarySensorCC extends CommandClass {

	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BinarySensorCommand.Get,
		sensorType?: BinarySensorType,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BinarySensorCommand.SupportedGet,
	)

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: BinarySensorCommand,
		sensorType?: BinarySensorType,
	) {
		super(driver, nodeId, ccCommand);
		if (sensorType != undefined) this.sensorType = sensorType;
	}
	// tslint:enable:unified-signatures

	@ccValue() public sensorType: BinarySensorType;
	@ccValue() public value: boolean;

	private _supportedSensorTypes: BinarySensorType[];
	public get supportedSensorTypes(): BinarySensorType[] {
		return this._supportedSensorTypes;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BinarySensorCommand.SupportedGet:
				// no real payload
				break;

			case BinarySensorCommand.Get: {
				if (this.version >= 2) {
					this.payload = Buffer.from([this.sensorType]);
				}
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot serialize a BinarySensor CC with a command other than Get or SupportedGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case BinarySensorCommand.Report:
				this.value = this.payload[0] === 0xFF;
				this.sensorType = this.payload[1];
				break;

			case BinarySensorCommand.SupportedReport: {
				// parse the bitmask into a number array
				this._supportedSensorTypes = parseBitMask(this.payload);
				// const numBitMaskBytes = this.payload.length - 1;
				// const numTypes = numBitMaskBytes * 8 - 1;
				// const sensorBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
				// this._supportedSensorTypes = [];
				// for (let type = 1; type <= numTypes; type++) {
				// 	const byteNum = type >>> 3; // type / 8
				// 	const bitNum = type % 8;
				// 	if ((sensorBitMask[byteNum] & (1 << bitNum)) !== 0) this._supportedSensorTypes.push(type);
				// }
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a BinarySensor CC with a command other than Report or SupportedReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}

export enum BinarySensorType {
	"General Purpose" = 0x01,
	Smoke = 0x02,
	CO = 0x03,
	CO2 = 0x04,
	Heat = 0x05,
	Water = 0x06,
	Freeze = 0x07,
	Tamper = 0x08,
	Aux = 0x09,
	"Door/Window" = 0x0A,
	Tilt = 0x0B,
	Motion = 0x0C,
	"Glass Break" = 0x0D,
	Any = 0xFF,
}
