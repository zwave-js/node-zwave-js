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
	public setValue(cc: CommandClasses, endpoint: number | undefined, propertyName: string, value: unknown) {
		const key = getValueKey(cc, endpoint, propertyName);
		const prevValue = this._db.get(key);
		this._db.set(key, value);
		this.emit("value updated", {
			commandClass: cc,
			endpoint,
			propertyName,
			prevValue,
			newValue: value,
		});
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
}
