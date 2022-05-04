import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";

export const hexKeyRegexNDigits = /^0x[a-f0-9]+$/;
export const hexKeyRegex4Digits = /^0x[a-f0-9]{4}$/;
export const hexKeyRegex2Digits = /^0x[a-f0-9]{2}$/;

export function throwInvalidConfig(which: string, reason?: string): never {
	throw new ZWaveError(
		`The ${which ? which + " " : ""}config file is malformed!` +
			(reason ? `\n${reason}` : ""),
		ZWaveErrorCodes.Config_Invalid,
	);
}
