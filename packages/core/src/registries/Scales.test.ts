import test from "ava";
import { getNamedScale, getNamedScaleGroup } from "./Scales";

test(
	"getNamedScaleGroup() returns the scale group if it is defined",
	async (t) => {
		const test1 = getNamedScaleGroup("temperature");
		t.like(test1[0x00], {
			label: "Celsius",
		});

		// @ts-expect-error
		t.throws(() => getNamedScaleGroup("foobar"));
	},
);

test(
	"getNamedScale() returns the scale definition if it is defined",
	async (t) => {
		const test1 = getNamedScale("airPressure", 0x01);

		t.like(test1, {
			key: 0x01,
			unit: "inHg",
		});

		// @ts-expect-error
		t.throws(() => getNamedScale("foobar", 999));
	},
);
