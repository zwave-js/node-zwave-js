import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { ValueMetadata } from "../values/Metadata";
import { parseBitMask, parseFloatWithScale } from "../values/Primitive";
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
import { getScale, MultilevelSensorScale } from "./MultilevelSensorScale";
import { MultilevelSensorTypes } from "./MultilevelSensorTypes";

export enum MultilevelSensorCommand {
	GetSupportedSensor = 0x01,
	SupportedSensorReport = 0x02,
	GetSupportedScale = 0x03,
	Get = 0x04,
	Report = 0x05,
	SupportedScaleReport = 0x06,
}

export interface MultilevelSensorValue {
	value: number;
	scale: MultilevelSensorScale;
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Multilevel Sensor"])
export class MultilevelSensorCCAPI extends CCAPI {
	public async get(): Promise<number>;
	public async get(
		sensorType: MultilevelSensorTypes,
		scale: number,
	): Promise<number>;
	public async get(
		sensorType?: MultilevelSensorTypes,
		scale?: number,
	): Promise<number> {
		const cc = new MultilevelSensorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
			scale,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSensorCCReport
		>(cc))!;
		return response.value;
	}

	public async getSupportedSensorTypes(): Promise<
		readonly MultilevelSensorTypes[]
	> {
		const cc = new MultilevelSensorCCGetSupportedSensor(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSensorCCSupportedSensorReport
		>(cc))!;
		return response.supportedSensorTypes;
	}

	public async getSupportedScales(
		sensorType: MultilevelSensorTypes,
	): Promise<readonly number[]> {
		const cc = new MultilevelSensorCCGetSupportedScale(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSensorCCSupportedScaleReport
		>(cc))!;
		return response.sensorSupportedScales;
	}
}

export interface MultilevelSensorCC {
	ccCommand: MultilevelSensorCommand;
}

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
export class MultilevelSensorCC extends CommandClass {
	public static translatePropertyKey(
		propertyName: string,
		propertyKey: number | string,
	): string {
		if (propertyName === "values") {
			if (propertyKey in MultilevelSensorTypes)
				return MultilevelSensorTypes[propertyKey as any];
		}
		return super.translatePropertyKey(propertyName, propertyKey);
	}
}

@CCCommand(MultilevelSensorCommand.Report)
export class MultilevelSensorCCReport extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0];
		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(this.payload.slice(1));
		this._value = value;
		this._scale = getScale(this._type, scale);

		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpoint,
			propertyName: MultilevelSensorTypes[this._type],
		};
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.ReadOnly,
			type: "number",
			unit: this._scale.unit,
		});
		this.getValueDB().setValue(valueId, value);
	}

	private _type: MultilevelSensorTypes;
	public get type(): MultilevelSensorTypes {
		return this._type;
	}

	private _scale: MultilevelSensorScale;
	public get scale(): MultilevelSensorScale {
		return this._scale;
	}

	private _value: number;
	public get value(): number {
		return this._value;
	}
}

// These options are supported starting in V5
interface MultilevelSensorCCGetSpecificOptions {
	sensorType: MultilevelSensorTypes;
	scale: number; // TODO: expose scales
}
type MultilevelSensorCCGetOptions =
	| CCCommandOptions
	| CCCommandOptions & MultilevelSensorCCGetSpecificOptions;

@CCCommand(MultilevelSensorCommand.Get)
@expectedCCResponse(MultilevelSensorCCReport)
export class MultilevelSensorCCGet extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if ("sensorType" in options) {
				this.sensorType = options.sensorType;
				this.scale = options.scale;
			}
		}
	}

	public sensorType: MultilevelSensorTypes | undefined;
	public scale: number | undefined;

	public serialize(): Buffer {
		if (
			this.version >= 5 &&
			this.sensorType != undefined &&
			this.scale != undefined
		) {
			this.payload = Buffer.from([
				this.sensorType,
				(this.scale & 0b11) << 3,
			]);
		}
		return super.serialize();
	}
}

@CCCommand(MultilevelSensorCommand.SupportedSensorReport)
export class MultilevelSensorCCSupportedSensorReport extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this._supportedSensorTypes = parseBitMask(this.payload);
		this.persistValues();
	}

	private _supportedSensorTypes: MultilevelSensorTypes[];
	// TODO: Use this during interview to precreate values
	@ccValue(true)
	public get supportedSensorTypes(): readonly MultilevelSensorTypes[] {
		return this._supportedSensorTypes;
	}
}

@CCCommand(MultilevelSensorCommand.GetSupportedSensor)
@expectedCCResponse(MultilevelSensorCCSupportedSensorReport)
export class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(MultilevelSensorCommand.SupportedScaleReport)
export class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		const sensorType = this.payload[0];
		const supportedScales: number[] = [];
		const bitMask = this.payload[1] && 0b1111;
		if (!!(bitMask & 0b1)) supportedScales.push(1);
		if (!!(bitMask & 0b10)) supportedScales.push(2);
		if (!!(bitMask & 0b100)) supportedScales.push(3);
		if (!!(bitMask & 0b1000)) supportedScales.push(4);
		this.supportedScales = [sensorType, supportedScales];
		this.persistValues();
	}

	@ccKeyValuePair(true)
	private supportedScales: [MultilevelSensorTypes, number[]];

	public get sensorType(): MultilevelSensorTypes {
		return this.supportedScales[0];
	}

	public get sensorSupportedScales(): readonly number[] {
		return this.supportedScales[1];
	}
}

interface MultilevelSensorCCGetSupportedScaleOptions extends CCCommandOptions {
	sensorType: MultilevelSensorTypes;
}

@CCCommand(MultilevelSensorCommand.GetSupportedScale)
@expectedCCResponse(MultilevelSensorCCSupportedScaleReport)
export class MultilevelSensorCCGetSupportedScale extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetSupportedScaleOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType;
		}
	}

	public sensorType: MultilevelSensorTypes;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sensorType]);
		return super.serialize();
	}
}
