export function writeUInt24BE(target: Buffer, value: number, offset: number = 0) {
	for (let bytes = 2; bytes >= 0; bytes--) {
		target[offset + bytes] = value & 0xff;
		value >>>= 8;
	}
}

export function readUInt24BE(source: Buffer, offset: number = 0): number {
	let ret = 0;
	for (let bytes = 0; bytes <= 2; bytes++) {
		ret <<= 8;
		ret += source[offset + bytes];
	}
	return ret;
}
