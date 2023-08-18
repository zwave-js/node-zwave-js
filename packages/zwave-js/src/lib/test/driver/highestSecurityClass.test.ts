import {
	CommandClasses,
	NOT_KNOWN,
	SecurityClass,
	SecurityManager2,
} from "@zwave-js/core";
import { integrationTest } from "../integrationTestSuite";

// Repro for https://github.com/zwave-js/node-zwave-js/issues/6098

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
		driver.options.timeouts.report = 500;
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		t.is(node.hasSecurityClass(SecurityClass.S0_Legacy), false);
		t.is(node.hasSecurityClass(SecurityClass.S2_AccessControl), false);
		t.is(node.getHighestSecurityClass(), SecurityClass.None);
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
			driver.options.timeouts.report = 500;
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.is(node.hasSecurityClass(SecurityClass.S0_Legacy), false);
			t.is(node.hasSecurityClass(SecurityClass.S2_AccessControl), false);
			t.is(node.getHighestSecurityClass(), SecurityClass.None);
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
			driver.options.timeouts.report = 500;

			// Create a security manager for the node
			const smNode = new SecurityManager2();
			// Copy keys from the driver
			smNode.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			smNode.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			smNode.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.host.securityManager2 = smNode;
			mockNode.host.getHighestSecurityClass = () => SecurityClass.None;

			// Create a security manager for the controller
			const smCtrlr = new SecurityManager2();
			// Copy keys from the driver
			smCtrlr.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			smCtrlr.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			smCtrlr.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			controller.host.securityManager2 = smCtrlr;
			controller.host.getHighestSecurityClass = () => NOT_KNOWN;
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.is(node.hasSecurityClass(SecurityClass.S0_Legacy), false);
			t.is(
				node.hasSecurityClass(SecurityClass.S2_Unauthenticated),
				false,
			);
			t.is(node.hasSecurityClass(SecurityClass.S2_Authenticated), false);
			t.is(node.hasSecurityClass(SecurityClass.S2_AccessControl), false);
			t.is(node.getHighestSecurityClass(), SecurityClass.None);
		},
	},
);
