import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ObjectKeyMap } from "../util/ObjectKeyMap";
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
	private _db = new ObjectKeyMap<ValueID, unknown>(undefined, {
		endpoint: 0,
	});
	private _metadata = new ObjectKeyMap<ValueID, ValueMetadata>(undefined, {
		endpoint: 0,
	});

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
		try {
			assertValueID(valueId);
		} catch (e) {
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Argument_Invalid &&
				options.noThrow === true
			) {
				// ignore invalid value IDs
				return;
			}
			throw e;
		}

		let event: string;
		if (this._db.has(valueId)) {
			event = "value updated";
			(cbArg as ValueUpdatedArgs).prevValue = this._db.get(valueId);
		} else {
			event = "value added";
		}

		this._db.set(valueId, value);
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
		assertValueID(valueId);
		if (this._db.has(valueId)) {
			const prevValue = this._db.get(valueId);
			this._db.delete(valueId);
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
		assertValueID(valueId);
		return this._db.get(valueId) as T | undefined;
	}

	/**
	 * Checks if a value for a given value id exists in this ValueDB
	 */
	public hasValue(valueId: ValueID): boolean {
		assertValueID(valueId);
		return this._db.has(valueId);
	}

	/** Returns all values that are stored for a given CC */
	public getValues(forCC: CommandClasses): (ValueID & { value: unknown })[] {
		const ret: ReturnType<ValueDB["getValues"]> = [];
		this._db.forEach((value, valueId) => {
			if (forCC === valueId.commandClass) ret.push({ ...valueId, value });
		});
		return ret;
	}

	/** Clears all values from the value DB */
	public clear(options: SetValueOptions = {}): void {
		this._db.forEach((_val, valueId) => {
			this.removeValue(valueId, options);
		});
		this._metadata.forEach((_meta, valueId) => {
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
		try {
			assertValueID(valueId);
		} catch (e) {
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Argument_Invalid &&
				options.noThrow === true
			) {
				// ignore invalid value IDs
				return;
			}
			throw e;
		}

		if (metadata) {
			this._metadata.set(valueId, metadata);
		} else {
			this._metadata.delete(valueId);
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
		assertValueID(valueId);
		return this._metadata.has(valueId);
	}

	/**
	 * Retrieves metadata for a given value id
	 */
	public getMetadata(valueId: ValueID): ValueMetadata | undefined {
		assertValueID(valueId);
		return this._metadata.get(valueId);
	}

	/** Returns all metadata that is stored for a given CC */
	public getAllMetadata(
		forCC: CommandClasses,
	): (ValueID & {
		metadata: ValueMetadata;
	})[] {
		const ret: ReturnType<ValueDB["getAllMetadata"]> = [];
		this._metadata.forEach((meta, valueId) => {
			if (forCC === valueId.commandClass)
				ret.push({ ...valueId, metadata: meta });
		});
		return ret;
	}
}
