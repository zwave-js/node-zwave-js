import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ValueMetadata } from "../values/Metadata";

/** Uniquely identifies to which CC, endpoint and property a value belongs to */
export interface ValueID {
	commandClass: CommandClasses;
	endpoint?: number;
	property: string;
	propertyKey?: number | string;
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

export interface MetadataUpdatedArgs extends ValueID {
	metadata: ValueMetadata | undefined;
}

type ValueAddedCallback = (args: ValueAddedArgs) => void;
type ValueUpdatedCallback = (args: ValueUpdatedArgs) => void;
type ValueRemovedCallback = (args: ValueRemovedArgs) => void;
type MetadataUpdatedCallback = (args: MetadataUpdatedArgs) => void;

interface ValueDBEventCallbacks {
	"value added": ValueAddedCallback;
	"value updated": ValueUpdatedCallback;
	"value removed": ValueRemovedCallback;
	"metadata updated": MetadataUpdatedCallback;
}

type ValueDBEvents = Extract<keyof ValueDBEventCallbacks, string>;

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
}

export function valueIdToString({
	commandClass,
	endpoint,
	property,
	propertyKey,
}: ValueID): string {
	const jsonKey: Record<string, unknown> = {
		commandClass,
		endpoint: endpoint ?? 0,
		property,
	};
	if (propertyKey != undefined) jsonKey.propertyKey = propertyKey;
	return JSON.stringify(jsonKey);
}

/**
 * The value store for a single node
 */
export class ValueDB extends EventEmitter {
	private _db = new Map<string, unknown>();
	private _metadata = new Map<string, ValueMetadata>();

	/**
	 * Stores a value for a given value id
	 */
	public setValue(valueId: ValueID, value: unknown): void {
		const cbArg: ValueAddedArgs | ValueUpdatedArgs = {
			...valueId,
			newValue: value,
		};
		const dbKey: string = valueIdToString(valueId);

		let event: string;
		if (this._db.has(dbKey)) {
			event = "value updated";
			(cbArg as ValueUpdatedArgs).prevValue = this._db.get(dbKey);
		} else {
			event = "value added";
		}

		this._db.set(dbKey, value);
		this.emit(event, cbArg);
	}

	/**
	 * Removes a value for a given value id
	 */
	public removeValue(valueId: ValueID): boolean {
		const dbKey: string = valueIdToString(valueId);
		if (this._db.has(dbKey)) {
			const prevValue = this._db.get(dbKey);
			this._db.delete(dbKey);
			const cbArg: ValueRemovedArgs = {
				...valueId,
				prevValue,
			};
			this.emit("value removed", cbArg);
			return true;
		}
		return false;
	}

	/**
	 * Retrieves a value for a given value id
	 */
	/* wotan-disable-next-line no-misused-generics */
	public getValue<T = unknown>(valueId: ValueID): T | undefined {
		const key = valueIdToString(valueId);
		return this._db.get(key) as T | undefined;
	}

	/**
	 * Checks if a value for a given value id exists in this ValueDB
	 */
	public hasValue(valueId: ValueID): boolean {
		const key = valueIdToString(valueId);
		return this._db.has(key);
	}

	/** Returns all values that are stored for a given CC */
	public getValues(forCC: CommandClasses): (ValueID & { value: unknown })[] {
		const ret: ReturnType<ValueDB["getValues"]> = [];
		this._db.forEach((value, key) => {
			const valueId: ValueID = JSON.parse(key);
			if (forCC === valueId.commandClass) ret.push({ ...valueId, value });
		});
		return ret;
	}

	/** Clears all values from the value DB */
	public clear(): void {
		this._db.forEach((_val, key) => {
			const valueId: ValueID = JSON.parse(key);
			this.removeValue(valueId);
		});
		this._metadata.forEach((_meta, key) => {
			const valueId = JSON.parse(key);
			this.setMetadata(valueId, undefined);
		});
	}

	/**
	 * Stores metadata for a given value id
	 */
	public setMetadata(
		valueId: ValueID,
		metadata: ValueMetadata | undefined,
	): void {
		const dbKey: string = valueIdToString(valueId);
		if (metadata) {
			this._metadata.set(dbKey, metadata);
		} else {
			this._metadata.delete(dbKey);
		}

		const cbArg: MetadataUpdatedArgs = {
			...valueId,
			metadata,
		};
		this.emit("metadata updated", cbArg);
	}

	/**
	 * Checks if metadata for a given value id exists in this ValueDB
	 */
	public hasMetadata(valueId: ValueID): boolean {
		const key = valueIdToString(valueId);
		return this._metadata.has(key);
	}

	/**
	 * Retrieves metadata for a given value id
	 */
	public getMetadata(valueId: ValueID): ValueMetadata | undefined {
		const key = valueIdToString(valueId);
		return this._metadata.get(key);
	}

	/** Returns all metadata that is stored for a given CC */
	public getAllMetadata(
		forCC: CommandClasses,
	): (ValueID & {
		metadata: ValueMetadata;
	})[] {
		const ret: ReturnType<ValueDB["getAllMetadata"]> = [];
		this._metadata.forEach((meta, key) => {
			const valueId: ValueID = JSON.parse(key);
			if (forCC === valueId.commandClass)
				ret.push({ ...valueId, metadata: meta });
		});
		return ret;
	}
}
