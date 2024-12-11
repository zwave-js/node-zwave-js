import { fs } from "@zwave-js/core/bindings/fs/node";
import { readJSON } from "@zwave-js/shared";
import { cloneDeep } from "@zwave-js/shared/safe";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ExpectStatic, test } from "vitest";
import {
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
	actual: Uint8Array,
	expected: Uint8Array,
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
				while (expected.controller.applicationData.startsWith("00")) {
					expected.controller.applicationData = expected.controller
						.applicationData.slice(2);
				}
				while (expected.controller.applicationData.endsWith("00")) {
					expected.controller.applicationData = expected.controller
						.applicationData.slice(0, -2);
				}
				if (expected.controller.applicationData.length > 1024) {
					expected.controller.applicationData = expected.controller
						.applicationData.slice(0, 1024);
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
