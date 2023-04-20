"use strict";
/** Management class and utils for Security S2 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager2 = exports.MPANState = exports.SPANState = void 0;
const shared_1 = require("@zwave-js/shared");
const crypto = __importStar(require("crypto"));
const ZWaveError_1 = require("../error/ZWaveError");
const index_safe_1 = require("../index_safe");
const date_1 = require("../util/date");
const bufferUtils_1 = require("./bufferUtils");
const crypto_1 = require("./crypto");
const ctr_drbg_1 = require("./ctr_drbg");
const SecurityClass_1 = require("./SecurityClass");
var SPANState;
(function (SPANState) {
    /** No entry exists */
    SPANState[SPANState["None"] = 0] = "None";
    /* The other node's receiver's entropy input is known but, but we didn't send it our sender's EI yet */
    SPANState[SPANState["RemoteEI"] = 1] = "RemoteEI";
    /* We've sent the other node our receiver's entropy input, but we didn't receive its sender's EI yet */
    SPANState[SPANState["LocalEI"] = 2] = "LocalEI";
    /* An SPAN with the other node has been established */
    SPANState[SPANState["SPAN"] = 3] = "SPAN";
})(SPANState = exports.SPANState || (exports.SPANState = {}));
var MPANState;
(function (MPANState) {
    /** No entry exists */
    MPANState[MPANState["None"] = 0] = "None";
    /** The group is in use, but no MPAN was received yet, or it is out of sync */
    MPANState[MPANState["OutOfSync"] = 1] = "OutOfSync";
    /** An MPAN has been established */
    MPANState[MPANState["MPAN"] = 2] = "MPAN";
})(MPANState = exports.MPANState || (exports.MPANState = {}));
// How many sequence numbers are remembered for each node when checking for duplicates
const SINGLECAST_MAX_SEQ_NUMS = 10;
// How long a singlecast nonce used for encryption will be kept around to attempt decryption of in-flight messages
const SINGLECAST_NONCE_EXPIRY_NS = 500 * 1000 * 1000; // 500 ms in nanoseconds
class SecurityManager2 {
    constructor() {
        /** A map of SPAN states for each node */
        this.spanTable = new Map();
        /** A map of temporary keys for each node that are used for the key exchange */
        this.tempKeys = new Map();
        /** A map of sequence numbers that were last used in communication with a node */
        this.ownSequenceNumbers = new Map();
        this.peerSequenceNumbers = new Map();
        /** A map of the inner MPAN states for each multicast group we manage */
        this.mpanStates = new Map();
        /** MPANs used to decrypt multicast messages from other nodes. Peer Node ID -> Multicast Group -> MPAN */
        this.peerMPANs = new Map();
        /** A map of permanent network keys per security class */
        this.networkKeys = new Map();
        /** A map of the defined multicast groups */
        this.multicastGroups = new Map();
        /** Reverse lookup from node IDs (as stringified bitmask) to multicast group ID */
        this.multicastGroupLookup = new Map();
        this.getNextMulticastGroupId = (0, shared_1.createWrappingCounter)(255);
        this.rng = new ctr_drbg_1.CtrDRBG(128, false, crypto.randomBytes(32), undefined, Buffer.alloc(32, 0));
    }
    /** Sets the PNK for a given security class and derives the encryption keys from it */
    setKey(securityClass, key) {
        if (key.length !== 16) {
            throw new ZWaveError_1.ZWaveError(`The network key must consist of 16 bytes!`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (!(securityClass in SecurityClass_1.SecurityClass) ||
            securityClass <= SecurityClass_1.SecurityClass.None) {
            throw new ZWaveError_1.ZWaveError(`Invalid security class!`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this.networkKeys.set(securityClass, {
            pnk: key,
            ...(0, crypto_1.deriveNetworkKeys)(key),
        });
    }
    /**
     * Creates (or re-uses) a multicast group for the given node IDs and remembers the security class.
     * The returned value is the group ID to be used in multicast commands
     */
    createMulticastGroup(nodeIDs, s2SecurityClass) {
        // Check if we already have a group for these nodes
        const newHash = (0, index_safe_1.encodeNodeBitMask)(nodeIDs).toString("hex");
        if (this.multicastGroupLookup.has(newHash)) {
            return this.multicastGroupLookup.get(newHash);
        }
        // If not, generate a new group ID
        const groupId = this.getNextMulticastGroupId();
        // The group ID may already be occupied. In that case, forget the old group
        if (this.multicastGroups.has(groupId)) {
            const oldGroup = this.multicastGroups.get(groupId);
            this.multicastGroups.delete(groupId);
            const oldHash = (0, index_safe_1.encodeNodeBitMask)(oldGroup.nodeIDs).toString("hex");
            this.multicastGroupLookup.delete(oldHash);
        }
        // Remember the new group
        this.multicastGroups.set(groupId, {
            nodeIDs,
            securityClass: s2SecurityClass,
            sequenceNumber: crypto.randomInt(256),
        });
        this.multicastGroupLookup.set(newHash, groupId);
        // And reset the MPAN state
        this.mpanStates.delete(groupId);
        return groupId;
    }
    getMulticastGroup(group) {
        return this.multicastGroups.get(group);
    }
    hasKeysForSecurityClass(securityClass) {
        return this.networkKeys.has(securityClass);
    }
    getKeysForSecurityClass(securityClass) {
        const keys = this.networkKeys.get(securityClass);
        if (!keys) {
            throw new ZWaveError_1.ZWaveError(`The network key for the security class ${(0, shared_1.getEnumMemberName)(SecurityClass_1.SecurityClass, securityClass)} has not been set up yet!`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        return { ...keys };
    }
    getKeysForNode(peerNodeID) {
        const spanState = this.getSPANState(peerNodeID);
        // The keys we return must match the actual SPAN state (if we have one)
        // Meaning if an SPAN for the temporary inclusion key is established,
        // we need to return that temporary key
        if (spanState.type === SPANState.SPAN &&
            spanState.securityClass === SecurityClass_1.SecurityClass.Temporary) {
            if (this.tempKeys.has(peerNodeID))
                return this.tempKeys.get(peerNodeID);
            throw new ZWaveError_1.ZWaveError(`Temporary encryption key for node ${peerNodeID} is not known!`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        else if (spanState.type !== SPANState.SPAN) {
            throw new ZWaveError_1.ZWaveError(`Security class for node ${peerNodeID} is not yet known!`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        return this.getKeysForSecurityClass(spanState.securityClass);
    }
    getSPANState(peerNodeID) {
        return this.spanTable.get(peerNodeID) ?? { type: SPANState.None };
    }
    /** Tests whether the most recent secure command for a node has used the given security class */
    hasUsedSecurityClass(peerNodeID, securityClass) {
        const spanState = this.spanTable.get(peerNodeID);
        if (!spanState)
            return false;
        if (spanState.type !== SPANState.SPAN)
            return false;
        return spanState.securityClass === securityClass;
    }
    /**
     * Prepares the generation of a new SPAN by creating a random sequence number and (local) entropy input
     * @param receiver The node this nonce is for. If none is given, the nonce is not stored.
     */
    generateNonce(receiver) {
        const receiverEI = this.rng.generate(16);
        if (receiver != undefined) {
            this.spanTable.set(receiver, {
                type: SPANState.LocalEI,
                receiverEI,
            });
        }
        return receiverEI;
    }
    /**
     * Stores the given SPAN state in the table. This should NEVER be called by user code.
     */
    setSPANState(peerNodeID, state) {
        if (state.type === SPANState.None) {
            this.spanTable.delete(peerNodeID);
        }
        else {
            this.spanTable.set(peerNodeID, state);
        }
    }
    /** Invalidates the SPAN state for the given receiver */
    deleteNonce(receiver) {
        this.spanTable.delete(receiver);
        this.peerSequenceNumbers.delete(receiver);
        // Keep our own sequence number
    }
    /** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
    initializeSPAN(peerNodeId, securityClass, senderEI, receiverEI) {
        if (senderEI.length !== 16 || receiverEI.length !== 16) {
            throw new ZWaveError_1.ZWaveError(`The entropy input must consist of 16 bytes`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const keys = this.getKeysForSecurityClass(securityClass);
        const noncePRK = (0, crypto_1.computeNoncePRK)(senderEI, receiverEI);
        const MEI = (0, crypto_1.deriveMEI)(noncePRK);
        this.spanTable.set(peerNodeId, {
            securityClass,
            type: SPANState.SPAN,
            rng: new ctr_drbg_1.CtrDRBG(128, false, MEI, undefined, keys.personalizationString),
        });
    }
    /** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
    initializeTempSPAN(peerNodeId, senderEI, receiverEI) {
        if (senderEI.length !== 16 || receiverEI.length !== 16) {
            throw new ZWaveError_1.ZWaveError(`The entropy input must consist of 16 bytes`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const keys = this.tempKeys.get(peerNodeId);
        const noncePRK = (0, crypto_1.computeNoncePRK)(senderEI, receiverEI);
        const MEI = (0, crypto_1.deriveMEI)(noncePRK);
        this.spanTable.set(peerNodeId, {
            securityClass: SecurityClass_1.SecurityClass.Temporary,
            type: SPANState.SPAN,
            rng: new ctr_drbg_1.CtrDRBG(128, false, MEI, undefined, keys.personalizationString),
        });
    }
    /** Tests if the given combination of peer node ID and sequence number is a duplicate */
    isDuplicateSinglecast(peerNodeId, sequenceNumber) {
        return (this.peerSequenceNumbers
            .get(peerNodeId)
            ?.includes(sequenceNumber) ?? false);
    }
    /** Stores the latest sequence number for the given peer node ID and returns the previous one */
    storeSequenceNumber(peerNodeId, sequenceNumber) {
        if (this.peerSequenceNumbers.has(peerNodeId)) {
            // Store the last SINGLECAST_MAX_SEQ_NUMS sequence numbers
            const arr = this.peerSequenceNumbers.get(peerNodeId);
            const prev = arr[arr.length - 1];
            arr.push(sequenceNumber);
            if (arr.length > SINGLECAST_MAX_SEQ_NUMS)
                arr.shift();
            return prev;
        }
        else {
            this.peerSequenceNumbers.set(peerNodeId, [sequenceNumber]);
        }
    }
    storeRemoteEI(peerNodeId, remoteEI) {
        if (remoteEI.length !== 16) {
            throw new ZWaveError_1.ZWaveError(`The entropy input must consist of 16 bytes`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this.spanTable.set(peerNodeId, {
            type: SPANState.RemoteEI,
            receiverEI: remoteEI,
        });
    }
    /**
     * Generates the next nonce for the given peer and returns it.
     * @param store - Whether the nonce should be stored/remembered as the current SPAN.
     */
    nextNonce(peerNodeId, store) {
        const spanState = this.spanTable.get(peerNodeId);
        if (spanState?.type !== SPANState.SPAN) {
            throw new ZWaveError_1.ZWaveError(`The Singlecast PAN has not been initialized for Node ${peerNodeId}`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        const nonce = spanState.rng.generate(16).slice(0, 13);
        spanState.currentSPAN = store
            ? {
                nonce,
                expires: (0, date_1.highResTimestamp)() + SINGLECAST_NONCE_EXPIRY_NS,
            }
            : undefined;
        return nonce;
    }
    /** Returns the next sequence number to use for outgoing messages to the given node */
    nextSequenceNumber(peerNodeId) {
        let seq = this.ownSequenceNumbers.get(peerNodeId);
        if (seq == undefined) {
            seq = crypto.randomInt(256);
        }
        else {
            seq = (seq + 1) & 0xff;
        }
        this.ownSequenceNumbers.set(peerNodeId, seq);
        return seq;
    }
    /** Returns the next sequence number to use for outgoing messages to the given multicast group */
    nextMulticastSequenceNumber(groupId) {
        const group = this.multicastGroups.get(groupId);
        if (!group) {
            throw new ZWaveError_1.ZWaveError(`Multicast group ${groupId} does not exist!`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        let seq = group.sequenceNumber;
        seq = (seq + 1) & 0xff;
        group.sequenceNumber = seq;
        return seq;
    }
    getInnerMPANState(groupId) {
        return this.mpanStates.get(groupId);
    }
    getMulticastKeyAndIV(groupId) {
        const group = this.getMulticastGroup(groupId);
        if (!group) {
            throw new ZWaveError_1.ZWaveError(`Multicast group ${groupId} does not exist!`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        const keys = this.getKeysForSecurityClass(group.securityClass);
        // We may have to initialize the inner MPAN state
        if (!this.mpanStates.has(groupId)) {
            this.mpanStates.set(groupId, this.rng.generate(16));
        }
        // Compute the next MPAN
        const stateN = this.mpanStates.get(groupId);
        // The specs don't mention this step for multicast, but the IV for AES-CCM is limited to 13 bytes
        const ret = (0, crypto_1.encryptAES128ECB)(stateN, keys.keyMPAN).slice(0, 13);
        // Increment the inner state
        (0, bufferUtils_1.increment)(stateN);
        return {
            key: keys.keyCCM,
            iv: ret,
        };
    }
    /** As part of MPAN maintenance, this increments our own MPAN for a group */
    tryIncrementMPAN(groupId) {
        const stateN = this.mpanStates.get(groupId);
        if (stateN)
            (0, bufferUtils_1.increment)(stateN);
    }
    /**
     * Generates the next nonce for the given peer and returns it.
     */
    nextPeerMPAN(peerNodeId, groupId) {
        const mpanState = this.getPeerMPAN(peerNodeId, groupId);
        if (mpanState.type !== MPANState.MPAN) {
            throw new ZWaveError_1.ZWaveError(`No peer multicast PAN exists for Node ${peerNodeId}, group ${groupId}`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        const keys = this.getKeysForNode(peerNodeId);
        if (!keys || !("keyMPAN" in keys)) {
            throw new ZWaveError_1.ZWaveError(`The network keys for the security class of Node ${peerNodeId} have not been set up yet!`, ZWaveError_1.ZWaveErrorCodes.Security2CC_NotInitialized);
        }
        // Compute the next MPAN
        const stateN = mpanState.currentMPAN;
        const ret = (0, crypto_1.encryptAES128ECB)(stateN, keys.keyMPAN);
        // Increment the inner state
        (0, bufferUtils_1.increment)(stateN);
        return ret;
    }
    /** As part of MPAN maintenance, this increments the peer's MPAN if it is known */
    tryIncrementPeerMPAN(peerNodeId, groupId) {
        const mpanState = this.getPeerMPAN(peerNodeId, groupId);
        if (mpanState?.type !== MPANState.MPAN)
            return;
        const stateN = mpanState.currentMPAN;
        (0, bufferUtils_1.increment)(stateN);
    }
    /** Returns the stored MPAN used to decrypt messages from `peerNodeId`, MPAN group `groupId` */
    getPeerMPAN(peerNodeId, groupId) {
        return (this.peerMPANs.get(peerNodeId)?.get(groupId) ?? {
            type: MPANState.None,
        });
    }
    /** Reset all out of sync MPANs for the given node */
    resetOutOfSyncMPANs(peerNodeId) {
        const entries = this.peerMPANs.get(peerNodeId);
        if (!entries)
            return;
        for (const [groupId, state] of entries) {
            if (state.type === MPANState.OutOfSync) {
                entries.delete(groupId);
            }
        }
    }
    storePeerMPAN(peerNodeId, groupId, mpanState) {
        if (!this.peerMPANs.has(peerNodeId)) {
            this.peerMPANs.set(peerNodeId, new Map());
        }
        this.peerMPANs.get(peerNodeId).set(groupId, mpanState);
    }
}
exports.SecurityManager2 = SecurityManager2;
//# sourceMappingURL=Manager2.js.map