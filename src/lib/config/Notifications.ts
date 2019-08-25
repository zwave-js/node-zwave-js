import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject } from "../util/misc";
import { configDir } from "./utils";

interface NotificationStateDefinition {
	type: "state";
	variableName: string;
	value: number;
}

interface NotificationEventDefinition {
	type: "event";
}

export type NotificationValueDefinition = (
	| NotificationStateDefinition
	| NotificationEventDefinition) & {
	version: number;
	description?: string;
	label: string;
};

const hexKeyRegex = /^0x[a-zA-Z0-9]+$/;

let notifications: ReadonlyMap<number, Notification> | undefined;
async function loadNotifications(): Promise<ReadonlyMap<number, Notification>> {
	const fileContents = await readFile(
		path.join(configDir, "notifications.json"),
		"utf8",
	);
	const definition = JSON5.parse(fileContents);
	if (!isObject(definition)) throw throwInvalidConfig();

	const ret = new Map();
	for (const [id, ntfcnDefinition] of entries(definition)) {
		if (!hexKeyRegex.test(id)) throw throwInvalidConfig();
		const idNum = parseInt(id.slice(2), 16);
		ret.set(idNum, new Notification(idNum, ntfcnDefinition));
	}
	return ret;
}

export async function lookupNotification(
	notificationType: number,
): Promise<Notification | undefined> {
	if (!notifications) notifications = await loadNotifications();
	return notifications.get(notificationType);
}

function throwInvalidConfig(): never {
	throw new ZWaveError(
		"The notifications configuration is invalid!",
		ZWaveErrorCodes.Argument_Invalid,
	);
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
				if (!hexKeyRegex.test(eventId)) throw throwInvalidConfig();
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
				label: state.label,
				description: state.description,
				version: state.version,
				variableName: variable.name,
			};
		}
	}
}

export class NotificationVariable {
	public constructor(definition: JSONObject) {
		this.name = definition.name;
		if (!isObject(definition.states)) throw throwInvalidConfig();
		const states = new Map<number, NotificationState>();
		for (const [stateId, stateDefinition] of entries(definition.states)) {
			if (!hexKeyRegex.test(stateId)) throw throwInvalidConfig();
			const stateIdNum = parseInt(stateId.slice(2), 16);
			states.set(
				stateIdNum,
				new NotificationState(stateIdNum, stateDefinition),
			);
		}
		this.states = states;
	}

	public readonly name: string;
	public readonly states: ReadonlyMap<number, NotificationState>;
}

export class NotificationState {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.label = definition.label;
		this.description = definition.description;
		this.version = definition.version;
	}
	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly version: number;
}

export class NotificationEvent {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.label = definition.label;
		this.description = definition.description;
		this.version = definition.version;
	}
	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly version: number;
}
