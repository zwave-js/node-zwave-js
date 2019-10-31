import fsExtra from "fs-extra";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("lib/config/SensorTypes", () => {
	describe("lookupSensorType (with missing file)", () => {
		let lookupSensorType: typeof import("./SensorTypes").lookupSensorType;

		beforeAll(() => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));
			jest.isolateModules(() => {
				lookupSensorType = require("./SensorTypes").lookupSensorType;
			});
		});

		it("does not throw", async () => {
			await expect(lookupSensorType(0)).not.toReject();
		});

		it("tries finding the file only once", async () => {
			await lookupSensorType(0);
			expect(fsExtra.readFile).toBeCalledTimes(0);
			expect(fsExtra.pathExists).toBeCalledTimes(1);

			await lookupSensorType(1);
			expect(fsExtra.readFile).toBeCalledTimes(0);
			expect(fsExtra.pathExists).toBeCalledTimes(1);
		});

		it("returns undefined", async () => {
			await expect(lookupSensorType(0x0e)).resolves.toBeUndefined();
			await expect(lookupSensorType(0xff)).resolves.toBeUndefined();
		});
	});

	describe("lookupNotification (with invalid file)", () => {
		let lookupSensorType: typeof import("./SensorTypes").lookupSensorType;

		beforeAll(() => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x01": `);

			jest.isolateModules(() => {
				lookupSensorType = require("./SensorTypes").lookupSensorType;
			});
		});

		it("does not throw", async () => {
			await expect(lookupSensorType(0x0e)).not.toReject();
		});

		it("tries loading the file only once", async () => {
			await lookupSensorType(0);
			expect(fsExtra.readFile).toBeCalledTimes(1);

			await lookupSensorType(1);
			expect(fsExtra.readFile).toBeCalledTimes(1);
		});

		it("returns undefined", async () => {
			await expect(lookupSensorType(0x0e)).resolves.toBeUndefined();
		});
	});
});
