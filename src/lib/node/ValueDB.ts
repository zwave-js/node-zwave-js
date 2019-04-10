import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";

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
	on<TEvent extends ValueDBEvents>(event: TEvent, callback: ValueDBEventCallbacks[TEvent]): this;
	removeListener<TEvent extends ValueDBEvents>(event: TEvent, callback: ValueDBEventCallbacks[TEvent]): this;
	removeAllListeners(event?: ValueDBEvents): this;
}

function getValueKey(cc: CommandClasses, endpoint: number | undefined, propertyName: string): string {
	return JSON.stringify({
		cc,
		endpoint,
		propertyName,
	});
}

export class ValueDB extends EventEmitter {

	private _db = new Map<string, unknown>();

	/**
	 * Stores a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The optional endpoint the value belongs to
	 * @param propertyName The property name the value belongs to
	 * @param value The value to set
	 */
	public setValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string, value: unknown): void {
		const key = getValueKey(cc, endpoint, propertyName);
		const cbArg: ValueAddedArgs | ValueUpdatedArgs = {
			commandClass: cc,
			endpoint,
			propertyName,
			newValue: value,
		};
		let event: string;
		if (this._db.has(key)) {
			event = "value updated";
			(cbArg as ValueUpdatedArgs).prevValue = this._db.get(key);
		} else {
			event = "value added";
		}

		this._db.set(key, value);
		this.emit(event, cbArg);
	}

	/**
	 * Removes a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The optional endpoint the value belongs to
	 * @param propertyName The property name the value belongs to
	 */
	public removeValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string): boolean {
		const key = getValueKey(cc, endpoint, propertyName);
		if (this._db.has(key)) {
			const prevValue = this._db.get(key);
			this._db.delete(key);
			this.emit("value removed", {
				commandClass: cc,
				endpoint,
				propertyName,
				prevValue,
			});
			return true;
		}
		return false;
	}

	/**
	 * Retrieves a value for a given property of a given CommandClass
	 * @param cc The command class the value belongs to
	 * @param endpoint The optional endpoint the value belongs to
	 * @param propertyName The property name the value belongs to
	 */
	public getValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string): unknown {
		const key = getValueKey(cc, endpoint, propertyName);
		return this._db.get(key);
	}

	public getValues(forCC: CommandClasses): { endpoint: number | undefined; propertyName: string; value: unknown }[] {
		const ret: ReturnType<ValueDB["getValues"]> = [];
		this._db.forEach((value, key) => {
			const { cc, endpoint, propertyName } = JSON.parse(key);
			if (forCC === cc) ret.push({ endpoint, propertyName, value });
		});
		return ret;
	}

	/** Clears all values from the value DB */
	public clear(): void {
		this._db.forEach((_val, key) => {
			const { cc, endpoint, propertyName } = JSON.parse(key);
			this.removeValue(cc, endpoint, propertyName);
		});
	}
}
