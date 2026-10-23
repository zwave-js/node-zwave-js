import {
	type UserCredentialCapability,
	type UserCredentialKeyLockerEntryCapability,
	UserCredentialKeyLockerEntryType,
	UserCredentialModifierType,
	UserCredentialNameEncoding,
	UserCredentialRule,
	UserCredentialType,
	UserCredentialUserType,
} from "@zwave-js/cc";
import {
	UserCredentialCCAdminPinCodeGet,
	UserCredentialCCAllUsersChecksumGet,
	UserCredentialCCCredentialCapabilitiesGet,
	UserCredentialCCCredentialGet,
	UserCredentialCCKeyLockerCapabilitiesGet,
	UserCredentialCCKeyLockerEntryGet,
	UserCredentialCCUserCapabilitiesGet,
	UserCredentialCCUserChecksumGet,
	UserCredentialCCUserGet,
	UserCredentialCCValues,
} from "@zwave-js/cc/UserCredentialCC";
import { CommandClasses } from "@zwave-js/core";
import { Bytes, stringToUint8ArrayUTF16BE } from "@zwave-js/shared";
import { MockZWaveFrameType, ccCaps } from "@zwave-js/testing";

import { integrationTest } from "../integrationTestSuite.js";

// ==========================================================================
// Mandatory interview: capabilities queries
// ==========================================================================

integrationTest(
	"User Credential CC interview queries user and credential capabilities",
	{
		clearMessageStatsBeforeTest: false,

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 1,
					numberOfSupportedUsers: 5,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: false,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload
						instanceof UserCredentialCCUserCapabilitiesGet,
				{
					errorMessage:
						"Should have sent UserCapabilitiesGet during interview",
				},
			);

			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload
						instanceof UserCredentialCCCredentialCapabilitiesGet,
				{
					errorMessage:
						"Should have sent CredentialCapabilitiesGet during interview",
				},
			);
		},
	},
);

integrationTest(
	"User Credential CC V2 interview also queries key locker capabilities",
	{
		clearMessageStatsBeforeTest: false,

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 2,
					numberOfSupportedUsers: 5,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: false,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload
						instanceof UserCredentialCCKeyLockerCapabilitiesGet,
				{
					errorMessage:
						"Should have sent KeyLockerCapabilitiesGet for V2",
				},
			);
		},
	},
);

// ==========================================================================
// Interview stores capability values correctly
// ==========================================================================

integrationTest("User Credential CC interview stores capability values", {
	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 1,
				numberOfSupportedUsers: 5,
				supportedCredentialRules: [
					UserCredentialRule.Single,
					UserCredentialRule.Dual,
				],
				maxUserNameLength: 20,
				supportsAllUsersChecksum: true,
				supportsUserChecksum: true,
				supportsAdminCode: true,
				supportsAdminCodeDeactivation: true,
				supportedUserNameEncodings: [UserCredentialNameEncoding.ASCII],
				supportedUserTypes: [
					UserCredentialUserType.General,
					UserCredentialUserType.Programming,
				],
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
			}),
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		t.expect(node.getValue(UserCredentialCCValues.supportedUsers.id)).toBe(
			5,
		);

		t.expect(
			node.getValue(UserCredentialCCValues.maxUserNameLength.id),
		).toBe(20);

		t.expect(
			node.getValue(UserCredentialCCValues.supportsAllUsersChecksum.id),
		).toBe(true);

		t.expect(
			node.getValue(UserCredentialCCValues.supportsAdminCode.id),
		).toBe(true);

		t.expect(
			node.getValue(
				UserCredentialCCValues.supportsAdminCodeDeactivation.id,
			),
		).toBe(true);
	},
});

// ==========================================================================
// Interview discovers pre-existing users and credentials
// ==========================================================================

