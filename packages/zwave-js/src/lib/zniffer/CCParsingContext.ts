/* eslint-disable @typescript-eslint/no-unused-vars */
import { getImplementedVersion } from "@zwave-js/cc";
import { DeviceConfig } from "@zwave-js/config";
import {
	type CommandClasses,
	type MaybeNotKnown,
	SecurityClass,
	type SecurityManager,
	type SecurityManager2,
} from "@zwave-js/core";
import { type ZWaveHost } from "@zwave-js/host";

export class ZnifferCCParsingContext implements ZWaveHost {
	public constructor(
		public readonly ownNodeId: number,
		public readonly homeId: number,
		public readonly securityManager: SecurityManager | undefined,
		public readonly securityManager2: SecurityManager2 | undefined,
		public readonly securityManagerLR: SecurityManager2 | undefined,
	) {}

	getSafeCCVersion(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number | undefined,
	): number {
		// We don't know any versions of the node. Try parsing with the highest version we support
		return getImplementedVersion(cc);
	}

	getSupportedCCVersion(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number | undefined,
	): number {
		// We don't know any versions of the node. Try parsing with the highest version we support
		return getImplementedVersion(cc);
	}

	isCCSecure(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number | undefined,
	): boolean {
		// Don't care when parsing
		return false;
	}

	getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass> {
		return SecurityClass.S2_AccessControl;
	}

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean> {
		// We don't actually know. Attempt parsing with all security classes
		return true;
	}

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void {
		// Do nothing
	}

	getNextCallbackId(): number {
		throw new Error("Method not implemented.");
	}

	getNextSupervisionSessionId(nodeId: number): number {
		throw new Error("Method not implemented.");
	}

	getDeviceConfig(nodeId: number): DeviceConfig | undefined {
		// Disable strict validation while parsing certain CCs
		// Most of this stuff isn't actually needed, only the compat flags...
		return new DeviceConfig(
			"unknown.json",
			false,
			"UNKNOWN_MANUFACTURER",
			0x0000,
			"UNKNOWN_PRODUCT",
			"UNKNOWN_DESCRIPTION",
			[],
			{
				min: "0.0",
				max: "255.255",
			},
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			// ...down here:
			{
				disableStrictEntryControlDataValidation: true,
				disableStrictMeasurementValidation: true,
			},
		);
	}
}
