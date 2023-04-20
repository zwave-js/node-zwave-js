import { JSONObject } from "@zwave-js/shared/safe";
interface NotificationStateDefinition {
    type: "state";
    variableName: string;
    value: number;
    idle: boolean;
}
interface NotificationEventDefinition {
    type: "event";
}
export type NotificationValueDefinition = (NotificationStateDefinition | NotificationEventDefinition) & {
    description?: string;
    label: string;
    parameter?: NotificationParameter;
};
export type NotificationMap = ReadonlyMap<number, Notification>;
export declare class Notification {
    constructor(id: number, definition: JSONObject);
    readonly id: number;
    readonly name: string;
    readonly variables: readonly NotificationVariable[];
    readonly events: ReadonlyMap<number, NotificationEvent>;
    lookupValue(value: number): NotificationValueDefinition | undefined;
}
export declare class NotificationVariable {
    constructor(definition: JSONObject);
    readonly name: string;
    /** Whether the variable may be reset to idle */
    readonly idle: boolean;
    readonly states: ReadonlyMap<number, NotificationState>;
}
export declare class NotificationState {
    constructor(id: number, definition: JSONObject);
    readonly id: number;
    readonly label: string;
    readonly description?: string;
    readonly parameter?: NotificationParameter;
}
export declare class NotificationEvent {
    constructor(id: number, definition: JSONObject);
    readonly id: number;
    readonly label: string;
    readonly description?: string;
    readonly parameter?: NotificationParameter;
}
export declare class NotificationParameter {
    constructor(definition: JSONObject);
}
/** Marks a notification that contains a duration */
export declare class NotificationParameterWithDuration {
    constructor(_definition: JSONObject);
}
/** Marks a notification that contains a CC */
export declare class NotificationParameterWithCommandClass {
    constructor(_definition: JSONObject);
}
/** Marks a notification that contains a named value */
export declare class NotificationParameterWithValue {
    constructor(definition: JSONObject);
    readonly propertyName: string;
}
/** Marks a notification that contains an enumeration of values */
export declare class NotificationParameterWithEnum {
    constructor(definition: JSONObject);
    readonly values: ReadonlyMap<number, string>;
}
export {};
//# sourceMappingURL=Notifications.d.ts.map