integrationTest(
	"Interview discovers pre-existing users and their credentials",
	{
		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 1,
					numberOfSupportedUsers: 10,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: false,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.state.set("UserCredential_user_1", {
				userType: UserCredentialUserType.General,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "Alice",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_cred_1_1", {
				userId: 1,
				credentialData: Bytes.from("1234", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_user_3", {
				userType: UserCredentialUserType.Expiring,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 60,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "Bob",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_cred_1_2", {
				userId: 3,
				credentialData: Bytes.from("5678", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// User 1 should be discovered
			t.expect(
				node.getValue(UserCredentialCCValues.userType(1).endpoint(0)),
			).toBe(UserCredentialUserType.General);

			t.expect(
				node.getValue(UserCredentialCCValues.userName(1).endpoint(0)),
			).toBe("Alice");

			// User 1's credential should be discovered
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						1,
					).endpoint(0),
				),
			).toBeDefined();
			t.expect(
				node.getValue(
					UserCredentialCCValues.credentialOwner(
						UserCredentialType.PINCode,
						1,
					).endpoint(0),
				),
			).toBe(1);

			// User 3 should be discovered (gap at user 2)
			t.expect(
				node.getValue(UserCredentialCCValues.userType(3).endpoint(0)),
			).toBe(UserCredentialUserType.Expiring);

			t.expect(
				node.getValue(UserCredentialCCValues.userName(3).endpoint(0)),
			).toBe("Bob");

			// User 3's credential should be discovered
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						2,
					).endpoint(0),
				),
			).toBeDefined();
			t.expect(
				node.getValue(
					UserCredentialCCValues.credentialOwner(
						UserCredentialType.PINCode,
						2,
					).endpoint(0),
				),
			).toBe(3);
		},
	},
);

// ==========================================================================
// Interview queries admin PIN code when supported
// ==========================================================================

integrationTest("Interview queries admin PIN code when supported", {
	clearMessageStatsBeforeTest: false,

	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 1,
				numberOfSupportedUsers: 1,
				supportedCredentialRules: [UserCredentialRule.Single],
				maxUserNameLength: 32,
				supportsAllUsersChecksum: false,
				supportsUserChecksum: false,
				supportsAdminCode: true,
				supportsAdminCodeDeactivation: true,
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
			}),
		],
	},

	customSetup: async (_driver, _controller, mockNode) => {
		mockNode.state.set("UserCredential_adminPinCode", "9999");
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof UserCredentialCCAdminPinCodeGet,
			{
				errorMessage:
					"Should have sent AdminPinCodeGet during interview",
			},
		);

		t.expect(node.getValue(UserCredentialCCValues.adminPinCode.id)).toBe(
			"9999",
		);
	},
});

integrationTest("Interview does not query admin PIN code when not supported", {
	clearMessageStatsBeforeTest: false,

	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 1,
				numberOfSupportedUsers: 1,
				supportedCredentialRules: [UserCredentialRule.Single],
				maxUserNameLength: 32,
				supportsAllUsersChecksum: false,
				supportsUserChecksum: false,
				supportsAdminCode: false,
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
			}),
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof UserCredentialCCAdminPinCodeGet,
			{
				noMatch: true,
				errorMessage:
					"Should NOT have sent AdminPinCodeGet when admin code is not supported",
			},
		);
	},
});

// ==========================================================================
// All-users checksum optimization
// ==========================================================================

integrationTest(
	"Interview uses all-users checksum to skip full sync when unchanged",
	{
		clearMessageStatsBeforeTest: false,

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 1,
					numberOfSupportedUsers: 10,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: true,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.state.set("UserCredential_user_1", {
				userType: UserCredentialUserType.General,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "Alice",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_cred_1_1", {
				userId: 1,
				credentialData: Bytes.from("1234", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// First interview should have queried the checksum
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload
						instanceof UserCredentialCCAllUsersChecksumGet,
				{
					errorMessage:
						"Should have sent AllUsersChecksumGet during interview",
				},
			);

			// And should have queried users (first interview, no cached checksum)
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof UserCredentialCCUserGet,
				{
					errorMessage:
						"Should have queried users during first interview",
				},
			);
		},
	},
);

// ==========================================================================
// Per-user checksum optimization
// ==========================================================================

