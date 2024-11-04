import { test } from "vitest";
import { getMeter, getMeterScale } from "./Meters.js";

test(
	"getMeter() returns the meter definition if it is defined",
	async (t) => {
		const test1 = getMeter(0x01);
		t.expect(test1.name).toBe("Electric");

		t.expect(getMeter(0xff)).toBeUndefined();
	},
);

test(
	"getMeterScale() returns the scale definition if it is defined",
	async (t) => {
		const test1 = getMeterScale(0x01, 0x01);

		t.expect(test1).toMatchObject({
			key: 0x01,
			label: "kVAh",
		});

		t.expect(getMeterScale(0xff, 0xff)).toBeUndefined();
	},
);
