import {
	CommandClass,
	ThermostatSetpointCommand,
	ThermostatSetpointType,
} from "@zwave-js/cc";
import { MultiChannelCCCommandEncapsulation } from "@zwave-js/cc/MultiChannelCC";
import {
	ThermostatSetpointCCCapabilitiesGet,
	ThermostatSetpointCCSet,
	ThermostatSetpointCCSupportedGet,
	ThermostatSetpointCCValues,
} from "@zwave-js/cc/ThermostatSetpointCC";
import {
	CommandClasses,
	SupervisionStatus,
	encodeFloatWithScale,
	parseFloatWithScale,
} from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import {
	SendDataBridgeRequest,
	SendDataMulticastBridgeRequest,
	SendDataMulticastRequest,
	SendDataRequest,
} from "@zwave-js/serial/serialapi";
import { Bytes } from "@zwave-js/shared";
import {
	type MockController,
	type MockNode,
	type MockNodeBehavior,
	MockZWaveFrameType,
	ccCaps,
	createMockZWaveRequestFrame,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { expect, vi } from "vitest";

import { integrationTest } from "../integrationTestSuite.js";
import { integrationTest as multiNodeTest } from "../integrationTestSuiteMulti.js";

const ccId = CommandClasses["Thermostat Setpoint"];
const observedId = ThermostatSetpointCCValues.observedFloatEncodings.id;
const caps = ccCaps({
	ccId,
	isSupported: true,
	version: 3,
	setpoints: {
		[ThermostatSetpointType.Heating]: {
			minValue: 0,
			maxValue: 100,
			scale: "°C",
		},
	},
});
const acceptSet: MockNodeBehavior = {
	handleCC: (_controller, _node, cc) => {
		if (cc instanceof ThermostatSetpointCCSet) return { action: "ok" };
	},
};

interface Encoding {
	precision: number;
	size: number;
	scale: number;
}

function float(encoding: Encoding, integer = 0): Bytes {
	const ret = new Bytes(encoding.size + 1);
	ret[0] = (encoding.precision << 5) | (encoding.scale << 3) | encoding.size;
	ret.writeIntBE(integer, 1, encoding.size);
	return ret;
}

async function sendReport(
	mockNode: MockNode,
	mockController: MockController,
	command: ThermostatSetpointCommand,
	payload: Bytes,
	endpoint = 0,
) {
	let cc = new CommandClass({
		nodeId: mockController.ownNodeId,
		ccId,
		ccCommand: command,
		payload,
	});
	if (endpoint) {
		cc = new MultiChannelCCCommandEncapsulation({
			nodeId: mockController.ownNodeId,
			endpointIndex: endpoint,
			destination: 0,
			encapsulated: cc,
		});
	}
	await mockNode.sendToController(createMockZWaveRequestFrame(cc));
}

function lastSetBytes(controller: MockController): Bytes {
	const request = controller.receivedHostMessages.findLast(
		(message) =>
			message instanceof SendDataRequest
			|| message instanceof SendDataBridgeRequest
			|| message instanceof SendDataMulticastRequest
			|| message instanceof SendDataMulticastBridgeRequest,
	);
	expect(request).toBeDefined();
	return Bytes.view((request as SendDataRequest).serializedCC!);
}

const encodingCases: {
	name: string;
	observed: Encoding[];
	value: number;
	scale?: number;
	expected: number[];
}[] = [
	{
		name: "unknown bounds use automatic encoding",
		observed: [],
		value: 21.55,
		expected: [0x42, 8, 0x6b],
	},
	{
		name: "minimum precision pads whole numbers",
		observed: [{ precision: 1, size: 2, scale: 0 }],
		value: 21,
		expected: [0x22, 0, 210],
	},
	{
		name: "maximum precision rounds positive values",
		observed: [{ precision: 1, size: 2, scale: 0 }],
		value: 21.26,
		expected: [0x22, 0, 213],
	},
	{
		name: "maximum precision rounds negative values",
		observed: [{ precision: 1, size: 2, scale: 0 }],
		value: -21.26,
		expected: [0x22, 0xff, 0x2b],
	},
	{
		name: "four-byte padding is preserved",
		observed: [{ precision: 2, size: 4, scale: 0 }],
		value: 21,
		expected: [0x44, 0, 0, 8, 0x34],
	},
	{
		name: "three-byte sizes are preserved",
		observed: [{ precision: 0, size: 3, scale: 0 }],
		value: 40000,
		expected: [3, 0, 0x9c, 0x40],
	},
	{
		name: "precision gaps reuse a reported combination",
		observed: [
			{ precision: 0, size: 1, scale: 0 },
			{ precision: 2, size: 4, scale: 0 },
		],
		value: 21.5,
		expected: [0x44, 0, 0, 8, 0x66],
	},
	{
		name: "a fitting lower precision handles overflow",
		observed: [
			{ precision: 2, size: 1, scale: 0 },
			{ precision: 0, size: 2, scale: 0 },
		],
		value: 21.5,
		expected: [2, 0, 22],
	},
	{
		name: "only matching scale combinations are used",
		observed: [
			{ precision: 0, size: 1, scale: 0 },
			{ precision: 2, size: 2, scale: 1 },
		],
		value: 21.55,
		scale: 1,
		expected: [0x4a, 8, 0x6b],
	},
	{
		name: "an unknown scale uses automatic encoding",
		observed: [{ precision: 0, size: 1, scale: 1 }],
		value: 21.55,
		expected: [0x42, 8, 0x6b],
	},
	{
		name: "seven-digit precision rounds within four bytes",
		observed: [{ precision: 7, size: 4, scale: 0 }],
		value: 21.12345678,
		expected: [0xe4, 0x0c, 0x97, 0x2f, 8],
	},
	{
		name: "the smallest exact observed combination is selected",
		observed: [
			{ precision: 0, size: 1, scale: 0 },
			{ precision: 2, size: 4, scale: 0 },
		],
		value: 21,
		expected: [1, 21],
	},
	{
		name: "the signed minimum is representable",
		observed: [{ precision: 0, size: 1, scale: 0 }],
		value: -128,
		expected: [1, 128],
	},
	{
		name: "the signed maximum is representable",
		observed: [{ precision: 0, size: 1, scale: 0 }],
		value: 127,
		expected: [1, 127],
	},
];

for (const { name, observed, value, scale = 0, expected } of encodingCases) {
	integrationTest(`Thermostat Setpoint: ${name}`, {
		nodeCapabilities: { commandClasses: [caps] },
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, _driver, node, controller, mockNode) => {
			node.valueDB.removeValue(observedId);
			t.expect(node.getValue(observedId)).toBeUndefined();
			for (const encoding of observed) {
				await sendReport(
					mockNode,
					controller,
					ThermostatSetpointCommand.Report,
					Bytes.concat([
						[ThermostatSetpointType.Heating],
						float(encoding),
					]),
				);
			}
			if (observed.length) {
				await t.expect
					.poll(() => node.getValue(observedId))
					.toEqual(observed);
			}
			await node.commandClasses["Thermostat Setpoint"].set(
				ThermostatSetpointType.Cooling,
				value,
				scale,
			);
			t.expect(lastSetBytes(controller)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Cooling,
					...expected,
				]),
			);
		},
	});
}

