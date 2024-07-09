import {
	type Notification,
	type NotificationState,
	type NotificationValue,
	getNotification,
	getNotificationEventName,
	getNotificationName,
	getNotificationValue,
	getNotificationValueName,
	timespan,
} from "@zwave-js/core";
import {
	CommandClasses,
	Duration,
	type IZWaveEndpoint,
	type IZWaveNode,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SinglecastCC,
	type SupervisionResult,
	type ValueID,
	ValueMetadata,
	type ValueMetadataNumeric,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	getCCName,
	isZWaveError,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { buffer2hex, num2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { isArray } from "alcalzone-shared/typeguards";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	InvalidCC,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { isNotificationEventPayload } from "../lib/NotificationEventPayload";
import { V } from "../lib/Values";
import { NotificationCommand, UserCodeCommand } from "../lib/_Types";
import * as ccUtils from "../lib/utils";
import { AssociationGroupInfoCC } from "./AssociationGroupInfoCC";

export const NotificationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Notification, {
		...V.staticProperty("supportsV1Alarm", undefined, {
			internal: true,
			supportsEndpoints: false,
		}),
		...V.staticProperty("supportedNotificationTypes", undefined, {
			internal: true,
			supportsEndpoints: false,
		}),
		...V.staticProperty("notificationMode", undefined, {
			internal: true,
			supportsEndpoints: false,
		}),
		...V.staticProperty("lastRefresh", undefined, {
			internal: true,
		}),

		// V1 Alarm values
		...V.staticProperty(
			"alarmType",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Alarm Type",
			} as const,
		),
		...V.staticProperty(
			"alarmLevel",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Alarm Level",
			} as const,
		),

		// Simplification for the Door state variable, where we cannot know
		// if any of the enum values are supported
		...V.staticPropertyAndKeyWithName(
			"doorStateSimple",
			"Access Control",
			"Door state (simple)",
			{
				// Must be a number for compatibility reasons
				...ValueMetadata.ReadOnlyUInt8,
				label: "Door state (simple)",
				states: {
					[0x16]: "Window/door is open",
					[0x17]: "Window/door is closed",
				},
				ccSpecific: {
					notificationType: 0x06,
				},
			} as const,
			{
				autoCreate: shouldAutoCreateSimpleDoorSensorValue,
			} as const,
		),

		// Binary tilt value extracted from the Door state variable.
		...V.staticPropertyAndKeyWithName(
			"doorTiltState",
			"Access Control",
			"Door tilt state",
			{
				// Must be a number for compatibility reasons
				...ValueMetadata.ReadOnlyUInt8,
				label: "Door tilt state",
				states: {
					[0x00]: "Window/door is not tilted",
					[0x01]: "Window/door is tilted",
				},
				ccSpecific: {
					notificationType: 0x06,
				},
			} as const,
			{
				// This is created when the tilt state is first received.
				autoCreate: false,
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses.Notification, {
		...V.dynamicPropertyAndKeyWithName(
			"supportedNotificationEvents",
			"supportedNotificationEvents",
			(notificationType: number) => notificationType,
			({ property, propertyKey }) =>
				property === "supportedNotificationEvents"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true, supportsEndpoints: false },
		),

		// Different variants of the V2 notification values:
		// Unknown type
		...V.dynamicPropertyWithName(
			"unknownNotificationType",
			(notificationType: number) =>
				`UNKNOWN_${num2hex(notificationType)}`,
			({ property }) =>
				typeof property === "string"
				&& property.startsWith("UNKNOWN_0x"),
			(notificationType: number) => ({
				...ValueMetadata.ReadOnlyUInt8,
				label: `Unknown notification (${
					num2hex(
						notificationType,
					)
				})`,
				ccSpecific: { notificationType },
			} as const),
		),

		// Known type, unknown variable
		...V.dynamicPropertyAndKeyWithName(
			"unknownNotificationVariable",
			(notificationType: number, notificationName: string) =>
				notificationName,
			"unknown",
			({ property, propertyKey }) =>
				typeof property === "string" && propertyKey === "unknown",
			(notificationType: number, notificationName: string) => ({
				...ValueMetadata.ReadOnlyUInt8,
				label: `${notificationName}: Unknown value`,
				ccSpecific: { notificationType },
			} as const),
		),

		// (Stateful) notification variable
		...V.dynamicPropertyAndKeyWithName(
			"notificationVariable",
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			(notificationName: string, variableName: string) =>
				notificationName,
			(notificationName: string, variableName: string) => variableName,
			({ property, propertyKey }) =>
				typeof property === "string" && typeof propertyKey === "string",
			// Notification metadata is so dynamic, it does not make sense to define it here
			undefined,
		),
	}),
});

function shouldAutoCreateSimpleDoorSensorValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	const supportedACEvents = valueDB.getValue<readonly number[]>(
		NotificationCCValues.supportedNotificationEvents(
			// Access Control
			0x06,
		).endpoint(endpoint.index),
	);
	if (!supportedACEvents) return false;
	return (
		supportedACEvents.includes(
			// Window/door is open
			0x16,
		)
		&& supportedACEvents.includes(
			// Window/door is closed
			0x17,
		)
	);
}

@API(CommandClasses.Notification)
export class NotificationCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: NotificationCommand): MaybeNotKnown<boolean> {
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

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: NotificationCCAPI,
			{ property, propertyKey },
		) {
			const valueId: ValueID = {
				commandClass: this.ccId,
				endpoint: this.endpoint.index,
				property,
				propertyKey,
			};
			if (NotificationCCValues.notificationVariable.is(valueId)) {
				const notificationType: number | undefined = this
					.tryGetValueDB()?.getMetadata(valueId)?.ccSpecific
					?.notificationType;
				if (notificationType != undefined) {
					return this.getInternal({ notificationType });
				}
			}

			throwUnsupportedProperty(this.ccId, property);
		};
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

		const cc = new NotificationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.applHost.sendCommand<NotificationCCReport>(
			cc,
			this.commandOptions,
		);
	}

	@validateArgs()
	public async sendReport(
		options: NotificationCCReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.Report,
		);

		const cc = new NotificationCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
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

	@validateArgs()
	public async set(
		notificationType: number,
		notificationStatus: boolean,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.Set,
		);

		const cc = new NotificationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			notificationType,
			notificationStatus,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.SupportedGet,
		);

		const cc = new NotificationCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			NotificationCCSupportedReport
		>(
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

	@validateArgs()
	public async getSupportedEvents(
		notificationType: number,
	): Promise<MaybeNotKnown<readonly number[]>> {
		this.assertSupportsCommand(
			NotificationCommand,
			NotificationCommand.EventSupportedGet,
		);

		const cc = new NotificationCCEventSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			notificationType,
		});
		const response = await this.applHost.sendCommand<
			NotificationCCEventSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedEvents;
	}
}

export function getNotificationEnumBehavior(
	notification: Notification,
	valueConfig: NotificationState,
): "none" | "extend" | "replace" {
	const variable = notification.variables.find((v) =>
		v.states.has(valueConfig.value)
	);
	if (!variable) return "none";
	const numStatesWithEnums = [...variable.states.values()].filter(
		(val) => val.parameter?.type === "enum",
	).length;
	if (numStatesWithEnums === 0) return "none";
	// An enum value replaces the original value if there is only a single possible state
	// which also has an enum parameter
	if (numStatesWithEnums === 1 && variable.states.size === 1) {
		return "replace";
	}
	return "extend";
}

export function getNotificationStateValueWithEnum(
	stateValue: number,
	enumValue: number,
): number {
	return (stateValue << 8) | enumValue;
}

/**
 * Returns the metadata to use for a known notification value.
 * Can be used to extend a previously defined metadata,
 * e.g. for V2 notifications that don't allow discovering supported events.
 */
export function getNotificationValueMetadata(
	previous: ValueMetadataNumeric | undefined,
	notification: Notification,
	valueConfig: NotificationState,
): ValueMetadataNumeric {
	const metadata: ValueMetadataNumeric = previous ?? {
		...ValueMetadata.ReadOnlyUInt8,
		label: valueConfig.variableName,
		states: {},
		ccSpecific: {
			notificationType: notification.type,
		},
	};
	if (valueConfig.idle) {
		metadata.states![0] = "idle";
	}
	const enumBehavior = getNotificationEnumBehavior(
		notification,
		valueConfig,
	);
	if (enumBehavior !== "replace") {
		metadata.states![valueConfig.value] = valueConfig.label;
	}
	if (valueConfig.parameter?.type === "enum") {
		for (
			const [key, label] of Object.entries(valueConfig.parameter.values)
		) {
			const value = parseInt(key);
			const stateKey = enumBehavior === "replace"
				? value
				: getNotificationStateValueWithEnum(valueConfig.value, value);
			metadata.states![stateKey] = label;
		}
	}

	return metadata;
}

