import {
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses, type ValueMetadataNumeric } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Notifications with enum event parameters are evaluated correctly",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses.Notification,
					version: 8,
					supportsV1Alarm: false,
					notificationTypesAndEvents: {
						// Water Valve - Valve operation status
						[0x0f]: [0x01],
					},
				},
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			await node.commandClasses.Notification.getSupportedEvents(0x0f);

			const valveOperationStatusId =
				NotificationCCValues.notificationVariable(
					"Water Valve",
					"Valve operation status",
				).id;

			const states = (
				node.getValueMetadata(
					valveOperationStatusId,
				) as ValueMetadataNumeric
			).states;
			t.deepEqual(states, {
				// For the valve operation status variable, the embedded enum replaces its possible states
				// since there is only one meaningless state, so it doesn't make sense to preserve it
				// This is different from the "Door state" value which has multiple states AND enums
				[0x00]: "Off / Closed",
				[0x01]: "On / Open",
			});

			// Send notifications to the node
			let cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x0f,
				notificationEvent: 0x01,
				eventParameters: Buffer.from([0x00]), // Off / Closed
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			let value = node.getValue(valveOperationStatusId);
			t.is(value, 0x00);

			cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x0f,
				notificationEvent: 0x01,
				eventParameters: Buffer.from([0x01]), // On / Open
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(100);

			value = node.getValue(valveOperationStatusId);
			t.is(value, 0x01);
		},
	},
);

integrationTest(
	"Notification types with multiple states and optional enums merge/extend states for all of them",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses.Notification,
					version: 8,
					supportsV1Alarm: false,
					notificationTypesAndEvents: {
						// Access Control - Window open and Window closed
						[0x06]: [0x16, 0x17],
					},
				},
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			await node.commandClasses.Notification.getSupportedEvents(0x06);

			const doorStateValueId = NotificationCCValues.notificationVariable(
				"Access Control",
				"Door state",
			).id;
			const states = (
				node.getValueMetadata(doorStateValueId) as ValueMetadataNumeric
			).states;
			t.deepEqual(states, {
				[0x16]: "Window/door is open",
				[0x17]: "Window/door is closed",
				// The Door state notification type has an enum for the "open" state
				// We add synthetic values for these (optional!) states in addition to the actual values
				[0x1600]: "Window/door is open in regular position",
				[0x1601]: "Window/door is open in tilt position",
			});

			// Send notifications to the node
			let cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x06,
				notificationEvent: 0x16,
				eventParameters: Buffer.from([0x00]), // open in regular position
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			let value = node.getValue(doorStateValueId);
			t.is(value, 0x1600);

			cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x06,
				notificationEvent: 0x16,
				eventParameters: Buffer.from([0x01]), // open in tilt position
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(100);

			value = node.getValue(doorStateValueId);
			t.is(value, 0x1601);

			cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x06,
				notificationEvent: 0x16, // open
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(100);

			value = node.getValue(doorStateValueId);
			t.is(value, 0x16);

			cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x06,
				notificationEvent: 0x17, // closed
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(100);

			value = node.getValue(doorStateValueId);
			t.is(value, 0x17);
		},
	},
);

integrationTest("The 'simple' Door state value works correctly", {
	// debug: true,

	nodeCapabilities: {
		commandClasses: [
			CommandClasses.Version,
			{
				ccId: CommandClasses.Notification,
				isSupported: true,
				version: 8,
				supportsV1Alarm: false,
				notificationTypesAndEvents: {
					// Access Control - Window open and Window closed
					[0x06]: [0x16, 0x17],
				},
			},
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		await node.commandClasses.Notification.getSupportedEvents(0x06);

		const valueIDs = node.getDefinedValueIDs();
		const simpleVID = valueIDs.find(
			(vid) =>
				vid.commandClass === CommandClasses.Notification
				&& vid.propertyKey === "Door state (simple)",
		);
		t.truthy(simpleVID);

		const meta = node.getValueMetadata(simpleVID!);
		t.like(meta, {
			ccSpecific: { notificationType: 6 },
			label: "Door state (simple)",
			readable: true,
			states: {
				[0x16]: "Window/door is open",
				[0x17]: "Window/door is closed",
			},
			type: "number",
			writeable: false,
		});

		// Send notifications to the node
		const valueWithEnum = NotificationCCValues.notificationVariable(
			"Access Control",
			"Door state",
		);
		const valueSimple = NotificationCCValues.doorStateSimple;

		let cc = new NotificationCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			notificationType: 0x06,
			notificationEvent: 0x16, // Window/door is open
			eventParameters: Buffer.from([0x01]), // ... in tilt position
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// wait a bit for the value to be updated
		await wait(100);

		t.is(node.getValue(valueWithEnum.id), 0x1601);
		t.is(node.getValue(valueSimple.id), 0x16);

		// ===

		cc = new NotificationCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			notificationType: 0x06,
			notificationEvent: 0x16, // Window/door is open
			eventParameters: Buffer.from([0x00]), // ... in regular position
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// wait a bit for the value to be updated
		await wait(100);

		t.is(node.getValue(valueWithEnum.id), 0x1600);
		t.is(node.getValue(valueSimple.id), 0x16);

		// ===

		cc = new NotificationCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			notificationType: 0x06,
			notificationEvent: 0x16, // Window/door is open
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// wait a bit for the value to be updated
		await wait(100);

		t.is(node.getValue(valueWithEnum.id), 0x16);
		t.is(node.getValue(valueSimple.id), 0x16);

		// ===

		cc = new NotificationCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			notificationType: 0x06,
			notificationEvent: 0x17, // Window/door is closed
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// wait a bit for the value to be updated
		await wait(100);

		t.is(node.getValue(valueWithEnum.id), 0x17);
		t.is(node.getValue(valueSimple.id), 0x17);
	},
});
