import { CommandClasses } from "@zwave-js/core";
import { isUint8Array } from "@zwave-js/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { ConfigManager } from "../ConfigManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test(
	"hash() works",
	async (t) => {
		const configManager = new ConfigManager({
			deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
		});
		const config = (await configManager.lookupDevice(
			0xffff,
			0xcafe,
			0xbeef,
			"1.0",
		))!;
		t.expect(config).toBeDefined();

		const hash = await config.getHash();
		t.expect(isUint8Array(hash)).toBe(true);
	},
	// This test might take a while
	60000,
);

test(
	"hash() changes when changing a parameter info",
	async (t) => {
		const configManager = new ConfigManager({
			deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
		});
		const config = (await configManager.lookupDevice(
			0xffff,
			0xcafe,
			0xbeef,
			"1.0",
		))!;
		t.expect(config).toBeDefined();

		const hash1 = await config.getHash();

		// @ts-expect-error
		config.paramInformation!.get({ parameter: 2 })!.unit = "lightyears";
		const hash2 = await config.getHash();

		t.expect(hash1).not.toStrictEqual(hash2);
	},
	// This test might take a while
	60000,
);

test(
	"hash() changes when removing a CC",
	async (t) => {
		const configManager = new ConfigManager({
			deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
		});
		const config = (await configManager.lookupDevice(
			0xffff,
			0xcafe,
			0xbeef,
			"1.0",
		))!;
		t.expect(config).toBeDefined();

		const hash1 = await config.getHash();

		const removeCCs = new Map();
		removeCCs.set(CommandClasses["All Switch"], "*");
		// @ts-expect-error
		config.compat!.removeCCs = removeCCs;

		const hash2 = await config.getHash();

		t.expect(hash1).not.toStrictEqual(hash2);
	},
	// This test might take a while
	60000,
);

test(
	"hash() does not crash for devices with a proprietary field",
	async (t) => {
		const configManager = new ConfigManager({
			deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
		});
		const config = (await configManager.lookupDevice(
			0xffff,
			0xdead,
			0xbeef,
			"1.0",
		))!;
		t.expect(config).toBeDefined();

		config.getHash();
	},
	// This test might take a while
	60000,
);