integrationTest("Interview queries per-user checksum when supported", {
	clearMessageStatsBeforeTest: false,

	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 1,
				numberOfSupportedUsers: 10,
				supportedCredentialRules: [UserCredentialRule.Single],
				maxUserNameLength: 32,
				supportsAllUsersChecksum: false,
				supportsUserChecksum: true,
				supportsAdminCode: false,
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
			}),
		],
	},

	customSetup: async (_driver, _controller, mockNode) => {
		mockNode.state.set("UserCredential_user_1", {
			userType: UserCredentialUserType.General,
			active: true,
			credentialRule: UserCredentialRule.Single,
			expiringTimeoutMinutes: 0,
			nameEncoding: UserCredentialNameEncoding.ASCII,
			userName: "Alice",
			modifierType: UserCredentialModifierType.Locally,
			modifierNodeId: 0,
		});

		mockNode.state.set("UserCredential_cred_1_1", {
			userId: 1,
			credentialData: Bytes.from("1234", "ascii"),
			modifierType: UserCredentialModifierType.Locally,
			modifierNodeId: 0,
		});
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof UserCredentialCCUserChecksumGet,
			{
				errorMessage:
					"Should have sent UserChecksumGet during interview",
			},
		);
	},
});

// ==========================================================================
// Empty device (no pre-existing users)
// ==========================================================================

integrationTest("Interview handles device with no pre-existing users", {
	clearMessageStatsBeforeTest: false,

	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 1,
				numberOfSupportedUsers: 10,
				supportedCredentialRules: [UserCredentialRule.Single],
				maxUserNameLength: 32,
				supportsAllUsersChecksum: false,
				supportsUserChecksum: false,
				supportsAdminCode: false,
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
			}),
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		// With no users pre-populated, the first User Get should return
		// an empty report and the interview should stop iterating.
		// No user values should be stored.
		const userType = node.getValue(
			UserCredentialCCValues.userType(1).endpoint(0),
		);
		t.expect(userType).toBeUndefined();
	},
});

// ==========================================================================
// Multiple credential types
// ==========================================================================

integrationTest(
	"Interview discovers credentials across multiple credential types",
	{
		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 1,
					numberOfSupportedUsers: 10,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: false,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
						[
							UserCredentialType.Password,
							{
								numberOfCredentialSlots: 5,
								minCredentialLength: 4,
								maxCredentialLength: 32,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.state.set("UserCredential_user_1", {
				userType: UserCredentialUserType.General,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "Alice",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			// PIN code credential
			mockNode.state.set("UserCredential_cred_1_1", {
				userId: 1,
				credentialData: Bytes.from("1234", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			// Password credential
			mockNode.state.set("UserCredential_cred_2_1", {
				userId: 1,
				credentialData: Bytes.from(
					stringToUint8ArrayUTF16BE("password"),
				),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// PIN code credential should be discovered
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						1,
					).endpoint(0),
				),
			).toBeDefined();

			// Password credential should be discovered and decoded from UTF-16BE
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.Password,
						1,
					).endpoint(0),
				),
			).toBe("password");
		},
	},
);

// ==========================================================================
// V2: Key locker entry interview
// ==========================================================================

integrationTest("V2 interview queries key locker entries for supported types", {
	clearMessageStatsBeforeTest: false,

	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 2,
				numberOfSupportedUsers: 5,
				supportedCredentialRules: [UserCredentialRule.Single],
				maxUserNameLength: 32,
				supportsAllUsersChecksum: false,
				supportsUserChecksum: false,
				supportsAdminCode: false,
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
				supportedKeyLockerEntryTypes: new Map([
					[
						UserCredentialKeyLockerEntryType.DESFireApplicationIdAndKey,
						{
							numberOfEntrySlots: 2,
							minEntryDataLength: 4,
							maxEntryDataLength: 20,
						} satisfies UserCredentialKeyLockerEntryCapability,
					],
				]),
			}),
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof UserCredentialCCKeyLockerEntryGet,
			{
				errorMessage:
					"Should have sent KeyLockerEntryGet during V2 interview",
			},
		);
	},
});

// ==========================================================================
// V1 does not query key locker entries
// ==========================================================================

integrationTest("V1 interview does not query key locker entries", {
	clearMessageStatsBeforeTest: false,

	nodeCapabilities: {
		commandClasses: [
			ccCaps({
				ccId: CommandClasses["User Credential"],
				isSupported: true,
				version: 1,
				numberOfSupportedUsers: 5,
				supportedCredentialRules: [UserCredentialRule.Single],
				maxUserNameLength: 32,
				supportsAllUsersChecksum: false,
				supportsUserChecksum: false,
				supportsAdminCode: false,
				supportedCredentialTypes: new Map([
					[
						UserCredentialType.PINCode,
						{
							numberOfCredentialSlots: 10,
							minCredentialLength: 4,
							maxCredentialLength: 10,
							maxCredentialHashLength: 0,
							supportsCredentialLearn: false,
						} satisfies UserCredentialCapability,
					],
				]),
			}),
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof UserCredentialCCKeyLockerEntryGet,
			{
				noMatch: true,
				errorMessage: "Should NOT have sent KeyLockerEntryGet for V1",
			},
		);
	},
});

