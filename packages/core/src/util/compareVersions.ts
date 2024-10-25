import { padVersion } from "@zwave-js/shared";
import semver from "semver";
import { type MaybeNotKnown } from "../values/Primitive";

/** Checks if the SDK version is greater than the given one */
export function sdkVersionGt(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semver.gt(padVersion(sdkVersion), padVersion(compareVersion));
}

/** Checks if the SDK version is greater than or equal to the given one */
export function sdkVersionGte(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semver.gte(padVersion(sdkVersion), padVersion(compareVersion));
}

/** Checks if the SDK version is lower than the given one */
export function sdkVersionLt(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semver.lt(padVersion(sdkVersion), padVersion(compareVersion));
}

/** Checks if the SDK version is lower than or equal to the given one */
export function sdkVersionLte(
	sdkVersion: MaybeNotKnown<string>,
	compareVersion: string,
): MaybeNotKnown<boolean> {
	if (sdkVersion === undefined) {
		return undefined;
	}
	return semver.lte(padVersion(sdkVersion), padVersion(compareVersion));
}
