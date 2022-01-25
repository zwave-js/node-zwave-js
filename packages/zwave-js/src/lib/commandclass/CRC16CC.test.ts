import type { Driver } from "../driver/Driver";
import { createEmptyMockDriver } from "../test/mocks";
import { BasicCCGet, BasicCCSet } from "./BasicCC";
import { CommandClass, InvalidCC } from "./CommandClass";
import { CRC16CC, CRC16CCCommandEncapsulation } from "./CRC16CC";
import { isEncapsulatingCommandClass } from "./EncapsulatingCommandClass";

const fakeDriver = createEmptyMockDriver() as unknown as Driver;

describe("lib/commandclass/CRC16 => ", () => {
	describe("CommandEncapsulation (V1)", () => {
		it("should be detected as an encapsulating CC", () => {
			const basicCCSet = new BasicCCSet(fakeDriver, {
				nodeId: 3,
				targetValue: 89,
			});
			const crc16 = CRC16CC.encapsulate(fakeDriver, basicCCSet);
			expect(isEncapsulatingCommandClass(crc16)).toBeTrue();
		});

		it("should match the specs", () => {
			// SDS13783 contains the following sample encapsulated command:
			const basicCCGet = new BasicCCGet(fakeDriver, { nodeId: 1 });
			const crc16 = CRC16CC.encapsulate(fakeDriver, basicCCGet);
			const serialized = crc16.serialize();
			const expected = Buffer.from("560120024d26", "hex");
			expect(serialized).toEqual(expected);
		});

		it("serialization and deserialization should be compatible", () => {
			const basicCCSet = new BasicCCSet(fakeDriver, {
				nodeId: 3,
				targetValue: 89,
			});
			const crc16 = CRC16CC.encapsulate(fakeDriver, basicCCSet);
			expect(crc16.nodeId).toBe(basicCCSet.nodeId);
			expect(crc16.encapsulated).toBe(basicCCSet);
			const serialized = crc16.serialize();

			const deserialized = CommandClass.from(fakeDriver, {
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
			const basicCCSet = new BasicCCSet(fakeDriver, {
				nodeId: 3,
				targetValue: 89,
			});
			const crc16 = CRC16CC.encapsulate(fakeDriver, basicCCSet);
			expect(crc16.nodeId).toBe(basicCCSet.nodeId);
			expect(crc16.encapsulated).toBe(basicCCSet);
			const serialized = crc16.serialize();
			serialized[serialized.length - 1] ^= 0xff;

			const decoded = CommandClass.from(fakeDriver, {
				nodeId: basicCCSet.nodeId as number,
				data: serialized,
			});
			expect(decoded).toBeInstanceOf(InvalidCC);
		});
	});
});
