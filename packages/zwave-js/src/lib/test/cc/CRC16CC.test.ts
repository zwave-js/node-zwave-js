import {
	BasicCCGet,
	BasicCCSet,
	CRC16CC,
	CommandClass,
	InvalidCC,
	isEncapsulatingCommandClass,
	type CRC16CCCommandEncapsulation,
} from "@zwave-js/cc";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

test("should be detected as an encapsulating CC", (t) => {
	const basicCCSet = new BasicCCSet(host, {
		nodeId: 3,
		targetValue: 89,
	});
	const crc16 = CRC16CC.encapsulate(host, basicCCSet);
	t.true(isEncapsulatingCommandClass(crc16));
});

test("should match the specs", (t) => {
	// SDS13783 contains the following sample encapsulated command:
	const basicCCGet = new BasicCCGet(host, { nodeId: 1 });
	const crc16 = CRC16CC.encapsulate(host, basicCCGet);
	const serialized = crc16.serialize();
	const expected = Buffer.from("560120024d26", "hex");
	t.deepEqual(serialized, expected);
});

test("serialization and deserialization should be compatible", (t) => {
	const basicCCSet = new BasicCCSet(host, {
		nodeId: 3,
		targetValue: 89,
	});
	const crc16 = CRC16CC.encapsulate(host, basicCCSet);
	t.is(crc16.nodeId, basicCCSet.nodeId);
	t.is(crc16.encapsulated, basicCCSet);
	const serialized = crc16.serialize();

	const deserialized = CommandClass.from(host, {
		nodeId: basicCCSet.nodeId as number,
		data: serialized,
	});
	t.is(deserialized.nodeId, basicCCSet.nodeId);
	const deserializedPayload = (deserialized as CRC16CCCommandEncapsulation)
		.encapsulated as BasicCCSet;
	t.true(deserializedPayload instanceof BasicCCSet);
	t.is(deserializedPayload.nodeId, basicCCSet.nodeId);
	t.is(deserializedPayload.targetValue, basicCCSet.targetValue);
});

test("deserializing a CC with a wrong checksum should result in an invalid CC", (t) => {
	const basicCCSet = new BasicCCSet(host, {
		nodeId: 3,
		targetValue: 89,
	});
	const crc16 = CRC16CC.encapsulate(host, basicCCSet);
	t.is(crc16.nodeId, basicCCSet.nodeId);
	t.is(crc16.encapsulated, basicCCSet);
	const serialized = crc16.serialize();
	serialized[serialized.length - 1] ^= 0xff;

	const decoded = CommandClass.from(host, {
		nodeId: basicCCSet.nodeId as number,
		data: serialized,
	});
	t.true(decoded instanceof InvalidCC);
});
