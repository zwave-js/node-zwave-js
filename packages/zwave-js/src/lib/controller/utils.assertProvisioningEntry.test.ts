import { SecurityClass, assertZWaveError } from "@zwave-js/core";
import { test } from "vitest";
import { ProvisioningEntryStatus } from "./Inclusion.js";
import { assertProvisioningEntry } from "./utils.js";

// A valid DSK
const dsk = "11111-22222-12345-54321-65535-00001-11111-22222";
const status = ProvisioningEntryStatus.Inactive;
const securityClasses = [
	SecurityClass.S2_AccessControl,
	SecurityClass.S2_Unauthenticated,
];

test("should throw if the argument is not an object", (t) => {
	assertZWaveError(t.expect, () => assertProvisioningEntry(undefined), {
		messageMatches: "not an object",
	});

	assertZWaveError(t.expect, () => assertProvisioningEntry(1), {
		messageMatches: "not an object",
	});
});

test("should throw if the argument does not have a valid dsk", (t) => {
	assertZWaveError(t.expect, () => assertProvisioningEntry({}), {
		messageMatches: "dsk must be a string",
	});
	assertZWaveError(t.expect, () => assertProvisioningEntry({ dsk: 1 }), {
		messageMatches: "dsk must be a string",
	});
	assertZWaveError(t.expect, () => assertProvisioningEntry({ dsk: "abc" }), {
		messageMatches: "dsk does not have the correct format",
	});
});

test("should throw if the status is invalid", (t) => {
	assertZWaveError(
		t.expect,
		() =>
			assertProvisioningEntry({
				dsk,
				status: -1,
			}),
		{ messageMatches: "not a ProvisioningEntryStatus" },
	);
	assertZWaveError(
		t.expect,
		() =>
			assertProvisioningEntry({
				dsk,
				status: true,
			}),
		{ messageMatches: "not a ProvisioningEntryStatus" },
	);
});

test("should throw if the securityClasses are invalid", (t) => {
	assertZWaveError(
		t.expect,
		() =>
			assertProvisioningEntry({
				dsk,
				status,
				securityClasses: 1,
			}),
		{ messageMatches: "securityClasses must be an array" },
	);
	assertZWaveError(
		t.expect,
		() =>
			assertProvisioningEntry({
				dsk,
				status,
				securityClasses: [1, "1"],
			}),
		{ messageMatches: "securityClasses contains invalid entries" },
	);
});

test("should throw if the requestedSecurityClasses are invalid", (t) => {
	assertZWaveError(
		t.expect,
		() =>
			assertProvisioningEntry({
				dsk,
				status,
				securityClasses,
				requestedSecurityClasses: 1,
			}),
		{ messageMatches: "requestedSecurityClasses must be an array" },
	);
	assertZWaveError(
		t.expect,
		() =>
			assertProvisioningEntry({
				dsk,
				status,
				securityClasses,
				requestedSecurityClasses: [1, "1"],
			}),
		{
			messageMatches: "requestedSecurityClasses contains invalid entries",
		},
	);
});

test("happy path", (t) => {
	assertProvisioningEntry({
		dsk,
		securityClasses: [SecurityClass.S0_Legacy],
	});

	assertProvisioningEntry({
		dsk,
		securityClasses: [SecurityClass.S0_Legacy],
		status: ProvisioningEntryStatus.Active,
		requestedSecurityClasses: [SecurityClass.S0_Legacy],
	});
});
