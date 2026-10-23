import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fs } from "@zwave-js/core/bindings/fs/node";
import { cloneDeep, readJSON } from "@zwave-js/shared";
import { type ExpectStatic, test } from "vitest";

import {
	type MigrateNVMOptions,
	type NVMJSON,
	json500To700,
	json700To500,
	jsonToNVM,
	jsonToNVM500,
	migrateNVM,
	nvm500ToJSON,
	nvmToJSON,
} from "./convert.js";
import type { NVM500JSON } from "./nvm500/NVMParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function bufferEquals(
	expect: ExpectStatic,
	actual: BytesView,
	expected: BytesView,
) {
	expect(actual.buffer).toStrictEqual(expected.buffer);
}

{
	const suite = "700-series, binary to JSON";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");
	const files = await fsp.readdir(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const data = await fsp.readFile(path.join(fixturesDir, file));
			const json = await nvmToJSON(data);
			t.expect(json).toMatchSnapshot();
		});
	}
}

{
	const suite = "700 series, JSON to NVM to JSON round-trip";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_json");
	const files = await fsp.readdir(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const jsonInput: NVMJSON = await readJSON(
				fs,
				path.join(fixturesDir, file),
			);
			const nvm = await jsonToNVM(
				jsonInput,
				jsonInput.controller.applicationVersion,
			);
			const jsonOutput = await nvmToJSON(nvm);
			// @ts-expect-error
			if (!("meta" in jsonInput)) delete jsonOutput.meta;

			t.expect(jsonOutput).toStrictEqual(jsonInput);
		});
	}
}

{
	const suite = "700 series, NVM to JSON to NVM invariants";

	const fixturesDir = path.join(
		__dirname,
		"../test/fixtures/nvm_700_invariants",
	);
	const files = await fsp.readdir(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const nvmIn = await fsp.readFile(path.join(fixturesDir, file));

			const version = /_(\d+\.\d+\.\d+)[_.]/.exec(file)![1];
			const json = await nvmToJSON(nvmIn);
			const nvmOut = await jsonToNVM(json, version);

			bufferEquals(t.expect, nvmOut, nvmIn);
		});
	}
}

{
	const suite = "500-series, binary to JSON";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_500_binary");
	const files = await fsp.readdir(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const data = await fsp.readFile(path.join(fixturesDir, file));
			const json = await nvm500ToJSON(data);
			t.expect(json).toMatchSnapshot();
		});
	}
}

{
	const suite = "500 series, NVM to JSON to NVM invariants";

	const fixturesDir = path.join(
		__dirname,
		"../test/fixtures/nvm_500_invariants",
	);
	const files = await fsp.readdir(fixturesDir);

	// For debugging purposes
	// function toHex(buffer: Buffer): string {
	// 	let ret: string =
	// 		"      00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f";
	// 	for (let i = 0; i < buffer.length; i++) {
	// 		if (i % 16 === 0) {
	// 			ret += "\n" + i.toString(16).padStart(4, "0") + ": ";
	// 		}
	// 		ret += buffer[i].toString(16).padStart(2, "0");
	// 		if (i % 16 !== 15) {
	// 			ret += " ";
	// 		}
	// 	}
	// 	return ret;
	// }

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const nvmIn = await fsp.readFile(path.join(fixturesDir, file));

			// const lib = /_(static|bridge)_/.exec(file)![1];
			const json = await nvm500ToJSON(nvmIn);
			const nvmOut = await jsonToNVM500(
				json,
				json.controller.protocolVersion,
			);

			bufferEquals(t.expect, nvmOut, nvmIn);
		});
	}
}

{
	const suite = "500 to 700 series JSON conversion";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_500_json");
	const files = await fsp.readdir(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const json500: NVM500JSON = await readJSON(
				fs,
				path.join(fixturesDir, file),
			);
			const json700 = json500To700(json500, true);
			t.expect(json700).toMatchSnapshot();
		});
	}
}

