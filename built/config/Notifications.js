"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationParameterWithEnum = exports.NotificationParameterWithValue = exports.NotificationParameterWithCommandClass = exports.NotificationParameterWithDuration = exports.NotificationParameter = exports.NotificationEvent = exports.NotificationState = exports.NotificationVariable = exports.Notification = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("./utils_safe");
class Notification {
    constructor(id, definition) {
        this.id = id;
        this.name = definition.name;
        this.variables = (0, typeguards_1.isArray)(definition.variables)
            ? definition.variables.map((v) => new NotificationVariable(v))
            : [];
        const events = new Map();
        if ((0, typeguards_1.isObject)(definition.events)) {
            for (const [eventId, eventDefinition] of Object.entries(definition.events)) {
                if (!utils_safe_1.hexKeyRegexNDigits.test(eventId)) {
                    (0, utils_safe_1.throwInvalidConfig)("notifications", `found invalid key "${eventId}" in notification ${(0, safe_1.num2hex)(id)}. Notification events must have lowercase hexadecimal IDs.`);
                }
                const eventIdNum = parseInt(eventId.slice(2), 16);
                events.set(eventIdNum, new NotificationEvent(eventIdNum, eventDefinition));
            }
        }
        this.events = events;
    }
    lookupValue(value) {
        // Events are easier to look up, do that first
        if (this.events.has(value)) {
            const { id, ...event } = this.events.get(value);
            return {
                type: "event",
                ...event,
            };
        }
        // Then try to find a variable with a matching state
        const variable = this.variables.find((v) => v.states.has(value));
        if (variable) {
            const state = variable.states.get(value);
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
exports.Notification = Notification;
class NotificationVariable {
    constructor(definition) {
        this.name = definition.name;
        // By default all notification variables may return to idle
        // Otherwise it must be specified explicitly using `idle: false`
        this.idle = definition.idle !== false;
        if (!(0, typeguards_1.isObject)(definition.states)) {
            (0, utils_safe_1.throwInvalidConfig)("notifications", `the variable definition for ${this.name} is not an object`);
        }
        const states = new Map();
        for (const [stateId, stateDefinition] of Object.entries(definition.states)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(stateId)) {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `found invalid key "${stateId}" in notification variable ${this.name}. Notification states must have lowercase hexadecimal IDs.`);
            }
            const stateIdNum = parseInt(stateId.slice(2), 16);
            states.set(stateIdNum, new NotificationState(stateIdNum, stateDefinition));
        }
        this.states = states;
    }
}
exports.NotificationVariable = NotificationVariable;
class NotificationState {
    constructor(id, definition) {
        this.id = id;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("notifications", `The label of notification state ${(0, safe_1.num2hex)(id)} has a non-string label`);
        }
        this.label = definition.label;
        if (definition.description != undefined &&
            typeof definition.description !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("notifications", `The label of notification state ${(0, safe_1.num2hex)(id)} has a non-string description`);
        }
        this.description = definition.description;
        if (definition.params != undefined) {
            if (!(0, typeguards_1.isObject)(definition.params)) {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `The parameter definition of notification state ${(0, safe_1.num2hex)(id)} must be an object`);
            }
            else if (typeof definition.params.type !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `The parameter type of notification state ${(0, safe_1.num2hex)(id)} must be a string`);
            }
            this.parameter = new NotificationParameter(definition.params);
        }
    }
}
exports.NotificationState = NotificationState;
class NotificationEvent {
    constructor(id, definition) {
        this.id = id;
        this.label = definition.label;
        this.description = definition.description;
        if (definition.params != undefined) {
            if (!(0, typeguards_1.isObject)(definition.params)) {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `The parameter definition of notification event ${(0, safe_1.num2hex)(id)} must be an object`);
            }
            else if (typeof definition.params.type !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `The parameter type of notification event ${(0, safe_1.num2hex)(id)} must be a string`);
            }
            this.parameter = new NotificationParameter(definition.params);
        }
    }
}
exports.NotificationEvent = NotificationEvent;
class NotificationParameter {
    constructor(definition) {
        // Allow subclassing
        if (new.target !== NotificationParameter)
            return;
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
exports.NotificationParameter = NotificationParameter;
/** Marks a notification that contains a duration */
class NotificationParameterWithDuration {
    constructor(_definition) {
        // nothing to do
    }
}
exports.NotificationParameterWithDuration = NotificationParameterWithDuration;
/** Marks a notification that contains a CC */
class NotificationParameterWithCommandClass {
    constructor(_definition) {
        // nothing to do
    }
}
exports.NotificationParameterWithCommandClass = NotificationParameterWithCommandClass;
/** Marks a notification that contains a named value */
class NotificationParameterWithValue {
    constructor(definition) {
        if (typeof definition.name !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("notifications", `Missing property name definition for Notification parameter with type: "value"!`);
        }
        this.propertyName = definition.name;
    }
}
exports.NotificationParameterWithValue = NotificationParameterWithValue;
/** Marks a notification that contains an enumeration of values */
class NotificationParameterWithEnum {
    constructor(definition) {
        if (!(0, typeguards_1.isObject)(definition.values)) {
            (0, utils_safe_1.throwInvalidConfig)("notifications", `Found a non-object definition for enum values`);
        }
        const values = new Map();
        for (const [enumValue, enumLabel] of Object.entries(definition.values)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(enumValue)) {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `found invalid enum value "${enumValue}". All enum values must be defined in hexadecimal.`);
            }
            else if (typeof enumLabel !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `found invalid label for enum value "${enumValue}". All enum labels must be defined as strings.`);
            }
            values.set(parseInt(enumValue, 16), enumLabel);
        }
        this.values = values;
    }
}
exports.NotificationParameterWithEnum = NotificationParameterWithEnum;
//# sourceMappingURL=Notifications.js.map