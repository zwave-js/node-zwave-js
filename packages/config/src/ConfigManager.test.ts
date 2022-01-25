/* eslint-disable @typescript-eslint/no-var-requires */
import { ZWaveLogContainer } from "@zwave-js/core";
import * as fs from "fs-extra";
import { tmpdir } from "os";
import * as path from "path";
import * as semver from "semver";
import { ConfigManager } from "./ConfigManager";
import { ConfigLogger } from "./Logger";

describe("ConfigManager", () => {
	describe("syncExternalConfigDir", () => {
		let tempDir: string;
		let logger: ConfigLogger;

		beforeAll(async () => {
			tempDir = path.join(tmpdir(), "zwavejs_test");
			await fs.ensureDir(tempDir);

			logger = new ConfigLogger(
				new ZWaveLogContainer({ enabled: false }),
			);
		});

		beforeEach(async () => {
			await fs.emptyDir(tempDir);
			jest.resetModules();
		});

		afterAll(async () => {
			await fs.remove(tempDir);
		});

		it("syncs the external config dir if it does not exist", async () => {
			jest.setTimeout(60000);

			const configDir = path.join(tempDir, "extconfig");
			process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;
			const { syncExternalConfigDir } = await import("./utils");
			await syncExternalConfigDir(logger);

			expect(await fs.pathExists(configDir)).toBeTrue();
			expect(
				await fs.readFile(path.join(configDir, "version"), "utf8"),
			).toBe(require("../package.json").version);
		});

		it("syncs the external config dir alone if it is from an incompatible version", async () => {
			jest.setTimeout(60000);

			const configDir = path.join(tempDir, "extconfig");
			process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;
			const ownVersion = require("../package.json").version;
			const otherVersion = semver.inc(ownVersion, "major");

			await fs.ensureDir(configDir);
			await fs.writeFile(
				path.join(configDir, "version"),
				otherVersion,
				"utf8",
			);

			const { syncExternalConfigDir } = await import("./utils");
			await syncExternalConfigDir(logger);

			expect(await fs.pathExists(configDir)).toBeTrue();

			expect(
				await fs.readFile(path.join(configDir, "version"), "utf8"),
			).toBe(ownVersion);
		});

		it("leaves the external config dir alone if it is from a newer compatible version", async () => {
			jest.setTimeout(60000);

			const configDir = path.join(tempDir, "extconfig");
			process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;
			const ownVersion = require("../package.json").version;
			const otherVersion = semver.inc(ownVersion, "prerelease");

			await fs.ensureDir(configDir);
			await fs.writeFile(
				path.join(configDir, "version"),
				otherVersion,
				"utf8",
			);

			const { syncExternalConfigDir } = await import("./utils");
			await syncExternalConfigDir(logger);

			expect(await fs.pathExists(configDir)).toBeTrue();

			expect(
				await fs.readFile(path.join(configDir, "version"), "utf8"),
			).toBe(otherVersion);
		});
	});

	describe("loading config files from all possible locations works", () => {
		let tempDir: string;

		beforeAll(async () => {
			tempDir = path.join(tmpdir(), "zwavejs_test");
			await fs.ensureDir(tempDir);
		});

		beforeEach(async () => {
			await fs.emptyDir(tempDir);
			delete process.env.ZWAVEJS_EXTERNAL_CONFIG;
			jest.resetModules();
		});

		afterAll(async () => {
			await fs.remove(tempDir);
		});

		it("from the embedded config dir", async () => {
			jest.setTimeout(60000);

			const cm = new ConfigManager({
				logContainer: new ZWaveLogContainer({ enabled: false }),
			});
			await cm.loadAll();

			// Load the Aeotec ZW100 Multisensor 6 - we know that it uses multiple imports that could fail validation
			const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
			expect(device).not.toBeUndefined();
			expect(device?.isEmbedded).toBeTrue();
		});

		it("from the ZWAVEJS_EXTERNAL_CONFIG", async () => {
			jest.setTimeout(60000);

			const configDir = path.join(tempDir, "extconfig");
			process.env.ZWAVEJS_EXTERNAL_CONFIG = configDir;

			const cm = new ConfigManager({
				logContainer: new ZWaveLogContainer({ enabled: false }),
			});
			await cm.loadAll();
			expect(await fs.pathExists(configDir)).toBeTrue();

			// Load the Aeotec ZW100 Multisensor 6 - we know that it uses multiple imports that could fail validation
			const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
			expect(device).not.toBeUndefined();
			expect(device?.isEmbedded).toBeTrue(); // ZWAVEJS_EXTERNAL_CONFIG is still considered as an embedded config
		});

		async function testDeviceConfigPriorityDir(
			useExternalConfig: boolean,
		): Promise<void> {
			jest.setTimeout(60000);

			let externalConfigDir: string;
			if (useExternalConfig) {
				externalConfigDir = path.join(tempDir, "extconfig");
				process.env.ZWAVEJS_EXTERNAL_CONFIG = externalConfigDir;
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
				expect(await fs.pathExists(externalConfigDir!)).toBeTrue();
			}

			// Load the dummy device
			const device = await cm.lookupDevice(0x0086, 0x0002, 0x0064);
			expect(device?.paramInformation?.get({ parameter: 1 })?.label).toBe(
				"Test",
			);
			expect(device?.isEmbedded).toBeFalse(); // deviceConfigPriorityDir is considered a user-provided config
		}

		it("from the deviceConfigPriorityDir (without ZWAVEJS_EXTERNAL_CONFIG)", () =>
			testDeviceConfigPriorityDir(false));
		it("from the deviceConfigPriorityDir (with ZWAVEJS_EXTERNAL_CONFIG)", () =>
			testDeviceConfigPriorityDir(true));
	});
});
