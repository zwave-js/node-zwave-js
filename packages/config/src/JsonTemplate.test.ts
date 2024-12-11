import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { fs } from "@zwave-js/core/bindings/fs/node";
import fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeAll, test } from "vitest";
import { readJsonWithTemplate } from "./JsonTemplate.js";

const mockDir = path.join(tmpdir(), `zwave-js-template-test`);

async function mockFs(files: Record<string, string>): Promise<void> {
	await fsp.mkdir(mockDir, { recursive: true });
	for (const [name, content] of Object.entries(files)) {
		const relative = name.replace(/^\//, "./");
		const filename = path.join(mockDir, relative);
		const dirname = path.join(mockDir, path.dirname(relative));
		await fsp.mkdir(dirname, { recursive: true });
		await fsp.writeFile(filename, content);
	}
}
mockFs.restore = async (): Promise<void> => {
	await fsp.rm(mockDir, { recursive: true, force: true });
};

beforeAll(() => mockFs.restore());
afterEach(() => mockFs.restore());

test.sequential(
	"readJsonWithTemplate() should read simple JSON files normally",
	async (t) => {
		const file = {
			foo: "bar",
			baz: 1,
		};
		await mockFs({
			"/test.json": JSON.stringify(file),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(file);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should follow top-level whole-file $imports",
	async (t) => {
		const test = {
			$import: "template.json",
		};
		const template = {
			template: true,
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(template);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should overwrite keys that are present before the $import",
	async (t) => {
		const test = {
			template: false,
			$import: "template.json",
		};
		const template = {
			template: true,
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(template);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should preserve keys that are present after the $import",
	async (t) => {
		const test = {
			$import: "template.json",
			template: false,
			foobar: "baz",
		};
		const { $import: _, ...expected } = test;
		const template = {
			template: true,
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should throw if the $import specifier is not a string",
	async (t) => {
		const test = {
			$import: 1,
		};
		const template = 1;
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_Invalid,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should throw if the $import specifier is not valid",
	async (t) => {
		const tests = [
			"no-extension",
			"wrong.extension",
			".json",
			"#",
			"file.json#",
			"#30[0x]", // incomplete partial param
		];
		for (const specifier of tests) {
			const test = {
				$import: specifier,
			};
			await mockFs({
				"/test.json": JSON.stringify(test),
			});

			await assertZWaveError(
				t.expect,
				() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
				{
					errorCode: ZWaveErrorCodes.Config_Invalid,
					messageMatches: "Import specifier",
				},
			);
		}
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should throw if the $import target is not an object",
	async (t) => {
		const test = {
			$import: "template.json#somewhere",
		};
		const template = {
			somewhere: 1,
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_Invalid,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should follow deep $imports",
	async (t) => {
		const test = {
			toplevel: true,
			nested: {
				$import: "template.json",
			},
			template: false,
		};
		const template = {
			template: true,
		};
		const expected = {
			toplevel: true,
			nested: {
				template: true,
			},
			template: false,
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should follow deep $imports in arrays",
	async (t) => {
		const test = {
			toplevel: true,
			nested: [
				{
					$import: "template1.json",
				},
				{
					$import: "template2.json",
				},
			],
			template: false,
		};
		const template1 = {
			template: 1,
		};
		const template2 = {
			template: 2,
		};
		const expected = {
			toplevel: true,
			nested: [
				{
					template: 1,
				},
				{
					template: 2,
				},
			],
			template: false,
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template1.json": JSON.stringify(template1),
			"/template2.json": JSON.stringify(template2),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() file-based circular references should throw an error (direct, top-level)",
	async (t) => {
		const test = {
			$import: "template.json",
		};
		const template = {
			$import: "test.json",
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() file-based circular references should throw an error (three-way)",
	async (t) => {
		const test = {
			$import: "template1.json",
		};
		const template1 = {
			$import: "template2.json",
		};
		const template2 = {
			$import: "test.json",
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template1.json": JSON.stringify(template1),
			"/template2.json": JSON.stringify(template2),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() file-based circular references should throw an error (three-way, nested)",
	async (t) => {
		const test = {
			nested: {
				$import: "template1.json",
			},
		};
		const template1 = {
			alsoNested: [
				{ ok: "foo" },
				{
					$import: "template2.json",
				},
			],
		};
		const template2 = {
			nested: {
				array: [
					{
						$import: "test.json",
					},
				],
			},
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template1.json": JSON.stringify(template1),
			"/template2.json": JSON.stringify(template2),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should be able to resolve relative paths",
	async (t) => {
		const test = {
			$import: "../baz/template.json",
		};
		const template = {
			template: true,
		};
		await mockFs({
			"/foo/bar/test.json": JSON.stringify(test),
			"/foo/baz/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "foo/bar/test.json"),
		);
		t.expect(content).toStrictEqual(template);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should be able to resolve the root directory with ~/",
	async (t) => {
		const test = {
			$import: "~/template.json",
		};
		const template = {
			template: true,
		};
		await mockFs({
			"/foo/bar/test.json": JSON.stringify(test),
			"/foo/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "foo/bar/test.json"),
			path.join(mockDir, "foo"),
		);
		t.expect(content).toStrictEqual(template);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should throw when using a path that starts with ~/ when no root dir is configured",
	async (t) => {
		const test = {
			$import: "~/foo/template.json",
		};
		await mockFs({
			"/foo/bar/test.json": JSON.stringify(test),
		});
		await assertZWaveError(
			t.expect,
			() =>
				readJsonWithTemplate(
					fs,
					path.join(mockDir, "foo/bar/test.json"),
				),
			{
				messageMatches: "import specifier cannot start with ~/",
				errorCode: ZWaveErrorCodes.Config_Invalid,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should be able to resolve in-file selectors",
	async (t) => {
		const test = {
			$import: "template.json#sub",
		};
		const template = {
			super: "toll",
			sub: {
				template: true,
			},
		};
		const expected = template.sub;
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should be able to resolve deep in-file selectors",
	async (t) => {
		const test = {
			$import: "template.json#we/all/live/in/1/yellow/submarine",
		};
		const template = {
			super: "toll",
			we: {
				all: {
					live: {
						in: [
							"nope",
							{ yellow: { submarine: { template: true } } },
						],
					},
				},
			},
		};
		const expected = { template: true };
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() selector based circular references should throw an error (three-way)",
	async (t) => {
		const test = {
			$import: "template1.json#foo",
		};
		const template1 = {
			foo: {
				$import: "template2.json#bar",
			},
		};
		const template2 = {
			test: {
				hello: "from the other side",
			},
			bar: {
				$import: "test.json",
			},
			baz: {
				$import: "#test",
			},
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template1.json": JSON.stringify(template1),
			"/template2.json": JSON.stringify(template2),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() unspecified self-references throw an error",
	async (t) => {
		const test = {
			$import: "#",
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() circular self-references throw an error",
	async (t) => {
		const test = {
			key1: {
				$import: "#key2",
			},
			key2: {
				$import: "#key1",
			},
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
		});

		await assertZWaveError(
			t.expect,
			() => readJsonWithTemplate(fs, path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() crazy stuff does work (part 1)",
	async (t) => {
		const test = {
			$import: "template1.json",
		};
		const template1 = {
			foo: {
				$import: "template2.json#test",
			},
			baz: {
				$import: "template2.json#baz",
			},
		};
		const template2 = {
			test: {
				hello: "from the other side",
			},
			baz: {
				$import: "#test",
			},
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template1.json": JSON.stringify(template1),
			"/template2.json": JSON.stringify(template2),
		});

		const expected = {
			foo: {
				hello: "from the other side",
			},
			baz: {
				hello: "from the other side",
			},
		};

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() crazy stuff does work (part 2)",
	async (t) => {
		const test = {
			$import: "template1.json",
		};
		const template1 = {
			foo: {
				$import: "template2.json#test",
			},
			baz: {
				$import: "template2.json#baz",
			},
		};
		const template2 = {
			test: {
				hello: "from the other side",
			},
			baz: {
				$import: "#test",
			},
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template1.json": JSON.stringify(template1),
			"/template2.json": JSON.stringify(template2),
		});

		const expected = {
			foo: {
				hello: "from the other side",
			},
			baz: {
				hello: "from the other side",
			},
		};

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() referencing partial parameters works",
	async (t) => {
		const test = {
			paramInformation: {
				1: {
					$import: "template.json#paramInformation/1[0x01]",
				},
			},
		};
		const template = {
			paramInformation: {
				"1[0x01]": {
					hello: "from the other side",
				},
			},
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		const expected = {
			paramInformation: {
				1: {
					hello: "from the other side",
				},
			},
		};

		const content = await readJsonWithTemplate(
			fs,
			path.join(mockDir, "test.json"),
		);
		t.expect(content).toStrictEqual(expected);
	},
	20000,
);

test.sequential(
	"readJsonWithTemplate() should throw when the referenced file is outside the rootDir",
	async (t) => {
		const rootDir = "root/test";
		const test = {
			$import: "../outside.json",
		};
		await mockFs({
			[`/${rootDir}/test.json`]: JSON.stringify(test),
		});

		await assertZWaveError(
			t.expect,
			() =>
				readJsonWithTemplate(
					fs,
					path.join(mockDir, rootDir, "test.json"),
					path.join(mockDir, rootDir),
				),
			{
				messageMatches: "outside all root directories",
				errorCode: ZWaveErrorCodes.Config_Invalid,
			},
		);
	},
	20000,
);
