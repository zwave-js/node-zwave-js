import { cloneDeep } from "@zwave-js/shared/safe";
import test from "ava";
import fs from "fs-extra";
import path from "path";
import { jsonToNVM, migrateNVM } from ".";
import {
	type NVMJSON,
	json500To700,
	json700To500,
	jsonToNVM500,
	nvm500ToJSON,
	nvmToJSON,
} from "./convert";
import type { NVM500JSON } from "./nvm500/NVMParser";

{
	const suite = "700-series, binary to JSON";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const data = await fs.readFile(path.join(fixturesDir, file));
			const json = nvmToJSON(data);
			t.snapshot(json);
		});
	}
}

{
	const suite = "700 series, JSON to NVM to JSON round-trip";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_json");
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const jsonInput: Required<NVMJSON> = await fs.readJson(
				path.join(fixturesDir, file),
			);
			const nvm = jsonToNVM(
				jsonInput,
				jsonInput.controller.applicationVersion,
			);
			const jsonOutput = nvmToJSON(nvm);
			// @ts-expect-error
			if (!("meta" in jsonInput)) delete jsonOutput.meta;

			t.deepEqual(jsonOutput, jsonInput);
		});
	}
}

{
	const suite = "700 series, NVM to JSON to NVM invariants";

	const fixturesDir = path.join(
		__dirname,
		"../test/fixtures/nvm_700_invariants",
	);
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const nvmIn = await fs.readFile(path.join(fixturesDir, file));

			const version = /_(\d+\.\d+\.\d+)[_.]/.exec(file)![1];
			const json = nvmToJSON(nvmIn);
			const nvmOut = jsonToNVM(json, version);

			t.deepEqual(nvmOut, nvmIn);
		});
	}
}

{
	const suite = "500-series, binary to JSON";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_500_binary");
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const data = await fs.readFile(path.join(fixturesDir, file));
			const json = nvm500ToJSON(data);
			t.snapshot(json);
		});
	}
}

{
	const suite = "500 series, NVM to JSON to NVM invariants";

	const fixturesDir = path.join(
		__dirname,
		"../test/fixtures/nvm_500_invariants",
	);
	const files = fs.readdirSync(fixturesDir);

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
			const nvmIn = await fs.readFile(path.join(fixturesDir, file));

			// const lib = /_(static|bridge)_/.exec(file)![1];
			const json = nvm500ToJSON(nvmIn);
			const nvmOut = jsonToNVM500(json, json.controller.protocolVersion);

			t.deepEqual(nvmOut, nvmIn);
		});
	}
}

{
	const suite = "500 to 700 series JSON conversion";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_500_json");
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const json500: NVM500JSON = await fs.readJson(
				path.join(fixturesDir, file),
			);
			const json700 = json500To700(json500, true);
			t.snapshot(json700);
		});
	}
}

{
	const suite = "500 to 700 to 500 series JSON round-trip";

	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_500_json");
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		test(`${suite} -> ${file}`, async (t) => {
			const json500: NVM500JSON = await fs.readJson(
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
			t.deepEqual(output, expected);
		});
	}
}

test("700 to 700 migration shortcut", async (t) => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");

	const nvmSource = await fs.readFile(
		// cannot use 7.11.bin because it has an invalid combination of protocol
		// and application version
		path.join(fixturesDir, "ctrlr_backup_700_7.12.bin"),
	);
	const nvmTarget = await fs.readFile(
		path.join(fixturesDir, "ctrlr_backup_700_7.16_1.bin"),
	);
	const converted = migrateNVM(nvmSource, nvmTarget);

	t.deepEqual(converted, nvmSource);
});