integrationTest(
	"Thermostat Setpoint learns new precision without reinterview and retains it in the disk cache",
	{
		nodeCapabilities: { commandClasses: [caps] },
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, driver, node, controller, mockNode) => {
			node.valueDB.removeValue(observedId);
			const api = node.commandClasses["Thermostat Setpoint"];
			await api.set(ThermostatSetpointType.Heating, 21.55, 0);
			t.expect(lastSetBytes(controller).subarray(3)).toEqual(
				encodeFloatWithScale(21.55, 0),
			);

			const integer = { precision: 0, size: 1, scale: 0 };
			await sendReport(
				mockNode,
				controller,
				ThermostatSetpointCommand.Report,
				Bytes.concat([
					[ThermostatSetpointType.Heating],
					float(integer),
				]),
			);
			await t.expect
				.poll(() => node.getValue(observedId))
				.toEqual([integer]);
			await api.set(ThermostatSetpointType.Cooling, 21.55, 0);
			t.expect(lastSetBytes(controller).subarray(3)).toEqual(
				Bytes.from([1, 22]),
			);

			const precise = { precision: 2, size: 2, scale: 0 };
			await sendReport(
				mockNode,
				controller,
				ThermostatSetpointCommand.CapabilitiesReport,
				Bytes.concat([
					[ThermostatSetpointType.Cooling],
					float(integer),
					float(precise, 3000),
				]),
			);
			await t.expect
				.poll(() => node.getValue(observedId))
				.toEqual([integer, precise]);
			await api.set(ThermostatSetpointType.Heating, 21.55, 0);
			t.expect(lastSetBytes(controller).subarray(3)).toEqual(
				Bytes.from([0x42, 8, 0x6b]),
			);

			await driver.valueDB!.close();
			await driver.valueDB!.open();
			t.expect(node.getValue(observedId)).toEqual([integer, precise]);
			await api.set(ThermostatSetpointType.Cooling, 21.55, 0);
			t.expect(lastSetBytes(controller).subarray(3)).toEqual(
				Bytes.from([0x42, 8, 0x6b]),
			);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& (frame.payload
						instanceof ThermostatSetpointCCSupportedGet
						|| frame.payload
							instanceof ThermostatSetpointCCCapabilitiesGet),
				{ noMatch: true },
			);
		},
	},
);

