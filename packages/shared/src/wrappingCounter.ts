/**
 * Creates a counter that starts at 1 and wraps after surpassing `maxValue`.
 * @param maxValue The maximum value that the counter can reach. Must a number where all bits are set to 1.
 */
export function createWrappingCounter(maxValue: number): () => number {
	const ret = (() => {
		ret.value = (ret.value + 1) & maxValue;
		if (ret.value === 0) ret.value = 1;
		return ret.value;
	}) as {
		(): number;
		// Little hack for testing purposes.
		// TODO: Remove when packages/zwave-js/src/lib/test/driver/nodeAsleepBlockNonceReport.test.ts and packages/zwave-js/src/lib/test/driver/nodeAsleepMessageOrder.test.ts
		// no longer need this
		value: number;
	};
	ret.value = 0;
	return ret;
}
