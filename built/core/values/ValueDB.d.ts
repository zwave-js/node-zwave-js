import type { JsonlDB } from "@alcalzone/jsonl-db";
import { TypedEventEmitter } from "@zwave-js/shared";
import type { CommandClasses } from "../capabilities/CommandClasses";
import type { ValueMetadata } from "../values/Metadata";
import type { MetadataUpdatedArgs, SetValueOptions, ValueAddedArgs, ValueID, ValueNotificationArgs, ValueRemovedArgs, ValueUpdatedArgs } from "./_Types";
type ValueAddedCallback = (args: ValueAddedArgs) => void;
type ValueUpdatedCallback = (args: ValueUpdatedArgs) => void;
type ValueRemovedCallback = (args: ValueRemovedArgs) => void;
type ValueNotificationCallback = (args: ValueNotificationArgs) => void;
type MetadataUpdatedCallback = (args: MetadataUpdatedArgs) => void;
interface ValueDBEventCallbacks {
    "value added": ValueAddedCallback;
    "value updated": ValueUpdatedCallback;
    "value removed": ValueRemovedCallback;
    "value notification": ValueNotificationCallback;
    "metadata updated": MetadataUpdatedCallback;
}
export declare function isValueID(param: Record<any, any>): param is ValueID;
export declare function assertValueID(param: Record<any, any>): asserts param is ValueID;
/**
 * Ensures all Value ID properties are in the same order and there are no extraneous properties.
 * A normalized value ID can be used as a database key */
export declare function normalizeValueID(valueID: ValueID): ValueID;
export declare function valueIdToString(valueID: ValueID): string;
/**
 * The value store for a single node
 */
export declare class ValueDB extends TypedEventEmitter<ValueDBEventCallbacks> {
    /**
     * @param nodeId The ID of the node this Value DB belongs to
     * @param valueDB The DB instance which stores values
     * @param metadataDB The DB instance which stores metadata
     * @param ownKeys An optional pre-created index of this ValueDB's own keys
     */
    constructor(nodeId: number, valueDB: JsonlDB, metadataDB: JsonlDB<ValueMetadata>, ownKeys?: Set<string>);
    private nodeId;
    private _db;
    private _metadata;
    private _index;
    private buildIndex;
    private valueIdToDBKey;
    private dbKeyToValueId;
    /**
     * Stores a value for a given value id
     */
    setValue(valueId: ValueID, value: unknown, options?: SetValueOptions): void;
    /**
     * Removes a value for a given value id
     */
    removeValue(valueId: ValueID, options?: SetValueOptions): boolean;
    /**
     * Retrieves a value for a given value id
     */
    getValue<T = unknown>(valueId: ValueID): T | undefined;
    /**
     * Checks if a value for a given value id exists in this ValueDB
     */
    hasValue(valueId: ValueID): boolean;
    /** Returns all values whose id matches the given predicate */
    findValues(predicate: (id: ValueID) => boolean): (ValueID & {
        value: unknown;
    })[];
    /** Returns all values that are stored for a given CC */
    getValues(forCC: CommandClasses): (ValueID & {
        value: unknown;
    })[];
    /**
     * Returns when the given value id was last updated
     */
    getTimestamp(valueId: ValueID): number | undefined;
    /** Clears all values from the value DB */
    clear(options?: SetValueOptions): void;
    /**
     * Stores metadata for a given value id
     */
    setMetadata(valueId: ValueID, metadata: ValueMetadata | undefined, options?: SetValueOptions): void;
    /**
     * Checks if metadata for a given value id exists in this ValueDB
     */
    hasMetadata(valueId: ValueID): boolean;
    /**
     * Retrieves metadata for a given value id
     */
    getMetadata(valueId: ValueID): ValueMetadata | undefined;
    /** Returns all metadata that is stored for a given CC */
    getAllMetadata(forCC: CommandClasses): (ValueID & {
        metadata: ValueMetadata;
    })[];
    /** Returns all values whose id matches the given predicate */
    findMetadata(predicate: (id: ValueID) => boolean): (ValueID & {
        metadata: ValueMetadata;
    })[];
}
/**
 * Really dumb but very fast way to parse one-lined JSON strings of the following schema
 * {
 *     nodeId: number,
 *     commandClass: number,
 *     endpoint: number,
 *     property: string | number,
 *     propertyKey: string | number,
 * }
 *
 * In benchmarks this was about 58% faster than JSON.parse
 */
export declare function dbKeyToValueIdFast(key: string): {
    nodeId: number;
} & ValueID;
/** Extracts an index for each node from one or more JSONL DBs */
export declare function indexDBsByNode(databases: JsonlDB[]): Map<number, Set<string>>;
export {};
//# sourceMappingURL=ValueDB.d.ts.map