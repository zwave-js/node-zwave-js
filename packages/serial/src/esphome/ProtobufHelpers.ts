import { validatePayload } from "@zwave-js/core";
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
 * Decodes a VarInt according to the Protocol Buffers specification
 * Returns the decoded value and the number of bytes consumed
 */
export function decodeVarInt(
	data: BytesView,
	offset: number = 0,
): { value: number; bytesRead: number } {
	let value = 0;
	let shift = 0;
	let bytesRead = 0;

	while (offset + bytesRead < data.length) {
		const byte = data[offset + bytesRead];
		bytesRead++;

		value |= (byte & 0x7f) << shift;
		if ((byte & 0x80) === 0) {
			return { value, bytesRead };
		}

		shift += 7;
		if (shift >= 35) {
			validatePayload.fail("VarInt too long");
		}
	}

	validatePayload.fail("Incomplete VarInt");
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
	validatePayload(offset >= 0, data.length >= offset + 4);
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
			const varint = decodeVarInt(data, offset);
			return offset + varint.bytesRead;
		case WireType.Fixed64:
			return offset + 8;
		case WireType.LengthDelimited:
			const length = decodeVarInt(data, offset);
			return offset + length.bytesRead + length.value;
		case WireType.Fixed32:
			return offset + 4;
		default:
			validatePayload.fail(`Unsupported wire type: ${wireType}`);
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

	while (pos < data.length) {
		const tag = decodeTag(data, pos);
		pos += tag.bytesRead;
		pos = fieldHandler(tag.fieldNumber, tag.wireType, data, pos);
	}
}
