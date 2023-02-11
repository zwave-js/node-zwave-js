import test, { ExecutionContext } from "ava";
import fsExtra from "fs-extra";
import sinon from "sinon";
import { ConfigManager } from "./ConfigManager";

const readFileStub = sinon.stub(fsExtra, "readFile");
const pathExistsStub = sinon.stub(fsExtra, "pathExists");

const dummySensorTypes = {
	"0x0a": {
		label: "Dummy temperature",
		scales: {
			"0x00": {
				label: "Celsius",
				unit: "°C",
			},
			"0x01": {
				label: "Fahrenheit",
				unit: "°F",
				description: "don't use this!",
			},
		},
	},
	"0x0b": {
		label: "Another temperature",
		scales: "$SCALES:temperature",
	},
};

const dummyScales = {
	temperature: {
		"0x00": {
			label: "Celsius",
			unit: "°C",
		},
		"0x01": {
			label: "Fahrenheit",
			unit: "°F",
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
		await configManager.loadNamedScales();
		await configManager.loadSensorTypes();
		return configManager;
	}

	test.serial(
		"lookupSensorType (with missing file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.notThrows(() => configManager.lookupSensorType(0));
		},
	);

	test.serial(
		"lookupSensorType (with missing file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupSensorType(0x0e), undefined);
			t.is(configManager.lookupSensorType(0xff), undefined);
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
		await configManager.loadNamedScales();
		await configManager.loadSensorTypes();
		return configManager;
	}

	test.serial(
		"lookupSensorType (with invalid file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.notThrows(() => configManager.lookupSensorType(0x0e));
		},
	);

	test.serial(
		"lookupSensorType (with invalid file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupSensorType(0x0e), undefined);
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
		readFileStub.callsFake(((path: string) => {
			if (path.endsWith("sensorTypes.json"))
				return Promise.resolve(JSON.stringify(dummySensorTypes));
			if (path.endsWith("scales.json"))
				return Promise.resolve(JSON.stringify(dummyScales));
		}) as any);

		const configManager = new ConfigManager();
		await configManager.loadNamedScales();
		await configManager.loadSensorTypes();

		return configManager;
	}

	test.serial(
		"lookupSensorType() returns the sensor type definition if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);

			const test1 = configManager.lookupSensorType(0x0a);
			t.not(test1, undefined);
			t.is(test1!.label, "Dummy temperature");

			t.is(configManager.lookupSensorType(0xff), undefined);
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
		readFileStub.callsFake(((path: string) => {
			if (path.endsWith("sensorTypes.json"))
				return Promise.resolve(JSON.stringify(dummySensorTypes));
			if (path.endsWith("scales.json"))
				return Promise.resolve(JSON.stringify(dummyScales));
		}) as any);

		const configManager = new ConfigManager();
		await configManager.loadNamedScales();
		await configManager.loadSensorTypes();
		return configManager;
	}

	test.serial(
		"lookupSensorScale() returns the sensor scale definition if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);
			const test1 = configManager.lookupSensorScale(0x0a, 0x00);
			t.like(test1, dummySensorTypes["0x0a"].scales["0x00"]);
			const test2 = configManager.lookupSensorScale(0x0a, 0x01);
			t.like(test2, dummySensorTypes["0x0a"].scales["0x01"]);
		},
	);

	test.serial(
		"lookupSensorScale() returns a falllback scale definition if the requested one is not defined",
		async (t) => {
			const configManager = await prepareTest(t);
			// existing type, missing scale
			const test1 = configManager.lookupSensorScale(0x0a, 0xff);
			t.like(test1, {
				label: "Unknown",
			});
			// missing type
			const test2 = configManager.lookupSensorScale(0xff, 0xff);
			t.like(test2, {
				label: "Unknown",
			});
		},
	);

	test.serial(
		"lookupSensorScale() includes named scales in its lookup",
		async (t) => {
			const configManager = await prepareTest(t);
			const test1 = configManager.lookupSensorScale(0x0b, 0x00);
			t.like(test1, dummyScales.temperature["0x00"]);
			const test2 = configManager.lookupSensorScale(0x0b, 0x01);
			t.like(test2, dummyScales.temperature["0x01"]);
		},
	);
}
