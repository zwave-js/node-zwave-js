import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { isEnumMember } from "@zwave-js/shared";

export const hexKeyRegexNDigits = /^0x[a-f0-9]+$/;
export const hexKeyRegex4Digits = /^0x[a-f0-9]{4}$/;
export const hexKeyRegex2Digits = /^0x[a-f0-9]{2}$/;

// Leading zeros are rejected because semver treats "1.05.0" as invalid
const firmwareVersionRegex =
	/^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2}))?$/;

export const firmwareVersionFormatHint =
	"Must be x.y or x.y.z where x, y, and z are integers between 0 and 255 without leading zeros";

/** Checks if the given value is a firmware version in the format x.y or x.y.z with components between 0 and 255 and no leading zeros */
export function isFirmwareVersion(val: unknown): boolean {
	return (
		typeof val === "string"
		&& firmwareVersionRegex.test(val)
		&& val.split(".").every((part) => parseInt(part, 10) <= 255)
	);
}

export function throwInvalidConfig(which: string, reason?: string): never {
	throw new ZWaveError(
		`The ${which ? which + " " : ""}config file is malformed!`
			+ (reason ? `\n${reason}` : ""),
		ZWaveErrorCodes.Config_Invalid,
	);
}

export function tryParseCCId(from: string): CommandClasses | undefined {
	let ccId: number | undefined;
	if (/^\d+$/.test(from)) {
		// Decimal CC ID
		ccId = parseInt(from, 10);
	} else if (hexKeyRegexNDigits.test(from)) {
		// Hexadecimal CC ID
		ccId = parseInt(from.slice(2), 16);
	} else if (Object.hasOwn(CommandClasses, from)) {
		// CC name
		const value = (CommandClasses as any)[from];
		if (typeof value === "number") return value;
		return;
	}

	if (ccId != undefined && isEnumMember(CommandClasses, ccId)) {
		// This is a valid CC ID
		return ccId;
	}
}
