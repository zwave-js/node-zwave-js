import { BinarySwitchCommand, EntryControlCommand } from "@zwave-js/cc";
import { BinarySwitchCCReport } from "@zwave-js/cc/BinarySwitchCC";
import { EntryControlCCNotification } from "@zwave-js/cc/EntryControlCC";
import { CommandClasses, type CommandClassInfo } from "@zwave-js/core";
import test from "ava";
import sinon from "sinon";
import type { Driver } from "../driver/Driver";
import { createEmptyMockDriverAva } from "../test/mocks";
import { ZWaveNode } from "./Node";
import { EntryControlDataTypes, EntryControlEventTypes } from "./_Types";

const fakeDriver = createEmptyMockDriverAva();

function makeNode(
	ccs: [CommandClasses, Partial<CommandClassInfo>][] = [],
): ZWaveNode {
	const node = new ZWaveNode(2, fakeDriver as unknown as Driver);
	fakeDriver.controller.nodes.set(node.id, node);
	for (const [cc, info] of ccs) {
		node.addCC(cc, info);
	}
	return node;
}

test.beforeEach(() => fakeDriver.sendMessage.resetHistory());

test.serial(
	"should map commands from the root endpoint to endpoint 1 if configured",
	async (t) => {
		const node = makeNode([
			[
				CommandClasses["Multi Channel Association"],
				{ isSupported: true, version: 2 },
			],
		]);
		// We have two endpoints
		node.valueDB.setValue(
			{
				commandClass: CommandClasses["Multi Channel"],
				property: "individualCount",
			},
			2,
		);
		node.valueDB.setValue(
			{
				commandClass: CommandClasses["Multi Channel"],
				endpoint: 0,
				property: "interviewComplete",
			},
			true,
		);
		// The endpoint supports Binary Switch
		node.getEndpoint(1)?.addCC(CommandClasses["Binary Switch"], {
			isSupported: true,
		});

		node["_deviceConfig"] = {
			compat: {
				mapRootReportsToEndpoint: 1,
			},
		} as any;

		// Handle a command for the root endpoint
		const command = new BinarySwitchCCReport(
			fakeDriver as unknown as Driver,
			{
				nodeId: 2,
				data: Buffer.from([
					CommandClasses["Binary Switch"],
					BinarySwitchCommand.Report,
					0xff,
				]),
			},
		);
		await node.handleCommand(command);

		t.true(
			node.getValue({
				commandClass: CommandClasses["Binary Switch"],
				endpoint: 1,
				property: "currentValue",
			}),
		);

		node.destroy();
	},
);

test.serial(
	"a notification event is sent when receiving an EntryControlNotification",
	async (t) => {
		const node = makeNode([
			[
				CommandClasses["Entry Control"],
				{ isSupported: true, version: 1 },
			],
		]);

		const spy = sinon.spy();
		node.on("notification", spy);

		const buf = Buffer.concat([
			Buffer.from([
				CommandClasses["Entry Control"],
				EntryControlCommand.Notification, // CC Command
				0x5,
				0x2,
				0x3,
				16,
				49,
				50,
				51,
				52,
			]),
			// Required padding for ASCII
			Buffer.alloc(12, 0xff),
		]);

		const command = new EntryControlCCNotification(
			fakeDriver as unknown as Driver,
			{
				nodeId: node.id,
				data: buf,
			},
		);

		await node.handleCommand(command);

		sinon.assert.calledOnce(spy);
		sinon.assert.calledWith(
			spy,
			sinon.match({ id: node.id }),
			CommandClasses["Entry Control"],
			{
				dataType: EntryControlDataTypes.ASCII,
				dataTypeLabel: "ASCII",
				eventType: EntryControlEventTypes.DisarmAll,
				eventTypeLabel: "Disarm all",
				eventData: "1234",
			},
		);
		t.pass();

		node.destroy();
	},
);
