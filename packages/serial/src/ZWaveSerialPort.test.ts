import MockBinding from "@serialport/binding-mock";
import SerialPort from "serialport";
import { MessageHeaders } from "./MessageHeaders";
import { ZWaveSerialPort } from "./ZWaveSerialPort";

SerialPort.Binding = MockBinding as any;

async function createAndOpenMockedZWaveSerialPort(): Promise<{
	port: ZWaveSerialPort;
	binding: MockBinding;
}> {
	MockBinding.reset();
	MockBinding.createPort("/dev/ZWaveTest", {
		record: true,
		readyData: Buffer.from([]),
	});
	const port = new ZWaveSerialPort("/dev/ZWaveTest");
	const binding = port["serial"].binding as any;
	await port.open();
	return { port, binding };
}

async function waitForData(
	port: ZWaveSerialPort,
): Promise<
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
		await port.close();
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

	it("emits a series of events if multiple single-byte messages are received", (done) => {
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
});
