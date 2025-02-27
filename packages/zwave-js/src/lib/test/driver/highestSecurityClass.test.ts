import {
	CommandClasses,
	NOT_KNOWN,
	SecurityClass,
	SecurityManager2,
} from "@zwave-js/core";
import { integrationTest } from "../integrationTestSuite.js";

// Repro for https://github.com/zwave-js/zwave-js/issues/6098

integrationTest(`An insecurely-included node has security class None`, {
	// debug: true,

	nodeCapabilities: {
		commandClasses: [
			CommandClasses.Version,
			CommandClasses["Multilevel Switch"],
		],
	},

	customSetup: async (driver, mockController, mockNode) => {
		// Don't wait too long for timed-out responses
		driver.options.timeouts.report = 200;
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		t.expect(node.hasSecurityClass(SecurityClass.S0_Legacy)).toBe(false);
		t.expect(node.hasSecurityClass(SecurityClass.S2_AccessControl)).toBe(
			false,
		);
		t.expect(node.getHighestSecurityClass()).toBe(SecurityClass.None);
	},
});

integrationTest(
	`An insecurely-included node that supports Security S0 has security class None`,
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses.Security, // The node supports this, but is still included insecurely
				CommandClasses["Multilevel Switch"],
			],
		},

		customSetup: async (driver, mockController, mockNode) => {
			// Don't wait too long for timed-out responses
			driver.options.timeouts.report = 200;
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.expect(node.hasSecurityClass(SecurityClass.S0_Legacy)).toBe(
				false,
			);
			t.expect(node.hasSecurityClass(SecurityClass.S2_AccessControl))
				.toBe(false);
			t.expect(node.getHighestSecurityClass()).toBe(SecurityClass.None);
		},
	},
);

integrationTest(
	`An insecurely-included node that supports Security S2 has security class None`,
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Security 2"], // The node supports this, but is still included insecurely
				CommandClasses["Multilevel Switch"],
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Don't wait too long for timed-out responses
			driver.options.timeouts.report = 200;

			// Create a security manager for the node
			const smNode = await SecurityManager2.create();
			// Copy keys from the driver
			await smNode.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			await smNode.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			await smNode.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.securityManagers.securityManager2 = smNode;
			mockNode.encodingContext.getHighestSecurityClass = () =>
				SecurityClass.None;

			// Create a security manager for the controller
			const smCtrlr = await SecurityManager2.create();
			// Copy keys from the driver
			await smCtrlr.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			await smCtrlr.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			await smCtrlr.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			controller.securityManagers.securityManager2 = smCtrlr;
			controller.encodingContext.getHighestSecurityClass = () =>
				NOT_KNOWN;
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.expect(node.hasSecurityClass(SecurityClass.S0_Legacy)).toBe(
				false,
			);
			t.expect(
				node.hasSecurityClass(SecurityClass.S2_Unauthenticated),
			).toBe(false);
			t.expect(node.hasSecurityClass(SecurityClass.S2_Authenticated))
				.toBe(false);
			t.expect(node.hasSecurityClass(SecurityClass.S2_AccessControl))
				.toBe(false);
			t.expect(node.getHighestSecurityClass()).toBe(SecurityClass.None);
		},
	},
);
