import { getImplementedVersion } from "@zwave-js/cc";
import {
	type CommandClasses,
	type MaybeNotKnown,
	type SecurityClass,
	type SecurityManager,
	type SecurityManager2,
} from "@zwave-js/core";
import { type ZWaveHost } from "@zwave-js/host";

export class ZnifferCCParsingContext implements ZWaveHost {
	public constructor(
		public readonly ownNodeId: number,
		public readonly homeId: number,
	) {}

	securityManager: SecurityManager | undefined;
	securityManager2: SecurityManager2 | undefined;

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
		throw new Error("Method not implemented.");
	}

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean> {
		throw new Error("Method not implemented.");
	}

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void {
		throw new Error("Method not implemented.");
	}

	getNextCallbackId(): number {
		throw new Error("Method not implemented.");
	}

	getNextSupervisionSessionId(nodeId: number): number {
		throw new Error("Method not implemented.");
	}
}
