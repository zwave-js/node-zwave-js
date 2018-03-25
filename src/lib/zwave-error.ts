export enum ZWaveErrorCodes {
	PacketFormat_Truncated,
	PacketFormat_Invalid,
	PacketFormat_Checksum,
}

export class ZWaveError extends Error {
	constructor(
		public readonly message: string,
		public readonly code: ZWaveErrorCodes,
	) {
		super(message);

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ZWaveError.prototype);
	}
}
