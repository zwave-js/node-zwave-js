import fsExtra from "fs-extra";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

const dummySensorTypes = {
	"0x0a": {
		label: "Dummy temperature",
		scales: {
			"0x00": {
				label: "Celcius",
				unit: "°C",
			},
			"0x01": {
				label: "Fahrenheit",
				unit: "F",
				description: "don't use this!",
			},
		},
	},
};

// I don't get why these tests don't play nice with the unsuccessful ones
// But since I see no other way, they are now in their own file

describe("lib/config/SensorTypes", () => {
	describe("lookupSensorType()", () => {
		let lookupSensorType: typeof import("./SensorTypes").lookupSensorType;

		beforeAll(() => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummySensorTypes));

			jest.isolateModules(() => {
				lookupSensorType = require("./SensorTypes").lookupSensorType;
			});
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("caches the file contents", async () => {
			await lookupSensorType(0);
			expect(fsExtra.readFile).toBeCalledTimes(1);
			expect(fsExtra.pathExists).toBeCalledTimes(1);

			await lookupSensorType(1);
			expect(fsExtra.readFile).toBeCalledTimes(1);
			expect(fsExtra.pathExists).toBeCalledTimes(1);
		});

		it("returns the sensor type definition if it is defined", async () => {
			const test1 = await lookupSensorType(0x0a);
			expect(test1).not.toBeUndefined();
			expect(test1!.label).toBe("Dummy temperature");

			await expect(lookupSensorType(0xff)).resolves.toBeUndefined();
		});
	});
});
