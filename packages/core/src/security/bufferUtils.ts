export function zeroPad(
	input: Uint8Array,
	blockSize: number,
): { output: Uint8Array; paddingLength: number } {
	const desiredLength = Math.ceil(input.length / blockSize) * blockSize;
	const ret = new Uint8Array(desiredLength);
	ret.set(input, 0);
	return {
		output: ret,
		paddingLength: ret.length - input.length,
	};
}
/** Left-Shifts a buffer by 1 bit */
export function leftShift1(input: Uint8Array): Uint8Array {
	if (input.length === 0) return new Uint8Array();
	const ret = new Uint8Array(input.length);
	for (let i = 0; i < input.length - 1; i++) {
		ret[i] = (input[i] << 1) + (!!(input[i + 1] & 0x80) ? 1 : 0);
	}
	ret[ret.length - 1] = input.at(-1)! << 1;
	return ret;
}

/** Computes the byte-wise XOR of two buffers with the same length */
export function xor(b1: Uint8Array, b2: Uint8Array): Uint8Array {
	if (b1.length !== b2.length) {
		throw new Error("The buffers must have the same length");
	}
	const ret = new Uint8Array(b1.length);
	for (let i = 0; i < b1.length; i++) {
		ret[i] = b1[i] ^ b2[i];
	}
	return ret;
}

/** Increments a multi-byte integer in a buffer */
export function increment(buffer: Uint8Array): void {
	for (let i = buffer.length - 1; i >= 0; i--) {
		buffer[i] += 1;
		if (buffer[i] !== 0x00) break;
	}
}
