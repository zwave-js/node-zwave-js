import {
	type MaybeNotKnown,
	Protocols,
	SecurityClass,
	ZWaveError,
	ZWaveErrorCodes,
	isValidDSK,
} from "@zwave-js/core/safe";
import { padVersion } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import semver from "semver";
import { type Task } from "../driver/Task";
import {
	type PlannedProvisioningEntry,
	ProvisioningEntryStatus,
} from "./Inclusion";

export function assertProvisioningEntry(
	arg: any,
): asserts arg is PlannedProvisioningEntry {
	function fail(why: string): never {
		throw new ZWaveError(
			`Invalid provisioning entry: ${why}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	if (!isObject(arg)) fail("not an object");

	if (typeof arg.dsk !== "string") fail("dsk must be a string");
	else if (!isValidDSK(arg.dsk)) {
		fail("dsk does not have the correct format");
	}

	if (
		arg.status != undefined
		&& (typeof arg.status !== "number"
			|| !(arg.status in ProvisioningEntryStatus))
	) {
		fail("status is not a ProvisioningEntryStatus");
	}

	if (!isArray(arg.securityClasses)) {
		fail("securityClasses must be an array");
	} else if (
		!arg.securityClasses.every(
			(sc: any) => typeof sc === "number" && sc in SecurityClass,
		)
	) {
		fail("securityClasses contains invalid entries");
	}

	if (arg.requestedSecurityClasses != undefined) {
		if (!isArray(arg.requestedSecurityClasses)) {
			fail("requestedSecurityClasses must be an array");
		} else if (
			!arg.requestedSecurityClasses.every(
				(sc: any) => typeof sc === "number" && sc in SecurityClass,
			)
		) {
			{
				fail("requestedSecurityClasses contains invalid entries");
			}
		}
	}

	if (
		arg.protocol != undefined
		&& (typeof arg.protocol !== "number" || !(arg.protocol in Protocols))
	) {
		fail("protocol is not a valid");
	}

	if (arg.supportedProtocols != undefined) {
		if (!isArray(arg.supportedProtocols)) {
			fail("supportedProtocols must be an array");
		} else if (
			!arg.supportedProtocols.every(
				(p: any) => typeof p === "number" && p in Protocols,
			)
		) {
			fail("supportedProtocols contains invalid entries");
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

/** Checks if a task belongs to a route rebuilding process */
export function isRebuildRoutesTask(t: Task<unknown>): boolean {
	return t.tag?.id === "rebuild-routes"
		|| t.tag?.id === "rebuild-node-routes";
}
