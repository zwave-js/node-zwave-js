import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, test } from "vitest";

const fixturesDir = path.join(__dirname, "../test/fixtures");
const files: string[] = [];

beforeAll(async (t) => {
	const { execa } = await import("execa");
	await execa("yarn", ["run", "pretest"], { cwd: __dirname });
	const jsFiles = (await fs.readdir(fixturesDir)).filter(
		(f) =>
			f.startsWith("test")
			&& f.endsWith(".mjs")
			&& !f.endsWith("._validateArgs.mjs"),
	);
	files.push(...jsFiles);
}, 360000);

test("run fixtures", async (t) => {
	const { execaNode } = await import("execa");
	for (const file of files) {
		try {
			await execaNode(path.join(fixturesDir, file));
		} catch (e: any) {
			throw new Error(`${file} failed to run: ${e.stack}`);
		}
	}
}, 360000);
