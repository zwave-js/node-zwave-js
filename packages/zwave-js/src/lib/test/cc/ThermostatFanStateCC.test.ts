import {
	CommandClass,
	ThermostatFanState,
	ThermostatFanStateCC,
	ThermostatFanStateCCGet,
	ThermostatFanStateCCReport,
	ThermostatFanStateCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Thermostat Fan State"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new ThermostatFanStateCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			ThermostatFanStateCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command (v1 - v2) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			ThermostatFanStateCommand.Report, // CC Command
			ThermostatFanState["Idle / off"], // state
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as ThermostatFanStateCCReport;
	t.is(cc.constructor, ThermostatFanStateCCReport);

	t.is(cc.state, ThermostatFanState["Idle / off"]);
});

test("deserializing an unsupported command should return an unspecified version of ThermostatFanStateCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as ThermostatFanStateCC;
	t.is(cc.constructor, ThermostatFanStateCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses["Thermostat Fan State"],
// 		"state",
// 	);
// 	t.like(currentValueMeta, {
// 		states: enumValuesToMetadataStates(ThermostatFanState),
// 		label: "Thermostat fan state",
// 	});
// });
