import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import {
	decodeSetbackState,
	encodeSetbackState,
	SetbackState,
} from "../values/SetbackState";
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ThermostatSetbackCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum SetbackType {
	None = 0x00,
	Temporary = 0x01,
	Permanent = 0x02,
}

@commandClass(CommandClasses["Thermostat Setback"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Thermostat Setback"])
export class ThermostatSetbackCC extends CommandClass {
	public constructor(driver: IDriver, nodeId?: number);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ThermostatSetbackCommand.Get,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ThermostatSetbackCommand.Set,
		setbackType: SetbackType,
		setbackState: SetbackState,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ThermostatSetbackCommand,
		...args: any[]
	) {
		super(driver, nodeId, ccCommand);
		if (ccCommand === ThermostatSetbackCommand.Set) {
			[this.setbackType, this.setbackState] = args;
		}
	}

	@ccValue() public setbackType: SetbackType;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	@ccValue() public setbackState: SetbackState;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ThermostatSetbackCommand.Get:
				// no real payload
				break;
			case ThermostatSetbackCommand.Set:
				this.payload = Buffer.from([
					this.setbackType & 0b11,
					encodeSetbackState(this.setbackState),
				]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a ThermostatSetback CC with a command other than Set or Get",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case ThermostatSetbackCommand.Report:
				this.setbackType = this.payload[0] & 0b11;
				this.setbackState = decodeSetbackState(this.payload[1]);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a ThermostatSetback CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
