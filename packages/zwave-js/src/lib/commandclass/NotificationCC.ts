import {
	ConfigManager,
	NotificationParameterWithCommandClass,
	NotificationParameterWithDuration,
	NotificationParameterWithValue,
	NotificationValueDefinition,
} from "@zwave-js/config";
import {
	CommandClasses,
	Duration,
	isZWaveError,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	parseBitMask,
	validatePayload,
	ValueID,
	ValueMetadata,
	ValueMetadataNumeric,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { JSONObject, num2hex, pick } from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import type { ZWaveNode } from "../node/Node";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { UserCodeCommand } from "./UserCodeCC";

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

/**
 * @publicAPI
 */
export type NotificationMetadata = ValueMetadata & {
	ccSpecific: {
		notificationType: number;
	};
};

/**
 * @publicAPI
 */
export interface ZWaveNotificationCallbackArgs_NotificationCC {
	/** The numeric identifier for the notification type */
	type: number;
	/** The human-readable label for the notification type */
	label: string;
	/** The numeric identifier for the notification event */
	event: number;
	/** The human-readable label for the notification event */
	eventLabel: string;
	/** Additional information related to the event */
	parameters?: NotificationCCReport["eventParameters"];
}

/**
 * @publicAPI
 * Parameter types for the Notification CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_NotificationCC = [
	node: ZWaveNode,
	ccId: CommandClasses.Notification,
	args: ZWaveNotificationCallbackArgs_NotificationCC,
];

/** Returns the ValueID used to store the supported notification types of a node */
export function getSupportedNotificationTypesValueId(): ValueID {
	return {
		commandClass: CommandClasses.Notification,
		property: "supportedNotificationTypes",
	};
}

/** Returns the ValueID used to store the supported notification events of a node */
export function getSupportedNotificationEventsValueId(type: number): ValueID {
	return {
		commandClass: CommandClasses.Notification,
		property: "supportedNotificationEvents",
		propertyKey: type,
	};
}

/** Returns the ValueID used to store whether a node supports push or pull */
export function getNotificationModeValueId(): ValueID {
	return {
		commandClass: CommandClasses.Notification,
		property: "notificationMode",
	};
}

export function getAlarmTypeValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses.Notification,
		endpoint,
		property: "alarmType",
	};
}

export function getAlarmLevelValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses.Notification,
		endpoint,
		property: "alarmLevel",
	};
}

@API(CommandClasses.Notification)
export class NotificationCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: NotificationCommand): Maybe<boolean> {
		switch (cmd) {
			case NotificationCommand.Report:
			case NotificationCommand.Get:
				return true; // These exist starting with V1

			case NotificationCommand.Set:
			case NotificationCommand.SupportedGet:
				return this.version >= 2;

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
	): Promise<NotificationCCReport | undefined> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.Get,
		);

		const cc = new NotificationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.driver.sendCommand<NotificationCCReport>(
			cc,
			this.commandOptions,
		);
	}

	public async sendReport(
		options: NotificationCCReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.Report,
		);

		const cc = new NotificationCCReport(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(options: NotificationCCGetSpecificOptions) {
		const response = await this.getInternal(options);
		if (response) {
			return pick(response, [
				"notificationStatus",
				"notificationEvent",
				"alarmLevel",
				"zensorNetSourceNodeId",
				"eventParameters",
				"sequenceNumber",
			]);
		}
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.SupportedGet,
		);

		const cc = new NotificationCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<NotificationCCSupportedReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"supportsV1Alarm",
				"supportedNotificationTypes",
			]);
		}
	}

	public async getSupportedEvents(
		notificationType: number,
	): Promise<readonly number[] | undefined> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.EventSupportedGet,
		);

		const cc = new NotificationCCEventSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			notificationType,
		});
		const response = await this.driver.sendCommand<NotificationCCEventSupportedReport>(
			cc,
			this.commandOptions,
		);
		return response?.supportedEvents;
	}
}

