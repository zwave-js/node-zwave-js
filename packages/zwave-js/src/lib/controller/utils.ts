import {
	isValidDSK,
	MaybeNotKnown,
	SecurityClass,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import { padVersion } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import semver from "semver";
import {
	ProvisioningEntryStatus,
	type PlannedProvisioningEntry,
} from "./Inclusion";

export function assertProvisioningEntry(
	arg: any,
): asserts arg is PlannedProvisioningEntry {
	const fail = (why: string) => {
		throw new ZWaveError(
			`Invalid provisioning entry: ${why}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	};

	if (!isObject(arg)) throw fail("not an object");

	if (typeof arg.dsk !== "string") throw fail("dsk must be a string");
	else if (!isValidDSK(arg.dsk))
		throw fail("dsk does not have the correct format");

	if (
		arg.status != undefined &&
		(typeof arg.status !== "number" ||
			!(arg.status in ProvisioningEntryStatus))
	) {
		throw fail("status is not a ProvisioningEntryStatus");
	}

	if (!isArray(arg.securityClasses)) {
		throw fail("securityClasses must be an array");
	} else if (
		!arg.securityClasses.every(
			(sc: any) => typeof sc === "number" && sc in SecurityClass,
		)
	) {
		throw fail("securityClasses contains invalid entries");
	}

	if (arg.requestedSecurityClasses != undefined) {
		if (!isArray(arg.requestedSecurityClasses)) {
			throw fail("requestedSecurityClasses must be an array");
		} else if (
			!arg.requestedSecurityClasses.every(
				(sc: any) => typeof sc === "number" && sc in SecurityClass,
			)
		) {
			{
				throw fail("requestedSecurityClasses contains invalid entries");
			}
		}
	}
}

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