@commandClass(CommandClasses.Notification)
@implementedVersion(8)
@ccValues(NotificationCCValues)
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

	private async determineNotificationMode(
		applHost: ZWaveApplicationHost,
		api: NotificationCCAPI,
		supportedNotificationEvents: ReadonlyMap<number, readonly number[]>,
	): Promise<"push" | "pull"> {
		const node = this.getNode(applHost)!;

		// SDS14223: If the supporting node does not support the Association Command Class,
		// it may be concluded that the supporting node implements Pull Mode and discovery may be aborted.
		if (!node.supportsCC(CommandClasses.Association)) return "pull";

		if (node.supportsCC(CommandClasses["Association Group Information"])) {
			try {
				const groupsIssueingNotifications = AssociationGroupInfoCC
					.findGroupsForIssuedCommand(
						applHost,
						node,
						this.ccId,
						NotificationCommand.Report,
					);
				return groupsIssueingNotifications.length > 0 ? "push" : "pull";
			} catch {
				// We might be dealing with an older cache file, fall back to testing
			}
		}

		applHost.controllerLog.logNode(node.id, {
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

		// If everything failed, e.g. because the node is V1/V2, assume this is a "push" node.
		// If we assumed "pull", we would have to query the node regularly, which can cause
		// the node to return old (already handled) notifications.
		// https://github.com/zwave-js/node-zwave-js/issues/5626
		return "push";
	}

	/** Whether the node implements push or pull notifications */
	public static getNotificationMode(
		applHost: ZWaveApplicationHost,
		node: IZWaveNode,
	): MaybeNotKnown<"push" | "pull"> {
		return applHost
			.getValueDB(node.id)
			.getValue(NotificationCCValues.notificationMode.id);
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Notification,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// If one Association group issues Notification Reports,
		// we must associate ourselves with that channel
		try {
			await ccUtils.assignLifelineIssueingCommand(
				applHost,
				endpoint,
				this.ccId,
				NotificationCommand.Report,
			);
		} catch {
			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Configuring associations to receive ${
					getCCName(
						this.ccId,
					)
				} reports failed!`,
				level: "warn",
			});
		}

		let supportsV1Alarm = false;
		if (this.version >= 2) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying supported notification types...",
				direction: "outbound",
			});

			const suppResponse = await api.getSupported();
			if (!suppResponse) {
				applHost.controllerLog.logNode(node.id, {
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
			const supportedNotificationNames = supportedNotificationTypes.map(
				getNotificationName,
			);
			const supportedNotificationEvents = new Map<
				number,
				readonly number[]
			>();

			const logMessage = `received supported notification types:${
				supportedNotificationNames
					.map((name) => `\n· ${name}`)
					.join("")
			}`;
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			if (this.version >= 3) {
				// Query each notification for its supported events
				for (let i = 0; i < supportedNotificationTypes.length; i++) {
					const type = supportedNotificationTypes[i];
					const name = supportedNotificationNames[i];

					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`querying supported notification events for ${name}...`,
						direction: "outbound",
					});
					const supportedEvents = await api.getSupportedEvents(type);
					if (supportedEvents) {
						supportedNotificationEvents.set(type, supportedEvents);
						applHost.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message:
								`received supported notification events for ${name}: ${
									supportedEvents
										.map(String)
										.join(", ")
								}`,
							direction: "inbound",
						});
					}
				}
			}

			// Determine whether the node is a push or pull node
			let notificationMode = this.getValue<"push" | "pull">(
				applHost,
				NotificationCCValues.notificationMode,
			);
			if (notificationMode !== "push" && notificationMode !== "pull") {
				notificationMode = await this.determineNotificationMode(
					applHost,
					api,
					supportedNotificationEvents,
				);
				this.setValue(
					applHost,
					NotificationCCValues.notificationMode,
					notificationMode,
				);
			}

			if (notificationMode === "pull") {
				await this.refreshValues(applHost);
			} /* if (notificationMode === "push") */ else {
				for (let i = 0; i < supportedNotificationTypes.length; i++) {
					const type = supportedNotificationTypes[i];
					const name = supportedNotificationNames[i];
					const notification = getNotification(type);

					// Enable reports for each notification type
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `enabling notifications for ${name}...`,
						direction: "outbound",
					});
					await api.set(type, true);

					// Set the value to idle if possible and there is no value yet
					if (notification) {
						const events = supportedNotificationEvents.get(type);
						if (events) {
							// Find all variables that are supported by this node and have an idle state
							for (
								const variable of notification.variables
									.filter((v) => !!v.idle)
							) {
								if (
									[...variable.states.keys()].some((key) =>
										events.includes(key)
									)
								) {
									const value = NotificationCCValues
										.notificationVariable(
											notification.name,
											variable.name,
										);

									// Set the value to idle if it has no value yet
									// TODO: GH#1028
									// * do this only if the last update was more than 5 minutes ago
									// * schedule an auto-idle if the last update was less than 5 minutes ago but before the current applHost start
									if (
										this.getValue(applHost, value)
											== undefined
									) {
										this.setValue(
											applHost,
											value,
											0, /* idle */
										);
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
			this.ensureMetadata(applHost, NotificationCCValues.alarmType);
			this.ensureMetadata(applHost, NotificationCCValues.alarmLevel);
		}

		// Also create metadata for values mapped through compat config
		const mappings = applHost.getDeviceConfig?.(this.nodeId as number)
			?.compat?.alarmMapping;
		if (mappings) {
			// Find all mappings to a valid notification variable
			const supportedNotifications = new Map<number, Set<number>>();
			for (const { to } of mappings) {
				const notification = getNotification(to.notificationType);
				if (!notification) continue;
				const valueConfig = getNotificationValue(
					notification,
					to.notificationEvent,
				);

				// Remember supported notification types and events to create the internal values later
				if (!supportedNotifications.has(to.notificationType)) {
					supportedNotifications.set(
						to.notificationType,
						new Set(),
					);
				}
				const supportedNotificationTypesSet = supportedNotifications
					.get(to.notificationType)!;
				supportedNotificationTypesSet.add(to.notificationEvent);

				if (valueConfig?.type !== "state") continue;

				const notificationValue = NotificationCCValues
					.notificationVariable(
						notification.name,
						valueConfig.variableName,
					);

				// Create or update the metadata
				const metadata = getNotificationValueMetadata(
					this.getMetadata(applHost, notificationValue),
					notification,
					valueConfig,
				);
				this.setMetadata(applHost, notificationValue, metadata);

				// Set the value to idle if it has no value yet
				if (valueConfig.idle) {
					// TODO: GH#1028
					// * do this only if the last update was more than 5 minutes ago
					// * schedule an auto-idle if the last update was less than 5 minutes ago but before the current applHost start
					if (
						this.getValue(applHost, notificationValue) == undefined
					) {
						this.setValue(
							applHost,
							notificationValue,
							0, /* idle */
						);
					}
				}
			}

			// Remember supported notification types and events in the cache
			this.setValue(
				applHost,
				NotificationCCValues.supportedNotificationTypes,
				[...supportedNotifications.keys()],
			);
			for (const [type, events] of supportedNotifications) {
				this.setValue(
					applHost,
					NotificationCCValues.supportedNotificationEvents(type),
					[...events],
				);
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		// Refreshing values only works on pull nodes
		if (NotificationCC.getNotificationMode(applHost, node) === "pull") {
			const endpoint = this.getEndpoint(applHost)!;
			const api = CCAPI.create(
				CommandClasses.Notification,
				applHost,
				endpoint,
			).withOptions({
				priority: MessagePriority.NodeQuery,
			});

			// Load supported notification types and events from cache
			const supportedNotificationTypes = this.getValue<readonly number[]>(
				applHost,
				NotificationCCValues.supportedNotificationTypes,
			) ?? [];
			const supportedNotificationNames = supportedNotificationTypes.map(
				getNotificationName,
			);

			for (let i = 0; i < supportedNotificationTypes.length; i++) {
				const type = supportedNotificationTypes[i];
				const name = supportedNotificationNames[i];

				// Always query each notification for its current status
				applHost.controllerLog.logNode(node.id, {
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

				// @ts-expect-error
				if (response) await node.handleCommand(response);
			}

			// Remember when we did this
			this.setValue(
				applHost,
				NotificationCCValues.lastRefresh,
				Date.now(),
			);
		}
	}

	public shouldRefreshValues(
		this: SinglecastCC<this>,
		applHost: ZWaveApplicationHost,
	): boolean {
		// Pull-mode nodes must be polled regularly

		const isPullMode = NotificationCC.getNotificationMode(
			applHost,
			this.getNode(applHost)!,
		) === "pull";
		if (!isPullMode) return false;

		const lastUpdated = this.getValue<number>(
			applHost,
			NotificationCCValues.lastRefresh,
		);

		return (
			lastUpdated == undefined
			|| Date.now() - lastUpdated > timespan.hours(6)
		);
	}
}

// @publicAPI
export interface NotificationCCSetOptions extends CCCommandOptions {
	notificationType: number;
	notificationStatus: boolean;
}

@CCCommand(NotificationCommand.Set)
@useSupervision()
export class NotificationCCSet extends NotificationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | NotificationCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.notificationType = this.payload[0];
			this.notificationStatus = this.payload[1] === 0xff;
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"notification type": getNotificationName(this.notificationType),
				status: this.notificationStatus,
			},
		};
	}
}

// @publicAPI
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
@useSupervision()
export class NotificationCCReport extends NotificationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (NotificationCCReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.alarmType = this.payload[0];
			this.alarmLevel = this.payload[1];
			// V2..V3, reserved in V4+
			if (
				(this.version === 2 || this.version === 3)
				&& this.payload.length >= 3
			) {
				this.zensorNetSourceNodeId = this.payload[2];
			}
			// V2+ requires the alarm bytes to be zero. Manufacturers don't care though, so we don't enforce that.
			// Don't use the version to decide because we might discard notifications
			// before the interview is complete
			if (this.payload.length >= 7) {
				this.notificationStatus = this.payload[3];
				this.notificationType = this.payload[4];
				this.notificationEvent = this.payload[5];

				const containsSeqNum = !!(this.payload[6] & 0b1000_0000);
				const numEventParams = this.payload[6] & 0b11111;
				if (numEventParams > 0) {
					validatePayload(this.payload.length >= 7 + numEventParams);
					this.eventParameters = Buffer.from(
						this.payload.subarray(7, 7 + numEventParams),
					);
				}
				if (containsSeqNum) {
					validatePayload(
						this.payload.length >= 7 + numEventParams + 1,
					);
					this.sequenceNumber = this.payload[7 + numEventParams];
				}
			}

			// Store the V1 alarm values if they exist
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

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Check if we need to re-interpret the alarm values somehow
		if (
			this.alarmType != undefined
			&& this.alarmLevel != undefined
			&& this.alarmType !== 0
		) {
			if (this.version >= 2) {
				// Check if the device actually supports Notification CC, but chooses
				// to send Alarm frames instead (GH#1034)
				const supportedNotificationTypes = this.getValue<
					readonly number[]
				>(applHost, NotificationCCValues.supportedNotificationTypes);
				if (
					isArray(supportedNotificationTypes)
					&& supportedNotificationTypes.includes(this.alarmType)
				) {
					const supportedNotificationEvents = this.getValue<
						readonly number[]
					>(
						applHost,
						NotificationCCValues.supportedNotificationEvents(
							this.alarmType,
						),
					);
					if (
						isArray(supportedNotificationEvents)
						&& supportedNotificationEvents.includes(this.alarmLevel)
					) {
						// This alarm frame corresponds to a valid notification event
						applHost.controllerLog.logNode(
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
				const mapping = this.host.getDeviceConfig?.(
					this.nodeId as number,
				)?.compat?.alarmMapping;
				const match = mapping?.find(
					(m) =>
						m.from.alarmType === this.alarmType
						&& (m.from.alarmLevel == undefined
							|| m.from.alarmLevel === this.alarmLevel),
				);
				if (match) {
					applHost.controllerLog.logNode(
						this.nodeId as number,
						`compat mapping found, treating V1 Alarm frame as Notification Report`,
					);
					this.notificationType = match.to.notificationType;
					this.notificationEvent = match.to.notificationEvent;
					if (match.to.eventParameters) {
						this.eventParameters = {};
						for (
							const [key, val] of Object.entries(
								match.to.eventParameters,
							)
						) {
							if (typeof val === "number") {
								this.eventParameters[key] = val;
							} else if (val === "alarmLevel") {
								this.eventParameters[key] = this.alarmLevel;
							}
						}
					}
					// After mapping we do not set the legacy V1 values to undefined
					// Otherwise, adding a new mapping will be a breaking change
				}
			}
		}

		// Now we can interpret the event parameters and turn them into something useful
		this.parseEventParameters(applHost);

		if (this.alarmType != undefined) {
			const alarmTypeValue = NotificationCCValues.alarmType;
			this.ensureMetadata(applHost, alarmTypeValue);
			this.setValue(applHost, alarmTypeValue, this.alarmType);
		}
		if (this.alarmLevel != undefined) {
			const alarmLevelValue = NotificationCCValues.alarmLevel;
			this.ensureMetadata(applHost, alarmLevelValue);
			this.setValue(applHost, alarmLevelValue, this.alarmLevel);
		}

		return true;
	}

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
		| number
		| undefined;

	public sequenceNumber: number | undefined;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord = {};
		if (this.alarmType) {
			message = {
				"V1 alarm type": this.alarmType,
				"V1 alarm level": this.alarmLevel!,
			};
		}

		let valueConfig: NotificationValue | undefined;
		if (this.notificationType) {
			const notification = getNotification(this.notificationType);
			if (notification) {
				valueConfig = getNotificationValue(
					notification,
					this.notificationEvent!,
				);
			}
			if (valueConfig) {
				message = {
					...message,
					"notification type": getNotificationName(
						this.notificationType,
					),
					"notification status": this.notificationStatus!,
					[`notification ${valueConfig.type}`]: valueConfig.label
						?? `Unknown (${num2hex(this.notificationEvent)})`,
				};
			} else if (this.notificationEvent === 0x00) {
				message = {
					...message,
					"notification type": this.notificationType,
					"notification status": this.notificationStatus!,
					"notification state": "idle",
				};
			} else {
				message = {
					...message,
					"notification type": this.notificationType,
					"notification status": this.notificationStatus!,
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
			if (typeof this.eventParameters === "number") {
				// Try to look up the enum label
				let found = false;
				if (
					valueConfig?.parameter?.type === "enum"
				) {
					const label =
						valueConfig.parameter.values[this.eventParameters];
					if (label) {
						message["state parameters"] = label;
						found = true;
					}
				}
				if (!found) {
					message["state parameters"] = num2hex(this.eventParameters);
				}
			} else if (Buffer.isBuffer(this.eventParameters)) {
				message["event parameters"] = buffer2hex(this.eventParameters);
			} else if (this.eventParameters instanceof Duration) {
				message["event parameters"] = this.eventParameters.toString();
			} else {
				message["event parameters"] = Object.entries(
					this.eventParameters,
				)
					.map(([param, val]) => `\n  ${param}: ${num2hex(val)}`)
					.join("");
			}
		} else if (
			valueConfig?.parameter?.type === "enum"
			&& valueConfig.parameter.default != undefined
		) {
			const label = valueConfig.parameter.values[
				valueConfig.parameter.default
			];
			if (label) {
				message["state parameters"] = `${label} (omitted)`;
			}
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}

	private parseEventParameters(applHost: ZWaveApplicationHost): void {
		// This only makes sense for V2+ notifications
		if (
			this.notificationType == undefined
			|| this.notificationEvent == undefined
		) {
			return;
		}

		// Look up the received notification and value in the config
		const notification = getNotification(this.notificationType);
		if (!notification) return;
		const valueConfig = getNotificationValue(
			notification,
			this.notificationEvent,
		);
		if (!valueConfig) return;

		// Parse the event parameters if possible
		if (valueConfig.parameter?.type === "duration") {
			// This only makes sense if the event parameters are a buffer
			if (!Buffer.isBuffer(this.eventParameters)) {
				return;
			}
			// The parameters contain a Duration
			this.eventParameters = Duration.parseReport(
				this.eventParameters[0],
			);
		} else if (valueConfig.parameter?.type === "commandclass") {
			// This only makes sense if the event parameters are a buffer
			if (!Buffer.isBuffer(this.eventParameters)) {
				return;
			}
			// The parameters **should** contain a CC, however there might be some exceptions
			if (
				this.eventParameters.length === 1
				&& notification.type === 0x06
				&& (this.notificationEvent === 0x05
					|| this.notificationEvent === 0x06)
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
					const cc = CommandClass.from(this.host, {
						data: this.eventParameters,
						fromEncapsulation: true,
						encapCC: this,
					});
					validatePayload(!(cc instanceof InvalidCC));

					if (isNotificationEventPayload(cc)) {
						this.eventParameters = cc
							.toNotificationEventParameters();
					} else {
						// If a CC has no good toJSON() representation, we're only interested in the payload
						let json = cc.toJSON();
						if (
							"nodeId" in json
							&& "ccId" in json
							&& "payload" in json
						) {
							json = pick(json, ["payload"]);
						}
						this.eventParameters = json;
					}
				} catch (e) {
					if (
						isZWaveError(e)
						&& e.code
							=== ZWaveErrorCodes.PacketFormat_InvalidPayload
						&& Buffer.isBuffer(this.eventParameters)
					) {
						const ccId = CommandClass.getCommandClass(
							this.eventParameters,
						);
						const ccCommand = CommandClass.getCCCommand(
							this.eventParameters,
						);
						if (
							ccId === CommandClasses["User Code"]
							&& ccCommand === UserCodeCommand.Report
							&& this.eventParameters.length >= 3
						) {
							// Access control -> Keypad Lock/Unlock operation
							// Some devices report the user code with truncated UserCode reports
							this.eventParameters = {
								userId: this.eventParameters[2],
							};
						} else {
							applHost.controllerLog.logNode(
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
		} else if (valueConfig.parameter?.type === "value") {
			// This only makes sense if the event parameters are a buffer
			if (!Buffer.isBuffer(this.eventParameters)) {
				return;
			}
			// The parameters contain a named value
			this.eventParameters = {
				[valueConfig.parameter.propertyName]: this.eventParameters
					.readUIntBE(
						0,
						this.eventParameters.length,
					),
			};
		} else if (valueConfig.parameter?.type === "enum") {
			// The parameters may contain an enum value
			this.eventParameters = Buffer.isBuffer(this.eventParameters)
					&& this.eventParameters.length === 1
				? this.eventParameters[0]
				: undefined;

			// Some devices send notifications without an event parameter when they should.
			// In this case, fall back to the default value where possible.

			if (
				this.eventParameters == undefined
				&& valueConfig.parameter.default != undefined
			) {
				this.eventParameters = valueConfig.parameter.default;
			}
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
				this.notificationType == undefined
				|| this.notificationEvent == undefined
			) {
				throw new ZWaveError(
					`Notification CC reports requires the notification type and event to be set!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (
				this.eventParameters != undefined
				&& !Buffer.isBuffer(this.eventParameters)
			) {
				throw new ZWaveError(
					`When sending Notification CC reports, the event parameters can only be buffers!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			const controlByte =
				(this.sequenceNumber != undefined ? 0b1000_0000 : 0)
				| ((this.eventParameters?.length ?? 0) & 0b11111);
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
// @publicAPI
export type NotificationCCGetOptions =
	& CCCommandOptions
	& NotificationCCGetSpecificOptions;

@CCCommand(NotificationCommand.Get)
@expectedCCResponse(NotificationCCReport)
export class NotificationCCGet extends NotificationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | NotificationCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.alarmType = this.payload[0] || undefined;
			if (this.payload.length >= 2) {
				this.notificationType = this.payload[1] || undefined;
				if (this.payload.length >= 3 && this.notificationType != 0xff) {
					this.notificationEvent = this.payload[2];
				}
			}
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.alarmType != undefined) {
			message["V1 alarm type"] = this.alarmType;
		}
		if (this.notificationType != undefined) {
			message["notification type"] = getNotificationName(
				this.notificationType,
			);
			if (this.notificationEvent != undefined) {
				message["notification event"] = getNotificationEventName(
					this.notificationType,
					this.notificationEvent,
				);
			}
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface NotificationCCSupportedReportOptions extends CCCommandOptions {
	supportsV1Alarm: boolean;
	supportedNotificationTypes: number[];
}

@CCCommand(NotificationCommand.SupportedReport)
export class NotificationCCSupportedReport extends NotificationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| NotificationCCSupportedReportOptions
			| CommandClassDeserializationOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.supportsV1Alarm = !!(this.payload[0] & 0b1000_0000);
			const numBitMaskBytes = this.payload[0] & 0b0001_1111;
			validatePayload(
				numBitMaskBytes > 0,
				this.payload.length >= 1 + numBitMaskBytes,
			);
			const notificationBitMask = this.payload.subarray(
				1,
				1 + numBitMaskBytes,
			);
			this.supportedNotificationTypes = parseBitMask(
				notificationBitMask,
				// bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
				0,
			);
		} else {
			this.supportsV1Alarm = options.supportsV1Alarm;
			this.supportedNotificationTypes =
				options.supportedNotificationTypes;
		}
	}

	@ccValue(NotificationCCValues.supportsV1Alarm)
	public supportsV1Alarm: boolean;

	@ccValue(NotificationCCValues.supportedNotificationTypes)
	public supportedNotificationTypes: number[];

	public serialize(): Buffer {
		const bitMask = encodeBitMask(
			this.supportedNotificationTypes,
			Math.max(...this.supportedNotificationTypes),
			0,
		);
		this.payload = Buffer.concat([
			Buffer.from([
				(this.supportsV1Alarm ? 0b1000_0000 : 0) | bitMask.length,
			]),
			bitMask,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supports V1 alarm": this.supportsV1Alarm,
				"supported notification types": this.supportedNotificationTypes
					.map(
						(t) => `\n· ${getNotificationName(t)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(NotificationCommand.SupportedGet)
@expectedCCResponse(NotificationCCSupportedReport)
export class NotificationCCSupportedGet extends NotificationCC {}

// @publicAPI
export interface NotificationCCEventSupportedReportOptions
	extends CCCommandOptions
{
	notificationType: number;
	supportedEvents: number[];
}

@CCCommand(NotificationCommand.EventSupportedReport)
export class NotificationCCEventSupportedReport extends NotificationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| NotificationCCEventSupportedReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.notificationType = this.payload[0];
			const numBitMaskBytes = this.payload[1] & 0b000_11111;
			if (numBitMaskBytes === 0) {
				// Notification type is not supported
				this.supportedEvents = [];
				return;
			}

			validatePayload(this.payload.length >= 2 + numBitMaskBytes);
			const eventBitMask = this.payload.subarray(2, 2 + numBitMaskBytes);
			this.supportedEvents = parseBitMask(
				eventBitMask,
				// In this mask, bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
				0,
			);
		} else {
			this.notificationType = options.notificationType;
			this.supportedEvents = options.supportedEvents;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Store which events this notification supports
		this.setValue(
			applHost,
			NotificationCCValues.supportedNotificationEvents(
				this.notificationType,
			),
			this.supportedEvents,
		);

		// For each event, predefine the value metadata
		const notification = getNotification(this.notificationType);

		if (!notification) {
			// This is an unknown notification
			this.setMetadata(
				applHost,
				NotificationCCValues.unknownNotificationType(
					this.notificationType,
				),
			);
		} else {
			// This is a standardized notification
			let isFirst = true;
			for (const value of this.supportedEvents) {
				// Find out which property we need to update
				const valueConfig = getNotificationValue(notification, value);
				if (valueConfig?.type === "state") {
					const notificationValue = NotificationCCValues
						.notificationVariable(
							notification.name,
							valueConfig.variableName,
						);

					// After we've created the metadata initially, extend it
					const metadata = getNotificationValueMetadata(
						isFirst
							? undefined
							: this.getMetadata(applHost, notificationValue),
						notification,
						valueConfig,
					);

					this.setMetadata(applHost, notificationValue, metadata);

					isFirst = false;
				}
			}
		}

		return true;
	}

	public notificationType: number;
	public supportedEvents: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([this.notificationType, 0]);
		if (this.supportedEvents.length > 0) {
			const bitMask = encodeBitMask(
				this.supportedEvents,
				Math.max(...this.supportedEvents),
				0,
			);
			this.payload[1] = bitMask.length;
			this.payload = Buffer.concat([this.payload, bitMask]);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"notification type": getNotificationName(this.notificationType),
				"supported events": this.supportedEvents
					.map(
						(e) =>
							`\n· ${
								getNotificationValueName(
									this.notificationType,
									e,
								)
							}`,
					)
					.join(""),
			},
		};
	}
}

// @publicAPI
export interface NotificationCCEventSupportedGetOptions
	extends CCCommandOptions
{
	notificationType: number;
}

@CCCommand(NotificationCommand.EventSupportedGet)
@expectedCCResponse(NotificationCCEventSupportedReport)
export class NotificationCCEventSupportedGet extends NotificationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| NotificationCCEventSupportedGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.notificationType = this.payload[0];
		} else {
			this.notificationType = options.notificationType;
		}
	}

	public notificationType: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.notificationType]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"notification type": getNotificationName(this.notificationType),
			},
		};
	}
}
