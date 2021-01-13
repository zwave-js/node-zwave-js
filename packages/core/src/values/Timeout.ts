import type { JSONObject } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";

export type TimeoutUnit = "seconds" | "minutes" | "none" | "infinite";

/** Represents a timeout that is used by some command classes */
export class Timeout {
	public constructor(value: number, public unit: TimeoutUnit) {
		if (value === 0) this.unit = "none";
		switch (unit) {
			case "none":
			case "infinite":
				value = 0;
				break;
		}
		this.value = value;
	}

	private _value!: number;
	public get value(): number {
		return this._value;
	}
	public set value(v: number) {
		this._value = clamp(v, 0, this.unit === "seconds" ? 60 : 191);
	}

	/** Parses a timeout as represented in Report commands */
	public static parse(payload: number): Timeout;
	public static parse(payload: undefined): undefined;
	public static parse(payload?: number): Timeout | undefined {
		if (payload == undefined) return undefined;
		if (payload === 0xff) return new Timeout(0, "infinite");
		const isMinutes = !!(payload & 0b0100_0000);
		const value = (payload & 0b0011_1111) + (isMinutes ? 1 : 0); // minutes start at 1
		return new Timeout(value, isMinutes ? "minutes" : "seconds");
	}

	/** Serializes a timeout for a Set command */
	public serialize(): number {
		if (this.unit === "infinite") return 0xff;
		if (this.unit === "none") return 0x00;

		const isMinutes = this.unit === "minutes";
		return (isMinutes ? 0b0100_0000 : 0) | (this._value & 0b0011_1111);
	}

	public toJSON(): string | JSONObject {
		if (this.unit === "none" || this.unit === "infinite") return this.unit;
		return {
			value: this.value,
			unit: this.unit,
		};
	}

	public toMilliseconds(): number | undefined {
		switch (this.unit) {
			case "none":
				return 0;
			case "minutes":
				return this._value * 60000;
			case "seconds":
				return this._value * 1000;
			case "infinite":
				return Number.POSITIVE_INFINITY;
		}
	}

	public toString(): string {
		switch (this.unit) {
			case "minutes":
				return `[Timeout: ${this._value}${
					this.value === 1 ? "minute" : "minutes"
				}]`;
			case "seconds":
				return `[Timeout: ${this._value}${
					this.value === 1 ? "second" : "seconds"
				}]`;
			default:
				return `[Timeout: ${this.unit}]`;
		}
	}
}
