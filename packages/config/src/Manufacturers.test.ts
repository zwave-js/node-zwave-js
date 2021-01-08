import fsExtra from "fs-extra";
import { ConfigManager } from "./ConfigManager";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("lib/config/Manufacturers", () => {
	describe("lookupManufacturer (with missing file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));

			configManager = new ConfigManager();
			await configManager.loadManufacturers();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupManufacturer(0)).not.toThrow();
		});

		it("returns undefined", async () => {
			expect(configManager.lookupManufacturer(0x0e)).toBeUndefined();
			expect(configManager.lookupManufacturer(0xff)).toBeUndefined();
		});
	});

	describe("lookupManufacturer (with invalid file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x000e": `);

			configManager = new ConfigManager();
			await configManager.loadManufacturers();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupManufacturer(0x0e)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupManufacturer(0x0e)).toBeUndefined();
		});
	});

	describe("lookupManufacturer()", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(
				JSON.stringify({
					"0x000e": "Test",
				}),
			);

			configManager = new ConfigManager();
			await configManager.loadManufacturers();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the name belonging to the manufacturer ID if it is defined", () => {
			expect(configManager.lookupManufacturer(0x0e)).toBe("Test");
			expect(configManager.lookupManufacturer(0xff)).toBeUndefined();
		});
	});
});
