import { WakeUpCommand } from "@zwave-js/cc";
import { WakeUpCC } from "@zwave-js/cc/WakeUpCC";
import { CommandClasses, InterviewStage } from "@zwave-js/core";
import test from "ava";
import sinon from "sinon";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { assertCCAva } from "../assertCC";
import { createEmptyMockDriverAva } from "../mocks";

const fakeDriver = createEmptyMockDriverAva();

function makeNode(): ZWaveNode {
	const node = new ZWaveNode(2, fakeDriver as unknown as Driver);
	node["isListening"] = false;
	node["isFrequentListening"] = false;
	node.addCC(CommandClasses["Wake Up"], { isSupported: true });
	fakeDriver.controller.nodes.set(node.id, node);
	return node;
}

test.beforeEach(() => fakeDriver.sendMessage.resetHistory());

test.serial(
	"should not do anything and return false if the node is asleep",
	async (t) => {
		const node = makeNode();
		node.markAsAsleep();

		t.false(await node.sendNoMoreInformation());
		sinon.assert.notCalled(fakeDriver.sendMessage);
		node.destroy();
	},
);

test.serial(
	"should not do anything and return false if the node interview is not complete",
	async (t) => {
		const node = makeNode();
		node.interviewStage = InterviewStage.CommandClasses;
		t.false(await node.sendNoMoreInformation());
		sinon.assert.notCalled(fakeDriver.sendMessage);
		node.destroy();
	},
);

test.serial(
	"should not send anything if the node should be kept awake",
	async (t) => {
		const node = makeNode();
		node.markAsAwake();
		node.keepAwake = true;

		t.false(await node.sendNoMoreInformation());
		sinon.assert.notCalled(fakeDriver.sendMessage);
		node.destroy();
	},
);

test.serial("should send a WakeupCC.NoMoreInformation otherwise", async (t) => {
	const node = makeNode();
	node.interviewStage = InterviewStage.Complete;
	node.markAsAwake();
	t.true(await node.sendNoMoreInformation());
	sinon.assert.called(fakeDriver.sendMessage);

	assertCCAva(t, fakeDriver.sendMessage.getCall(0).args[0], {
		cc: WakeUpCC,
		nodeId: node.id,
		ccValues: {
			ccCommand: WakeUpCommand.NoMoreInformation,
		},
	});
	node.destroy();
});
