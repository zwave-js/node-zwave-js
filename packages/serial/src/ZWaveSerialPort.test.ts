import { wait } from "alcalzone-shared/async";
import ava, { type TestFn } from "ava";
import sinon from "sinon";
import { PassThrough } from "stream";
import { MessageHeaders } from "./MessageHeaders";
import { createAndOpenMockedZWaveSerialPort } from "./MockSerialPort";
import type { MockPortBinding } from "./SerialPortBindingMock";
import type { ZWaveSerialPort } from "./ZWaveSerialPort";

interface TestContext {
	port: ZWaveSerialPort;
	binding: MockPortBinding;
}

const test = ava as TestFn<TestContext>;

async function waitForData(port: {
	once: (event: "data", callback: (data: any) => void) => any;
}): Promise<
	MessageHeaders.ACK | MessageHeaders.NAK | MessageHeaders.CAN | Buffer
> {
	return new Promise((resolve) => {
		port.once("data", resolve);
	});
}

test.beforeEach(async (t) => {
	t.context = await createAndOpenMockedZWaveSerialPort("/dev/zwavetest");
});

test.afterEach.always(async (t) => {
	const port = t.context.port;
	port.removeAllListeners();
	if (port.isOpen) await port.close();
});

test("isOpen returns true after opening", async (t) => {
	const { port } = t.context;
	t.true(port.isOpen);
});

test("isOpen returns false after closing", async (t) => {
	const { port } = t.context;
	await port.close();
	t.false(port.isOpen);
});

test("passes written data through unchanged", async (t) => {
	const { port, binding } = t.context;
	const buffers = [
		Buffer.from([1, 2, 3]),
		Buffer.from("abcdef1234567890", "hex"),
	];
	for (const buffer of buffers) {
		await port.writeAsync(buffer);
		t.deepEqual(binding.lastWrite, buffer);
	}
});

test("write rejects if the port is not open", async (t) => {
	const { port } = t.context;
	await port.close();
	await t.throwsAsync(() =>
		port.writeAsync(Buffer.from([MessageHeaders.ACK])),
	);
});

test("emit an event for each single-byte message that was read", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(Buffer.from([MessageHeaders.ACK]));
	let data = await waitForData(port);
	t.deepEqual(data, MessageHeaders.ACK);

	binding.emitData(Buffer.from([MessageHeaders.CAN]));
	data = await waitForData(port);
	t.deepEqual(data, MessageHeaders.CAN);

	binding.emitData(Buffer.from([MessageHeaders.NAK]));
	data = await waitForData(port);
	t.deepEqual(data, MessageHeaders.NAK);
});

test("emits a series of events when multiple single-byte messages are received", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(
		Buffer.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			MessageHeaders.NAK,
		]),
	);

	let count = 0;
	return new Promise((resolve) => {
		port.on("data", (data) => {
			count++;
			if (count === 1) t.is(data, MessageHeaders.ACK);
			if (count === 2) t.is(data, MessageHeaders.CAN);
			if (count === 3) t.is(data, MessageHeaders.NAK);

			if (count === 3) resolve();
		});
	});
});

test("skips all invalid/unexpected data", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(
		Buffer.from([
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
			if (count === 1) t.is(data, MessageHeaders.ACK);
			if (count === 2) t.is(data, MessageHeaders.CAN);
			if (count === 3) t.is(data, MessageHeaders.ACK);

			if (count === 3) resolve();
		});
	});
});

test("skips all invalid/unexpected data (test 2)", async (t) => {
	const { port, binding } = t.context;
	binding.emitData(
		Buffer.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			0xff,
			0xfe,
			0xfd,
			0xfa,
		]),
	);
	setTimeout(() => {
		binding.emitData(Buffer.from([MessageHeaders.NAK]));
	}, 10);

	let count = 0;
	return new Promise((resolve) => {
		port.on("data", (data) => {
			count++;
			if (count === 1) t.is(data, MessageHeaders.ACK);
			if (count === 2) t.is(data, MessageHeaders.CAN);
			if (count === 3) t.is(data, MessageHeaders.NAK);

			if (count === 3) resolve();
		});
	});
});
test("emits a buffer when a message is received", async (t) => {
	const { port, binding } = t.context;
	const data = Buffer.from([
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
	t.deepEqual(received, data);
});

test("may be consumed with an async iterator", async (t) => {
	const { port, binding } = t.context;
	const data = Buffer.from([
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
		if (count === 1) t.is(msg, MessageHeaders.ACK);
		if (count === 2) t.is(msg, MessageHeaders.CAN);
		if (count === 3) t.is(msg, MessageHeaders.ACK);
		if (count === 3) break;
	}
});

test("can be piped into", async (t) => {
	const { port, binding } = t.context;
	const passThrough = new PassThrough();
	passThrough.pipe(port);

	return new Promise((resolve) => {
		const data = Buffer.from([1, 2, 3, 4, 5]);
		passThrough.write(data, (err) => {
			t.falsy(err);
			// I see no better way of forcing the write to bubble through the streams
			setTimeout(() => {
				t.deepEqual(binding.lastWrite, data);
				resolve();
			}, 1);
		});
	});
});

test("can be piped to a reader", async (t) => {
	const { port, binding } = t.context;
	const stream = new PassThrough();
	port.pipe(stream);

	const expected = Buffer.from([0x01, 0x03, 0xff, 0xff, 0xff]);
	binding.emitData(expected);

	const data = await waitForData(stream);
	t.deepEqual(data, expected);
});

test("can be unpiped again", async (t) => {
	const { port, binding } = t.context;
	const stream = new PassThrough();
	const spy = sinon.spy();
	stream.on("data", spy);

	port.pipe(stream);
	port.unpipe();

	const expected = Buffer.from([0x01, 0x03, 0xff, 0xff, 0xff]);
	binding.emitData(expected);

	await wait(1);

	t.is(spy.callCount, 0);
});
