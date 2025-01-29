import {
	CommandClass,
	ThermostatFanMode,
	ThermostatFanModeCCGet,
	ThermostatFanModeCCReport,
	ThermostatFanModeCCSet,
	ThermostatFanModeCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Thermostat Fan Mode"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new ThermostatFanModeCCGet({ nodeId: 5 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			ThermostatFanModeCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should serialize correctly (off = false)", async (t) => {
	const cc = new ThermostatFanModeCCSet({
		nodeId: 5,
		mode: ThermostatFanMode["Auto medium"],
		off: false,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			ThermostatFanModeCommand.Set, // CC Command
			0x04, // target value
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should serialize correctly (off = true)", async (t) => {
	const cc = new ThermostatFanModeCCSet({
		nodeId: 5,
		mode: ThermostatFanMode["Auto medium"],
		off: true,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			ThermostatFanModeCommand.Set, // CC Command
			0b1000_0100, // target value
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			ThermostatFanModeCommand.Report, // CC Command
			0b1000_0010, // Off bit set to 1 and Auto high mode
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 5 } as any,
	) as ThermostatFanModeCCReport;
	t.expect(cc.constructor).toBe(ThermostatFanModeCCReport);

	t.expect(cc.mode).toBe(ThermostatFanMode["Auto high"]);
	t.expect(cc.off).toBe(true);
});

// TODO: add tests for getting supported features, interview, etc
