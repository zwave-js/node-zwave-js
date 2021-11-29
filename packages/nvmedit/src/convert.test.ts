import fs from "fs-extra";
import path from "path";
import { jsonToNVM_v3, NVMJSON, nvmObjectsToJSON, nvmToJSON } from "./convert";

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

	describe("7.16 firmware, JSON to binary to JSON round-trip", () => {
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
					const nvm = jsonToNVM_v3(jsonInput, major, minor, patch);
					const jsonOutput = nvmObjectsToJSON(
						nvm.applicationObjects,
						nvm.protocolObjects,
					);

					expect(jsonOutput).toEqual(jsonInput);
				});
			}
		}
	});
});
