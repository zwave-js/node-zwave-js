import {
	Powerlevel,
	PowerlevelCC,
	PowerlevelCCGet,
	PowerlevelCCReport,
	PowerlevelCCSet,
	PowerlevelCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Powerlevel, // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new PowerlevelCCGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			PowerlevelCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set NormalPower command should serialize correctly", (t) => {
	const cc = new PowerlevelCCSet(host, {
		nodeId: 2,
		powerlevel: Powerlevel["Normal Power"],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			PowerlevelCommand.Set, // CC Command
			Powerlevel["Normal Power"], // powerlevel
			0, // timeout (ignored)
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set NormalPower command with timeout should serialize correctly", (t) => {
	const cc = new PowerlevelCCSet(host, {
		nodeId: 2,
		powerlevel: Powerlevel["Normal Power"],
		timeout: 50,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			PowerlevelCommand.Set, // CC Command
			Powerlevel["Normal Power"], // powerlevel
			0x00, // timeout ignored
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set Custom power command should serialize correctly", (t) => {
	const cc = new PowerlevelCCSet(host, {
		nodeId: 2,
		powerlevel: Powerlevel["-1 dBm"],
		timeout: 50,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			PowerlevelCommand.Set, // CC Command
			Powerlevel["-1 dBm"], // powerlevel
			50, // timeout
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should be deserialized correctly (NormalPower)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			PowerlevelCommand.Report, // CC Command
			Powerlevel["Normal Power"], // powerlevel
			50, // timeout (ignored because NormalPower)
		]),
	);
	const cc = new PowerlevelCCReport(host, {
		nodeId: 5,
		data: ccData,
	});

	t.is(cc.powerlevel, Powerlevel["Normal Power"]);
	t.is(cc.timeout, undefined); // timeout does not apply to NormalPower
});

test("the Report command should be deserialized correctly (custom power)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			PowerlevelCommand.Report, // CC Command
			Powerlevel["-3 dBm"], // powerlevel
			50, // timeout (ignored because NormalPower)
		]),
	);
	const cc = new PowerlevelCCReport(host, {
		nodeId: 5,
		data: ccData,
	});

	t.is(cc.powerlevel, Powerlevel["-3 dBm"]);
	t.is(cc.timeout, 50); // timeout does not apply to NormalPower
});

test("deserializing an unsupported command should return an unspecified version of PowerlevelCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new PowerlevelCC(host, {
		nodeId: 1,
		data: serializedCC,
	});
	t.is(cc.constructor, PowerlevelCC);
});
