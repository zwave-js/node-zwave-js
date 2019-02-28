import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority} from "../message/Message";
import { log } from "../util/logger";
import { num2hex } from "../util/strings";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

// TODO: encode duration:
// SET:
// 0x00 = instantly
// 0x01..0x7F = 1 to 127 seconds
// 0x80..0xFE = 1 to 127 minutes
// 0xFF = factory default
// ---
// REPORT:
// 0x00 = already at the target value
// 0x01..0x7F = 1 to 127 seconds
// 0x80..0xFD = 1 to 126 minutes
// 0xFE = unknown duration
// 0xFF = reserved

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}
@messageTypes(MessageType.Request, FunctionType.SendData)
export class ThermostatSetpoint extends Message {

	constructor(
		public nodeId: number,
		public ccCommand?: BasicCommand,
		targetValue?: number,
	) {
		super();
		this._targetValue = targetValue;
	}
	// tslint:enable:unified-signatures

	private _currentValue: number;
	public get currentValue(): number {
		return this._currentValue;
	}

	private _targetValue: number;
	public get targetValue(): number {
		return this._targetValue;
	}

	private _duration: number;
	public get duration(): number {
		return this._duration;
	}

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	private SIZE_MASK = 0x07;
	private PRECISION_MASK = 0xe0;
	private PRECISION_SHIFT = 0x05;

	private getScaleAndPrecision(x: string): any {
		// x = parseFloat(x) + "";
		const scale = x.indexOf(".");
		if (scale === -1) return null;
		return {
			scale : scale,
			precision : x.length - scale - 1,
		};
	}

	private setScale(x: string, scale: number): string {
		x = parseFloat(x) + "";
		const array = x.split(".");
		return (parseFloat(array[0] + "." + array[1].substring(0, scale))).toString();
	}

	public encodeValue(value: number): number[] {
		// Remove any trailing zero's so we send the least amount of bytes possible
		let normalizedValue = Number(value).toFixed(2);

 		// Make our scale at least 0, precision cannot be more than 7 but
		// this is guarded by the Integer min / max values already.
		const res = this.getScaleAndPrecision(normalizedValue);
		if (res.scale < 0) {
			normalizedValue = this.setScale(normalizedValue.toString(), 0);
		}

		// tslint:disable-next-line:radix
		if (parseInt(normalizedValue) > Number.MAX_VALUE) {
			throw new ZWaveError("ArithmeticException", ZWaveErrorCodes.ArithmeticException);
		// tslint:disable-next-line:radix
		} else if (parseInt(normalizedValue) < Number.MIN_VALUE) {
			throw new ZWaveError("ArithmeticException", ZWaveErrorCodes.ArithmeticException);
		}

		// default size = 4
		let size = 4;

		// it might fit in a byte or short
		// tslint:disable-next-line:radix
		if (parseInt(normalizedValue) >= Number.MIN_SAFE_INTEGER && parseInt(normalizedValue) <= Number.MAX_SAFE_INTEGER) {
			size = 1;
		// tslint:disable-next-line:radix
		} else if (parseInt(normalizedValue) >= Number.MIN_VALUE && parseInt(normalizedValue) <= Number.MAX_VALUE) {
			size = 2;
		}

		const precision = res.scale;

		/* byte[] result = new byte[size + 1]; */
		const result = [];
		result[0] = ((precision << this.PRECISION_SHIFT) | size);
		// tslint:disable-next-line:radix
		const unscaledValue = parseInt(normalizedValue); // ie. 22.5 = 225
		for (let i = 0; i < size; i++) {
 			result[size - i] = ((unscaledValue >> (i * 8)) & 0xFF);
		}
		return result;
	}

	// private _errorCode: number;
	// public get errorCode(): number {
	// 	return this._errorCode;
	// }

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._wasSent = this.payload[0] !== 0;
		// if (!this._wasSent) this._errorCode = this.payload[0];

		return ret;
	}

	public serialize(): Buffer {
		const scale = 0;
		const setpointType = 1;
		const setpoint = this._targetValue;

		try {
			const encodedValue = this.encodeValue(setpoint);
			const array = [
				setpointType,
				encodedValue[0] + (scale << 3),
			];
			for (const element of encodedValue) {
				array.push(encodedValue[element]);
			}

			this.payload = Buffer.from(array);
		} catch (e) {
			log("self", `an exception has occured`, "debug");
			throw new ZWaveError("NODE {}: Got an arithmetic exception converting value {} to a valid Z-Wave value. Ignoring THERMOSTAT_SETPOINT_SET message.", ZWaveErrorCodes.ArithmeticException);
		}
		return new Buffer("");
	}
	public toJSON() {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			// errorCode: this.errorCode,
		});
	}
}

@commandClass(CommandClasses["Thermostat Setpoint"])
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@expectedCCResponse(CommandClasses["Thermostat Setpoint"])
export class ThermostatSetpointCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(nodeId?: number);
	constructor(nodeId: number, ccCommand: BasicCommand.Get);
	constructor(nodeId: number, ccCommand: BasicCommand.Set, targetValue: number);

	constructor(
		public nodeId: number,
		public ccCommand?: BasicCommand,
		targetValue?: number,
	) {
		super(nodeId);
		this._targetValue = targetValue;
	}
	// tslint:enable:unified-signatures

	private _currentValue: number;
	public get currentValue(): number {
		return this._currentValue;
	}

	private _targetValue: number;
	public get targetValue(): number {
		return this._targetValue;
	}

	private _duration: number;
	public get duration(): number {
		return this._duration;
	}

	// setpointTypes
	// HEATING(1, "Heating"),
	// COOLING(2, "Cooling"),
	// FURNACE(7, "Furnace"),
	// DRY_AIR(8, "Dry Air"),
	// MOIST_AIR(9, "Moist Air"),
	// AUTO_CHANGEOVER(10, "Auto Changeover"),
	// HEATING_ECON(11, "Heating Economical"),
	// COOLING_ECON(12, "Cooling Economical"),
	// AWAY_HEATING(13, "Away Heating");

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BasicCommand.Get:
				this.payload = Buffer.from([this.ccCommand]);
				// no real payload
				break;
			case BasicCommand.Set:
				// this.payload = Buffer.from([
				// 	this.ccCommand,
				// 	this._targetValue,
				// ]);

				const scale = 0;
				const setpointType = 1;
				const setpoint = this._targetValue;

				try {
					const encodedValue = super.encodeValue(setpoint);
					const array = [
						setpointType,
						encodedValue[0] + (scale << 3),
					];
					for (const element of encodedValue) {
						array.push(encodedValue[element]);
					}

					this.payload = Buffer.from(array);
				} catch (e) {
					log("self", `an exception has occured`, "debug");
					throw new ZWaveError("NODE {}: Got an arithmetic exception converting value {} to a valid Z-Wave value. Ignoring THERMOSTAT_SETPOINT_SET message.", ZWaveErrorCodes.ArithmeticException);
				}
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Basic CC with a command other than Get or Set",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case BasicCommand.Report:
				// this._currentValue = this.payload[1];
				// starting in V2:
				// this._targetValue = this.payload[2];
				this._currentValue = super.extractValue(2);
				log("controller", `Thermostat Setpoint Report: ${this.nodeId} = ${this._currentValue}`, "info");
				this._duration = this.payload[3];
				break;
			default:
				throw new ZWaveError(
					`Cannot deserialize a Basic CC with a command other than Report. Received ${BasicCommand[this.ccCommand]} (${num2hex(this.ccCommand)})`,
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
