import { lookupNotification } from "../config/Notifications";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ZWaveNode } from "../node/Node";
import { ValueID } from "../node/ValueDB";
import { JSONObject, validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { ValueMetadata } from "../values/Metadata";
import { parseBitMask } from "../values/Primitive";
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

@API(CommandClasses.Notification)
export class NotificationCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get(options: NotificationCCGetSpecificOptions) {
		const cc = new NotificationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		const response = (await this.driver.sendCommand<NotificationCCReport>(
			cc,
		))!;
		return {
			notificationStatus: response.notificationStatus,
			notificationEvent: response.notificationEvent,
			alarmLevel: response.alarmLevel,
			zensorNetSourceNodeId: response.zensorNetSourceNodeId,
			eventParameters: response.eventParameters,
			sequenceNumber: response.sequenceNumber,
		};
	}

	public async set(
		notificationType: NotificationType,
		notificationStatus: boolean,
	): Promise<void> {
		const cc = new NotificationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			notificationType,
			notificationStatus,
		});
		await this.driver.sendCommand(cc);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getSupported() {
		const cc = new NotificationCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			NotificationCCSupportedReport
		>(cc))!;
		return {
			supportsV1Alarm: response.supportsV1Alarm,
			supportedNotificationTypes: response.supportedNotificationTypes,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getSupportedEvents(notificationType: NotificationType) {
		const cc = new NotificationCCEventSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			notificationType,
		});
		const response = (await this.driver.sendCommand<
			NotificationCCEventSupportedReport
		>(cc))!;
		return response.supportedEvents;
	}
}

async function defineMetadataForNotificationEvents(
	endpoint: number,
	type: NotificationType,
	events: readonly number[],
): Promise<ReadonlyMap<string, ValueMetadata>> {
	const ret = new Map<string, ValueMetadata>();
	const notificationConfig = await lookupNotification(type);
	if (!notificationConfig) {
		// This is an unknown notification
		const propertyName = `UNKNOWN_${num2hex(type)}`;
		const valueId = {
			commandClass: CommandClasses.Notification,
			endpoint,
			propertyName,
		};
		ret.set(JSON.stringify(valueId), {
			...ValueMetadata.ReadOnlyUInt8,
			label: `Unknown notification (${num2hex(type)})`,
		});
		return ret;
	}

	const propertyName = notificationConfig.name;
	for (const value of events) {
		// Find out which property we need to update
		const valueConfig = notificationConfig.lookupValue(value);
		if (valueConfig && valueConfig.type === "state") {
			const valueId = {
				commandClass: CommandClasses.Notification,
				endpoint,
				propertyName,
				propertyKey: valueConfig.variableName,
			};

			const dictKey = JSON.stringify(valueId);
			const metadata: ValueMetadata = ret.get(dictKey) || {
				...ValueMetadata.ReadOnlyUInt8,
				label: valueConfig.variableName,
				// @ts-ignore
				states: {
					0: "idle",
				},
			};
			// @ts-ignore
			metadata.states[value] = valueConfig.label;
			ret.set(dictKey, metadata);
		}
	}
	return ret;
}

export interface NotificationCC {
	ccCommand: NotificationCommand;
}

@commandClass(CommandClasses.Notification)
@implementedVersion(8)
export class NotificationCC extends CommandClass {
	// former AlarmCC (v1..v2)

	public static async interview(
		driver: IDriver,
		node: ZWaveNode,
	): Promise<void> {
		// TODO: Require the association and AGI interview to be done first (GH#198)

		const ccVersion = driver.getSafeCCVersionForNode(
			node.id,
			CommandClasses.Notification,
		);
		const ccAPI = node.commandClasses.Notification;

		if (ccVersion >= 2) {
			log.controller.logNode(node.id, {
				message: "querying supported notification types...",
				direction: "outbound",
			});

			const { supportedNotificationTypes } = await ccAPI.getSupported();
			const supportedNotificationNames = (await Promise.all(
				supportedNotificationTypes.map(async n => {
					const ret = await lookupNotification(n);
					return [n, ret] as const;
				}),
			)).map(([type, ntfcn]) =>
				ntfcn ? ntfcn.name : `UNKNOWN (${num2hex(type)})`,
			);

			const logMessage =
				"received supported notification types:" +
				supportedNotificationNames.map(name => "\n* " + name);
			log.controller.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});

			if (ccVersion >= 3) {
				// Query each notification for its supported events
				for (let i = 0; i < supportedNotificationTypes.length; i++) {
					const type = supportedNotificationTypes[i];
					const name = supportedNotificationNames[i];

					log.controller.logNode(node.id, {
						message: `querying supported notification events for ${name}...`,
						direction: "outbound",
					});
					const supportedEvents = await ccAPI.getSupportedEvents(
						type,
					);
					log.controller.logNode(node.id, {
						message: `received supported notification events for ${name}: ${supportedEvents
							.map(String)
							.join(", ")}`,
						direction: "inbound",
					});

					// For each event, predefine the value metadata
					const metadataMap = await defineMetadataForNotificationEvents(
						node.index,
						type,
						supportedEvents,
					);
					for (const [key, metadata] of metadataMap.entries()) {
						const valueId: ValueID = JSON.parse(key);
						node.valueDB.setMetadata(valueId, metadata);
					}
				}
			}

