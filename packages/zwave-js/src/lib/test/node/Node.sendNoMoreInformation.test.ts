import { WakeUpCommand } from "@zwave-js/cc";
import { WakeUpCC } from "@zwave-js/cc/WakeUpCC";
import { CommandClasses, InterviewStage } from "@zwave-js/core";
import sinon from "sinon";
import { beforeEach, test } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { ZWaveNode } from "../../node/Node.js";
import { assertCC } from "../assertCC.js";
import { createEmptyMockDriver } from "../mocks.js";

const fakeDriver = createEmptyMockDriver();

function makeNode(): ZWaveNode {
	const node = new ZWaveNode(2, fakeDriver as unknown as Driver);
	node["isListening"] = false;
	node["isFrequentListening"] = false;
	node.addCC(CommandClasses["Wake Up"], { isSupported: true });
	fakeDriver.controller.nodes.set(node.id, node);
	return node;
}

beforeEach(() => fakeDriver.sendMessage.resetHistory());

test.sequential(
	"should not do anything and return false if the node is asleep",
	async (t) => {
		const node = makeNode();
		node.markAsAsleep();

		t.expect(await node.sendNoMoreInformation()).toBe(false);
		sinon.assert.notCalled(fakeDriver.sendMessage);
		node.destroy();
	},
);

test.sequential(
	"should not do anything and return false if the node interview is not complete",
	async (t) => {
		const node = makeNode();
		node.interviewStage = InterviewStage.CommandClasses;
		t.expect(await node.sendNoMoreInformation()).toBe(false);
		sinon.assert.notCalled(fakeDriver.sendMessage);
		node.destroy();
	},
);

test.sequential(
	"should not send anything if the node should be kept awake",
	async (t) => {
		const node = makeNode();
		node.markAsAwake();
		node.keepAwake = true;

		t.expect(await node.sendNoMoreInformation()).toBe(false);
		sinon.assert.notCalled(fakeDriver.sendMessage);
		node.destroy();
	},
);

test.sequential("should send a WakeupCC.NoMoreInformation otherwise", async (t) => {
	const node = makeNode();
	node.interviewStage = InterviewStage.Complete;
	node.markAsAwake();
	t.expect(await node.sendNoMoreInformation()).toBe(true);
	sinon.assert.called(fakeDriver.sendMessage);

	assertCC(t.expect, fakeDriver.sendMessage.getCall(0).args[0], {
		cc: WakeUpCC,
		nodeId: node.id,
		ccValues: {
			ccCommand: WakeUpCommand.NoMoreInformation,
		},
	});
	node.destroy();
});