integrationTest(
	"Thermostat Setpoint shares capability encodings across endpoints and ignores N/A reports",
	{
		nodeCapabilities: {
			commandClasses: [CommandClasses["Multi Channel"], caps],
			endpoints: [{ commandClasses: [caps] }, { commandClasses: [caps] }],
		},
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, _driver, node, controller, mockNode) => {
			node.valueDB.removeValue(observedId);
			for (const command of [
				ThermostatSetpointCommand.Report,
				ThermostatSetpointCommand.CapabilitiesReport,
			]) {
				await sendReport(
					mockNode,
					controller,
					command,
					Bytes.from([0]),
					1,
				);
			}
			await wait(100);
			t.expect(node.getValue(observedId)).toBeUndefined();
			const min = { precision: 1, size: 2, scale: 0 };
			const max = { precision: 2, size: 4, scale: 1 };
			await sendReport(
				mockNode,
				controller,
				ThermostatSetpointCommand.Report,
				Bytes.concat([
					[ThermostatSetpointType.Heating],
					float(min, 210),
				]),
				1,
			);
			await t.expect.poll(() => node.getValue(observedId)).toEqual([min]);
			await node
				.getEndpointOrThrow(2)
				.commandClasses["Thermostat Setpoint"].set(
					ThermostatSetpointType.Cooling,
					21.55,
					0,
				);
			t.expect(lastSetBytes(controller).subarray(-6)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Cooling,
					0x22,
					0,
					216,
				]),
			);
			await sendReport(
				mockNode,
				controller,
				ThermostatSetpointCommand.CapabilitiesReport,
				Bytes.concat([
					[ThermostatSetpointType.Heating],
					float(min, 50),
					float(max, 9000),
				]),
				1,
			);
			await t.expect
				.poll(() => node.getValue(observedId))
				.toEqual([min, max]);
			await node
				.getEndpointOrThrow(2)
				.commandClasses["Thermostat Setpoint"].set(
					ThermostatSetpointType.Cooling,
					21.55,
					1,
				);
			t.expect(lastSetBytes(controller).subarray(-8)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Cooling,
					0x4c,
					0,
					0,
					8,
					0x6b,
				]),
			);
			t.expect(
				node.valueDB
					.getValues(ccId)
					.filter((value) => value.property === observedId.property)
					.map((value) => value.endpoint),
			).toEqual([0]);
			for (const command of [
				ThermostatSetpointCommand.Report,
				ThermostatSetpointCommand.CapabilitiesReport,
			]) {
				await sendReport(
					mockNode,
					controller,
					command,
					Bytes.from([0]),
					2,
				);
			}
			await wait(100);
			t.expect(node.getValue(observedId)).toEqual([min, max]);
		},
	},
);

