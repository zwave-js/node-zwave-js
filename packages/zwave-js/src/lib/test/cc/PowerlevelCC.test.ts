import {
	CommandClass,
	Powerlevel,
	PowerlevelCC,
	PowerlevelCCGet,
	PowerlevelCCReport,
	PowerlevelCCSet,
	PowerlevelCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Powerlevel, // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new PowerlevelCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			PowerlevelCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set NormalPower command should serialize correctly", async (t) => {
	const cc = new PowerlevelCCSet({
		nodeId: 2,
		powerlevel: Powerlevel["Normal Power"],
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			PowerlevelCommand.Set, // CC Command
			Powerlevel["Normal Power"], // powerlevel
			0, // timeout (ignored)
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set NormalPower command with timeout should serialize correctly", async (t) => {
	const cc = new PowerlevelCCSet({
		nodeId: 2,
		powerlevel: Powerlevel["Normal Power"],
		timeout: 50,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			PowerlevelCommand.Set, // CC Command
			Powerlevel["Normal Power"], // powerlevel
			0x00, // timeout ignored
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set Custom power command should serialize correctly", async (t) => {
	const cc = new PowerlevelCCSet({
		nodeId: 2,
		powerlevel: Powerlevel["-1 dBm"],
		timeout: 50,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			PowerlevelCommand.Set, // CC Command
			Powerlevel["-1 dBm"], // powerlevel
			50, // timeout
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly (NormalPower)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			PowerlevelCommand.Report, // CC Command
			Powerlevel["Normal Power"], // powerlevel
			50, // timeout (ignored because NormalPower)
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 5 } as any,
	) as PowerlevelCCReport;
	t.expect(cc.constructor).toBe(PowerlevelCCReport);

	t.expect(cc.powerlevel).toBe(Powerlevel["Normal Power"]);
	t.expect(cc.timeout).toBeUndefined(); // timeout does not apply to NormalPower
});

test("the Report command should be deserialized correctly (custom power)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			PowerlevelCommand.Report, // CC Command
			Powerlevel["-3 dBm"], // powerlevel
			50, // timeout (ignored because NormalPower)
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 5 } as any,
	) as PowerlevelCCReport;
	t.expect(cc.constructor).toBe(PowerlevelCCReport);

	t.expect(cc.powerlevel).toBe(Powerlevel["-3 dBm"]);
	t.expect(cc.timeout).toBe(50); // timeout does not apply to NormalPower
});

test("deserializing an unsupported command should return an unspecified version of PowerlevelCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as PowerlevelCC;
	t.expect(cc.constructor).toBe(PowerlevelCC);
});
