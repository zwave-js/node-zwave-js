import { Transform, type TransformCallback } from "node:stream";
import type { SerialLogger } from "../Logger";
import { ZnifferMessageHeaders } from "../MessageHeaders";

/** Given a buffer that starts with SOF, this method returns the number of bytes the first message occupies in the buffer */
function getMessageLength(data: Buffer): number | undefined {
	if (!data || data.length === 0) return;
	if (data[0] === ZnifferMessageHeaders.SOCF) {
		// Control frame: SOF, CMD, remaining length
		if (data.length < 3) return;
		const length = data[2];
		return length + 3;
	} else if (data[0] === ZnifferMessageHeaders.SODF) {
		// Data frame: SOF, 8 other bytes, remaining length
		if (data.length < 10) return;
		const length = data[9];
		return length + 10;
	}
}

export class ZnifferParser extends Transform {
	constructor(
		private logger?: SerialLogger,
		private onDiscarded?: (data: Buffer) => void,
	) {
		// We read byte streams but emit messages
		super({ readableObjectMode: true });
	}

	private receiveBuffer = Buffer.allocUnsafe(0);

	// Allow ignoring the high nibble of an ACK once to work around an issue in the 700 series firmware
	public ignoreAckHighNibble: boolean = false;

	_transform(
		chunk: any,
		encoding: string,
		callback: TransformCallback,
	): void {
		this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);

		while (this.receiveBuffer.length > 0) {
			// Scan ahead until the next valid byte and log the invalid bytes, if any

			let skip = 0;
			while (
				skip < this.receiveBuffer.length
				&& this.receiveBuffer[skip] !== ZnifferMessageHeaders.SOCF
				&& this.receiveBuffer[skip] !== ZnifferMessageHeaders.SODF
			) {
				skip++;
			}
			if (skip > 0) {
				const discarded = this.receiveBuffer.subarray(0, skip);
				this.logger?.discarded(discarded);
				this.onDiscarded?.(discarded);

				// Continue with the next valid byte
				this.receiveBuffer = skipBytes(this.receiveBuffer, skip);
				continue;
			}

			const msgLength = getMessageLength(this.receiveBuffer);

			if (
				msgLength == undefined || this.receiveBuffer.length < msgLength
			) {
				// The buffer contains no complete message, we're done here for now
				break;
			} else {
				// We have at least one complete message.
				// emit it and slice the read bytes from the buffer
				const msg = this.receiveBuffer.subarray(0, msgLength);
				this.receiveBuffer = skipBytes(this.receiveBuffer, msgLength);

				this.logger?.data("inbound", msg);
				this.push(msg);
			}
		}
		callback();
	}
}

/** Skips the first n bytes of a buffer and returns the rest */
export function skipBytes(buf: Buffer, n: number): Buffer {
	return Buffer.from(buf.subarray(n));
}
