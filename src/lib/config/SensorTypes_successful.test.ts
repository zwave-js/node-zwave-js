import fsExtra from "fs-extra";
import { loadNamedScales } from "./Scales";
import {
	loadSensorTypes,
	lookupSensorScale,
	lookupSensorType,
} from "./SensorTypes";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

const dummySensorTypes = {
	"0x0a": {
		label: "Dummy temperature",
		scales: {
			"0x00": {
				label: "Celsius",
				unit: "°C",
			},
			"0x01": {
				label: "Fahrenheit",
				unit: "°F",
				description: "don't use this!",
			},
		},
	},
	"0x0b": {
		label: "Another temperature",
		scales: "$SCALES:temperature",
	},
};

const dummyScales = {
	temperature: {
		"0x00": {
			label: "Celsius",
			unit: "°C",
		},
		"0x01": {
			label: "Fahrenheit",
			unit: "°F",
		},
	},
};

// I don't get why these tests don't play nice with the unsuccessful ones
// But since I see no other way, they are now in their own file

describe("lib/config/SensorTypes", () => {
	beforeAll(async () => {
		pathExistsMock.mockResolvedValue(true);
		readFileMock.mockImplementation((path: string) => {
			if (path.endsWith("sensorTypes.json"))
				return Promise.resolve(JSON.stringify(dummySensorTypes));
			if (path.endsWith("scales.json"))
				return Promise.resolve(JSON.stringify(dummyScales));
		});
		await loadNamedScales();
		await loadSensorTypes();
	});

	describe("lookupSensorType()", () => {
		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the sensor type definition if it is defined", async () => {
			const test1 = lookupSensorType(0x0a);
			expect(test1).not.toBeUndefined();
			expect(test1!.label).toBe("Dummy temperature");

			expect(lookupSensorType(0xff)).toBeUndefined();
		});
	});

	describe("lookupSensorScale()", () => {
		it("returns the sensor scale definition if it is defined", async () => {
			const test1 = lookupSensorScale(0x0a, 0x00);
			expect(test1).toMatchObject(
				dummySensorTypes["0x0a"].scales["0x00"],
			);
			const test2 = lookupSensorScale(0x0a, 0x01);
			expect(test2).toMatchObject(
				dummySensorTypes["0x0a"].scales["0x01"],
			);
		});

		it("returns a falllback scale definition if the requested one is not defined", async () => {
			// existing type, missing scale
			const test1 = lookupSensorScale(0x0a, 0xff);
			expect(test1).toMatchObject({
				label: "Unknown",
			});
			// missing type
			const test2 = lookupSensorScale(0xff, 0xff);
			expect(test2).toMatchObject({
				label: "Unknown",
			});
		});

		it("includes named scales in its lookup", async () => {
			const test1 = lookupSensorScale(0x0b, 0x00);
			expect(test1).toMatchObject(dummyScales.temperature["0x00"]);
			const test2 = lookupSensorScale(0x0b, 0x01);
			expect(test2).toMatchObject(dummyScales.temperature["0x01"]);
		});
	});
});
