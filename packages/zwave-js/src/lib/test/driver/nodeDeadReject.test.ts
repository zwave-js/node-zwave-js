import { BasicCCGet, BasicCCSet } from "@zwave-js/cc";
import { NodeStatus, ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"When a node does not respond because it is dead, the sendCommand() Promise and all pending commands get rejected (maxSendAttempts: 1)",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeDeadReject",
		),

		testBody: async (t, driver, node2, mockController, mockNode) => {
			node2.markAsAlive();
			mockNode.autoAckControllerFrames = false;

			t.expect(node2.status).toBe(NodeStatus.Alive);

			const command1 = new BasicCCSet({
				nodeId: 2,
				targetValue: 99,
			});
			const basicSetPromise = driver.sendCommand(command1, {
				maxSendAttempts: 1,
			});
			basicSetPromise.then(() => {
				driver.driverLog.print("basicSetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise rejected");
			}); // Don't throw here, do it below

			const command2 = new BasicCCGet({
				nodeId: 2,
			});
			const basicGetPromise = driver.sendCommand(command2, {
				maxSendAttempts: 1,
			});
			basicGetPromise.then(() => {
				driver.driverLog.print("basicGetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicGetPromise rejected");
			}); // Don't throw here, do it below

			// The node should have received the first command
			await wait(50);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof BasicCCSet
					&& frame.payload.targetValue === 99,
				{
					errorMessage: "The first command was not received",
				},
			);

			// The command should be rejected
			await assertZWaveError(t.expect, () => basicSetPromise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
			});
			t.expect(node2.status).toBe(NodeStatus.Dead);

			driver.driverLog.sendQueue(driver["queue"]);

			// The second command should be rejected immediately because the node is dead
			await assertZWaveError(t.expect, () => basicGetPromise, {
				errorCode: ZWaveErrorCodes.Controller_MessageDropped,
			});
		},
	},
);

integrationTest(
	"When a node does not respond because it is dead, the sendCommand() Promise and all pending commands get rejected (maxSendAttempts: 2)",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeDeadReject",
		),

		testBody: async (t, driver, node2, mockController, mockNode) => {
			node2.markAsAlive();
			mockNode.autoAckControllerFrames = false;

			t.expect(node2.status).toBe(NodeStatus.Alive);

			const command1 = new BasicCCSet({
				nodeId: 2,
				targetValue: 99,
			});
			const basicSetPromise = driver.sendCommand(command1, {
				maxSendAttempts: 2,
			});
			basicSetPromise.then(() => {
				driver.driverLog.print("basicSetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise rejected");
			});

			const command2 = new BasicCCGet({
				nodeId: 2,
			});
			const basicGetPromise = driver.sendCommand(command2, {
				maxSendAttempts: 2,
			});
			basicGetPromise.then(() => {
				driver.driverLog.print("basicGetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicGetPromise rejected");
			});

			// The node should have received the first command
			await wait(50);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof BasicCCSet
					&& frame.payload.targetValue === 99,
				{
					errorMessage: "The first command was not received",
				},
			);

			// The command should be rejected
			await assertZWaveError(t.expect, () => basicSetPromise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
			});
			t.expect(node2.status).toBe(NodeStatus.Dead);

			driver.driverLog.sendQueue(driver["queue"]);

			// The second command should be rejected immediately because the node is dead
			await assertZWaveError(t.expect, () => basicGetPromise, {
				errorCode: ZWaveErrorCodes.Controller_MessageDropped,
			});
		},
	},
);

integrationTest(
	"When a node does not respond because it is dead, commands sent via the commandClasses API beforehand get rejected",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeDeadReject",
		),

		testBody: async (t, driver, node2, mockController, mockNode) => {
			node2.markAsAlive();
			mockNode.autoAckControllerFrames = false;

			t.expect(node2.status).toBe(NodeStatus.Alive);

			const basicSetPromise = node2.commandClasses.Basic.set(99);
			basicSetPromise.then(() => {
				driver.driverLog.print("basicSetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise rejected");
			});
			const basicGetPromise = node2.commandClasses.Basic.get();
			basicGetPromise.then(() => {
				driver.driverLog.print("basicGetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicGetPromise rejected");
			});

			// The node should have received the first command
			await wait(50);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof BasicCCSet
					&& frame.payload.targetValue === 99,
				{
					errorMessage: "The first command was not received",
				},
			);

			// The command should be rejected
			await assertZWaveError(t.expect, () => basicSetPromise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
			});
			t.expect(node2.status).toBe(NodeStatus.Dead);

			// The second command should be rejected immediately because the node is dead
			await assertZWaveError(t.expect, () => basicGetPromise, {
				errorCode: ZWaveErrorCodes.Controller_MessageDropped,
			});
		},
	},
);

integrationTest(
	"When a node does not respond because it is dead, commands sent via the commandClasses API afterwards are still attempted",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeDeadReject",
		),

		testBody: async (t, driver, node2, mockController, mockNode) => {
			node2.markAsAlive();
			mockNode.autoAckControllerFrames = false;

			t.expect(node2.status).toBe(NodeStatus.Alive);

			const basicSetPromise = node2.commandClasses.Basic.set(99);
			basicSetPromise.then(() => {
				driver.driverLog.print("basicSetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise rejected");
			});

			// The node should have received the first command
			await wait(50);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof BasicCCSet
					&& frame.payload.targetValue === 99,
				{
					errorMessage: "The first command was not received",
				},
			);

			// The command should be rejected
			await assertZWaveError(t.expect, () => basicSetPromise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
			});
			t.expect(node2.status).toBe(NodeStatus.Dead);

			const basicGetPromise = node2.commandClasses.Basic.get();
			basicGetPromise.then(() => {
				driver.driverLog.print("basicGetPromise resolved");
			}).catch(() => {
				driver.driverLog.print("basicGetPromise rejected");
			});

			// The node should have received the second command
			await wait(50);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof BasicCCGet,
				{
					errorMessage: "The second command was not received",
				},
			);

			// The second command should be rejected separately
			await assertZWaveError(t.expect, () => basicGetPromise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
			});
			// The node is still dead
			t.expect(node2.status).toBe(NodeStatus.Dead);
		},
	},
);
