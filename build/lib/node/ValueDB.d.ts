/// <reference types="node" />
import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClass";
export interface ValueUpdatedArgs {
    commandClass: CommandClasses;
    endpoint?: number;
    propertyName: string;
    prevValue: unknown;
    newValue: unknown;
}
export interface ValueDB {
    on(event: "value updated", cb: (args: ValueUpdatedArgs) => void): this;
    removeListener(event: "value updated", cb: (args: ValueUpdatedArgs) => void): this;
    removeAllListeners(event?: "value updated"): this;
}
export declare class ValueDB extends EventEmitter {
    private _db;
    /**
     * Stores a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     * @param value The value to set
     */
    setValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string, value: unknown): void;
    /**
     * Retrieves a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     */
    getValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string): unknown;
}
