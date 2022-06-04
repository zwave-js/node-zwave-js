import type { SDKVersion } from "./_Types";

/** A named list of Z-Wave features */
export enum ZWaveFeature {
	// Available starting with Z-Wave SDK 6.81
	SmartStart,
}

export const minFeatureVersions: Record<ZWaveFeature, SDKVersion> = {
	[ZWaveFeature.SmartStart]: "6.81",
};
