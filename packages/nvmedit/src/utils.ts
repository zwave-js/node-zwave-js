/** Counts the number of unset bits in the given word */
export function computeBergerCode(word: number, numBits: number = 32): number {
	let ret = word;

	// Mask the number of bits we're interested in
	if (numBits < 32) {
		ret &= (1 << numBits) - 1;
	}

	// And count the bits, see http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
	ret = ret - ((ret >> 1) & 0x55555555);
	ret = (ret & 0x33333333) + ((ret >> 2) & 0x33333333);
	ret = (((ret + (ret >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;

	return numBits - ret;
}

export function validateBergerCode(
	word: number,
	code: number,
	numBits: number = 32,
): void {
	if (computeBergerCode(word, numBits) !== code) {
		throw new Error("Berger Code validation failed!");
	}
}

export function validateBergerCodeMulti(
	words: number[],
	numBits: number,
): void {
	let actual = 0;
	let expected: number;
	for (const word of words) {
		actual += computeBergerCode(word, Math.min(numBits, 32));
		if (numBits < 32) {
			const maskSize = 32 - numBits;
			const mask = (1 << maskSize) - 1;
			expected = (word >>> numBits) & mask;
			break;
		}
		numBits -= 32;
	}
	if (actual !== expected!) {
		throw new Error("Berger Code validation failed!");
	}
}
