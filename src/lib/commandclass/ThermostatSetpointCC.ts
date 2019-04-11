import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import {
	encodeFloatWithScale,
	parseBitMask,
	parseFloatWithScale,
} from "../values/Primitive";
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
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
	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ThermostatSetpointCommand.SupportedGet,
	);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand:
			| ThermostatSetpointCommand.Get
			| ThermostatSetpointCommand.CapabilitiesGet,
		setpointType: ThermostatSetpointType,
	);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ThermostatSetpointCommand.Set,
		setpointType: ThermostatSetpointType,
		value: number,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ThermostatSetpointCommand,
		setpointType?: ThermostatSetpointType,
		value?: number,
	) {
		super(driver, nodeId, ccCommand);
		switch (ccCommand) {
			case ThermostatSetpointCommand.Set:
				this.value = value;
			// fallthrough
			case ThermostatSetpointCommand.Get:
			case ThermostatSetpointCommand.CapabilitiesGet:
				this.setpointType = setpointType;
				break;
		}
	}
	// tslint:enable:unified-signatures

	@ccValue() public value: number;
	@ccValue() public scale: ThermostatSetpointScale;
	@ccValue() public minValue: number;
	@ccValue() public maxValue: number;
	@ccValue() public minValueScale: ThermostatSetpointScale;
	@ccValue() public maxValueScale: ThermostatSetpointScale;
	@ccValue() public setpointType: ThermostatSetpointType;

	public supportedSetpointTypes: ThermostatSetpointType[];

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ThermostatSetpointCommand.Get:
			case ThermostatSetpointCommand.CapabilitiesGet:
				this.payload = Buffer.from([this.setpointType & 0b1111]);
				break;

			case ThermostatSetpointCommand.Set:
				this.payload = Buffer.concat([
					Buffer.from([this.setpointType & 0b1111]),
					encodeFloatWithScale(this.value, this.scale),
				]);
				break;

			case ThermostatSetpointCommand.SupportedGet:
				// no real payload
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a ThermostatSetpoint CC with a command other than Get, Set, SupportedGet or CapabilitiesGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case ThermostatSetpointCommand.Report:
				this.setpointType = this.payload[0] & 0b1111;
				({ value: this.value, scale: this.scale } = parseFloatWithScale(
					this.payload.slice(1),
				));
				break;

			case ThermostatSetpointCommand.SupportedReport: {
				const bitMask = this.payload;
				const supported = parseBitMask(bitMask);
				if (this.version >= 3) {
					// Interpretation A
					this.supportedSetpointTypes = supported.map(
						i => thermostatSetpointTypeMap[i],
					);
				} else {
					// TODO: Determine which interpretation the device complies to
					this.supportedSetpointTypes = supported;
				}
				break;
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

			case ThermostatSetpointCommand.CapabilitiesReport: {
				this.setpointType = this.payload[0];
				let bytesRead: number;
				({
					value: this.minValue,
					scale: this.minValueScale,
					bytesRead,
				} = parseFloatWithScale(this.payload.slice(1)));
				({
					value: this.maxValue,
					scale: this.maxValueScale,
				} = parseFloatWithScale(this.payload.slice(1 + bytesRead)));
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a ThermostatSetpoint CC with a command other than Report, SupportedReport or CapabilitiesReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