{
	const suite = "500 to 700 to 500 series JSON round-trip";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_500_json");
	const files = await fsp.readdir(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const json500: NVM500JSON = await readJSON(
				fs,
				path.join(fixturesDir, file),
			);
			const json700 = json500To700(json500, true);
			const output = json700To500(json700);
			const expected = cloneDeep(json500);
			// There are some expected normalizations
			delete expected.meta;
			if (expected.controller.applicationData) {
				if (expected.controller.applicationData.startsWith("00")) {
					while (
						expected.controller.applicationData.startsWith("00")
					) {
						expected.controller.applicationData =
							expected.controller.applicationData.slice(2);
					}
					while (
						expected.controller.applicationData.startsWith("ff")
					) {
						expected.controller.applicationData =
							expected.controller.applicationData.slice(2);
					}
				}
				while (expected.controller.applicationData.endsWith("00")) {
					expected.controller.applicationData =
						expected.controller.applicationData.slice(0, -2);
				}
				if (expected.controller.applicationData.length > 1024) {
					expected.controller.applicationData =
						expected.controller.applicationData.slice(0, 1024);
				}
			}
			t.expect(output).toStrictEqual(expected);
		});
	}
}

test("700 to 700 migration shortcut", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);
	const converted = await migrateNVM(nvmSource, nvmTarget);

	bufferEquals(t.expect, converted, nvmSource);
});

test("700 to 700 migration repairs the application node listening flag", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const sourceJSON = await nvmToJSON(nvmSource);
	sourceJSON.controller.isListening = false;
	const sourceWithInvalidNodeInfo = await jsonToNVM(
		sourceJSON,
		sourceJSON.controller.applicationVersion,
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const converted = await migrateNVM(sourceWithInvalidNodeInfo, nvmTarget);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.isListening).toBe(true);
	t.expect(
		convertedJSON.nodes[convertedJSON.controller.nodeId].isListening,
	).toBe(true);
});

test("500 to 700 migration repairs the application node listening flag", async (t) => {
	const fixturesDir500 = path.join(
		__dirname,
		"../test/fixtures/nvm_500_binary",
	);
	const fixturesDir700 = path.join(
		__dirname,
		"../test/fixtures/nvm_700_binary",
	);

	const nvmSource = await fsp.readFile(
		path.join(fixturesDir500, "ctrlr_backup_500_static_6.8x.bin"),
	);
	const sourceJSON = await nvm500ToJSON(nvmSource);
	sourceJSON.nodes[sourceJSON.controller.nodeId || 1].isListening = false;
	const sourceWithInvalidNodeInfo = await jsonToNVM500(
		sourceJSON,
		sourceJSON.controller.protocolVersion,
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir700, "ctrlr_backup_700_7.16_1.bin"),
	);

	const converted = await migrateNVM(sourceWithInvalidNodeInfo, nvmTarget);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.isListening).toBe(true);
	t.expect(
		convertedJSON.nodes[convertedJSON.controller.nodeId].isListening,
	).toBe(true);
});

test("700 to 700 migration sets the Static Controller device class", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const sourceJSON = await nvmToJSON(nvmSource);
	const controllerNodeId = sourceJSON.controller.nodeId;
	sourceJSON.controller.genericDeviceClass = 0x01;
	sourceJSON.controller.specificDeviceClass = 0x00;
	Object.assign(sourceJSON.nodes[controllerNodeId], {
		genericDeviceClass: 0x01,
		specificDeviceClass: 0x00,
	});
	const sourceWithInvalidNodeInfo = await jsonToNVM(
		sourceJSON,
		sourceJSON.controller.applicationVersion,
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const converted = await migrateNVM(sourceWithInvalidNodeInfo, nvmTarget);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.genericDeviceClass).toBe(0x02);
	t.expect(convertedJSON.controller.specificDeviceClass).toBe(0x01);
	t.expect(convertedJSON.nodes[controllerNodeId]).toMatchObject({
		genericDeviceClass: 0x02,
		specificDeviceClass: 0x01,
	});
});

test("700 to 700 migration does not take the shortcut for a wrong device class", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);
	const sourceJSON = await nvmToJSON(nvmSource);
	sourceJSON.controller.genericDeviceClass = 0x01;
	const sourceWithInvalidNodeInfo = await jsonToNVM(
		sourceJSON,
		sourceJSON.controller.applicationVersion,
	);

	const converted = await migrateNVM(sourceWithInvalidNodeInfo, nvmSource);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.genericDeviceClass).toBe(0x02);
	t.expect(convertedJSON.controller.specificDeviceClass).toBe(0x01);
});

