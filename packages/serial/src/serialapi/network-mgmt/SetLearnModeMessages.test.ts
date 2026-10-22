import { Bytes } from "@zwave-js/shared";
import { test } from "vitest";
import {
	FunctionType,
	LearnModeIntent,
	LearnModeStatus,
	MessageOrigin,
	MessageType,
	SetLearnModeCallback,
	SetLearnModeRequest,
	SetLearnModeResponse,
} from "@zwave-js/serial";

const HEADER_SIZE = 4; // Size of message header to skip when deserializing

test("SetLearnModeRequest should serialize and deserialize correctly", async ({ expect }) => {
	const request = new SetLearnModeRequest({
		intent: LearnModeIntent.Inclusion,
		callbackId: 1,
	});

	const serialized = await request.serialize({
		homeId: 0x7e571000,
		ownNodeId: 1,
		nodeIdType: 0,
	});

	expect(serialized).toBeDefined();

	// Deserialize
	const deserialized = SetLearnModeRequest.from(
		{
			type: MessageType.Request,
			functionType: FunctionType.SetLearnMode,
			payload: serialized.subarray(HEADER_SIZE),
		},
		{
			homeId: 0x7e571000,
			ownNodeId: 1,
			nodeIdType: 0,
		},
	);

	expect(deserialized.intent).toBe(LearnModeIntent.Inclusion);
	expect(deserialized.callbackId).toBe(1);
});

test("SetLearnModeResponse should serialize and deserialize correctly", async ({ expect }) => {
	const response = new SetLearnModeResponse({
		success: true,
	});

	const serialized = await response.serialize({
		homeId: 0x7e571000,
		ownNodeId: 1,
		nodeIdType: 0,
	});

	expect(serialized).toBeDefined();

	// Deserialize
	const deserialized = SetLearnModeResponse.from(
		{
			type: MessageType.Response,
			functionType: FunctionType.SetLearnMode,
			payload: serialized.subarray(HEADER_SIZE),
		},
		{
			homeId: 0x7e571000,
			ownNodeId: 1,
			nodeIdType: 0,
		},
	);

	expect(deserialized.success).toBe(true);
	expect(deserialized.isOK()).toBe(true);
});

test("SetLearnModeCallback should serialize and deserialize correctly", async ({ expect }) => {
	const callback = new SetLearnModeCallback({
		callbackId: 1,
		status: LearnModeStatus.Completed,
		assignedNodeId: 2,
	});

	const serialized = await callback.serialize({
		homeId: 0x7e571000,
		ownNodeId: 1,
		nodeIdType: 0,
	});

	expect(serialized).toBeDefined();

	// Deserialize
	const deserialized = SetLearnModeCallback.from(
		{
			type: MessageType.Request,
			functionType: FunctionType.SetLearnMode,
			payload: serialized.subarray(HEADER_SIZE),
		},
		{
			homeId: 0x7e571000,
			ownNodeId: 1,
			nodeIdType: 0,
			origin: MessageOrigin.Controller,
		},
	);

	expect(deserialized.status).toBe(LearnModeStatus.Completed);
	expect(deserialized.assignedNodeId).toBe(2);
	expect(deserialized.callbackId).toBe(1);
	expect(deserialized.isOK()).toBe(true);
});

test("SetLearnModeCallback with status message should serialize and deserialize correctly", async ({ expect }) => {
	const statusMessage = Bytes.from([0x01, 0x02, 0x03, 0x04]);
	const callback = new SetLearnModeCallback({
		callbackId: 1,
		status: LearnModeStatus.Started,
		assignedNodeId: 0xef,
		statusMessage,
	});

	const serialized = await callback.serialize({
		homeId: 0x7e571000,
		ownNodeId: 1,
		nodeIdType: 0,
	});

	expect(serialized).toBeDefined();

	// Deserialize
	const deserialized = SetLearnModeCallback.from(
		{
			type: MessageType.Request,
			functionType: FunctionType.SetLearnMode,
			payload: serialized.subarray(HEADER_SIZE),
		},
		{
			homeId: 0x7e571000,
			ownNodeId: 1,
			nodeIdType: 0,
			origin: MessageOrigin.Controller,
		},
	);

	expect(deserialized.status).toBe(LearnModeStatus.Started);
	expect(deserialized.assignedNodeId).toBe(0xef);
	expect(deserialized.statusMessage).toEqual(statusMessage);
	expect(deserialized.isOK()).toBe(true);
});

