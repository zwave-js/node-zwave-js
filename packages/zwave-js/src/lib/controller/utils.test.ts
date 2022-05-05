import { assertZWaveError, SecurityClass } from "@zwave-js/core";
import { ProvisioningEntryStatus } from "./Inclusion";
import { assertProvisioningEntry } from "./utils";

// A valid DSK
const dsk = "11111-22222-12345-54321-99999-00001-11111-22222";
const status = ProvisioningEntryStatus.Inactive;
const securityClasses = [
	SecurityClass.S2_AccessControl,
	SecurityClass.S2_Unauthenticated,
];

describe("controller/utils", () => {
	describe("assertProvisioningEntry", () => {
		it("should throw if the argument is not an object", () => {
			assertZWaveError(() => assertProvisioningEntry(undefined), {
				messageMatches: "not an object",
			});

			assertZWaveError(() => assertProvisioningEntry(1), {
				messageMatches: "not an object",
			});
		});

		it("should throw if the argument does not have a valid dsk", () => {
			assertZWaveError(() => assertProvisioningEntry({}), {
				messageMatches: "dsk must be a string",
			});
			assertZWaveError(() => assertProvisioningEntry({ dsk: 1 }), {
				messageMatches: "dsk must be a string",
			});
			assertZWaveError(() => assertProvisioningEntry({ dsk: "abc" }), {
				messageMatches: "dsk does not have the correct format",
			});
		});

		it("should throw if the status is invalid", () => {
			assertZWaveError(
				() =>
					assertProvisioningEntry({
						dsk,
						status: -1,
					}),
				{ messageMatches: "not a ProvisioningEntryStatus" },
			);
			assertZWaveError(
				() =>
					assertProvisioningEntry({
						dsk,
						status: true,
					}),
				{ messageMatches: "not a ProvisioningEntryStatus" },
			);
		});

		it("should throw if the securityClasses are invalid", () => {
			assertZWaveError(
				() =>
					assertProvisioningEntry({
						dsk,
						status,
						securityClasses: 1,
					}),
				{ messageMatches: "securityClasses must be an array" },
			);
			assertZWaveError(
				() =>
					assertProvisioningEntry({
						dsk,
						status,
						securityClasses: [1, "1"],
					}),
				{ messageMatches: "securityClasses contains invalid entries" },
			);
		});

		it("should throw if the requestedSecurityClasses are invalid", () => {
			assertZWaveError(
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
				() =>
					assertProvisioningEntry({
						dsk,
						status,
						securityClasses,
						requestedSecurityClasses: [1, "1"],
					}),
				{
					messageMatches:
						"requestedSecurityClasses contains invalid entries",
				},
			);
		});

		it("happy path", () => {
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
	});
});
