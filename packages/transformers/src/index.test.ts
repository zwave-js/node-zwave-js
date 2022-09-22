import test from "ava";
import execa from "execa";
import fs from "fs-extra";
import path from "path";

const fixturesDir = path.join(__dirname, "../test/fixtures");
const files: string[] = [];

test.before(async (t) => {
	t.timeout(180000);
	await execa("yarn", ["run", "pretest"], { cwd: __dirname });
	const jsFiles = (await fs.readdir(fixturesDir)).filter(
		(f) => f.startsWith("test") && f.endsWith(".js"),
	);
	files.push(...jsFiles);
});

test("run fixtures", async (t) => {
	for (const file of files) {
		try {
			await execa.node(path.join(fixturesDir, file));
		} catch (e: any) {
			throw new Error(`${file} failed to run: ${e.stack}`);
		}
	}
	t.pass();
});
