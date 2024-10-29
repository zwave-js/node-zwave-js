import {
	CommandClass,
	LanguageCC,
	LanguageCCGet,
	LanguageCCReport,
	LanguageCCSet,
	LanguageCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import test from "ava";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Language, // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new LanguageCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			LanguageCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly (w/o country code)", (t) => {
	const cc = new LanguageCCSet({
		nodeId: 2,
		language: "deu",
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			LanguageCommand.Set, // CC Command
			// "deu"
			0x64,
			0x65,
			0x75,
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly (w/ country code)", (t) => {
	const cc = new LanguageCCSet({
		nodeId: 2,
		language: "deu",
		country: "DE",
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
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
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command should be deserialized correctly (w/o country code)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			LanguageCommand.Report, // CC Command
			// "deu"
			0x64,
			0x65,
			0x75,
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 4 } as any,
	) as LanguageCCReport;
	t.is(cc.constructor, LanguageCCReport);

	t.is(cc.language, "deu");
	t.is(cc.country, undefined);
});

test("the Report command should be deserialized correctly (w/ country code)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 4 } as any,
	) as LanguageCCReport;
	t.is(cc.constructor, LanguageCCReport);

	t.is(cc.language, "deu");
	t.is(cc.country, "DE");
});

test("deserializing an unsupported command should return an unspecified version of LanguageCC", (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 4 } as any,
	) as LanguageCC;
	t.is(cc.constructor, LanguageCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.Language,
// 		"currentValue",
// 	);
// 	t.like(currentValueMeta, {
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
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
