import { isZWaveError, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import {
	configDir,
	externalConfigDir,
	hexKeyRegexNDigits,
	throwInvalidConfig,
} from "./utils";

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
	parameter?: NotificationParameter;
};

export type NotificationMap = ReadonlyMap<number, Notification>;

/** @internal */
export async function loadNotificationsInternal(
	externalConfig?: boolean,
): Promise<NotificationMap> {
	const configPath = path.join(
		(externalConfig && externalConfigDir) || configDir,
		"notifications.json",
	);

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

		const notifications = new Map();
		for (const [id, ntfcnDefinition] of entries(definition)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"notifications",
					`found non-hex key "${id}" at the root`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			notifications.set(
				idNum,
				new Notification(idNum, ntfcnDefinition as JSONObject),
			);
		}
		return notifications;
	} catch (e: unknown) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("notifications");
		}
	}
}

export class Notification {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.name = definition.name;
		this.variables = isArray(definition.variables)
			? definition.variables.map((v: any) => new NotificationVariable(v))
			: [];
		const events = new Map<number, NotificationEvent>();
		if (isObject(definition.events)) {
			for (const [eventId, eventDefinition] of entries(
				definition.events,
			)) {
				if (!hexKeyRegexNDigits.test(eventId)) {
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
		const variable = this.variables.find((v) => v.states.has(value));
		if (variable) {
			const state = variable.states.get(value)!;
			return {
				type: "state",
				value,
				idle: variable.idle,
				label: state.label,
				description: state.description,
				variableName: variable.name,
				parameter: state.parameter,
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
			if (!hexKeyRegexNDigits.test(stateId)) {
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

		if (definition.params != undefined) {
			if (!isObject(definition.params)) {
				throwInvalidConfig(
					"notifications",
					`The parameter definition of notification state ${num2hex(
						id,
					)} must be an object`,
				);
			} else if (typeof definition.params.type !== "string") {
				throwInvalidConfig(
					"notifications",
					`The parameter type of notification state ${num2hex(
						id,
					)} must be a string`,
				);
			}
			this.parameter = new NotificationParameter(definition.params);
		}
	}

	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly parameter?: NotificationParameter;
}

export class NotificationEvent {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.label = definition.label;
		this.description = definition.description;

		if (definition.params != undefined) {
			if (!isObject(definition.params)) {
				throwInvalidConfig(
					"notifications",
					`The parameter definition of notification event ${num2hex(
						id,
					)} must be an object`,
				);
			} else if (typeof definition.params.type !== "string") {
				throwInvalidConfig(
					"notifications",
					`The parameter type of notification event ${num2hex(
						id,
					)} must be a string`,
				);
			}
			this.parameter = new NotificationParameter(definition.params);
		}
	}
	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly parameter?: NotificationParameter;
}

export class NotificationParameter {
	public constructor(definition: JSONObject) {
		// Allow subclassing
		if (new.target !== NotificationParameter) return;

		// Return the correct subclass
		switch (definition.type) {
			case "duration":
				return new NotificationParameterWithDuration(definition);
			case "commandclass":
				return new NotificationParameterWithCommandClass(definition);
			case "value":
				return new NotificationParameterWithValue(definition);
			case "enum":
				// TODO
				break;
		}
	}
}

/** Marks a notification that contains a duration */
export class NotificationParameterWithDuration {
	public constructor(_definition: JSONObject) {
		// nothing to do
	}
}

/** Marks a notification that contains a CC */
export class NotificationParameterWithCommandClass {
	public constructor(_definition: JSONObject) {
		// nothing to do
	}
}

export class NotificationParameterWithValue {
	public constructor(definition: JSONObject) {
		if (typeof definition.name !== "string") {
			throwInvalidConfig(
				"notifications",
				`Missing property name definition for Notification parameter with type: "value"!`,
			);
		}
		this.propertyName = definition.name;
	}
	public readonly propertyName: string;
}