for (const override of [
	{ precision: 0 },
	{ precision: 3 },
	{ size: 4 },
	{ precision: 2, size: 2 },
]) {
	integrationTest(
		`Thermostat Setpoint override ${JSON.stringify(override)} wins before and after learning`,
		{
			nodeCapabilities: { commandClasses: [caps] },
			customSetup: async (_driver, _controller, mockNode) => {
				mockNode.defineBehavior(acceptSet);
			},
			testBody: async (t, _driver, node, controller, mockNode) => {
				node.valueDB.removeValue(observedId);
				const config = vi
					.spyOn(node, "deviceConfig", "get")
					.mockReturnValue({
						compat: { overrideFloatEncoding: override },
					} as NonNullable<typeof node.deviceConfig>);
				t.onTestFinished(() => config.mockRestore());
				for (const learned of [false, true]) {
					if (learned) {
						const encoding = { precision: 0, size: 1, scale: 0 };
						await sendReport(
							mockNode,
							controller,
							ThermostatSetpointCommand.Report,
							Bytes.concat([
								[ThermostatSetpointType.Heating],
								float(encoding),
							]),
						);
						await t.expect
							.poll(() => node.getValue(observedId))
							.toEqual([encoding]);
					}
					const valueId = ThermostatSetpointCCValues.setpoint(
						ThermostatSetpointType.Heating,
					).id;
					await node.setValue(valueId, 21.55);
					t.expect(lastSetBytes(controller).subarray(3)).toEqual(
						encodeFloatWithScale(21.55, 0, override),
					);
					t.expect(node.getValue(valueId)).toBe(
						parseFloatWithScale(
							encodeFloatWithScale(21.55, 0, override),
						).value,
					);
				}
			},
		},
	);
}

integrationTest(
	"Thermostat Setpoint rejects overflow and recovers after learning a wider size",
	{
		nodeCapabilities: { commandClasses: [caps] },
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, _driver, node, controller, mockNode) => {
			const small = { precision: 0, size: 1, scale: 0 };
			t.expect(node.getValue(observedId)).toEqual([small]);
			const api = node.commandClasses["Thermostat Setpoint"];
			for (const value of [128, -129, 127.5]) {
				await t
					.expect(api.set(ThermostatSetpointType.Heating, value, 0))
					.rejects.toThrow("any observed float encoding");
			}
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof ThermostatSetpointCCSet,
				{ noMatch: true },
			);
			const large = { precision: 0, size: 2, scale: 0 };
			await sendReport(
				mockNode,
				controller,
				ThermostatSetpointCommand.Report,
				Bytes.concat([
					[ThermostatSetpointType.Heating],
					float(large, 128),
				]),
			);
			await t.expect
				.poll(() => node.getValue(observedId))
				.toEqual([small, large]);
			await api.set(ThermostatSetpointType.Heating, 128, 0);
			t.expect(lastSetBytes(controller).subarray(3)).toEqual(
				Bytes.from([2, 0, 128]),
			);
		},
	},
);

