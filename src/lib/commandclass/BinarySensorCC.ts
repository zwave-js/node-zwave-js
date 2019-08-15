import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import { parseBitMask } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
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

@API(CommandClasses["Binary Sensor"])
export class BinarySensorCCAPI extends CCAPI {
	/**
	 * Retrieves the current value from this sensor
	 * @param sensorType The (optional) sensor type to retrieve the value for
	 */
	public async get(sensorType?: BinarySensorType): Promise<boolean> {
		const cc = new BinarySensorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = (await this.driver.sendCommand<BinarySensorCCReport>(
			cc,
		))!;
		// We don't want to repeat the sensor type
		return response.value;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getSupportedSensorTypes() {
		const cc = new BinarySensorCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			BinarySensorCCSupportedReport
		>(cc))!;
		// We don't want to repeat the sensor type
		return response.supportedSensorTypes;
	}
}

@commandClass(CommandClasses["Binary Sensor"])
@implementedVersion(2)
export class BinarySensorCC extends CommandClass {
	public ccCommand!: BinarySensorCommand;
}

@CCCommand(BinarySensorCommand.Report)
export class BinarySensorCCReport extends BinarySensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		const _value = this.payload[0] === 0xff;
		let _sensorType = BinarySensorType.Any;
		if (this.version >= 2 && this.payload.length >= 2) {
			_sensorType = this.payload[1];
		}
		this.values = [_sensorType, _value];
		this.persistValues();
	}

	@ccKeyValuePair() private values: [BinarySensorType, boolean];

	public get sensorType(): BinarySensorType {
		return this.values[0];
	}

	public get value(): boolean {
		return this.values[1];
	}
}

interface BinarySensorCCGetOptions extends CCCommandOptions {
	sensorType?: BinarySensorType;
}

@CCCommand(BinarySensorCommand.Get)
@expectedCCResponse(BinarySensorCCReport)
export class BinarySensorCCGet extends BinarySensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BinarySensorCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType;
		}
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

		validatePayload(this.payload.length >= 1);
		this._supportedSensorTypes = parseBitMask(this.payload);
		this.persistValues();
	}

	private _supportedSensorTypes: BinarySensorType[];
	// TODO: should this be an internal value?
	@ccValue() public get supportedSensorTypes(): readonly BinarySensorType[] {
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
