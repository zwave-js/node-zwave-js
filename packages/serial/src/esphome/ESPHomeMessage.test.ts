import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import { expect, test } from "vitest";

import { DeviceInfoRequest, DeviceInfoResponse } from "./DeviceInfoMessages.js";
import {
	ESPHomeMessage,
	ESPHomeMessageRaw,
	ESPHomeMessageType,
} from "./ESPHomeMessage.js";
import { HelloRequest, HelloResponse } from "./HelloMessages.js";
import { PingRequest, PingResponse } from "./PingMessages.js";
import { ZWaveProxyFrame } from "./ZWaveProxyMessages.js";

test("HelloRequest serialization and parsing", () => {
	const original = new HelloRequest({
		clientInfo: "Z-Wave JS",
		apiVersionMajor: 1,
		apiVersionMinor: 3,
	});

	const serialized = original.serialize();
	const { message: parsed } = ESPHomeMessage.parse(serialized);

	expect(parsed).toBeInstanceOf(HelloRequest);
	expect((parsed as HelloRequest).clientInfo).toBe("Z-Wave JS");
	expect((parsed as HelloRequest).apiVersionMajor).toBe(1);
	expect((parsed as HelloRequest).apiVersionMinor).toBe(3);
});

test("HelloResponse serialization and parsing", () => {
	const original = new HelloResponse({
		apiVersionMajor: 1,
		apiVersionMinor: 3,
		serverInfo: "ESPHome v2024.12.0",
		name: "zwave-gateway",
	});

	const serialized = original.serialize();
	const { message: parsed } = ESPHomeMessage.parse(serialized);

	expect(parsed).toBeInstanceOf(HelloResponse);
	expect((parsed as HelloResponse).apiVersionMajor).toBe(1);
	expect((parsed as HelloResponse).apiVersionMinor).toBe(3);
	expect((parsed as HelloResponse).serverInfo).toBe("ESPHome v2024.12.0");
	expect((parsed as HelloResponse).name).toBe("zwave-gateway");
});

test("Empty messages serialization and parsing", () => {
	// Test PingRequest
	const pingRequest = new PingRequest();
	const pingRequestSerialized = pingRequest.serialize();
	const { message: pingRequestParsed } = ESPHomeMessage.parse(
		pingRequestSerialized,
	);
	expect(pingRequestParsed).toBeInstanceOf(PingRequest);

	// Test PingResponse
	const pingResponse = new PingResponse();
	const pingResponseSerialized = pingResponse.serialize();
	const { message: pingResponseParsed } = ESPHomeMessage.parse(
		pingResponseSerialized,
	);
	expect(pingResponseParsed).toBeInstanceOf(PingResponse);
});

test("Message type detection", () => {
	const helloRequest = new HelloRequest({
		clientInfo: "test",
		apiVersionMajor: 1,
		apiVersionMinor: 0,
	});
	expect(helloRequest.messageType).toBe(ESPHomeMessageType.HelloRequest);

	const pingRequest = new PingRequest();
	expect(pingRequest.messageType).toBe(ESPHomeMessageType.PingRequest);
});

test("Unknown message type parsing", () => {
	// Create a frame with an unknown message type (999)
	const unknownMessageType = 999;
	const payload = new Uint8Array([0x01, 0x02, 0x03]); // Some test payload

	// Create a proper ESPHome message with unknown type by creating a base message and serializing it
	const unknownMessage = new ESPHomeMessage({
		messageType: unknownMessageType as any,
		payload: Bytes.from(payload),
	});

	const frame = unknownMessage.serialize();
	const { message: parsed } = ESPHomeMessage.parse(frame);

	// Should be base ESPHomeMessage class
	expect(parsed).toBeInstanceOf(ESPHomeMessage);
	expect(parsed.constructor).toBe(ESPHomeMessage);

	// Should have the correct unknown message type
	expect(parsed.messageType).toBe(unknownMessageType);

	// Should have the correct payload
	expect(parsed.payload).toEqual(Bytes.from(payload));
});

test("DeviceInfoRequest serialization and parsing", () => {
	const original = new DeviceInfoRequest();
	const serialized = original.serialize();
	const { message: parsed } = ESPHomeMessage.parse(serialized);

	expect(parsed).toBeInstanceOf(DeviceInfoRequest);
	expect(parsed.messageType).toBe(ESPHomeMessageType.DeviceInfoRequest);
});

test("DeviceInfoResponse serialization and parsing", () => {
	const original = new DeviceInfoResponse({
		name: "zwave-gateway",
		esphomeVersion: "2024.12.0",
		model: "ESP32",
		macAddress: "AA:BB:CC:DD:EE:FF",
		zwaveProxyFeatureFlags: 0x01,
		manufacturer: "Espressif",
		friendlyName: "Z-Wave Gateway",
	});

	const serialized = original.serialize();
	const parsed = ESPHomeMessage.parse(serialized)
		.message as DeviceInfoResponse;

	expect(parsed).toBeInstanceOf(DeviceInfoResponse);
	expect(parsed.messageType).toBe(ESPHomeMessageType.DeviceInfoResponse);
	expect(parsed.name).toBe("zwave-gateway");
	expect(parsed.esphomeVersion).toBe("2024.12.0");
	expect(parsed.model).toBe("ESP32");
	expect(parsed.macAddress).toBe("AA:BB:CC:DD:EE:FF");
	expect(parsed.zwaveProxyFeatureFlags).toBe(0x01);
	expect(parsed.manufacturer).toBe("Espressif");
	expect(parsed.friendlyName).toBe("Z-Wave Gateway");
	expect(parsed.hasZWaveProxySupport).toBe(true);
});

