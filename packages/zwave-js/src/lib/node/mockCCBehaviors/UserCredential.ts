import {
	UserCredentialAdminCodeOperationResult,
	UserCredentialCredentialReportType,
	UserCredentialKeyLockerEntryType,
	UserCredentialModifierType,
	UserCredentialNameEncoding,
	UserCredentialOperationType,
	UserCredentialRule,
	UserCredentialType,
	UserCredentialUserReportType,
	UserCredentialUserType,
} from "@zwave-js/cc";
import {
	UserCredentialCCAdminPinCodeGet,
	UserCredentialCCAdminPinCodeReport,
	UserCredentialCCAdminPinCodeSet,
	UserCredentialCCAllUsersChecksumGet,
	UserCredentialCCAllUsersChecksumReport,
	UserCredentialCCAssociationReport,
	UserCredentialCCAssociationSet,
	UserCredentialCCCredentialCapabilitiesGet,
	UserCredentialCCCredentialCapabilitiesReport,
	UserCredentialCCCredentialChecksumGet,
	UserCredentialCCCredentialChecksumReport,
	UserCredentialCCCredentialGet,
	UserCredentialCCCredentialLearnCancel,
	UserCredentialCCCredentialLearnReport,
	UserCredentialCCCredentialLearnStart,
	UserCredentialCCCredentialReport,
	UserCredentialCCCredentialSet,
	UserCredentialCCKeyLockerCapabilitiesGet,
	UserCredentialCCKeyLockerCapabilitiesReport,
	UserCredentialCCKeyLockerEntryGet,
	UserCredentialCCKeyLockerEntryReport,
	UserCredentialCCKeyLockerEntrySet,
	UserCredentialCCUserCapabilitiesGet,
	UserCredentialCCUserCapabilitiesReport,
	UserCredentialCCUserChecksumGet,
	UserCredentialCCUserChecksumReport,
	UserCredentialCCUserGet,
	UserCredentialCCUserReport,
	UserCredentialCCUserSet,
} from "@zwave-js/cc/UserCredentialCC";
import { CRC16_CCITT, CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import {
	type MockNode,
	type MockNodeBehavior,
	type UserCredentialCCCapabilities,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

// =============================================================================
// Default capabilities — simulates a simple PIN-code-only lock
// =============================================================================

export const defaultCapabilities: UserCredentialCCCapabilities = {
	numberOfSupportedUsers: 10,
	supportedCredentialRules: [UserCredentialRule.Single],
	maxUserNameLength: 32,
	supportsUserSchedule: false,
	supportsAllUsersChecksum: true,
	supportsUserChecksum: true,
	supportedUserNameEncodings: [UserCredentialNameEncoding.ASCII],
	supportedUserTypes: [
		UserCredentialUserType.General,
		UserCredentialUserType.Programming,
		UserCredentialUserType.NonAccess,
		UserCredentialUserType.Duress,
		UserCredentialUserType.Disposable,
		UserCredentialUserType.Expiring,
		UserCredentialUserType.RemoteOnly,
	],
	supportsCredentialChecksum: true,
	supportsAdminCode: true,
	supportsAdminCodeDeactivation: true,
	supportedCredentialTypes: new Map([
		[
			UserCredentialType.PINCode,
			{
				numberOfCredentialSlots: 10,
				minCredentialLength: 4,
				maxCredentialLength: 10,
				// CC:0083.01.04.11.019: CRB MUST be 1 when max hash length is 0
				maxCredentialHashLength: 0,
				supportsCredentialLearn: false,
			},
		],
	]),
};

// =============================================================================
// State key helpers
// =============================================================================

const STATE_KEY_PREFIX = "UserCredential_";
const StateKeys = {
	user: (userId: number) => `${STATE_KEY_PREFIX}user_${userId}`,
	credential: (credentialType: UserCredentialType, credentialSlot: number) =>
		`${STATE_KEY_PREFIX}cred_${credentialType}_${credentialSlot}`,
	adminPinCode: `${STATE_KEY_PREFIX}adminPinCode`,
	keyLockerEntry: (
		entryType: UserCredentialKeyLockerEntryType,
		entrySlot: number,
	) => `${STATE_KEY_PREFIX}keyLocker_${entryType}_${entrySlot}`,
} as const;

// =============================================================================
// Internal state types
// =============================================================================

interface UserState {
	userType: UserCredentialUserType;
	active: boolean;
	credentialRule: UserCredentialRule;
	expiringTimeoutMinutes: number;
	nameEncoding: UserCredentialNameEncoding;
	userName: string;
	modifierType: UserCredentialModifierType;
	modifierNodeId: number;
}

interface CredentialState {
	userId: number;
	credentialData: Bytes;
	modifierType: UserCredentialModifierType;
	modifierNodeId: number;
}

// =============================================================================
// Helper: merge capabilities with defaults
// =============================================================================

function getCapabilities(
	self: MockNode,
	endpointIndex: number,
): UserCredentialCCCapabilities {
	const caps = self.getCCCapabilities(
		CommandClasses["User Credential"],
		endpointIndex,
	) as UserCredentialCCCapabilities | undefined;
	return {
		...defaultCapabilities,
		...caps,
	};
}

// =============================================================================
// State access helpers
// =============================================================================

function getUser(self: MockNode, userId: number): UserState | undefined {
	return self.state.get(StateKeys.user(userId)) as UserState | undefined;
}

function setUser(self: MockNode, userId: number, data: UserState): void {
	self.state.set(StateKeys.user(userId), data);
}

function deleteUser(self: MockNode, userId: number): void {
	self.state.delete(StateKeys.user(userId));
}

function getCredential(
	self: MockNode,
	userId: number,
	credentialType: UserCredentialType,
	credentialSlot: number,
): CredentialState | undefined {
	const credential = getCredentialByTypeAndSlot(
		self,
		credentialType,
		credentialSlot,
	);
	if (credential?.userId !== userId) return undefined;
	return credential;
}

function getCredentialByTypeAndSlot(
	self: MockNode,
	credentialType: UserCredentialType,
	credentialSlot: number,
): CredentialState | undefined {
	return self.state.get(
		StateKeys.credential(credentialType, credentialSlot),
	) as CredentialState | undefined;
}

function setCredential(
	self: MockNode,
	userId: number,
	credentialType: UserCredentialType,
	credentialSlot: number,
	data: Omit<CredentialState, "userId">,
): void {
	self.state.set(StateKeys.credential(credentialType, credentialSlot), {
		userId,
		...data,
	});
}

function deleteCredential(
	self: MockNode,
	userId: number,
	credentialType: UserCredentialType,
	credentialSlot: number,
): void {
	if (
		getCredential(self, userId, credentialType, credentialSlot) == undefined
	) {
		return;
	}
	self.state.delete(StateKeys.credential(credentialType, credentialSlot));
}

/** Get sorted list of all occupied user IDs. */
function getAllUserIds(
	self: MockNode,
	capabilities: UserCredentialCCCapabilities,
): number[] {
	const userIds: number[] = [];
	for (let id = 1; id <= capabilities.numberOfSupportedUsers; id++) {
		if (getUser(self, id) !== undefined) {
			userIds.push(id);
		}
	}
	return userIds;
}

/** Find the next occupied user ID after `afterId`, or 0 if none. */
function findNextUserId(
	self: MockNode,
	afterId: number,
	capabilities: UserCredentialCCCapabilities,
): number {
	// CC:0083.01.07.11.000: Next UUID MUST be non-zero if there is at least
	// one occupied entry after the requested UUID; MUST be zero if no more.
	for (
		let id = afterId + 1;
		id <= capabilities.numberOfSupportedUsers;
		id++
	) {
		if (getUser(self, id) !== undefined) {
			return id;
		}
	}
	return 0;
}

interface CredentialRef {
	userId: number;
	credentialType: UserCredentialType;
	credentialSlot: number;
}

/** Get all credentials, sorted ascending by credentialType and credentialSlot. */
function getAllCredentials(
	self: MockNode,
	capabilities: UserCredentialCCCapabilities,
): CredentialRef[] {
	const result: CredentialRef[] = [];
	for (const [
		credentialType,
		typeCapabilities,
	] of capabilities.supportedCredentialTypes) {
		for (
			let slot = 1;
			slot <= typeCapabilities.numberOfCredentialSlots;
			slot++
		) {
			const credential = getCredentialByTypeAndSlot(
				self,
				credentialType,
				slot,
			);
			if (credential == undefined) continue;

			result.push({
				userId: credential.userId,
				credentialType,
				credentialSlot: slot,
			});
		}
	}
	return result;
}

/** Get credentials for a specific user, sorted ascending by type then slot. */
function getCredentialsForUser(
	self: MockNode,
	userId: number,
	capabilities: UserCredentialCCCapabilities,
): CredentialRef[] {
	return getAllCredentials(self, capabilities).filter(
		(c) => c.userId === userId,
	);
}

/** Delete all credentials for a specific user. */
function deleteCredentialsForUser(
	self: MockNode,
	userId: number,
	capabilities: UserCredentialCCCapabilities,
): void {
	for (const ref of getCredentialsForUser(self, userId, capabilities)) {
		deleteCredential(
			self,
			ref.userId,
			ref.credentialType,
			ref.credentialSlot,
		);
	}
}

/** Delete all credentials of a specific type across all users. */
function deleteCredentialsForType(
	self: MockNode,
	credentialType: UserCredentialType,
	capabilities: UserCredentialCCCapabilities,
): void {
	for (const ref of getAllCredentials(self, capabilities)) {
		if (ref.credentialType === credentialType) {
			deleteCredential(
				self,
				ref.userId,
				ref.credentialType,
				ref.credentialSlot,
			);
		}
	}
}

/** Delete all credentials of a specific type for a specific user. */
function deleteCredentialsForUserAndType(
	self: MockNode,
	userId: number,
	credentialType: UserCredentialType,
	capabilities: UserCredentialCCCapabilities,
): void {
	for (const ref of getCredentialsForUser(self, userId, capabilities)) {
		if (ref.credentialType === credentialType) {
			deleteCredential(
				self,
				ref.userId,
				ref.credentialType,
				ref.credentialSlot,
			);
		}
	}
}

/** Delete all credentials for all users. */
function deleteAllCredentials(
	self: MockNode,
	capabilities: UserCredentialCCCapabilities,
): void {
	for (const ref of getAllCredentials(self, capabilities)) {
		deleteCredential(
			self,
			ref.userId,
			ref.credentialType,
			ref.credentialSlot,
		);
	}
}

/**
 * Find the next credential after a given position.
 *
 * CC:0083.01.0C.11.024: If the requested user was non-zero and exists, Next
 * Credential fields MUST advertise the next existing credential for that user.
 *
 * CC:0083.01.0C.11.025: If the requested user was zero, Next Credential
 * fields MUST advertise the next existing credential (among all types/users).
 */
function findNextCredential(
	self: MockNode,
	afterType: UserCredentialType,
	afterSlot: number,
	capabilities: UserCredentialCCCapabilities,
	forUserId?: number,
): { nextCredentialType: UserCredentialType; nextCredentialSlot: number } {
	const creds =
		forUserId !== undefined
			? getCredentialsForUser(self, forUserId, capabilities)
			: getAllCredentials(self, capabilities);

	for (const ref of creds) {
		if (
			ref.credentialType > afterType
			|| (ref.credentialType === afterType
				&& ref.credentialSlot > afterSlot)
		) {
			return {
				nextCredentialType: ref.credentialType,
				nextCredentialSlot: ref.credentialSlot,
			};
		}
	}
	// CC:0083.01.0C.11.008: MUST be 0x00 if there are no more credentials
	return {
		nextCredentialType: UserCredentialType.None,
		nextCredentialSlot: 0,
	};
}

type MockSelf = MockNode;

// =============================================================================
// Checksum helpers
// =============================================================================

/**
 * Build the checksum data for a single user (without the UUID prefix).
 *
 * CC:0083.01.17.11.002: UserType(8) | ActiveState(8) | CredentialRule(8) |
 * NameEncoding(8) | NameLength(8) | Name, followed by each credential:
 * CredentialType(8) | CredentialSlot(16) | CredentialLength(8) |
 * CredentialData.
 */
function buildUserChecksumData(
	self: MockSelf,
	userId: number,
	capabilities: UserCredentialCCCapabilities,
): Bytes {
	const user = getUser(self, userId);
	if (!user) return new Bytes();

	const nameBytes = Bytes.from(user.userName, "utf-8");
	const headerLen = 5 + nameBytes.length;
	const header = new Bytes(headerLen);
	header[0] = user.userType;
	header[1] = user.active ? 1 : 0;
	header[2] = user.credentialRule;
	header[3] = user.nameEncoding;
	header[4] = nameBytes.length;
	header.set(nameBytes, 5);

	const parts: Bytes[] = [header];

	// CC:0083.01.15.11.001: Credentials in ascending Credential Type and Slot order
	const creds = getCredentialsForUser(self, userId, capabilities);
	for (const ref of creds) {
		const credState = getCredential(
			self,
			ref.userId,
			ref.credentialType,
			ref.credentialSlot,
		);
		if (!credState) continue;

		const credData = credState.credentialData;
		const credBuf = new Bytes(4 + credData.length);
		credBuf[0] = ref.credentialType;
		credBuf.writeUInt16BE(ref.credentialSlot, 1);
		credBuf[3] = credData.length;
		credBuf.set(credData, 4);
		parts.push(credBuf);
	}

	return Bytes.concat(parts);
}

/**
 * Build the checksum data for a credential type.
 *
 * CC:0083.01.19.11.002: CredentialSlot(16) | CredentialLength(8) |
 * CredentialData in ascending Slot order.
 */
function buildCredentialChecksumData(
	self: MockSelf,
	credentialType: UserCredentialType,
	capabilities: UserCredentialCCCapabilities,
): Bytes {
	const allCreds = getAllCredentials(self, capabilities).filter(
		(c) => c.credentialType === credentialType,
	);

	const parts: Bytes[] = [];
	for (const ref of allCreds) {
		const credState = getCredential(
			self,
			ref.userId,
			ref.credentialType,
			ref.credentialSlot,
		);
		if (!credState) continue;

		const credData = credState.credentialData;
		const buf = new Bytes(3 + credData.length);
		buf.writeUInt16BE(ref.credentialSlot, 0);
		buf[2] = credData.length;
		buf.set(credData, 3);
		parts.push(buf);
	}

	return Bytes.concat(parts);
}

// =============================================================================
// Helper: check for duplicate credentials
// =============================================================================

/** Check if any existing credential of the given type has the same data. */
function isDuplicateCredential(
	self: MockSelf,
	credentialType: UserCredentialType,
	credentialData: Bytes,
	capabilities: UserCredentialCCCapabilities,
	excludeUserId?: number,
	excludeSlot?: number,
): boolean {
	// CC:0083.01.0A.11.018: Duplicate credentials within a Credential Type
	// MUST NOT be allowed.
	const allCreds = getAllCredentials(self, capabilities).filter(
		(c) => c.credentialType === credentialType,
	);
	for (const ref of allCreds) {
		if (
			ref.userId === excludeUserId
			&& ref.credentialSlot === excludeSlot
		) {
			continue;
		}
		const existing = getCredential(
			self,
			ref.userId,
			ref.credentialType,
			ref.credentialSlot,
		);
		if (
			existing
			&& existing.credentialData.length === credentialData.length
			&& existing.credentialData.every((b, i) => b === credentialData[i])
		) {
			return true;
		}
	}
	return false;
}

/** Check if credential data duplicates the admin PIN code. */
function isDuplicateOfAdminCode(
	self: MockSelf,
	credentialData: Bytes,
): boolean {
	// CC:0083.01.0A.11.022: Duplicate Credential Report Type MUST also apply
	// when PIN Code credential data is a duplicate of the Admin Code.
	const adminCode = self.state.get(StateKeys.adminPinCode) as
		| string
		| undefined;
	if (!adminCode || adminCode.length === 0) return false;
	const adminBytes = Bytes.from(adminCode, "ascii");
	return (
		adminBytes.length === credentialData.length
		&& adminBytes.every((b, i) => b === credentialData[i])
	);
}

// =============================================================================
// Behavior: User Capabilities Get → Report
// =============================================================================

// CC:0083.01.01.11.002: The User Capabilities Report MUST be returned in
// response to this command.
const respondToUserCapabilitiesGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCUserCapabilitiesGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);
			const cc = new UserCredentialCCUserCapabilitiesReport({
				nodeId: controller.ownNodeId,
				// CC:0083.01.02.11.000: Number of supported UUIDs MUST NOT be zero
				numberOfSupportedUsers: capabilities.numberOfSupportedUsers,
				// CC:0083.01.02.11.001: MUST support at least one Credential Rule
				supportedCredentialRules: capabilities.supportedCredentialRules,
				// CC:0083.01.02.11.019: Max User Name length MUST be even (UTF-16)
				maxUserNameLength: capabilities.maxUserNameLength,
				supportsUserSchedule:
					capabilities.supportsUserSchedule ?? false,
				supportsAllUsersChecksum:
					capabilities.supportsAllUsersChecksum ?? false,
				supportsUserChecksum:
					capabilities.supportsUserChecksum ?? false,
				// CC:0083.01.02.11.026: At least one encoding MUST be supported
				supportedUserNameEncodings:
					capabilities.supportedUserNameEncodings ?? [
						UserCredentialNameEncoding.ASCII,
					],
				// CC:0083.01.02.11.017: MUST support at least one User Type
				supportedUserTypes: capabilities.supportedUserTypes ?? [
					UserCredentialUserType.General,
				],
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: Credential Capabilities Get → Report
// =============================================================================

// CC:0083.01.03.11.000: The Credential Capabilities Report MUST be returned
// in response to this command.
const respondToCredentialCapabilitiesGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCCredentialCapabilitiesGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);
			const cc = new UserCredentialCCCredentialCapabilitiesReport({
				nodeId: controller.ownNodeId,
				supportsCredentialChecksum:
					capabilities.supportsCredentialChecksum ?? false,
				supportsAdminCode: capabilities.supportsAdminCode ?? false,
				supportsAdminCodeDeactivation:
					capabilities.supportsAdminCodeDeactivation ?? false,
				credentialTypes: capabilities.supportedCredentialTypes,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: Key Locker Capabilities Get → Report (v2)
// =============================================================================

// CC:0083.02.1D.11.000: The Key Locker Capabilities Report MUST be returned
// in response to this command.
const respondToKeyLockerCapabilitiesGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCKeyLockerCapabilitiesGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);
			const cc = new UserCredentialCCKeyLockerCapabilitiesReport({
				nodeId: controller.ownNodeId,
				keyLockerCapabilities:
					capabilities.supportedKeyLockerEntryTypes ?? new Map(),
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: User Get → Report
// =============================================================================

const respondToUserGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCUserGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);
			const requestedUserId = receivedCC.userId;

			let targetUserId: number;
			if (requestedUserId === 0) {
				// CC:0083.01.06.11.003: If UUID is zero, then the first
				// existing UUID MUST be returned.
				const allIds = getAllUserIds(self, capabilities);
				if (allIds.length === 0) {
					// CC:0083.01.06.11.005: If UUID was 0 and there are no
					// existing Users, return Report with Modifier Type DNE
					// and UUID set to 0.
					const cc = new UserCredentialCCUserReport({
						nodeId: controller.ownNodeId,
						reportType: UserCredentialUserReportType.ResponseToGet,
						nextUserId: 0,
						userId: 0,
						modifierType: UserCredentialModifierType.DoesNotExist,
						modifierNodeId: 0,
						userType: UserCredentialUserType.General,
						active: false,
						credentialRule: UserCredentialRule.Single,
						expiringTimeoutMinutes: 0,
						nameEncoding: UserCredentialNameEncoding.ASCII,
						userName: "",
					});
					return { action: "sendCC", cc };
				}
				targetUserId = allIds[0];
			} else {
				targetUserId = requestedUserId;
			}

			const user = getUser(self, targetUserId);
			if (!user) {
				// CC:0083.01.06.11.004: If the specified UUID does not exist,
				// return Report with User Modifier Type "DNE".
				const cc = new UserCredentialCCUserReport({
					nodeId: controller.ownNodeId,
					reportType: UserCredentialUserReportType.ResponseToGet,
					nextUserId: findNextUserId(
						self,
						targetUserId,
						capabilities,
					),
					userId: targetUserId,
					modifierType: UserCredentialModifierType.DoesNotExist,
					modifierNodeId: 0,
					userType: UserCredentialUserType.General,
					active: false,
					credentialRule: UserCredentialRule.Single,
					expiringTimeoutMinutes: 0,
					nameEncoding: UserCredentialNameEncoding.ASCII,
					userName: "",
				});
				return { action: "sendCC", cc };
			}

			const cc = new UserCredentialCCUserReport({
				nodeId: controller.ownNodeId,
				reportType: UserCredentialUserReportType.ResponseToGet,
				nextUserId: findNextUserId(self, targetUserId, capabilities),
				userId: targetUserId,
				modifierType: user.modifierType,
				modifierNodeId: user.modifierNodeId,
				userType: user.userType,
				active: user.active,
				credentialRule: user.credentialRule,
				expiringTimeoutMinutes: user.expiringTimeoutMinutes,
				nameEncoding: user.nameEncoding,
				userName: user.userName,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: User Set
// =============================================================================

const respondToUserSet: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCUserSet)) return;

		const setCC = receivedCC;
		const capabilities = getCapabilities(self, setCC.endpointIndex);
		const userId = setCC.userId;
		const operationType = setCC.operationType;

		// --- Delete operations ---
		if (operationType === UserCredentialOperationType.Delete) {
			if (userId === 0) {
				// CC:0083.01.05.11.007: UUID of 0 with Delete MUST delete all
				// users and their associated credentials and schedules.
				const allIds = getAllUserIds(self, capabilities);
				for (const id of allIds) {
					deleteCredentialsForUser(self, id, capabilities);
					deleteUser(self, id);
				}

				// CC:0083.01.05.11.010: User Report with Type "User(s) Deleted"
				// and UUID of 0x0000 MUST be returned.
				const report = new UserCredentialCCUserReport({
					nodeId: controller.ownNodeId,
					reportType: UserCredentialUserReportType.UserDeleted,
					userId: 0,
					modifierType: UserCredentialModifierType.ZWave,
					modifierNodeId: controller.ownNodeId,
					userType: UserCredentialUserType.General,
					active: false,
					credentialRule: UserCredentialRule.Single,
					expiringTimeoutMinutes: 0,
					nameEncoding: UserCredentialNameEncoding.ASCII,
					userName: "",
				});
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "ok" };
			}

			// CC:0083.01.05.11.014: If UUID > max advertised, MUST ignore
			if (userId > capabilities.numberOfSupportedUsers) {
				return { action: "fail" };
			}

			// CC:0083.01.05.11.002: Delete MUST delete all Credentials and
			// schedules associated with the user.
			deleteCredentialsForUser(self, userId, capabilities);
			deleteUser(self, userId);

			// CC:0083.01.05.11.013: User Report with Type "User(s) Deleted"
			// MUST be returned.
			const report = new UserCredentialCCUserReport({
				nodeId: controller.ownNodeId,
				reportType: UserCredentialUserReportType.UserDeleted,
				userId,
				modifierType: UserCredentialModifierType.ZWave,
				modifierNodeId: controller.ownNodeId,
				userType: UserCredentialUserType.General,
				active: false,
				credentialRule: UserCredentialRule.Single,
				expiringTimeoutMinutes: 0,
				nameEncoding: UserCredentialNameEncoding.ASCII,
				userName: "",
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "ok" };
		}

		// --- Add / Modify validation ---

		// CC:0083.01.05.11.015: If UUID is zero for Add/Modify, MUST ignore
		if (userId === 0) {
			return { action: "fail" };
		}

		// CC:0083.01.05.11.014: If UUID > max advertised, MUST ignore
		if (userId > capabilities.numberOfSupportedUsers) {
			return { action: "fail" };
		}

		// CC:0083.01.05.11.030: If User Type not advertised as supported,
		// MUST ignore
		const userType = setCC.userType ?? UserCredentialUserType.General;
		if (!(capabilities.supportedUserTypes ?? []).includes(userType)) {
			return { action: "fail" };
		}

		// CC:0083.01.05.11.039: If Credential Rule not advertised as
		// supported, MUST ignore
		const credentialRule =
			setCC.credentialRule ?? UserCredentialRule.Single;
		if (!capabilities.supportedCredentialRules.includes(credentialRule)) {
			return { action: "fail" };
		}

		// CC:0083.01.05.11.056: If User Name Encoding is not advertised as
		// supported, MUST ignore
		const nameEncoding =
			setCC.nameEncoding ?? UserCredentialNameEncoding.ASCII;
		if (
			!(capabilities.supportedUserNameEncodings ?? []).includes(
				nameEncoding,
			)
		) {
			return { action: "fail" };
		}

		const existingUser = getUser(self, userId);

		if (operationType === UserCredentialOperationType.Add) {
			if (existingUser) {
				// User already occupied — reject with UserAddRejectedLocationOccupied
				const report = new UserCredentialCCUserReport({
					nodeId: controller.ownNodeId,
					reportType:
						UserCredentialUserReportType.UserAddRejectedLocationOccupied,
					userId,
					modifierType: existingUser.modifierType,
					modifierNodeId: existingUser.modifierNodeId,
					userType: existingUser.userType,
					active: existingUser.active,
					credentialRule: existingUser.credentialRule,
					expiringTimeoutMinutes: existingUser.expiringTimeoutMinutes,
					nameEncoding: existingUser.nameEncoding,
					userName: existingUser.userName,
				});
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "fail" };
			}
		} else if (operationType === UserCredentialOperationType.Modify) {
			if (!existingUser) {
				// User empty — reject with UserModifyRejectedLocationEmpty
				const report = new UserCredentialCCUserReport({
					nodeId: controller.ownNodeId,
					reportType:
						UserCredentialUserReportType.UserModifyRejectedLocationEmpty,
					userId,
					modifierType: UserCredentialModifierType.DoesNotExist,
					modifierNodeId: 0,
					userType: UserCredentialUserType.General,
					active: false,
					credentialRule: UserCredentialRule.Single,
					expiringTimeoutMinutes: 0,
					nameEncoding: UserCredentialNameEncoding.ASCII,
					userName: "",
				});
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "fail" };
			}
		}

		// CC:0083.01.05.11.042: If User Type is Expiring, Expiring Timeout
		// Minutes MUST be non-zero.
		const active = setCC.active ?? true;
		let expiringTimeoutMinutes = setCC.expiringTimeoutMinutes ?? 0;
		if (
			userType === UserCredentialUserType.Expiring
			&& expiringTimeoutMinutes === 0
		) {
			const report = new UserCredentialCCUserReport({
				nodeId: controller.ownNodeId,
				reportType:
					UserCredentialUserReportType.ZeroExpiringMinutesInvalid,
				userId,
				modifierType:
					existingUser?.modifierType
					?? UserCredentialModifierType.DoesNotExist,
				modifierNodeId: existingUser?.modifierNodeId ?? 0,
				userType:
					existingUser?.userType ?? UserCredentialUserType.General,
				active: existingUser?.active ?? false,
				credentialRule:
					existingUser?.credentialRule ?? UserCredentialRule.Single,
				expiringTimeoutMinutes:
					existingUser?.expiringTimeoutMinutes ?? 0,
				nameEncoding:
					existingUser?.nameEncoding
					?? UserCredentialNameEncoding.ASCII,
				userName: existingUser?.userName ?? "",
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// CC:0083.01.05.11.053: For non-Expiring user types, Expiring Timeout
		// Minutes MUST be set to zero and MUST be ignored.
		if (userType !== UserCredentialUserType.Expiring) {
			expiringTimeoutMinutes = 0;
		}

		// CC:0083.01.05.13.047: User Name MAY be truncated if too long
		let userName = setCC.userName ?? "";
		if (userName.length > capabilities.maxUserNameLength) {
			userName = userName.slice(0, capabilities.maxUserNameLength);
		}

		// CC:0083.01.05.12.052: Default user name SHOULD be "User-{UUID}"
		if (userName.length === 0) {
			userName = `User-${userId}`;
		}

		const newUser: UserState = {
			userType,
			active,
			credentialRule,
			expiringTimeoutMinutes,
			nameEncoding,
			userName,
			// CC:0083.01.07.11.008: When User Modifier Type is Z-Wave,
			// Modifier Node ID MUST be the sending node's ID.
			modifierType: UserCredentialModifierType.ZWave,
			modifierNodeId: controller.ownNodeId,
		};

		// CC:0083.01.07.11.007: If data identical, send UserUnchanged
		if (existingUser) {
			if (
				existingUser.userType === newUser.userType
				&& existingUser.active === newUser.active
				&& existingUser.credentialRule === newUser.credentialRule
				&& existingUser.expiringTimeoutMinutes
					=== newUser.expiringTimeoutMinutes
				&& existingUser.nameEncoding === newUser.nameEncoding
				&& existingUser.userName === newUser.userName
			) {
				// CC:0083.01.07.11.006: If no user data is modified,
				// Modifier Type and Node ID MUST remain unchanged.
				const report = new UserCredentialCCUserReport({
					nodeId: controller.ownNodeId,
					reportType: UserCredentialUserReportType.UserUnchanged,
					userId,
					modifierType: existingUser.modifierType,
					modifierNodeId: existingUser.modifierNodeId,
					userType: existingUser.userType,
					active: existingUser.active,
					credentialRule: existingUser.credentialRule,
					expiringTimeoutMinutes: existingUser.expiringTimeoutMinutes,
					nameEncoding: existingUser.nameEncoding,
					userName: existingUser.userName,
				});
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "ok" };
			}
		}

		setUser(self, userId, newUser);

		const reportType =
			operationType === UserCredentialOperationType.Add
				? // CC:0083.01.05.11.011: User Report with Type "User Added" MUST be
					// returned to sender and sent to lifeline.
					UserCredentialUserReportType.UserAdded
				: // CC:0083.01.05.11.012: User Report with Type "User Modified" MUST
					// be returned to sender and sent to lifeline.
					UserCredentialUserReportType.UserModified;

		const report = new UserCredentialCCUserReport({
			nodeId: controller.ownNodeId,
			reportType,
			userId,
			modifierType: newUser.modifierType,
			modifierNodeId: newUser.modifierNodeId,
			userType: newUser.userType,
			active: newUser.active,
			credentialRule: newUser.credentialRule,
			expiringTimeoutMinutes: newUser.expiringTimeoutMinutes,
			nameEncoding: newUser.nameEncoding,
			userName: newUser.userName,
		});
		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Behavior: Credential Get → Report
// =============================================================================

const respondToCredentialGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCCredentialGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);
			const reqUserId = receivedCC.userId;
			const reqType = receivedCC.credentialType;
			const reqSlot = receivedCC.credentialSlot;

			// Determine Credential Read-Back flag for a given type
			// CC:0083.01.0C.11.021: If max hash length is 0, CRB MUST be 1
			// CC:0083.01.0C.11.001: CRB MUST always be same within a type
			const getCRB = (credentialType: UserCredentialType): boolean => {
				const typeCaps =
					capabilities.supportedCredentialTypes.get(credentialType);
				if (!typeCaps) return false;
				return typeCaps.maxCredentialHashLength === 0;
			};

			// Helper to create an empty credential report
			const emptyReport = (
				userId: number,
				credentialType: UserCredentialType,
				credentialSlot: number,
				nextType: UserCredentialType,
				nextSlot: number,
			) => {
				const credentialReadBack = getCRB(credentialType);
				return new UserCredentialCCCredentialReport({
					nodeId: controller.ownNodeId,
					reportType:
						UserCredentialCredentialReportType.ResponseToGet,
					userId,
					credentialType,
					credentialSlot,
					...(credentialReadBack
						? {
								credentialReadBack: true,
								credentialData: new Bytes(),
							}
						: { credentialReadBack: false }),
					modifierType: UserCredentialModifierType.DoesNotExist,
					modifierNodeId: 0,
					nextCredentialType: nextType,
					nextCredentialSlot: nextSlot,
				});
			};

			// Helper to create a populated credential report
			const populatedReport = (
				ref: CredentialRef,
				credState: CredentialState,
				nextType: UserCredentialType,
				nextSlot: number,
			) => {
				const credentialReadBack = getCRB(ref.credentialType);
				return new UserCredentialCCCredentialReport({
					nodeId: controller.ownNodeId,
					reportType:
						UserCredentialCredentialReportType.ResponseToGet,
					// CC:0083.01.0C.11.010: UUID MUST be set to the User
					// associated with this credential.
					userId: ref.userId,
					credentialType: ref.credentialType,
					credentialSlot: ref.credentialSlot,
					...(credentialReadBack
						? {
								credentialReadBack: true,
								credentialData: credState.credentialData,
							}
						: { credentialReadBack: false }),
					modifierType: credState.modifierType,
					modifierNodeId: credState.modifierNodeId,
					nextCredentialType: nextType,
					nextCredentialSlot: nextSlot,
				});
			};

			// Find the first credential matching a filter predicate
			const findFirst = (
				filter: (ref: CredentialRef) => boolean,
			): CredentialRef | undefined => {
				return getAllCredentials(self, capabilities).find(filter);
			};

			// Determine scoping for next-credential iteration based on
			// whether the request specified a user
			const scopedUserId = reqUserId !== 0 ? reqUserId : undefined;

			// 7 cases based on userId/type/slot being zero or non-zero
			// CC:0083.01.0B.11.006: Other combinations are invalid → ignore

			if (reqUserId !== 0 && reqType !== 0 && reqSlot !== 0) {
				// CC:0083.01.0B.11.003: All non-zero → return specific credential
				const cred = getCredential(self, reqUserId, reqType, reqSlot);
				const next = findNextCredential(
					self,
					reqType,
					reqSlot,
					capabilities,
					scopedUserId,
				);
				if (!cred) {
					// CC:0083.01.0B.11.004: No credential exists → length zero
					return {
						action: "sendCC",
						cc: emptyReport(
							reqUserId,
							reqType,
							reqSlot,
							next.nextCredentialType,
							next.nextCredentialSlot,
						),
					};
				}
				return {
					action: "sendCC",
					cc: populatedReport(
						{
							userId: reqUserId,
							credentialType: reqType,
							credentialSlot: reqSlot,
						},
						cred,
						next.nextCredentialType,
						next.nextCredentialSlot,
					),
				};
			} else if (reqUserId === 0 && reqType !== 0 && reqSlot !== 0) {
				// CC:0083.01.0B.11.008: userId=0, type≠0, slot≠0 →
				// return credential by type+slot regardless of user
				const ref = findFirst(
					(r) =>
						r.credentialType === reqType
						&& r.credentialSlot === reqSlot,
				);
				const next = findNextCredential(
					self,
					reqType,
					reqSlot,
					capabilities,
					scopedUserId,
				);
				if (!ref) {
					// CC:0083.01.0B.11.009: No credential → length zero
					return {
						action: "sendCC",
						cc: emptyReport(
							0,
							reqType,
							reqSlot,
							next.nextCredentialType,
							next.nextCredentialSlot,
						),
					};
				}
				const cred = getCredential(
					self,
					ref.userId,
					ref.credentialType,
					ref.credentialSlot,
				)!;
				return {
					action: "sendCC",
					cc: populatedReport(
						ref,
						cred,
						next.nextCredentialType,
						next.nextCredentialSlot,
					),
				};
			} else if (reqUserId !== 0 && reqType !== 0 && reqSlot === 0) {
				// CC:0083.01.0B.11.010: userId≠0, type≠0, slot=0 →
				// first credential for user+type
				const ref = findFirst(
					(r) =>
						r.userId === reqUserId && r.credentialType === reqType,
				);
				if (!ref) {
					// CC:0083.01.0B.11.012: No credential → length zero
					// CC:0083.01.0C.11.022: If user doesn't exist, next
					// fields MUST be zero
					const userExists = getUser(self, reqUserId) !== undefined;
					const next = userExists
						? findNextCredential(
								self,
								reqType,
								0,
								capabilities,
								scopedUserId,
							)
						: {
								nextCredentialType: UserCredentialType.None,
								nextCredentialSlot: 0,
							};
					return {
						action: "sendCC",
						cc: emptyReport(
							reqUserId,
							reqType,
							0,
							next.nextCredentialType,
							next.nextCredentialSlot,
						),
					};
				}
				const cred = getCredential(
					self,
					ref.userId,
					ref.credentialType,
					ref.credentialSlot,
				)!;
				const next = findNextCredential(
					self,
					ref.credentialType,
					ref.credentialSlot,
					capabilities,
					scopedUserId,
				);
				return {
					action: "sendCC",
					cc: populatedReport(
						ref,
						cred,
						next.nextCredentialType,
						next.nextCredentialSlot,
					),
				};
			} else if (reqUserId !== 0 && reqType === 0 && reqSlot === 0) {
				// CC:0083.01.0B.11.005: userId≠0, type=0, slot=0 →
				// first credential for user (any type)
				const ref = findFirst((r) => r.userId === reqUserId);
				if (!ref) {
					const userExists = getUser(self, reqUserId) !== undefined;
					const next = userExists
						? findNextCredential(
								self,
								UserCredentialType.None,
								0,
								capabilities,
								scopedUserId,
							)
						: {
								nextCredentialType: UserCredentialType.None,
								nextCredentialSlot: 0,
							};
					return {
						action: "sendCC",
						cc: emptyReport(
							reqUserId,
							UserCredentialType.None,
							0,
							next.nextCredentialType,
							next.nextCredentialSlot,
						),
					};
				}
				const cred = getCredential(
					self,
					ref.userId,
					ref.credentialType,
					ref.credentialSlot,
				)!;
				const next = findNextCredential(
					self,
					ref.credentialType,
					ref.credentialSlot,
					capabilities,
					scopedUserId,
				);
				return {
					action: "sendCC",
					cc: populatedReport(
						ref,
						cred,
						next.nextCredentialType,
						next.nextCredentialSlot,
					),
				};
			} else if (reqUserId === 0 && reqType !== 0 && reqSlot === 0) {
				// CC:0083.01.0B.11.007: userId=0, type≠0, slot=0 →
				// first credential of type globally
				const ref = findFirst((r) => r.credentialType === reqType);
				if (!ref) {
					const next = findNextCredential(
						self,
						reqType,
						0,
						capabilities,
						scopedUserId,
					);
					return {
						action: "sendCC",
						cc: emptyReport(
							0,
							reqType,
							0,
							next.nextCredentialType,
							next.nextCredentialSlot,
						),
					};
				}
				const cred = getCredential(
					self,
					ref.userId,
					ref.credentialType,
					ref.credentialSlot,
				)!;
				const next = findNextCredential(
					self,
					ref.credentialType,
					ref.credentialSlot,
					capabilities,
					scopedUserId,
				);
				return {
					action: "sendCC",
					cc: populatedReport(
						ref,
						cred,
						next.nextCredentialType,
						next.nextCredentialSlot,
					),
				};
			} else if (reqUserId === 0 && reqType === 0 && reqSlot === 0) {
				// CC:0083.01.0B.11.011: All zero → first credential overall
				const ref = findFirst(() => true);
				if (!ref) {
					return {
						action: "sendCC",
						cc: emptyReport(
							0,
							UserCredentialType.None,
							0,
							UserCredentialType.None,
							0,
						),
					};
				}
				const cred = getCredential(
					self,
					ref.userId,
					ref.credentialType,
					ref.credentialSlot,
				)!;
				const next = findNextCredential(
					self,
					ref.credentialType,
					ref.credentialSlot,
					capabilities,
					scopedUserId,
				);
				return {
					action: "sendCC",
					cc: populatedReport(
						ref,
						cred,
						next.nextCredentialType,
						next.nextCredentialSlot,
					),
				};
			}

			// CC:0083.01.0B.11.006: Other combinations are invalid → ignore
		}
	},
};

