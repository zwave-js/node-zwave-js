import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ValueMetadata } from "../values/Metadata";

export interface ValueBaseArgs {
	commandClass: CommandClasses;
	endpoint?: number;
	propertyName: string;
	propertyKey?: number | string;
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

export type ValueAddedCallback = (args: ValueAddedArgs) => void;
export type ValueUpdatedCallback = (args: ValueUpdatedArgs) => void;
export type ValueRemovedCallback = (args: ValueRemovedArgs) => void;

export interface ValueDBEventCallbacks {
	"value added": ValueAddedCallback;
	"value updated": ValueUpdatedCallback;
	"value removed": ValueRemovedCallback;
}

export type ValueDBEvents = Extract<keyof ValueDBEventCallbacks, string>;

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

function getValueKey(
	cc: CommandClasses,
	endpoint: number,
	propertyName: string,
	propertyKey?: string | number,
): string {
	const jsonKey: Record<string, unknown> = {
		cc,
		endpoint,
		propertyName,
	};
	if (propertyKey != undefined) jsonKey.propertyKey = propertyKey;
	return JSON.stringify(jsonKey);
}

export class ValueDB extends EventEmitter {
	private _db = new Map<string, unknown>();
	private _metadata = new Map<string, ValueMetadata>();

	/**
	 * Stores a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param value The value to set
	 */
	public setValue(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey: string | number,
		value: unknown,
	): void;

	public setValue(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		value: unknown,
	): void;

	public setValue(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		...args: [unknown] | [string | number, unknown]
	): void {
		let propertyKey: string | number | undefined;
		const value = args[args.length - 1];
		let dbKey: string;

		const cbArg: ValueAddedArgs | ValueUpdatedArgs = {
			commandClass: cc,
			endpoint,
			propertyName,
			newValue: value,
		};

		if (args.length === 1) {
			dbKey = getValueKey(cc, endpoint, propertyName);
		} else {
			propertyKey = args[0];
			dbKey = getValueKey(cc, endpoint, propertyName, propertyKey);
			cbArg.propertyKey = propertyKey;
		}

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
	 * Removes a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 */
	public removeValue(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey?: number | string,
	): boolean {
		const key = getValueKey(cc, endpoint, propertyName, propertyKey);
		if (this._db.has(key)) {
			const prevValue = this._db.get(key);
			this._db.delete(key);
			const cbArg: ValueRemovedArgs = {
				commandClass: cc,
				endpoint,
				propertyName,
				prevValue,
			};
			if (propertyKey != undefined) cbArg.propertyKey = propertyKey;
			this.emit("value removed", cbArg);
			return true;
		}
		return false;
	}

	/**
	 * Retrieves a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	/* wotan-disable-next-line no-misused-generics */
	public getValue<T = unknown>(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey?: number | string,
	): T | undefined {
		const key = getValueKey(cc, endpoint, propertyName, propertyKey);
		return this._db.get(key) as T | undefined;
	}

	/**
	 * Checks if a value for a given property of a given CommandClass exists in this ValueDB
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	public hasValue(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey?: number | string,
	): boolean {
		const key = getValueKey(cc, endpoint, propertyName, propertyKey);
		return this._db.has(key);
	}

	public getValues(
		forCC: CommandClasses,
	): {
		endpoint: number;
		propertyName: string;
		propertyKey?: number | string;
		value: unknown;
	}[] {
		const ret: ReturnType<ValueDB["getValues"]> = [];
		this._db.forEach((value, key) => {
			const { cc, ...rest } = JSON.parse(key);
			if (forCC === cc) ret.push({ ...rest, value });
		});
		return ret;
	}

	/** Clears all values from the value DB */
	public clear(): void {
		this._db.forEach((_val, key) => {
			const { cc, endpoint, propertyName, propertyKey } = JSON.parse(key);
			this.removeValue(cc, endpoint, propertyName, propertyKey);
		});
		this._metadata.forEach((_meta, key) => {
			const { cc, endpoint, propertyName, propertyKey } = JSON.parse(key);
			this.setMetadata(
				cc,
				endpoint,
				propertyName,
				propertyKey,
				undefined,
			);
		});
	}

	/**
	 * Stores metadata for a CC value
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param value The value to set
	 */
	public setMetadata(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey: string | number,
		metadata: ValueMetadata | undefined,
	): void;

	public setMetadata(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		metadata: ValueMetadata | undefined,
	): void;

	public setMetadata(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		...args:
			| [ValueMetadata | undefined]
			| [string | number, ValueMetadata | undefined]
	): void {
		let propertyKey: string | number | undefined;
		const metadata = (args[args.length - 1] as unknown) as
			| ValueMetadata
			| undefined;
		let dbKey: string;

		if (args.length === 1) {
			dbKey = getValueKey(cc, endpoint, propertyName);
		} else {
			propertyKey = args[0];
			dbKey = getValueKey(cc, endpoint, propertyName, propertyKey);
		}

		if (metadata) {
			this._metadata.set(dbKey, metadata);
		} else {
			this._metadata.delete(dbKey);
		}
	}

	/**
	 * Checks if metadata for a given value exists in this ValueDB
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	public hasMetadata(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey?: number | string,
	): boolean {
		const key = getValueKey(cc, endpoint, propertyName, propertyKey);
		return this._metadata.has(key);
	}

	/**
	 * Retrieves metadata for a given value
	 * @param cc The command class the value belongs to
	 * @param endpoint The endpoint the value belongs to (0 for the root device)
	 * @param propertyName The property name the value belongs to
	 * @param propertyKey (optional) The sub-property to access
	 */
	public getMetadata(
		cc: CommandClasses,
		endpoint: number,
		propertyName: string,
		propertyKey?: number | string,
	): ValueMetadata | undefined {
		const key = getValueKey(cc, endpoint, propertyName, propertyKey);
		return this._metadata.get(key);
	}

	public getAllMetadata(
		forCC: CommandClasses,
	): {
		endpoint: number;
		propertyName: string;
		propertyKey?: number | string;
		metadata: ValueMetadata;
	}[] {
		const ret: ReturnType<ValueDB["getAllMetadata"]> = [];
		this._metadata.forEach((meta, key) => {
			const { cc, ...rest } = JSON.parse(key);
			if (forCC === cc) ret.push({ ...rest, metadata: meta });
		});
		return ret;
	}
}
