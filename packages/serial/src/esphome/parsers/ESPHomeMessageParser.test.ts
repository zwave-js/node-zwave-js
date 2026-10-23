import { ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";
import { expect, test } from "vitest";

import { ESPHomeMessage, ESPHomeMessageType } from "../ESPHomeMessage.js";
import { HelloResponse } from "../HelloMessages.js";
import { PingRequest } from "../PingMessages.js";

import { ESPHomeMessageParser } from "./ESPHomeMessageParser.js";

async function parseChunks(
	parser: ESPHomeMessageParser,
	chunks: BytesView[],
): Promise<ESPHomeMessage[]> {
	const writer = parser.writable.getWriter();
	const reader = parser.readable.getReader();
	const messages: ESPHomeMessage[] = [];
	const reading = (async () => {
		while (true) {
			const { value, done } = await reader.read();
			if (done) return;
			messages.push(value);
		}
	})();
	const writing = (async () => {
		for (const chunk of chunks) {
			await writer.write(chunk);
		}
		await writer.close();
	})();
	await Promise.all([reading, writing]);
	return messages;
}

test("Fragments of a frame split inside its VarInts are retained until the frame is complete", async () => {
	// A payload size >= 128 needs a multi-byte VarInt
	const frame = new ESPHomeMessage({
		messageType: ESPHomeMessageType.ZWaveProxyFrame,
		payload: new Bytes(200).fill(0xab),
	}).serialize();
	const ping = new PingRequest().serialize();

	const messages = await parseChunks(new ESPHomeMessageParser(), [
		// Indicator and first byte of the size VarInt
		frame.subarray(0, 2),
		// Rest of the size VarInt and first byte of the type VarInt
		frame.subarray(2, 4),
		frame.subarray(4),
		ping,
	]);

	expect(messages).toHaveLength(2);
	expect(messages[0].messageType).toBe(ESPHomeMessageType.ZWaveProxyFrame);
	expect(messages[0].payload).toStrictEqual(new Bytes(200).fill(0xab));
	expect(messages[1]).toBeInstanceOf(PingRequest);
});

test("Invalid framing errors the stream", async () => {
	const promise = parseChunks(new ESPHomeMessageParser(), [
		Bytes.from([0x00, 0xf9, 0xff, 0xff, 0xff, 0x0f, 0x02]),
	]);
	await expect(promise).rejects.toMatchObject({
		code: ZWaveErrorCodes.PacketFormat_Invalid,
	});
});

test("A well-framed message with an invalid body is dropped", async () => {
	// HelloResponse whose string field claims more bytes than the payload contains
	const invalid = new ESPHomeMessage({
		messageType: ESPHomeMessageType.HelloResponse,
		payload: Bytes.from([0x1a, 0x05, 0x41]),
	}).serialize();
	const ping = new PingRequest().serialize();

	const messages = await parseChunks(new ESPHomeMessageParser(), [
		Bytes.concat([invalid, ping]),
	]);

	expect(messages).toHaveLength(1);
	expect(messages[0]).toBeInstanceOf(PingRequest);
	expect(messages[0]).not.toBeInstanceOf(HelloResponse);
});

test("In Noise mode, a message length exceeding the decrypted frame errors the stream", async () => {
	const promise = parseChunks(new ESPHomeMessageParser({ noiseMode: true }), [
		Bytes.from([0x00, 0x07, 0x00, 0x05, 0x01, 0x02]),
	]);
	await expect(promise).rejects.toMatchObject({
		code: ZWaveErrorCodes.PacketFormat_Invalid,
	});
});
