import {
	CommandClass,
	ManufacturerSpecificCCGet,
	ManufacturerSpecificCCReport,
	ManufacturerSpecificCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Manufacturer Specific"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new ManufacturerSpecificCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			ManufacturerSpecificCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command (v1) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			ManufacturerSpecificCommand.Report, // CC Command
			0x01,
			0x02,
			0x03,
			0x04,
			0x05,
			0x06,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as ManufacturerSpecificCCReport;
	t.expect(cc.constructor).toBe(ManufacturerSpecificCCReport);

	t.expect(cc.manufacturerId).toBe(0x0102);
	t.expect(cc.productType).toBe(0x0304);
	t.expect(cc.productId).toBe(0x0506);
});
