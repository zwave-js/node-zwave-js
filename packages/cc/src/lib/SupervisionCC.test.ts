import { createTestingHost } from "@zwave-js/host";
import { BasicCCSet } from "./BasicCC";
import { SupervisionCC, SupervisionCCReport } from "./SupervisionCC";
import { SupervisionStatus } from "./_Types";

const host = createTestingHost();

// function buildCCBuffer(payload: Buffer): Buffer {
// 	return Buffer.concat([
// 		Buffer.from([
// 			CommandClasses.Supervision, // CC
// 		]),
// 		payload,
// 	]);
// }

describe("lib/commandclass/SupervisionCC => ", () => {
	// it("the Get command should serialize correctly", () => {
	// 	const cc = new SupervisionCCGet(fakeDriver, { nodeId: 1 });
	// 	const expected = buildCCBuffer(
	// 		Buffer.from([
	// 			SupervisionCommand.Get, // CC Command
	// 		]),
	// 	);
	// 	expect(cc.serialize()).toEqual(expected);
	// });

	// it("the Set command should serialize correctly", () => {
	// 	const cc = new SupervisionCCSet(fakeDriver, {
	// 		nodeId: 2,
	// 		targetValue: 55,
	// 	});
	// 	const expected = buildCCBuffer(
	// 		Buffer.from([
	// 			SupervisionCommand.Set, // CC Command
	// 			55, // target value
	// 		]),
	// 	);
	// 	expect(cc.serialize()).toEqual(expected);
	// });

	// it("the Report command (v1) should be deserialized correctly", () => {
	// 	const ccData = buildCCBuffer(
	// 		Buffer.from([
	// 			SupervisionCommand.Report, // CC Command
	// 			55, // current value
	// 		]),
	// 	);
	// 	const cc = new SupervisionCCReport(fakeDriver, { data: ccData });

	// 	expect(cc.currentValue).toBe(55);
	// 	expect(cc.targetValue).toBeUndefined();
	// 	expect(cc.duration).toBeUndefined();
	// });

	// it("the Report command (v2) should be deserialized correctly", () => {
	// 	const ccData = buildCCBuffer(
	// 		Buffer.from([
	// 			SupervisionCommand.Report, // CC Command
	// 			55, // current value
	// 			66, // target value
	// 			1, // duration
	// 		]),
	// 	);
	// 	const cc = new SupervisionCCReport(fakeDriver, { data: ccData });

	// 	expect(cc.currentValue).toBe(55);
	// 	expect(cc.targetValue).toBe(66);
	// 	expect(cc.duration!.unit).toBe("seconds");
	// 	expect(cc.duration!.value).toBe(1);
	// });

	// it("deserializing an unsupported command should return an unspecified version of SupervisionCC", () => {
	// 	const serializedCC = buildCCBuffer(
	// 		1,
	// 		Buffer.from([255]), // not a valid command
	// 	);
	// 	const cc: any = new SupervisionCC(fakeDriver, {
	// 		data: serializedCC,
	// 	});
	// 	expect(cc.constructor).toBe(SupervisionCC);
	// });

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.Supervision,
	// 		"currentValue",
	// 	);
	// 	expect(currentValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: false,
	// 		min: 0,
	// 		max: 99,
	// 	});

	// 	// Writeable, 0-99
	// 	const targetValueMeta = getCCValueMetadata(
	// 		CommandClasses.Supervision,
	// 		"targetValue",
	// 	);
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });

	describe("responses should be detected correctly", () => {
		it("SupervisionCCGet should expect a response", () => {
			const ccRequest = SupervisionCC.encapsulate(
				host,
				new BasicCCSet(host, {
					nodeId: 2,
					targetValue: 5,
				}),
			);
			expect(ccRequest.expectsCCResponse()).toBeTrue();
		});

		it("SupervisionCC/BasicCCSet => SupervisionCCReport (correct session ID) = expected", () => {
			const ccRequest = SupervisionCC.encapsulate(
				host,
				new BasicCCSet(host, {
					nodeId: 2,
					targetValue: 5,
				}),
			);
			const ccResponse = new SupervisionCCReport(host, {
				nodeId: 2,
				moreUpdatesFollow: false,
				sessionId: ccRequest.sessionId,
				status: SupervisionStatus.Success,
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeTrue();
		});

		it("SupervisionCC/BasicCCSet => SupervisionCCReport (wrong session ID) = unexpected", () => {
			const ccRequest = SupervisionCC.encapsulate(
				host,
				new BasicCCSet(host, {
					nodeId: 2,
					targetValue: 5,
				}),
			);
			const ccResponse = new SupervisionCCReport(host, {
				nodeId: 2,
				moreUpdatesFollow: false,
				sessionId: ccRequest.sessionId + 1,
				status: SupervisionStatus.Success,
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeFalse();
		});
	});
});
