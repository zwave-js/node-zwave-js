import fs from "fs-extra";
import path from "path";
import { nvmToJSON } from "./convert";

describe("NVM conversion tests (700-series, binary)", () => {
	const fixturesDir = path.join(__dirname, "../test/fixtures/nvm_700_binary");
	const files = fs.readdirSync(fixturesDir);

	for (const file of files) {
		it(file, async () => {
			const data = await fs.readFile(path.join(fixturesDir, file));
			const json = nvmToJSON(data);
			// const formatted = JSON.stringify(json, null, "\t");
			expect(json).toMatchSnapshot();
		});
	}
});
