import type { SecurityClass } from "@zwave-js/core/safe";

/** Additional information about the outcome of a node inclusion */
export interface InclusionResult {
	/** This flag warns that a node was included with a lower than intended security, meaning unencrypted when it should have been included with Security S0/S2 */
	lowSecurity?: boolean;
}

export enum InclusionStrategy {
	/**
	 * Always uses Security S2 if supported, otherwise uses Security S0 for certain devices which don't work without encryption and uses no encryption otherwise.
	 *
	 * Issues a warning if Security S0 or S2 is supported, but the secure bootstrapping fails.
	 *
	 * **This is the recommended** strategy and should be used unless there is a good reason not to.
	 */
	Default = 0,

	/**
	 * Include using SmartStart (requires Security S2).
	 *
	 * **Note:** This will be used internally and cannot be used by applications
	 */
	SmartStart,

	/**
	 * Don't use encryption, even if supported.
	 *
	 * **Not recommended**, because S2 should be used where possible.
	 */
	Insecure,
	/**
	 * Use Security S0, even if a higher security mode is supported.
	 *
	 * Issues a warning if Security S0 is not supported or the secure bootstrapping fails.
	 *
	 * **Not recommended** because S0 should be used sparingly and S2 preferred whereever possible.
	 */
	Security_S0,
	/**
	 * Use Security S2 and issue a warning if it is not supported or the secure bootstrapping fails.
	 *
	 * **Not recommended** because the *Default* strategy is more versatile and user-friendly.
	 */
	Security_S2,
}

export interface InclusionGrant {
	/**
	 * An array of security classes that are requested or to be granted.
	 * The granted security classes MUST be a subset of the requested ones.
	 */
	securityClasses: SecurityClass[];
	/** Whether client side authentication is requested or to be granted */
	clientSideAuth: boolean;
}

/** Defines the callbacks that are necessary to trigger user interaction during S2 inclusion */
export interface InclusionUserCallbacks {
	/**
	 * Instruct the application to display the user which security classes the device has requested and whether client-side authentication (CSA) is desired.
	 * The returned promise MUST resolve to the user selection - which of the requested security classes have been granted and whether CSA was allowed.
	 * If the user did not accept the requested security classes, the promise MUST resolve to `false`.
	 */
	grantSecurityClasses(
		requested: InclusionGrant,
	): Promise<InclusionGrant | false>;

	/**
	 * Instruct the application to display the received DSK for the user to verify if it matches the one belonging to the device and
	 * additionally enter the PIN that's found on the device.
	 * The returned promise MUST resolve to the 5-digit PIN (as a string) when the user has confirmed the DSK and entered the PIN and `false` otherwise.
	 *
	 * @param dsk The partial DSK in the form `-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222`. The first 5 characters are left out because they are the unknown PIN.
	 */
	validateDSKAndEnterPIN(dsk: string): Promise<string | false>;

	/** Called by the driver when the user validation has timed out and needs to be aborted */
	abort(): void;
}

/** Options for inclusion of a new node */
export type InclusionOptions =
	| {
			strategy: InclusionStrategy.Default;
			userCallbacks: InclusionUserCallbacks;
			/**
			 * Force secure communication (S0) even when S2 is not supported and S0 is supported but not necessary.
			 * This is not recommended due to the overhead caused by S0.
			 */
			forceSecurity?: boolean;
	  }
	| {
			strategy: InclusionStrategy.Security_S2;
			userCallbacks: InclusionUserCallbacks;
	  }
	| {
			strategy: InclusionStrategy.Security_S2;
			provisioning: PlannedProvisioningEntry;
	  }
	| {
			strategy:
				| InclusionStrategy.Insecure
				| InclusionStrategy.Security_S0;
	  };

/**
 * Options for inclusion of a new node, including SmartStart
 * @internal
 */
export type InclusionOptionsInternal =
	| InclusionOptions
	| {
			strategy: InclusionStrategy.SmartStart;
			provisioning: PlannedProvisioningEntry;
	  };

/** Options for replacing a node */
export type ReplaceNodeOptions =
	// We don't know which security CCs a node supports when it is a replacement
	// Therefore we need the user to specify how the node should be included
	| {
			strategy: InclusionStrategy.Security_S2;
			userCallbacks: InclusionUserCallbacks;
	  }
	| {
			strategy: InclusionStrategy.Security_S2;
			provisioning: PlannedProvisioningEntry;
	  }
	| {
			strategy:
				| InclusionStrategy.Insecure
				| InclusionStrategy.Security_S0;
	  };

export enum ProvisioningEntryStatus {
	Active,
	Inactive,
}

export interface PlannedProvisioningEntry {
	/**
	 * The status of this provisioning entry, which is assumed to be active by default.
	 * Inactive entries do not get included automatically.
	 */
	status?: ProvisioningEntryStatus;

	/** The device specific key (DSK) in the form aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222 */
	dsk: string;

	/** The security classes that have been **granted** by the user */
	securityClasses: SecurityClass[];
	/**
	 * The security classes that were **requested** by the device.
	 * When this is not set, applications should default to {@link securityClasses} instead.
	 */
	requestedSecurityClasses?: readonly SecurityClass[];

	/**
	 * Additional properties to be stored in this provisioning entry, e.g. the device ID from a scanned QR code
	 */
	[prop: string]: any;
}

export interface IncludedProvisioningEntry extends PlannedProvisioningEntry {
	nodeId: number;
}

export type SmartStartProvisioningEntry =
	| PlannedProvisioningEntry
	| IncludedProvisioningEntry;

export enum InclusionState {
	/** The controller isn't doing anything regarding inclusion. */
	Idle,
	/** The controller is waiting for a node to be included. */
	Including,
	/** The controller is waiting for a node to be excluded. */
	Excluding,
	/** The controller is busy including or excluding a node. */
	Busy,
	/** The controller listening for SmartStart nodes to announce themselves. */
	SmartStart,
}
