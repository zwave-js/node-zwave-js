/** Management class and utils for Security S2 */

import { createWrappingCounter, getEnumMemberName } from "@zwave-js/shared";
import * as crypto from "crypto";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { encodeNodeBitMask } from "../index_safe";
import { highResTimestamp } from "../util/date";
import { increment } from "./bufferUtils";
import {
	computeNoncePRK,
	deriveMEI,
	deriveNetworkKeys,
	encryptAES128ECB,
} from "./crypto";
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

export enum SPANState {
	/** No entry exists */
	None = 0,
	/* The other node's receiver's entropy input is known but, but we didn't send it our sender's EI yet */
	RemoteEI,
	/* We've sent the other node our receiver's entropy input, but we didn't receive its sender's EI yet */
	LocalEI,
	/* An SPAN with the other node has been established */
	SPAN,
}

export enum MPANState {
	/** No entry exists */
	None = 0,
	/** The group is in use, but no MPAN was received yet, or it is out of sync */
	OutOfSync,
	/** An MPAN has been established */
	MPAN,
}

export type SPANTableEntry =
	| {
			// We know the other node's receiver's entropy input, but we didn't send it our sender's EI yet
			type: SPANState.RemoteEI;
			receiverEI: Buffer;
	  }
	| {
			// We've sent the other node our receiver's entropy input, but we didn't receive its sender's EI yet
			type: SPANState.LocalEI;
			receiverEI: Buffer;
	  }
	| {
			// We've established an SPAN with the other node
			type: SPANState.SPAN;
			securityClass: SecurityClass;
			rng: CtrDRBG;
			/** The most recent generated SPAN */
			currentSPAN?: {
				nonce: Buffer;
				expires: number;
			};
	  };

export type MPANTableEntry =
	| {
			type: MPANState.OutOfSync;
	  }
	| {
			type: MPANState.MPAN;
			currentMPAN: Buffer;
	  };

export interface MulticastGroup {
	nodeIDs: readonly number[];
	securityClass: S2SecurityClass;
}

// How many sequence numbers are remembered for each node when checking for duplicates
const SINGLECAST_MAX_SEQ_NUMS = 10;
// How long a singlecast nonce used for encryption will be kept around to attempt decryption of in-flight messages
const SINGLECAST_NONCE_EXPIRY_NS = 500 * 1000 * 1000; // 500 ms in nanoseconds

export class SecurityManager2 {
	public constructor() {
		this.rng = new CtrDRBG(
			128,
			false,
			crypto.randomBytes(32),
			undefined,
			Buffer.alloc(32, 0),
		);
	}

	/** PRNG used to initialize the others */
	private rng: CtrDRBG;

	/** A map of SPAN states for each node */
	private spanTable = new Map<number, SPANTableEntry>();
	/** A map of temporary keys for each node that are used for the key exchange */
	public readonly tempKeys = new Map<number, TempNetworkKeys>();
	/** A map of sequence numbers that were last used in communication with a node */
	private ownSequenceNumbers = new Map<number, number>();
	private peerSequenceNumbers = new Map<number, number[]>();
	/** A map of the inner MPAN states for each multicast group we manage */
	private mpanStates = new Map<number, Buffer>();
	/** MPANs used to decrypt multicast messages from other nodes. Peer Node ID -> Multicast Group -> MPAN */
	private peerMPANs = new Map<number, Map<number, MPANTableEntry>>();
	/** A map of permanent network keys per security class */
	private networkKeys = new Map<SecurityClass, NetworkKeys>();
	/** A map of the defined multicast groups */
	private multicastGroups = new Map<number, MulticastGroup>();
	/** Reverse lookup from node IDs (as stringified bitmask) to multicast group ID */
	private multicastGroupLookup = new Map<string, number>();

	private getNextMulticastGroupId = createWrappingCounter(255);