test("DeviceInfoResponse without Z-Wave support", () => {
	const original = new DeviceInfoResponse({
		name: "regular-device",
		esphomeVersion: "2024.12.0",
		model: "ESP32",
		zwaveProxyFeatureFlags: 0, // No Z-Wave support
	});

	const serialized = original.serialize();
	const parsed = ESPHomeMessage.parse(serialized)
		.message as DeviceInfoResponse;

	expect(parsed.hasZWaveProxySupport).toBe(false);
	expect(parsed.zwaveProxyFeatureFlags).toBe(0);
});

test("ZWaveProxyFrame serialization and parsing", () => {
	const testData = new Bytes(new TextEncoder().encode("Hello World"));
	const original = new ZWaveProxyFrame({
		data: testData,
	});

	const serialized = original.serialize();
	const parsed = ESPHomeMessage.parse(serialized).message as ZWaveProxyFrame;

	expect(parsed).toBeInstanceOf(ZWaveProxyFrame);
	expect(parsed.messageType).toBe(ESPHomeMessageType.ZWaveProxyFrame);
	expect(parsed.data).toEqual(testData);
});

test("DeviceInfoResponse with minimal fields", () => {
	const original = new DeviceInfoResponse({});

	const serialized = original.serialize();
	const parsed = ESPHomeMessage.parse(serialized)
		.message as DeviceInfoResponse;

	expect(parsed).toBeInstanceOf(DeviceInfoResponse);
	expect(parsed.name).toBe("");
	expect(parsed.esphomeVersion).toBe("");
	expect(parsed.zwaveProxyFeatureFlags).toBe(0);
	expect(parsed.hasZWaveProxySupport).toBe(false);
	expect(parsed.usesPassword).toBe(false);
	expect(parsed.hasDeepSleep).toBe(false);
	expect(parsed.apiEncryptionSupported).toBe(false);
});

test("DeviceInfoResponse with all boolean flags", () => {
	const original = new DeviceInfoResponse({
		usesPassword: true,
		hasDeepSleep: true,
		apiEncryptionSupported: true,
		zwaveProxyFeatureFlags: 0x0f,
	});

	const serialized = original.serialize();
	const parsed = ESPHomeMessage.parse(serialized)
		.message as DeviceInfoResponse;

	expect(parsed.usesPassword).toBe(true);
	expect(parsed.hasDeepSleep).toBe(true);
	expect(parsed.apiEncryptionSupported).toBe(true);
	expect(parsed.hasZWaveProxySupport).toBe(true);
});

test("Frames with an oversized payload size are rejected", () => {
	assertZWaveError(
		expect,
		() =>
			ESPHomeMessageRaw.parse(
				Bytes.from([0x00, 0xf9, 0xff, 0xff, 0xff, 0x0f, 0x02]),
			),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Invalid },
	);
});

test("Frames with a payload size of 65535 bytes are accepted", () => {
	const frame = new ESPHomeMessage({
		messageType: ESPHomeMessageType.PingRequest,
		payload: new Bytes(65535),
	}).serialize();
	const { message, bytesRead } = ESPHomeMessageRaw.parse(frame);
	expect(message.payload.length).toBe(65535);
	expect(bytesRead).toBe(frame.length);
});

test("Frames with a payload size of 65536 bytes are rejected", () => {
	const frame = new ESPHomeMessage({
		messageType: ESPHomeMessageType.PingRequest,
		payload: new Bytes(65536),
	}).serialize();
	assertZWaveError(expect, () => ESPHomeMessageRaw.parse(frame), {
		errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
	});
});

test("Frames with incomplete size or type VarInts are reported as truncated", () => {
	// Incomplete payload size
	assertZWaveError(
		expect,
		() => ESPHomeMessageRaw.parse(Bytes.from([0x00, 0x80, 0x80])),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Truncated },
	);
	// Incomplete message type
	assertZWaveError(
		expect,
		() => ESPHomeMessageRaw.parse(Bytes.from([0x00, 0x01, 0x80])),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Truncated },
	);
});

test("Noise messages whose length exceeds the decrypted frame are rejected", () => {
	// Type 7, length 5, but only 2 payload bytes
	assertZWaveError(
		expect,
		() =>
			ESPHomeMessageRaw.parseFromNoise(
				Bytes.from([0x00, 0x07, 0x00, 0x05, 0x01, 0x02]),
			),
		{ errorCode: ZWaveErrorCodes.PacketFormat_Invalid },
	);
});
