import { CommandClasses } from "@zwave-js/core";
import test from "ava";
import path from "path";
import { ConfigManager } from "../ConfigManager";

test("hash() works", async (t) => {
	// This test might take a while
	t.timeout(60000);

	const configManager = new ConfigManager({
		deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
	});
	const config = (await configManager.lookupDevice(
		0xffff,
		0xcafe,
		0xbeef,
		"1.0",
	))!;
	t.not(config, undefined);

	const hash = config.getHash();
	t.true(Buffer.isBuffer(hash));
});

test("hash() changes when changing a parameter info", async (t) => {
	// This test might take a while
	t.timeout(60000);

	const configManager = new ConfigManager({
		deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
	});
	const config = (await configManager.lookupDevice(
		0xffff,
		0xcafe,
		0xbeef,
		"1.0",
	))!;
	t.not(config, undefined);

	const hash1 = config.getHash();

	// @ts-expect-error
	config.paramInformation!.get({ parameter: 2 })!.unit = "lightyears";
	const hash2 = config.getHash();

	t.notDeepEqual(hash1, hash2);
});

test("hash() changes when removing a CC", async (t) => {
	// This test might take a while
	t.timeout(60000);

	const configManager = new ConfigManager({
		deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
	});
	const config = (await configManager.lookupDevice(
		0xffff,
		0xcafe,
		0xbeef,
		"1.0",
	))!;
	t.not(config, undefined);

	const hash1 = config.getHash();

	const removeCCs = new Map();
	removeCCs.set(CommandClasses["All Switch"], "*");
	// @ts-expect-error
	config.compat!.removeCCs = removeCCs;

	const hash2 = config.getHash();

	t.notDeepEqual(hash1, hash2);
});

test("hash() does not crash for devices with a proprietary field", async (t) => {
	// This test might take a while
	t.timeout(60000);

	const configManager = new ConfigManager({
		deviceConfigPriorityDir: path.join(__dirname, "__fixtures/hash"),
	});
	const config = (await configManager.lookupDevice(
		0xffff,
		0xdead,
		0xbeef,
		"1.0",
	))!;
	t.not(config, undefined);

	config.getHash();
});
