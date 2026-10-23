import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

export enum AttachmentTypes {
	NetworkKeys = 0x03,
	FrameComment = 0x04,
	Session = 0x05,
}

export type ZLFAttachmentConstructor<T extends ZLFAttachment> =
	typeof ZLFAttachment & {
		new (options: ZLFAttachmentOptions): T;
	};

export interface ZLFAttachmentBaseOptions {
	// Intentionally empty
}

export interface ZLFAttachmentOptions extends ZLFAttachmentBaseOptions {
	type: AttachmentTypes;
	version: number;
	data?: Bytes;
}

export class ZLFAttachmentRaw {
	public constructor(
		public readonly type: AttachmentTypes,
		public readonly version: number,
		public readonly data: Bytes,
	) {}

	public static parse(buffer: BytesView): {
		raw: ZLFAttachmentRaw;
		bytesRead: number;
	} {
		if (buffer.length < 2) {
			throw new ZWaveError(
				"Incomplete ZLF attachment",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		const type = buffer[0] as AttachmentTypes;
		const version = buffer[1];

		// The remaining bytes are the data
		const data = Bytes.view(buffer.subarray(2));

		return {
			raw: new ZLFAttachmentRaw(type, version, data),
			bytesRead: buffer.length,
		};
	}

	public withData(data: Bytes): ZLFAttachmentRaw {
		return new ZLFAttachmentRaw(this.type, this.version, data);
	}
}

/**
 * Retrieves the correct constructor for the attachment based on its type.
 */
function getZLFAttachmentConstructor(
	raw: ZLFAttachmentRaw,
): ZLFAttachmentConstructor<ZLFAttachment> {
	switch (raw.type) {
		case AttachmentTypes.NetworkKeys:
			return ZLFNetworkKeysAttachment as any;
		case AttachmentTypes.FrameComment:
			return ZLFFrameCommentAttachment as any;
		case AttachmentTypes.Session:
			return ZLFSessionAttachment as any;
		default:
			return ZLFAttachment;
	}
}

/**
 * Represents a ZLF attachment for parsing data from a Zniffer trace
 */
export class ZLFAttachment {
	public constructor(options: ZLFAttachmentOptions) {
		this.type = options.type;
		this.version = options.version;
		this.data = options.data || new Bytes();
	}

	public static parse(buffer: BytesView): {
		attachment: ZLFAttachment;
		bytesRead: number;
	} {
		const { raw, bytesRead } = ZLFAttachmentRaw.parse(buffer);
		const Constructor = getZLFAttachmentConstructor(raw);
		return {
			attachment: Constructor.from(raw),
			bytesRead,
		};
	}

	/** Creates an instance of the attachment that is serialized in the given buffer */
	public static from(raw: ZLFAttachmentRaw): ZLFAttachment {
		return new this({
			type: raw.type,
			version: raw.version,
			data: raw.data,
		});
	}

	public type: AttachmentTypes;
	public version: number;
	public data: Bytes;

	/** Serializes this attachment into a Buffer */
	public serialize(): Bytes {
		return Bytes.concat([[this.type, this.version], this.data]);
	}
}

export interface ZLFNetworkKeysAttachmentOptions extends ZLFAttachmentBaseOptions {
	homeId: number;
	keys: BytesView[];
	tempKeys: BytesView[];
}

export class ZLFNetworkKeysAttachment extends ZLFAttachment {
	public constructor(options: ZLFNetworkKeysAttachmentOptions) {
		super({
			type: AttachmentTypes.NetworkKeys,
			version: 1,
		});

		this.homeId = options.homeId;
		this.keys = options.keys.map((key) => Bytes.from(key));
		this.tempKeys = options.tempKeys.map((key) => Bytes.from(key));
	}

	public static from(raw: ZLFAttachmentRaw): ZLFNetworkKeysAttachment {
		// This attachment consists of at least 2x4 home ID bytes,
		// 2x1 byte count and 2x1 byte flags, plus 16 bytes per key
		if (raw.data.length < 12) {
			throw new ZWaveError(
				"Incomplete NetworkKeysAttachment",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		// Home ID seems to not be populated by the Zniffer software,
		// but we'll parse it anyways
		const homeId = raw.data.readUInt32BE(0);
		let offset = 4;

		const tempKeys: Bytes[] = [];
		const keys: Bytes[] = [];

		// Read first set of keys
		let count = raw.data[offset++];
		let isTemporary = !!(raw.data[offset++] & 0x01);

		if (offset + count * 16 + 6 >= raw.data.length) {
			throw new ZWaveError(
				"Incomplete NetworkKeysAttachment",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		for (let i = 0; i < count; i++) {
			const key = raw.data.subarray(offset, offset + 16);
			offset += 16;
			if (isTemporary) {
				tempKeys.push(key);
			} else {
				keys.push(key);
			}
		}

		// Read second set of keys
		// Skip homeID bytes
		offset += 4;
		count = raw.data[offset++];
		isTemporary = !!(raw.data[offset++] & 0x01);

		if (offset + count * 16 > raw.data.length) {
			throw new ZWaveError(
				"Incomplete NetworkKeysAttachment",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		for (let i = 0; i < count; i++) {
			const key = raw.data.subarray(offset, offset + 16);
			offset += 16;
			if (isTemporary) {
				tempKeys.push(key);
			} else {
				keys.push(key);
			}
		}

		return new ZLFNetworkKeysAttachment({
			homeId,
			keys,
			tempKeys,
		});
	}

	public readonly homeId: number;
	public readonly keys: Bytes[];
	public readonly tempKeys: Bytes[];
}

export interface ZLFFrameCommentAttachmentOptions extends ZLFAttachmentBaseOptions {
	comment: string;
	version?: number;
	data?: Bytes;
	// Additional fields will be added when implementing
}

export class ZLFFrameCommentAttachment extends ZLFAttachment {
	public constructor(options: ZLFFrameCommentAttachmentOptions) {
		super({
			type: AttachmentTypes.FrameComment,
			version: options.version || 1,
			data: options.data,
		});

		this.comment = options.comment;
	}

	public static from(_raw: ZLFAttachmentRaw): ZLFFrameCommentAttachment {
		// TODO: Implement parsing logic
		throw new ZWaveError(
			"ZLFFrameCommentAttachment parsing not yet implemented",
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);
	}

	public readonly comment: string;
}

export interface ZLFSessionAttachmentOptions extends ZLFAttachmentBaseOptions {
	sessionId: number;
	version?: number;
	data?: Bytes;
	// Additional fields will be added when implementing
}

export class ZLFSessionAttachment extends ZLFAttachment {
	public constructor(options: ZLFSessionAttachmentOptions) {
		super({
			type: AttachmentTypes.Session,
			version: options.version || 1,
			data: options.data,
		});

		this.sessionId = options.sessionId;
	}

	public static from(_raw: ZLFAttachmentRaw): ZLFSessionAttachment {
		// TODO: Implement parsing logic
		throw new ZWaveError(
			"ZLFSessionAttachment parsing not yet implemented",
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);
	}

	public readonly sessionId: number;
}
