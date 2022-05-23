import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	PowerlevelCC,
	PowerlevelCCGet,
	PowerlevelCCReport,
	PowerlevelCCSet,
} from "./PowerlevelCC";
import { Powerlevel, PowerlevelCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Powerlevel, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/PowerlevelCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new PowerlevelCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				PowerlevelCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set NormalPower command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set NormalPower command with timeout should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set Custom power command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly (NormalPower)", () => {
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

		expect(cc.powerlevel).toBe(Powerlevel["Normal Power"]);
		expect(cc.timeout).toBeUndefined(); // timeout does not apply to NormalPower
	});

	it("the Report command should be deserialized correctly (custom power)", () => {
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

		expect(cc.powerlevel).toBe(Powerlevel["-3 dBm"]);
		expect(cc.timeout).toBe(50); // timeout does not apply to NormalPower
	});

	it("deserializing an unsupported command should return an unspecified version of PowerlevelCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new PowerlevelCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(PowerlevelCC);
	});
});
