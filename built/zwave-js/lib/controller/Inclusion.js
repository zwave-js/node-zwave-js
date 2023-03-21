"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InclusionState = exports.ProvisioningEntryStatus = exports.ExclusionStrategy = exports.InclusionStrategy = exports.SecurityBootstrapFailure = void 0;
var SecurityBootstrapFailure;
(function (SecurityBootstrapFailure) {
    /** Security bootstrapping was canceled by the user */
    SecurityBootstrapFailure[SecurityBootstrapFailure["UserCanceled"] = 0] = "UserCanceled";
    /** The required security keys were not configured in the driver */
    SecurityBootstrapFailure[SecurityBootstrapFailure["NoKeysConfigured"] = 1] = "NoKeysConfigured";
    /** No Security S2 user callbacks (or provisioning info) were provided to grant security classes and/or validate the DSK. */
    SecurityBootstrapFailure[SecurityBootstrapFailure["S2NoUserCallbacks"] = 2] = "S2NoUserCallbacks";
    /** An expected message was not received within the corresponding timeout */
    SecurityBootstrapFailure[SecurityBootstrapFailure["Timeout"] = 3] = "Timeout";
    /** There was no possible match in encryption parameters between the controller and the node */
    SecurityBootstrapFailure[SecurityBootstrapFailure["ParameterMismatch"] = 4] = "ParameterMismatch";
    /** Security bootstrapping was canceled by the included node */
    SecurityBootstrapFailure[SecurityBootstrapFailure["NodeCanceled"] = 5] = "NodeCanceled";
    /** The PIN was incorrect, so the included node could not decode the key exchange commands */
    SecurityBootstrapFailure[SecurityBootstrapFailure["S2IncorrectPIN"] = 6] = "S2IncorrectPIN";
    /** There was a mismatch in security keys between the controller and the node */
    SecurityBootstrapFailure[SecurityBootstrapFailure["S2WrongSecurityLevel"] = 7] = "S2WrongSecurityLevel";
    /** Some other unspecified error happened */
    SecurityBootstrapFailure[SecurityBootstrapFailure["Unknown"] = 8] = "Unknown";
})(SecurityBootstrapFailure = exports.SecurityBootstrapFailure || (exports.SecurityBootstrapFailure = {}));
var InclusionStrategy;
(function (InclusionStrategy) {
    /**
     * Always uses Security S2 if supported, otherwise uses Security S0 for certain devices which don't work without encryption and uses no encryption otherwise.
     *
     * Issues a warning if Security S0 or S2 is supported, but the secure bootstrapping fails.
     *
     * **This is the recommended** strategy and should be used unless there is a good reason not to.
     */
    InclusionStrategy[InclusionStrategy["Default"] = 0] = "Default";
    /**
     * Include using SmartStart (requires Security S2).
     *
     * **Note:** This will be used internally and cannot be used by applications
     */
    InclusionStrategy[InclusionStrategy["SmartStart"] = 1] = "SmartStart";
    /**
     * Don't use encryption, even if supported.
     *
     * **Not recommended**, because S2 should be used where possible.
     */
    InclusionStrategy[InclusionStrategy["Insecure"] = 2] = "Insecure";
    /**
     * Use Security S0, even if a higher security mode is supported.
     *
     * Issues a warning if Security S0 is not supported or the secure bootstrapping fails.
     *
     * **Not recommended** because S0 should be used sparingly and S2 preferred wherever possible.
     */
    InclusionStrategy[InclusionStrategy["Security_S0"] = 3] = "Security_S0";
    /**
     * Use Security S2 and issue a warning if it is not supported or the secure bootstrapping fails.
     *
     * **Not recommended** because the *Default* strategy is more versatile and user-friendly.
     */
    InclusionStrategy[InclusionStrategy["Security_S2"] = 4] = "Security_S2";
})(InclusionStrategy = exports.InclusionStrategy || (exports.InclusionStrategy = {}));
var ExclusionStrategy;
(function (ExclusionStrategy) {
    /** Exclude the node, keep the provisioning entry untouched */
    ExclusionStrategy[ExclusionStrategy["ExcludeOnly"] = 0] = "ExcludeOnly";
    /** Disable the node's Smart Start provisioning entry, but do not remove it */
    ExclusionStrategy[ExclusionStrategy["DisableProvisioningEntry"] = 1] = "DisableProvisioningEntry";
    /** Remove the node from the Smart Start provisioning list  */
    ExclusionStrategy[ExclusionStrategy["Unprovision"] = 2] = "Unprovision";
})(ExclusionStrategy = exports.ExclusionStrategy || (exports.ExclusionStrategy = {}));
var ProvisioningEntryStatus;
(function (ProvisioningEntryStatus) {
    ProvisioningEntryStatus[ProvisioningEntryStatus["Active"] = 0] = "Active";
    ProvisioningEntryStatus[ProvisioningEntryStatus["Inactive"] = 1] = "Inactive";
})(ProvisioningEntryStatus = exports.ProvisioningEntryStatus || (exports.ProvisioningEntryStatus = {}));
var InclusionState;
(function (InclusionState) {
    /** The controller isn't doing anything regarding inclusion. */
    InclusionState[InclusionState["Idle"] = 0] = "Idle";
    /** The controller is waiting for a node to be included. */
    InclusionState[InclusionState["Including"] = 1] = "Including";
    /** The controller is waiting for a node to be excluded. */
    InclusionState[InclusionState["Excluding"] = 2] = "Excluding";
    /** The controller is busy including or excluding a node. */
    InclusionState[InclusionState["Busy"] = 3] = "Busy";
    /** The controller listening for SmartStart nodes to announce themselves. */
    InclusionState[InclusionState["SmartStart"] = 4] = "SmartStart";
})(InclusionState = exports.InclusionState || (exports.InclusionState = {}));
//# sourceMappingURL=Inclusion.js.map