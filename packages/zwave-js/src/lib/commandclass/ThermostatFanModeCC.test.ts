import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	ThermostatFanModeCCGet,
	ThermostatFanModeCCReport,
	ThermostatFanModeCCSet,
} from "./ThermostatFanModeCC";
import { ThermostatFanMode, ThermostatFanModeCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Thermostat Fan Mode"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/ThermostatFanModeCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new ThermostatFanModeCCGet(host, { nodeId: 5 });
		const expected = buildCCBuffer(
			Buffer.from([
				ThermostatFanModeCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (off = false)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (off = true)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the V1 Set command ignores off=true", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1-v2) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ThermostatFanModeCommand.Report, // CC Command
				ThermostatFanMode["Auto low"], // current value
			]),
		);
		const cc = new ThermostatFanModeCCReport(
			{
				...host,
				getSafeCCVersionForNode: () => 1,
			},
			{
				nodeId: 1,
				data: ccData,
			},
		);

		expect(cc.mode).toBe(ThermostatFanMode["Auto low"]);
		expect(cc.off).toBeUndefined();
	});

	it("the Report command (v3-v5) should be deserialized correctly", () => {
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

		expect(cc.mode).toBe(ThermostatFanMode["Auto high"]);
		expect(cc.off).toBe(true);
	});

	// TODO: add tests for getting supported features, interview, etc
});
