/** Management class and utils for Security S2 */

import { getEnumMemberName } from "@zwave-js/shared";
import * as crypto from "crypto";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { increment } from "./bufferUtils";
import {
	computeNoncePRK,
	deriveMEI,
	deriveNetworkKeys,
	encryptAES128ECB,
} from "./crypto";
import { CtrDRBG } from "./ctr_drbg";
import { SecurityClass, SecurityClassOwner } from "./SecurityClass";

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
	  };

// How many sequence numbers are remembered for each node when checking for duplicates
const SINGLECAST_MAX_SEQ_NUMS = 10;

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
	/** A map of MPAN states for each multicast group */
	private mpanStates = new Map<number, Buffer>();
	/** A map of permanent network keys per security class */
	private networkKeys = new Map<SecurityClass, NetworkKeys>();
	/** Which multicast group has been assigned which security class */
	private groupClasses = new Map<number, SecurityClass>();

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

	public assignSecurityClassMulticast(
		group: number,
		securityClass: SecurityClass,
	): void {
		this.groupClasses.set(group, securityClass);
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

	public getKeysForNode(
		node: SecurityClassOwner,
	): NetworkKeys | TempNetworkKeys {
		const spanState = this.getSPANState(node.id);
		// The keys we return must match the actual SPAN state (if we have one)
		// Meaning if an SPAN for the temporary inclusion key is established,
		// we need to return that temporary key
		if (
			spanState.type === SPANState.SPAN &&
			spanState.securityClass === SecurityClass.Temporary
		) {
			if (this.tempKeys.has(node.id)) return this.tempKeys.get(node.id)!;
			throw new ZWaveError(
				`Temporary encryption key for node ${node.id} is not known!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		} else if (spanState.type !== SPANState.SPAN) {
			throw new ZWaveError(
				`Security class for node ${node.id} is not yet known!`,
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
		peer: SecurityClassOwner,
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

		this.spanTable.set(peer.id, {
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
		peer: SecurityClassOwner,
		senderEI: Buffer,
		receiverEI: Buffer,
	): void {
		if (senderEI.length !== 16 || receiverEI.length !== 16) {
			throw new ZWaveError(
				`The entropy input must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const keys = this.tempKeys.get(peer.id)!;
		const noncePRK = computeNoncePRK(senderEI, receiverEI);
		const MEI = deriveMEI(noncePRK);

		this.spanTable.set(peer.id, {
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

	public storeSequenceNumber(
		peerNodeId: number,
		sequenceNumber: number,
	): void {
		if (this.peerSequenceNumbers.has(peerNodeId)) {
			// Store the last SINGLECAST_MAX_SEQ_NUMS sequence numbers
			const arr = this.peerSequenceNumbers.get(peerNodeId)!;
			arr.push(sequenceNumber);
			if (arr.length > SINGLECAST_MAX_SEQ_NUMS) arr.shift();
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

	public nextNonce(peerNodeId: number): Buffer {
		const spanState = this.spanTable.get(peerNodeId);
		if (spanState?.type !== SPANState.SPAN) {
			throw new ZWaveError(
				`The Singlecast PAN has not been initialized for Node ${peerNodeId}`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		const ret = spanState.rng.generate(16);
		return ret.slice(0, 13);
	}

	/** Returns the next sequence number to use for outgoing messages to the given node */
	public nextSequenceNumber(peerNodeId: number): number {
		let seq = this.ownSequenceNumbers.get(peerNodeId);
		if (seq == undefined) {
			seq = crypto.randomInt(256);
		} else {
			seq = ++seq & 0xff;
		}
		this.ownSequenceNumbers.set(peerNodeId, seq);
		return seq;
	}

	public initializeMPAN(group: number): void {
		this.mpanStates.set(group, this.rng.generate(16));
	}

	public nextMPAN(group: number): Buffer {
		if (!this.mpanStates.has(group)) {
			throw new ZWaveError(
				`The MPAN state has not been initialized for multicast group ${group}`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		} else if (!this.groupClasses.has(group)) {
			throw new ZWaveError(
				`Multicast group ${group} has not been assigned to a security class yet!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		const keys = this.networkKeys.get(this.groupClasses.get(group)!);
		if (!keys) {
			throw new ZWaveError(
				`The network keys for the security class of multicast group ${group} have not been set up yet!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

		// Compute the next MPAN
		const stateN = this.mpanStates.get(group)!;
		const ret = encryptAES128ECB(stateN, keys.keyMPAN);
		// Increment the inner state
		increment(stateN);
		return ret;
	}
}
