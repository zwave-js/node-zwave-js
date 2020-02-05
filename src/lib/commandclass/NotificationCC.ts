import {
	lookupNotification,
	NotificationParameterWithCommandClass,
	NotificationParameterWithDuration,
	NotificationParameterWithValue,
} from "../config/Notifications";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { JSONObject, validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { Duration } from "../values/Duration";
import { ValueMetadata, ValueMetadataNumeric } from "../values/Metadata";
import { Maybe, parseBitMask } from "../values/Primitive";
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

@API(CommandClasses.Notification)
export class NotificationCCAPI extends CCAPI {
	public supportsCommand(cmd: NotificationCommand): Maybe<boolean> {
		switch (cmd) {
			// We don't know whats supported in V1/V2
			case NotificationCommand.Get:
			case NotificationCommand.Set:
			case NotificationCommand.SupportedGet:
			case NotificationCommand.EventSupportedGet:
				return this.version >= 3;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * @internal
	 */
	public async getInternal(
		options: NotificationCCGetSpecificOptions,
	): Promise<NotificationCCReport> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.Get,
		);

		const cc = new NotificationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return (await this.driver.sendCommand<NotificationCCReport>(cc))!;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get(options: NotificationCCGetSpecificOptions) {
		const response = await this.getInternal(options);
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
		notificationType: number,
		notificationStatus: boolean,
	): Promise<void> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.Set,
		);

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
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.SupportedGet,
		);

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
	public async getSupportedEvents(notificationType: number) {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.EventSupportedGet,
		);

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

function defineMetadataForNotificationEvents(
	endpoint: number,
	type: number,
	events: readonly number[],
): ReadonlyMap<string, ValueMetadata> {
	const ret = new Map<string, ValueMetadataNumeric>();
	const notificationConfig = lookupNotification(type);
	if (!notificationConfig) {
		// This is an unknown notification
		const property = `UNKNOWN_${num2hex(type)}`;
		const valueId: ValueID = {
			commandClass: CommandClasses.Notification,
			endpoint,
			property,
		};
		ret.set(JSON.stringify(valueId), {
			...ValueMetadata.ReadOnlyUInt8,
			label: `Unknown notification (${num2hex(type)})`,
		});
		return ret;
	}

	const property = notificationConfig.name;
	for (const value of events) {
		// Find out which property we need to update
		const valueConfig = notificationConfig.lookupValue(value);
		if (valueConfig?.type === "state") {
			const valueId: ValueID = {
				commandClass: CommandClasses.Notification,
				endpoint,
				property,
				propertyKey: valueConfig.variableName,
			};

			const dictKey = JSON.stringify(valueId);
			const metadata: ValueMetadataNumeric = ret.get(dictKey) || {
				...ValueMetadata.ReadOnlyUInt8,
				label: valueConfig.variableName,
				states: {
					0: "idle",
				},
			};
			metadata.states![value] = valueConfig.label;
			ret.set(dictKey, metadata);
		}
	}
	return ret;
}

@commandClass(CommandClasses.Notification)
@implementedVersion(8)
export class NotificationCC extends CommandClass {
	declare ccCommand: NotificationCommand;

	// former AlarmCC (v1..v2)

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			CommandClasses["Multi Channel Association"],
			CommandClasses["Association Group Information"],
		];
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Notification;

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (this.version >= 2) {
			let supportedNotificationTypes: readonly number[];
			let supportedNotificationNames: string[];

			function lookupNotificationNames(): string[] {
				return supportedNotificationTypes
					.map(n => {
						const ret = lookupNotification(n);
						return [n, ret] as const;
					})
					.map(([type, ntfcn]) =>
						ntfcn ? ntfcn.name : `UNKNOWN (${num2hex(type)})`,
					);
			}

			if (complete) {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "querying supported notification types...",
					direction: "outbound",
				});

				({ supportedNotificationTypes } = await api.getSupported());
				supportedNotificationNames = lookupNotificationNames();

				const logMessage =
					"received supported notification types:" +
					supportedNotificationNames.map(name => "\n· " + name);
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				if (this.version >= 3) {
					// Query each notification for its supported events
					for (
						let i = 0;
						i < supportedNotificationTypes.length;
						i++
					) {
						const type = supportedNotificationTypes[i];
						const name = supportedNotificationNames[i];

						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `querying supported notification events for ${name}...`,
							direction: "outbound",
						});
						const supportedEvents = await api.getSupportedEvents(
							type,
						);
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `received supported notification events for ${name}: ${supportedEvents
								.map(String)
								.join(", ")}`,
							direction: "inbound",
						});

						// For each event, predefine the value metadata
						const metadataMap = defineMetadataForNotificationEvents(
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
			} else {
				// Load supported notification types from cache
				supportedNotificationTypes =
					this.getValueDB().getValue<readonly number[]>({
						commandClass: this.ccId,
						property: "supportedNotificationTypes",
					}) ?? [];
				supportedNotificationNames = lookupNotificationNames();
			}

			// Always query each notification for its current status
			for (let i = 0; i < supportedNotificationTypes.length; i++) {
				const type = supportedNotificationTypes[i];
				const name = supportedNotificationNames[i];

				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying notification status for ${name}...`,
					direction: "outbound",
				});
				const response = await api.getInternal({
					notificationType: type,
				});
				// NotificationReports don't store their values themselves,
				// because the behaviour is too complex and spans the lifetime
				// of several reports. Thus we handle it in the Node instance
				await node.handleCommand(response);
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface NotificationCCSetOptions extends CCCommandOptions {
	notificationType: number;
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
	public notificationType: number;
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

			// Turn the event parameters into something useful
			this.parseEventParameters();
		}
	}

	// TODO: Is this a huge key value pair?

	private _alarmType: number;
	public get alarmType(): number {
		return this._alarmType;
	}

	private _notificationType: number | undefined;
	public get notificationType(): number | undefined {
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

	private _eventParameters: NotificationCCReport["eventParameters"];
	public get eventParameters():
		| Buffer
		| Duration
		| CommandClass
		| Record<string, number>
		| undefined {
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
					? lookupNotification(this.notificationType)?.name
					: this.notificationType,
			notificationStatus: this.notificationStatus,
			notificationEvent: this.notificationEvent,
			alarmLevel: this.alarmLevel,
			zensorNetSourceNodeId: this.zensorNetSourceNodeId,
			eventParameters: this.eventParameters,
			sequenceNumber: this.sequenceNumber,
		});
	}

	private parseEventParameters(): void {
		if (
			this.notificationType == undefined ||
			this.notificationEvent == undefined ||
			!Buffer.isBuffer(this._eventParameters)
		) {
			return;
		}
		// Look up the received notification and value in the config
		const notificationConfig = lookupNotification(this.notificationType);
		if (!notificationConfig) return;
		const valueConfig = notificationConfig.lookupValue(
			this.notificationEvent,
		);
		if (!valueConfig) return;

		// Parse the event parameters if possible
		if (
			valueConfig.parameter instanceof NotificationParameterWithDuration
		) {
			// The parameters contain a Duration
			this._eventParameters = Duration.parseReport(
				this._eventParameters[0],
			);
		} else if (
			valueConfig.parameter instanceof
			NotificationParameterWithCommandClass
		) {
			// The parameters contain a CC
			this._eventParameters = CommandClass.fromEncapsulated(
				this.driver,
				this,
				this._eventParameters,
			);
		} else if (
			valueConfig.parameter instanceof NotificationParameterWithValue
		) {
			// The parameters contain a named value
			this._eventParameters = {
				[valueConfig.parameter
					.propertyName]: this._eventParameters.readUIntBE(
					0,
					this._eventParameters.length,
				),
			};
		}
	}
}

type NotificationCCGetSpecificOptions =
	| {
			alarmType: number;
	  }
	| {
			notificationType: number;
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
	public notificationType: number | undefined;
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
		this._supportedNotificationTypes = parseBitMask(
			notificationBitMask,
			// bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
			0,
		);
		this.persistValues();
	}

	private _supportsV1Alarm: boolean;
	@ccValue({ internal: true }) public get supportsV1Alarm(): boolean {
		return this._supportsV1Alarm;
	}

	private _supportedNotificationTypes: number[];
	@ccValue({ internal: true })
	public get supportedNotificationTypes(): readonly number[] {
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
		this._supportedEvents = parseBitMask(
			eventBitMask,
			// bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
			0,
		);

		// We store the supported events in the form of value metadata
		// This happens during the node interview
	}

	private _notificationType: number;
	public get notificationType(): number {
		return this._notificationType;
	}

	private _supportedEvents: number[];
	public get supportedEvents(): readonly number[] {
		return this._supportedEvents;
	}
}

interface NotificationCCEventSupportedGetOptions extends CCCommandOptions {
	notificationType: number;
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

	public notificationType: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.notificationType]);
		return super.serialize();
	}
}