test("500 to 700 migration sets the Static Controller device class", async (t) => {
	const fixturesDir500 = path.join(
		__dirname,
		"../test/fixtures/nvm_500_binary",
	);
	const fixturesDir700 = path.join(
		__dirname,
		"../test/fixtures/nvm_700_binary",
	);

	const nvmSource = await fsp.readFile(
		path.join(fixturesDir500, "ctrlr_backup_500_static_6.8x.bin"),
	);
	const sourceJSON = await nvm500ToJSON(nvmSource);
	const controllerNodeId = sourceJSON.controller.nodeId || 1;
	Object.assign(sourceJSON.nodes[controllerNodeId], {
		genericDeviceClass: 0xff,
		specificDeviceClass: 0xff,
	});
	const sourceWithInvalidNodeInfo = await jsonToNVM500(
		sourceJSON,
		sourceJSON.controller.protocolVersion,
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir700, "ctrlr_backup_700_7.16_1.bin"),
	);

	const converted = await migrateNVM(sourceWithInvalidNodeInfo, nvmTarget);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.genericDeviceClass).toBe(0x02);
	t.expect(convertedJSON.controller.specificDeviceClass).toBe(0x01);
	t.expect(
		convertedJSON.nodes[convertedJSON.controller.nodeId],
	).toMatchObject({
		genericDeviceClass: 0x02,
		specificDeviceClass: 0x01,
	});
});

test("migration keeps the specific device class of a Static Controller", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const sourceJSON = await nvmToJSON(nvmSource);
	const controllerNodeId = sourceJSON.controller.nodeId;
	// Clear the listening flag to force a full conversion
	sourceJSON.controller.isListening = false;
	sourceJSON.controller.genericDeviceClass = 0x02;
	sourceJSON.controller.specificDeviceClass = 0x07;
	Object.assign(sourceJSON.nodes[controllerNodeId], {
		genericDeviceClass: 0x02,
		specificDeviceClass: 0x07,
	});
	const source = await jsonToNVM(
		sourceJSON,
		sourceJSON.controller.applicationVersion,
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const converted = await migrateNVM(source, nvmTarget);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.isListening).toBe(true);
	t.expect(convertedJSON.controller.genericDeviceClass).toBe(0x02);
	t.expect(convertedJSON.controller.specificDeviceClass).toBe(0x07);
	t.expect(convertedJSON.nodes[controllerNodeId]).toMatchObject({
		genericDeviceClass: 0x02,
		specificDeviceClass: 0x07,
	});
});

test("strip application data during migration", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const options: MigrateNVMOptions = {
		preserveApplicationData: false,
	};

	const converted = await migrateNVM(nvmSource, nvmTarget, options);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.applicationData).toBeNull();
});

test("strip neighbors during migration", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const options: MigrateNVMOptions = {
		preserveNeighbors: false,
	};

	const converted = await migrateNVM(nvmSource, nvmTarget, options);
	const convertedJSON = await nvmToJSON(converted);

	for (const node of Object.values(convertedJSON.nodes)) {
		if (node.isVirtual) continue;
		t.expect(node.neighbors).toEqual([]);
	}
});

test("strip SUC entries during migration", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const options: MigrateNVMOptions = {
		preserveSUCUpdateEntries: false,
	};

	const converted = await migrateNVM(nvmSource, nvmTarget, options);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.sucUpdateEntries).toEqual([]);
	t.expect(convertedJSON.controller.sucLastIndex).toBe(0xff);

	for (const node of Object.values(convertedJSON.nodes)) {
		if (node.isVirtual) continue;
		t.expect(node.sucUpdateIndex).toBe(0xfe);
	}
});

test("strip routes during migration", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const options: MigrateNVMOptions = {
		preserveSUCUpdateEntries: false,
	};

	const converted = await migrateNVM(nvmSource, nvmTarget, options);
	const convertedJSON = await nvmToJSON(converted);

	for (const node of Object.values(convertedJSON.nodes)) {
		if (node.isVirtual) continue;
		t.expect(node.lwr).toBeNull();
		t.expect(node.nlwr).toBeNull();
		t.expect(node.appRouteLock).toBe(false);
	}
});

