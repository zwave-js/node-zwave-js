import { ObjectKeyMap } from "@zwave-js/shared/safe";
import type { DeviceID } from "./shared";
/** A conditional config item */
export interface ConditionalItem<T> {
    readonly condition?: string;
    evaluateCondition(deviceId?: DeviceID): T | undefined;
}
export declare function isConditionalItem<T>(val: any): val is ConditionalItem<T>;
/** Checks if a given condition applies for the given device ID */
export declare function conditionApplies<T>(self: ConditionalItem<T>, deviceId: DeviceID | undefined): boolean;
export declare function validateCondition(filename: string, definition: Record<string, any>, errorPrefix: string): void;
export type EvaluateDeepReturnType<T extends ConditionalItem<unknown> | ConditionalItem<unknown>[] | ObjectKeyMap<any, ConditionalItem<unknown> | ConditionalItem<unknown>[]> | ReadonlyMap<any, ConditionalItem<unknown> | ConditionalItem<unknown>[]> | Map<any, ConditionalItem<unknown> | ConditionalItem<unknown>[]> | unknown[] | unknown, PreserveArray extends boolean = false> = T extends undefined ? undefined : T extends ConditionalItem<infer R>[] ? [PreserveArray] extends [true] ? R[] : R : T extends ConditionalItem<infer R> ? R : T extends ObjectKeyMap<infer K, infer V> ? ObjectKeyMap<K, EvaluateDeepReturnType<V, false>> : T extends ReadonlyMap<infer K, infer V> ? Map<K, EvaluateDeepReturnType<V, false>> : T extends Map<infer K, infer V> ? Map<K, EvaluateDeepReturnType<V, false>> : T extends unknown[] ? [PreserveArray] extends [true] ? T : T[number] : T;
export declare function evaluateDeep<T extends ConditionalItem<unknown> | ConditionalItem<unknown>[] | Map<any, ConditionalItem<unknown>> | Map<any, ConditionalItem<unknown>[]> | Map<any, ConditionalItem<unknown>> | Map<any, ConditionalItem<unknown>[]> | ObjectKeyMap<any, ConditionalItem<unknown>> | ObjectKeyMap<any, ConditionalItem<unknown>[]> | unknown[] | unknown, PA extends boolean>(obj: T, deviceId?: DeviceID, preserveArray?: PA): EvaluateDeepReturnType<T, PA>;
//# sourceMappingURL=ConditionalItem.d.ts.map