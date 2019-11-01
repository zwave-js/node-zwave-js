import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

export const configDir = path.resolve(__dirname, "../../..", "config");
export const hexKeyRegex = /^0x[a-fA-F0-9]+$/;

export function throwInvalidConfig(): never {
	throw new ZWaveError(
		"The config file is malformed!",
		ZWaveErrorCodes.Config_Invalid,
	);
}
