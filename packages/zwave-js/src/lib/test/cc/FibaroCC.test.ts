import { CommandClass } from "@zwave-js/cc";
import {
	FibaroVenetianBlindCCCommand,
	FibaroVenetianBlindCCGet,
	FibaroVenetianBlindCCReport,
	FibaroVenetianBlindCCSet,
} from "@zwave-js/cc/manufacturerProprietary/FibaroCC";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Manufacturer Proprietary"], // CC
			// Manufacturer ID
			0x01,
			0x0f,
			// Fibaro CC ID
			0x26,
		]),
		payload,
	]);
}

test("the Set Tilt command should serialize correctly", async (t) => {
	const cc = new FibaroVenetianBlindCCSet({
		nodeId: 2,
		tilt: 99,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			FibaroVenetianBlindCCCommand.Set,
			0x01, // with Tilt, no Position
			0x00, // Position
			0x63, // Tilt
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			FibaroVenetianBlindCCCommand.Report,
			0x03, // with Tilt and Position
			0x00, // Position
			0x00, // Tilt
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as FibaroVenetianBlindCCReport;
	t.expect(cc.constructor).toBe(FibaroVenetianBlindCCReport);
	t.expect(cc.position).toBe(0);
	t.expect(cc.tilt).toBe(0);
});

test("FibaroVenetianBlindCCSet should expect no response", (t) => {
	const cc = new FibaroVenetianBlindCCSet({
		nodeId: 2,
		tilt: 7,
	});
	t.expect(cc.expectsCCResponse()).toBe(false);
});

test("FibaroVenetianBlindCCGet should expect a response", (t) => {
	const cc = new FibaroVenetianBlindCCGet({
		nodeId: 2,
	});
	t.expect(cc.expectsCCResponse()).toBe(true);
});

test("FibaroVenetianBlindCCSet => FibaroVenetianBlindCCReport = unexpected", async (t) => {
	const ccRequest = new FibaroVenetianBlindCCSet({
		nodeId: 2,
		tilt: 7,
	});
	const ccResponse = await CommandClass.parse(
		buildCCBuffer(
			Uint8Array.from([
				FibaroVenetianBlindCCCommand.Report,
				0x03, // with Tilt and Position
				0x01, // Position
				0x07, // Tilt
			]),
		),
		{ sourceNodeId: 2 } as any,
	) as FibaroVenetianBlindCCReport;

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(false);
});

test("FibaroVenetianBlindCCGet => FibaroVenetianBlindCCReport = expected", async (t) => {
	const ccRequest = new FibaroVenetianBlindCCGet({
		nodeId: 2,
	});
	const ccResponse = await CommandClass.parse(
		buildCCBuffer(
			Uint8Array.from([
				FibaroVenetianBlindCCCommand.Report,
				0x03, // with Tilt and Position
				0x01, // Position
				0x07, // Tilt
			]),
		),
		{ sourceNodeId: 2 } as any,
	) as FibaroVenetianBlindCCReport;

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(true);
});
