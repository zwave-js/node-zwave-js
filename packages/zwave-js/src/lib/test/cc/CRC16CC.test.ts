import {
	BasicCCGet,
	BasicCCSet,
	CRC16CC,
	type CRC16CCCommandEncapsulation,
	CommandClass,
	InvalidCC,
	isEncapsulatingCommandClass,
} from "@zwave-js/cc";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

test("should be detected as an encapsulating CC", (t) => {
	const basicCCSet = new BasicCCSet({
		nodeId: 3,
		targetValue: 89,
	});
	const crc16 = CRC16CC.encapsulate(basicCCSet);
	t.expect(isEncapsulatingCommandClass(crc16)).toBe(true);
});

test("should match the specs", async (t) => {
	// SDS13783 contains the following sample encapsulated command:
	const basicCCGet = new BasicCCGet({ nodeId: 1 });
	const crc16 = CRC16CC.encapsulate(basicCCGet);
	const serialized = await crc16.serialize({} as any);
	const expected = Bytes.from("560120024d26", "hex");
	t.expect(serialized).toStrictEqual(expected);
});

test("serialization and deserialization should be compatible", async (t) => {
	const basicCCSet = new BasicCCSet({
		nodeId: 3,
		targetValue: 89,
	});
	const crc16 = CRC16CC.encapsulate(basicCCSet);
	t.expect(crc16.nodeId).toBe(basicCCSet.nodeId);
	t.expect(crc16.encapsulated).toBe(basicCCSet);
	const serialized = await crc16.serialize({} as any);

	const deserialized = await CommandClass.parse(
		serialized,
		{ sourceNodeId: basicCCSet.nodeId as number } as any,
	);
	t.expect(deserialized.nodeId).toBe(basicCCSet.nodeId);
	const deserializedPayload = (deserialized as CRC16CCCommandEncapsulation)
		.encapsulated as BasicCCSet;
	t.expect(deserializedPayload instanceof BasicCCSet).toBe(true);
	t.expect(deserializedPayload.nodeId).toBe(basicCCSet.nodeId);
	t.expect(deserializedPayload.targetValue).toBe(basicCCSet.targetValue);
});

test("deserializing a CC with a wrong checksum should result in an invalid CC", async (t) => {
	const basicCCSet = new BasicCCSet({
		nodeId: 3,
		targetValue: 89,
	});
	const crc16 = CRC16CC.encapsulate(basicCCSet);
	t.expect(crc16.nodeId).toBe(basicCCSet.nodeId);
	t.expect(crc16.encapsulated).toBe(basicCCSet);
	const serialized = await crc16.serialize({} as any);
	serialized[serialized.length - 1] ^= 0xff;

	const deserialized = await CommandClass.parse(
		serialized,
		{ sourceNodeId: basicCCSet.nodeId as number } as any,
	);
	t.expect(deserialized instanceof InvalidCC).toBe(true);
});
