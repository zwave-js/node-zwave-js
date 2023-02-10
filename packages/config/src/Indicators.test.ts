import test, { ExecutionContext } from "ava";
import fsExtra from "fs-extra";
import sinon from "sinon";
import { ConfigManager } from "./ConfigManager";

const readFileStub = sinon.stub(fsExtra, "readFile");
const pathExistsStub = sinon.stub(fsExtra, "pathExists");

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

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		pathExistsStub.reset();
		readFileStub.reset();
		pathExistsStub.resolves(false);
		readFileStub.rejects(new Error("File does not exist"));

		const configManager = new ConfigManager();
		await configManager.loadIndicators();
		return configManager;
	}

	test.serial(
		"lookupIndicator (with missing file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.notThrows(() => configManager.lookupIndicator(1));
		},
	);

	test.serial(
		"lookupIndicator (with missing file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupIndicator(0x0e), undefined);
			t.is(configManager.lookupIndicator(0xff), undefined);
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
		readFileStub.resolves(`{"0x01": ` as any);

		const configManager = new ConfigManager();
		await configManager.loadIndicators();
		return configManager;
	}

	test.serial(
		"lookupIndicator (with invalid file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.notThrows(() => configManager.lookupIndicator(0x1));
		},
	);

	test.serial(
		"lookupIndicator (with invalid file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupIndicator(0x01), undefined);
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
		readFileStub.resolves(JSON.stringify(dummyIndicators) as any);

		const configManager = new ConfigManager();
		await configManager.loadIndicators();
		return configManager;
	}

	test.serial(
		"lookupIndicator() returns the indicator definition if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);
			const test1 = configManager.lookupIndicator(0x01);
			t.is(test1, "Indicator 1");

			t.is(configManager.lookupIndicator(0xff), undefined);
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
		readFileStub.resolves(JSON.stringify(dummyIndicators) as any);

		const configManager = new ConfigManager();
		await configManager.loadIndicators();
		return configManager;
	}

	test.serial(
		"lookupIndicatorProperty() returns the property definition if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);

			const test1 = configManager.lookupProperty(0x01);
			t.not(test1, undefined);
			t.is(test1!.label, "Property 1");

			t.is(configManager.lookupProperty(0xff), undefined);
		},
	);
}
