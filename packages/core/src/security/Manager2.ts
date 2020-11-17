/** Management class and utils for Security S2 */

import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { computeNoncePRK, deriveMEI } from "./crypto";
import { CtrDRBG } from "./ctr_drbg";

export class SecurityManager2 {
	/** A map of PRNGs for each node */
	private rng = new Map<number, CtrDRBG>();

	public establishSPAN(
		receiver: number,
		senderEI: Buffer,
		receiverEI: Buffer,
		personalizationString: Buffer,
	): void {
		if (senderEI.length !== 16 || receiverEI.length !== 16) {
			throw new ZWaveError(
				`The entropy input must consist of 16 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (personalizationString.length !== 32) {
			throw new ZWaveError(
				`The entropy input must consist of 32 bytes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const noncePRK = computeNoncePRK(senderEI, receiverEI);
		const MEI = deriveMEI(noncePRK);

		this.rng.set(
			receiver,
			new CtrDRBG(128, false, MEI, undefined, personalizationString),
		);
	}

	public nextNonce(receiver: number): Buffer {
		if (!this.rng.has(receiver)) {
			throw new ZWaveError(
				`The Singlecast PAN has not been established for Node ${receiver}`,
				ZWaveErrorCodes.SecurityCC_NoNonce,
			);
		}
		const ret = this.rng.get(receiver)!.generate(16);
		return ret.slice(0, 13);
	}
}