test("strip everything optional during migration", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fsp.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fsp.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);

	const options: MigrateNVMOptions = {
		preserveSUCUpdateEntries: false,
		preserveApplicationData: false,
		preserveNeighbors: false,
		preserveRoutes: false,
	};

	const converted = await migrateNVM(nvmSource, nvmTarget, options);
	const convertedJSON = await nvmToJSON(converted);

	t.expect(convertedJSON.controller.sucUpdateEntries).toEqual([]);
	t.expect(convertedJSON.controller.sucLastIndex).toBe(0xff);

	for (const node of Object.values(convertedJSON.nodes)) {
		if (node.isVirtual) continue;

		t.expect(convertedJSON.controller.applicationData).toBeNull();
		t.expect(node.neighbors).toEqual([]);
		t.expect(node.sucUpdateIndex).toBe(0xfe);
		t.expect(node.lwr).toBeNull();
		t.expect(node.nlwr).toBeNull();
		t.expect(node.appRouteLock).toBe(false);
	}
});

test("700 series, JSON to NVM to JSON round-trip preserves virtual nodes without node info", async (t) => {
	const jsonInput: NVMJSON = await readJSON(
		fs,
		path.join(
			__dirname,
			"../test/fixtures/nvm_700_json/ctrlr_backup_700_7.19.0.json",
		),
	);
	jsonInput.nodes[50] = { isVirtual: true };

	const expected = cloneDeep(jsonInput.nodes);
	const nvm = await jsonToNVM(
		jsonInput,
		jsonInput.controller.applicationVersion,
	);
	const jsonOutput = await nvmToJSON(nvm);

	t.expect(jsonOutput.nodes).toStrictEqual(expected);
});

test("700 series, JSON to NVM to JSON round-trip preserves the shape of LR nodes", async (t) => {
	const jsonInput: NVMJSON = await readJSON(
		fs,
		path.join(
			__dirname,
			"../test/fixtures/nvm_700_json/ctrlr_backup_700_7.19.0.json",
		),
	);
	jsonInput.lrNodes = {
		256: {
			isListening: false,
			isFrequentListening: "1000ms",
			isRouting: false,
			supportedDataRates: [100000],
			protocolVersion: 3,
			optionalFunctionality: true,
			nodeType: 1,
			supportsSecurity: true,
			supportsBeaming: false,
			genericDeviceClass: 0x40,
			specificDeviceClass: 0x03,
		},
	};

	const expected = cloneDeep(jsonInput.lrNodes);
	const nvm = await jsonToNVM(
		jsonInput,
		jsonInput.controller.applicationVersion,
	);
	const jsonOutput = await nvmToJSON(nvm);

	t.expect(jsonOutput.lrNodes).toStrictEqual(expected);
});

test("500 series (bridge), JSON to NVM to JSON round-trip preserves virtual nodes", async (t) => {
	const jsonInput: Required<NVM500JSON> = await readJSON(
		fs,
		path.join(
			__dirname,
			"../test/fixtures/nvm_500_json/ctrlr_backup_500_static_6.8x.json",
		),
	);
	// Only the bridge library has a virtual node pool
	jsonInput.meta.library = "bridge";
	jsonInput.nodes[50] = { isVirtual: true };
	jsonInput.nodes[51] = { ...cloneDeep(jsonInput.nodes[3]), isVirtual: true };

	const expected = cloneDeep(jsonInput.nodes);
	const nvm = await jsonToNVM500(
		jsonInput,
		jsonInput.controller.protocolVersion,
	);
	const jsonOutput = await nvm500ToJSON(nvm);

	t.expect(jsonOutput.nodes).toStrictEqual(expected);
});

test("500 series, JSON to NVM to JSON round-trip preserves a specific device class of 0", async (t) => {
	const jsonInput: Required<NVM500JSON> = await readJSON(
		fs,
		path.join(
			__dirname,
			"../test/fixtures/nvm_500_json/ctrlr_backup_500_static_6.8x.json",
		),
	);
	const node = jsonInput.nodes[3];
	if (!("genericDeviceClass" in node)) throw new Error("Unexpected fixture");
	node.genericDeviceClass = 0;
	node.specificDeviceClass = 0;

	const expected = cloneDeep(jsonInput.nodes);
	const nvm = await jsonToNVM500(
		jsonInput,
		jsonInput.controller.protocolVersion,
	);
	const jsonOutput = await nvm500ToJSON(nvm);

	t.expect(jsonOutput.nodes).toStrictEqual(expected);
});
