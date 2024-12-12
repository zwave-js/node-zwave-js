/* eslint-disable no-restricted-globals */
import { pathExists } from "@zwave-js/shared";
import { readFile } from "node:fs/promises";
import { test, vi } from "vitest";
import { ConfigManager } from "./ConfigManager.js";

vi.mock("node:fs/promises");
vi.mock("@zwave-js/shared", async () => {
	const original = await vi.importActual("@zwave-js/shared");
	return {
		...original,
		pathExists: vi.fn(),
	};
});

const readFileStub = vi.mocked(readFile);
const pathExistsStub = vi.mocked(pathExists);

{
	async function prepareTest(): Promise<ConfigManager> {
		pathExistsStub.mockClear();
		readFileStub.mockClear();
		pathExistsStub.mockResolvedValue(false);
		readFileStub.mockRejectedValue(new Error("File does not exist"));

		const configManager = new ConfigManager();
		await configManager.loadManufacturers();
		return configManager;
	}

	test.sequential(
		"lookupManufacturer (with missing file) does not throw",
		async (t) => {
			const configManager = await prepareTest();
			t.expect(() => configManager.lookupManufacturer(0)).not.toThrow();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	test.sequential(
		"lookupManufacturer (with missing file) returns undefined",
		async (t) => {
			const configManager = await prepareTest();
			t.expect(configManager.lookupManufacturer(0x0e)).toBeUndefined();
			t.expect(configManager.lookupManufacturer(0xff)).toBeUndefined();
		},
		// Loading configuration may take a while on CI
		30000,
	);
}

{
	async function prepareTest(): Promise<ConfigManager> {
		pathExistsStub.mockClear();
		readFileStub.mockClear();
		pathExistsStub.mockResolvedValue(true);
		readFileStub.mockResolvedValue(
			Buffer.from(`{"0x000e": `, "utf8"),
		);

		const configManager = new ConfigManager();
		await configManager.loadManufacturers();
		return configManager;
	}

	test.sequential(
		"lookupManufacturer (with invalid file) does not throw",
		async (t) => {
			const configManager = await prepareTest();
			t.expect(() => configManager.lookupManufacturer(0x0e)).not
				.toThrow();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	test.sequential(
		"lookupManufacturer (with invalid file) returns undefined",
		async (t) => {
			const configManager = await prepareTest();
			t.expect(configManager.lookupManufacturer(0x0e)).toBeUndefined();
		},
		// Loading configuration may take a while on CI
		30000,
	);
}

{
	async function prepareTest(): Promise<ConfigManager> {
		readFileStub.mockClear();
		pathExistsStub.mockClear();
		pathExistsStub.mockResolvedValue(true);
		readFileStub.mockResolvedValue(
			Buffer.from(
				JSON.stringify({
					"0x000e": "Test",
				}),
				"utf8",
			),
		);

		const configManager = new ConfigManager();
		await configManager.loadManufacturers();
		return configManager;
	}

	test.sequential(
		"lookupManufacturer() returns the name belonging to the manufacturer ID if it is defined",
		async (t) => {
			const configManager = await prepareTest();
			t.expect(configManager.lookupManufacturer(0x0e)).toBe("Test");
			t.expect(configManager.lookupManufacturer(0xff)).toBeUndefined();
		},
		// Loading configuration may take a while on CI
		30000,
	);
}
