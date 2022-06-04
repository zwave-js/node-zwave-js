import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import * as nodeUtils from "../node/utils";
import { createTestNode } from "../test/mocks";
import { BasicCC, BasicCCGet, BasicCCReport, BasicCCSet } from "./BasicCC";
import { getCCValueMetadata } from "./CommandClass";
import { BasicCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Basic, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/BasicCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const basicCC = new BasicCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				BasicCommand.Get, // CC Command
			]),
		);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const basicCC = new BasicCCSet(host, {
			nodeId: 2,
			targetValue: 55,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				BasicCommand.Set, // CC Command
				55, // target value
			]),
		);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BasicCommand.Report, // CC Command
				55, // current value
			]),
		);
		const basicCC = new BasicCCReport(host, {
			nodeId: 2,
			data: ccData,
		});

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBeUndefined();
		expect(basicCC.duration).toBeUndefined();
	});

	it("the Report command (v2) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BasicCommand.Report, // CC Command
				55, // current value
				66, // target value
				1, // duration
			]),
		);
		const basicCC = new BasicCCReport(host, {
			nodeId: 2,
			data: ccData,
		});

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBe(66);
		expect(basicCC.duration!.unit).toBe("seconds");
		expect(basicCC.duration!.value).toBe(1);
	});

	it("deserializing an unsupported command should return an unspecified version of BasicCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const basicCC: any = new BasicCC(host, {
			nodeId: 2,
			data: serializedCC,
		});
		expect(basicCC.constructor).toBe(BasicCC);
	});

	it("the CC values should have the correct metadata", () => {
		// Readonly, 0-99
		const currentValueMeta = getCCValueMetadata(
			CommandClasses.Basic,
			"currentValue",
		);
		expect(currentValueMeta).toMatchObject({
			readable: true,
			writeable: false,
			min: 0,
			max: 99,
		});

		// Writeable, 0-99
		const targetValueMeta = getCCValueMetadata(
			CommandClasses.Basic,
			"targetValue",
		);
		expect(targetValueMeta).toMatchObject({
			readable: true,
			writeable: true,
			min: 0,
			max: 99,
		});
	});

	describe("getDefinedValueIDs()", () => {
		it("should include the target value for all endpoints except the node itself", () => {
			// Repro for GH#377
			const node2 = createTestNode(host, {
				id: 2,
				numEndpoints: 2,
				supportsCC(cc) {
					switch (cc) {
						case CommandClasses.Basic:
						case CommandClasses["Multi Channel"]:
							return true;
					}
					return false;
				},
				getCCVersion(cc) {
					switch (cc) {
						case CommandClasses.Basic:
							// We only support V1, so no report of the target value
							return 1;
						case CommandClasses["Multi Channel"]:
							return 2;
					}
					return 0;
				},
			});
			host.nodes.set(node2.id, node2);

			const valueIDs = nodeUtils
				.getDefinedValueIDs(host, node2)
				.filter(
					({ commandClass, property }) =>
						commandClass === CommandClasses.Basic &&
						property === "targetValue",
				);
			const endpointIndizes = valueIDs.map(({ endpoint }) => endpoint);
			expect(endpointIndizes).toEqual([1, 2]);
		});
	});

	describe("responses should be detected correctly", () => {
		it("BasicCCSet should expect no response", () => {
			const cc = new BasicCCSet(host, {
				nodeId: 2,
				endpoint: 2,
				targetValue: 7,
			});
			expect(cc.expectsCCResponse()).toBeFalse();
		});

		it("BasicCCSet => BasicCCReport = unexpected", () => {
			const ccRequest = new BasicCCSet(host, {
				nodeId: 2,
				endpoint: 2,
				targetValue: 7,
			});
			const ccResponse = new BasicCCReport(host, {
				nodeId: ccRequest.nodeId,
				currentValue: 7,
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeFalse();
		});

		it("BasicCCGet should expect a response", () => {
			const cc = new BasicCCGet(host, {
				nodeId: 2,
			});
			expect(cc.expectsCCResponse()).toBeTrue();
		});

		it("BasicCCGet => BasicCCReport = expected", () => {
			const ccRequest = new BasicCCGet(host, {
				nodeId: 2,
			});
			const ccResponse = new BasicCCReport(host, {
				nodeId: ccRequest.nodeId,
				currentValue: 7,
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeTrue();
		});

		it("BasicCCGet => BasicCCReport (wrong node) = unexpected", () => {
			const ccRequest = new BasicCCGet(host, {
				nodeId: 2,
			});
			const ccResponse = new BasicCCReport(host, {
				nodeId: (ccRequest.nodeId as number) + 1,
				currentValue: 7,
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeFalse();
		});

		it("BasicCCGet => BasicCCSet = unexpected", () => {
			const ccRequest = new BasicCCGet(host, {
				nodeId: 2,
			});
			const ccResponse = new BasicCCSet(host, {
				nodeId: ccRequest.nodeId,
				targetValue: 7,
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeFalse();
		});
	});
});
