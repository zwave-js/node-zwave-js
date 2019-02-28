import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
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

@commandClass(CommandClasses.Battery)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@expectedCCResponse(CommandClasses.Battery)
export class BatteryCC extends CommandClass {

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
				this._currentValue = this.payload[1];
				// starting in V2:
				this._targetValue = this.payload[2];
				this._duration = this.payload[3];

				// A Battery level of 255 means battery low.
				// Set battery level to 0
				if (this._currentValue === 255) {
					this._currentValue = 0;
				}
				break;

			default:
				throw new ZWaveError(
					`Cannot deserialize a Basic CC with a command other than Report. Received ${BasicCommand[this.ccCommand]} (${num2hex(this.ccCommand)})`,
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
