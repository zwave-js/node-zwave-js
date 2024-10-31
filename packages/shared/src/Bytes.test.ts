import test from "ava";
import { Bytes } from "./Bytes.js";
import { uint8ArrayToHex } from "./uint8array-extras.js";

test("writeUIntLE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeUIntLE(0xde, 0, 1);
	b.writeUIntLE(0xdead, 1, 2);
	b.writeUIntLE(0xdeadbe, 3, 3);
	b.writeUIntLE(0xdeadbeef, 6, 4);
	t.is(uint8ArrayToHex(b), "deaddebeaddeefbeadde");
});

test("writeUIntBE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeUIntBE(0xde, 0, 1);
	b.writeUIntBE(0xdead, 1, 2);
	b.writeUIntBE(0xdeadbe, 3, 3);
	b.writeUIntBE(0xdeadbeef, 6, 4);
	t.is(uint8ArrayToHex(b), "dedeaddeadbedeadbeef");
});

test("readUIntLE works as expected", (t) => {
	const b = Bytes.from("deaddebeaddeefbeadde", "hex");
	const v1 = b.readUIntLE(0, 1);
	const v2 = b.readUIntLE(1, 2);
	const v3 = b.readUIntLE(3, 3);
	const v4 = b.readUIntLE(6, 4);
	t.is(v1, 0xde);
	t.is(v2, 0xdead);
	t.is(v3, 0xdeadbe);
	t.is(v4, 0xdeadbeef);
});

test("readUIntBE works as expected", (t) => {
	const b = Bytes.from("dedeaddeadbedeadbeef", "hex");
	const v1 = b.readUIntBE(0, 1);
	const v2 = b.readUIntBE(1, 2);
	const v3 = b.readUIntBE(3, 3);
	const v4 = b.readUIntBE(6, 4);
	t.is(v1, 0xde);
	t.is(v2, 0xdead);
	t.is(v3, 0xdeadbe);
	t.is(v4, 0xdeadbeef);
});

test("writeIntLE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeIntLE(-127, 0, 1);
	b.writeIntLE(-31870, 1, 2);
	b.writeIntLE(-7961212, 3, 3);
	b.writeIntLE(-1870034809, 6, 4);
	t.is(uint8ArrayToHex(b), "81828384858687888990");
});

test("writeIntBE works as expected", (t) => {
	const b = new Bytes(10);
	b.writeIntBE(-127, 0, 1);
	b.writeIntBE(-32125, 1, 2);
	b.writeIntBE(-8092282, 3, 3);
	b.writeIntBE(-2021095024, 6, 4);
	t.is(uint8ArrayToHex(b), "81828384858687888990");
});

test("readIntLE works as expected", (t) => {
	const b = Bytes.from("81828384858687888990", "hex");
	const v1 = b.readIntLE(0, 1);
	const v2 = b.readIntLE(1, 2);
	const v3 = b.readIntLE(3, 3);
	const v4 = b.readIntLE(6, 4);
	t.is(v1, -127);
	t.is(v2, -31870);
	t.is(v3, -7961212);
	t.is(v4, -1870034809);
});

test("readIntBE works as expected", (t) => {
	const b = Bytes.from("81828384858687888990", "hex");
	const v1 = b.readIntBE(0, 1);
	const v2 = b.readIntBE(1, 2);
	const v3 = b.readIntBE(3, 3);
	const v4 = b.readIntBE(6, 4);
	t.is(v1, -127);
	t.is(v2, -32125);
	t.is(v3, -8092282);
	t.is(v4, -2021095024);
});

test("Buffer.concat works as expected", (t) => {
	// No total length
	const b1 = Bytes.from([1, 2, 3]);
	const b2 = Bytes.from([4, 5, 6]);
	const b3 = Bytes.from([7, 8, 9]);
	const b4 = Bytes.concat([b1, b2, b3]);
	t.is(uint8ArrayToHex(b4), "010203040506070809");

	// Higher total length
	const b5 = Bytes.concat([b1, b2, b3], 12);
	t.is(uint8ArrayToHex(b5), "010203040506070809000000");

	// Shorter total length
	const b6 = Bytes.concat([b1, b2, b3], 8);
	t.is(uint8ArrayToHex(b6), "0102030405060708");
});

test("subarray works multiple times in a row", (t) => {
	const b = Bytes.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	const b1 = b.subarray(1, 4); // 2, 3, 4
	const b2 = b1.subarray(1, 2); // 3
	t.is(uint8ArrayToHex(b1), "020304");
	t.is(uint8ArrayToHex(b2), "03");

	t.is(b2.readInt8(0), 3);
});
