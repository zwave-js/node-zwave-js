import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import { expect, test } from "vitest";

import {
	decodeLengthDelimitedField,
	decodeStringField,
	decodeVarInt,
	parseProtobufMessage,
	WireType,
	skipField,
} from "./ProtobufHelpers.js";

test("decodeVarInt decodes the maximum unsigned 32-bit value", () => {
	const data = Bytes.from([0xff, 0xff, 0xff, 0xff, 0x0f]);
	expect(decodeVarInt(data)).toStrictEqual({
		value: 0xffff_ffff,
		bytesRead: 5,
	});
});

test("decodeVarInt reports incomplete VarInts as truncated", () => {
	for (const bytes of [[], [0x80], [0xff, 0xff, 0xff, 0xff]]) {
		assertZWaveError(expect, () => decodeVarInt(Bytes.from(bytes)), {
			errorCode: ZWaveErrorCodes.PacketFormat_Truncated,
		});
	}
});

test("decodeVarInt rejects VarInts that exceed 32 bits", () => {
	// Fits in 5 bytes, but the value is larger than 32 bits
	assertZWaveError(
		expect,
		() => decodeVarInt(Bytes.from([0xff, 0xff, 0xff, 0xff, 0x1f])),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Invalid },
	);
	// Too many continuation bytes
	assertZWaveError(
		expect,
		() => decodeVarInt(Bytes.from([0xff, 0xff, 0xff, 0xff, 0xff, 0x01])),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Invalid },
	);
});

test("length-delimited fields with a length beyond the message are rejected", () => {
	const fieldLength = Bytes.from([0xfa, 0xff, 0xff, 0xff, 0x0f]);
	assertZWaveError(expect, () => decodeStringField(fieldLength, 0), {
		errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
	});
	assertZWaveError(expect, () => decodeLengthDelimitedField(fieldLength, 0), {
		errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
	});
	assertZWaveError(
		expect,
		() => skipField(fieldLength, 0, WireType.LengthDelimited),
		{
			errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
		},
	);
});

test("parseProtobufMessage rejects an oversized field length instead of looping", () => {
	// Field 1, wire type 2 (length-delimited), followed by a huge length
	const data = Bytes.from([0x0a, 0xfa, 0xff, 0xff, 0xff, 0x0f]);
	assertZWaveError(
		expect,
		() =>
			parseProtobufMessage(data, (_field, wireType, buf, offset) =>
				skipField(buf, offset, wireType),
			),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Invalid },
	);
});

test("parseProtobufMessage reports truncated fields as invalid", () => {
	// Field 1, wire type 0 (varint), with an incomplete value
	const data = Bytes.from([0x08, 0x80]);
	assertZWaveError(
		expect,
		() =>
			parseProtobufMessage(data, (_field, wireType, buf, offset) =>
				skipField(buf, offset, wireType),
			),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Invalid },
	);
});
