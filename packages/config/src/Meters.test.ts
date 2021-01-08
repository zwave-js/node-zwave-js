import fsExtra from "fs-extra";
import { ConfigManager } from "./ConfigManager";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

const dummyMeters = {
	"0x01": {
		name: "Dummy meter",
		scales: {
			"0x00": "Scale 1",
			"0x01": "Scale 2",
		},
	},
};

describe("lib/config/Meters", () => {
	describe("lookupMeter (with missing file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));
			configManager = new ConfigManager();
			await configManager.loadMeters();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupMeter(0)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupMeter(0x0e)).toBeUndefined();
			expect(configManager.lookupMeter(0xff)).toBeUndefined();
		});
	});

	describe("lookupMeter (with invalid file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x01": `);

			configManager = new ConfigManager();
			await configManager.loadMeters();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupMeter(0x0e)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupMeter(0x0e)).toBeUndefined();
		});
	});

	describe("lookupMeter()", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyMeters));

			configManager = new ConfigManager();
			await configManager.loadMeters();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the meter definition if it is defined", () => {
			const test1 = configManager.lookupMeter(0x01);
			expect(test1).not.toBeUndefined();
			expect(test1!.name).toBe("Dummy meter");
			expect(test1!.scales.get(0x01)).toEqual({
				key: 0x01,
				label: "Scale 2",
			});

			expect(configManager.lookupMeter(0xff)).toBeUndefined();
		});
	});
});
