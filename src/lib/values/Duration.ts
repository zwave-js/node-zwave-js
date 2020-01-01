import { clamp } from "alcalzone-shared/math";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject } from "../util/misc";

export type DurationUnit = "seconds" | "minutes" | "unknown" | "default";

/** Represents a duration that is used by some command classes */
export class Duration {
	public constructor(value: number, public unit: DurationUnit) {
		switch (unit) {
			case "minutes":
				// Don't allow 0 minutes as a duration
				if (value === 0) this.unit = "seconds";
				break;
			case "unknown":
			case "default":
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
		this._value = clamp(v, 0, 127);
	}

	/** Parses a duration as represented in Report commands */
	public static parseReport(payload?: number): Duration | undefined {
		if (payload == undefined) return undefined;
		if (payload === 0xff) return undefined; // reserved value
		if (payload === 0xfe) return new Duration(0, "unknown");
		const isMinutes = !!(payload & 0b1000_0000);
		const value = (payload & 0b0111_1111) + (isMinutes ? 1 : 0); // minutes start at 1
		return new Duration(value, isMinutes ? "minutes" : "seconds");
	}

	/** Parses a duration as represented in Set commands */
	public static parseSet(payload?: number): Duration | undefined {
		if (payload == undefined) return undefined;
		if (payload === 0xff) return new Duration(0, "default");
		const isMinutes = !!(payload & 0b1000_0000);
		const value = (payload & 0b0111_1111) + (isMinutes ? 1 : 0); // minutes start at 1
		return new Duration(value, isMinutes ? "minutes" : "seconds");
	}

	/** Serializes a duration for a Set command */
	public serializeSet(): number {
		if (this.unit === "default") return 0xff;
		if (this.unit === "unknown")
			throw new ZWaveError(
				"Set commands don't support unknown durations",
				ZWaveErrorCodes.CC_Invalid,
			);
		const isMinutes = this.unit === "minutes";
		let payload = isMinutes ? 0b1000_0000 : 0;
		payload += (this._value - (isMinutes ? 1 : 0)) & 0b0111_1111;
		return payload;
	}

	public toJSON(): string | JSONObject {
		if (this.unit === "default" || this.unit === "unknown")
			return this.unit;
		return {
			value: this.value,
			unit: this.unit,
		};
	}
}
