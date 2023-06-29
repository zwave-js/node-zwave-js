import { ZWaveLogContainer } from "@zwave-js/core";
import ava, { type ExecutionContext, type TestFn } from "ava";
import * as fs from "fs-extra";
import { tmpdir } from "os";
import * as path from "path";
import semver from "semver";
import { ConfigManager } from "./ConfigManager";
import { ConfigLogger } from "./Logger";
import { syncExternalConfigDir } from "./utils";

interface TestContext {
	tempDir: string;
	logContainer: ZWaveLogContainer;
	logger: ConfigLogger;
}

const test = ava as TestFn<TestContext>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ownVersion = require("../package.json").version;

test.before(async (t) => {
	const tempDir = path.join(tmpdir(), "zwavejs_test");
	await fs.ensureDir(tempDir);
	t.context.tempDir = tempDir;

	const logContainer = new ZWaveLogContainer({ enabled: false });
	t.context.logContainer = logContainer;

	t.context.logger = new ConfigLogger(logContainer);
});

test.beforeEach(async (t) => {
	await fs.emptyDir(t.context.tempDir);
});

test.after.always(async (t) => {
	await fs.remove(t.context.tempDir);
});

test.serial(
	"syncExternalConfigDir() syncs the external config dir if it does not exist",
	async (t) => {
		t.timeout(60000);
		const { tempDir, logger } = t.context;

		const configDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;
		await syncExternalConfigDir(logger);

		t.true(await fs.pathExists(configDir));
		t.is(
			await fs.readFile(path.join(configDir, "version"), "utf8"),
			ownVersion,
		);
	},
);

test.serial(
	"syncExternalConfigDir() syncs the external config dir alone if it is from an incompatible version",
	async (t) => {
		t.timeout(60000);
		const { tempDir, logger } = t.context;

		const configDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;
		const otherVersion = semver.inc(ownVersion, "major");

		await fs.ensureDir(configDir);
		await fs.writeFile(
			path.join(configDir, "version"),
			otherVersion,
			"utf8",
		);

		await syncExternalConfigDir(logger);

		t.true(await fs.pathExists(configDir));

		t.is(
			await fs.readFile(path.join(configDir, "version"), "utf8"),
			ownVersion,
		);
	},
);

test.serial(
	"syncExternalConfigDir() leaves the external config dir alone if it is from a newer compatible version",
	async (t) => {
		t.timeout(60000);
		const { tempDir, logger } = t.context;

		const configDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;
		const otherVersion = semver.inc(ownVersion, "prerelease")!;

		await fs.ensureDir(configDir);
		await fs.writeFile(
			path.join(configDir, "version"),
			otherVersion,
			"utf8",
		);

		await syncExternalConfigDir(logger);

		t.true(await fs.pathExists(configDir));

		t.is(
			await fs.readFile(path.join(configDir, "version"), "utf8"),
			otherVersion,
		);
	},
);

test.serial("loading config files from the embedded config dir", async (t) => {
	t.timeout(60000);
	delete process.env.ZWAVEJS_EXTERNAL_CONFIG;

	const { logContainer } = t.context;
	const cm = new ConfigManager({ logContainer });
	await cm.loadAll();

	// Load the Aeotec ZW100 Multisensor 6 - we know that it uses multiple imports that could fail validation
	const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
	t.truthy(device);
	t.true(device?.isEmbedded);
});

test.serial(
	"loading config files from the ZWAVEJS_EXTERNAL_CONFIG",
	async (t) => {
		t.timeout(60000);
		const { tempDir, logContainer } = t.context;

		const configDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;

		const cm = new ConfigManager({ logContainer });
		await cm.loadAll();
		t.true(await fs.pathExists(configDir));

		// Load the Aeotec ZW100 Multisensor 6 - we know that it uses multiple imports that could fail validation
		const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
		t.truthy(device);
		t.true(device?.isEmbedded); // ZWAVEJS_EXTERNAL_CONFIG is still considered as an embedded config
	},
);

async function testDeviceConfigPriorityDir(
	t: ExecutionContext<TestContext>,
	useExternalConfig: boolean,
): Promise<void> {
	const { tempDir } = t.context;

	let externalConfigDir: string;
	if (useExternalConfig) {
		externalConfigDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = externalConfigDir;
	} else {
		delete process.env.ZWAVEJS_EXTERNAL_CONFIG;
	}

	// Set up a dummy structure in the priority dir
	const priorityDir = path.join(tempDir, "priority");
	await fs.ensureDir(priorityDir);
	await fs.ensureDir(path.join(priorityDir, "templates"));
	await fs.writeJSON(
		path.join(priorityDir, "aeotec.json"),
		{
			manufacturer: "AEON Labs",
			manufacturerId: "0x0086",
			label: "ZW100",
			description: "MultiSensor 6",
			devices: [
				{
					productType: "0x0002",
					productId: "0x0064",
				},
			],
			firmwareVersion: {
				min: "0.0",
				max: "255.255",
			},
			paramInformation: [
				{
					"#": "1",
					$import: "templates/template.json#test",
				},
			],
		},
		{ encoding: "utf8", spaces: 4 },
	);
	await fs.writeJSON(
		path.join(priorityDir, "templates/template.json"),
		{
			test: {
				label: "Test",
				valueSize: 1,
				minValue: 1,
				maxValue: 2,
				defaultValue: 1,
				unsigned: true,
			},
		},
		{ encoding: "utf8", spaces: 4 },
	);

	// And load the file
	const cm = new ConfigManager({
		deviceConfigPriorityDir: priorityDir,
		logContainer: new ZWaveLogContainer({ enabled: false }),
	});
	await cm.loadAll();

	if (useExternalConfig) {
		t.true(await fs.pathExists(externalConfigDir!));
	}

	// Load the dummy device
	const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
	t.is(device?.paramInformation?.get({ parameter: 1 })?.label, "Test");
	t.false(device?.isEmbedded); // deviceConfigPriorityDir is considered a user-provided config
}

test.serial(
	"loading config from the deviceConfigPriorityDir (without ZWAVEJS_EXTERNAL_CONFIG)",
	async (t) => {
		t.timeout(60000);
		await testDeviceConfigPriorityDir(t, false);
	},
);

test.serial(
	"loading config from the deviceConfigPriorityDir (with ZWAVEJS_EXTERNAL_CONFIG)",
	async (t) => {
		t.timeout(60000);
		await testDeviceConfigPriorityDir(t, true);
	},
);

test.serial(
	`config files with the "preferred" flag are preferred`,
	async (t) => {
		t.timeout(60000);
		const { logContainer } = t.context;

		const cm = new ConfigManager({ logContainer });
		await cm.loadAll();

		// VES-ZW-REM-010 is preferred
		const preferred = await cm.lookupDevice(0x0330, 0x0300, 0xb302, "1.26");
		// ZV9001K12-DIM-Z4 is the fallback config for the same IDs
		const fallback = await cm.lookupDevice(0x0330, 0x0300, 0xb302, "1.0");
		t.is(preferred?.manufacturer, "Vesternet");
		t.is(fallback?.manufacturer, "Sunricher");
	},
);