			// Query each notification for its current status
			for (let i = 0; i < supportedNotificationTypes.length; i++) {
				const type = supportedNotificationTypes[i];
				const name = supportedNotificationNames[i];

				log.controller.logNode(node.id, {
					message: `querying notification status for ${name}...`,
					direction: "outbound",
				});
				await ccAPI.get({ notificationType: type });
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(node, true);
	}
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
				ZWaveErrorCodes.Deserialization_NotImplemented,
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

		validatePayload(this.payload.length >= 2);
		this._alarmType = this.payload[0];
		this._alarmLevel = this.payload[1];
		// V2..V3, reserved in V4+
		if (
			(this.version === 2 || this.version === 3) &&
			this.payload.length >= 3
		) {
			this._zensorNetSourceNodeId = this.payload[2];
		}
		// V2+
		if (this.version > 1 && this.payload.length >= 7) {
			this._notificationStatus = this.payload[3] === 0xff;
			this._notificationType = this.payload[4];
			this._notificationEvent = this.payload[5];
			const containsSeqNum = !!(this.payload[6] & 0b1000_0000);
			const numEventParams = this.payload[6] & 0b11111;
			if (numEventParams > 0) {
				validatePayload(this.payload.length >= 7 + numEventParams);
				this._eventParameters = Buffer.from(
					this.payload.slice(7, 7 + numEventParams),
				);
			}
			if (containsSeqNum) {
				validatePayload(this.payload.length >= 7 + numEventParams + 1);
				this._sequenceNumber = this.payload[7 + numEventParams];
			}
		}
	}

	// TODO: Is this a huge key value pair?

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

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			alarmType: this.alarmType,
			notificationType:
				this.notificationType != undefined
					? NotificationType[this.notificationType]
					: this.notificationType,
			notificationStatus: this.notificationStatus,
			notificationEvent: this.notificationEvent,
			alarmLevel: this.alarmLevel,
			zensorNetSourceNodeId: this.zensorNetSourceNodeId,
			eventParameters: this.eventParameters,
			sequenceNumber: this.sequenceNumber,
		});
	}
}

type NotificationCCGetSpecificOptions =
	| {
			alarmType: number;
	  }
	| {
			notificationType: NotificationType;
			notificationEvent?: number;
	  };
type NotificationCCGetOptions = CCCommandOptions &
	NotificationCCGetSpecificOptions;

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
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if ("alarmType" in options) {
				this.alarmType = options.alarmType;
			} else {
				this.notificationType = options.notificationType;
				this.notificationEvent = options.notificationEvent;
			}
		}
	}

	/** Proprietary V1/V2 alarm type */
	public alarmType: number | undefined;
	/** Regulated V3+ notification type */
	public notificationType: NotificationType | undefined;
	public notificationEvent: number | undefined;

	public serialize(): Buffer {
		const payload: number[] = [this.alarmType || 0];
		if (this.version >= 2 && this.notificationType != undefined) {
			payload.push(this.notificationType);
			if (this.version >= 3) {
				payload.push(
					this.notificationType === 0xff
						? 0x00
						: this.notificationEvent || 0,
				);
			}
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

		validatePayload(this.payload.length >= 1);
		this._supportsV1Alarm = !!(this.payload[0] & 0b1000_0000);
		const numBitMaskBytes = this.payload[0] & 0b0001_1111;
		validatePayload(
			numBitMaskBytes > 0,
			this.payload.length >= 1 + numBitMaskBytes,
		);
		const notificationBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
		// In this bit mask, bit 0 is ignored and counting starts at bit 1
		// Therefore shift the result by 1.
		this._supportedNotificationTypes = parseBitMask(
			notificationBitMask,
		).map(evt => evt - 1);
		this.persistValues();
	}

	private _supportsV1Alarm: boolean;
	@ccValue(true) public get supportsV1Alarm(): boolean {
		return this._supportsV1Alarm;
	}

	private _supportedNotificationTypes: NotificationType[];
	@ccValue(true)
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

		validatePayload(this.payload.length >= 1);
		this._notificationType = this.payload[0];
		const numBitMaskBytes = this.payload[1] & 0b0001_1111;
		if (numBitMaskBytes === 0) {
			// Notification type is not supported
			this._supportedEvents = [];
			return;
		}

		validatePayload(this.payload.length >= 2 + numBitMaskBytes);
		const eventBitMask = this.payload.slice(2, 2 + numBitMaskBytes);
		// In this bit mask, bit 0 is ignored and counting starts at bit 1
		// Therefore shift the result by 1.
		this._supportedEvents = parseBitMask(eventBitMask).map(evt => evt - 1);

		// We store the supported events in the form of value metadata
		// This happens during the node interview
	}

	private _notificationType: NotificationType;
	public get notificationType(): NotificationType {
		return this._notificationType;
	}

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
				ZWaveErrorCodes.Deserialization_NotImplemented,
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
