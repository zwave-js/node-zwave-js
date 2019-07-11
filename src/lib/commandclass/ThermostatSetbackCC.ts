import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import {
	decodeSetbackState,
	encodeSetbackState,
	SetbackState,
} from "../values/SetbackState";
import { CCAPI } from "./API";
import {
	API,
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

@API(CommandClasses["Thermostat Setback"])
export class ThermostatSetbackCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		const cc = new ThermostatSetbackCCGet(this.driver, {
			nodeId: this.node.id,
		});
		const response = (await this.driver.sendCommand<
			ThermostatSetbackCCReport
		>(cc))!;
		return {
			setbackType: response.setbackType,
			setbackState: response.setbackState,
		};
	}

	public async set(
		setbackType: SetbackType,
		setbackState: SetbackState,
	): Promise<void> {
		const cc = new ThermostatSetbackCCSet(this.driver, {
			nodeId: this.node.id,
			setbackType,
			setbackState,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses["Thermostat Setback"])
@implementedVersion(1)
export class ThermostatSetbackCC extends CommandClass {
	public ccCommand!: ThermostatSetbackCommand;
}

interface ThermostatSetbackCCSetOptions extends CCCommandOptions {
	setbackType: SetbackType;
	setbackState: SetbackState;
}

@CCCommand(ThermostatSetbackCommand.Set)
export class ThermostatSetbackCCSet extends ThermostatSetbackCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetbackCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setbackType = options.setbackType;
			this.setbackState = options.setbackState;
		}
	}

	public setbackType: SetbackType;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	public setbackState: SetbackState;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.setbackType & 0b11,
			encodeSetbackState(this.setbackState),
		]);
		return super.serialize();
	}
}

@CCCommand(ThermostatSetbackCommand.Report)
export class ThermostatSetbackCCReport extends ThermostatSetbackCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._setbackType = this.payload[0] & 0b11;
		// If we receive an unknown setback state, return the raw value
		this._setbackState =
			decodeSetbackState(this.payload[1]) || this.payload[1];
		this.persistValues();
	}

	private _setbackType: SetbackType;
	@ccValue() public get setbackType(): SetbackType {
		return this._setbackType;
	}

	private _setbackState: SetbackState;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	@ccValue() public get setbackState(): SetbackState {
		return this._setbackState;
	}
}

@CCCommand(ThermostatSetbackCommand.Get)
@expectedCCResponse(ThermostatSetbackCCReport)
export class ThermostatSetbackCCGet extends ThermostatSetbackCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
