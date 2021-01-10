import fsExtra from "fs-extra";
import { ConfigManager } from "./ConfigManager";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

const dummyIndicators = {
	indicators: {
		"0x01": "Indicator 1",
		"0x02": "Indicator 2",
	},
	properties: {
		"0x01": {
			label: "Property 1",
		},
	},
};

describe("lib/config/Indicators", () => {
	describe("lookupIndicator (with missing file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));

			configManager = new ConfigManager();
			await configManager.loadIndicators();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupIndicator(1)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupIndicator(0x0e)).toBeUndefined();
			expect(configManager.lookupIndicator(0xff)).toBeUndefined();
		});
	});

	describe("lookupIndicator (with invalid file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x01": `);

			configManager = new ConfigManager();
			await configManager.loadIndicators();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupIndicator(0x1)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupIndicator(0x01)).toBeUndefined();
		});
	});

	describe("lookupIndicator()", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyIndicators));

			configManager = new ConfigManager();
			await configManager.loadIndicators();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the indicator definition if it is defined", () => {
			const test1 = configManager.lookupIndicator(0x01);
			expect(test1).toBe("Indicator 1");

			expect(configManager.lookupIndicator(0xff)).toBeUndefined();
		});
	});

	describe("lookupIndicatorProperty()", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyIndicators));

			configManager = new ConfigManager();
			await configManager.loadIndicators();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the property definition if it is defined", () => {
			const test1 = configManager.lookupProperty(0x01);
			expect(test1).not.toBeUndefined();
			expect(test1!.label).toBe("Property 1");

			expect(configManager.lookupProperty(0xff)).toBeUndefined();
		});
	});
});
