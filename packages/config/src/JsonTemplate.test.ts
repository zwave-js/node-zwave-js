import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import * as fs from "fs-extra";
import { tmpdir } from "os";
import * as path from "path";
import { readJsonWithTemplate } from "./JsonTemplate";

const mockDir = path.join(tmpdir(), `zwave-js-template-test`);

async function mockFs(files: Record<string, string>): Promise<void> {
	await fs.ensureDir(mockDir);
	for (const [name, content] of Object.entries(files)) {
		const relative = name.replace(/^\//, "./");
		const filename = path.join(mockDir, relative);
		const dirname = path.join(mockDir, path.dirname(relative));
		await fs.ensureDir(dirname);
		await fs.writeFile(filename, content);
	}
}
mockFs.restore = async (): Promise<void> => {
	await fs.remove(mockDir);
};

describe("readJsonWithTemplate", () => {
	beforeAll(() => mockFs.restore());
	afterEach(() => mockFs.restore());

	it("should read simple JSON files normally", async () => {
		const file = {
			foo: "bar",
			baz: 1,
		};
		await mockFs({
			"/test.json": JSON.stringify(file),
		});

		const content = await readJsonWithTemplate(
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(file);
	});

	it("should follow top-level whole-file $imports", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(template);
	});

	it("should overwrite keys that are present before the $import", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(template);
	});

	it("should preserve keys that are present after the $import", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("should throw if the $import specifier is not a string", async () => {
		const test = {
			$import: 1,
		};
		const template = 1;
		await mockFs({
			"/test.json": JSON.stringify(test),
			"/template.json": JSON.stringify(template),
		});

		await assertZWaveError(
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_Invalid,
			},
		);
	});

	it("should throw if the $import specifier is not valid", async () => {
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
				() => readJsonWithTemplate(path.join(mockDir, "test.json")),
				{
					errorCode: ZWaveErrorCodes.Config_Invalid,
					messageMatches: "Import specifier",
				},
			);
		}
	});

	it("should throw if the $import target is not an object", async () => {
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
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_Invalid,
			},
		);
	});

	it("should follow deep $imports", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("should follow deep $imports in arrays", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("file-based circular references should throw an error (direct, top-level)", async () => {
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
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	});

	it("file-based circular references should throw an error (three-way)", async () => {
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
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	});

	it("file-based circular references should throw an error (three-way, nested)", async () => {
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
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	});

	it("should be able to resolve relative paths", async () => {
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
			path.join(mockDir, "foo/bar/test.json"),
		);
		expect(content).toEqual(template);
	});

	it("should be able to resolve in-file selectors", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("should be able to resolve deep in-file selectors", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("selector based circular references should throw an error (three-way)", async () => {
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
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	});

	it("unspecified self-references throw an error", async () => {
		const test = {
			$import: "#",
		};
		await mockFs({
			"/test.json": JSON.stringify(test),
		});

		await assertZWaveError(
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{},
		);
	});

	it("circular self-references throw an error", async () => {
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
			() => readJsonWithTemplate(path.join(mockDir, "test.json")),
			{
				errorCode: ZWaveErrorCodes.Config_CircularImport,
			},
		);
	});

	it("crazy stuff does work (part 1)", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("crazy stuff does work (part 2)", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});

	it("referencing partial parameters works", async () => {
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
			path.join(mockDir, "test.json"),
		);
		expect(content).toEqual(expected);
	});
});
