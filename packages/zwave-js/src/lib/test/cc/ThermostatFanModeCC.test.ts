import {
	ThermostatFanMode,
	ThermostatFanModeCCGet,
	ThermostatFanModeCCReport,
	ThermostatFanModeCCSet,
	ThermostatFanModeCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Thermostat Fan Mode"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new ThermostatFanModeCCGet(host, { nodeId: 5 });
	const expected = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly (off = false)", (t) => {
	const cc = new ThermostatFanModeCCSet(host, {
		nodeId: 5,
		mode: ThermostatFanMode["Auto medium"],
		off: false,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Set, // CC Command
			0x04, // target value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly (off = true)", (t) => {
	const cc = new ThermostatFanModeCCSet(host, {
		nodeId: 5,
		mode: ThermostatFanMode["Auto medium"],
		off: true,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Set, // CC Command
			0b1000_0100, // target value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the V1 Set command ignores off=true", (t) => {
	const cc = new ThermostatFanModeCCSet(host, {
		nodeId: 1,
		mode: ThermostatFanMode["Auto medium"],
		off: true,
	});
	cc.version = 1;
	const expected = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Set, // CC Command
			0b0000_0100, // target value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command (v1-v2) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Report, // CC Command
			ThermostatFanMode["Auto low"], // current value
		]),
	);
	const cc = new ThermostatFanModeCCReport(
		{
			...host,
			getSafeCCVersion: () => 1,
		},
		{
			nodeId: 1,
			data: ccData,
		},
	);

	t.is(cc.mode, ThermostatFanMode["Auto low"]);
	t.is(cc.off, undefined);
});

test("the Report command (v3-v5) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Report, // CC Command
			0b1000_0010, // Off bit set to 1 and Auto high mode
		]),
	);
	const cc = new ThermostatFanModeCCReport(host, {
		nodeId: 5,
		data: ccData,
	});

	t.is(cc.mode, ThermostatFanMode["Auto high"]);
	t.is(cc.off, true);
});

// TODO: add tests for getting supported features, interview, etc
