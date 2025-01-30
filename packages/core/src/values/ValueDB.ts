import { type Database } from "@zwave-js/shared/bindings";
import {
	TypedEventTarget,
	areUint8ArraysEqual,
	isUint8Array,
} from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import type { CommandClasses } from "../definitions/CommandClasses.js";
import {
	ZWaveError,
	ZWaveErrorCodes,
	isZWaveError,
} from "../error/ZWaveError.js";
import type { ValueMetadata } from "../values/Metadata.js";
import type {
	MetadataUpdatedArgs,
	SetValueOptions,
	ValueAddedArgs,
	ValueID,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "./_Types.js";

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
		typeof param.property !== "number"
		&& typeof param.property !== "string"
	) {
		return false;
	}
	// propertyKey is optional and must be a number or string
	if (
		param.propertyKey != undefined
		&& typeof param.propertyKey !== "number"
		&& typeof param.propertyKey !== "string"
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

/**
 * Ensures all Value ID properties are in the same order and there are no extraneous properties.
 * A normalized value ID can be used as a database key */
export function normalizeValueID(valueID: ValueID): ValueID {
	// valueIdToString is used by all other methods of the Value DB.
	// Since those may be called by unsanitized value IDs, we need
	// to make sure we have a valid value ID at our hands
	assertValueID(valueID);
	const { commandClass, endpoint, property, propertyKey } = valueID;

	const normalized: ValueID = {
		commandClass,
		endpoint: endpoint ?? 0,
		property,
	};
	if (propertyKey != undefined) normalized.propertyKey = propertyKey;
	return normalized;
}

export function valueIdToString(valueID: ValueID): string {
	return JSON.stringify(normalizeValueID(valueID));
}

/**
 * Compares two values and checks if they are equal.
 * This is a portable, but weak version of isDeepStrictEqual, limited to the types of values
 * that can be stored in the Value DB.
 */
export function valueEquals(a: unknown, b: unknown): boolean {
	switch (typeof a) {
		case "bigint":
		case "boolean":
		case "number":
		case "string":
		case "undefined":
			return a === b;

		case "function":
		case "symbol":
			// These cannot be stored in the value DB
			return false;
	}

	if (a === null) return b === null;

	if (isUint8Array(a)) {
		return isUint8Array(b) && areUint8ArraysEqual(a, b);
	}

	if (isArray(a)) {
		return isArray(b)
			&& a.length === b.length
			&& a.every((v, i) => valueEquals(v, b[i]));
	}

	if (isObject(a)) {
		if (!isObject(b)) return false;
		const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
		return [...allKeys].every((k) =>
			valueEquals((a as any)[k], (b as any)[k])
		);
	}

	return false;
}

/**
 * The value store for a single node
 */
export class ValueDB extends TypedEventTarget<ValueDBEventCallbacks> {
	// This is a wrapper around the driver's on-disk value and metadata key value stores

	/**
	 * @param nodeId The ID of the node this Value DB belongs to
	 * @param valueDB The DB instance which stores values
	 * @param metadataDB The DB instance which stores metadata
	 * @param ownKeys An optional pre-created index of this ValueDB's own keys
	 */
	public constructor(
		nodeId: number,
		valueDB: Database<unknown>,
		metadataDB: Database<ValueMetadata>,
		ownKeys?: Set<string>,
	) {
		super();
		this.nodeId = nodeId;
		this._db = valueDB;
		this._metadata = metadataDB;

		this._index = ownKeys ?? this.buildIndex();
	}

	private nodeId: number;
	private _db: Database<unknown>;
	private _metadata: Database<ValueMetadata>;
	private _index: Set<string>;

	private buildIndex(): Set<string> {
		const ret = new Set<string>();
		for (const key of this._db.keys()) {
			if (compareDBKeyFast(key, this.nodeId)) ret.add(key);
		}
		for (const key of this._metadata.keys()) {
			if (!ret.has(key) && compareDBKeyFast(key, this.nodeId)) {
				ret.add(key);
			}
		}
		return ret;
	}

	private valueIdToDBKey(valueID: ValueID): string {
		return JSON.stringify({
			nodeId: this.nodeId,
			...normalizeValueID(valueID),
		});
	}

	private dbKeyToValueId(
		key: string,
	): ({ nodeId: number } & ValueID) | undefined {
		try {
			// Try the dumb but fast way first
			return dbKeyToValueIdFast(key);
		} catch {
			// ignore
		}

		try {
			// Fall back to JSON.parse if anything went wrong
			return JSON.parse(key);
		} catch {
			// This is not a valid DB key
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
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.Argument_Invalid
				&& options.noThrow === true
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
				if (options.source) {
					(cbArg as ValueUpdatedArgs).source = options.source;
				}
			} else {
				event = "value added";
			}

			this._index.add(dbKey);
			this._db.set(dbKey, value, options.updateTimestamp !== false);
			if (valueId.commandClass >= 0 && options.noEvent !== true) {
				this.emit(event, cbArg);
			}
		} else if (valueId.commandClass >= 0) {
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

			if (valueId.commandClass >= 0 && options.noEvent !== true) {
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
			const vid = this.dbKeyToValueId(key);
			if (!vid) {
				this.dropBrokenEntry(key);
				continue;
			}

			const { nodeId, ...valueId } = vid;

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
				compareDBKeyFast(key, this.nodeId, { commandClass: forCC })
				&& this._db.has(key)
			) {
				const vid = this.dbKeyToValueId(key);
				if (!vid) {
					this.dropBrokenEntry(key);
					continue;
				}

				const { nodeId, ...valueId } = vid;

				const value = this._db.get(key);
				ret.push({ ...valueId, value });
			}
		}
		return ret;
	}

	/**
	 * Returns when the given value id was last updated
	 */
	public getTimestamp(valueId: ValueID): number | undefined {
		const key = this.valueIdToDBKey(valueId);
		return this._db.getTimestamp(key);
	}

	/** Clears all values from the value DB */
	public clear(options: SetValueOptions = {}): void {
		for (const key of this._index) {
			const vid = this.dbKeyToValueId(key);
			if (!vid) continue;

			const { nodeId, ...valueId } = vid;

			if (this._db.has(key)) {
				const prevValue = this._db.get(key);
				this._db.delete(key);

				if (valueId.commandClass >= 0 && options.noEvent !== true) {
					const cbArg: ValueRemovedArgs = {
						...valueId,
						prevValue,
					};
					this.emit("value removed", cbArg);
				}
			}
			if (this._metadata.has(key)) {
				this._metadata.delete(key);

				if (valueId.commandClass >= 0 && options.noEvent !== true) {
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

	private dropBrokenEntry(key: string): void {
		// Sometimes the files get corrupted on disk, e.g. when an SD card goes bad
		// When this happens for a key, we can no longer parse it, so we silently drop it from the DB
		this._db.delete(key);
		this._metadata.delete(key);
		this._index.delete(key);
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
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.Argument_Invalid
				&& options.noThrow === true
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
		if (valueId.commandClass >= 0 && options.noEvent !== true) {
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
	public getAllMetadata(forCC: CommandClasses): (ValueID & {
		metadata: ValueMetadata;
	})[] {
		const ret: ReturnType<ValueDB["getAllMetadata"]> = [];
		for (const key of this._index) {
			if (
				compareDBKeyFast(key, this.nodeId, { commandClass: forCC })
				&& this._metadata.has(key)
			) {
				const vid = this.dbKeyToValueId(key);
				if (!vid) {
					this.dropBrokenEntry(key);
					continue;
				}

				const { nodeId, ...valueId } = vid;

				const metadata = this._metadata.get(key)!;
				ret.push({ ...valueId, metadata });
			}
		}
		return ret;
	}

	/** Returns all values whose id matches the given predicate */
	public findMetadata(predicate: (id: ValueID) => boolean): (ValueID & {
		metadata: ValueMetadata;
	})[] {
		const ret: ReturnType<ValueDB["findMetadata"]> = [];
		for (const key of this._index) {
			if (!this._metadata.has(key)) continue;

			const vid = this.dbKeyToValueId(key);
			if (!vid) {
				this.dropBrokenEntry(key);
				continue;
			}

			const { nodeId, ...valueId } = vid;

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
	if (key.charCodeAt(start - 1) !== 58) {
		throw new Error("Invalid input format!");
	}
	end = start + 1;
	while (end < len && key.charCodeAt(end) !== 44) end++;
	const commandClass = parseInt(key.slice(start, end));

	start = end + 12; // ,"endpoint":
	if (key.charCodeAt(start - 1) !== 58) {
		throw new Error("Invalid input format!");
	}
	end = start + 1;
	while (end < len && key.charCodeAt(end) !== 44) end++;
	const endpoint = parseInt(key.slice(start, end));

	start = end + 12; // ,"property":
	if (key.charCodeAt(start - 1) !== 58) {
		throw new Error("Invalid input format!");
	}

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
			end < len
			&& key.charCodeAt(end) !== 44
			&& key.charCodeAt(end) !== 125
		) {
			end++;
		}
		property = parseInt(key.slice(start, end));
	}

	if (key.charCodeAt(end) !== 125) {
		let propertyKey;
		start = end + 15; // ,"propertyKey":
		if (key.charCodeAt(start - 1) !== 58) {
			throw new Error("Invalid input format!");
		}
		if (key.charCodeAt(start) === 34) {
			start++; // skip leading "
			end = start + 1;
			while (end < len && key.charCodeAt(end) !== 34) end++;
			propertyKey = key.slice(start, end);
			end++; // skip trailing "
		} else {
			end = start + 1;
			while (
				end < len
				&& key.charCodeAt(end) !== 44
				&& key.charCodeAt(end) !== 125
			) {
				end++;
			}
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
		if (-1 === key.indexOf(`,"commandClass":${valueId.commandClass},`)) {
			return false;
		}
	}
	if ("endpoint" in valueId) {
		if (-1 === key.indexOf(`,"endpoint":${valueId.endpoint},`)) {
			return false;
		}
	}
	if (typeof valueId.property === "string") {
		if (-1 === key.indexOf(`,"property":"${valueId.property}"`)) {
			return false;
		}
	} else if (typeof valueId.property === "number") {
		if (-1 === key.indexOf(`,"property":${valueId.property}`)) return false;
	}
	if (typeof valueId.propertyKey === "string") {
		if (-1 === key.indexOf(`,"propertyKey":"${valueId.propertyKey}"`)) {
			return false;
		}
	} else if (typeof valueId.propertyKey === "number") {
		if (-1 === key.indexOf(`,"propertyKey":${valueId.propertyKey}`)) {
			return false;
		}
	}
	return true;
}

/** Extracts an index for each node from one or more JSONL DBs */
export function indexDBsByNode(
	databases: Database<unknown>[],
): Map<number, Set<string>> {
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
