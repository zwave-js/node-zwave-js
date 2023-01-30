import { padStart } from "alcalzone-shared/strings";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { isValidDSK } from "./shared_safe";

export function dskToString(dsk: Buffer): string {
	if (dsk.length !== 16) {
		throw new ZWaveError(
			`DSK length must be 16 bytes, got ${dsk.length}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}
	let ret = "";
	for (let i = 0; i < 16; i += 2) {
		if (i > 0) ret += "-";
		ret += padStart(dsk.readUInt16BE(i).toString(10), 5, "0");
	}
	return ret;
}

export function dskFromString(dsk: string): Buffer {
	if (!isValidDSK(dsk)) {
		throw new ZWaveError(
			`The DSK must be in the form "aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222"`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const ret = Buffer.allocUnsafe(16);
	const parts = dsk.split("-");
	for (let i = 0; i < 8; i++) {
		const partAsNumber = parseInt(parts[i], 10);
		ret.writeUInt16BE(partAsNumber, i * 2);
	}
	return ret;
}

export function nwiHomeIdFromDSK(dsk: Buffer): Buffer {
	// NWI HomeID 1..4 shall match byte 9..12 of the S2 DSK.
	// Additionally:
	// • Bits 7 and 6 of the NWI HomeID 1 shall be set to 1.
	// • Bit 0 of the NWI HomeID 4 byte shall be set to 0.
	const ret = Buffer.allocUnsafe(4);
	dsk.copy(ret, 0, 8, 12);
	ret[0] |= 0b11000000;
	ret[3] &= 0b11111110;
	return ret;
}

export function authHomeIdFromDSK(dsk: Buffer): Buffer {
	// Auth HomeID 1..4 shall match byte 13..16 of the S2 DSK.
	// • Bits 7 and 6 of the Auth HomeID 1 shall be set to 0. (Error in the specs, they say it should be 1)
	// • Bit 0 of the Auth HomeID 4 byte shall be set to 1. (Error in the specs, they say it should be 0)
	const ret = Buffer.allocUnsafe(4);
	dsk.copy(ret, 0, 12, 16);
	ret[0] &= 0b00111111;
	ret[3] |= 0b00000001;
	return ret;
}
