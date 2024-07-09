import test from "ava";
import { getSensor, getSensorScale } from "./Sensors";

test(
	"getSensor() returns the sensor definition if it is defined",
	async (t) => {
		const test1 = getSensor(0x0a);
		t.is(test1.label, "Solar radiation");

		t.is(getSensor(0xff), undefined);
	},
);

test(
	"getSensorScale() returns the scale definition if it is defined",
	async (t) => {
		const test1 = getSensorScale(0x01, 0x01);

		t.like(test1, {
			key: 0x01,
			label: "Fahrenheit",
		});

		t.is(getSensorScale(0xff, 0xff), undefined);
	},
);
