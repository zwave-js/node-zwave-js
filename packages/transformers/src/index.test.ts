import execa from "execa";
import fs from "fs-extra";
import path from "path";

const fixturesDir = path.join(__dirname, "../test/fixtures");

describe("TypeScript transformers", () => {
	const files: string[] = [];

	beforeAll(async () => {
		await execa("yarn", ["run", "pretest"], { cwd: __dirname });
		const jsFiles = (await fs.readdir(fixturesDir)).filter(
			(f) => f.startsWith("test") && f.endsWith(".js"),
		);
		files.push(...jsFiles);
	}, 180000);

	it("run fixtures", async () => {
		for (const file of files) {
			try {
				await execa.node(path.join(fixturesDir, file));
			} catch (e: any) {
				throw new Error(`${file} failed to run: ${e.stack}`);
			}
		}
	});
});
