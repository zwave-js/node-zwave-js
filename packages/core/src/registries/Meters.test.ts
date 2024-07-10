import test from "ava";
import { getMeter, getMeterScale } from "./Meters";

test(
	"getMeter() returns the meter definition if it is defined",
	async (t) => {
		const test1 = getMeter(0x01);
		t.is(test1.name, "Electric");

		t.is(getMeter(0xff), undefined);
	},
);

test(
	"getMeterScale() returns the scale definition if it is defined",
	async (t) => {
		const test1 = getMeterScale(0x01, 0x01);

		t.like(test1, {
			key: 0x01,
			label: "kVAh",
		});

		t.is(getMeterScale(0xff, 0xff), undefined);
	},
);
