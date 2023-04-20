/** Management class and utils for Security S2 */
/// <reference types="node" />
import { CtrDRBG } from "./ctr_drbg";
import { S2SecurityClass, SecurityClass } from "./SecurityClass";
interface NetworkKeys {
    pnk: Buffer;
    keyCCM: Buffer;
    keyMPAN: Buffer;
    personalizationString: Buffer;
}
interface TempNetworkKeys {
    keyCCM: Buffer;
    personalizationString: Buffer;
}
export declare enum SPANState {
    /** No entry exists */
    None = 0,
    RemoteEI = 1,
    LocalEI = 2,
    SPAN = 3
}
export declare enum MPANState {
    /** No entry exists */
    None = 0,
    /** The group is in use, but no MPAN was received yet, or it is out of sync */
    OutOfSync = 1,
    /** An MPAN has been established */
    MPAN = 2
}
export type SPANTableEntry = {
    type: SPANState.RemoteEI;
    receiverEI: Buffer;
} | {
    type: SPANState.LocalEI;
    receiverEI: Buffer;
} | {
    type: SPANState.SPAN;
    securityClass: SecurityClass;
    rng: CtrDRBG;
    /** The most recent generated SPAN */
    currentSPAN?: {
        nonce: Buffer;
        expires: number;
    };
};
export type MPANTableEntry = {
    type: MPANState.OutOfSync;
} | {
    type: MPANState.MPAN;
    currentMPAN: Buffer;
};
export interface MulticastGroup {
    nodeIDs: readonly number[];
    securityClass: S2SecurityClass;
    sequenceNumber: number;
}
export declare class SecurityManager2 {
    constructor();
    /** PRNG used to initialize the others */
    private rng;
    /** A map of SPAN states for each node */
    private spanTable;
    /** A map of temporary keys for each node that are used for the key exchange */
    readonly tempKeys: Map<number, TempNetworkKeys>;
    /** A map of sequence numbers that were last used in communication with a node */
    private ownSequenceNumbers;
    private peerSequenceNumbers;
    /** A map of the inner MPAN states for each multicast group we manage */
    private mpanStates;
    /** MPANs used to decrypt multicast messages from other nodes. Peer Node ID -> Multicast Group -> MPAN */
    private peerMPANs;
    /** A map of permanent network keys per security class */
    private networkKeys;
    /** A map of the defined multicast groups */
    private multicastGroups;
    /** Reverse lookup from node IDs (as stringified bitmask) to multicast group ID */
    private multicastGroupLookup;
    private getNextMulticastGroupId;
    /** Sets the PNK for a given security class and derives the encryption keys from it */
    setKey(securityClass: SecurityClass, key: Buffer): void;
    /**
     * Creates (or re-uses) a multicast group for the given node IDs and remembers the security class.
     * The returned value is the group ID to be used in multicast commands
     */
    createMulticastGroup(nodeIDs: number[], s2SecurityClass: S2SecurityClass): number;
    getMulticastGroup(group: number): Readonly<MulticastGroup> | undefined;
    hasKeysForSecurityClass(securityClass: SecurityClass): boolean;
    getKeysForSecurityClass(securityClass: SecurityClass): NetworkKeys;
    getKeysForNode(peerNodeID: number): NetworkKeys | TempNetworkKeys;
    getSPANState(peerNodeID: number): SPANTableEntry | {
        type: SPANState.None;
    };
    /** Tests whether the most recent secure command for a node has used the given security class */
    hasUsedSecurityClass(peerNodeID: number, securityClass: SecurityClass): boolean;
    /**
     * Prepares the generation of a new SPAN by creating a random sequence number and (local) entropy input
     * @param receiver The node this nonce is for. If none is given, the nonce is not stored.
     */
    generateNonce(receiver: number | undefined): Buffer;
    /**
     * Stores the given SPAN state in the table. This should NEVER be called by user code.
     */
    setSPANState(peerNodeID: number, state: SPANTableEntry | {
        type: SPANState.None;
    }): void;
    /** Invalidates the SPAN state for the given receiver */
    deleteNonce(receiver: number): void;
    /** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
    initializeSPAN(peerNodeId: number, securityClass: SecurityClass, senderEI: Buffer, receiverEI: Buffer): void;
    /** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
    initializeTempSPAN(peerNodeId: number, senderEI: Buffer, receiverEI: Buffer): void;
    /** Tests if the given combination of peer node ID and sequence number is a duplicate */
    isDuplicateSinglecast(peerNodeId: number, sequenceNumber: number): boolean;
    /** Stores the latest sequence number for the given peer node ID and returns the previous one */
    storeSequenceNumber(peerNodeId: number, sequenceNumber: number): number | undefined;
    storeRemoteEI(peerNodeId: number, remoteEI: Buffer): void;
    /**
     * Generates the next nonce for the given peer and returns it.
     * @param store - Whether the nonce should be stored/remembered as the current SPAN.
     */
    nextNonce(peerNodeId: number, store?: boolean): Buffer;
    /** Returns the next sequence number to use for outgoing messages to the given node */
    nextSequenceNumber(peerNodeId: number): number;
    /** Returns the next sequence number to use for outgoing messages to the given multicast group */
    nextMulticastSequenceNumber(groupId: number): number;
    getInnerMPANState(groupId: number): Buffer | undefined;
    getMulticastKeyAndIV(groupId: number): {
        key: Buffer;
        iv: Buffer;
    };
    /** As part of MPAN maintenance, this increments our own MPAN for a group */
    tryIncrementMPAN(groupId: number): void;
    /**
     * Generates the next nonce for the given peer and returns it.
     */
    nextPeerMPAN(peerNodeId: number, groupId: number): Buffer;
    /** As part of MPAN maintenance, this increments the peer's MPAN if it is known */
    tryIncrementPeerMPAN(peerNodeId: number, groupId: number): void;
    /** Returns the stored MPAN used to decrypt messages from `peerNodeId`, MPAN group `groupId` */
    getPeerMPAN(peerNodeId: number, groupId: number): MPANTableEntry | {
        type: MPANState.None;
    };
    /** Reset all out of sync MPANs for the given node */
    resetOutOfSyncMPANs(peerNodeId: number): void;
    storePeerMPAN(peerNodeId: number, groupId: number, mpanState: MPANTableEntry): void;
}
export {};
//# sourceMappingURL=Manager2.d.ts.map