	/** Sets the PNK for a given security class and derives the encryption keys from it */
	public setKey(securityClass: SecurityClass, key: Buffer): void {
		if (key.length !== 16) {
			throw new ZWaveError(
				`The network key must consist of 16 bytes!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (
			!(securityClass in SecurityClass) ||
			securityClass <= SecurityClass.None
		) {
			throw new ZWaveError(
				`Invalid security class!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.networkKeys.set(securityClass, {
			pnk: key,
			...deriveNetworkKeys(key),
		});
	}

	/**
	 * Creates (or re-uses) a multicast group for the given node IDs and remembers the security class.
	 * The returned value is the group ID to be used in multicast commands
	 */
	public createMulticastGroup(
		nodeIDs: number[],
		s2SecurityClass: S2SecurityClass,
	): number {
		// Check if we already have a group for these nodes
		const newHash = encodeNodeBitMask(nodeIDs).toString("hex");
		if (this.multicastGroupLookup.has(newHash)) {
			return this.multicastGroupLookup.get(newHash)!;
		}

		// If not, generate a new group ID
		const groupId = this.getNextMulticastGroupId();

		// The group ID may already be occupied. In that case, forget the old group
		if (this.multicastGroups.has(groupId)) {
			const oldGroup = this.multicastGroups.get(groupId)!;
			this.multicastGroups.delete(groupId);
			const oldHash = encodeNodeBitMask(oldGroup.nodeIDs).toString("hex");
			this.multicastGroupLookup.delete(oldHash);
		}

		// Remember the new group
		this.multicastGroups.set(groupId, {
			nodeIDs,
			securityClass: s2SecurityClass,
		});
		this.multicastGroupLookup.set(newHash, groupId);
		// And reset the MPAN state
		this.mpanStates.delete(groupId);

		return groupId;
	}

	public getMulticastGroup(
		group: number,
	): Readonly<MulticastGroup> | undefined {
		return this.multicastGroups.get(group);
	}

	public hasKeysForSecurityClass(securityClass: SecurityClass): boolean {
		return this.networkKeys.has(securityClass);
	}

	public getKeysForSecurityClass(securityClass: SecurityClass): NetworkKeys {
		const keys = this.networkKeys.get(securityClass);
		if (!keys) {
			throw new ZWaveError(
				`The network key for the security class ${getEnumMemberName(
					SecurityClass,
					securityClass,
				)} has not been set up yet!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		return { ...keys };
	}

	public getKeysForNode(peerNodeID: number): NetworkKeys | TempNetworkKeys {
		const spanState = this.getSPANState(peerNodeID);
		// The keys we return must match the actual SPAN state (if we have one)
		// Meaning if an SPAN for the temporary inclusion key is established,
		// we need to return that temporary key
		if (
			spanState.type === SPANState.SPAN &&
			spanState.securityClass === SecurityClass.Temporary
		) {
			if (this.tempKeys.has(peerNodeID))
				return this.tempKeys.get(peerNodeID)!;
			throw new ZWaveError(
				`Temporary encryption key for node ${peerNodeID} is not known!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		} else if (spanState.type !== SPANState.SPAN) {
			throw new ZWaveError(
				`Security class for node ${peerNodeID} is not yet known!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		return this.getKeysForSecurityClass(spanState.securityClass);
	}

	public getSPANState(
		peerNodeID: number,
	): SPANTableEntry | { type: SPANState.None } {
		return this.spanTable.get(peerNodeID) ?? { type: SPANState.None };
	}

	/** Tests whether the most recent secure command for a node has used the given security class */
	public hasUsedSecurityClass(
		peerNodeID: number,
		securityClass: SecurityClass,
	): boolean {
		const spanState = this.spanTable.get(peerNodeID);
		if (!spanState) return false;
		if (spanState.type !== SPANState.SPAN) return false;
		return spanState.securityClass === securityClass;
	}

	/**
	 * Prepares the generation of a new SPAN by creating a random sequence number and (local) entropy input
	 * @param receiver The node this nonce is for. If none is given, the nonce is not stored.
	 */
	public generateNonce(receiver: number | undefined): Buffer {
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
	public setSPANState(
		peerNodeID: number,
		state: SPANTableEntry | { type: SPANState.None },
	): void {
		if (state.type === SPANState.None) {
			this.spanTable.delete(peerNodeID);
		} else {
			this.spanTable.set(peerNodeID, state);
		}
	}

	/** Invalidates the SPAN state for the given receiver */
	public deleteNonce(receiver: number): void {
		this.spanTable.delete(receiver);
		this.peerSequenceNumbers.delete(receiver);
		// Keep our own sequence number
	}

	/** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
	public initializeSPAN(
		peerNodeId: number,
		securityClass: SecurityClass,
		senderEI: Buffer,
		receiverEI: Buffer,
	): void {
		if (senderEI.length !== 16 || receiverEI.length !== 16) {
			throw new ZWaveError(
				`The entropy input must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const keys = this.getKeysForSecurityClass(securityClass);
		const noncePRK = computeNoncePRK(senderEI, receiverEI);
		const MEI = deriveMEI(noncePRK);

		this.spanTable.set(peerNodeId, {
			securityClass,
			type: SPANState.SPAN,
			rng: new CtrDRBG(
				128,
				false,
				MEI,
				undefined,
				keys.personalizationString,
			),
		});
	}

	/** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
	public initializeTempSPAN(
		peerNodeId: number,
		senderEI: Buffer,
		receiverEI: Buffer,
	): void {
		if (senderEI.length !== 16 || receiverEI.length !== 16) {
			throw new ZWaveError(
				`The entropy input must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const keys = this.tempKeys.get(peerNodeId)!;
		const noncePRK = computeNoncePRK(senderEI, receiverEI);
		const MEI = deriveMEI(noncePRK);

		this.spanTable.set(peerNodeId, {
			securityClass: SecurityClass.Temporary,
			type: SPANState.SPAN,
			rng: new CtrDRBG(
				128,
				false,
				MEI,
				undefined,
				keys.personalizationString,
			),
		});
	}

	/** Tests if the given combination of peer node ID and sequence number is a duplicate */
	public isDuplicateSinglecast(
		peerNodeId: number,
		sequenceNumber: number,
	): boolean {
		return (
			this.peerSequenceNumbers
				.get(peerNodeId)
				?.includes(sequenceNumber) ?? false
		);
	}

	/** Stores the latest sequence number for the given peer node ID and returns the previous one */
	public storeSequenceNumber(
		peerNodeId: number,
		sequenceNumber: number,
	): number | undefined {
		if (this.peerSequenceNumbers.has(peerNodeId)) {
			// Store the last SINGLECAST_MAX_SEQ_NUMS sequence numbers
			const arr = this.peerSequenceNumbers.get(peerNodeId)!;
			const prev = arr[arr.length - 1];
			arr.push(sequenceNumber);
			if (arr.length > SINGLECAST_MAX_SEQ_NUMS) arr.shift();
			return prev;
		} else {
			this.peerSequenceNumbers.set(peerNodeId, [sequenceNumber]);
		}
	}

	public storeRemoteEI(peerNodeId: number, remoteEI: Buffer): void {
		if (remoteEI.length !== 16) {
			throw new ZWaveError(
				`The entropy input must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
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
	public nextNonce(peerNodeId: number, store?: boolean): Buffer {
		const spanState = this.spanTable.get(peerNodeId);
		if (spanState?.type !== SPANState.SPAN) {
			throw new ZWaveError(
				`The Singlecast PAN has not been initialized for Node ${peerNodeId}`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		const nonce = spanState.rng.generate(16).slice(0, 13);
		spanState.currentSPAN = store
			? {
					nonce,
					expires: highResTimestamp() + SINGLECAST_NONCE_EXPIRY_NS,
			  }
			: undefined;
		return nonce;
	}

	/** Returns the next sequence number to use for outgoing messages to the given node */
	public nextSequenceNumber(peerNodeId: number): number {
		let seq = this.ownSequenceNumbers.get(peerNodeId);
		if (seq == undefined) {
			seq = crypto.randomInt(256);
		} else {
			seq = (seq + 1) & 0xff;
		}
		this.ownSequenceNumbers.set(peerNodeId, seq);
		return seq;
	}

	public getInnerMPANState(groupId: number): Buffer | undefined {
		return this.mpanStates.get(groupId);
	}

	public nextMPAN(groupId: number): Buffer {
		const group = this.getMulticastGroup(groupId);

		if (!group) {
			throw new ZWaveError(
				`Multicast group ${groupId} does not exist!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

		const keys = this.getKeysForSecurityClass(group.securityClass);

		// We may have to initialize the inner MPAN state
		if (!this.mpanStates.has(groupId)) {
			this.mpanStates.set(groupId, this.rng.generate(16));
		}

		// Compute the next MPAN
		const stateN = this.mpanStates.get(groupId)!;
		const ret = encryptAES128ECB(stateN, keys.keyMPAN);
		// Increment the inner state
		increment(stateN);
		return ret;
	}

	public getMulticastKeyAndIV(groupId: number): {
		key: Buffer;
		iv: Buffer;
	} {
		const group = this.getMulticastGroup(groupId);

		if (!group) {
			throw new ZWaveError(
				`Multicast group ${groupId} does not exist!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

		const keys = this.getKeysForSecurityClass(group.securityClass);

		// We may have to initialize the inner MPAN state
		if (!this.mpanStates.has(groupId)) {
			this.mpanStates.set(groupId, this.rng.generate(16));
		}

		// Compute the next MPAN
		const stateN = this.mpanStates.get(groupId)!;
		const ret = encryptAES128ECB(stateN, keys.keyMPAN);
		// Increment the inner state
		increment(stateN);

		return {
			key: keys.keyCCM,
			iv: ret,
		};
	}

	/**
	 * Generates the next nonce for the given peer and returns it.
	 */
	public nextPeerMPAN(peerNodeId: number, groupId: number): Buffer {
		const mpanState = this.getPeerMPAN(peerNodeId, groupId);
		if (mpanState.type !== MPANState.MPAN) {
			throw new ZWaveError(
				`No peer multicast PAN exists for Node ${peerNodeId}, group ${groupId}`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		const keys = this.getKeysForNode(peerNodeId);
		if (!keys || !("keyMPAN" in keys)) {
			throw new ZWaveError(
				`The network keys for the security class of Node ${peerNodeId} have not been set up yet!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

		// Compute the next MPAN
		const stateN = mpanState.currentMPAN;
		const ret = encryptAES128ECB(stateN, keys.keyMPAN);
		// Increment the inner state
		increment(stateN);
		return ret;
	}

	/** As part of MPAN maintenance, this increments the peer's MPAN if it is known */
	public tryIncrementPeerMPAN(peerNodeId: number, groupId: number): void {
		const mpanState = this.getPeerMPAN(peerNodeId, groupId);
		if (mpanState?.type !== MPANState.MPAN) return;

		const stateN = mpanState.currentMPAN;
		increment(stateN);
	}

	/** Returns the stored MPAN used to decrypt messages from `peerNodeId`, MPAN group `groupId` */
	public getPeerMPAN(
		peerNodeId: number,
		groupId: number,
	): MPANTableEntry | { type: MPANState.None } {
		return (
			this.peerMPANs.get(peerNodeId)?.get(groupId) ?? {
				type: MPANState.None,
			}
		);
	}

	/** Reset all MPANs stored for the given node */
	public resetPeerMPANs(peerNodeId: number): void {
		this.peerMPANs.delete(peerNodeId);
	}

	/** Reset the MPAN stored for the given node with the given group ID */
	public resetPeerMPAN(peerNodeId: number, groupId: number): void {
		this.peerMPANs.get(peerNodeId)?.delete(groupId);
	}

	public storePeerMPAN(
		peerNodeId: number,
		groupId: number,
		mpanState: MPANTableEntry,
	): void {
		if (!this.peerMPANs.has(peerNodeId)) {
			this.peerMPANs.set(peerNodeId, new Map());
		}
		this.peerMPANs.get(peerNodeId)!.set(groupId, mpanState);
	}
}
