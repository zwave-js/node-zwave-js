import type { Transformer } from "node:stream/web";

import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

import { ESPHomeMessage, ESPHomeMessageRaw } from "../ESPHomeMessage.js";

export interface ESPHomeMessageParserOptions {
	/**
	 * When true, parse Noise-decrypted data format: [2-byte BE type][2-byte BE len][payload]
	 * When false (default), parse plaintext frame format: [0x00][VarInt...][payload]
	 */
	noiseMode?: boolean;
}

class ESPHomeMessageParserTransformer implements Transformer<
	BytesView,
	ESPHomeMessage
> {
	private receiveBuffer = new Bytes();
	private noiseMode: boolean;

	constructor(options: ESPHomeMessageParserOptions = {}) {
		this.noiseMode = options.noiseMode ?? false;
	}

	transform(
		chunk: BytesView,
		controller: TransformStreamDefaultController<ESPHomeMessage>,
	) {
		this.receiveBuffer = Bytes.concat([this.receiveBuffer, chunk]);

		while (this.receiveBuffer.length > 0) {
			let raw: ESPHomeMessageRaw;
			let bytesRead: number;
			try {
				({ message: raw, bytesRead } = this.noiseMode
					? ESPHomeMessageRaw.parseFromNoise(this.receiveBuffer)
					: ESPHomeMessageRaw.parse(this.receiveBuffer));
			} catch (error) {
				// If we can't decode a complete frame yet, wait for more data
				if (
					error instanceof ZWaveError
					&& error.code === ZWaveErrorCodes.PacketFormat_Truncated
				) {
					return;
				}
				// Without valid framing, the start of the next frame cannot be located
				controller.error(error);
				return;
			}
			this.receiveBuffer = this.receiveBuffer.subarray(bytesRead);

			let message: ESPHomeMessage;
			try {
				message = ESPHomeMessage.fromRaw(raw);
			} catch {
				// The frame boundaries are known, so only this message is lost
				continue;
			}
			controller.enqueue(message);
		}
	}
}

/**
 * Transform stream that parses ESPHome messages.
 * Input: Raw BytesView chunks (plaintext) or decrypted data (noise mode)
 * Output: ESPHomeMessage instances
 *
 * Supports two modes:
 * - Plaintext (default): Parses frames with format [0x00][VarInt size][VarInt type][payload]
 * - Noise mode: Parses decrypted data with format [2-byte BE type][2-byte BE len][payload]
 */
export class ESPHomeMessageParser extends TransformStream<
	BytesView,
	ESPHomeMessage
> {
	constructor(options: ESPHomeMessageParserOptions = {}) {
		super(new ESPHomeMessageParserTransformer(options));
	}
}
