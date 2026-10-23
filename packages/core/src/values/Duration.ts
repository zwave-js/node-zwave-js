import type { JSONObject } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";

import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError.js";

export type DurationUnit = "seconds" | "minutes" | "unknown" | "default";

/** An object that has the same shape as a Duration instance */
export interface DurationLike {
	value: number;
	unit: DurationUnit;
}

const durationStringRegex =
	/^(?:(?<hoursStr>\d+)h)?(?:(?<minutesStr>\d+)m)?(?:(?<secondsStr>\d+)s)?$/i;

/** Represents a duration that is used by some command classes */
export class Duration {
	public constructor(
		value: number,
		public unit: DurationUnit,
	) {
		if (unit === "unknown" || unit === "default") value = 0;
		this.value = value;
	}

	private _value!: number;
	public get value(): number {
		return this._value;
	}
	public set value(v: number) {
		// Only whole seconds or minutes can be encoded
		this._value = clamp(Math.round(v), 0, 127);
		// 0 minutes cannot be encoded, the minutes range starts at 1.
		// This must be checked after clamping, so negative values are covered too.
		if (this.unit === "minutes" && this._value === 0) this.unit = "seconds";
	}

	public static unknown(): Duration {
		return new Duration(0, "unknown");
	}

	public static default(): Duration {
		return new Duration(0, "default");
	}

	/** Whether this duration is equal to another one */
	public equals(other: Duration): boolean {
		return this.value === other.value && this.unit === other.unit;
	}

	public static isDuration(value: any): value is DurationLike {
		return (
			typeof value === "object"
			&& value != null
			&& "value" in value
			&& typeof value.value === "number"
			&& "unit" in value
			&& typeof value.unit === "string"
		);
	}

	/** Parses a duration as represented in Report commands */
	public static parseReport(payload?: number): Duration | undefined {
		if (payload == undefined) return undefined;
		if (payload === 0xff) return undefined; // reserved value
		if (payload === 0xfe) return Duration.unknown();
		const isMinutes = !!(payload & 0b1000_0000);
		const value = (payload & 0b0111_1111) + (isMinutes ? 1 : 0); // minutes start at 1
		return new Duration(value, isMinutes ? "minutes" : "seconds");
	}

	/** Parses a duration as represented in Set commands */
	public static parseSet(payload?: number): Duration | undefined {
		if (payload == undefined) return undefined;
		if (payload === 0xff) return Duration.default();
		const isMinutes = !!(payload & 0b1000_0000);
		const value = (payload & 0b0111_1111) + (isMinutes ? 1 : 0); // minutes start at 1
		return new Duration(value, isMinutes ? "minutes" : "seconds");
	}

	/**
	 * Parses a user-friendly duration string in the format "Xs", "Xm", "XhYm" or "XmYs", for example "10m20s".
	 * If that cannot be exactly represented as a Z-Wave duration, the nearest possible representation will be used.
	 */
	public static parseString(text: string): Duration | undefined {
		if (!text.length) return undefined;

		if (text === "default") return Duration.default();
		// unknown durations shouldn't be parsed from strings because they are only ever reported

		// Try to parse the numeric parts from a duration
		const match = durationStringRegex.exec(text);
		if (!match) return undefined;
		const { hoursStr, minutesStr, secondsStr } = match.groups!;
		const hours = hoursStr ? parseInt(hoursStr) : 0;
		const minutes = minutesStr ? parseInt(minutesStr) : 0;
		const seconds = secondsStr ? parseInt(secondsStr) : 0;

		if (hours || minutes * 60 + seconds > 127) {
			// Up to 2m7s can be represented with seconds,
			// anything higher has to be minutes - we round to the nearest minute
			const totalMinutes =
				60 * hours + minutes + Math.round(seconds / 60);
			// Up to 2h7m can be represented as a duration
			if (totalMinutes <= 127) {
				return new Duration(totalMinutes, "minutes");
			}
		} else {
			return new Duration(minutes * 60 + seconds, "seconds");
		}
	}

	/**
	 * Takes a user-friendly duration string, a DurationLike object, or a Duration instance and returns a Duration instance
	 */
	public static from(input: "default"): Duration;
	public static from(
		input?: Duration | DurationLike | string,
	): Duration | undefined;

	public static from(
		input?: Duration | DurationLike | string,
	): Duration | undefined {
		if (input instanceof Duration) {
			return input;
		} else if (Duration.isDuration(input)) {
			return new Duration(input.value, input.unit);
		} else if (input) {
			return Duration.parseString(input);
		} else {
			return undefined;
		}
	}

	/** Serializes a duration for a Set command */
	public serializeSet(): number {
		if (this.unit === "default") return 0xff;
		if (this.unit === "unknown") {
			throw new ZWaveError(
				"Set commands don't support unknown durations",
				ZWaveErrorCodes.CC_Invalid,
			);
		}
		const isMinutes = this.unit === "minutes";
		let payload = isMinutes ? 0b1000_0000 : 0;
		payload += (this._value - (isMinutes ? 1 : 0)) & 0b0111_1111;
		return payload;
	}

	/** Serializes a duration for a Report command */
	public serializeReport(): number {
		if (this.unit === "unknown") return 0xfe;
		const isMinutes = this.unit === "minutes";
		let payload = isMinutes ? 0b1000_0000 : 0;
		payload += (this._value - (isMinutes ? 1 : 0)) & 0b0111_1111;
		return payload;
	}

	public toJSON(): string | JSONObject {
		if (this.unit === "default" || this.unit === "unknown") {
			return this.unit;
		}
		return {
			value: this.value,
			unit: this.unit,
		};
	}

	public toMilliseconds(): number | undefined {
		switch (this.unit) {
			case "minutes":
				return this._value * 60000;
			case "seconds":
				return this._value * 1000;
		}
		// The other values have no ms representation
	}

	public toString(): string {
		let ret = "";
		switch (this.unit) {
			case "minutes":
				if (this._value >= 60) {
					ret += `${Math.floor(this._value / 60)}h`;
				}
				ret += `${this._value % 60}m`;
				return ret;
			case "seconds":
				if (this._value >= 60) {
					ret += `${Math.floor(this._value / 60)}m`;
				}
				ret += `${this._value % 60}s`;
				return ret;
			default:
				return this.unit;
		}
	}
}
