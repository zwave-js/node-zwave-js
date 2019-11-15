import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

export const configDir = path.resolve(__dirname, "../../..", "config");
export const hexKeyRegexNDigits = /^0x[a-fA-F0-9]+$/;
export const hexKeyRegex4Digits = /^0x[a-fA-F0-9]{4}$/;
export const hexKeyRegex2Digits = /^0x[a-fA-F0-9]{2}$/;

export function throwInvalidConfig(which: string, reason?: string): never {
	throw new ZWaveError(
		`The ${which ? which + " " : ""}config file is malformed!` + reason
			? "\n" + reason
			: "",
		ZWaveErrorCodes.Config_Invalid,
	);
}
