import MockBinding from "@serialport/binding-mock";
import { ZWaveLogContainer } from "@zwave-js/core";
import { wait } from "alcalzone-shared/async";
import SerialPort from "serialport";
import { PassThrough } from "stream";
import { MessageHeaders } from "./MessageHeaders";
import { ZWaveSerialPort } from "./ZWaveSerialPort";

SerialPort.Binding = MockBinding as any;

async function createAndOpenMockedZWaveSerialPort(
	open: boolean = true,
): Promise<{
	port: ZWaveSerialPort;
	binding: MockBinding;
}> {
	MockBinding.reset();
	MockBinding.createPort("/dev/ZWaveTest", {
		record: true,
		readyData: Buffer.from([]),
	});
	const port = new ZWaveSerialPort(
		"/dev/ZWaveTest",
		new ZWaveLogContainer({
			enabled: false,
		}),
	);
	const binding = (port["serial"] as SerialPort).binding as MockBinding;
	if (open) await port.open();
	return { port, binding };
}

async function waitForData(port: {
	once: (event: "data", callback: (data: any) => void) => any;
}): Promise<
	MessageHeaders.ACK | MessageHeaders.NAK | MessageHeaders.CAN | Buffer
> {
	return new Promise((resolve) => {
		port.once("data", resolve);
	});
}

describe("ZWaveSerialPort", () => {
	let port: ZWaveSerialPort;
	let binding: MockBinding;
	beforeEach(async () => {
		({ port, binding } = await createAndOpenMockedZWaveSerialPort());
	});
	afterEach(async () => {
		port.removeAllListeners();
		if (port.isOpen) await port.close();
	});

	it("isOpen returns true after opening", () => {
		expect(port.isOpen).toBeTrue();
	});

	it("isOpen returns false after closing", async () => {
		await port.close();
		expect(port.isOpen).toBeFalse();
	});

	it("passes written data through unchanged", async () => {
		const buffers = [
			Buffer.from([1, 2, 3]),
			Buffer.from("abcdef1234567890", "hex"),
		];
		for (const buffer of buffers) {
			await port.writeAsync(buffer);
			expect(binding.lastWrite).toEqual(buffer);
		}
	});

	it("write rejects if the port is not open", async () => {
		await port.close();
		await expect(
			port.writeAsync(Buffer.from([MessageHeaders.ACK])),
		).toReject();
	});

	it("emit an event for each single-byte message that was read", async () => {
		binding.emitData(Buffer.from([MessageHeaders.ACK]));
		let data = await waitForData(port);
		expect(data).toEqual(MessageHeaders.ACK);

		binding.emitData(Buffer.from([MessageHeaders.CAN]));
		data = await waitForData(port);
		expect(data).toEqual(MessageHeaders.CAN);

		binding.emitData(Buffer.from([MessageHeaders.NAK]));
		data = await waitForData(port);
		expect(data).toEqual(MessageHeaders.NAK);
	});

	it("emits a series of events when multiple single-byte messages are received", (done) => {
		binding.emitData(
			Buffer.from([
				MessageHeaders.ACK,
				MessageHeaders.CAN,
				MessageHeaders.NAK,
			]),
		);

		let count = 0;
		port.on("data", (data) => {
			count++;
			if (count === 1) expect(data).toBe(MessageHeaders.ACK);
			if (count === 2) expect(data).toBe(MessageHeaders.CAN);
			if (count === 3) expect(data).toBe(MessageHeaders.NAK);

			if (count === 3) done();
		});
	});

	it("skips all useless data", (done) => {
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
		port.on("data", (data) => {
			count++;
			if (count === 1) expect(data).toBe(MessageHeaders.ACK);
			if (count === 2) expect(data).toBe(MessageHeaders.CAN);
			if (count === 3) expect(data).toBe(MessageHeaders.ACK);

			if (count === 3) done();
		});
	});

	it("emits a buffer when a message is received", async () => {
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
		expect(received).toEqual(data);
	});

	it("may be consumed with an async iterator", async () => {
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
			if (count === 1) expect(msg).toBe(MessageHeaders.ACK);
			if (count === 2) expect(msg).toBe(MessageHeaders.CAN);
			if (count === 3) expect(msg).toBe(MessageHeaders.ACK);
			if (count === 3) break;
		}
	});

	it("can be piped into", (done) => {
		const passThrough = new PassThrough();
		passThrough.pipe(port);

		const data = Buffer.from([1, 2, 3, 4, 5]);
		passThrough.write(data, (err) => {
			expect(err).toBeFalsy();
			// I see no better way of forcing the write to bubble through the streams
			setTimeout(() => {
				expect(binding.lastWrite).toEqual(data);
				done();
			}, 1);
		});
	});

	it("can be piped to a reader", async () => {
		const stream = new PassThrough();
		port.pipe(stream);

		const expected = Buffer.from([0x01, 0x03, 0xff, 0xff, 0xff]);
		binding.emitData(expected);

		const data = await waitForData(stream);
		expect(data).toEqual(expected);
	});

	it("can be unpiped again", async () => {
		const stream = new PassThrough();
		const spy = jest.fn();
		stream.on("data", spy);

		port.pipe(stream);
		port.unpipe();

		const expected = Buffer.from([0x01, 0x03, 0xff, 0xff, 0xff]);
		binding.emitData(expected);

		await wait(1);

		expect(spy).not.toBeCalled();
	});
});
