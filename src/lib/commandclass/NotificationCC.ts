import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { parseBitMask } from "../values/Primitive";
import {
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
export class NotificationCC extends CommandClass {
	// former AlarmCC (v1..v2)
	public ccCommand!: NotificationCommand;
}

interface NotificationCCSetOptions extends CCCommandOptions {
	notificationType: NotificationType;
	notificationStatus: boolean;
}

@CCCommand(NotificationCommand.Set)
export class NotificationCCSet extends NotificationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | NotificationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.CC_DeserializationNotImplemented,
			);
		} else {
			this.notificationType = options.notificationType;
			this.notificationStatus = options.notificationStatus;
		}
	}
	public notificationType: NotificationType;
	public notificationStatus: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.notificationType,
			this.notificationStatus ? 0xff : 0x00,
		]);
		return super.serialize();
	}
}

@CCCommand(NotificationCommand.Report)
export class NotificationCCReport extends NotificationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._alarmType = this.payload[0];
		this._alarmLevel = this.payload[1];
		// V2..V3, reserved in V4+
		if (this.version === 2 || this.version === 3) {
			this._zensorNetSourceNodeId = this.payload[2];
		}
		// V2+
		if (this.version > 1) {
			this._notificationStatus = this.payload[3] === 0xff;
			this._notificationType = this.payload[4];
			this._notificationEvent = this.payload[5];
			const containsSeqNum = !!(this.payload[6] & 0b1000_0000);
			const numEventParams = this.payload[6] & 0b11111;
			if (numEventParams > 0) {
				this._eventParameters = Buffer.from(
					this.payload.slice(7, 7 + numEventParams),
				);
			}
			if (containsSeqNum) {
				this._sequenceNumber = this.payload[7 + numEventParams];
			}
		}
	}

	private _alarmType: number;
	public get alarmType(): number {
		return this._alarmType;
	}

	private _notificationType: NotificationType | undefined;
	public get notificationType(): NotificationType | undefined {
		return this._notificationType;
	}
	private _notificationStatus: boolean | undefined;
	public get notificationStatus(): boolean | undefined {
		return this._notificationStatus;
	}

	private _notificationEvent: number | undefined;
	public get notificationEvent(): number | undefined {
		return this._notificationEvent;
	}

	private _alarmLevel: number;
	public get alarmLevel(): number {
		return this._alarmLevel;
	}

	private _zensorNetSourceNodeId: number | undefined;
	public get zensorNetSourceNodeId(): number | undefined {
		return this._zensorNetSourceNodeId;
	}

	private _eventParameters: Buffer | undefined;
	public get eventParameters(): Buffer | undefined {
		return this._eventParameters;
	}

	private _sequenceNumber: number | undefined;
	public get sequenceNumber(): number | undefined {
		return this._sequenceNumber;
	}
}

interface NotificationCCGetOptions extends CCCommandOptions {
	alarmType?: number;
	notificationType: NotificationType;
	notificationEvent?: number;
}

@CCCommand(NotificationCommand.Get)
@expectedCCResponse(NotificationCCReport)
export class NotificationCCGet extends NotificationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | NotificationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.CC_DeserializationNotImplemented,
			);
		} else {
			this.alarmType = options.alarmType;
			this.notificationType = options.notificationType;
			this.notificationEvent = options.notificationEvent;
		}
	}

	/** Proprietary V1/V2 alarm type */
	public alarmType: number | undefined;
	/** Regulated V3+ notification type */
	public notificationType: NotificationType;
	public notificationEvent: number | undefined;

	public serialize(): Buffer {
		const payload: number[] = [this.alarmType || 0];
		if (this.version >= 2) {
			payload.push(this.notificationType);
		}
		if (this.version >= 3) {
			payload.push(
				this.notificationType === 0xff
					? 0x00
					: this.notificationEvent || 0,
			);
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}
}

@CCCommand(NotificationCommand.SupportedReport)
export class NotificationCCSupportedReport extends NotificationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._supportsV1Alarm = !!(this.payload[0] & 0b1000_0000);
		const numBitMaskBytes = this.payload[0] & 0b0001_1111;
		const notificationBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
		this._supportedNotificationTypes = parseBitMask(notificationBitMask);
		this.persistValues();
	}

	private _supportsV1Alarm: boolean;
	@ccValue() public get supportsV1Alarm(): boolean {
		return this._supportsV1Alarm;
	}

	private _supportedNotificationTypes: NotificationType[];
	@ccValue()
	public get supportedNotificationTypes(): readonly NotificationType[] {
		return this._supportedNotificationTypes;
	}
}

@CCCommand(NotificationCommand.SupportedGet)
@expectedCCResponse(NotificationCCSupportedReport)
export class NotificationCCSupportedGet extends NotificationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(NotificationCommand.EventSupportedReport)
export class NotificationCCEventSupportedReport extends NotificationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._notificationType = this.payload[0];
		const numBitMaskBytes = this.payload[0] & 0b0001_1111;
		const eventBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
		// In this bit mask, bit 0 is ignored and counting starts at bit 1
		// Therefore shift the result by 1.
		this._supportedEvents = parseBitMask(eventBitMask).map(evt => evt - 1);
	}

	private _notificationType: NotificationType;
	public get notificationType(): NotificationType {
		return this._notificationType;
	}

	// TODO: Define events
	private _supportedEvents: number[];
	public get supportedEvents(): readonly number[] {
		return this._supportedEvents;
	}
}

interface NotificationCCEventSupportedGetOptions extends CCCommandOptions {
	notificationType: NotificationType;
}

@CCCommand(NotificationCommand.EventSupportedGet)
@expectedCCResponse(NotificationCCEventSupportedReport)
export class NotificationCCEventSupportedGet extends NotificationCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| NotificationCCEventSupportedGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.CC_DeserializationNotImplemented,
			);
		} else {
			this.notificationType = options.notificationType;
		}
	}

	public notificationType: NotificationType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.notificationType]);
		return super.serialize();
	}
}
