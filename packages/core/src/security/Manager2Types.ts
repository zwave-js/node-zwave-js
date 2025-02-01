import {
	type S2SecurityClass,
	type SecurityClass,
} from "../definitions/SecurityClass.js";
import { type CtrDRBG } from "./ctr_drbg.js";

export interface NetworkKeys {
	pnk: Uint8Array;
	keyCCM: Uint8Array;
	keyMPAN: Uint8Array;
	personalizationString: Uint8Array;
}
export interface TempNetworkKeys {
	keyCCM: Uint8Array;
	personalizationString: Uint8Array;
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
		receiverEI: Uint8Array;
	}
	| {
		// We've sent the other node our receiver's entropy input, but we didn't receive its sender's EI yet
		type: SPANState.LocalEI;
		receiverEI: Uint8Array;
	}
	| {
		// We've established an SPAN with the other node
		type: SPANState.SPAN;
		securityClass: SecurityClass;
		rng: CtrDRBG;
		/** The most recent generated SPAN */
		currentSPAN?: {
			nonce: Uint8Array;
			expires: number;
		};
	};

export type MPANTableEntry =
	| {
		type: MPANState.OutOfSync;
	}
	| {
		type: MPANState.MPAN;
		currentMPAN: Uint8Array;
	};

export interface MulticastGroup {
	nodeIDs: readonly number[];
	securityClass: S2SecurityClass;
	sequenceNumber: number;
}
