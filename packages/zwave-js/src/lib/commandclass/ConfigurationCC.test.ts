import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import type { CommandClass } from "./CommandClass";
import {
	ConfigurationCC,
	ConfigurationCCGet,
	ConfigurationCCNameReport,
	ConfigurationCCReport,
	ConfigurationCCSet,
	ConfigurationCommand,
} from "./ConfigurationCC";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Configuration, // CC
		]),
		payload,
	]);
}

function buildNameReportCC(
	fakeDriver: Driver,
	nodeId: number,
	parameter: number,
	reportsToFollow: number,
	name: string,
): ConfigurationCCNameReport {
	const headerSize = 4;
	const header = Buffer.alloc(headerSize);
	header[0] = ConfigurationCommand.NameReport;
	header.writeUInt16BE(parameter, 1);
	header[3] = reportsToFollow;
	const payload = Buffer.concat([header, Buffer.from(name)]);
	return new ConfigurationCCNameReport(fakeDriver, {
		nodeId,
		data: buildCCBuffer(payload),
	});
}

function buildReportCCSession<CC extends CommandClass>(partialCCs: CC[]): CC[] {
	const session: CC[] = [];
	partialCCs.forEach((partialCC) => {
		partialCC.addToPartialCCSession(session);
	});
	return session;
}

describe("lib/commandclass/ConfigurationCC => ", () => {
	let fakeDriver: Driver;
	let nodeV1: ZWaveNode;
	let nodeV2: ZWaveNode;
	let nodeV3: ZWaveNode;
	let nodeV4: ZWaveNode;

	beforeAll(() => {
		fakeDriver = createEmptyMockDriver() as unknown as Driver;
		nodeV1 = new ZWaveNode(10, fakeDriver as any);
		nodeV2 = new ZWaveNode(20, fakeDriver as any);
		nodeV3 = new ZWaveNode(30, fakeDriver as any);
		nodeV4 = new ZWaveNode(40, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(10, nodeV1);
		(fakeDriver.controller.nodes as any).set(20, nodeV2);
		(fakeDriver.controller.nodes as any).set(30, nodeV3);
		(fakeDriver.controller.nodes as any).set(40, nodeV3);
		nodeV1.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 1,
		});
		nodeV2.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 2,
		});
		nodeV3.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 3,
		});
	});

	afterAll(() => {
		fakeDriver.destroy();
		nodeV1.destroy();
		nodeV2.destroy();
		nodeV3.destroy();
		nodeV4.destroy();
	});

	it("the Get command should serialize correctly", () => {
		const cc = new ConfigurationCCGet(fakeDriver, {
			nodeId: 10,
			parameter: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				ConfigurationCommand.Get, // CC Command
				0x01, // parameter
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const cc = new ConfigurationCCSet(fakeDriver, {
			nodeId: 10,
			parameter: 5,
			valueSize: 1,
			value: 2,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				ConfigurationCommand.Set, // CC Command
				5, // parameter
				1, // valueSize
				2, // value
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1/v2) should be deserialized correctly (2 bytes)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ConfigurationCommand.Report, // CC Command
				1, // parameter
				2, // valueSize
				0x01, // current value MSB
				0x02, // current value LSB
			]),
		);
		const cc = new ConfigurationCCReport(fakeDriver, {
			data: ccData,
			nodeId: 10,
		});

		expect(cc.parameter).toBe(1);
		expect(cc.valueSize).toBe(2);
		expect(cc.value).toBe(0x0102);
	});

	it("deserializing an unsupported command should return an unspecified version of ConfigurationCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new ConfigurationCC(fakeDriver, {
			nodeId: 10,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(ConfigurationCC);
	});

	it("the NameReport should properly concatenate partial reports when unique and ordered", () => {
		const partialCCs = [
			{ reportsToFollow: 3, name: "abc" },
			{ reportsToFollow: 2, name: "def" },
			{ reportsToFollow: 1, name: "ghi" },
		].map((data) =>
			buildNameReportCC(
				fakeDriver,
				30,
				1,
				data.reportsToFollow,
				data.name,
			),
		);
		const session = buildReportCCSession(partialCCs);
		const finalCC = buildNameReportCC(fakeDriver, 30, 1, 0, "jkl");
		finalCC.mergePartialCCs(session);

		expect(finalCC.parameter).toBe(1);
		expect(finalCC.name).toBe("abcdefghijkl");
	});

	it("the NameReport should properly concatenate partial reports when repeated", () => {
		const partialCCs = [
			{ reportsToFollow: 3, name: "abc" },
			{ reportsToFollow: 2, name: "def" },
			{ reportsToFollow: 2, name: "def" },
			{ reportsToFollow: 1, name: "ghi" },
			{ reportsToFollow: 1, name: "ghi" },
		].map((data) =>
			buildNameReportCC(
				fakeDriver,
				30,
				1,
				data.reportsToFollow,
				data.name,
			),
		);
		const session = buildReportCCSession(partialCCs);
		const finalCC = buildNameReportCC(fakeDriver, 30, 1, 0, "jkl");
		finalCC.mergePartialCCs(session);

		expect(finalCC.parameter).toBe(1);
		expect(finalCC.name).toBe("abcdefghijkl");
	});
});
