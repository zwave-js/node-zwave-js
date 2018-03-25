import { ZWaveError, ZWaveErrorCodes } from "../zwave-error";
import { Frame } from "./frame";

/** Has to be present at the start of every data frame */
export const START_OF_FRAME = 0x01;

/** Indicates the type of a data frame */
export const enum DataFrameType {
	Request = 0x0,
	Response = 0x1,
}

/** Represents a frame with a payload */
export class DataFrame implements Frame {

	public type: DataFrameType;
	public payload: Buffer;   // TODO: Length limit 255
	public commandId: number; // TODO: create an enum for this

	public serialize(): Buffer {
		const payloadLength = this.payload != null ? this.payload.length : 0;

		const ret = Buffer.allocUnsafe(payloadLength + 5);
		ret[0] = START_OF_FRAME;
		// length of the following data, including the checksum
		ret[1] = payloadLength + 3;
		ret[2] = this.type;
		ret[3] = this.commandId;
		if (this.payload != null) this.payload.copy(ret, 4);
		ret[ret.length - 1] = computeChecksum(ret);
		return ret;
	}

	public deserialize(data: Buffer): number {
		// SOF, length, type, commandId and checksum must be present
		if (!data || !data.length || data.length < 5) {
			throw new ZWaveError(
				"Could not deserialize the data frame because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// the packet has to start with START_OF_FRAME
		if (data[0] !== START_OF_FRAME) {
			throw new ZWaveError(
				"Could not deserialize the data frame because it does not start with SOF",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		// check the lenght again, this time with the transmitted length
		const remainingLength = data[1];
		const frameLength = remainingLength + 2;
		if (data.length < frameLength) {
			throw new ZWaveError(
				"Could not deserialize the data frame because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// check the checksum
		const expectedChecksum = computeChecksum(data.slice(0, frameLength));
		if (data[frameLength - 1] !== expectedChecksum) {
			throw new ZWaveError(
				"Could not deserialize the data frame because the checksum didn't match",
				ZWaveErrorCodes.PacketFormat_Checksum,
			);
		}

		this.type = data[2];
		this.commandId = data[3];
		const payloadLength = frameLength - 5;
		this.payload = data.slice(4, 4 + payloadLength);

		// return the total number of bytes in this frame
		return frameLength;
	}

}

function computeChecksum(frame: Buffer): number {
	let ret = 0xff;
	// exclude SOF and checksum byte from the computation
	for (let i = 1; i < frame.length - 1; i++) {
		ret ^= frame[i];
	}
	return ret;
}
