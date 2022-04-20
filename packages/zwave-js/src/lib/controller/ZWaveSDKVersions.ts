import { padStart } from "alcalzone-shared/strings";

// Based on INS13954-13, chapter 7
const versions = Object.freeze([
	// Z-Wave 700 uses 7.x SDK versions but also a different NVM format,
	// so they don't appear here. The entries below this line are for the 500 series

	// sdkVersion is formatted in a way that it is parsable by semver
	// protocolVersion comes from the Z-Wave SDK and must not be reformatted

	{
		sdkVersion: "6.84.0",
		protocolVersion: "6.10",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.82.1",
		protocolVersion: "6.09",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.82.0",
		protocolVersion: "6.08",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.6",
		protocolVersion: "6.07",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.5",
		protocolVersion: "6.06",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.4",
		protocolVersion: "6.05",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.3",
		protocolVersion: "6.04",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.2",
		protocolVersion: "6.03",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.1",
		protocolVersion: "6.02",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.81.0",
		protocolVersion: "6.01",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.80.0-beta",
		protocolVersion: "6.01",
		serialAPIVersion: "8",
	},
	{
		sdkVersion: "6.71.3",
		protocolVersion: "5.03",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.71.2",
		protocolVersion: "5.02",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.71.1",
		protocolVersion: "4.61",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.71.0",
		protocolVersion: "4.60",
		serialAPIVersion: "7",
	},
	{
		sdkVersion: "6.70.1-beta",
		protocolVersion: "4.45",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.70.0-beta",
		protocolVersion: "4.28",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.61.1",
		protocolVersion: "4.62",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.61.0",
		protocolVersion: "4.33",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.60.0-beta",
		protocolVersion: "4.12",
		serialAPIVersion: "6",
	},
	{
		sdkVersion: "6.51.10",
		protocolVersion: "4.54",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.9",
		protocolVersion: "4.38",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.8",
		protocolVersion: "4.34",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.7",
		protocolVersion: "4.24",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.6",
		protocolVersion: "4.05",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.4",
		protocolVersion: "4.01",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.3",
		protocolVersion: "3.99",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.2",
		protocolVersion: "3.95",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.1",
		protocolVersion: "3.92",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.51.0",
		protocolVersion: "3.83",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.50.1",
		protocolVersion: "3.79",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.50.0",
		protocolVersion: "3.71",
		serialAPIVersion: "5",
	},
	// The entries below this line are for the 300 or 400 series
	{
		sdkVersion: "6.11.1", // JP only
		protocolVersion: "3.53",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.11.0", // JP only
		protocolVersion: "3.45",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.10.1", // JP only
		protocolVersion: "3.38",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.10.0",
		protocolVersion: "3.35",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.2.0",
		protocolVersion: "3.41",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.1.3",
		protocolVersion: "3.37",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.1.2",
		protocolVersion: "3.33",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.1.1", // 2-ch
		protocolVersion: "3.26",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.1.0",
		protocolVersion: "3.10",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.0.5-beta",
		protocolVersion: "3.07",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.0.4-beta",
		protocolVersion: "3.06",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.0.3-beta",
		protocolVersion: "3.04",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.0.2-beta",
		protocolVersion: "3.03",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.0.1-beta",
		protocolVersion: "2.99",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "6.0.0-beta",
		protocolVersion: "2.96",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.3.0",
		protocolVersion: "3.28",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.2.3",
		protocolVersion: "2.78",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.2.2",
		protocolVersion: "2.64",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.2.1",
		protocolVersion: "2.51",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.2.0",
		protocolVersion: "2.48",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.1.0",
		protocolVersion: "2.36",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.0.1-beta",
		protocolVersion: "2.22",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "5.0.0-beta",
		protocolVersion: "2.16",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.55.0",
		protocolVersion: "3.67",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.54.2",
		protocolVersion: "3.52",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.54.1",
		protocolVersion: "3.42",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.54.0",
		protocolVersion: "3.40",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.53.1",
		protocolVersion: "3.36",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.53.0",
		protocolVersion: "3.34",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.52.1",
		protocolVersion: "3.22",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.52.0",
		protocolVersion: "3.20",
		serialAPIVersion: "5",
	},
	{
		sdkVersion: "4.51.0",
		protocolVersion: "2.97",
		serialAPIVersion: "5",
	},
]);

/**
 * Converts versions determined using GetProtocolVersion (x.y.z) into the legacy format
 * so they can be used to look up the SDK version.
 */
function semverToLegacy(version: string): string {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [major, minor, _patch] = version.split(".", 3);
	return `${major}.${padStart(minor, 2, "0")}`;
}

/**
 * Looks up which SDK version is being used for a given protocol version.
 * Defaults to the protocol version itself, which is the case for v7+
 */
export function protocolVersionToSDKVersion(protocolVersion: string): string {
	if (protocolVersion.startsWith("Z-Wave ")) {
		protocolVersion = protocolVersion.substr(7);
	}

	const normalizedVersion = semverToLegacy(protocolVersion);
	let ret = versions.find(
		(v) => v.protocolVersion === normalizedVersion,
	)?.sdkVersion;

	if (!ret) {
		// Remove leading zeroes and stuff
		ret = protocolVersion
			.split(".")
			.map((part) => parseInt(part))
			.join(".");
	}
	return ret;
}
