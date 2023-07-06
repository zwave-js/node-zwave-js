import test, { type ExecutionContext } from "ava";
import fsExtra from "fs-extra";
import sinon from "sinon";
import { ConfigManager } from "./ConfigManager";

const readFileStub = sinon.stub(fsExtra, "readFile");
const pathExistsStub = sinon.stub(fsExtra, "pathExists");

const dummyMeters = {
	"0x01": {
		name: "Dummy meter",
		scales: {
			"0x00": "Scale 1",
			"0x01": "Scale 2",
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
		await configManager.loadMeters();
		return configManager;
	}

	test.serial("lookupMeter (with missing file) does not throw", async (t) => {
		const configManager = await prepareTest(t);
		t.notThrows(() => configManager.lookupMeter(0));
	});

	test.serial(
		"lookupMeter (with missing file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupMeter(0x0e), undefined);
			t.is(configManager.lookupMeter(0xff), undefined);
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
		await configManager.loadMeters();
		return configManager;
	}

	test.serial("lookupMeter (with invalid file) does not throw", async (t) => {
		const configManager = await prepareTest(t);
		t.notThrows(() => configManager.lookupMeter(0x0e));
	});

	test.serial(
		"lookupMeter (with invalid file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupMeter(0x0e), undefined);
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
		readFileStub.resolves(JSON.stringify(dummyMeters) as any);

		const configManager = new ConfigManager();
		await configManager.loadMeters();
		return configManager;
	}

	test.serial(
		"lookupMeter() returns the meter definition if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);
			const test1 = configManager.lookupMeter(0x01);
			t.not(test1, undefined);
			t.is(test1!.name, "Dummy meter");
			t.like(test1!.scales.get(0x01), {
				key: 0x01,
				label: "Scale 2",
			});

			t.is(configManager.lookupMeter(0xff), undefined);
		},
	);
}
