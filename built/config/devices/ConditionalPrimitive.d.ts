import { type ConditionalItem } from "./ConditionalItem";
import type { DeviceID } from "./shared";
type ToPrimitive<T extends string> = T extends "string" ? string : T extends "number" ? number : T extends "boolean" ? boolean : never;
export declare function parseConditionalPrimitive<T extends "string" | "number" | "boolean">(filename: string, valueType: T, propertyName: string, definition: any, errorMessagePrefix?: string): ConditionalPrimitive<ToPrimitive<T>>;
export type ConditionalPrimitive<T extends number | string | boolean> = T | ConditionalPrimitiveVariant<T>[];
export declare class ConditionalPrimitiveVariant<T extends number | string | boolean> implements ConditionalItem<T> {
    readonly value: T;
    readonly condition?: string | undefined;
    constructor(value: T, condition?: string | undefined);
    evaluateCondition(deviceId?: DeviceID): T | undefined;
}
export {};
//# sourceMappingURL=ConditionalPrimitive.d.ts.map