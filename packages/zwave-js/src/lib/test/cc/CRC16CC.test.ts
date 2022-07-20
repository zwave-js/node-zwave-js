import {
	BasicCCGet,
	BasicCCSet,
	CommandClass,
	CRC16CC,
	CRC16CCCommandEncapsulation,
	InvalidCC,
	isEncapsulatingCommandClass,
} from "@zwave-js/cc";
import { createTestingHost } from "@zwave-js/host";

const host = createTestingHost();

describe("lib/commandclass/CRC16 => ", () => {
	describe("CommandEncapsulation (V1)", () => {
		it("should be detected as an encapsulating CC", () => {
			const basicCCSet = new BasicCCSet(host, {
				nodeId: 3,
				targetValue: 89,
			});
			const crc16 = CRC16CC.encapsulate(host, basicCCSet);
			expect(isEncapsulatingCommandClass(crc16)).toBeTrue();
		});

		it("should match the specs", () => {
			// SDS13783 contains the following sample encapsulated command:
			const basicCCGet = new BasicCCGet(host, { nodeId: 1 });
			const crc16 = CRC16CC.encapsulate(host, basicCCGet);
			const serialized = crc16.serialize();
			const expected = Buffer.from("560120024d26", "hex");
			expect(serialized).toEqual(expected);
		});

		it("serialization and deserialization should be compatible", () => {
			const basicCCSet = new BasicCCSet(host, {
				nodeId: 3,
				targetValue: 89,
			});
			const crc16 = CRC16CC.encapsulate(host, basicCCSet);
			expect(crc16.nodeId).toBe(basicCCSet.nodeId);
			expect(crc16.encapsulated).toBe(basicCCSet);
			const serialized = crc16.serialize();

			const deserialized = CommandClass.from(host, {
				nodeId: basicCCSet.nodeId as number,
				data: serialized,
			});
			expect(deserialized.nodeId).toBe(basicCCSet.nodeId);
			const deserializedPayload = (
				deserialized as CRC16CCCommandEncapsulation
			).encapsulated as BasicCCSet;
			expect(deserializedPayload).toBeInstanceOf(BasicCCSet);
			expect(deserializedPayload.nodeId).toBe(basicCCSet.nodeId);
			expect(deserializedPayload.targetValue).toBe(
				basicCCSet.targetValue,
			);
		});

		it("deserializing a CC with a wrong checksum should result in an invalid CC", () => {
			const basicCCSet = new BasicCCSet(host, {
				nodeId: 3,
				targetValue: 89,
			});
			const crc16 = CRC16CC.encapsulate(host, basicCCSet);
			expect(crc16.nodeId).toBe(basicCCSet.nodeId);
			expect(crc16.encapsulated).toBe(basicCCSet);
			const serialized = crc16.serialize();
			serialized[serialized.length - 1] ^= 0xff;

			const decoded = CommandClass.from(host, {
				nodeId: basicCCSet.nodeId as number,
				data: serialized,
			});
			expect(decoded).toBeInstanceOf(InvalidCC);
		});
	});
});
