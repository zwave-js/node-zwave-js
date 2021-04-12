// Based on INS13954-13, chapter 7
const versions = Object.freeze([
	// Z-Wave 700 uses 7.x SDK versions but also a different NVM format,
	// so they don't appear here. The entries below this line are for the 500 series
	{
		sdkVersion: "6.84.00",
		protocolVersion: "6.10.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.82.01",
		protocolVersion: "6.09.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.82.00",
		protocolVersion: "6.08.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.06",
		protocolVersion: "6.07.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.05",
		protocolVersion: "6.06.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.04",
		protocolVersion: "6.05.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.03",
		protocolVersion: "6.04.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.02",
		protocolVersion: "6.03.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.01",
		protocolVersion: "6.02.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.00",
		protocolVersion: "6.01.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.80.00 Beta",
		protocolVersion: "6.01.00",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.71.03",
		protocolVersion: "5.03.00",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.71.02",
		protocolVersion: "5.02.00",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.71.01",
		protocolVersion: "4.61",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.71.00",
		protocolVersion: "4.60",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.70.01 Beta",
		protocolVersion: "4.45",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.70.00 Beta",
		protocolVersion: "4.28",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.61.01",
		protocolVersion: "4.62",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.61.00",
		protocolVersion: "4.33",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.60.00 Beta",
		protocolVersion: "4.12",
		serialAPIVersion: "6",
	},
	{ sdkVersion: "6.51.10", protocolVersion: "4.54", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.09", protocolVersion: "4.38", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.08", protocolVersion: "4.34", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.07", protocolVersion: "4.24", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.06", protocolVersion: "4.05", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.04", protocolVersion: "4.01", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.03", protocolVersion: "3.99", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.02", protocolVersion: "3.95", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.01", protocolVersion: "3.92", serialAPIVersion: "5" },
	{ sdkVersion: "6.51.00", protocolVersion: "3.83", serialAPIVersion: "5" },
	{ sdkVersion: "6.50.01", protocolVersion: "3.79", serialAPIVersion: "5" },
	{ sdkVersion: "6.50.00", protocolVersion: "3.71", serialAPIVersion: "5" },
	// The entries below this line are for the 300 or 400 series
	{
		sdkVersion: "6.11.01 (JP)",
		protocolVersion: "3.53",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.11.00 (JP)",
		protocolVersion: "3.45",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.10.01 (JP)",
		protocolVersion: "3.38",
		serialAPIVersion: "5",
	},
	{ sdkVersion: "6.10.00", protocolVersion: "3.35", serialAPIVersion: "5" },
	{ sdkVersion: "6.02.00", protocolVersion: "3.41", serialAPIVersion: "5" },
	{ sdkVersion: "6.01.03", protocolVersion: "3.37", serialAPIVersion: "5" },
	{ sdkVersion: "6.01.02", protocolVersion: "3.33", serialAPIVersion: "5" },
	{
		sdkVersion: "6.01.01 (2-ch)",
		protocolVersion: "3.26",
		serialAPIVersion: "5",
	},
	{ sdkVersion: "6.01.00", protocolVersion: "3.10", serialAPIVersion: "5" },
	{
		sdkVersion: "6.00.05 Beta 1",
		protocolVersion: "3.07",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.00.04 Beta 1",
		protocolVersion: "3.06",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.00 Beta 1 Patch 3",
		protocolVersion: "3.04",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.00 Beta 1 Patch 2",
		protocolVersion: "3.03",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.00 Beta 1 Patch 1",
		protocolVersion: "2.99",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.00 Beta 1",
		protocolVersion: "2.96",
		serialAPIVersion: "5",
	},
	{ sdkVersion: "5.03.00", protocolVersion: "3.28", serialAPIVersion: "5" },
	{
		sdkVersion: "5.02 Patch 3",
		protocolVersion: "2.78",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.02 Patch 2",
		protocolVersion: "2.64",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.02 Patch 1",
		protocolVersion: "2.51",
		serialAPIVersion: "5",
	},
	{ sdkVersion: "5.02", protocolVersion: "2.48", serialAPIVersion: "5" },
	{ sdkVersion: "5.01", protocolVersion: "2.36", serialAPIVersion: "5" },
	{
		sdkVersion: "5.00 Beta 1 Patch 1",
		protocolVersion: "2.22",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.00 Beta 1",
		protocolVersion: "2.16",
		serialAPIVersion: "5",
	},
	{ sdkVersion: "4.55.00", protocolVersion: "3.67", serialAPIVersion: "5" },
	{ sdkVersion: "4.54.02", protocolVersion: "3.52", serialAPIVersion: "5" },
	{ sdkVersion: "4.54.01", protocolVersion: "3.42", serialAPIVersion: "5" },
	{ sdkVersion: "4.54.00", protocolVersion: "3.40", serialAPIVersion: "5" },
	{ sdkVersion: "4.53.01", protocolVersion: "3.36", serialAPIVersion: "5" },
	{ sdkVersion: "4.53.00", protocolVersion: "3.34", serialAPIVersion: "5" },
	{ sdkVersion: "4.52.01", protocolVersion: "3.22", serialAPIVersion: "5" },
	{ sdkVersion: "4.52.00", protocolVersion: "3.20", serialAPIVersion: "5" },
	{ sdkVersion: "4.51", protocolVersion: "2.97", serialAPIVersion: "5" },
]);

/** Looks up which SDK version is being used for a given protocol version */
export function protocolVersionToSDKVersion(
	protocolVersion: string,
): string | undefined {
	return versions.find((v) => v.protocolVersion === protocolVersion)
		?.sdkVersion;
}
