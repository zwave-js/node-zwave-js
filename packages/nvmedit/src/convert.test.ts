import fs from "fs-extra";
import path from "path";
import {
	jsonToNVMObjects_v3,
	NVMJSON,
	nvmObjectsToJSON,
	nvmToJSON,
} from "./convert";
import { encodeNVM } from "./nvm";

describe("NVM conversion tests", () => {
	describe("700-series, binary to JSON", () => {
		const fixturesDir = path.join(
			__dirname,
			"../test/fixtures/nvm_700_binary",
		);
		const files = fs.readdirSync(fixturesDir);

		for (const file of files) {
			it(file, async () => {
				const data = await fs.readFile(path.join(fixturesDir, file));
				const json = nvmToJSON(data);
				expect(json).toMatchSnapshot();
			});
		}
	});

	describe("7.16 firmware, JSON to objects to JSON round-trip", () => {
		const fixturesDir = path.join(
			__dirname,
			"../test/fixtures/nvm_700_json",
		);
		const files = fs.readdirSync(fixturesDir);

		for (const file of files) {
			if (file.includes("700_7.16")) {
				it(file, async () => {
					const jsonInput: NVMJSON = await fs.readJson(
						path.join(fixturesDir, file),
					);
					const [major, minor, patch] =
						jsonInput.controller.protocolVersion
							.split(".")
							.map((v) => parseInt(v));
					const nvm = jsonToNVMObjects_v3(
						jsonInput,
						major,
						minor,
						patch,
					);
					const jsonOutput = nvmObjectsToJSON(
						nvm.applicationObjects,
						nvm.protocolObjects,
					);

					expect(jsonOutput).toEqual(jsonInput);
				});
			}
		}
	});

	describe("7.16 firmware, JSON to NVM to JSON round-trip", () => {
		const fixturesDir = path.join(
			__dirname,
			"../test/fixtures/nvm_700_json",
		);
		const files = fs.readdirSync(fixturesDir);

		for (const file of files) {
			if (file.includes("700_7.16")) {
				it(file, async () => {
					const jsonInput: NVMJSON = await fs.readJson(
						path.join(fixturesDir, file),
					);
					const [major, minor, patch] =
						jsonInput.controller.protocolVersion
							.split(".")
							.map((v) => parseInt(v));
					// round 1
					const objects = jsonToNVMObjects_v3(
						jsonInput,
						major,
						minor,
						patch,
					);
					const nvm = encodeNVM(
						objects.applicationObjects,
						objects.protocolObjects,
					);
					const jsonOutput = nvmToJSON(nvm);

					expect(jsonOutput).toEqual(jsonInput);
				});
			}
		}
	});

	describe("7.16 firmware, NVM to JSON to NVM invariants", () => {
		const fixturesDir = path.join(
			__dirname,
			"../test/fixtures/nvm_700_invariants",
		);
		const files = fs.readdirSync(fixturesDir);

		for (const file of files) {
			it(file, async () => {
				const nvmIn = await fs.readFile(path.join(fixturesDir, file));

				const version = /_(\d+\.\d+\.\d+)_/.exec(file)![1];
				const [major, minor, patch] = version
					.split(".")
					.map((v) => parseInt(v));

				const json = nvmToJSON(nvmIn);
				const objects = jsonToNVMObjects_v3(json, major, minor, patch);
				const nvmOut = encodeNVM(
					objects.applicationObjects,
					objects.protocolObjects,
					json.meta,
				);

				expect(nvmOut).toEqual(nvmIn);
			});
		}
	});
});