// ==========================================================================
// Interview iterates credential pagination correctly
// ==========================================================================

integrationTest(
	"Interview follows credential pagination across types and slots",
	{
		clearMessageStatsBeforeTest: false,

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 1,
					numberOfSupportedUsers: 10,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: false,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			mockNode.state.set("UserCredential_user_1", {
				userType: UserCredentialUserType.General,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "Alice",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			// Two PIN code credentials in slots 1 and 3 (gap at 2)
			mockNode.state.set("UserCredential_cred_1_1", {
				userId: 1,
				credentialData: Bytes.from("1234", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_cred_1_3", {
				userId: 1,
				credentialData: Bytes.from("5678", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Both credentials should be discovered despite the gap
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						1,
					).endpoint(0),
				),
			).toBeDefined();

			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						3,
					).endpoint(0),
				),
			).toBeDefined();

			// Slot 2 should NOT have a credential
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						2,
					).endpoint(0),
				),
			).toBeUndefined();
		},
	},
);

// ==========================================================================
// Interview iterates users via nextUserId chain
// ==========================================================================

integrationTest(
	"Interview iterates users via nextUserId and queries credentials for each",
	{
		clearMessageStatsBeforeTest: false,

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["User Credential"],
					isSupported: true,
					version: 1,
					numberOfSupportedUsers: 10,
					supportedCredentialRules: [UserCredentialRule.Single],
					maxUserNameLength: 32,
					supportsAllUsersChecksum: false,
					supportsUserChecksum: false,
					supportsAdminCode: false,
					supportedCredentialTypes: new Map([
						[
							UserCredentialType.PINCode,
							{
								numberOfCredentialSlots: 10,
								minCredentialLength: 4,
								maxCredentialLength: 10,
								maxCredentialHashLength: 0,
								supportsCredentialLearn: false,
							} satisfies UserCredentialCapability,
						],
					]),
				}),
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			// User 2
			mockNode.state.set("UserCredential_user_2", {
				userType: UserCredentialUserType.General,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "User Two",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_cred_1_1", {
				userId: 2,
				credentialData: Bytes.from("1111", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			// User 5 (gap at 3, 4)
			mockNode.state.set("UserCredential_user_5", {
				userType: UserCredentialUserType.General,
				active: true,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "User Five",
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});

			mockNode.state.set("UserCredential_cred_1_2", {
				userId: 5,
				credentialData: Bytes.from("5555", "ascii"),
				modifierType: UserCredentialModifierType.Locally,
				modifierNodeId: 0,
			});
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Both users should be discovered
			t.expect(
				node.getValue(UserCredentialCCValues.userName(2).endpoint(0)),
			).toBe("User Two");

			t.expect(
				node.getValue(UserCredentialCCValues.userName(5).endpoint(0)),
			).toBe("User Five");

			// Credentials for both users should be discovered
			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						1,
					).endpoint(0),
				),
			).toBeDefined();
			t.expect(
				node.getValue(
					UserCredentialCCValues.credentialOwner(
						UserCredentialType.PINCode,
						1,
					).endpoint(0),
				),
			).toBe(2);

			t.expect(
				node.getValue(
					UserCredentialCCValues.credential(
						UserCredentialType.PINCode,
						2,
					).endpoint(0),
				),
			).toBeDefined();
			t.expect(
				node.getValue(
					UserCredentialCCValues.credentialOwner(
						UserCredentialType.PINCode,
						2,
					).endpoint(0),
				),
			).toBe(5);

			// User Get commands should have been sent during the interview
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof UserCredentialCCUserGet,
				{
					errorMessage: "Should have sent UserGet during interview",
				},
			);

			// Credential Get commands should have been sent
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof UserCredentialCCCredentialGet,
				{
					errorMessage:
						"Should have sent CredentialGet during interview",
				},
			);
		},
	},
);
