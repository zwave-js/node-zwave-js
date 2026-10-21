import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

/**
 * Protobuf wire types
 */
export const enum WireType {
	Varint = 0,
	Fixed64 = 1,
	LengthDelimited = 2,
	StartGroup = 3, // Deprecated
	EndGroup = 4, // Deprecated
	Fixed32 = 5,
}

/**
 * Helper functions for protobuf wire format encoding/decoding
 */

/**
 * Encodes a protobuf field tag (field number and wire type)
 */
export function encodeTag(fieldNumber: number, wireType: WireType): BytesView {
	return encodeVarInt((fieldNumber << 3) | wireType);
}

/**
 * Decodes a protobuf field tag
 */
export function decodeTag(
	data: BytesView,
	offset: number = 0,
): { fieldNumber: number; wireType: WireType; bytesRead: number } {
	const tag = decodeVarInt(data, offset);
	const fieldNumber = tag.value >>> 3;
	const wireType = tag.value & 0x7;
	return {
		fieldNumber,
		wireType: wireType as WireType,
		bytesRead: tag.bytesRead,
	};
}

/**
 * Encodes a VarInt according to the Protocol Buffers specification
 */
export function encodeVarInt(value: number): BytesView {
	const bytes: number[] = [];
	while (value >= 0x80) {
		bytes.push((value & 0x7f) | 0x80);
		value >>>= 7;
	}
	bytes.push(value & 0x7f);
	return new Uint8Array(bytes);
}

/**
 * Decodes an unsigned 32-bit VarInt according to the Protocol Buffers specification
 * Returns the decoded value and the number of bytes consumed
 */
