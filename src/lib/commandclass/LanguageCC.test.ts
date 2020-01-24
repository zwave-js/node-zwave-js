import { createEmptyMockDriver } from "../../../test/mocks";
import type { IDriver } from "../driver/IDriver";
import { CommandClasses } from "./CommandClasses";
import { LanguageCC, LanguageCCGet, LanguageCCReport, LanguageCCSet, LanguageCommand } from "./LanguageCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

function buildCCBuffer(nodeId: number, payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			nodeId, // node number
			payload.length + 1, // remaining length
			CommandClasses.Language, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/LanguageCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new LanguageCCGet(fakeDriver, { nodeId: 1 });
		const expected = buildCCBuffer(
			1,
			Buffer.from([
				LanguageCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (w/o country code)", () => {
		const cc = new LanguageCCSet(fakeDriver, {
			nodeId: 2,
			language: "deu",
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				LanguageCommand.Set, // CC Command
				// "deu"
				0x64,
				0x65,
				0x75,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (w/ country code)", () => {
		const cc = new LanguageCCSet(fakeDriver, {
			nodeId: 2,
			language: "deu",
			country: "DE",
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				LanguageCommand.Set, // CC Command
				// "deu"
				0x64,
				0x65,
				0x75,
				// "DE"
				0x44,
				0x45,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly (w/o country code)", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				LanguageCommand.Report, // CC Command
				// "deu"
				0x64,
				0x65,
				0x75,
			]),
		);
		const cc = new LanguageCCReport(fakeDriver, { data: ccData });

		expect(cc.language).toBe("deu");
		expect(cc.country).toBeUndefined();
	});

	it("the Report command should be deserialized correctly (w/ country code)", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				LanguageCommand.Report, // CC Command
				// "deu"
				0x64,
				0x65,
				0x75,
				// "DE"
				0x44,
				0x45,
			]),
		);
		const cc = new LanguageCCReport(fakeDriver, { data: ccData });

		expect(cc.language).toBe("deu");
		expect(cc.country).toBe("DE");
	});

	it("deserializing an unsupported command should return an unspecified version of LanguageCC", () => {
		const serializedCC = buildCCBuffer(
			1,
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new LanguageCC(fakeDriver, {
			data: serializedCC,
		});
		expect(cc.constructor).toBe(LanguageCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.Language,
	// 		"currentValue",
	// 	);
	// 	expect(currentValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: false,
	// 		min: 0,
	// 		max: 99,
	// 	});

	// 	// Writeable, 0-99
	// 	const targetValueMeta = getCCValueMetadata(
	// 		CommandClasses.Language,
	// 		"targetValue",
	// 	);
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });
});
