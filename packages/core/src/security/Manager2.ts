/** Management class and utils for Security S2 */

import * as crypto from "crypto";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { increment } from "./bufferUtils";
import { computeNoncePRK, deriveMEI, encryptAES128ECB } from "./crypto";
import { CtrDRBG } from "./ctr_drbg";

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
	/** A map of PRNGs for each node */
	private nodeRNG = new Map<number, CtrDRBG>();
	/** A map of MPAN states for each multicast group */
	private mpanStates = new Map<number, Buffer>();

	private keyCCM: Buffer | undefined;
	private personalizationString: Buffer | undefined;
	private keyMPAN: Buffer | undefined;

	public setKeys(
		keyCCM: Buffer,
		keyMPAN: Buffer,
		personalizationString: Buffer,
	): void {
		if (keyCCM.length !== 16) {
			throw new ZWaveError(
				`keyCCM must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (keyMPAN.length !== 16) {
			throw new ZWaveError(
				`keyMPAN must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (personalizationString.length !== 32) {
			throw new ZWaveError(
				`The personalizationString must consist of 32 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.keyCCM = keyCCM;
		this.keyMPAN = keyMPAN;
		this.personalizationString = personalizationString;
	}

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
		} else if (this.personalizationString == undefined) {
			throw new ZWaveError(
				`The personalization string must be set`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const noncePRK = computeNoncePRK(senderEI, receiverEI);
		const MEI = deriveMEI(noncePRK);

		this.nodeRNG.set(
			receiver,
			new CtrDRBG(128, false, MEI, undefined, this.personalizationString),
		);
	}

	public nextNonce(receiver: number): Buffer {
		if (!this.nodeRNG.has(receiver)) {
			throw new ZWaveError(
				`The Singlecast PAN has not been initialized for Node ${receiver}`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}
		const ret = this.nodeRNG.get(receiver)!.generate(16);
		return ret.slice(0, 13);
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
		} else if (this.keyMPAN == undefined) {
			throw new ZWaveError(
				`The MPAN key must be set`,
				ZWaveErrorCodes.Security2CC_NotInitialized,
			);
		}

		// Compute the next MPAN
		const stateN = this.mpanStates.get(group)!;
		const ret = encryptAES128ECB(stateN, this.keyMPAN);
		// Increment the inner state
		increment(stateN);
		return ret;
	}
}
