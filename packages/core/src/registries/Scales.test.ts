import { test } from "vitest";
import { getNamedScale, getNamedScaleGroup } from "./Scales.js";

test(
	"getNamedScaleGroup() returns the scale group if it is defined",
	async (t) => {
		const test1 = getNamedScaleGroup("temperature");
		t.expect(test1[0x00]).toMatchObject({
			label: "Celsius",
		});

		// @ts-expect-error
		t.expect(() => getNamedScaleGroup("foobar")).toThrow();
	},
);

test(
	"getNamedScale() returns the scale definition if it is defined",
	async (t) => {
		const test1 = getNamedScale("airPressure", 0x01);

		t.expect(test1).toMatchObject({
			key: 0x01,
			unit: "inHg",
		});

		// @ts-expect-error
		t.expect(() => getNamedScale("foobar", 999)).toThrow();
	},
);
