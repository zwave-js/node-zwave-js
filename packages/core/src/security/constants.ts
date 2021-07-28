import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

export enum SecurityClass {
	S2_Unauthenticated = 0,
	S2_Authenticated = 1,
	S2_AccessControl = 2,
	S0_Legacy = 7,
}

/** An array of security classes, ordered from high (index 0) to low (index > 0) */
export const securityClassOrder = [
	SecurityClass.S2_AccessControl,
	SecurityClass.S2_Authenticated,
	SecurityClass.S2_Unauthenticated,
	SecurityClass.S0_Legacy,
] as const;

export function getHighestSecurityClass(
	securityClasses: SecurityClass[],
): SecurityClass {
	for (const cls of securityClassOrder) {
		if (securityClasses.includes(cls)) return cls;
	}
	throw new ZWaveError(
		"At least one valid SecurityClass must be given",
		ZWaveErrorCodes.Argument_Invalid,
	);
}
