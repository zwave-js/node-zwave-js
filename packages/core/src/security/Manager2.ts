/** Management class and utils for Security S2 */

import { getEnumMemberName } from "@zwave-js/shared";
import * as crypto from "crypto";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { increment } from "./bufferUtils";
import { getHighestSecurityClass, SecurityClass } from "./constants";
import {
	computeNoncePRK,
	deriveMEI,
	deriveNetworkKeys,
	encryptAES128ECB,
} from "./crypto";
import { CtrDRBG } from "./ctr_drbg";

interface NetworkKeys {
	pnk: Buffer;
	keyCCM: Buffer;
	keyMPAN: Buffer;
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

type SPANTableEntry =
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
	/** A map of sequence numbers that were last used in communication with a node */
	private ownSequenceNumbers = new Map<number, number>();
	private peerSequenceNumbers = new Map<number, number>();
	/** A map of MPAN states for each multicast group */
	private mpanStates = new Map<number, Buffer>();
	/** A map of permanent network keys per security class */
	private networkKeys = new Map<SecurityClass, NetworkKeys>();
	/** Which node has been assigned which security classes */
	private nodeClasses = new Map<number, SecurityClass[]>();
	/** Which multicast group has been assigned which security class */
	private groupClasses = new Map<number, SecurityClass>();

	/** Sets the PNK for a given security class and derives the encryption keys from it */
	public setKey(securityClass: SecurityClass, key: Buffer): void {
		if (key.length !== 16) {
			throw new ZWaveError(
				`The network key must consist of 16 bytes!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (!(securityClass in SecurityClass)) {
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

	public assignSecurityClassSinglecast(
		nodeId: number,
		securityClasses: SecurityClass[],
	): void {
		this.nodeClasses.set(nodeId, securityClasses);
	}

	public assignSecurityClassMulticast(
		group: number,
		securityClass: SecurityClass,
	): void {
		this.groupClasses.set(group, securityClass);
	}

	public getHighestSecurityClassSinglecast(
		nodeId: number,
	): SecurityClass | undefined {
		const securityClasses = this.nodeClasses.get(nodeId);
		if (!securityClasses?.length) return undefined;
		return getHighestSecurityClass(securityClasses);
	}

	public getKeys(options: {
		nodeId: number;
	}): NetworkKeys & { securityClass: SecurityClass } {
		const securityClass = this.getHighestSecurityClassSinglecast(
			options.nodeId,
		);
		if (!securityClass) {
			throw new ZWaveError(
				`Node ${options.nodeId} has not been assigned to a security class yet!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

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
		return {
			securityClass,
			...keys,
		};
	}

	public getSPANState(
		peerNodeID: number,
	): SPANTableEntry | { type: SPANState.None } {
		return this.spanTable.get(peerNodeID) ?? { type: SPANState.None };
	}

	/** Prepares the generation of a new SPAN by creating a random sequence number and (local) entropy input */
	public generateNonce(receiver: number): {
		ownSequenceNumber: number;
		receiverEI: Buffer;
	} {
		const ownSequenceNumber = crypto.randomInt(256);
		const receiverEI = this.rng.generate(16);
		this.ownSequenceNumbers.set(receiver, ownSequenceNumber);
		this.spanTable.set(receiver, {
			type: SPANState.LocalEI,
			receiverEI,
		});
		return {
			ownSequenceNumber,
			receiverEI,
		};
	}

	/** Invalidates the SPAN state for the given receiver */
	public deleteNonce(receiver: number): void {
		this.spanTable.delete(receiver);
		this.peerSequenceNumbers.delete(receiver);
		// Keep our own sequence number
	}

	/** Initializes the singlecast PAN generator for a given node based on the given entropy inputs */
	public initializeSPAN(
		receiver: number,
		senderEI: Buffer,
		receiverEI: Buffer,
	): void {
		if (senderEI.length !== 16 || receiverEI.length !== 16) {
			throw new ZWaveError(
				`The entropy input must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (!this.nodeClasses.has(receiver)) {
			throw new ZWaveError(
				`Node ${receiver} has not been assigned to a security class yet!`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

		const { securityClass, ...keys } = this.getKeys({ nodeId: receiver });

		const noncePRK = computeNoncePRK(senderEI, receiverEI);
		const MEI = deriveMEI(noncePRK);

		this.spanTable.set(receiver, {
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

	/** Tests if the given combination of peer node ID and sequence number is a duplicate */
	public isDuplicateSinglecast(
		peerNodeId: number,
		sequenceNumber: number,
	): boolean {
		return this.peerSequenceNumbers.get(peerNodeId) === sequenceNumber;
	}

	public storeSequenceNumber(
		peerNodeId: number,
		sequenceNumber: number,
	): void {
		this.peerSequenceNumbers.set(peerNodeId, sequenceNumber);
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
