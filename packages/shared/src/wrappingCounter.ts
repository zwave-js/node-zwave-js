/**
 * Creates a counter that starts at 1 and wraps after surpassing `maxValue`.
 * @param maxValue The maximum value that the counter can reach. Must a number where all bits are set to 1.
 * @param randomSeed Whether the initial value should be randomized. Default: `false`.
 */
export function createWrappingCounter(
	maxValue: number,
	randomSeed: boolean = false,
): () => number {
	let value = randomSeed ? Math.round(Math.random() * maxValue) : 0;
	return () => {
		value = (value + 1) & maxValue;
		if (value === 0) value = 1;
		return value;
	};
}
