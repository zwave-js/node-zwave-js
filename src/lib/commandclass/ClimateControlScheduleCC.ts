import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
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
	ExtendedReport = 0x08,
}

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@expectedCCResponse(CommandClasses["Climate Control Schedule"])
export class ClimateControlScheduleCC extends CommandClass {

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

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BasicCommand.Get:
				this.payload = Buffer.from([this.ccCommand]);
				// no real payload
				break;
			case BasicCommand.Set:
				this.payload = Buffer.from([
					this.ccCommand,
					this._targetValue,
				]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Climate Control Schedule with a command other than Get or Set",
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
			case BasicCommand.ExtendedReport:
				let day = this.payload[1] & 0x07;
				if (day > 7) {
					log("controller", `Day Value was greater than range. Setting to Invalid`, "debug");
					day = 0;
				}

				for ( let i = 2; i < 29; i += 3 ) {
					const setback = this.payload[i + 2];
					if ( setback === 0x7f ) {
						// Switch point is unused, so we stop parsing here
						break;
					}

					const hours = this.payload[i] & 0x1f;
					const minutes = this.payload[i + 1] & 0x3f;

					if ( setback === 0x79 ) {
						log("controller", `ClimateControlSchedule Frost Protection Mode: ${this.nodeId} = ${day} - ${hours}:${minutes}`, "debug");
					} else if ( setback === 0x7a ) {
						log("controller", `ClimateControlSchedule Energy Saving Mode: ${this.nodeId} = ${day} - ${hours}:${minutes}`, "debug");
					} else {
						log("controller", `ClimateControlSchedule Setback: ${this.nodeId} = ${day} - ${hours}:${minutes} - ${setback}`, "debug");
					}

					this._currentValue = 4711;
					// value->SetSwitchPoint( hours, minutes, setback );
				}

				log("controller", `ClimateControlSchedule Report: ${this.nodeId} = ${this._currentValue}`, "info");
				break;
			default:
				throw new ZWaveError(
					`Cannot deserialize a Climate Control Schedule CC with a command other than Report. Received ${BasicCommand[this.ccCommand]} (${num2hex(this.ccCommand)})`,
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
