import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { parseBitMask, parseFloatWithScale } from "../util/ValueTypes";
import { ccValue, CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum MultilevelSensorCommand {
	GetSupportedSensor = 0x01,
	SupportedSensorReport = 0x02,
	GetSupportedScale = 0x03,
	Get = 0x04,
	Report = 0x05,
	SupportedScaleReport = 0x06,
}

// TODO: Define sensor types and scales

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
@expectedCCResponse(CommandClasses["Multilevel Sensor"])
export class MultilevelSensorCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(
		driver: IDriver,
		nodeId?: number,
	);

	constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultilevelSensorCommand.GetSupportedSensor,
	);

	constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultilevelSensorCommand.GetSupportedScale,
		sensorType: number, // TODO: Define sensor types
	);

	constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultilevelSensorCommand.Get,
		sensorType?: number, // TODO: Define sensor types
		scale?: number, // TODO: Define scales
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: MultilevelSensorCommand,
		...args: any[]
	) {
		super(driver, nodeId);
		if (this.ccCommand === MultilevelSensorCommand.GetSupportedScale) {
			this.sensorType = args[0];
		} else if (this.ccCommand === MultilevelSensorCommand.Get) {
			[
				this.sensorType,
				this.scale,
			] = args;
		}
	}
	// tslint:enable:unified-signatures

	@ccValue() public sensorType: number;
	@ccValue() public scale: number;
	@ccValue() public value: number;

	private _supportedSensorTypes: number[];
	public get supportedSensorTypes(): number[] {
		return this._supportedSensorTypes;
	}
	private _supportedScales = new Map<number, number[]>();
	public get supportedScales(): Map<number, number[]> {
		return this._supportedScales;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case MultilevelSensorCommand.Get:
				const payload: number[] = [this.ccCommand];
				if (this.version >= 5 && this.sensorType != undefined && this.scale != undefined) {
					payload.push(
						this.sensorType,
						(this.scale & 0b11) << 3,
					);
				}
				this.payload = Buffer.from(payload);
				break;

			case MultilevelSensorCommand.GetSupportedSensor:
				this.payload = Buffer.from([this.ccCommand]);
				break;

			case MultilevelSensorCommand.GetSupportedScale:
				this.payload = Buffer.from([
					this.ccCommand,
					this.sensorType,
				]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a MultilevelSensor CC with a command other than Get, GetSupportedSensor or GetSupportedScale",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case MultilevelSensorCommand.Report:
				this.sensorType = this.payload[1];
				({ value: this.value, scale: this.scale } = parseFloatWithScale(this.payload.slice(2)));
				break;

			case MultilevelSensorCommand.SupportedSensorReport:
				this._supportedSensorTypes = parseBitMask(this.payload.slice(1));
				break;

			case MultilevelSensorCommand.SupportedScaleReport: {
				const supportedScales: number[] = [];
				const bitMask = this.payload[2] && 0b1111;
				if (!!(bitMask & 0b1)) supportedScales.push(1);
				if (!!(bitMask & 0b10)) supportedScales.push(2);
				if (!!(bitMask & 0b100)) supportedScales.push(3);
				if (!!(bitMask & 0b1000)) supportedScales.push(4);
				this._supportedScales.set(this.payload[1], supportedScales);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a MultilevelSensor CC with a command other than Report, SupportedSensorReport or SupportedScaleReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
