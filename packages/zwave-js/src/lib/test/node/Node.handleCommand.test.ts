import { CommandClass, EntryControlCommand } from "@zwave-js/cc";
import { BinarySwitchCCReport } from "@zwave-js/cc/BinarySwitchCC";
import { type EntryControlCCNotification } from "@zwave-js/cc/EntryControlCC";
import { type CommandClassInfo, CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import sinon from "sinon";
import { beforeEach, test } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { ZWaveNode } from "../../node/Node.js";
import {
	EntryControlDataTypes,
	EntryControlEventTypes,
} from "../../node/_Types.js";
import { createEmptyMockDriver } from "../mocks.js";

const fakeDriver = createEmptyMockDriver();

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

beforeEach(() => fakeDriver.sendMessage.resetHistory());

test.sequential(
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
		const command = new BinarySwitchCCReport({
			nodeId: 2,
			currentValue: true,
		});
		await node.handleCommand(command);

		t.expect(
			node.getValue({
				commandClass: CommandClasses["Binary Switch"],
				endpoint: 1,
				property: "currentValue",
			}),
		).toBe(true);

		node.destroy();
	},
);

test.sequential(
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

		const buf = Bytes.concat([
			[
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
			],
			// Required padding for ASCII
			new Uint8Array(12).fill(0xff),
		]);

		const command = await CommandClass.parse(
			buf,
			{ sourceNodeId: node.id } as any,
		) as EntryControlCCNotification;

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

		node.destroy();
	},
);
