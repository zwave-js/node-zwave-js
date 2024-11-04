import { test } from "vitest";
import { Bytes } from "./Bytes.js";
import { uint8ArrayToHex } from "./uint8array-extras.js";

test("writeUIntLE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeUIntLE(0xde, 0, 1);
	b.writeUIntLE(0xdead, 1, 2);
	b.writeUIntLE(0xdeadbe, 3, 3);
	b.writeUIntLE(0xdeadbeef, 6, 4);
	t.expect(uint8ArrayToHex(b)).toBe("deaddebeaddeefbeadde");
});

test("writeUIntBE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeUIntBE(0xde, 0, 1);
	b.writeUIntBE(0xdead, 1, 2);
	b.writeUIntBE(0xdeadbe, 3, 3);
	b.writeUIntBE(0xdeadbeef, 6, 4);
	t.expect(uint8ArrayToHex(b)).toBe("dedeaddeadbedeadbeef");
});

test("readUIntLE works as expected", (t) => {
	const b = Bytes.from("deaddebeaddeefbeadde", "hex");
	const v1 = b.readUIntLE(0, 1);
	const v2 = b.readUIntLE(1, 2);
	const v3 = b.readUIntLE(3, 3);
	const v4 = b.readUIntLE(6, 4);
	t.expect(v1).toBe(0xde);
	t.expect(v2).toBe(0xdead);
	t.expect(v3).toBe(0xdeadbe);
	t.expect(v4).toBe(0xdeadbeef);
});

test("readUIntBE works as expected", (t) => {
	const b = Bytes.from("dedeaddeadbedeadbeef", "hex");
	const v1 = b.readUIntBE(0, 1);
	const v2 = b.readUIntBE(1, 2);
	const v3 = b.readUIntBE(3, 3);
	const v4 = b.readUIntBE(6, 4);
	t.expect(v1).toBe(0xde);
	t.expect(v2).toBe(0xdead);
	t.expect(v3).toBe(0xdeadbe);
	t.expect(v4).toBe(0xdeadbeef);
});

test("writeIntLE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeIntLE(-127, 0, 1);
	b.writeIntLE(-31870, 1, 2);
	b.writeIntLE(-7961212, 3, 3);
	b.writeIntLE(-1870034809, 6, 4);
	t.expect(uint8ArrayToHex(b)).toBe("81828384858687888990");
});

test("writeIntBE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeIntBE(-127, 0, 1);
	b.writeIntBE(-32125, 1, 2);
	b.writeIntBE(-8092282, 3, 3);
	b.writeIntBE(-2021095024, 6, 4);
	t.expect(uint8ArrayToHex(b)).toBe("81828384858687888990");
});

test("readIntLE works as expected", (t) => {
	const b = Bytes.from("81828384858687888990", "hex");
	const v1 = b.readIntLE(0, 1);
	const v2 = b.readIntLE(1, 2);
	const v3 = b.readIntLE(3, 3);
	const v4 = b.readIntLE(6, 4);
	t.expect(v1).toBe(-127);
	t.expect(v2).toBe(-31870);
	t.expect(v3).toBe(-7961212);
	t.expect(v4).toBe(-1870034809);
});

test("readIntBE works as expected", (t) => {
	const b = Bytes.from("81828384858687888990", "hex");
	const v1 = b.readIntBE(0, 1);
	const v2 = b.readIntBE(1, 2);
	const v3 = b.readIntBE(3, 3);
	const v4 = b.readIntBE(6, 4);
	t.expect(v1).toBe(-127);
	t.expect(v2).toBe(-32125);
	t.expect(v3).toBe(-8092282);
	t.expect(v4).toBe(-2021095024);
});

test("Buffer.concat works as expected", (t) => {
	// No total length
	const b1 = Bytes.from([1, 2, 3]);
	const b2 = Bytes.from([4, 5, 6]);
	const b3 = Bytes.from([7, 8, 9]);
	const b4 = Bytes.concat([b1, b2, b3]);
	t.expect(uint8ArrayToHex(b4)).toBe("010203040506070809");

	// Higher total length
	const b5 = Bytes.concat([b1, b2, b3], 12);
	t.expect(uint8ArrayToHex(b5)).toBe("010203040506070809000000");

	// Shorter total length
	const b6 = Bytes.concat([b1, b2, b3], 8);
	t.expect(uint8ArrayToHex(b6)).toBe("0102030405060708");
});

test("subarray works multiple times in a row", (t) => {
	const b = Bytes.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	const b1 = b.subarray(1, 4); // 2, 3, 4
	const b2 = b1.subarray(1, 2); // 3
	t.expect(uint8ArrayToHex(b1)).toBe("020304");
	t.expect(uint8ArrayToHex(b2)).toBe("03");

	t.expect(b2.readInt8(0)).toBe(3);
});
