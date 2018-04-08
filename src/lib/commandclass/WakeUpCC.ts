import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { readUInt24BE, writeUInt24BE } from "../util/buffers";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum WakeUpCommand {
	IntervalSet = 0x04,
	IntervalGet = 0x05,
	IntervalReport = 0x06,
	WakeUpNotification = 0x07,
	NoMoreInformation = 0x08,
	IntervalCapabilitiesGet = 0x09,
	IntervalCapabilitiesReport = 0x0A,
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Wake Up"])
export class WakeUpCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(nodeId?: number);
	constructor(
		nodeId: number,
		command: WakeUpCommand.IntervalSet,
		interval: number,
		controllerNodeId: number,
	);
	constructor(
		nodeId: number,
		command: WakeUpCommand.IntervalGet |
			WakeUpCommand.NoMoreInformation |
			WakeUpCommand.IntervalCapabilitiesGet,
	);

	constructor(
		public nodeId: number,
		public wakeupCommand?: WakeUpCommand,
		public wakeupInterval?: number,
		public controllerNodeId?: number,
	) {
		super(nodeId);
	}
	// tslint:enable:unified-signatures

	private _minWakeUpInterval: number;
	public get minWakeUpInterval(): number {
		return this._minWakeUpInterval;
	}

	private _maxWakeUpInterval: number;
	public get maxWakeUpInterval(): number {
		return this._maxWakeUpInterval;
	}

	private _defaultWakeUpInterval: number;
	public get defaultWakeUpInterval(): number {
		return this._defaultWakeUpInterval;
	}

	private _wakeUpIntervalSteps: number;
	public get wakeUpIntervalSteps(): number {
		return this._wakeUpIntervalSteps;
	}

	public serialize(): Buffer {
		switch (this.wakeupCommand) {
			case WakeUpCommand.IntervalGet:
			case WakeUpCommand.NoMoreInformation:
			case WakeUpCommand.IntervalCapabilitiesGet:
				this.payload = Buffer.from([this.wakeupCommand]);
				break;

			case WakeUpCommand.IntervalSet:
				this.payload = Buffer.from([
					this.wakeupCommand,
					0, 0, 0, // placeholder
					this.controllerNodeId,
				]);
				writeUInt24BE(this.payload, this.wakeupInterval, 1);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a WakeUp CC with a command other than IntervalSet, IntervalGet or NoMoreInformation, IntervalCapabilitiesGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.wakeupCommand = this.payload[0];
		switch (this.wakeupCommand) {
			case WakeUpCommand.IntervalReport:
				this.wakeupInterval = readUInt24BE(this.payload, 1);
				this.controllerNodeId = this.payload[4];
				break;

			case WakeUpCommand.WakeUpNotification:
				// no real payload
				break;

			case WakeUpCommand.IntervalCapabilitiesReport:
				this._minWakeUpInterval = readUInt24BE(this.payload, 1);
				this._maxWakeUpInterval = readUInt24BE(this.payload, 4);
				this._defaultWakeUpInterval = readUInt24BE(this.payload, 7);
				this._wakeUpIntervalSteps = readUInt24BE(this.payload, 10);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a WakeUp CC with a command other than IntervalReport or WakeUpNotification",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
