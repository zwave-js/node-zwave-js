import {
	CommandClass,
	ThermostatFanMode,
	ThermostatFanModeCCGet,
	ThermostatFanModeCCReport,
	ThermostatFanModeCCSet,
	ThermostatFanModeCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Thermostat Fan Mode"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new ThermostatFanModeCCGet({ nodeId: 5 });
	const expected = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly (off = false)", (t) => {
	const cc = new ThermostatFanModeCCSet({
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
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly (off = true)", (t) => {
	const cc = new ThermostatFanModeCCSet({
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
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			ThermostatFanModeCommand.Report, // CC Command
			0b1000_0010, // Off bit set to 1 and Auto high mode
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 5 } as any,
	) as ThermostatFanModeCCReport;
	t.is(cc.constructor, ThermostatFanModeCCReport);

	t.is(cc.mode, ThermostatFanMode["Auto high"]);
	t.is(cc.off, true);
});

// TODO: add tests for getting supported features, interview, etc
