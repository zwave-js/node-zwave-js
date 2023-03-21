"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWrappingCounter = void 0;
/**
 * Creates a counter that starts at 1 and wraps after surpassing `maxValue`.
 * @param maxValue The maximum value that the counter can reach. Must a number where all bits are set to 1.
 * @param randomSeed Whether the initial value should be randomized. Default: `false`.
 */
function createWrappingCounter(maxValue, randomSeed = false) {
    const ret = (() => {
        ret.value = (ret.value + 1) & maxValue;
        if (ret.value === 0)
            ret.value = 1;
        return ret.value;
    });
    ret.value = randomSeed ? Math.round(Math.random() * maxValue) : 0;
    return ret;
}
exports.createWrappingCounter = createWrappingCounter;
//# sourceMappingURL=wrappingCounter.js.map