integrationTest(
	"Thermostat Setpoint supervised setValue caches the transmitted rounded value",
	{
		nodeCapabilities: {
			commandClasses: [caps, CommandClasses.Supervision],
		},
		additionalDriverOptions: { disableOptimisticValueUpdate: true },
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, _driver, node, controller, mockNode) => {
			const valueId = ThermostatSetpointCCValues.setpoint(
				ThermostatSetpointType.Heating,
			).id;
			const updates: unknown[] = [];
			node.on("value updated", (_node, args) => {
				if (
					args.commandClass === ccId
					&& args.property === "setpoint"
				) {
					updates.push(args.newValue);
				}
			});
			const result = await node.setValue(valueId, 21.55);
			t.expect(result).toMatchObject({
				status: SupervisionStatus.Success,
			});
			t.expect(lastSetBytes(controller).subarray(-5)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Heating,
					1,
					22,
				]),
			);
			t.expect(node.getValue(valueId)).toBe(22);
			t.expect(updates).toEqual([22]);
			t.expect(node.hasScheduledPolls()).toBe(false);

			const precise = { precision: 2, size: 2, scale: 0 };
			await sendReport(
				mockNode,
				controller,
				ThermostatSetpointCommand.CapabilitiesReport,
				Bytes.concat([
					[ThermostatSetpointType.Heating],
					float(precise),
					float(precise, 3000),
				]),
			);
			await t.expect
				.poll(() => node.getValue<unknown[]>(observedId)?.length)
				.toBe(2);
			await node.setValue(valueId, 21.55);
			t.expect(lastSetBytes(controller).subarray(-6)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Heating,
					0x42,
					8,
					0x6b,
				]),
			);
			t.expect(node.getValue(valueId)).toBe(21.55);
			t.expect(updates).toEqual([22, 21.55]);
			t.expect(node.hasScheduledPolls()).toBe(false);
		},
	},
);

integrationTest(
	"Thermostat Setpoint keeps queued commands consistent and applies newly learned precision to later sends",
	{
		nodeCapabilities: {
			commandClasses: [caps, CommandClasses.Supervision],
		},
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, driver, node, controller, mockNode) => {
			node.valueDB.removeValue(observedId);
			const valueId = ThermostatSetpointCCValues.setpoint(
				ThermostatSetpointType.Heating,
			).id;
			const originalSendCommand = driver.sendCommand.bind(driver);
			let reportSent = false;
			const sendCommand = vi
				.spyOn(driver, "sendCommand")
				.mockImplementation(async (command, options) => {
					if (
						command instanceof ThermostatSetpointCCSet
						&& !reportSent
					) {
						reportSent = true;
						const integer = { precision: 0, size: 1, scale: 0 };
						await sendReport(
							mockNode,
							controller,
							ThermostatSetpointCommand.Report,
							Bytes.concat([
								[ThermostatSetpointType.Heating],
								float(integer),
							]),
						);
						await t.expect
							.poll(() => node.getValue(observedId))
							.toEqual([integer]);
					}
					return originalSendCommand(command, options);
				});
			t.onTestFinished(() => sendCommand.mockRestore());
			await node.setValue(valueId, 21.55);
			t.expect(lastSetBytes(controller).subarray(-6)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Heating,
					0x42,
					8,
					0x6b,
				]),
			);
			t.expect(node.getValue(valueId)).toBe(21.55);
			await node.setValue(valueId, 21.55);
			t.expect(lastSetBytes(controller).subarray(-5)).toEqual(
				Bytes.from([
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Heating,
					1,
					22,
				]),
			);
			t.expect(node.getValue(valueId)).toBe(22);
		},
	},
);

integrationTest(
	"Thermostat Setpoint concurrent identical writes retain their transmitted values",
	{
		nodeCapabilities: {
			commandClasses: [caps, CommandClasses.Supervision],
		},
		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, _driver, node, controller) => {
			const valueId = ThermostatSetpointCCValues.setpoint(
				ThermostatSetpointType.Heating,
			).id;
			const updates: unknown[] = [];
			node.on("value updated", (_node, args) => {
				if (
					args.commandClass === ccId
					&& args.property === "setpoint"
				) {
					updates.push(args.newValue);
				}
			});
			const results = await Promise.all([
				node.setValue(valueId, 21.55),
				node.setValue(valueId, 21.55),
			]);
			t.expect(results).toEqual([
				t.expect.objectContaining({
					status: SupervisionStatus.Success,
				}),
				t.expect.objectContaining({
					status: SupervisionStatus.Success,
				}),
			]);
			t.expect(lastSetBytes(controller).subarray(-2)).toEqual(
				Bytes.from([1, 22]),
			);
			t.expect(node.getValue(valueId)).toBe(22);
			t.expect(updates.length).toBeGreaterThan(0);
			t.expect(updates.every((value) => value === 22)).toBe(true);
		},
	},
);

