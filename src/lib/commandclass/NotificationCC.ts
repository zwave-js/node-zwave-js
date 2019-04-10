import { composeObject } from "alcalzone-shared/objects";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject } from "../util/misc";
import { parseBitMask } from "../values/Primitive";
import { CommandClass, commandClass, expectedCCResponse, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

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

export enum NotificationType {
	General = 0,
	Smoke,
	CarbonMonoxide,
	CarbonDioxide,
	Heat,
	Flood,
	AccessControl,
	Burglar,
	PowerManagement,
	System,
	Emergency,
	Clock,
	Appliance,
	HomeHealth,
}

@commandClass(CommandClasses.Notification)
@implementedVersion(8)
@expectedCCResponse(CommandClasses.Notification)
export class NotificationCC extends CommandClass {
	// former AlarmCC (v1..v2)

	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: NotificationCommand.Get,
		alarmType: number,
		notificationType: NotificationType,
		notificationEvent?: number,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: NotificationCommand.Set,
		notificationType: NotificationType,
		notificationStatus: boolean,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: NotificationCommand.SupportedGet,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: NotificationCommand,
		// tslint:disable-next-line:trailing-comma
		...args: any[]
	) {
		super(driver, nodeId, ccCommand);
		if (ccCommand === NotificationCommand.Get) {
			this.alarmType = args[0];
			this.notificationType = args[1];
			this._notificationEvent = args[2];
		} else if (ccCommand === NotificationCommand.Set) {
			this.notificationType = args[0];
			this.notificationStatus = args[1];
		}
	}
	// tslint:enable:unified-signatures

	/** Proprietary V1/V2 alarm type */
	public alarmType: number;
	/** Regulated V3+ notification type */
	public notificationType: NotificationType;
	public notificationStatus: boolean;

	// TODO: Which of these are CC values?

	private _notificationEvent: number;
	public get notificationEvent(): number {
		return this._notificationEvent;
	}

	private _alarmLevel: number;
	public get alarmLevel(): number {
		return this._alarmLevel;
	}

	private _zensorNetSourceNodeId: number;
	public get zensorNetSourceNodeId(): number {
		return this._zensorNetSourceNodeId;
	}

	private _eventParameters: Buffer;
	public get eventParameters(): Buffer {
		return this._eventParameters;
	}

	private _supportsV1Alarm: boolean;
	public get supportsV1Alarm(): boolean {
		return this._supportsV1Alarm;
	}

	private _supportedNotificationTypes: NotificationType[];
	public get supportedNotificationTypes(): NotificationType[] {
		return this._supportedNotificationTypes;
	}

	private _supportedEvents = new Map<NotificationType, number[]>();
	public get supportedEvents(): Map<NotificationType, number[]> {
		return this._supportedEvents;
	}

	private _sequenceNumber: number;
	public get sequenceNumber(): number {
		return this._sequenceNumber;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case NotificationCommand.Get: {
				const payload = [this.alarmType];
				if (this.version >= 2) {
					payload.push(this.notificationType);
				}
				if (this.version >= 3) {
					// TODO: If the Notification Type is set to 0xFF, this field MUST be set to 0x00
					payload.push(this.notificationEvent);
				}
				this.payload = Buffer.from(payload);
				break;
			}

			case NotificationCommand.Set:
				this.payload = Buffer.from([
					this.notificationType,
					this.notificationStatus ? 0xff : 0x00,
				]);
				break;

			case NotificationCommand.SupportedGet:
				// no real payload
				break;

			case NotificationCommand.EventSupportedGet:
				this.payload = Buffer.from([this.notificationType]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a Notification CC with a command other than Get, Set, SupportedGet and EventSupportedGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case NotificationCommand.Report: {
				this.alarmType = this.payload[0];
				this._alarmLevel = this.payload[1];
				// V2..V3, reserved in V4+
				this._zensorNetSourceNodeId = this.payload[2];
				// V2+
				this.notificationStatus = this.payload[3] === 0xff;
				this.notificationType = this.payload[4];
				this._notificationEvent = this.payload[5];
				const containsSeqNum = !!(this.payload[6] & 0b1000_0000);
				const numEventParams = this.payload[6] & 0b11111;
				if (numEventParams > 0) {
					this._eventParameters = Buffer.from(this.payload.slice(7, 7 + numEventParams));
				}
				if (containsSeqNum) {
					this._sequenceNumber = this.payload[7 + numEventParams];
				}
				break;
			}

			case NotificationCommand.SupportedReport: {
				this._supportsV1Alarm = !!(this.payload[0] & 0b1000_0000);
				const numBitMaskBytes = this.payload[0] & 0b0001_1111;
				// parse the bitmask into a number array
				// const numTypes = numBitMaskBytes * 8 - 1;
				const notificationBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
				this._supportedNotificationTypes = parseBitMask(notificationBitMask);
				// this._supportedNotificationTypes = [];
				// for (let type = 1; type <= numTypes; type++) {
				// 	const byteNum = type >>> 3; // type / 8
				// 	const bitNum = type % 8;
				// 	if ((notificationBitMask[byteNum] & (1 << bitNum)) !== 0) this._supportedNotificationTypes.push(type);
				// }
				break;
			}

			case NotificationCommand.EventSupportedReport: {
				this.notificationType = this.payload[0];
				const numBitMaskBytes = this.payload[1] & 0b0001_1111;
				// parse the bitmask into a number array
				// TODO: Can this be done with parseBitMask?
				const numEvents = numBitMaskBytes * 8 - 1;
				const eventsBitMask = this.payload.slice(2, 2 + numBitMaskBytes);
				const supportedEvents = this._supportedEvents.has(this.notificationType)
					? this._supportedEvents.get(this.notificationType)
					: [];
				for (let event = 1; event <= numEvents; event++) {
					const byteNum = event >>> 3; // type / 8
					const bitNum = event % 8;
					if ((eventsBitMask[byteNum] & (1 << bitNum)) !== 0) supportedEvents.push(event);
				}
				this._supportedEvents.set(this.notificationType, supportedEvents);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a Notification CC with a command other than Report, SupportedReport, EventSupportedReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			ccCommand: NotificationCommand[this.ccCommand],
			alarmType: this.alarmType,
			notificationType: this.notificationType,
			notificationStatus: this.notificationStatus,
			notificationEvent: this.notificationEvent,
			alarmLevel: this.alarmLevel,
			zensorNetSourceNodeId: this.zensorNetSourceNodeId,
			eventParameters: this.eventParameters,
			supportsV1Alarm: this.supportsV1Alarm,
			supportedNotificationTypes: this.supportedNotificationTypes,
			supportedEvents: this.supportedEvents
				? composeObject([...this.supportedEvents.entries()].map(([type, events]) => [NotificationType[type], events] as [string, number[]]))
				: undefined,
		});
	}

}
