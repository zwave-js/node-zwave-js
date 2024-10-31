import { test } from "vitest";
import { getIndicatorProperty } from "./Indicators.js";

test(
	"getIndicatorProperty() returns the property definition if it is defined",
	async (t) => {
		const test1 = getIndicatorProperty(0x01);
		t.expect(test1.label).toBe("Multilevel");

		t.expect(getIndicatorProperty(0xff)).toBeUndefined();
	},
);
