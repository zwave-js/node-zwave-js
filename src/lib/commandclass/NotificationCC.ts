import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum NotificationCommand {
	// All the supported commands
	EventSupportedGet = 0x01,
	EventSupportedReport = 0x02,
	Get = 0x04,
	Report = 0x05,
	Set = 0x06,
	SupportedGet = 0x07,
	SupportedReport = 0x08,
}

@commandClass(CommandClasses.Notification)
@implementedVersion(2)
@expectedCCResponse(CommandClasses.Notification)
export class NotificationCC extends CommandClass {
	// former AlarmCC (v1..v2)

	// tslint:disable:unified-signatures
	constructor(nodeId?: number);
	constructor(
		nodeId: number,
		ccCommand: NotificationCommand.Get,
		alarmType: number,
		zWaveAlarmType: number,
	);
	constructor(
		nodeId: number,
		ccCommand: NotificationCommand.Set,
		zWaveAlarmType: number,
		zWaveAlarmStatus: number,
	);
	constructor(
		nodeId: number,
		ccCommand: NotificationCommand.SupportedGet,
	);

	constructor(
		public nodeId: number,
		public ccCommand?: NotificationCommand,
		...args: any[],
	) {
		super(nodeId);
		if (ccCommand === NotificationCommand.Get) {
			this.alarmType = args[0];
			this.zWaveAlarmType = args[1];
		} else if (ccCommand === NotificationCommand.Set) {
			this.zWaveAlarmType = args[0];
			this.zWaveAlarmStatus = args[1];
		}
	}
	// tslint:enable:unified-signatures

	public alarmType: number;
	// TODO: there must be some enum defined for this:
	public zWaveAlarmType: number;
	public zWaveAlarmStatus: number;

	private _zWaveAlarmEvent: number;
	public get zWaveAlarmEvent(): number {
		return this._zWaveAlarmEvent;
	}

	private _alarmLevel: number;
	public get alarmLevel(): number {
		return this._alarmLevel;
	}

	private _zensorNetSourceNodeId: number;
	public get zensorNetSourceNodeId(): number {
		return this._zensorNetSourceNodeId;
	}

	private _eventParameters: number[];
	public get eventParameters(): number[] {
		return this._eventParameters;
	}

	private _supportsV1Alarm: boolean;
	public get supportsV1Alarm(): boolean {
		return this._supportsV1Alarm;
	}

	private _supportedZWaveAlarmTypes: number[];
	public get supportedZWaveAlarmTypes(): number[] {
		return this._supportedZWaveAlarmTypes;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case NotificationCommand.Get:
				this.payload = Buffer.from([
					this.ccCommand,
					this.alarmType,
				]);
				if (this.version >= 2) {
					this.payload = Buffer.concat([
						this.payload,
						Buffer.from([this.zWaveAlarmType]),
					]);
				}
				break;

			case NotificationCommand.Set:
				this.payload = Buffer.from([
					this.ccCommand,
					this.zWaveAlarmType,
					this.zWaveAlarmStatus,
				]);
				break;

			case NotificationCommand.SupportedGet:
				this.payload = Buffer.from([this.ccCommand]);
				// no real payload
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a Notification CC with a command other than __TODO__",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case NotificationCommand.Report: {
				this.alarmType = this.payload[1];
				this._alarmLevel = this.payload[2];
				// starting with V2
				this._zensorNetSourceNodeId = this.payload[3];
				this.zWaveAlarmStatus = this.payload[4];
				this.zWaveAlarmType = this.payload[5];
				this._zWaveAlarmEvent = this.payload[6];
				const numEventParams = this.payload[7];
				if (numEventParams != null && numEventParams > 0) {
					this._eventParameters = Array.from(this.payload.slice(8, 8 + numEventParams));
				}
				break;
			}

			case NotificationCommand.SupportedReport: {
				this._supportsV1Alarm = !!(this.payload[1] & 0b1000_0000);
				const numBitMaskBytes = this.payload[1] & 0b0001_1111;
				// parse the bitmask into a number array
				const numBitMasks = numBitMaskBytes * 8 - 1;
				const alarmTypeBitMask = this.payload.slice(2, 2 + numBitMaskBytes);
				this._supportedZWaveAlarmTypes = [];
				for (let type = 1; type <= numBitMasks; type++) {
					const byteNum = type >>> 3; // type / 8
					const bitNum = type % 8;
					if ((alarmTypeBitMask[byteNum] & (1 << bitNum)) !== 0) this._supportedZWaveAlarmTypes.push(type);
				}
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a Notification CC with a command other than TODO",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
