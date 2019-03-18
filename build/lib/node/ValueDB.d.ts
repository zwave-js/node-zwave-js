/// <reference types="node" />
import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClass";
export interface ValueBaseArgs {
    commandClass: CommandClasses;
    endpoint?: number;
    propertyName: string;
}
export interface ValueUpdatedArgs extends ValueBaseArgs {
    prevValue: unknown;
    newValue: unknown;
}
export interface ValueAddedArgs extends ValueBaseArgs {
    newValue: unknown;
}
export interface ValueRemovedArgs extends ValueBaseArgs {
    prevValue: unknown;
}
export declare type ValueAddedCallback = (args: ValueAddedArgs) => void;
export declare type ValueUpdatedCallback = (args: ValueUpdatedArgs) => void;
export declare type ValueRemovedCallback = (args: ValueRemovedArgs) => void;
export interface ValueDBEventCallbacks {
    "value added": ValueAddedCallback;
    "value updated": ValueUpdatedCallback;
    "value removed": ValueRemovedCallback;
}
export declare type ValueDBEvents = Extract<keyof ValueDBEventCallbacks, string>;
export interface ValueDB {
    on<TEvent extends ValueDBEvents>(event: TEvent, callback: ValueDBEventCallbacks[TEvent]): this;
    removeListener<TEvent extends ValueDBEvents>(event: TEvent, callback: ValueDBEventCallbacks[TEvent]): this;
    removeAllListeners(event?: ValueDBEvents): this;
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
     * Removes a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     */
    removeValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string): boolean;
    /**
     * Retrieves a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     */
    getValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string): unknown;
    /** Clears all values from the value DB */
    clear(): void;
}