export function decodeVarInt(
	data: BytesView,
	offset: number = 0,
): { value: number; bytesRead: number } {
	let value = 0;
	let bytesRead = 0;

	while (offset + bytesRead < data.length) {
		const byte = data[offset + bytesRead];
		// Multiplication instead of bit shifts keeps the value unsigned
		value += (byte & 0x7f) * 2 ** (7 * bytesRead);
		bytesRead++;

		if ((byte & 0x80) === 0) {
			if (value > 0xffff_ffff) {
				throw new ZWaveError(
					"VarInt exceeds 32 bits",
					ZWaveErrorCodes.PacketFormat_Invalid,
				);
			}
			return { value, bytesRead };
		}

		if (bytesRead >= 5) {
			throw new ZWaveError(
				"VarInt too long",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
	}

	throw new ZWaveError(
		"Incomplete VarInt",
		ZWaveErrorCodes.PacketFormat_Truncated,
	);
}

/**
 * Returns the number of bytes occupied by a VarInt of up to 64 bits, without decoding it
 */
function skipVarInt(data: BytesView, offset: number): number {
	// 64-bit VarInts occupy at most 10 bytes
	for (let i = 0; i < 10; i++) {
		if (offset + i >= data.length) {
			throw new ZWaveError(
				"Incomplete VarInt",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		if ((data[offset + i] & 0x80) === 0) return i + 1;
	}
	throw new ZWaveError(
		"VarInt too long",
		ZWaveErrorCodes.PacketFormat_Invalid,
	);
}

/**
 * Ensures that `length` bytes starting at `offset` are contained in `data`
 */
function assertInBounds(data: BytesView, offset: number, length: number): void {
	if (offset + length > data.length) {
		throw new ZWaveError(
			"Field exceeds the message length",
			ZWaveErrorCodes.PacketFormat_Invalid,
		);
	}
}

/**
 * Encodes a string field
 */
export function encodeStringField(
	fieldNumber: number,
	value: string | BytesView,
): BytesView {
	const stringBytes =
		typeof value === "string" ? new TextEncoder().encode(value) : value;
	const tag = encodeTag(fieldNumber, WireType.LengthDelimited);
	const length = encodeVarInt(stringBytes.length);
	return Bytes.concat([tag, length, stringBytes]);
}

/**
 * Decodes a string field at the current position
 */
export function decodeStringField(
	data: BytesView,
	offset: number,
): { value: string; bytesRead: number } {
	const length = decodeVarInt(data, offset);
	assertInBounds(data, offset + length.bytesRead, length.value);
	const stringBytes = data.slice(
		offset + length.bytesRead,
		offset + length.bytesRead + length.value,
	);
	return {
		value: new TextDecoder().decode(stringBytes),
		bytesRead: length.bytesRead + length.value,
	};
}

/**
 * Encodes a varint field (uint32, int32, bool, enum)
 */
export function encodeVarintField(
	fieldNumber: number,
	value: number,
): BytesView {
	const tag = encodeTag(fieldNumber, WireType.Varint);
	const varint = encodeVarInt(value);
	return Bytes.concat([tag, varint]);
}

/**
 * Encodes a boolean field
 */
export function encodeBoolField(
	fieldNumber: number,
	value: boolean,
): BytesView {
	return encodeVarintField(fieldNumber, value ? 1 : 0);
}

/**
 * Encodes a fixed32 field
 */
export function encodeFixed32Field(
	fieldNumber: number,
	value: number,
): BytesView {
	const tag = encodeTag(fieldNumber, WireType.Fixed32);
	const valueBytes = new Uint8Array(4);
	valueBytes[0] = value & 0xff;
	valueBytes[1] = (value >>> 8) & 0xff;
	valueBytes[2] = (value >>> 16) & 0xff;
	valueBytes[3] = (value >>> 24) & 0xff;
	return Bytes.concat([tag, valueBytes]);
}

/**
 * Decodes a fixed32 field at the current position
 */
export function decodeFixed32Field(
	data: BytesView,
	offset: number,
): { value: number; bytesRead: number } {
	assertInBounds(data, offset, 4);
	const value = Bytes.view(data).readUInt32LE(offset);
	return { value, bytesRead: 4 };
}

/**
 * Encodes a length-delimited field (for nested messages)
 */
export function encodeLengthDelimitedField(
	fieldNumber: number,
	value: BytesView,
): BytesView {
	const tag = encodeTag(fieldNumber, WireType.LengthDelimited);
	const length = encodeVarInt(value.length);
	return Bytes.concat([tag, length, value]);
}

/**
 * Decodes a length-delimited field at the current position
 */
export function decodeLengthDelimitedField(
	data: BytesView,
	offset: number,
): { value: BytesView; bytesRead: number } {
	const length = decodeVarInt(data, offset);
	assertInBounds(data, offset + length.bytesRead, length.value);
	const valueBytes = data.slice(
		offset + length.bytesRead,
		offset + length.bytesRead + length.value,
	);
	return {
		value: valueBytes,
		bytesRead: length.bytesRead + length.value,
	};
}

/**
 * Encodes a signed integer using zigzag encoding
 */
export function encodeSignedVarint(value: number): BytesView {
	const zigzag = (value << 1) ^ (value >> 31);
	return encodeVarInt(zigzag);
}

/**
 * Decodes a signed integer using zigzag encoding
 */
export function decodeSignedVarint(
	data: BytesView,
	offset: number = 0,
): { value: number; bytesRead: number } {
	const decoded = decodeVarInt(data, offset);
	const value = (decoded.value >>> 1) ^ -(decoded.value & 1);
	return { value, bytesRead: decoded.bytesRead };
}

/**
 * Encodes a signed varint field
 */
export function encodeSignedVarintField(
	fieldNumber: number,
	value: number,
): BytesView {
	const tag = encodeTag(fieldNumber, WireType.Varint);
	const varint = encodeSignedVarint(value);
	return Bytes.concat([tag, varint]);
}

/**
 * Skips an unknown field based on its wire type
 */
export function skipField(
	data: BytesView,
	offset: number,
	wireType: WireType,
): number {
	switch (wireType) {
		case WireType.Varint:
			// Unknown fields may contain 64-bit values, which we don't need to decode
			return offset + skipVarInt(data, offset);
		case WireType.Fixed64:
			assertInBounds(data, offset, 8);
			return offset + 8;
		case WireType.LengthDelimited:
			const length = decodeVarInt(data, offset);
			assertInBounds(data, offset + length.bytesRead, length.value);
			return offset + length.bytesRead + length.value;
		case WireType.Fixed32:
			assertInBounds(data, offset, 4);
			return offset + 4;
		default:
			throw new ZWaveError(
				`Unsupported wire type: ${wireType}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
	}
}

/**
 * Parses a protobuf message and calls a field handler for each field
 */
export function parseProtobufMessage(
	data: BytesView,
	fieldHandler: (
		fieldNumber: number,
		wireType: WireType,
		data: BytesView,
		offset: number,
	) => number,
): void {
	let pos = 0;

	try {
		while (pos < data.length) {
			const tag = decodeTag(data, pos);
			pos += tag.bytesRead;
			const nextPos = fieldHandler(
				tag.fieldNumber,
				tag.wireType,
				data,
				pos,
			);
			// Guard against field handlers that would make the loop run forever
			if (nextPos < pos || nextPos > data.length) {
				throw new ZWaveError(
					"Invalid protobuf field length",
					ZWaveErrorCodes.PacketFormat_Invalid,
				);
			}
			pos = nextPos;
		}
	} catch (e) {
		// The message payload is complete, so waiting for more data cannot fix a truncated field
		if (
			e instanceof ZWaveError
			&& e.code === ZWaveErrorCodes.PacketFormat_Truncated
		) {
			throw new ZWaveError(
				`Invalid protobuf message: ${e.message}`,
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		throw e;
	}
}
