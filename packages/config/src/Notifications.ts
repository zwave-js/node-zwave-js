import { num2hex, type JSONObject } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { hexKeyRegexNDigits, throwInvalidConfig } from "./utils_safe";

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
	idleVariables?: number[];
};

export type NotificationMap = ReadonlyMap<number, Notification>;

export class Notification {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.name = definition.name;
		this.variables = isArray(definition.variables)
			? definition.variables.map((v: any) => new NotificationVariable(v))
			: [];
		const events = new Map<number, NotificationEvent>();
		if (isObject(definition.events)) {
			for (const [eventId, eventDefinition] of Object.entries(
				definition.events,
			)) {
				if (!hexKeyRegexNDigits.test(eventId)) {
					throwInvalidConfig(
						"notifications",
						`found invalid key "${eventId}" in notification ${num2hex(
							id,
						)}. Notification events must have lowercase hexadecimal IDs.`,
					);
				}
				const eventIdNum = parseInt(eventId.slice(2), 16);
				events.set(
					eventIdNum,
					new NotificationEvent(eventIdNum, eventDefinition as any),
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
		for (const [stateId, stateDefinition] of Object.entries(
			definition.states,
		)) {
			if (!hexKeyRegexNDigits.test(stateId)) {
				throwInvalidConfig(
					"notifications",
					`found invalid key "${stateId}" in notification variable ${this.name}. Notification states must have lowercase hexadecimal IDs.`,
				);
			}
			const stateIdNum = parseInt(stateId.slice(2), 16);
			states.set(
				stateIdNum,
				new NotificationState(stateIdNum, stateDefinition as any),
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

		if (definition.idleVariables != undefined) {
			if (
				!isArray(definition.idleVariables) ||
				!definition.idleVariables.every(
					(n: any) =>
						typeof n === "number" ||
						(typeof n === "string" && hexKeyRegexNDigits.test(n)),
				)
			) {
				throwInvalidConfig(
					"notifications",
					`The idleVariables definition of notification event ${num2hex(
						id,
					)} must be an array of numbers (may be hexadecimal)`,
				);
			}
			this.idleVariables = definition.idleVariables.map(
				(n: string | number) =>
					typeof n === "string" ? parseInt(n, 16) : n,
			);
		}
	}
	public readonly id: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly parameter?: NotificationParameter;
	public readonly idleVariables?: number[];
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
				return new NotificationParameterWithEnum(definition);
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

/** Marks a notification that contains a named value */
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

/** Marks a notification that contains an enumeration of values */
export class NotificationParameterWithEnum {
	public constructor(definition: JSONObject) {
		if (!isObject(definition.values)) {
			throwInvalidConfig(
				"notifications",
				`Found a non-object definition for enum values`,
			);
		}

		const values = new Map<number, string>();
		for (const [enumValue, enumLabel] of Object.entries(
			definition.values,
		)) {
			if (!hexKeyRegexNDigits.test(enumValue)) {
				throwInvalidConfig(
					"notifications",
					`found invalid enum value "${enumValue}". All enum values must be defined in hexadecimal.`,
				);
			} else if (typeof enumLabel !== "string") {
				throwInvalidConfig(
					"notifications",
					`found invalid label for enum value "${enumValue}". All enum labels must be defined as strings.`,
				);
			}

			values.set(parseInt(enumValue, 16), enumLabel);
		}

		this.values = values;
	}

	public readonly values: ReadonlyMap<number, string>;
}
