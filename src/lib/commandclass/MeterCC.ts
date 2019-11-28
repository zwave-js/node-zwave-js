import { lookupMeterScale, MeterScale } from "../config/Meters";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import {
	Maybe,
	parseBitMask,
	parseFloatWithScale,
	unknownNumber,
} from "../values/Primitive";
import {
	CCCommand,
	CCCommandOptions,
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
export enum MeterCommand {
	Get = 0x01,
	Report = 0x02,
	SupportedGet = 0x03,
	SupportedReport = 0x04,
	Reset = 0x05,
}

export enum RateType {
	Unspecified = 0x00,
	Consumed = 0x01,
	Produced = 0x02,
}

@commandClass(CommandClasses.Meter)
@implementedVersion(2)
export class MeterCC extends CommandClass {
	declare ccCommand: MeterCommand;
}

@CCCommand(MeterCommand.Report)
export class MeterCCReport extends MeterCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0] & 0b0_00_11111;
		this._rateType = (this.payload[0] & 0b0_11_00000) >>> 5;

		const { scale, value, bytesRead } = parseFloatWithScale(
			this.payload.slice(1),
		);
		this._scale = lookupMeterScale(this._type, scale);
		this._value = value;

		if (this.version >= 2 && this.payload.length >= 2 + bytesRead + 2) {
			this._deltaTime = this.payload.readUInt16BE(2 + bytesRead);
			if (this._deltaTime === 0xffff) {
				this._deltaTime = unknownNumber;
			}
			if (
				// 0 means that no previous value is included
				this.deltaTime !== 0 &&
				this.payload.length >= 2 + bytesRead + 2 + bytesRead
			) {
				const { value: prevValue } = parseFloatWithScale(
					// This float is split in the payload
					Buffer.concat([
						Buffer.from([this.payload[1]]),
						this.payload.slice(2 + bytesRead + 2),
					]),
				);
				this._previousValue = prevValue;
			}
		} else {
			// 0 means that no previous value is included
			this._deltaTime = 0;
		}
	}

	private _type: number;
	public get type(): number {
		return this._type;
	}

	private _scale: MeterScale;
	public get scale(): MeterScale {
		return this._scale;
	}

	private _value: number;
	public get value(): number {
		return this._value;
	}

	private _previousValue: number | undefined;
	public get previousValue(): number | undefined {
		return this._previousValue;
	}

	private _rateType: RateType;
	public get rateType(): RateType {
		return this._rateType;
	}

	private _deltaTime: Maybe<number>;
	public get deltaTime(): Maybe<number> {
		return this._deltaTime;
	}
}

interface MeterCCGetOptions extends CCCommandOptions {
	scale?: number;
}

@CCCommand(MeterCommand.Get)
@expectedCCResponse(MeterCCReport)
export class MeterCCGet extends MeterCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | MeterCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.scale = options.scale;
		}
	}

	public scale: number | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.scale || 0]);
		return super.serialize();
	}
}

@CCCommand(MeterCommand.SupportedReport)
export class MeterCCSupportedReport extends MeterCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0] & 0b0_00_11111;
		this._supportsReset = !!(this.payload[0] & 0b1_00_00000);
		this._supportedScales = parseBitMask(
			Buffer.from([this.payload[1] & 0b1111]),
			0,
		);
	}

	private _type: number;
	public get type(): number {
		return this._type;
	}

	private _supportsReset: boolean;
	@ccValue({ internal: true })
	public get supportsReset(): boolean {
		return this._supportsReset;
	}

	private _supportedScales: number[];
	public get supportedScales(): readonly number[] {
		return this._supportedScales;
	}
}

@CCCommand(MeterCommand.SupportedGet)
@expectedCCResponse(MeterCCSupportedReport)
export class MeterCCSupportedGet extends MeterCC {}

@CCCommand(MeterCommand.Reset)
export class MeterCCReset extends MeterCC {}
