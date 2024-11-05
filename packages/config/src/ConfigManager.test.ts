import { ZWaveLogContainer } from "@zwave-js/core";
import { pathExists } from "@zwave-js/shared";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import semver from "semver";
import { type ExpectStatic, beforeEach, test as baseTest } from "vitest";
import { ConfigManager } from "./ConfigManager.js";
import { ConfigLogger } from "./Logger.js";
import { syncExternalConfigDir } from "./utils.js";

interface LocalTestContext {
	context: {
		tempDir: string;
		logContainer: ZWaveLogContainer;
		logger: ConfigLogger;
	};
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ownVersion = require("../package.json").version;

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const tempDir = path.join(tmpdir(), "zwavejs_test");
			await fs.mkdir(tempDir, { recursive: true });

			const logContainer = new ZWaveLogContainer({ enabled: false });
			const logger = new ConfigLogger(logContainer);

			// Run tests
			await use({ tempDir, logContainer, logger });

			// Teardown
			await fs.rm(tempDir, { recursive: true, force: true });
		},
		{ auto: true },
	],
});

beforeEach<LocalTestContext>(async ({ context, expect }) => {
	await fs.rm(context.tempDir, { recursive: true, force: true });
	await fs.mkdir(context.tempDir, { recursive: true });
});

test.sequential(
	"syncExternalConfigDir() syncs the external config dir if it does not exist",
	async ({ context, expect }) => {
		const { tempDir, logger } = context;

		const configDir = path.join(tempDir, "extconfig");
		await syncExternalConfigDir(configDir, logger);

		expect(await pathExists(configDir)).toBe(true);
		expect(
			await fs.readFile(path.join(configDir, "version"), "utf8"),
		).toBe(ownVersion);
	},
	60000,
);

test.sequential(
	"syncExternalConfigDir() syncs the external config dir alone if it is from an incompatible version",
	async ({ context, expect }) => {
		const { tempDir, logger } = context;

		const configDir = path.join(tempDir, "extconfig");
		const otherVersion = semver.inc(ownVersion, "major");

		await fs.mkdir(configDir, { recursive: true });
		await fs.writeFile(
			path.join(configDir, "version"),
			otherVersion!,
			"utf8",
		);

		await syncExternalConfigDir(configDir, logger);

		expect(await pathExists(configDir)).toBe(true);

		expect(
			await fs.readFile(path.join(configDir, "version"), "utf8"),
		).toBe(ownVersion);
	},
	60000,
);

test.sequential(
	"syncExternalConfigDir() leaves the external config dir alone if it is from a newer compatible version",
	async ({ context, expect }) => {
		const { tempDir, logger } = context;

		const configDir = path.join(tempDir, "extconfig");
		const otherVersion = semver.inc(ownVersion, "prerelease")!;

		await fs.mkdir(configDir, { recursive: true });
		await fs.writeFile(
			path.join(configDir, "version"),
			otherVersion,
			"utf8",
		);

		await syncExternalConfigDir(configDir, logger);

		expect(await pathExists(configDir)).toBe(true);

		expect(
			await fs.readFile(path.join(configDir, "version"), "utf8"),
		).toBe(otherVersion);
	},
	60000,
);

test.sequential(
	"loading config files from the embedded config dir",
	async ({ context, expect }) => {
		delete process.env.ZWAVEJS_EXTERNAL_CONFIG;

		const { logContainer } = context;
		const cm = new ConfigManager({ logContainer });
		await cm.loadAll();

		// Load the Aeotec ZW100 Multisensor 6 - we know that it uses multiple imports that could fail validation
		const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
		expect(device).toBeDefined();
		expect(device?.isEmbedded).toBe(true);
	},
	60000,
);

test.sequential(
	"loading config files from the ZWAVEJS_EXTERNAL_CONFIG",
	async ({ context, expect }) => {
		const { tempDir, logContainer } = context;

		const configDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;

		const cm = new ConfigManager({ logContainer });
		await cm.loadAll();
		expect(await pathExists(configDir)).toBe(true);

		// Load the Aeotec ZW100 Multisensor 6 - we know that it uses multiple imports that could fail validation
		const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
		expect(device).toBeDefined();
		expect(device?.isEmbedded).toBe(true); // ZWAVEJS_EXTERNAL_CONFIG is still considered as an embedded config
	},
	60000,
);

async function testDeviceConfigPriorityDir(
	expect: ExpectStatic,
	context: LocalTestContext["context"],
	useExternalConfig: boolean,
): Promise<void> {
	const { tempDir } = context;

	let externalConfigDir: string;
	if (useExternalConfig) {
		externalConfigDir = path.join(tempDir, "extconfig");
		process.env.ZWAVEJS_EXTERNAL_CONFIG = externalConfigDir;
	} else {
		delete process.env.ZWAVEJS_EXTERNAL_CONFIG;
	}

	// Set up a dummy structure in the priority dir
	const priorityDir = path.join(tempDir, "priority");
	await fs.mkdir(path.join(priorityDir, "templates"), { recursive: true });
	let json: any = {
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
	};
	await fs.writeFile(
		path.join(priorityDir, "aeotec.json"),
		JSON.stringify(json, null, 4),
	);
	json = {
		test: {
			label: "Test",
			valueSize: 1,
			minValue: 1,
			maxValue: 2,
			defaultValue: 1,
			unsigned: true,
		},
	};
	await fs.writeFile(
		path.join(priorityDir, "templates/template.json"),
		JSON.stringify(json, null, 4),
	);

	// And load the file
	const cm = new ConfigManager({
		deviceConfigPriorityDir: priorityDir,
		logContainer: new ZWaveLogContainer({ enabled: false }),
	});
	await cm.loadAll();

	if (useExternalConfig) {
		expect(await pathExists(externalConfigDir!)).toBe(true);
	}

	// Load the dummy device
	const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
	expect(device?.paramInformation?.get({ parameter: 1 })?.label).toBe("Test");
	expect(device?.isEmbedded).toBe(false); // deviceConfigPriorityDir is considered a user-provided config
}

test.sequential(
	"loading config from the deviceConfigPriorityDir (without ZWAVEJS_EXTERNAL_CONFIG)",
	async ({ context, expect }) => {
		await testDeviceConfigPriorityDir(expect, context, false);
	},
	60000,
);

test.sequential(
	"loading config from the deviceConfigPriorityDir (with ZWAVEJS_EXTERNAL_CONFIG)",
	async ({ context, expect }) => {
		await testDeviceConfigPriorityDir(expect, context, true);
	},
	60000,
);

test.sequential(
	`config files with the "preferred" flag are preferred`,
	async ({ context, expect }) => {
		const { logContainer } = context;

		const cm = new ConfigManager({ logContainer });
		await cm.loadAll();

		// VES-ZW-REM-010 is preferred
		const preferred = await cm.lookupDevice(0x0330, 0x0300, 0xb302, "1.26");
		// ZV9001K12-DIM-Z4 is the fallback config for the same IDs
		const fallback = await cm.lookupDevice(0x0330, 0x0300, 0xb302, "1.0");
		expect(preferred?.manufacturer).toBe("Vesternet");
		expect(fallback?.manufacturer).toBe("Sunricher");
	},
	60000,
);
