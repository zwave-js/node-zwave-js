import type { JsonlDB } from "@alcalzone/jsonl-db";
import { EventEmitter } from "events";
import { CommandClasses } from "../capabilities/CommandClasses";
import { isZWaveError, ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import type { ValueMetadata } from "../values/Metadata";

/** Uniquely identifies to which CC, endpoint and property a value belongs to */
export interface ValueID {
	commandClass: CommandClasses;
	endpoint?: number;
	property: string | number;
	propertyKey?: string | number;
}

export interface TranslatedValueID extends ValueID {
	commandClassName: string;
	propertyName?: string;
	propertyKeyName?: string;
}

export interface ValueUpdatedArgs extends ValueID {
	prevValue: unknown;
	newValue: unknown;
}

export interface ValueAddedArgs extends ValueID {
	newValue: unknown;
}

export interface ValueRemovedArgs extends ValueID {
	prevValue: unknown;
}

export interface ValueNotificationArgs extends ValueID {
	value: unknown;
}

export interface MetadataUpdatedArgs extends ValueID {
	metadata: ValueMetadata | undefined;
}

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

type ValueDBEvents = Extract<keyof ValueDBEventCallbacks, string>;

export function isValueID(param: Record<any, any>): param is ValueID {
	// commandClass is mandatory and must be numeric
	if (typeof param.commandClass !== "number") return false;
	// property is mandatory and must be a number or string
	if (
		typeof param.property !== "number" &&
		typeof param.property !== "string"
	) {
		return false;
	}
	// propertyKey is optional and must be a number or string
	if (
		param.propertyKey != undefined &&
		typeof param.propertyKey !== "number" &&
		typeof param.propertyKey !== "string"
	) {
		return false;
	}
	// endpoint is optional and must be a number
	if (param.endpoint != undefined && typeof param.endpoint !== "number") {
		return false;
	}
	return true;
}

export function assertValueID(
	param: Record<any, any>,
): asserts param is ValueID {
	if (!isValueID(param)) {
		throw new ZWaveError(
			`Invalid ValueID passed!`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}
}

export interface ValueDB {
	on<TEvent extends ValueDBEvents>(
		event: TEvent,
		callback: ValueDBEventCallbacks[TEvent],
	): this;
	once<TEvent extends ValueDBEvents>(
		event: TEvent,
		callback: ValueDBEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends ValueDBEvents>(
		event: TEvent,
		callback: ValueDBEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: ValueDBEvents): this;

	emit<TEvent extends ValueDBEvents>(
		event: TEvent,
		...args: Parameters<ValueDBEventCallbacks[TEvent]>
	): boolean;
}

/**
 * Ensures all Value ID properties are in the same order and there are no extraneous properties.
 * A normalized value ID can be used as a database key */
export function normalizeValueID(valueID: ValueID): ValueID {
	// valueIdToString is used by all other methods of the Value DB.
	// Since those may be called by unsanitized value IDs, we need
	// to make sure we have a valid value ID at our hands
	assertValueID(valueID);
	const { commandClass, endpoint, property, propertyKey } = valueID;

	const jsonKey: ValueID = {
		commandClass,
		endpoint: endpoint ?? 0,
		property,
	};
	if (propertyKey != undefined) jsonKey.propertyKey = propertyKey;
	return jsonKey;
}

export function valueIdToString(valueID: ValueID): string {
	return JSON.stringify(normalizeValueID(valueID));
}

export interface SetValueOptions {
	/** When this is true, no event will be emitted for the value change */
	noEvent?: boolean;
	/** When this is true,  */
	noThrow?: boolean;
	/**
	 * When this is `false`, the value will not be stored and a `value notification` event will be emitted instead (implies `noEvent: false`).
	 */
	stateful?: boolean;
}

/**
 * The value store for a single node
 */
export class ValueDB extends EventEmitter {
	// This is a wrapper around the driver's on-disk value and metadata key value stores

	/**
	 * @param nodeId The ID of the node this Value DB belongs to
	 * @param valueDB The DB instance which stores values
	 * @param metadataDB The DB instance which stores metadata
	 * @param ownKeys An optional pre-created index of this ValueDB's own keys
	 */
	public constructor(
		nodeId: number,
		valueDB: JsonlDB,
		metadataDB: JsonlDB<ValueMetadata>,
		ownKeys?: Set<string>,
	) {
		super();
		this.nodeId = nodeId;
		this._db = valueDB;
		this._metadata = metadataDB;

		this._index = ownKeys ?? this.buildIndex();
	}

	private nodeId: number;
	private _db: JsonlDB<unknown>;
	private _metadata: JsonlDB<ValueMetadata>;
	private _index: Set<string>;

	private buildIndex(): Set<string> {
		const ret = new Set<string>();
		for (const key of this._db.keys()) {
			if (compareDBKeyFast(key, this.nodeId)) ret.add(key);
		}
		for (const key of this._metadata.keys()) {
			if (!ret.has(key) && compareDBKeyFast(key, this.nodeId))
				ret.add(key);
		}
		return ret;
	}

	private valueIdToDBKey(valueID: ValueID): string {
		return JSON.stringify({
			nodeId: this.nodeId,
			...normalizeValueID(valueID),
		});
	}

	private dbKeyToValueId(key: string): { nodeId: number } & ValueID {
		try {
			// Try the dumb but fast way first
			return dbKeyToValueIdFast(key);
		} catch {
			// Fall back to JSON.parse if anything went wrong
			return JSON.parse(key);
		}
	}

	/**
	 * Stores a value for a given value id
	 */
	public setValue(
		valueId: ValueID,
		value: unknown,
		options: SetValueOptions = {},
	): void {
		let dbKey: string;
		try {
			dbKey = this.valueIdToDBKey(valueId);
		} catch (e) {
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Argument_Invalid &&
				options.noThrow === true
			) {
				// ignore invalid value IDs
				return;
			}
			throw e;
		}

		if (options.stateful !== false) {
			const cbArg: ValueAddedArgs | ValueUpdatedArgs = {
				...valueId,
				newValue: value,
			};
			let event: ValueDBEvents;
			if (this._db.has(dbKey)) {
				event = "value updated";
				(cbArg as ValueUpdatedArgs).prevValue = this._db.get(dbKey);
			} else {
				event = "value added";
			}

			this._index.add(dbKey);
			this._db.set(dbKey, value);
			if (
				valueId.commandClass !== CommandClasses._NONE &&
				options.noEvent !== true
			) {
				this.emit(event, cbArg);
			}
		} else if (valueId.commandClass !== CommandClasses._NONE) {
			// For non-stateful values just emit a notification
			this.emit("value notification", {
				...valueId,
				value,
			});
		}
	}

	/**
	 * Removes a value for a given value id
	 */
	public removeValue(
		valueId: ValueID,
		options: SetValueOptions = {},
	): boolean {
		const dbKey: string = this.valueIdToDBKey(valueId);
		if (!this._metadata.has(dbKey)) {
			this._index.delete(dbKey);
		}
		if (this._db.has(dbKey)) {
			const prevValue = this._db.get(dbKey);
			this._db.delete(dbKey);

			if (
				valueId.commandClass !== CommandClasses._NONE &&
				options.noEvent !== true
			) {
				const cbArg: ValueRemovedArgs = {
					...valueId,
					prevValue,
				};
				this.emit("value removed", cbArg);
			}
			return true;
		}
		return false;
	}

	/**
	 * Retrieves a value for a given value id
	 */
	/* wotan-disable-next-line no-misused-generics */
	public getValue<T = unknown>(valueId: ValueID): T | undefined {
		const key = this.valueIdToDBKey(valueId);
		return this._db.get(key) as T | undefined;
	}

	/**
	 * Checks if a value for a given value id exists in this ValueDB
	 */
	public hasValue(valueId: ValueID): boolean {
		const key = this.valueIdToDBKey(valueId);
		return this._db.has(key);
	}

	/** Returns all values whose id matches the given predicate */
	public findValues(
		predicate: (id: ValueID) => boolean,
	): (ValueID & { value: unknown })[] {
		const ret: ReturnType<ValueDB["findValues"]> = [];
		for (const key of this._index) {
			if (!this._db.has(key)) continue;
			const { nodeId, ...valueId } = this.dbKeyToValueId(key);

			if (predicate(valueId)) {
				ret.push({ ...valueId, value: this._db.get(key) });
			}
		}
		return ret;
	}

	/** Returns all values that are stored for a given CC */
	public getValues(forCC: CommandClasses): (ValueID & { value: unknown })[] {
		const ret: ReturnType<ValueDB["getValues"]> = [];
		for (const key of this._index) {
			if (
				compareDBKeyFast(key, this.nodeId, { commandClass: forCC }) &&
				this._db.has(key)
			) {
				const { nodeId, ...valueId } = this.dbKeyToValueId(key);
				const value = this._db.get(key);
				ret.push({ ...valueId, value });
			}
		}
		return ret;
	}

	/** Clears all values from the value DB */
	public clear(options: SetValueOptions = {}): void {
		for (const key of this._index) {
			const { nodeId, ...valueId } = this.dbKeyToValueId(key);
			if (this._db.has(key)) {
				const prevValue = this._db.get(key);
				this._db.delete(key);

				if (
					valueId.commandClass !== CommandClasses._NONE &&
					options.noEvent !== true
				) {
					const cbArg: ValueRemovedArgs = {
						...valueId,
						prevValue,
					};
					this.emit("value removed", cbArg);
				}
			}
			if (this._metadata.has(key)) {
				this._metadata.delete(key);

				if (
					valueId.commandClass !== CommandClasses._NONE &&
					options.noEvent !== true
				) {
					const cbArg: MetadataUpdatedArgs = {
						...valueId,
						metadata: undefined,
					};
					this.emit("metadata updated", cbArg);
				}
			}
		}
		this._index.clear();
	}

	/**
	 * Stores metadata for a given value id
	 */
	public setMetadata(
		valueId: ValueID,
		metadata: ValueMetadata | undefined,
		options: SetValueOptions = {},
	): void {
		let dbKey: string;
		try {
			dbKey = this.valueIdToDBKey(valueId);
		} catch (e) {
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.Argument_Invalid &&
				options.noThrow === true
			) {
				// ignore invalid value IDs
				return;
			}
			throw e;
		}

		if (metadata) {
			this._index.add(dbKey);
			this._metadata.set(dbKey, metadata);
		} else {
			if (!this._db.has(dbKey)) {
				this._index.delete(dbKey);
			}
			this._metadata.delete(dbKey);
		}

		const cbArg: MetadataUpdatedArgs = {
			...valueId,
			metadata,
		};
		if (
			valueId.commandClass !== CommandClasses._NONE &&
			options.noEvent !== true
		) {
			this.emit("metadata updated", cbArg);
		}
	}

	/**
	 * Checks if metadata for a given value id exists in this ValueDB
	 */
	public hasMetadata(valueId: ValueID): boolean {
		const key = this.valueIdToDBKey(valueId);
		return this._metadata.has(key);
	}

	/**
	 * Retrieves metadata for a given value id
	 */
	public getMetadata(valueId: ValueID): ValueMetadata | undefined {
		const key = this.valueIdToDBKey(valueId);
		return this._metadata.get(key);
	}

	/** Returns all metadata that is stored for a given CC */
	public getAllMetadata(
		forCC: CommandClasses,
	): (ValueID & {
		metadata: ValueMetadata;
	})[] {
		const ret: ReturnType<ValueDB["getAllMetadata"]> = [];
		for (const key of this._index) {
			if (
				compareDBKeyFast(key, this.nodeId, { commandClass: forCC }) &&
				this._metadata.has(key)
			) {
				const { nodeId, ...valueId } = this.dbKeyToValueId(key);
				const metadata = this._metadata.get(key)!;
				ret.push({ ...valueId, metadata });
			}
		}
		return ret;
	}

	/** Returns all values whose id matches the given predicate */
	public findMetadata(
		predicate: (id: ValueID) => boolean,
	): (ValueID & {
		metadata: ValueMetadata;
	})[] {
		const ret: ReturnType<ValueDB["findMetadata"]> = [];
		for (const key of this._index) {
			if (!this._metadata.has(key)) continue;
			const { nodeId, ...valueId } = this.dbKeyToValueId(key);

			if (predicate(valueId)) {
				ret.push({ ...valueId, metadata: this._metadata.get(key)! });
			}
		}
		return ret;
	}
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
export function dbKeyToValueIdFast(key: string): { nodeId: number } & ValueID {
	let start = 10; // {"nodeId":
	if (key.charCodeAt(start - 1) !== 58) {
		console.error(key.slice(start - 1));
		throw new Error("Invalid input format!");
	}
	let end = start + 1;
	const len = key.length;

	while (end < len && key.charCodeAt(end) !== 44) end++;
	const nodeId = parseInt(key.slice(start, end));

	start = end + 16; // ,"commandClass":
	if (key.charCodeAt(start - 1) !== 58)
		throw new Error("Invalid input format!");
	end = start + 1;
	while (end < len && key.charCodeAt(end) !== 44) end++;
	const commandClass = parseInt(key.slice(start, end));

	start = end + 12; // ,"endpoint":
	if (key.charCodeAt(start - 1) !== 58)
		throw new Error("Invalid input format!");
	end = start + 1;
	while (end < len && key.charCodeAt(end) !== 44) end++;
	const endpoint = parseInt(key.slice(start, end));

	start = end + 12; // ,"property":
	if (key.charCodeAt(start - 1) !== 58)
		throw new Error("Invalid input format!");

	let property;
	if (key.charCodeAt(start) === 34) {
		start++; // skip leading "
		end = start + 1;
		while (end < len && key.charCodeAt(end) !== 34) end++;
		property = key.slice(start, end);
		end++; // skip trailing "
	} else {
		end = start + 1;
		while (
			end < len &&
			key.charCodeAt(end) !== 44 &&
			key.charCodeAt(end) !== 125
		)
			end++;
		property = parseInt(key.slice(start, end));
	}

	if (key.charCodeAt(end) !== 125) {
		let propertyKey;
		start = end + 15; // ,"propertyKey":
		if (key.charCodeAt(start - 1) !== 58)
			throw new Error("Invalid input format!");
		if (key.charCodeAt(start) === 34) {
			start++; // skip leading "
			end = start + 1;
			while (end < len && key.charCodeAt(end) !== 34) end++;
			propertyKey = key.slice(start, end);
			end++; // skip trailing "
		} else {
			end = start + 1;
			while (
				end < len &&
				key.charCodeAt(end) !== 44 &&
				key.charCodeAt(end) !== 125
			)
				end++;
			propertyKey = parseInt(key.slice(start, end));
		}
		return {
			nodeId,
			commandClass,
			endpoint,
			property,
			propertyKey,
		};
	} else {
		return {
			nodeId,
			commandClass,
			endpoint,
			property,
		};
	}
}

/** Used to filter DB entries without JSON parsing */
function compareDBKeyFast(
	key: string,
	nodeId: number,
	valueId?: Partial<ValueID>,
): boolean {
	if (-1 === key.indexOf(`{"nodeId":${nodeId},`)) return false;
	if (!valueId) return true;

	if ("commandClass" in valueId) {
		if (-1 === key.indexOf(`,"commandClass":${valueId.commandClass},`))
			return false;
	}
	if ("endpoint" in valueId) {
		if (-1 === key.indexOf(`,"endpoint":${valueId.endpoint},`))
			return false;
	}
	if (typeof valueId.property === "string") {
		if (-1 === key.indexOf(`,"property":"${valueId.property}"`))
			return false;
	} else if (typeof valueId.property === "number") {
		if (-1 === key.indexOf(`,"property":${valueId.property}`)) return false;
	}
	if (typeof valueId.propertyKey === "string") {
		if (-1 === key.indexOf(`,"propertyKey":"${valueId.propertyKey}"`))
			return false;
	} else if (typeof valueId.propertyKey === "number") {
		if (-1 === key.indexOf(`,"propertyKey":${valueId.propertyKey}`))
			return false;
	}
	return true;
}

/** Extracts an index for each node from one or more JSONL DBs */
export function indexDBsByNode(databases: JsonlDB[]): Map<number, Set<string>> {
	const indexes = new Map<number, Set<string>>();
	for (const db of databases) {
		for (const key of db.keys()) {
			const nodeId = extractNodeIdFromDBKeyFast(key);
			if (nodeId == undefined) continue;
			if (!indexes.has(nodeId)) {
				indexes.set(nodeId, new Set());
			}
			indexes.get(nodeId)!.add(key);
		}
	}
	return indexes;
}

function extractNodeIdFromDBKeyFast(key: string): number | undefined {
	const start = 10; // {"nodeId":
	if (key.charCodeAt(start - 1) !== 58) {
		// Invalid input format for a node value, assume it is for the driver
		return undefined;
	}
	let end = start + 1;
	const len = key.length;

	while (end < len && key.charCodeAt(end) !== 44) end++;
	return parseInt(key.slice(start, end));
}
