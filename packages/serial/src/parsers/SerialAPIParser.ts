import { Bytes, num2hex } from "@zwave-js/shared";
import { type Transformer } from "node:stream/web";
import type { SerialLogger } from "../log/Logger.js";
import { MessageHeaders } from "../message/MessageHeaders.js";
import {
	type SerialAPIChunk,
	type ZWaveSerialFrame,
	ZWaveSerialFrameType,
} from "./ZWaveSerialFrame.js";

/**
 * Checks if there's enough data in the buffer to deserialize a complete message
 */
function containsCompleteMessage(data?: Uint8Array): boolean {
	return !!data && data.length >= 5 && data.length >= getMessageLength(data);
}

/** Given a buffer that starts with SOF, this method returns the number of bytes the first message occupies in the buffer */
function getMessageLength(data: Uint8Array): number {
	const remainingLength = data[1];
	return remainingLength + 2;
}

type SerialAPIParserTransformerOutput = ZWaveSerialFrame & {
	type:
		| ZWaveSerialFrameType.SerialAPI
		| ZWaveSerialFrameType.Discarded;
};

function wrapSerialAPIChunk(
	chunk: SerialAPIChunk,
): SerialAPIParserTransformerOutput {
	return {
		type: ZWaveSerialFrameType.SerialAPI,
		data: chunk,
	};
}

class SerialAPIParserTransformer implements
	Transformer<
		Uint8Array,
		SerialAPIParserTransformerOutput
	>
{
	constructor(private logger?: SerialLogger) {}

	private receiveBuffer = new Bytes();

	// Allow ignoring the high nibble of an ACK once to work around an issue in the 700 series firmware
	public ignoreAckHighNibble: boolean = false;

	transform(
		chunk: Uint8Array,
		controller: TransformStreamDefaultController<
			SerialAPIParserTransformerOutput
		>,
	) {
		this.receiveBuffer = Bytes.concat([this.receiveBuffer, chunk]);

		while (this.receiveBuffer.length > 0) {
			if (this.receiveBuffer[0] !== MessageHeaders.SOF) {
				let skip = 1;

				switch (this.receiveBuffer[0]) {
					// Emit the single-byte messages directly
					case MessageHeaders.ACK: {
						this.logger?.ACK("inbound");
						controller.enqueue(
							wrapSerialAPIChunk(MessageHeaders.ACK),
						);
						this.ignoreAckHighNibble = false;
						break;
					}
					case MessageHeaders.NAK: {
						this.logger?.NAK("inbound");
						controller.enqueue(
							wrapSerialAPIChunk(MessageHeaders.NAK),
						);
						break;
					}
					case MessageHeaders.CAN: {
						this.logger?.CAN("inbound");
						controller.enqueue(
							wrapSerialAPIChunk(MessageHeaders.CAN),
						);
						break;
					}
					default: {
						// INS12350: A host or a Z-Wave chip waiting for new traffic MUST ignore all other
						// byte values than 0x06 (ACK), 0x15 (NAK), 0x18 (CAN) or 0x01 (Data frame).

						// Work around a bug in the 700 series firmware that causes the high nibble of an ACK
						// to be corrupted after a soft reset
						if (
							this.ignoreAckHighNibble
							&& (this.receiveBuffer[0] & 0x0f)
								=== MessageHeaders.ACK
						) {
							this.logger?.message(
								`received corrupted ACK: ${
									num2hex(this.receiveBuffer[0])
								}`,
							);
							this.logger?.ACK("inbound");
							controller.enqueue(
								wrapSerialAPIChunk(MessageHeaders.ACK),
							);
							this.ignoreAckHighNibble = false;
							break;
						}

						// Scan ahead until the next valid byte and log the invalid bytes
						while (skip < this.receiveBuffer.length) {
							const byte = this.receiveBuffer[skip];
							if (
								byte === MessageHeaders.SOF
								|| byte === MessageHeaders.ACK
								|| byte === MessageHeaders.NAK
								|| byte === MessageHeaders.CAN
							) {
								// Next byte is valid, keep it
								break;
							}
							skip++;
						}
						const discarded = this.receiveBuffer.subarray(0, skip);
						this.logger?.discarded(discarded);
						controller.enqueue({
							type: ZWaveSerialFrameType.Discarded,
							data: discarded,
						});
					}
				}
				// Continue with the next valid byte
				this.receiveBuffer = this.receiveBuffer.subarray(skip);
				continue;
			}

			if (!containsCompleteMessage(this.receiveBuffer)) {
				// The buffer contains no complete message, we're done here for now
				break;
			} else {
				// We have at least one complete message
				const msgLength = getMessageLength(this.receiveBuffer);
				// emit it and slice the read bytes from the buffer
				const msg = this.receiveBuffer.subarray(0, msgLength);
				this.receiveBuffer = this.receiveBuffer.subarray(msgLength);

				this.logger?.data("inbound", msg);
				controller.enqueue(wrapSerialAPIChunk(msg));
			}
		}
	}
}
export class SerialAPIParser extends TransformStream {
	constructor(
		logger?: SerialLogger,
	) {
		const transformer = new SerialAPIParserTransformer(logger);
		super(transformer);
		this.#transformer = transformer;
	}

	#transformer: SerialAPIParserTransformer;

	public get ignoreAckHighNibble(): boolean {
		return this.#transformer.ignoreAckHighNibble;
	}
	public set ignoreAckHighNibble(value: boolean) {
		this.#transformer.ignoreAckHighNibble = value;
	}
}