for (const disableOptimisticValueUpdate of [false, true]) {
	integrationTest(
		`Thermostat Setpoint unsupervised setValue verifies the rounded value with optimistic updates ${!disableOptimisticValueUpdate}`,
		{
			nodeCapabilities: { commandClasses: [caps] },
			additionalDriverOptions: {
				disableOptimisticValueUpdate,
				timeouts: { refreshValue: 60_000 },
			},
			customSetup: async (_driver, _controller, mockNode) => {
				mockNode.defineBehavior(acceptSet);
			},
			testBody: async (t, driver, node, controller, mockNode) => {
				const valueId = ThermostatSetpointCCValues.setpoint(
					ThermostatSetpointType.Heating,
				).id;
				const schedulePoll = vi.spyOn(driver, "schedulePoll");
				t.onTestFinished(() => schedulePoll.mockRestore());
				await node.setValue(valueId, 21.55);
				t.expect(lastSetBytes(controller).subarray(3)).toEqual(
					Bytes.from([1, 22]),
				);
				t.expect(node.getValue(valueId)).toBe(
					disableOptimisticValueUpdate ? 0 : 22,
				);
				t.expect(schedulePoll).toHaveBeenLastCalledWith(
					node.id,
					t.expect.objectContaining({
						property: "setpoint",
						propertyKey: ThermostatSetpointType.Heating,
					}),
					t.expect.objectContaining({ expectedValue: 22 }),
				);
				t.expect(node.hasScheduledPolls()).toBe(true);
				const integer = { precision: 0, size: 1, scale: 0 };
				await sendReport(
					mockNode,
					controller,
					ThermostatSetpointCommand.Report,
					Bytes.concat([
						[ThermostatSetpointType.Heating],
						float(integer, 21),
					]),
				);
				await t.expect.poll(() => node.getValue(valueId)).toBe(21);
				t.expect(node.hasScheduledPolls()).toBe(true);
				await sendReport(
					mockNode,
					controller,
					ThermostatSetpointCommand.Report,
					Bytes.concat([
						[ThermostatSetpointType.Heating],
						float(integer, 22),
					]),
				);
				await t.expect.poll(() => node.hasScheduledPolls()).toBe(false);
				t.expect(node.getValue(valueId)).toBe(22);

				const precise = { precision: 2, size: 2, scale: 0 };
				await sendReport(
					mockNode,
					controller,
					ThermostatSetpointCommand.CapabilitiesReport,
					Bytes.concat([
						[ThermostatSetpointType.Heating],
						float(precise),
						float(precise, 3000),
					]),
				);
				await t.expect
					.poll(() => node.getValue<unknown[]>(observedId)?.length)
					.toBe(2);
				await node.setValue(valueId, 21.55);
				t.expect(lastSetBytes(controller).subarray(3)).toEqual(
					Bytes.from([0x42, 8, 0x6b]),
				);
				t.expect(node.getValue(valueId)).toBe(
					disableOptimisticValueUpdate ? 22 : 21.55,
				);
				t.expect(schedulePoll).toHaveBeenLastCalledWith(
					node.id,
					t.expect.objectContaining({
						property: "setpoint",
						propertyKey: ThermostatSetpointType.Heating,
					}),
					t.expect.objectContaining({ expectedValue: 21.55 }),
				);
			},
		},
	);
}

