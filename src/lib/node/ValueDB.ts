import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ValueMetadata } from "../values/Metadata";

/** Uniquely identifies to which CC, endpoint and property a value belongs to */
export interface ValueID {
	commandClass: CommandClasses;
	endpoint?: number;
	property: string | number;
	propertyKey?: string | number;
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

export function isValueID(param: any): param is ValueID {
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

export function assertValueID(param: any): asserts param is ValueID {
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
}

export function valueIdToString(valueID: ValueID): string {
	// valueIdToString is used by all other methods of the Value DB.
	// Since those may be called by unsanitized value IDs, we need
	// to make sure we have a valid value ID at our hands
	assertValueID(valueID);
	const { commandClass, endpoint, property, propertyKey } = valueID;

	const jsonKey: Record<string, unknown> = {
		commandClass,
		endpoint: endpoint ?? 0,
		property,
	};
	if (propertyKey != undefined) jsonKey.propertyKey = propertyKey;
	return JSON.stringify(jsonKey);
}

export interface SetValueOptions {
	/** When this is true, no event will be emitted for the value change */
	noEvent?: boolean;
	/** When this is true,  */
	noThrow?: boolean;
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
	public setValue(
		valueId: ValueID,
		value: unknown,
		options: SetValueOptions = {},
	): void {
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
		if (options.noEvent !== true) {
			this.emit(event, cbArg);
		}
	}

	/**
	 * Removes a value for a given value id
	 */
	public removeValue(
		valueId: ValueID,
		options: SetValueOptions = {},
	): boolean {
		const dbKey: string = valueIdToString(valueId);
		if (this._db.has(dbKey)) {
			const prevValue = this._db.get(dbKey);
			this._db.delete(dbKey);
			const cbArg: ValueRemovedArgs = {
				...valueId,
				prevValue,
			};
			if (options.noEvent !== true) {
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
	public clear(options: SetValueOptions = {}): void {
		this._db.forEach((_val, key) => {
			const valueId: ValueID = JSON.parse(key);
			this.removeValue(valueId, options);
		});
		this._metadata.forEach((_meta, key) => {
			const valueId = JSON.parse(key);
			this.setMetadata(valueId, undefined, options);
		});
	}

	/**
	 * Stores metadata for a given value id
	 */
	public setMetadata(
		valueId: ValueID,
		metadata: ValueMetadata | undefined,
		options: SetValueOptions = {},
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
		if (options.noEvent !== true) {
			this.emit("metadata updated", cbArg);
		}
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
