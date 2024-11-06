import { Bytes } from "@zwave-js/shared/safe";
import { wait } from "alcalzone-shared/async";
import { PassThrough } from "node:stream";
import sinon from "sinon";
import { afterEach, beforeEach, test } from "vitest";
import { MessageHeaders } from "../message/MessageHeaders.js";
import { createAndOpenMockedZWaveSerialPort } from "../mock/MockSerialPort.js";
import type { MockPortBinding } from "../mock/SerialPortBindingMock.js";
import type { ZWaveSerialPort } from "./ZWaveSerialPort.js";

interface TestContext {
	port: ZWaveSerialPort;
	binding: MockPortBinding;
}

async function waitForData(port: {
	once: (event: "data", callback: (data: any) => void) => any;
}): Promise<
	MessageHeaders.ACK | MessageHeaders.NAK | MessageHeaders.CAN | Uint8Array
> {
	return new Promise((resolve) => {
		port.once("data", resolve);
	});
}

beforeEach(async (t) => {
	t.context = await createAndOpenMockedZWaveSerialPort("/dev/zwavetest");
});

afterEach(async (t) => {
	const port = t.context.port;
	port.removeAllListeners();
	if (port.isOpen) await port.close();
});

test("isOpen returns true after opening", async (t) => {
	const { port } = t.context;
	t.expect(port.isOpen).toBe(true);
});

test("isOpen returns false after closing", async (t) => {
	const { port } = t.context;
	await port.close();
	t.expect(port.isOpen).toBe(false);
});

test("passes written data through unchanged", async (t) => {
	const { port, binding } = t.context;
	const buffers = [
		Bytes.from([1, 2, 3]),
		Bytes.from("abcdef1234567890", "hex"),
	];
	for (const buffer of buffers) {
		await port.writeAsync(buffer);
		t.expect(binding.lastWrite).toStrictEqual(buffer);
	}
});

test("write rejects if the port is not open", async (t) => {
	const { port } = t.context;
	await port.close();
	await t.expect(() => port.writeAsync(Bytes.from([MessageHeaders.ACK])))
		.rejects.toThrowError();
});

test("emit an event for each single-byte message that was read", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(Bytes.from([MessageHeaders.ACK]));
	let data = await waitForData(port);
	t.expect(data).toStrictEqual(MessageHeaders.ACK);

	binding.emitData(Bytes.from([MessageHeaders.CAN]));
	data = await waitForData(port);
	t.expect(data).toStrictEqual(MessageHeaders.CAN);

	binding.emitData(Bytes.from([MessageHeaders.NAK]));
	data = await waitForData(port);
	t.expect(data).toStrictEqual(MessageHeaders.NAK);
});

test("emits a series of events when multiple single-byte messages are received", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(
		Bytes.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			MessageHeaders.NAK,
		]),
	);

	let count = 0;
	return new Promise((resolve) => {
		port.on("data", (data) => {
			count++;
			if (count === 1) t.expect(data).toBe(MessageHeaders.ACK);
			if (count === 2) t.expect(data).toBe(MessageHeaders.CAN);
			if (count === 3) t.expect(data).toBe(MessageHeaders.NAK);

			if (count === 3) resolve();
		});
	});
});

test("skips all invalid/unexpected data", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(
		Bytes.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			0xff,
			0xfe,
			0xfd,
			0xfa,
			MessageHeaders.ACK,
		]),
	);

	let count = 0;
	return new Promise((resolve) => {
		port.on("data", (data) => {
			count++;
			if (count === 1) t.expect(data).toBe(MessageHeaders.ACK);
			if (count === 2) t.expect(data).toBe(MessageHeaders.CAN);
			if (count === 3) t.expect(data).toBe(MessageHeaders.ACK);

			if (count === 3) resolve();
		});
	});
});

test("skips all invalid/unexpected data (test 2)", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(
		Bytes.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			0xff,
			0xfe,
			0xfd,
			0xfa,
		]),
	);
	setTimeout(() => {
		binding.emitData(Bytes.from([MessageHeaders.NAK]));
	}, 10);

	let count = 0;
	return new Promise((resolve) => {
		port.on("data", (data) => {
			count++;
			if (count === 1) t.expect(data).toBe(MessageHeaders.ACK);
			if (count === 2) t.expect(data).toBe(MessageHeaders.CAN);
			if (count === 3) t.expect(data).toBe(MessageHeaders.NAK);

			if (count === 3) resolve();
		});
	});
});
test("emits a buffer when a message is received", async (t) => {
	const { port, binding } = t.context;
	const data = Bytes.from([
		MessageHeaders.SOF,
		0x05, // remaining length
		0xff,
		0xff,
		0xff,
		0xff,
		0xff,
	]);
	binding.emitData(data);

	const received = await waitForData(port);
	t.expect(received).toStrictEqual(data);
});

test("may be consumed with an async iterator", async (t) => {
	const { port, binding } = t.context;
	const data = Bytes.from([
		MessageHeaders.ACK,
		MessageHeaders.CAN,
		0xff,
		0xfe,
		0xfd,
		0xfa,
		MessageHeaders.ACK,
	]);
	binding.emitData(data);

	let count = 0;
	for await (const msg of port) {
		count++;
		if (count === 1) t.expect(msg).toBe(MessageHeaders.ACK);
		if (count === 2) t.expect(msg).toBe(MessageHeaders.CAN);
		if (count === 3) t.expect(msg).toBe(MessageHeaders.ACK);
		if (count === 3) break;
	}
});

test("can be piped into", async (t) => {
	const { port, binding } = t.context;
	const passThrough = new PassThrough();
	passThrough.pipe(port);

	return new Promise((resolve) => {
		const data = Bytes.from([1, 2, 3, 4, 5]);
		passThrough.write(data, (err) => {
			t.expect(err).toBeFalsy();
			// I see no better way of forcing the write to bubble through the streams
			setTimeout(() => {
				t.expect(binding.lastWrite).toStrictEqual(data);
				resolve();
			}, 1);
		});
	});
});

test("can be piped to a reader", async (t) => {
	const { port, binding } = t.context;
	const stream = new PassThrough();
	port.pipe(stream);

	// eslint-disable-next-line no-restricted-globals -- Serialport uses Node.js Buffers
	const expected = Buffer.from([0x01, 0x03, 0xff, 0xff, 0xff]);
	binding.emitData(expected);

	const data = await waitForData(stream);
	t.expect(data).toStrictEqual(expected);
});

test("can be unpiped again", async (t) => {
	const { port, binding } = t.context;
	const stream = new PassThrough();
	const spy = sinon.spy();
	stream.on("data", spy);

	port.pipe(stream);
	port.unpipe();

	const expected = Bytes.from([0x01, 0x03, 0xff, 0xff, 0xff]);
	binding.emitData(expected);

	await wait(1);

	t.expect(spy.callCount).toBe(0);
});
