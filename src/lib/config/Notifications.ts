import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { num2hex } from "../util/strings";
import { configDir, hexKeyRegex, throwInvalidConfig } from "./utils";

interface NotificationStateDefinition {
	type: "state";
	variableName: string;
	value: number;
	idle: boolean;
}

interface NotificationEventDefinition {
	type: "event";
}

export type NotificationValueDefinition = (
	| NotificationStateDefinition
	| NotificationEventDefinition
) & {
	description?: string;
	label: string;
};

const configPath = path.join(configDir, "notifications.json");
let notifications: ReadonlyMap<number, Notification> | undefined;

/** @internal */
export async function loadNotificationsInternal(): Promise<void> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig(
				"notifications",
				"the database is not an object",
			);
		}

		const ret = new Map();
		for (const [id, ntfcnDefinition] of entries(definition)) {
			if (!hexKeyRegex.test(id)) {
				throwInvalidConfig(
					"notifications",
					`found non-hex key "${id}" at the root`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			ret.set(idNum, new Notification(idNum, ntfcnDefinition));
		}
		notifications = ret;
	} catch (e) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("notifications");
		}
	}
}

export async function loadNotifications(): Promise<void> {
	try {
		await loadNotificationsInternal();
	} catch (e) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
					`Could not notifications config: ${e.message}`,
					"error",
				);
			}
			notifications = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up the notification configuration for a given notification type
 */
export function lookupNotification(
	notificationType: number,
): Notification | undefined {
	return notifications!.get(notificationType);
}

export class Notification {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.name = definition.name;
		this.variables = isArray(definition.variables)
			? definition.variables.map(v => new NotificationVariable(v))
			: [];
		const events = new Map<number, NotificationEvent>();
		if (isObject(definition.events)) {
			for (const [eventId, eventDefinition] of entries(
				definition.events,
			)) {
				if (!hexKeyRegex.test(eventId)) {
					throwInvalidConfig(
						"notifications",
						`found non-hex key "${eventId}" in notification ${num2hex(
							id,
						)}`,
					);
				}
				const eventIdNum = parseInt(eventId.slice(2), 16);
				events.set(
					eventIdNum,
					new NotificationEvent(eventIdNum, eventDefinition),
				);
			}
		}
		this.events = events;
	}

	public readonly id: number;
	public readonly name: string;
	public readonly variables: readonly NotificationVariable[];
	public readonly events: ReadonlyMap<number, NotificationEvent>;

	public lookupValue(value: number): NotificationValueDefinition | undefined {
		// Events are easier to look up, do that first
		if (this.events.has(value)) {
			const { id, ...event } = this.events.get(value)!;
			return {
				type: "event",
				...event,
			};
		}

		// Then try to find a variable with a matching state
		const variable = this.variables.find(v => v.states.has(value));
		if (variable) {
			const state = variable.states.get(value)!;
			return {
				type: "state",
				value,
				idle: variable.idle,
				label: state.label,
				description: state.description,
				variableName: variable.name,
			};
		}
	}
}

export class NotificationVariable {
	public constructor(definition: JSONObject) {
		this.name = definition.name;
		// By default all notification variables may return to idle
		// Otherwise it must be specified explicitly using `idle: false`
		this.idle = definition.idle !== false;
		if (!isObject(definition.states)) {
			throwInvalidConfig(
				"notifications",
				`the variable definition for ${this.name} is not an object`,
			);
		}
		const states = new Map<number, NotificationState>();
		for (const [stateId, stateDefinition] of entries(definition.states)) {
			if (!hexKeyRegex.test(stateId)) {
				throwInvalidConfig(
					"notifications",
					`found non-hex key "${stateId}" in notification variable ${this.name}`,
				);
			}
			const stateIdNum = parseInt(stateId.slice(2), 16);
			states.set(
				stateIdNum,
				new NotificationState(stateIdNum, stateDefinition),
			);
		}
		this.states = states;
	}

	public readonly name: string;
	/** Whether the variable may be reset to idle */
	public readonly idle: boolean;
	public readonly states: ReadonlyMap<number, NotificationState>;
}

export class NotificationState {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"notifications",
				`The label of notification state ${num2hex(
					id,
				)} has a non-string label`,
			);
		}
		this.label = definition.label;
		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"notifications",
				`The label of notification state ${num2hex(
					id,
				)} has a non-string description`,
			);
		}
		this.description = definition.description;
	}

	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
}

export class NotificationEvent {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.label = definition.label;
		this.description = definition.description;
	}
	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
}
