import { Bytes } from "@zwave-js/shared";
import { type Transformer } from "node:stream/web";
import type { SerialLogger } from "../log/Logger.js";
import { ZnifferFrameType } from "../message/Constants.js";
import { ZnifferMessageHeaders } from "../message/MessageHeaders.js";
import {
	type ZnifferSerialFrame,
	ZnifferSerialFrameType,
} from "./ZnifferSerialFrame.js";

/** Given a buffer that starts with SOF, this method returns the number of bytes the first message occupies in the buffer */
function getMessageLength(data: Uint8Array): number | undefined {
	if (!data || data.length === 0) return;
	if (data[0] === ZnifferMessageHeaders.SOCF) {
		// Control frame: SOF, CMD, remaining length
		if (data.length < 3) return;
		const length = data[2];
		return length + 3;
	} else if (data[0] === ZnifferMessageHeaders.SODF) {
		if (data.length < 2) return;
		if (data[1] === ZnifferFrameType.BeamStart) {
			// Beam Start frame: SOF, 0x04, 9 other bytes = total 11
			return 11;
		} else if (data[1] === ZnifferFrameType.BeamStop) {
			// Beam Stop frame: SOF, 0x05, 5 other bytes = total 7
			return 7;
		}
		// Data frame: SOF, 8 other bytes, remaining length
		if (data.length < 10) return;
		const length = data[9];
		return length + 10;
	}
}

class ZnifferParserTransformer
	implements Transformer<Uint8Array, ZnifferSerialFrame>
{
	constructor(
		private logger?: SerialLogger,
	) {}

	private receiveBuffer = new Bytes();

	// Allow ignoring the high nibble of an ACK once to work around an issue in the 700 series firmware
	public ignoreAckHighNibble: boolean = false;

	transform(
		chunk: Uint8Array,
		controller: TransformStreamDefaultController<ZnifferSerialFrame>,
	) {
		this.receiveBuffer = Bytes.concat([this.receiveBuffer, chunk]);

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
				controller.enqueue({
					type: ZnifferSerialFrameType.Discarded,
					data: discarded,
				});

				// Continue with the next valid byte
				this.receiveBuffer = this.receiveBuffer.subarray(skip);
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
				this.receiveBuffer = this.receiveBuffer.subarray(msgLength);

				this.logger?.data("inbound", msg);
				controller.enqueue({
					type: ZnifferSerialFrameType.SerialAPI,
					data: msg,
				});
			}
		}
	}
}

export class ZnifferParser
	extends TransformStream<Uint8Array, ZnifferSerialFrame>
{
	constructor(
		logger?: SerialLogger,
	) {
		super(new ZnifferParserTransformer(logger));
	}
}
