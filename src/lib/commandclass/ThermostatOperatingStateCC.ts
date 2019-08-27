// import { IDriver } from "../driver/IDriver";
// import { validatePayload } from "../util/misc";
// import {
// 	CCCommand,
// 	ccValue,
// 	CommandClass,
// 	commandClass,
// 	CommandClassDeserializationOptions,
// 	expectedCCResponse,
// 	implementedVersion,
// } from "./CommandClass";
// import { CommandClasses } from "./CommandClasses";

// // All the supported commands
// export enum ThermostatOperatingStateCommand {
// 	Get = 0x02,
// 	Report = 0x03,
// 	LoggingSupportedGet = 0x01,
// 	LoggingSupportedReport = 0x04,
// 	LoggingGet = 0x05,
// 	LoggingReport = 0x06,
// }

// export enum ThermostatOperatingState {
// 	"Idle" = 0x00,
// 	"Heating" = 0x01,
// 	"Cooling" = 0x02,
// 	"Fan Only" = 0x03,
// 	"Pending Heat" = 0x04,
// 	"Pending Cool" = 0x05,
// 	"Vent/Economizer" = 0x06,
// 	"Aux Heating" = 0x07,
// 	"2nd Stage Heating" = 0x08,
// 	"2nd Stage Cooling" = 0x09,
// 	"2nd Stage Aux Heat" = 0x0a,
// 	"3rd Stage Aux Heat" = 0x0b,
// }

export interface ThermostatOperatingStateCC {
	// ccCommand: ThermostatOperatingStateCommand;
}

// @commandClass(CommandClasses["Thermostat Operating State"])
// @implementedVersion(1)
// export class ThermostatOperatingStateCC extends CommandClass {}

// @CCCommand(ThermostatOperatingStateCommand.Report)
// export class ThermostatOperatingStateCCReport extends ThermostatOperatingStateCC {
// 	public constructor(
// 		driver: IDriver,
// 		options: CommandClassDeserializationOptions,
// 	) {
// 		super(driver, options);

// 		validatePayload(this.payload.length >= 1);
// 		this._state = this.payload[0];
// 		this.persistValues();
// 	}

// 	private _state: ThermostatOperatingState;
// 	@ccValue()
// 	public get state(): ThermostatOperatingState {
// 		return this._state;
// 	}
// }

// @CCCommand(ThermostatOperatingStateCommand.Get)
// @expectedCCResponse(ThermostatOperatingStateCCReport)
// export class ThermostatOperatingStateCCGet extends ThermostatOperatingStateCC {}