multiNodeTest(
	"Thermostat Setpoint multicast and reused singlecast followups send identical float bytes",
	{
		controllerCapabilities: {
			supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
				(type) =>
					type !== FunctionType.SendDataBridge
					&& type !== FunctionType.SendDataMulticastBridge,
			),
		},
		nodeCapabilities: [2, 3].map((id) => ({
			id,
			capabilities: {
				commandClasses: [caps],
			},
		})),
		customSetup: async (_driver, _controller, mockNodes) => {
			for (const mockNode of mockNodes) {
				mockNode.defineBehavior({
					handleCC: (_controller, self, cc) => {
						if (cc instanceof ThermostatSetpointCCSet) {
							const values = self.state.get(
								"receivedSetpoints",
							) as number[] | undefined;
							self.state.set("receivedSetpoints", [
								...(values ?? []),
								cc.value,
							]);
							return { action: "ok" };
						}
					},
				});
			}
		},
		testBody: async (t, driver, nodes, controller, mockNodes) => {
			nodes[0].valueDB.setValue(observedId, [
				{ precision: 0, size: 1, scale: 0 },
			]);
			nodes[1].valueDB.setValue(observedId, [
				{ precision: 2, size: 4, scale: 0 },
			]);
			const cc = new ThermostatSetpointCCSet({
				nodeId: [2, 3],
				setpointType: ThermostatSetpointType.Heating,
				value: 21.55,
				scale: 0,
			});
			await driver.sendCommand(cc);
			const multicast = lastSetBytes(controller);
			// S2 followups reuse the command instance with each recipient's node ID
			for (const node of nodes) {
				cc.nodeId = node.id;
				await driver.sendCommand(cc);
				t.expect(lastSetBytes(controller)).toEqual(multicast);
				t.expect(cc.value).toBe(21.55);
			}
			for (const mockNode of mockNodes) {
				await t.expect
					.poll(() => mockNode.state.get("receivedSetpoints"))
					.toEqual([21.55, 21.55]);
				const values = mockNode.state.get(
					"receivedSetpoints",
				) as number[];
				t.expect(values.every((value) => value === 21.55)).toBe(true);
				mockNode.assertReceivedControllerFrame(
					(frame) =>
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof ThermostatSetpointCCSet
						&& frame.payload.value === 21.55,
				);
			}
		},
	},
);

multiNodeTest(
	"Thermostat Setpoint multicast keeps automatic encoding with learned bounds",
	{
		controllerCapabilities: {
			supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
				(type) =>
					type !== FunctionType.SendDataBridge
					&& type !== FunctionType.SendDataMulticastBridge,
			),
		},
		nodeCapabilities: [
			{ id: 2, capabilities: { commandClasses: [caps] } },
			{ id: 3, capabilities: { commandClasses: [caps] } },
		],
		customSetup: async (_driver, _controller, mockNodes) => {
			for (const mockNode of mockNodes)
				mockNode.defineBehavior(acceptSet);
		},
		testBody: async (t, driver, nodes, controller, mockNodes) => {
			const encoding = { precision: 0, size: 1, scale: 0 };
			for (let i = 0; i < nodes.length; i++) {
				nodes[i].valueDB.removeValue(observedId);
				await sendReport(
					mockNodes[i],
					controller,
					ThermostatSetpointCommand.Report,
					Bytes.concat([
						[ThermostatSetpointType.Heating],
						float(encoding),
					]),
				);
				await t.expect
					.poll(() => nodes[i].getValue(observedId))
					.toEqual([encoding]);
			}
			await driver.controller
				.getMulticastGroup([2, 3])
				.setValue(
					ThermostatSetpointCCValues.setpoint(
						ThermostatSetpointType.Heating,
					).id,
					21.55,
				);
			t.expect(lastSetBytes(controller).subarray(3)).toEqual(
				encodeFloatWithScale(21.55, 0),
			);
			for (const node of nodes) {
				t.expect(
					node.getValue(
						ThermostatSetpointCCValues.setpoint(
							ThermostatSetpointType.Heating,
						).id,
					),
				).toBe(21.55);
			}
			for (const mockNode of mockNodes) {
				mockNode.assertReceivedControllerFrame(
					(frame) =>
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof ThermostatSetpointCCSet
						&& frame.payload.value === 21.55,
				);
			}
		},
	},
);
