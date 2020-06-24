import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { createEmptyMockDriver } from "../test/mocks";
import { BasicCCSet, BasicCommand } from "./BasicCC";
import type { CommandClass } from "./CommandClass";
import { isEncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import {
	MultiChannelCC,
	MultiChannelCCAggregatedMembersGet,
	MultiChannelCCCapabilityGet,
	MultiChannelCCEndPointFind,
	MultiChannelCCEndPointGet,
	MultiChannelCommand,
} from "./MultiChannelCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Multi Channel"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/MultiChannelCC", () => {
	describe("class MultiChannelCC", () => {
		it("is an encapsulating CommandClass", () => {
			let cc: CommandClass = new BasicCCSet(fakeDriver, {
				nodeId: 1,
				targetValue: 50,
			});
			cc = MultiChannelCC.encapsulate(fakeDriver, cc);
			expect(isEncapsulatingCommandClass(cc)).toBeTrue();
		});
	});

	it("the EndPointGet command should serialize correctly", () => {
		const cc = new MultiChannelCCEndPointGet(fakeDriver, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				MultiChannelCommand.EndPointGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CapabilityGet command should serialize correctly", () => {
		const cc = new MultiChannelCCCapabilityGet(fakeDriver, {
			nodeId: 2,
			requestedEndpoint: 7,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultiChannelCommand.CapabilityGet, // CC Command
				7, // EndPoint
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the EndPointFind command should serialize correctly", () => {
		const cc = new MultiChannelCCEndPointFind(fakeDriver, {
			nodeId: 2,
			genericClass: 0x01,
			specificClass: 0x02,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultiChannelCommand.EndPointFind, // CC Command
				0x01, // genericClass
				0x02, // specificClass
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CommandEncapsulation command should serialize correctly", () => {
		let cc: CommandClass = new BasicCCSet(fakeDriver, {
			nodeId: 2,
			targetValue: 5,
			endpoint: 7,
		});
		cc = MultiChannelCC.encapsulate(fakeDriver, cc);
		const expected = buildCCBuffer(
			Buffer.from([
				MultiChannelCommand.CommandEncapsulation, // CC Command
				0, // source EP
				7, // destination
				CommandClasses.Basic,
				BasicCommand.Set,
				5, // target value
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the AggregatedMembersGet command should serialize correctly", () => {
		const cc = new MultiChannelCCAggregatedMembersGet(fakeDriver, {
			nodeId: 2,
			requestedEndpoint: 6,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultiChannelCommand.AggregatedMembersGet, // CC Command
				6, // EndPoint
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	// it("the Report command (v2) should be deserialized correctly", () => {
	// 	const ccData = buildCCBuffer(
	// 		1,
	// 		Buffer.from([
	// 			MultiChannelCommand.Report, // CC Command
	// 			55, // current value
	// 			66, // target value
	// 			1, // duration
	// 		]),
	// 	);
	// 	const cc = new MultiChannelCCReport(fakeDriver, { data: ccData });

	// 	expect(cc.currentValue).toBe(55);
	// 	expect(cc.targetValue).toBe(66);
	// 	expect(cc.duration!.unit).toBe("seconds");
	// 	expect(cc.duration!.value).toBe(1);
	// });

	it("deserializing an unsupported command should return an unspecified version of MultiChannelCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new MultiChannelCC(fakeDriver, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(MultiChannelCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.MultiChannel,
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
	// 		CommandClasses.MultiChannel,
	// 		"targetValue",
	// 	);
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });
});
