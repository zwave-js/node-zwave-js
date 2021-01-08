import { Transform, TransformCallback } from "stream";
import type { SerialLogger } from "./Logger";
import { MessageHeaders } from "./MessageHeaders";

/**
 * Checks if there's enough data in the buffer to deserialize a complete message
 */
function containsCompleteMessage(data?: Buffer): boolean {
	return !!data && data.length >= 5 && data.length >= getMessageLength(data);
}

/** Given a buffer that starts with SOF, this method returns the number of bytes the first message occupies in the buffer */
function getMessageLength(data: Buffer): number {
	const remainingLength = data[1];
	return remainingLength + 2;
}

export class SerialAPIParser extends Transform {
	constructor(private logger: SerialLogger) {
		// We read byte streams but emit messages
		super({ readableObjectMode: true });
	}

	private receiveBuffer = Buffer.allocUnsafe(0);

	_transform(
		chunk: any,
		encoding: string,
		callback: TransformCallback,
	): void {
		this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);

		while (this.receiveBuffer.length > 0) {
			if (this.receiveBuffer[0] !== MessageHeaders.SOF) {
				switch (this.receiveBuffer[0]) {
					// Emit the single-byte messages directly
					case MessageHeaders.ACK: {
						this.logger.ACK("inbound");
						this.push(MessageHeaders.ACK);
						break;
					}
					case MessageHeaders.NAK: {
						this.logger.NAK("inbound");
						this.push(MessageHeaders.NAK);
						break;
					}
					case MessageHeaders.CAN: {
						this.logger.CAN("inbound");
						this.push(MessageHeaders.CAN);
						break;
					}
					default: {
						// INS12350: A host or a Z-Wave chip waiting for new traffic MUST ignore all other
						// byte values than 0x06 (ACK), 0x15 (NAK), 0x18 (CAN) or 0x01 (Data frame).
						// Just skip this byte
					}
				}
				// Continue with the next byte
				this.receiveBuffer = skipBytes(this.receiveBuffer, 1);
				continue;
			}

			if (!containsCompleteMessage(this.receiveBuffer)) {
				// The buffer contains no complete message, we're done here for now
				break;
			} else {
				// We have at least one complete message
				const msgLength = getMessageLength(this.receiveBuffer);
				// emit it and slice the read bytes from the buffer
				const msg = this.receiveBuffer.slice(0, msgLength);
				this.receiveBuffer = skipBytes(this.receiveBuffer, msgLength);

				this.logger.data("inbound", msg);
				this.push(msg);
			}
		}
		callback();
	}
}

/** Skips the first n bytes of a buffer and returns the rest */
export function skipBytes(buf: Buffer, n: number): Buffer {
	return Buffer.from(buf.slice(n));
}
