import {
	CommandClass,
	ThermostatFanState,
	ThermostatFanStateCC,
	ThermostatFanStateCCGet,
	ThermostatFanStateCCReport,
	ThermostatFanStateCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Thermostat Fan State"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new ThermostatFanStateCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			ThermostatFanStateCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command (v1 - v2) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			ThermostatFanStateCommand.Report, // CC Command
			ThermostatFanState["Idle / off"], // state
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as ThermostatFanStateCCReport;
	t.expect(cc.constructor).toBe(ThermostatFanStateCCReport);

	t.expect(cc.state).toBe(ThermostatFanState["Idle / off"]);
});

test("deserializing an unsupported command should return an unspecified version of ThermostatFanStateCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as ThermostatFanStateCC;
	t.expect(cc.constructor).toBe(ThermostatFanStateCC);
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