function defineMetadataForNotificationEvents(
	configManager: ConfigManager,
	endpoint: number,
	type: number,
	events: readonly number[],
): ReadonlyMap<string, ValueMetadata> {
	const ret = new Map<string, ValueMetadataNumeric>();
	const notificationConfig = configManager.lookupNotification(type);
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
			ccSpecific: {
				notificationType: type,
			},
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
				states: {},
				ccSpecific: {
					notificationType: type,
				},
			};
			if (valueConfig.idle) {
				metadata.states![0] = "idle";
			}
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

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		// mark some value IDs as internal
		this.registerValue(getNotificationModeValueId().property, true);
		this.registerValue(
			getSupportedNotificationTypesValueId().property,
			true,
		);
		this.registerValue(
			getSupportedNotificationEventsValueId(0).property,
			true,
		);
	}

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			CommandClasses["Multi Channel Association"],
			CommandClasses["Association Group Information"],
		];
	}

	private async determineNotificationMode(
		api: NotificationCCAPI,
		supportedNotificationEvents: ReadonlyMap<number, readonly number[]>,
	): Promise<"push" | "pull"> {
		const node = this.getNode()!;

		// SDS14223: If the supporting node does not support the Association Command Class,
		// it may be concluded that the supporting node implements Pull Mode and discovery may be aborted.
		if (!node.supportsCC(CommandClasses.Association)) return "pull";

		try {
			if (
				node.supportsCC(CommandClasses["Association Group Information"])
			) {
				const assocGroups = this.driver.controller.getAssociationGroups(
					{
						nodeId: node.id,
					},
				);
				for (const group of assocGroups.values()) {
					// Check if this group sends Notification Reports
					if (
						group.issuedCommands
							?.get(CommandClasses.Notification)
							?.includes(NotificationCommand.Report)
					) {
						return "push";
					}
				}
				return "pull";
			}
		} catch {
			// We might be dealing with an older cache file, fall back to testing
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `determining whether this node is pull or push...`,
			direction: "outbound",
		});
		// Find a notification type with at least one supported event
		for (const [type, events] of supportedNotificationEvents) {
			if (events.length === 0) continue;
			// Enable the event and request the status
			await api.set(type, true);
			try {
				const resp = await api.get({
					notificationType: type,
					notificationEvent: events[0],
				});
				switch (resp?.notificationStatus) {
					case 0xff:
						return "push";
					case 0xfe:
					case 0x00:
						return "pull";
				}
			} catch {
				/* ignore */
			}
		}
		// If everything failed, fall back to "pull"
		return "pull";
	}

	private lookupNotificationNames(
		notificationTypes: readonly number[],
	): string[] {
		return notificationTypes
			.map((n) => {
				const ret = this.driver.configManager.lookupNotification(n);
				return [n, ret] as const;
			})
			.map(([type, ntfcn]) =>
				ntfcn ? ntfcn.name : `UNKNOWN (${num2hex(type)})`,
			);
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Notification.withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB();

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		let supportsV1Alarm = false;
		if (this.version >= 2) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying supported notification types...",
				direction: "outbound",
			});

			const suppResponse = await api.getSupported();
			if (!suppResponse) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported notification types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}
			supportsV1Alarm = suppResponse.supportsV1Alarm;
			const supportedNotificationTypes =
				suppResponse.supportedNotificationTypes;
			const supportedNotificationNames = this.lookupNotificationNames(
				supportedNotificationTypes,
			);
			const supportedNotificationEvents = new Map<
				number,
				readonly number[]
			>();

			const logMessage = `received supported notification types:${supportedNotificationNames
				.map((name) => `\n· ${name}`)
				.join("")}`;
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			if (this.version >= 3) {
				// Query each notification for its supported events
				for (let i = 0; i < supportedNotificationTypes.length; i++) {
					const type = supportedNotificationTypes[i];
					const name = supportedNotificationNames[i];

					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying supported notification events for ${name}...`,
						direction: "outbound",
					});
					const supportedEvents = await api.getSupportedEvents(type);
					if (supportedEvents) {
						supportedNotificationEvents.set(type, supportedEvents);
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `received supported notification events for ${name}: ${supportedEvents
								.map(String)
								.join(", ")}`,
							direction: "inbound",
						});
					}
				}
			}

			// Determine whether the node is a push or pull node
			let notificationMode = valueDB.getValue<"push" | "pull">(
				getNotificationModeValueId(),
			);
			if (notificationMode !== "push" && notificationMode !== "pull") {
				notificationMode = await this.determineNotificationMode(
					api,
					supportedNotificationEvents,
				);
				valueDB.setValue(
					getNotificationModeValueId(),
					notificationMode,
				);
			}

			if (notificationMode === "pull") {
				await this.refreshValues();
			} /* if (notificationMode === "push") */ else {
				for (let i = 0; i < supportedNotificationTypes.length; i++) {
					const type = supportedNotificationTypes[i];
					const name = supportedNotificationNames[i];
					const notificationConfig = this.driver.configManager.lookupNotification(
						type,
					);

					// Enable reports for each notification type
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `enabling notifications for ${name}...`,
						direction: "outbound",
					});
					await api.set(type, true);

					// Set the value to idle if possible and there is no value yet
					if (notificationConfig) {
						const property = notificationConfig.name;
						const events = supportedNotificationEvents.get(type);
						if (events) {
							// Find all variables that are supported by this node and have an idle state
							for (const variable of notificationConfig.variables.filter(
								(v) => !!v.idle,
							)) {
								if (
									[...variable.states.keys()].some((key) =>
										events.includes(key),
									)
								) {
									const propertyKey = variable.name;
									const valueId: ValueID = {
										commandClass:
											CommandClasses.Notification,
										endpoint: endpoint.index,
										property,
										propertyKey,
									};
									// Set the value to idle if it has no value yet
									// TODO: GH#1028
									// * do this only if the last update was more than 5 minutes ago
									// * schedule an auto-idle if the last update was less than 5 minutes ago but before the current driver start
									if (
										valueDB.getValue(valueId) == undefined
									) {
										valueDB.setValue(valueId, 0 /* idle */);
									}
								}
							}
						}
					}
				}
			}
		}

		// Only create metadata for V1 values if necessary
		if (this.version === 1 || supportsV1Alarm) {
			valueDB.setMetadata(getAlarmTypeValueId(this.endpointIndex), {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Alarm Type",
			});
			valueDB.setMetadata(getAlarmLevelValueId(this.endpointIndex), {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Alarm Level",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		// Refreshing values only works on pull nodes
		if (this.notificationMode === "pull") {
			const node = this.getNode()!;
			const endpoint = this.getEndpoint()!;
			const api = endpoint.commandClasses.Notification.withOptions({
				priority: MessagePriority.NodeQuery,
			});
			const valueDB = this.getValueDB();

			// Load supported notification types and events from cache
			const supportedNotificationTypes =
				valueDB.getValue<readonly number[]>(
					getSupportedNotificationTypesValueId(),
				) ?? [];
			const supportedNotificationNames = this.lookupNotificationNames(
				supportedNotificationTypes,
			);

			for (let i = 0; i < supportedNotificationTypes.length; i++) {
				const type = supportedNotificationTypes[i];
				const name = supportedNotificationNames[i];

				// Always query each notification for its current status
				this.driver.controllerLog.logNode(node.id, {
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
				if (response) await node.handleCommand(response);
			}
		}
	}

	/** Whether the node implements push or pull notifications */
	public get notificationMode(): "push" | "pull" | undefined {
		return this.getValueDB().getValue(getNotificationModeValueId());
	}
}

interface NotificationCCSetOptions extends CCCommandOptions {
	notificationType: number;
	notificationStatus: boolean;
}

@CCCommand(NotificationCommand.Set)
export class NotificationCCSet extends NotificationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"notification type": this.driver.configManager.getNotificationName(
					this.notificationType,
				),
				status: this.notificationStatus,
			},
		};
	}
}

export type NotificationCCReportOptions =
	| {
			alarmType: number;
			alarmLevel: number;
	  }
	| {
			notificationType: number;
			notificationEvent: number;
			eventParameters?: Buffer;
			sequenceNumber?: number;
	  };

@CCCommand(NotificationCommand.Report)
export class NotificationCCReport extends NotificationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (NotificationCCReportOptions & CCCommandOptions),
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.alarmType = this.payload[0];
			this.alarmLevel = this.payload[1];
			// V2..V3, reserved in V4+
			if (
				(this.version === 2 || this.version === 3) &&
				this.payload.length >= 3
			) {
				this.zensorNetSourceNodeId = this.payload[2];
			}
			// V2+ requires the alarm bytes to be zero. Manufacturers don't care though, so we don't enforce that.
			// Don't use the version to decide because we might discard notifications
			// before the interview is complete
			if (this.payload.length >= 7) {
				// Ignore the legacy alarm bytes
				this.alarmType = undefined;
				this.alarmLevel = undefined;
				this.notificationStatus = this.payload[3];
				this.notificationType = this.payload[4];
				this.notificationEvent = this.payload[5];
				const containsSeqNum = !!(this.payload[6] & 0b1000_0000);
				const numEventParams = this.payload[6] & 0b11111;
				if (numEventParams > 0) {
					validatePayload(this.payload.length >= 7 + numEventParams);
					this.eventParameters = Buffer.from(
						this.payload.slice(7, 7 + numEventParams),
					);
				}
				if (containsSeqNum) {
					validatePayload(
						this.payload.length >= 7 + numEventParams + 1,
					);
					this.sequenceNumber = this.payload[7 + numEventParams];
				}

				// Turn the event parameters into something useful
				this.parseEventParameters();
			} else if (this.alarmType !== 0) {
				if (this.version >= 2) {
					// Check if the device actually supports Notification CC, but chooses
					// to send Alarm frames instead (GH#1034)
					const valueDB = this.getValueDB();
					const supportedNotificationTypes = valueDB.getValue<
						number[]
					>(getSupportedNotificationTypesValueId());
					if (
						isArray(supportedNotificationTypes) &&
						supportedNotificationTypes.includes(this.alarmType)
					) {
						const supportedNotificationEvents = valueDB.getValue<
							number[]
						>(
							getSupportedNotificationEventsValueId(
								this.alarmType,
							),
						);
						if (
							isArray(supportedNotificationEvents) &&
							supportedNotificationEvents.includes(
								this.alarmLevel,
							)
						) {
							// This alarm frame corresponds to a valid notification event
							this.driver.controllerLog.logNode(
								this.nodeId as number,
								`treating V1 Alarm frame as Notification Report`,
							);
							this.notificationType = this.alarmType;
							this.notificationEvent = this.alarmLevel;
							this.alarmType = undefined;
							this.alarmLevel = undefined;
						}
					}
				} else {
					// V1 Alarm, check if there is a compat option to map this V1 report to a V2+ report
					const mapping = this.getNodeUnsafe()?.deviceConfig?.compat
						?.alarmMapping;
					const match = mapping?.find(
						(m) =>
							m.from.alarmType === this.alarmType &&
							(m.from.alarmLevel == undefined ||
								m.from.alarmLevel === this.alarmLevel),
					);
					if (match) {
						this.driver.controllerLog.logNode(
							this.nodeId as number,
							`compat mapping found, treating V1 Alarm frame as Notification Report`,
						);
						this.notificationType = match.to.notificationType;
						this.notificationEvent = match.to.notificationEvent;
						if (match.to.eventParameters) {
							this.eventParameters = {};
							for (const [key, val] of Object.entries(
								match.to.eventParameters,
							)) {
								if (typeof val === "number") {
									this.eventParameters[key] = val;
									// wotan-disable-next-line no-useless-predicate
								} else if (val === "alarmLevel") {
									this.eventParameters[key] = this.alarmLevel;
								}
							}
						}
						this.alarmType = undefined;
						this.alarmLevel = undefined;
					}
				}
			}
		} else {
			// Create a notification to send
			if ("alarmType" in options) {
				this.alarmType = options.alarmType;
				this.alarmLevel = options.alarmLevel;
				// Send a V1 command
				this.version = 1;
			} else {
				this.notificationType = options.notificationType;
				this.notificationStatus = true;
				this.notificationEvent = options.notificationEvent;
				this.eventParameters = options.eventParameters;
				this.sequenceNumber = options.sequenceNumber;
			}
		}
	}

	// @noCCValues - Persisting this CC is handled by ZWaveNode

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		const valueDB = this.getValueDB();
		if (this.alarmType != undefined) {
			valueDB.setValue(
				getAlarmTypeValueId(this.endpointIndex),
				this.alarmType,
			);
		}
		if (this.alarmLevel != undefined) {
			valueDB.setValue(
				getAlarmLevelValueId(this.endpointIndex),
				this.alarmLevel,
			);
		}

		return true;
	}

	// Disable the lint error temporarily

	public alarmType: number | undefined;
	public alarmLevel: number | undefined;

	public notificationType: number | undefined;
	public notificationStatus: boolean | number | undefined;
	public notificationEvent: number | undefined;

	public readonly zensorNetSourceNodeId: number | undefined;
	public eventParameters:
		| Buffer
		| Duration
		| Record<string, number>
		| undefined;

	public sequenceNumber: number | undefined;

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.alarmType) {
			message = {
				"V1 alarm type": this.alarmType,
				"V1 alarm level": this.alarmLevel,
			};
		} else {
			let valueConfig: NotificationValueDefinition | undefined;
			try {
				valueConfig = this.driver.configManager
					.lookupNotification(this.notificationType!)
					?.lookupValue(this.notificationEvent!);
			} catch {
				/* ignore */
			}
			if (valueConfig) {
				message = {
					"notification type": this.driver.configManager.getNotificationName(
						this.notificationType!,
					),
					"notification status": this.notificationStatus,
					[`notification ${valueConfig?.type ?? "event"}`]:
						valueConfig?.label ??
						`Unknown (${num2hex(this.notificationEvent)})`,
				};
			} else {
				message = {
					"notification type": this.notificationType,
					"notification status": this.notificationStatus,
					"notification event": num2hex(this.notificationEvent),
				};
			}
		}
		if (this.zensorNetSourceNodeId) {
			message["zensor net source node id"] = this.zensorNetSourceNodeId;
		}
		if (this.sequenceNumber != undefined) {
			message["sequence number"] = this.sequenceNumber;
		}
		if (this.eventParameters != undefined) {
			message["event parameters"] = String(this.eventParameters);
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			alarmType: this.alarmType,
			notificationType:
				this.notificationType != undefined
					? this.driver.configManager.lookupNotification(
							this.notificationType,
					  )?.name
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
			!Buffer.isBuffer(this.eventParameters)
		) {
			return;
		}
		// Look up the received notification and value in the config
		const notificationConfig = this.driver.configManager.lookupNotification(
			this.notificationType,
		);
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
			this.eventParameters = Duration.parseReport(
				this.eventParameters[0],
			);
		} else if (
			valueConfig.parameter instanceof
			NotificationParameterWithCommandClass
		) {
			// The parameters **should** contain a CC, however there might be some exceptions
			if (
				this.eventParameters.length === 1 &&
				notificationConfig.id === 0x06 &&
				(this.notificationEvent === 0x05 ||
					this.notificationEvent === 0x06)
			) {
				// Access control -> Keypad Lock/Unlock operation
				// Some devices only send the User ID, not a complete CC payload
				this.eventParameters = {
					userId: this.eventParameters[0],
				};
			} else {
				// Try to parse the event parameters - if this fails, we should still handle the notification report
				try {
					// Convert CommandClass instances to a standardized object representation
					const cc = CommandClass.from(this.driver, {
						data: this.eventParameters,
						fromEncapsulation: true,
						encapCC: this,
					});
					let json = cc.toJSON();
					// If a CC has no good toJSON() representation, we're only interested in the payload
					if (
						"nodeId" in json &&
						"ccId" in json &&
						"payload" in json
					) {
						json = pick(json, ["payload"]);
					}
					this.eventParameters = json;
				} catch (e: unknown) {
					if (
						isZWaveError(e) &&
						e.code ===
							ZWaveErrorCodes.PacketFormat_InvalidPayload &&
						Buffer.isBuffer(this.eventParameters)
					) {
						const ccId = CommandClass.getCommandClass(
							this.eventParameters,
						);
						const ccCommand = CommandClass.getCCCommand(
							this.eventParameters,
						);
						if (
							ccId === CommandClasses["User Code"] &&
							ccCommand === UserCodeCommand.Report &&
							this.eventParameters.length >= 3
						) {
							// Access control -> Keypad Lock/Unlock operation
							// Some devices report the user code with truncated UserCode reports
							this.eventParameters = {
								userId: this.eventParameters[2],
							};
						} else {
							this.driver.controllerLog.logNode(
								this.nodeId as number,
								`Failed to parse Notification CC event parameters, ignoring them...`,
								"error",
							);
						}
					} else {
						// unexpected error
						throw e;
					}
				}
			}
		} else if (
			valueConfig.parameter instanceof NotificationParameterWithValue
		) {
			// The parameters contain a named value
			this.eventParameters = {
				[valueConfig.parameter
					.propertyName]: this.eventParameters.readUIntBE(
					0,
					this.eventParameters.length,
				),
			};
		}
	}

	public serialize(): Buffer {
		if (this.version === 1) {
			if (this.alarmLevel == undefined || this.alarmType == undefined) {
				throw new ZWaveError(
					`Notification CC V1 (Alarm CC) reports requires the alarm type and level to be set!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.payload = Buffer.from([this.alarmType, this.alarmLevel]);
		} else {
			if (
				this.notificationType == undefined ||
				this.notificationEvent == undefined
			) {
				throw new ZWaveError(
					`Notification CC reports requires the notification type and event to be set!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (
				this.eventParameters != undefined &&
				!Buffer.isBuffer(this.eventParameters)
			) {
				throw new ZWaveError(
					`When sending Notification CC reports, the event parameters can only be buffers!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			const controlByte =
				(this.sequenceNumber != undefined ? 0b1000_0000 : 0) |
				((this.eventParameters?.length ?? 0) & 0b11111);
			this.payload = Buffer.from([
				0,
				0,
				0,
				0xff,
				this.notificationType,
				this.notificationEvent,
				controlByte,
			]);
			if (this.eventParameters) {
				this.payload = Buffer.concat([
					this.payload,
					this.eventParameters,
				]);
			}
			if (this.sequenceNumber != undefined) {
				this.payload = Buffer.concat([
					this.payload,
					Buffer.from([this.sequenceNumber]),
				]);
			}
		}
		return super.serialize();
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
		driver: Driver,
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
	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.alarmType != undefined) {
			message["V1 alarm type"] = this.alarmType;
		}
		if (this.notificationType != undefined) {
			message[
				"notification type"
			] = this.driver.configManager.getNotificationName(
				this.notificationType,
			);
			if (this.notificationEvent != undefined) {
				message["notification event"] =
					this.driver.configManager
						.lookupNotification(this.notificationType)
						?.events.get(this.notificationEvent)?.label ??
					`Unknown (${num2hex(this.notificationEvent)})`;
			}
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(NotificationCommand.SupportedReport)
export class NotificationCCSupportedReport extends NotificationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supports V1 alarm": this.supportsV1Alarm,
				"supported notification types": this.supportedNotificationTypes
					.map(
						(t) =>
							`\n· ${this.driver.configManager.getNotificationName(
								t,
							)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(NotificationCommand.SupportedGet)
@expectedCCResponse(NotificationCCSupportedReport)
export class NotificationCCSupportedGet extends NotificationCC {}

@CCCommand(NotificationCommand.EventSupportedReport)
export class NotificationCCEventSupportedReport extends NotificationCC {
	public constructor(
		driver: Driver,
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
		this._supportedEvents = parseBitMask(
			eventBitMask,
			// In this mask, bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
			0,
		);

		this.persistValues();
	}

	public persistValues(): boolean {
		if (!super.persistValues()) return false;
		const valueDB = this.getValueDB();

		// Store which events this notification supports
		valueDB.setValue(
			getSupportedNotificationEventsValueId(this._notificationType),
			this._supportedEvents,
		);

		// For each event, predefine the value metadata
		const metadataMap = defineMetadataForNotificationEvents(
			this.driver.configManager,
			this.endpointIndex,
			this._notificationType,
			this._supportedEvents,
		);
		for (const [key, metadata] of metadataMap.entries()) {
			const valueId = JSON.parse(key) as ValueID;
			valueDB.setMetadata(valueId, metadata);
		}
		return true;
	}

	private _notificationType: number;
	public get notificationType(): number {
		return this._notificationType;
	}

	private _supportedEvents: number[];
	public get supportedEvents(): readonly number[] {
		return this._supportedEvents;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const notification = this.driver.configManager.lookupNotification(
			this.notificationType,
		);
		return {
			...super.toLogEntry(),
			message: {
				"notification type": this.driver.configManager.getNotificationName(
					this.notificationType,
				),
				"supported events": this.supportedEvents
					.map(
						(e) =>
							`\n· ${
								notification?.events.get(e)?.label ??
								`Unknown (${num2hex(e)})`
							}`,
					)
					.join(""),
			},
		};
	}
}

interface NotificationCCEventSupportedGetOptions extends CCCommandOptions {
	notificationType: number;
}

@CCCommand(NotificationCommand.EventSupportedGet)
@expectedCCResponse(NotificationCCEventSupportedReport)
export class NotificationCCEventSupportedGet extends NotificationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"notification type": this.driver.configManager.getNotificationName(
					this.notificationType,
				),
			},
		};
	}
}
