import {
	CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";

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

export function tryParseCCId(from: string): CommandClasses | undefined {
	let ccId: number | undefined;
	if (/^\d+$/.test(from)) {
		// Decimal CC ID
		ccId = parseInt(from, 10);
	} else if (hexKeyRegexNDigits.test(from)) {
		// Hexadecimal CC ID
		ccId = parseInt(from.slice(2), 16);
	} else if (from in CommandClasses) {
		// CC name
		return (CommandClasses as any)[from];
	}

	if (ccId != undefined && ccId in CommandClasses) {
		// This is a valid CC ID
		return ccId;
	}
}
