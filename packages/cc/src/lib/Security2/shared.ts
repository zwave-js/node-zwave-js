/** @publicAPI */
export enum KEXSchemes {
	KEXScheme1 = 1,
}

/** @publicAPI */
export enum ECDHProfiles {
	Curve25519 = 0,
}

/** @publicAPI */
export enum KEXFailType {
	NoKeyMatch = 0x01, // KEX_KEY
	NoSupportedScheme = 0x02, // KEX_SCHEME
	NoSupportedCurve = 0x03, // KEX_CURVES
	Decrypt = 0x05,
	BootstrappingCanceled = 0x06, // CANCEL
	WrongSecurityLevel = 0x07, // AUTH
	KeyNotGranted = 0x08, // GET
	NoVerify = 0x09, // VERIFY
	DifferentKey = 0x0a, // REPORT
}

/** @publicAPI */
export const inclusionTimeouts = Object.freeze(
	{
		TA1: 10000,
		TA2: 10000,
		TA3: 10000,
		TA4: 10000,
		TA5: 10000,
		TAI1: 240000,
		TAI2: 240000,
		TB1: 30000,
		TB2: 240000,
		TB3: 10000,
		TB4: 10000,
		TB5: 10000,
		TBI1: 240000,
	} as const,
);
