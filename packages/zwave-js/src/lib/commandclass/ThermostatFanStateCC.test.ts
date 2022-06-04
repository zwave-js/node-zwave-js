import { CommandClasses, enumValuesToMetadataStates } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { getCCValueMetadata } from "./CommandClass";
import {
	ThermostatFanStateCC,
	ThermostatFanStateCCGet,
	ThermostatFanStateCCReport,
} from "./ThermostatFanStateCC";
import { ThermostatFanState, ThermostatFanStateCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Thermostat Fan State"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/ThermostatFanStateCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new ThermostatFanStateCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				ThermostatFanStateCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1 - v2) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ThermostatFanStateCommand.Report, // CC Command
				ThermostatFanState["Idle / off"], // state
			]),
		);
		const cc = new ThermostatFanStateCCReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.state).toBe(ThermostatFanState["Idle / off"]);
	});

	it("deserializing an unsupported command should return an unspecified version of ThermostatFanStateCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new ThermostatFanStateCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(ThermostatFanStateCC);
	});

	it("the CC values should have the correct metadata", () => {
		// Readonly, 0-99
		const currentValueMeta = getCCValueMetadata(
			CommandClasses["Thermostat Fan State"],
			"state",
		);
		expect(currentValueMeta).toMatchObject({
			states: enumValuesToMetadataStates(ThermostatFanState),
			label: "Thermostat fan state",
		});
	});
});
