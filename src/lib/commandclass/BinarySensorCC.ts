import { IDriver } from "../driver/IDriver";
import { parseBitMask } from "../values/Primitive";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum BinarySensorCommand {
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x01,
	SupportedReport = 0x04,
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
	"Door/Window" = 0x0a,
	Tilt = 0x0b,
	Motion = 0x0c,
	"Glass Break" = 0x0d,
	Any = 0xff,
}

@commandClass(CommandClasses["Binary Sensor"])
@implementedVersion(2)
export class BinarySensorCC extends CommandClass {
	public ccCommand!: BinarySensorCommand;
}

interface BinarySensorCCGetOptions extends CCCommandOptions {
	sensorType?: BinarySensorType;
}

@CCCommand(BinarySensorCommand.Report)
export class BinarySensorCCReport extends BinarySensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this.value = this.payload[0] === 0xff;
		this.sensorType = this.payload[1];
	}

	public sensorType: BinarySensorType;
	public value: boolean;
}

@CCCommand(BinarySensorCommand.Get)
@expectedCCResponse(BinarySensorCCReport)
export class BinarySensorCCGet extends BinarySensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BinarySensorCCGetOptions,
	) {
		super(driver, options);
		// Deserialization not supported
	}

	public sensorType: BinarySensorType | undefined;

	public serialize(): Buffer {
		if (this.version >= 2 && this.sensorType != undefined) {
			this.payload = Buffer.from([this.sensorType]);
		}
		return super.serialize();
	}
}

@CCCommand(BinarySensorCommand.SupportedReport)
export class BinarySensorCCSupportedReport extends BinarySensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._supportedSensorTypes = parseBitMask(this.payload);
	}

	private _supportedSensorTypes: BinarySensorType[];
	public get supportedSensorTypes(): BinarySensorType[] {
		return this._supportedSensorTypes;
	}
}

@CCCommand(BinarySensorCommand.SupportedGet)
@expectedCCResponse(BinarySensorCCSupportedReport)
export class BinarySensorCCSupportedGet extends BinarySensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
