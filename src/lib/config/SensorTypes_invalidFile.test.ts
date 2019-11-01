import fsExtra from "fs-extra";
import { loadSensorTypes, lookupSensorType } from "./SensorTypes";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("lib/config/SensorTypes", () => {
	describe("lookupSensorType (with invalid file)", () => {
		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x01": `);
			await loadSensorTypes();
		});

		it("does not throw", async () => {
			expect(() => lookupSensorType(0x0e)).not.toThrow();
		});

		it("returns undefined", async () => {
			expect(lookupSensorType(0x0e)).toBeUndefined();
		});
	});
});
