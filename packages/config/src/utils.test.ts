/* eslint-disable @typescript-eslint/no-var-requires */
import { ZWaveLogContainer } from "@zwave-js/core";
import * as fs from "fs-extra";
import { tmpdir } from "os";
import * as path from "path";
import * as semver from "semver";
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
});
