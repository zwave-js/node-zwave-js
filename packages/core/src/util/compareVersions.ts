import { padVersion } from "@zwave-js/shared/safe";
import semverGt from "semver/functions/gt.js";
import semverGte from "semver/functions/gte.js";
import semverLt from "semver/functions/lt.js";
import semverLte from "semver/functions/lte.js";
import { type MaybeNotKnown } from "../values/Primitive.js";

/** Checks if the SDK version is greater than the given one */
export function sdkVersionGt(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semverGt(padVersion(sdkVersion), padVersion(compareVersion));
}

/** Checks if the SDK version is greater than or equal to the given one */
export function sdkVersionGte(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semverGte(padVersion(sdkVersion), padVersion(compareVersion));
}

/** Checks if the SDK version is lower than the given one */
export function sdkVersionLt(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semverLt(padVersion(sdkVersion), padVersion(compareVersion));
}

/** Checks if the SDK version is lower than or equal to the given one */
export function sdkVersionLte(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semverLte(padVersion(sdkVersion), padVersion(compareVersion));
}