// =============================================================================
// Behavior: Credential Set
// =============================================================================

const respondToCredentialSet: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCCredentialSet)) return;

		const setCC = receivedCC;
		const capabilities = getCapabilities(self, setCC.endpointIndex);
		const userId = setCC.userId;
		const credentialType = setCC.credentialType;
		const credentialSlot = setCC.credentialSlot;
		const operationType = setCC.operationType;
		const credentialData = setCC.credentialData ?? new Bytes();

		// CC:0083.01.0C.11.021: CRB based on maxCredentialHashLength
		const typeCaps =
			capabilities.supportedCredentialTypes.get(credentialType);
		const getCRB = (type: UserCredentialType): boolean => {
			const tc = capabilities.supportedCredentialTypes.get(type);
			return tc ? tc.maxCredentialHashLength === 0 : false;
		};

		// Helper to build a credential report for Set responses
		const makeReport = (
			reportType: Exclude<
				UserCredentialCredentialReportType,
				UserCredentialCredentialReportType.ResponseToGet
			>,
			rUserId: number,
			rType: UserCredentialType,
			rSlot: number,
			rData: Bytes,
			rModType: UserCredentialModifierType,
			rModNode: number,
		) => {
			const credentialReadBack = getCRB(rType);
			return new UserCredentialCCCredentialReport({
				nodeId: controller.ownNodeId,
				reportType,
				userId: rUserId,
				credentialType: rType,
				credentialSlot: rSlot,
				...(credentialReadBack
					? { credentialReadBack: true, credentialData: rData }
					: { credentialReadBack: false }),
				modifierType: rModType,
				modifierNodeId: rModNode,
			});
		};

		// --- Delete operations ---
		if (operationType === UserCredentialOperationType.Delete) {
			// CC:0083.01.0A.11.008: Delete cascading based on userId/type/slot
			if (userId === 0 && credentialType === 0 && credentialSlot === 0) {
				// Delete ALL credentials for all users
				deleteAllCredentials(self, capabilities);
			} else if (
				userId === 0
				&& credentialType !== 0
				&& credentialSlot === 0
			) {
				// Delete all credentials of type for all users
				deleteCredentialsForType(self, credentialType, capabilities);
			} else if (
				userId !== 0
				&& credentialType === 0
				&& credentialSlot === 0
			) {
				// Delete all credentials for user
				deleteCredentialsForUser(self, userId, capabilities);
			} else if (
				userId !== 0
				&& credentialType !== 0
				&& credentialSlot === 0
			) {
				// Delete all credentials of type for user
				deleteCredentialsForUserAndType(
					self,
					userId,
					credentialType,
					capabilities,
				);
			} else if (
				userId !== 0
				&& credentialType !== 0
				&& credentialSlot !== 0
			) {
				// Delete specific credential
				deleteCredential(self, userId, credentialType, credentialSlot);
			} else {
				// Invalid combination for delete
				return { action: "fail" };
			}

			// CC:0083.01.0A.11.010–013: Credential Report with Type
			// "Credential Deleted" MUST be returned.
			const report = makeReport(
				UserCredentialCredentialReportType.CredentialDeleted,
				userId,
				credentialType,
				credentialSlot,
				new Bytes(),
				UserCredentialModifierType.ZWave,
				controller.ownNodeId,
			);
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "ok" };
		}

		// --- Add / Modify validation ---

		// CC:0083.01.0A.11.002: If Credential Type not supported, MUST ignore
		if (!typeCaps) {
			return { action: "fail" };
		}

		// CC:0083.01.0A.11.005: If Credential Slot is zero for non-Delete,
		// MUST ignore
		if (credentialSlot === 0) {
			return { action: "fail" };
		}

		// CC:0083.01.0A.11.004: If Credential Slot out of range, MUST ignore
		if (credentialSlot > typeCaps.numberOfCredentialSlots) {
			return { action: "fail" };
		}

		// CC:0083.01.0A.11.023: If min and max Length are both 0, Add/Modify
		// through Credential Set MUST be ignored.
		if (
			typeCaps.minCredentialLength === 0
			&& typeCaps.maxCredentialLength === 0
		) {
			return { action: "fail" };
		}

		// CC:0083.01.0A.11.014: Credential data length MUST NOT exceed max
		if (credentialData.length > typeCaps.maxCredentialLength) {
			return { action: "fail" };
		}

		// CC:0083.01.0A.11.015: Credential data length MUST NOT be less than min
		if (credentialData.length < typeCaps.minCredentialLength) {
			return { action: "fail" };
		}

		const existingCred = getCredential(
			self,
			userId,
			credentialType,
			credentialSlot,
		);
		const occupiedCred = getCredentialByTypeAndSlot(
			self,
			credentialType,
			credentialSlot,
		);

		// Verify the user exists for Add/Modify
		const user = getUser(self, userId);
		if (!user) {
			// User doesn't exist — reject with WrongUserUniqueIdentifier
			const report = makeReport(
				UserCredentialCredentialReportType.WrongUserUniqueIdentifier,
				userId,
				credentialType,
				credentialSlot,
				new Bytes(),
				UserCredentialModifierType.DoesNotExist,
				0,
			);
			// CC:0083.01.00.41.017: Supervision MUST be Fail on rejection
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		if (operationType === UserCredentialOperationType.Add) {
			if (occupiedCred) {
				// Slot occupied — reject
				const report = makeReport(
					UserCredentialCredentialReportType.CredentialAddRejectedLocationOccupied,
					occupiedCred.userId,
					credentialType,
					credentialSlot,
					occupiedCred.credentialData,
					occupiedCred.modifierType,
					occupiedCred.modifierNodeId,
				);
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "fail" };
			}
		} else if (operationType === UserCredentialOperationType.Modify) {
			if (!occupiedCred) {
				// Slot empty — reject
				const report = makeReport(
					UserCredentialCredentialReportType.CredentialModifyRejectedLocationEmpty,
					userId,
					credentialType,
					credentialSlot,
					new Bytes(),
					UserCredentialModifierType.DoesNotExist,
					0,
				);
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "fail" };
			}
			if (occupiedCred.userId !== userId) {
				const report = makeReport(
					UserCredentialCredentialReportType.WrongUserUniqueIdentifier,
					occupiedCred.userId,
					credentialType,
					credentialSlot,
					occupiedCred.credentialData,
					occupiedCred.modifierType,
					occupiedCred.modifierNodeId,
				);
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "fail" };
			}
		}

		// CC:0083.01.0A.11.018: Duplicate credentials within a type MUST NOT
		// be allowed.
		if (
			isDuplicateCredential(
				self,
				credentialType,
				credentialData,
				capabilities,
				userId,
				credentialSlot,
			)
		) {
			const report = makeReport(
				UserCredentialCredentialReportType.DuplicateCredential,
				userId,
				credentialType,
				credentialSlot,
				existingCred?.credentialData ?? new Bytes(),
				existingCred?.modifierType
					?? UserCredentialModifierType.DoesNotExist,
				existingCred?.modifierNodeId ?? 0,
			);
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// CC:0083.01.0A.11.022: PIN Code credential must not duplicate the
		// Admin Code.
		if (
			credentialType === UserCredentialType.PINCode
			&& isDuplicateOfAdminCode(self, credentialData)
		) {
			const report = makeReport(
				UserCredentialCredentialReportType.DuplicateAdminPINCode,
				userId,
				credentialType,
				credentialSlot,
				existingCred?.credentialData ?? new Bytes(),
				existingCred?.modifierType
					?? UserCredentialModifierType.DoesNotExist,
				existingCred?.modifierNodeId ?? 0,
			);
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// CC:0083.01.0C.11.013: If credential data is already identical,
		// send CredentialUnchanged.
		if (existingCred) {
			if (
				existingCred.credentialData.length === credentialData.length
				&& existingCred.credentialData.every(
					(b, i) => b === credentialData[i],
				)
			) {
				// CC:0083.01.0C.11.014: If no data modified, Modifier Type
				// and Node ID MUST remain unchanged.
				const report = makeReport(
					UserCredentialCredentialReportType.CredentialUnchanged,
					userId,
					credentialType,
					credentialSlot,
					existingCred.credentialData,
					existingCred.modifierType,
					existingCred.modifierNodeId,
				);
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "ok" };
			}
		}

		// Store the credential
		const newCred: CredentialState = {
			userId,
			credentialData,
			// CC:0083.01.0C.11.030: When Modifier Type is Z-Wave, Node ID
			// MUST be the sending node's ID.
			modifierType: UserCredentialModifierType.ZWave,
			modifierNodeId: controller.ownNodeId,
		};
		setCredential(self, userId, credentialType, credentialSlot, newCred);

		const reportType =
			operationType === UserCredentialOperationType.Add
				? // CC:0083.01.0A.11.011: Credential Report "Credential Added"
					UserCredentialCredentialReportType.CredentialAdded
				: // CC:0083.01.0A.11.012: Credential Report "Credential Modified"
					UserCredentialCredentialReportType.CredentialModified;

		const report = makeReport(
			reportType,
			userId,
			credentialType,
			credentialSlot,
			credentialData,
			newCred.modifierType,
			newCred.modifierNodeId,
		);
		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Behavior: Admin PIN Code Get → Report
// =============================================================================

const respondToAdminPinCodeGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCAdminPinCodeGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);

			// CC:0083.01.1B.13.001: If AC NOT supported, MAY ignore
			if (!capabilities.supportsAdminCode) {
				return { action: "stop" };
			}

			const adminCode =
				(self.state.get(StateKeys.adminPinCode) as string) ?? "";

			// CC:0083.01.1B.11.001: Admin PIN Code Report with appropriate
			// Result Code MUST be returned.
			const cc = new UserCredentialCCAdminPinCodeReport({
				nodeId: controller.ownNodeId,
				operationResult:
					UserCredentialAdminCodeOperationResult.ResponseToGet,
				// CC:0083.01.1C.11.005: Length MUST be 0 if deactivated
				pinCode: adminCode,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: Admin PIN Code Set
// =============================================================================

const respondToAdminPinCodeSet: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCAdminPinCodeSet)) return;

		const setCC = receivedCC;
		const capabilities = getCapabilities(self, setCC.endpointIndex);

		// CC:0083.01.1A.13.002: If AC NOT supported, MAY ignore
		if (!capabilities.supportsAdminCode) {
			return { action: "fail" };
		}

		const pinCode = setCC.pinCode;

		// CC:0083.01.1A.11.006: Length of 0 MUST deactivate Admin Code if
		// ACD is supported.
		if (pinCode.length === 0) {
			if (capabilities.supportsAdminCodeDeactivation) {
				self.state.set(StateKeys.adminPinCode, "");
				const report = new UserCredentialCCAdminPinCodeReport({
					nodeId: controller.ownNodeId,
					operationResult:
						UserCredentialAdminCodeOperationResult.Modified,
					pinCode: "",
				});
				await self.sendToController(
					createMockZWaveRequestFrame(report, {
						ackRequested: false,
					}),
				);
				return { action: "ok" };
			}
			// CC:0083.01.1A.13.003: If ACD not supported, MAY ignore
			return { action: "fail" };
		}

		// CC:0083.01.1A.11.015: Length MUST be within min..max of PIN Code type
		// CC:0083.01.00.11.005: If Admin Code supported, PIN Code MUST be supported
		const pinCaps = capabilities.supportedCredentialTypes.get(
			UserCredentialType.PINCode,
		);
		if (pinCaps) {
			if (
				pinCode.length < pinCaps.minCredentialLength
				|| pinCode.length > pinCaps.maxCredentialLength
			) {
				// CC:0083.01.1A.11.012: Invalid length MUST ignore
				return { action: "fail" };
			}
		}

		// CC:0083.01.1A.13.004: Identical to current → Unmodified
		const currentCode =
			(self.state.get(StateKeys.adminPinCode) as string) ?? "";
		if (pinCode === currentCode) {
			const report = new UserCredentialCCAdminPinCodeReport({
				nodeId: controller.ownNodeId,
				operationResult:
					UserCredentialAdminCodeOperationResult.Unmodified,
				pinCode: currentCode,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "ok" };
		}

		// CC:0083.01.1A.13.005: Duplicate of existing PIN credential →
		// FailDuplicateCredential
		const pinBytes = Bytes.from(pinCode, "ascii");
		if (
			isDuplicateCredential(
				self,
				UserCredentialType.PINCode,
				pinBytes,
				capabilities,
			)
		) {
			const report = new UserCredentialCCAdminPinCodeReport({
				nodeId: controller.ownNodeId,
				operationResult:
					UserCredentialAdminCodeOperationResult.FailDuplicateCredential,
				pinCode: currentCode,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// CC:0083.01.1A.11.001: Modified successfully
		self.state.set(StateKeys.adminPinCode, pinCode);
		const report = new UserCredentialCCAdminPinCodeReport({
			nodeId: controller.ownNodeId,
			operationResult: UserCredentialAdminCodeOperationResult.Modified,
			pinCode,
		});
		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Behavior: All Users Checksum Get → Report
// =============================================================================

// CC:0083.01.14.11.000: This command MUST be ignored if All Users Checksum
// is not supported.
// CC:0083.01.14.11.001: The All Users Checksum Report MUST be returned.
const respondToAllUsersChecksumGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCAllUsersChecksumGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);

			if (!capabilities.supportsAllUsersChecksum) {
				return { action: "stop" };
			}

			const allUserIds = getAllUserIds(self, capabilities);
			if (allUserIds.length === 0) {
				// CC:0083.01.15.11.006: No users → checksum 0x0000
				const cc = new UserCredentialCCAllUsersChecksumReport({
					nodeId: controller.ownNodeId,
					checksum: 0x0000,
				});
				return { action: "sendCC", cc };
			}

			// CC:0083.01.15.11.000: CRC-CCITT with init 0x1D0F, poly 0x1021
			// CC:0083.01.15.11.001: Concatenate per-user data in ascending UUID
			// CC:0083.01.15.11.011: Admin Code NOT included
			let checksumData = new Bytes();
			for (const userId of allUserIds) {
				// CC:0083.01.15.11.002: UUID(16) | UserType(8) | ...
				const uuidBuf = new Bytes(2);
				uuidBuf.writeUInt16BE(userId, 0);
				const userData = buildUserChecksumData(
					self,
					userId,
					capabilities,
				);
				checksumData = Bytes.concat([checksumData, uuidBuf, userData]);
			}

			const checksum =
				checksumData.length > 0 ? CRC16_CCITT(checksumData) : 0x0000;

			const cc = new UserCredentialCCAllUsersChecksumReport({
				nodeId: controller.ownNodeId,
				checksum,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: User Checksum Get → Report
// =============================================================================

// CC:0083.01.16.11.000: MUST be ignored if User Checksum not supported.
// CC:0083.01.16.11.001: User Checksum Report MUST be returned.
const respondToUserChecksumGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCUserChecksumGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);

			if (!capabilities.supportsUserChecksum) {
				return { action: "stop" };
			}

			const userId = receivedCC.userId;

			// CC:0083.01.17.11.006: If no User data for UUID → 0x0000
			const user = getUser(self, userId);
			if (!user) {
				const cc = new UserCredentialCCUserChecksumReport({
					nodeId: controller.ownNodeId,
					userId,
					checksum: 0x0000,
				});
				return { action: "sendCC", cc };
			}

			// CC:0083.01.17.11.000: CRC-CCITT with init 0x1D0F, poly 0x1021
			const data = buildUserChecksumData(self, userId, capabilities);
			const checksum = data.length > 0 ? CRC16_CCITT(data) : 0x0000;

			const cc = new UserCredentialCCUserChecksumReport({
				nodeId: controller.ownNodeId,
				userId,
				checksum,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: Credential Checksum Get → Report
// =============================================================================

// CC:0083.01.18.11.000: MUST be ignored if Credential Checksum not supported.
// CC:0083.01.18.11.001: Credential Checksum Report MUST be returned.
const respondToCredentialChecksumGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCCredentialChecksumGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);

			if (!capabilities.supportsCredentialChecksum) {
				return { action: "stop" };
			}

			const credentialType = receivedCC.credentialType;

			// CC:0083.01.19.11.001: CRC-CCITT with init 0x1D0F, poly 0x1021
			const data = buildCredentialChecksumData(
				self,
				credentialType,
				capabilities,
			);

			// CC:0083.01.19.11.006: No credentials → 0x0000
			const checksum = data.length > 0 ? CRC16_CCITT(data) : 0x0000;

			const cc = new UserCredentialCCCredentialChecksumReport({
				nodeId: controller.ownNodeId,
				credentialType,
				checksum,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: User Credential Association Set → Report
// =============================================================================

const respondToUserCredentialAssociationSet: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCAssociationSet)) return;

		const setCC = receivedCC;
		const capabilities = getCapabilities(self, setCC.endpointIndex);
		const credentialType = setCC.credentialType;
		const credentialSlot = setCC.credentialSlot;
		const destinationUserId = setCC.destinationUserId;

		// Validate credential type
		if (!capabilities.supportedCredentialTypes.has(credentialType)) {
			// CC:0083.01.13.11.000: Status 0x01 = Type Invalid
			const report = new UserCredentialCCAssociationReport({
				nodeId: controller.ownNodeId,
				credentialType,
				credentialSlot,
				destinationUserId,
				status: 0x01,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// Validate credential slot range
		const typeCaps =
			capabilities.supportedCredentialTypes.get(credentialType)!;
		if (
			credentialSlot === 0
			|| credentialSlot > typeCaps.numberOfCredentialSlots
		) {
			// Status 0x02 = Slot Invalid
			const report = new UserCredentialCCAssociationReport({
				nodeId: controller.ownNodeId,
				credentialType,
				credentialSlot,
				destinationUserId,
				status: 0x02,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// Find the credential (search across all users for type+slot)
		const allCreds = getAllCredentials(self, capabilities);
		const credRef = allCreds.find(
			(c) =>
				c.credentialType === credentialType
				&& c.credentialSlot === credentialSlot,
		);

		if (!credRef) {
			// Status 0x03 = Slot Empty
			const report = new UserCredentialCCAssociationReport({
				nodeId: controller.ownNodeId,
				credentialType,
				credentialSlot,
				destinationUserId,
				status: 0x03,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// Validate destination user
		if (
			destinationUserId === 0
			|| destinationUserId > capabilities.numberOfSupportedUsers
		) {
			// Status 0x04 = Destination UUID Invalid
			const report = new UserCredentialCCAssociationReport({
				nodeId: controller.ownNodeId,
				credentialType,
				credentialSlot,
				destinationUserId,
				status: 0x04,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// CC:0083.01.12.11.007: If Destination UUID does not reference an
		// existing UUID, reject and MUST NOT change data.
		const destUser = getUser(self, destinationUserId);
		if (!destUser) {
			// Status 0x05 = Destination UUID Nonexistent
			const report = new UserCredentialCCAssociationReport({
				nodeId: controller.ownNodeId,
				credentialType,
				credentialSlot,
				destinationUserId,
				status: 0x05,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "fail" };
		}

		// Move: delete from source user, add to destination user
		const credState = getCredentialByTypeAndSlot(
			self,
			credentialType,
			credentialSlot,
		)!;
		setCredential(self, destinationUserId, credentialType, credentialSlot, {
			credentialData: credState.credentialData,
			modifierType: UserCredentialModifierType.ZWave,
			modifierNodeId: controller.ownNodeId,
		});

		// CC:0083.01.13.11.000: Status 0x00 = Success
		// CC:0083.01.13.11.002: MUST also be sent to Lifeline
		const report = new UserCredentialCCAssociationReport({
			nodeId: controller.ownNodeId,
			credentialType,
			credentialSlot,
			destinationUserId,
			status: 0x00,
		});
		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Behavior: Credential Learn Start — stub
// =============================================================================

// Physical credential learning cannot be meaningfully mocked. This stub
// responds with an immediate timeout.
const respondToCredentialLearnStart: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCCredentialLearnStart)) {
			return;
		}

		const startCC = receivedCC;
		const capabilities = getCapabilities(self, startCC.endpointIndex);

		// CC:0083.01.0F.11.003: If Credential Type not supported, MUST ignore
		if (
			!capabilities.supportedCredentialTypes.has(startCC.credentialType)
		) {
			return { action: "fail" };
		}

		// CC:0083.01.0F.11.004: If type doesn't support CL, MUST ignore
		const typeCaps = capabilities.supportedCredentialTypes.get(
			startCC.credentialType,
		)!;
		if (!typeCaps.supportsCredentialLearn) {
			return { action: "fail" };
		}

		// CC:0083.01.0F.11.005: If UUID not valid, MUST ignore
		if (
			startCC.userId === 0
			|| startCC.userId > capabilities.numberOfSupportedUsers
		) {
			return { action: "fail" };
		}

		// CC:0083.01.0F.11.006: If Credential Slot out of range, MUST ignore
		if (
			startCC.credentialSlot === 0
			|| startCC.credentialSlot > typeCaps.numberOfCredentialSlots
		) {
			return { action: "fail" };
		}

		// CC:0083.01.11.11.001: Credential Learn Status: Timeout (0x04)
		// CC:0083.01.0F.11.013: No credential learned and timeout → stop
		const report = new UserCredentialCCCredentialLearnReport({
			nodeId: controller.ownNodeId,
			learnStatus: 0x04, // Timeout
			userId: startCC.userId,
			credentialType: startCC.credentialType,
			credentialSlot: startCC.credentialSlot,
			// CC:0083.01.11.11.003: Steps Remaining MUST be 0 for Timeout
			stepsRemaining: 0,
		});

		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Behavior: Credential Learn Cancel — stub
// =============================================================================

const respondToCredentialLearnCancel: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCCredentialLearnCancel)) {
			return;
		}

		// CC:0083.01.10.11.000: MUST return CredentialLearnReport with
		// status "Ended Not Due to Timeout" (0x03).
		const report = new UserCredentialCCCredentialLearnReport({
			nodeId: controller.ownNodeId,
			learnStatus: 0x03, // Ended Not Due to Timeout
			userId: 0,
			credentialType: UserCredentialType.None,
			credentialSlot: 0,
			stepsRemaining: 0,
		});

		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Behavior: Key Locker Entry Get → Report (v2)
// =============================================================================

const respondToKeyLockerEntryGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCredentialCCKeyLockerEntryGet) {
			const capabilities = getCapabilities(
				self,
				receivedCC.endpointIndex,
			);

			// CC:0083.02.1E.11.002: If no Key Locker functionality, all
			// Key Locker GET/SET commands MUST be ignored.
			if (
				!capabilities.supportedKeyLockerEntryTypes
				|| capabilities.supportedKeyLockerEntryTypes.size === 0
			) {
				return { action: "stop" };
			}

			const entryType = receivedCC.entryType;
			const entrySlot = receivedCC.entrySlot;

			// Check if entry exists in state
			const entryData = self.state.get(
				StateKeys.keyLockerEntry(entryType, entrySlot),
			) as Bytes | undefined;

			// CC:0083.02.21.11.003: Occupied MUST be 1 if entry contains
			// data; 0 if it does not.
			const cc = new UserCredentialCCKeyLockerEntryReport({
				nodeId: controller.ownNodeId,
				occupied: entryData !== undefined && entryData.length > 0,
				entryType,
				entrySlot,
			});
			return { action: "sendCC", cc };
		}
	},
};

// =============================================================================
// Behavior: Key Locker Entry Set (v2)
// =============================================================================

const respondToKeyLockerEntrySet: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		if (!(receivedCC instanceof UserCredentialCCKeyLockerEntrySet)) return;

		const setCC = receivedCC;
		const capabilities = getCapabilities(self, setCC.endpointIndex);

		// CC:0083.02.1E.11.002: If no Key Locker functionality, MUST ignore
		if (
			!capabilities.supportedKeyLockerEntryTypes
			|| capabilities.supportedKeyLockerEntryTypes.size === 0
		) {
			return { action: "fail" };
		}

		const entryType = setCC.entryType;
		const entrySlot = setCC.entrySlot;
		const operationType = setCC.operationType;
		const entryData = setCC.entryData ?? new Bytes();

		// --- Delete operations ---
		if (operationType === UserCredentialOperationType.Delete) {
			// 0 is not a valid entry type and not part of the enum
			if ((entryType as unknown) === 0 && entrySlot > 0) {
				// CC:0083.02.1F.11.008: entryType=0, entrySlot>0 MUST be ignored
				return { action: "fail" };
			}

			if ((entryType as unknown) === 0 && entrySlot === 0) {
				// Delete all entries in the entire Key Locker
				for (const [
					type,
					typeCaps,
				] of capabilities.supportedKeyLockerEntryTypes) {
					for (
						let slot = 1;
						slot <= typeCaps.numberOfEntrySlots;
						slot++
					) {
						self.state.delete(StateKeys.keyLockerEntry(type, slot));
					}
				}
			} else if (
				(entryType as UserCredentialKeyLockerEntryType | 0) !== 0
				&& entrySlot === 0
			) {
				// Delete all entries of the given type
				const typeCaps =
					capabilities.supportedKeyLockerEntryTypes.get(entryType);
				if (typeCaps) {
					for (
						let slot = 1;
						slot <= typeCaps.numberOfEntrySlots;
						slot++
					) {
						self.state.delete(
							StateKeys.keyLockerEntry(entryType, slot),
						);
					}
				}
			} else {
				// Delete specific entry
				self.state.delete(
					StateKeys.keyLockerEntry(entryType, entrySlot),
				);
			}

			// Send Key Locker Entry Report to controller
			const report = new UserCredentialCCKeyLockerEntryReport({
				nodeId: controller.ownNodeId,
				occupied: false,
				entryType:
					entryType
					|| UserCredentialKeyLockerEntryType.DESFireApplicationIdAndKey,
				entrySlot: entrySlot || 1,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(report, {
					ackRequested: false,
				}),
			);
			return { action: "ok" };
		}

		// --- Add / Modify validation ---

		// CC:0083.02.1F.11.002: If Entry Type not supported, MUST ignore
		const typeCaps =
			capabilities.supportedKeyLockerEntryTypes.get(entryType);
		if (!typeCaps) {
			return { action: "fail" };
		}

		// CC:0083.02.1F.11.005: If Entry Slot is zero for non-Delete, MUST ignore
		if (entrySlot === 0) {
			return { action: "fail" };
		}

		// CC:0083.02.1F.11.004: If Entry Slot out of range, MUST ignore
		if (entrySlot > typeCaps.numberOfEntrySlots) {
			return { action: "fail" };
		}

		// CC:0083.02.1F.11.010: Entry Data Length MUST be ≤ Max
		if (entryData.length > typeCaps.maxEntryDataLength) {
			return { action: "fail" };
		}

		// CC:0083.02.1F.11.011: Entry Data Length MUST be ≥ Min
		if (entryData.length < typeCaps.minEntryDataLength) {
			return { action: "fail" };
		}

		const existingEntry = self.state.get(
			StateKeys.keyLockerEntry(entryType, entrySlot),
		) as Bytes | undefined;
		const isOccupied =
			existingEntry !== undefined && existingEntry.length > 0;

		if (operationType === UserCredentialOperationType.Add) {
			// CC:0083.02.1F.11.008: Adds to Occupied Entries MUST be rejected.
			// Supervision MUST be Fail.
			if (isOccupied) {
				return { action: "fail" };
			}
		} else if (operationType === UserCredentialOperationType.Modify) {
			// CC:0083.02.1F.11.008: Modifies to empty MUST be rejected.
			// Supervision MUST be Fail.
			if (!isOccupied) {
				return { action: "fail" };
			}
		}

		// Store the entry
		self.state.set(
			StateKeys.keyLockerEntry(entryType, entrySlot),
			entryData,
		);

		// CC:0083.02.21.11.001: Key Locker Entry Report MUST be sent to lifeline
		const report = new UserCredentialCCKeyLockerEntryReport({
			nodeId: controller.ownNodeId,
			occupied: true,
			entryType,
			entrySlot,
		});
		await self.sendToController(
			createMockZWaveRequestFrame(report, {
				ackRequested: false,
			}),
		);
		return { action: "ok" };
	},
};

// =============================================================================
// Export all behaviors
// =============================================================================

export const UserCredentialCCBehaviors = [
	respondToUserCapabilitiesGet,
	respondToCredentialCapabilitiesGet,
	respondToKeyLockerCapabilitiesGet,
	respondToUserGet,
	respondToUserSet,
	respondToCredentialGet,
	respondToCredentialSet,
	respondToAdminPinCodeGet,
	respondToAdminPinCodeSet,
	respondToAllUsersChecksumGet,
	respondToUserChecksumGet,
	respondToCredentialChecksumGet,
	respondToUserCredentialAssociationSet,
	respondToCredentialLearnStart,
	respondToCredentialLearnCancel,
	respondToKeyLockerEntryGet,
	respondToKeyLockerEntrySet,
];
