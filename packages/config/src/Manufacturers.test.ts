import proxyquire from "proxyquire";
import sinon from "sinon";
import { test } from "vitest";

const readFileStub = sinon.stub();
const pathExistsStub = sinon.stub();

// load the ConfigManager with stubbed out filesystem
const { ConfigManager } = proxyquire<typeof import("./ConfigManager")>(
	"./ConfigManager",
	{
		"node:fs/promises": {
			readFile: readFileStub,
			"@global": true,
		},
		"@zwave-js/shared": {
			pathExists: pathExistsStub,
			"@global": true,
		},
	},
);
type ConfigManager = import("./ConfigManager").ConfigManager;

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		pathExistsStub.reset();
		readFileStub.reset();
		pathExistsStub.resolves(false);
		readFileStub.rejects(new Error("File does not exist"));

		const configManager = new ConfigManager();
		await configManager.loadManufacturers();
		return configManager;
	}

	test.sequential(
		"lookupManufacturer (with missing file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.expect(() => configManager.lookupManufacturer(0)).not.toThrow();
		},
	);

	test.sequential(
		"lookupManufacturer (with missing file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.expect(configManager.lookupManufacturer(0x0e)).toBeUndefined();
			t.expect(configManager.lookupManufacturer(0xff)).toBeUndefined();
		},
	);
}

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		pathExistsStub.reset();
		readFileStub.reset();
		pathExistsStub.resolves(true);
		readFileStub.resolves(`{"0x000e": ` as any);

		const configManager = new ConfigManager();
		await configManager.loadManufacturers();
		return configManager;
	}

	test.sequential(
		"lookupManufacturer (with invalid file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.expect(() => configManager.lookupManufacturer(0x0e)).not
				.toThrow();
		},
	);

	test.sequential(
		"lookupManufacturer (with invalid file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.expect(configManager.lookupManufacturer(0x0e)).toBeUndefined();
		},
	);
}

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		readFileStub.reset();
		pathExistsStub.reset();
		pathExistsStub.resolves(true);
		readFileStub.resolves(
			JSON.stringify({
				"0x000e": "Test",
			}) as any,
		);

		const configManager = new ConfigManager();
		await configManager.loadManufacturers();
		return configManager;
	}

	test.sequential(
		"lookupManufacturer() returns the name belonging to the manufacturer ID if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.expect(configManager.lookupManufacturer(0x0e)).toBe("Test");
			t.expect(configManager.lookupManufacturer(0xff)).toBeUndefined();
		},
	);
}
