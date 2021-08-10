import { padStart } from "alcalzone-shared/strings";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

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
	if (!/^(\d{5}-){7}\d{5}$/.test(dsk)) {
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
