import { test } from "vitest";
import { getSensor, getSensorScale } from "./Sensors.js";

test(
	"getSensor() returns the sensor definition if it is defined",
	async (t) => {
		const test1 = getSensor(0x0a);
		t.expect(test1.label).toBe("Solar radiation");

		t.expect(getSensor(0xff)).toBeUndefined();
	},
);

test(
	"getSensorScale() returns the scale definition if it is defined",
	async (t) => {
		const test1 = getSensorScale(0x01, 0x01);

		t.expect(test1).toMatchObject({
			key: 0x01,
			label: "Fahrenheit",
		});

		t.expect(getSensorScale(0xff, 0xff)).toBeUndefined();
	},
);
