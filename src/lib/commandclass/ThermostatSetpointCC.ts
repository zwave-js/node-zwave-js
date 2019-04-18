import { IDriver } from "../driver/IDriver";
import {
	encodeFloatWithScale,
	parseBitMask,
	parseFloatWithScale,
} from "../values/Primitive";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ThermostatSetpointCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	CapabilitiesGet = 0x09,
	CapabilitiesReport = 0x0a,
}

export enum ThermostatSetpointType {
	"N/A" = 0x00,
	"Heating" = 0x01, // CC v1
	"Cooling" = 0x02, // CC v1
	"Furnace" = 0x07, // CC v1
	"Dry Air" = 0x08, // CC v1
	"Moist Air" = 0x09, // CC v1
	"Auto Changeover" = 0x0a, // CC v1
	"Energy Save Heating" = 0x0b, // CC v2
	"Energy Save Cooling" = 0x0c, // CC v2
	"Away Heating" = 0x0d, // CC v2
	"Away Cooling" = 0x0e, // CC v3
	"Full Power" = 0x0f, // CC v3
}
// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
const thermostatSetpointTypeMap = [
	0x00,
	0x01,
	0x02,
	0x07,
	0x08,
	0x09,
	0x0a,
	0x0b,
	0x0c,
	0x0d,
	0x0e,
	0x0f,
];

export enum ThermostatSetpointScale {
	Celsius = 0,
	Fahrenheit = 1,
}

@commandClass(CommandClasses["Thermostat Setpoint"])
@implementedVersion(3)
@expectedCCResponse(CommandClasses["Thermostat Setpoint"])
export class ThermostatSetpointCC extends CommandClass {
	public ccCommand!: ThermostatSetpointCommand;
}

interface ThermostatSetpointCCSetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
	value: number;
	scale: ThermostatSetpointScale;
}

@CCCommand(ThermostatSetpointCommand.Set)
export class ThermostatSetpointCCSet extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.setpointType = options.setpointType;
			this.value = options.value;
			this.scale = options.scale;
		}
	}

	public setpointType: ThermostatSetpointType;
	public value: number;
	public scale: ThermostatSetpointScale;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize();
	}
}

interface ThermostatSetpointCCGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.Get)
export class ThermostatSetpointCCGet extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: ThermostatSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}
}

@CCCommand(ThermostatSetpointCommand.Report)
export class ThermostatSetpointCCReport extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._setpointType = this.payload[0] & 0b1111;
		({ value: this._value, scale: this._scale } = parseFloatWithScale(
			this.payload.slice(1),
		));
	}

	private _setpointType: ThermostatSetpointType;
	public get setpointType(): ThermostatSetpointType {
		return this._setpointType;
	}
	private _value: number;
	public get value(): number {
		return this._value;
	}
	private _scale: ThermostatSetpointScale;
	public get scale(): ThermostatSetpointScale {
		return this._scale;
	}
}

interface ThermostatSetpointCCCapabilitiesGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesGet)
export class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCCapabilitiesGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: ThermostatSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesReport extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		this._setpointType = this.payload[0];
		let bytesRead: number;
		({
			value: this._minValue,
			scale: this._minValueScale,
			bytesRead,
		} = parseFloatWithScale(this.payload.slice(1)));
		({
			value: this._maxValue,
			scale: this._maxValueScale,
		} = parseFloatWithScale(this.payload.slice(1 + bytesRead)));
	}

	private _minValue: number;
	public get minValue(): number {
		return this._minValue;
	}
	private _maxValue: number;
	public get maxValue(): number {
		return this._maxValue;
	}
	private _minValueScale: ThermostatSetpointScale;
	public get minValueScale(): ThermostatSetpointScale {
		return this._minValueScale;
	}
	private _maxValueScale: ThermostatSetpointScale;
	public get maxValueScale(): ThermostatSetpointScale {
		return this._maxValueScale;
	}
	private _setpointType: ThermostatSetpointType;
	public get setpointType(): ThermostatSetpointType {
		return this._setpointType;
	}
}

@CCCommand(ThermostatSetpointCommand.SupportedGet)
export class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(ThermostatSetpointCommand.SupportedReport)
export class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		const bitMask = this.payload;
		const supported = parseBitMask(bitMask);
		if (this.version >= 3) {
			// Interpretation A
			this._supportedSetpointTypes = supported.map(
				i => thermostatSetpointTypeMap[i],
			);
		} else {
			// TODO: Determine which interpretation the device complies to
			this._supportedSetpointTypes = supported;
		}
		// TODO:
		// Some devices skip the gaps in the ThermostatSetpointType (Interpretation A), some don't (Interpretation B)
		// Devices with V3+ must comply with Interpretation A
		// It is RECOMMENDED that a controlling node determines supported Setpoint Types
		// by sending one Thermostat Setpoint Get Command at a time while incrementing
		// the requested Setpoint Type. If the same Setpoint Type is advertised in the
		// resulting Thermostat Setpoint Report Command, the controlling node MAY conclude
		// that the actual Setpoint Type is supported. If the Setpoint Type 0x00 (type N/A)
		// is advertised in the resulting Thermostat Setpoint Report Command, the controlling
		// node MUST conclude that the actual Setpoint Type is not supported.
	}

	private _supportedSetpointTypes: ThermostatSetpointType[];
	public get supportedSetpointTypes(): readonly ThermostatSetpointType[] {
		return this._supportedSetpointTypes;
	}
}
