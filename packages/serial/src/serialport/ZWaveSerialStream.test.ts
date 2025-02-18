import { log as createZWaveLogContainer } from "@zwave-js/core/bindings/log/node";
import { Bytes } from "@zwave-js/shared";
import { isUint8Array } from "node:util/types";
import {
	type ExpectStatic,
	afterEach,
	beforeEach,
	test as baseTest,
} from "vitest";
import { MessageHeaders } from "../message/MessageHeaders.js";
import { MockPort } from "../mock/MockPort.js";
import {
	type ZWaveSerialFrame,
	ZWaveSerialFrameType,
} from "../parsers/ZWaveSerialFrame.js";
import {
	type ZWaveSerialStream,
	ZWaveSerialStreamFactory,
} from "./ZWaveSerialStream.js";

interface LocalTestContext {
	context: {
		port: MockPort;
		factory: ZWaveSerialStreamFactory;
		serial: ZWaveSerialStream;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const port = new MockPort();
			const context = {} as LocalTestContext["context"];
			context.port = port;
			context.factory = new ZWaveSerialStreamFactory(
				port.factory(),
				createZWaveLogContainer({ enabled: false }),
			);

			// Run tests
			await use(context);

			// Teardown
			port.destroy();
		},
		{ auto: true },
	],
});

beforeEach<LocalTestContext>(async ({ context, expect }) => {
	context.serial = await context.factory.createStream();
});

afterEach<LocalTestContext>(async ({ context }) => {
	await context.serial.close();
});

async function waitForData(
	stream: ReadableStream<ZWaveSerialFrame>,
): Promise<ZWaveSerialFrame> {
	const reader = stream.getReader();
	try {
		const result = await reader.read();
		if (result.value) return result.value;
		throw new Error("Unexpected end of stream");
	} finally {
		reader.releaseLock();
	}
}

function assertSerialAPIFrame(
	expect: ExpectStatic,
	frame: ZWaveSerialFrame,
	expectedData: MessageHeaders | Uint8Array,
) {
	expect(frame.type).toBe(ZWaveSerialFrameType.SerialAPI);
	if (typeof expectedData === "number") {
		expect(frame.data).toStrictEqual(expectedData);
	} else {
		expect(isUint8Array(frame.data)).toBe(true);
		expect(Bytes.view(frame.data as Uint8Array)).to.deep.equal(
			expectedData,
		);
	}
	expect(frame.data).toStrictEqual(expectedData);
}

test("isOpen returns true after opening", async ({ context, expect }) => {
	const { serial } = context;
	expect(serial.isOpen).toBe(true);
});

test("isOpen returns false after closing", async ({ context, expect }) => {
	const { serial } = context;
	await serial.close();
	expect(serial.isOpen).toBe(false);
});

test("passes written data through unchanged", async ({ context, expect }) => {
	const { port, serial } = context;
	const buffers = [
		Bytes.from([1, 2, 3]),
		Bytes.from("abcdef1234567890", "hex"),
	];
	for (const buffer of buffers) {
		await serial.writeAsync(buffer);
		expect(port.lastWrite).toStrictEqual(buffer);
	}
});

test("write rejects if the port is not open", async ({ context, expect }) => {
	const { port, serial } = context;
	await serial.close();
	await expect(() => serial.writeAsync(Bytes.from([MessageHeaders.ACK])))
		.rejects.toThrowError();
});

test("emits a chunk of data for each single-byte message that was read", async ({ context, expect }) => {
	const { port, serial } = context;
	port.emitData(Bytes.from([MessageHeaders.ACK]));
	let data = await waitForData(serial.readable);
	assertSerialAPIFrame(expect, data, MessageHeaders.ACK);

	port.emitData(Bytes.from([MessageHeaders.CAN]));
	data = await waitForData(serial.readable);
	assertSerialAPIFrame(expect, data, MessageHeaders.CAN);

	port.emitData(Bytes.from([MessageHeaders.NAK]));
	data = await waitForData(serial.readable);
	assertSerialAPIFrame(expect, data, MessageHeaders.NAK);
});

test("emits a series of chunks when multiple single-byte messages are received", async ({ context, expect }) => {
	const { port, serial } = context;
	port.emitData(
		Bytes.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			MessageHeaders.NAK,
		]),
	);

	let count = 0;
	for await (const data of serial.readable) {
		count++;
		if (count === 1) assertSerialAPIFrame(expect, data, MessageHeaders.ACK);
		if (count === 2) assertSerialAPIFrame(expect, data, MessageHeaders.CAN);
		if (count === 3) assertSerialAPIFrame(expect, data, MessageHeaders.NAK);

		if (count === 3) break;
	}
});

test("marks all invalid/unexpected data", async ({ context, expect }) => {
	const { port, serial } = context;
	port.emitData(
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
	for await (const data of serial.readable) {
		if (data.type === ZWaveSerialFrameType.Discarded) continue;

		count++;
		if (count === 1) assertSerialAPIFrame(expect, data, MessageHeaders.ACK);
		if (count === 2) assertSerialAPIFrame(expect, data, MessageHeaders.CAN);
		if (count === 3) assertSerialAPIFrame(expect, data, MessageHeaders.ACK);

		if (count === 3) break;
	}
});

test("marks all invalid/unexpected data (test 2)", async ({ context, expect }) => {
	const { port, serial } = context;
	port.emitData(
		Bytes.from([
			MessageHeaders.ACK,
			MessageHeaders.CAN,
			0xff,
			0xfe,
			0xfd,
			0xfa,
		]),
	);
	setTimeout(async () => {
		port.emitData(Bytes.from([MessageHeaders.NAK]));
	}, 10);

	let count = 0;
	for await (const data of serial.readable) {
		if (data.type === ZWaveSerialFrameType.Discarded) continue;

		count++;
		if (count === 1) assertSerialAPIFrame(expect, data, MessageHeaders.ACK);
		if (count === 2) assertSerialAPIFrame(expect, data, MessageHeaders.CAN);
		if (count === 3) assertSerialAPIFrame(expect, data, MessageHeaders.NAK);

		if (count === 3) break;
	}
});

test("emits a buffer when a message is received", async ({ context, expect }) => {
	const { port, serial } = context;
	const data = Bytes.from([
		MessageHeaders.SOF,
		0x05, // remaining length
		0xff,
		0xff,
		0xff,
		0xff,
		0xff,
	]);
	port.emitData(data);

	const received = await waitForData(serial.readable);
	assertSerialAPIFrame(expect, received, data);
});
