import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import {
	ThermostatFanModeCCGet,
	ThermostatFanModeCCReport,
	ThermostatFanModeCCSet,
} from "./ThermostatFanModeCC";
import { ThermostatFanMode, ThermostatFanModeCommand } from "./_Types";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Thermostat Fan Mode"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/ThermostatFanModeCC => ", () => {
	let fakeDriver: Driver;
	let node1: ZWaveNode;
	let node5: ZWaveNode;

	beforeAll(() => {
		fakeDriver = createEmptyMockDriver() as unknown as Driver;
		node1 = new ZWaveNode(1, fakeDriver as any);
		node5 = new ZWaveNode(5, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(1, node1);
		(fakeDriver.controller.nodes as any).set(5, node5);
		node1.addCC(CommandClasses["Thermostat Fan Mode"], {
			isSupported: true,
			version: 1,
		});
		node5.addCC(CommandClasses["Thermostat Fan Mode"], {
			isSupported: true,
			version: 5,
		});
	});

	afterAll(() => {
		node1.destroy();
		node5.destroy();
	});

	it("the Get command should serialize correctly", () => {
		const cc = new ThermostatFanModeCCGet(fakeDriver, { nodeId: 5 });
		const expected = buildCCBuffer(
			Buffer.from([
				ThermostatFanModeCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (off = false)", () => {
		const cc = new ThermostatFanModeCCSet(fakeDriver, {
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
		const cc = new ThermostatFanModeCCSet(fakeDriver, {
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
		const cc = new ThermostatFanModeCCSet(fakeDriver, {
			nodeId: 1,
			mode: ThermostatFanMode["Auto medium"],
			off: true,
		});
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
		const cc = new ThermostatFanModeCCReport(fakeDriver, {
			nodeId: 1,
			data: ccData,
		});

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
		const cc = new ThermostatFanModeCCReport(fakeDriver, {
			nodeId: 5,
			data: ccData,
		});

		expect(cc.mode).toBe(ThermostatFanMode["Auto high"]);
		expect(cc.off).toBe(true);
	});

	// TODO: add tests for getting supported features, interview, etc
});
