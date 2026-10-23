import {
	type UserCredentialCapability,
	UserCredentialCommand,
	UserCredentialCredentialReportType,
	UserCredentialOperationType,
	UserCredentialRule,
	UserCredentialType,
	UserCredentialUserReportType,
	UserCredentialUserType,
	UserIDStatus,
} from "@zwave-js/cc";
import { type UserCodeCCAPI, UserCodeCCValues } from "@zwave-js/cc/UserCodeCC";
import {
	type UserCredentialCCAPI,
	type UserCredentialCCAssociationReport,
	type UserCredentialCCCredentialReport,
	type UserCredentialCCUserReport,
	UserCredentialCCValues,
	normalizeCredentialData,
} from "@zwave-js/cc/UserCredentialCC";
import {
	CommandClasses,
	type SupervisionResult,
	ZWaveError,
	ZWaveErrorCodes,
	supervisedCommandSucceeded,
} from "@zwave-js/core";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

import { FeatureAPI } from "./FeatureAPI.js";

// Bulk deletions (all users, or all credentials matching a filter) can take
// significantly longer than the default 1 second report timeout
const BULK_DELETE_REPORT_TIMEOUT_MS = 15000;

export interface UserCapabilities {
	maxUsers: number;
	supportedUserTypes: readonly UserCredentialUserType[];
	maxUserNameLength: number | undefined;
	supportedCredentialRules: readonly UserCredentialRule[];
	supportsUsersWithoutCredentials: boolean;
}

export interface CredentialCapabilities {
	supportedCredentialTypes: ReadonlyMap<
		UserCredentialType,
		UserCredentialCapability
	>;
	supportsAdminCode: boolean;
	supportsAdminCodeDeactivation: boolean;
	/**
	 * Whether existing credentials can be reassigned between users via
	 * {@link AccessControlAPI.assignCredential} without re-enrolling them.
	 */
	supportsCredentialAssignment: boolean;
}

export interface UserData {
	userId: number;
	active: boolean;
	userType: UserCredentialUserType;
	userName?: string;
	credentialRule?: UserCredentialRule;
	expiringTimeoutMinutes?: number;
}

export interface CredentialData {
	userId: number;
	type: UserCredentialType;
	slot: number;
	data?: string | Uint8Array;
}

export interface SetUserOptions {
	active?: boolean;
	userType?: UserCredentialUserType;
	userName?: string;
	credentialRule?: UserCredentialRule;
	expiringTimeoutMinutes?: number;
}

export interface DeleteCredentialsOptions {
	/**
	 * Only delete credentials owned by this user. When omitted or `0`, the
	 * filter is treated as a wildcard and credentials for all users are
	 * deleted.
	 */
	userId?: number;
	/**
	 * Only delete credentials of this type. When omitted or
	 * {@link UserCredentialType.None}, the filter is treated as a wildcard and
	 * credentials of all types are deleted.
	 */
	credentialType?: UserCredentialType;
}

/** Result of an addUser call */
export interface AddUserResult {
	/** Result of adding the user. */
	user: SetUserResult;
	/**
	 * Result of adding the credential. Only present when a credential was
	 * provided. On User Code CC, the user and credential are written as a
	 * single operation, so this mirrors {@link AddUserResult.user}.
	 */
	credential?: SetCredentialResult;
}

/** Result of a setUser / deleteUser / deleteAllUsers call */
export enum SetUserResult {
	OK = 0,
	Error_AddRejectedLocationOccupied = 1,
	Error_ModifyRejectedLocationEmpty = 2,
	Error_Unknown = 0xff,
}

/** Result of a setCredential / deleteCredential call */
export enum SetCredentialResult {
	OK = 0,
	Error_AddRejectedLocationOccupied = 1,
	Error_ModifyRejectedLocationEmpty = 2,
	Error_DuplicateCredential = 3,
	Error_ManufacturerSecurityRules = 4,
	Error_DuplicateAdminPINCode = 5,
	Error_WrongUserUniqueIdentifier = 6,
	Error_Unknown = 0xff,
}

/** Result of an assignCredential call */
export enum AssignCredentialResult {
	OK = 0,
	/** Spec statuses 0x01 / 0x02 / 0x03 — credential type / slot invalid or empty */
	Error_InvalidCredential = 1,
	/** Spec statuses 0x04 / 0x05 — destination user invalid or nonexistent */
	Error_InvalidUser = 2,
	Error_Unknown = 0xff,
}

function u3cUserReportTypeToSetUserResult(
	reportType: UserCredentialUserReportType | undefined,
): SetUserResult {
	if (reportType == undefined) return SetUserResult.Error_Unknown;
	switch (reportType) {
		case UserCredentialUserReportType.UserAdded:
		case UserCredentialUserReportType.UserModified:
		case UserCredentialUserReportType.UserDeleted:
		case UserCredentialUserReportType.UserUnchanged:
			return SetUserResult.OK;
		case UserCredentialUserReportType.UserAddRejectedLocationOccupied:
			return SetUserResult.Error_AddRejectedLocationOccupied;
		case UserCredentialUserReportType.UserModifyRejectedLocationEmpty:
			return SetUserResult.Error_ModifyRejectedLocationEmpty;
		default:
			return SetUserResult.Error_Unknown;
	}
}

function u3cCredentialReportTypeToSetCredentialResult(
	reportType: UserCredentialCredentialReportType | undefined,
): SetCredentialResult {
	if (reportType == undefined) return SetCredentialResult.Error_Unknown;
	switch (reportType) {
		case UserCredentialCredentialReportType.CredentialAdded:
		case UserCredentialCredentialReportType.CredentialModified:
		case UserCredentialCredentialReportType.CredentialDeleted:
		case UserCredentialCredentialReportType.CredentialUnchanged:
			return SetCredentialResult.OK;
		case UserCredentialCredentialReportType.CredentialAddRejectedLocationOccupied:
			return SetCredentialResult.Error_AddRejectedLocationOccupied;
		case UserCredentialCredentialReportType.CredentialModifyRejectedLocationEmpty:
			return SetCredentialResult.Error_ModifyRejectedLocationEmpty;
		case UserCredentialCredentialReportType.DuplicateCredential:
			return SetCredentialResult.Error_DuplicateCredential;
		case UserCredentialCredentialReportType.ManufacturerSecurityRules:
			return SetCredentialResult.Error_ManufacturerSecurityRules;
		case UserCredentialCredentialReportType.DuplicateAdminPINCode:
			return SetCredentialResult.Error_DuplicateAdminPINCode;
		case UserCredentialCredentialReportType.WrongUserUniqueIdentifier:
			return SetCredentialResult.Error_WrongUserUniqueIdentifier;
		default:
			return SetCredentialResult.Error_Unknown;
	}
}

function u3cAssociationStatusToAssignCredentialResult(
	status: UserCredentialCCAssociationReport["status"] | undefined,
): AssignCredentialResult {
	if (status == undefined) return AssignCredentialResult.Error_Unknown;
	switch (status) {
		case 0x00:
			return AssignCredentialResult.OK;
		case 0x01:
		case 0x02:
		case 0x03:
			return AssignCredentialResult.Error_InvalidCredential;
		case 0x04:
		case 0x05:
			return AssignCredentialResult.Error_InvalidUser;
		default:
			return AssignCredentialResult.Error_Unknown;
	}
}

/** Packs a credential type and slot into the value DB property key */
function credentialPropertyKey(type: UserCredentialType, slot: number): number {
	return UserCredentialCCValues.credential(type, slot).id.propertyKey;
}

const NON_PIN_CHARS = /[^0-9]/;

/**
 * Whether the supported ASCII characters indicate a non-PIN device.
 * When unknown (V1 nodes), defaults to PIN-only per the spec.
 */
function supportsNonPINChars(supportedASCIIChars: string | undefined): boolean {
	return (
		supportedASCIIChars != undefined
		&& NON_PIN_CHARS.test(supportedASCIIChars)
	);
}

// Characters known to be used by nodes that obfuscate user codes in reports
const USER_CODE_OBFUSCATION_CHARS = ["*"];

/** Compares two user codes, which may be given as strings or binary */
function userCodeEquals(
	expected: string | Uint8Array,
	actual: string | Uint8Array | undefined,
): boolean {
	if (actual == undefined) return false;

	// Compare byte-wise unless both codes are strings
	if (typeof expected !== "string" || typeof actual !== "string") {
		const toBytes = (v: string | Uint8Array) =>
			typeof v === "string" ? Bytes.from(v, "ascii") : Bytes.view(v);
		return toBytes(actual).equals(toBytes(expected));
	}
	return actual === expected;
}

/**
 * Some version 1 nodes obfuscate codes in the report (e.g. "******"), so
 * we need to be a bit lenient when verifying that a code was set correctly.
 */
function userCodeReadBackConfirmsSet(
	expected: string | Uint8Array,
	actual: string | Uint8Array | undefined,
	version: number,
): boolean {
	if (actual == undefined) return false;

	if (userCodeEquals(expected, actual)) return true;

	// It has been found that some version 1 nodes wrongfully report obfuscated
	// User Codes in the User Code Report (e.g. "******").
	// CC:0063.01.00.32.002  A controlling node SHOULD understand that a code has
	// been set correctly but cannot be read back with such nodes.
	if (version === 1 && typeof actual === "string" && actual.length > 0) {
		return USER_CODE_OBFUSCATION_CHARS.some(
			(char) => actual === char.repeat(actual.length),
		);
	}

	return false;
}

/** High-level API for managing users and credentials on access control devices */
export class AccessControlAPI extends FeatureAPI {
	get #usesUserCredentialCC(): boolean {
		if (!this.endpoint.supportsCC(CommandClasses["User Credential"])) {
			return false;
		}
		if (!this.endpoint.supportsCC(CommandClasses["User Code"])) {
			return true;
		}
		// CL:0083.01.21.00.4: The controlling node MUST use User Credential
		// Command Class to control a supporting node unless the supporting
		// node reports that (0) Users are supported.
		//
		// While that is unknown (interview incomplete), we default to U3C.
		return (
			this.getValue<number>(
				UserCredentialCCValues.supportedUsers.endpoint(
					this.endpoint.index,
				),
			) !== 0
		);
	}

	/**
	 * Returns the user-related capabilities of this endpoint.
	 * This method uses cached information from the most recent interview.
	 */
	public getUserCapabilitiesCached(): UserCapabilities {
		if (this.#usesUserCredentialCC) {
			return {
				maxUsers:
					this.getValue<number>(
						UserCredentialCCValues.supportedUsers.endpoint(
							this.endpoint.index,
						),
					) ?? 0,
				supportedUserTypes:
					this.getValue<UserCredentialUserType[]>(
						UserCredentialCCValues.supportedUserTypes.endpoint(
							this.endpoint.index,
						),
					) ?? [],
				maxUserNameLength:
					this.getValue<number>(
						UserCredentialCCValues.maxUserNameLength.endpoint(
							this.endpoint.index,
						),
					) ?? undefined,
				supportedCredentialRules:
					this.getValue<UserCredentialRule[]>(
						UserCredentialCCValues.supportedCredentialRules.endpoint(
							this.endpoint.index,
						),
					) ?? [],
				supportsUsersWithoutCredentials: true,
			};
		} else {
			const supportedStatuses =
				this.getValue<UserIDStatus[]>(
					UserCodeCCValues.supportedUserIDStatuses.endpoint(
						this.endpoint.index,
					),
				) ?? [];
			const supportedUserTypes: UserCredentialUserType[] = [
				UserCredentialUserType.General,
			];
			// User Code CC has no concept of user types, but the Messaging
			// status is the closest equivalent to a NonAccess user
			if (supportedStatuses.includes(UserIDStatus.Messaging)) {
				supportedUserTypes.push(UserCredentialUserType.NonAccess);
			}

			return {
				maxUsers:
					this.getValue<number>(
						UserCodeCCValues.supportedUsers.endpoint(
							this.endpoint.index,
						),
					) ?? 0,
				supportedUserTypes,
				// User Code CC does not support user names or credential rules
				maxUserNameLength: undefined,
				supportedCredentialRules: [UserCredentialRule.Single],
				supportsUsersWithoutCredentials: false,
			};
		}
	}

	/**
	 * Returns the credential-related capabilities of this endpoint.
	 * This method uses cached information from the most recent interview.
	 */
	public getCredentialCapabilitiesCached(): CredentialCapabilities {
		if (this.#usesUserCredentialCC) {
			const supportedTypes =
				this.getValue<UserCredentialType[]>(
					UserCredentialCCValues.supportedCredentialTypes.endpoint(
						this.endpoint.index,
					),
				) ?? [];

			const credentialTypes = new Map<
				UserCredentialType,
				UserCredentialCapability
			>();
			for (const type of supportedTypes) {
				const cap = this.getValue<UserCredentialCapability>(
					UserCredentialCCValues.credentialCapabilities(
						type,
					).endpoint(this.endpoint.index),
				);
				if (cap) credentialTypes.set(type, cap);
			}

			return {
				supportedCredentialTypes: credentialTypes,
				supportsAdminCode:
					this.getValue<boolean>(
						UserCredentialCCValues.supportsAdminCode.endpoint(
							this.endpoint.index,
						),
					) ?? false,
				supportsAdminCodeDeactivation:
					this.getValue<boolean>(
						UserCredentialCCValues.supportsAdminCodeDeactivation.endpoint(
							this.endpoint.index,
						),
					) ?? false,
				supportsCredentialAssignment:
					this.#u3cAPI().supportsCommand(
						UserCredentialCommand.UserCredentialAssociationSet,
					) === true,
			};
		} else {
			const maxUsers =
				this.getValue<number>(
					UserCodeCCValues.supportedUsers.endpoint(
						this.endpoint.index,
					),
				) ?? 0;

			// User Code CC only supports a single credential per user
			// with a length of 4-10 characters (CC:0063.01.01.11.006).
			// Despite the spec calling them "PIN codes", v1 devices often
			// accept arbitrary characters. Use the widest matching type.
			const credentialTypes = new Map<
				UserCredentialType,
				UserCredentialCapability
			>();
			credentialTypes.set(this.#ucCredentialType, {
				// For User Code CC, credential slots and users are identical
				numberOfCredentialSlots: maxUsers,
				minCredentialLength: 4,
				maxCredentialLength: 10,
				maxCredentialHashLength: 0,
				supportsCredentialLearn: false,
			});

			return {
				supportedCredentialTypes: credentialTypes,
				supportsAdminCode:
					this.getValue<boolean>(
						UserCodeCCValues.supportsAdminCode.endpoint(
							this.endpoint.index,
						),
					) ?? false,
				supportsAdminCodeDeactivation:
					this.getValue<boolean>(
						UserCodeCCValues.supportsAdminCodeDeactivation.endpoint(
							this.endpoint.index,
						),
					) ?? false,
				// User Code CC has no equivalent to credential reassignment
				supportsCredentialAssignment: false,
			};
		}
	}

	/**
	 * Returns the data for the user with the given ID.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getUser(userId: number): Promise<UserData | undefined> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			const result = await api.getUser(userId);
			if (result) await this.endpoint.tryGetNode()?.handleCommand(result);
			if (!result?.userId) return undefined;
			return {
				userId: result.userId,
				active: result.active ?? false,
				userType: result.userType ?? UserCredentialUserType.General,
				userName: result.userName ?? undefined,
				credentialRule: result.credentialRule ?? undefined,
				expiringTimeoutMinutes:
					result.expiringTimeoutMinutes || undefined,
			};
		} else {
			const api = this.#ucAPI();
			const result = await api.get(userId);
			if (!result) return undefined;
			return this.#mapUserCodeStatusToUserData(
				userId,
				result.userIdStatus,
			);
		}
	}

	/**
	 * Returns the data for the user with the given ID.
	 * This method uses cached information from the most recent interview.
	 */
	public getUserCached(userId: number): UserData | undefined {
		if (this.#usesUserCredentialCC) {
			return this.#getUserCached_U3C(userId);
		} else {
			return this.#getUserCached_UC(userId);
		}
	}

	/**
	 * Returns the data for all configured users.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getUsers(): Promise<UserData[]> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			const users: UserData[] = [];
			// Requesting userId 0 gives us the first user
			let nextUserId = 0;
			do {
				const result = await api.getUser(nextUserId);
				if (result) {
					await this.endpoint.tryGetNode()?.handleCommand(result);
				}
				if (!result?.userId) break;
				users.push({
					userId: result.userId,
					active: result.active ?? false,
					userType: result.userType ?? UserCredentialUserType.General,
					userName: result.userName ?? undefined,
					credentialRule: result.credentialRule ?? undefined,
					expiringTimeoutMinutes:
						result.expiringTimeoutMinutes || undefined,
				});
				nextUserId = result.nextUserId ?? 0;
			} while (nextUserId > 0);
			return users;
		} else {
			const api = this.#ucAPI();
			const maxUsers = await api.getUsersCount();
			if (!maxUsers) return [];

			const users: UserData[] = [];
			const supportsBulk = !!this.getValue<boolean>(
				UserCodeCCValues.supportsMultipleUserCodeReport.endpoint(
					this.endpoint.index,
				),
			);

			if (supportsBulk) {
				let nextUserId = 1;
				while (nextUserId > 0 && nextUserId <= maxUsers) {
					const response = await api.get(nextUserId, true);
					if (!response) break;
					users.push(
						...response.userCodes
							.map((entry) =>
								this.#mapUserCodeStatusToUserData(
									entry.userId,
									entry.userIdStatus,
								),
							)
							.filter((u) => u != undefined),
					);
					nextUserId = response.nextUserId;
				}
			} else {
				for (let userId = 1; userId <= maxUsers; userId++) {
					const result = await api.get(userId);
					if (!result) continue;
					const user = this.#mapUserCodeStatusToUserData(
						userId,
						result.userIdStatus,
					);
					if (user) users.push(user);
				}
			}
			return users;
		}
	}

	/**
	 * Returns the data for all configured users.
	 * This method uses cached information from the most recent interview.
	 */
	public getUsersCached(): UserData[] {
		if (this.#usesUserCredentialCC) {
			const maxUsers =
				this.getValue<number>(
					UserCredentialCCValues.supportedUsers.endpoint(
						this.endpoint.index,
					),
				) ?? 0;
			const users: UserData[] = [];
			for (let userId = 1; userId <= maxUsers; userId++) {
				const user = this.#getUserCached_U3C(userId);
				if (user) users.push(user);
			}
			return users;
		} else {
			const maxUsers =
				this.getValue<number>(
					UserCodeCCValues.supportedUsers.endpoint(
						this.endpoint.index,
					),
				) ?? 0;
			const users: UserData[] = [];
			for (let userId = 1; userId <= maxUsers; userId++) {
				const user = this.#getUserCached_UC(userId);
				if (user) users.push(user);
			}
			return users;
		}
	}

	/**
	 * Creates a new user with the given ID, optionally writing a credential at
	 * the same time.
	 *
	 * This communicates with the node.
	 *
	 * @param credential - The credential to set for this user. On devices where `supportsUsersWithoutCredentials` is `false`, this field is required.
	 */
	public async addUser(
		userId: number,
		options: SetUserOptions,
		credential?: {
			type: UserCredentialType;
			slot: number;
			data: string | Uint8Array;
		},
	): Promise<AddUserResult> {
		this.#assertValidUser(userId);

		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			const userType = options.userType ?? UserCredentialUserType.General;

			let result: UserCredentialCCUserReport | undefined;
			if (userType === UserCredentialUserType.Expiring) {
				result = await api.setUser({
					operationType: UserCredentialOperationType.Add,
					userId,
					active: options.active ?? true,
					userType,
					expiringTimeoutMinutes: options.expiringTimeoutMinutes ?? 0,
					credentialRule: options.credentialRule,
					userName: options.userName,
				});
			} else {
				result = await api.setUser({
					operationType: UserCredentialOperationType.Add,
					userId,
					active: options.active ?? true,
					userType,
					credentialRule: options.credentialRule,
					userName: options.userName,
				});
			}

			if (result) await this.endpoint.tryGetNode()?.handleCommand(result);
			const userResult = u3cUserReportTypeToSetUserResult(
				result?.reportType,
			);

			if (userResult !== SetUserResult.OK || !credential) {
				return credential
					? { user: userResult, credential: undefined }
					: { user: userResult };
			}

			const credentialResult = await this.setCredential(
				userId,
				credential.type,
				credential.slot,
				credential.data,
			);
			return { user: userResult, credential: credentialResult };
		} else {
			// User Code CC
			if (!credential) {
				throw new ZWaveError(
					"On this device, users and codes must be stored together. addUser() requires a credential.",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (credential.slot !== userId) {
				throw new ZWaveError(
					"On this device, users and codes share the same slot. The credential slot must equal the user ID.",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.#assertValidUCCredentialType(credential.type);

			const active = options.active ?? true;
			const userType = options.userType ?? UserCredentialUserType.General;

			let status: UserIDStatus;
			if (!active) {
				status = UserIDStatus.Disabled;
			} else if (userType === UserCredentialUserType.NonAccess) {
				status = UserIDStatus.Messaging;
			} else {
				status = UserIDStatus.Enabled;
			}

			const api = this.#ucAPI();
			const codeData =
				typeof credential.data === "string"
					? credential.data
					: Bytes.from(credential.data);
			const result = await api.set(userId, status, codeData);
			let succeeded: boolean;
			if (result == undefined) {
				const verified = await api.get(userId);
				succeeded =
					verified?.userIdStatus === status
					&& userCodeReadBackConfirmsSet(
						codeData,
						verified?.userCode,
						api.version,
					);
			} else if (supervisedCommandSucceeded(result)) {
				succeeded = true;
				// Supervision replaces the verification GET, so persist
				// the new state ourselves
				this.#persistCachedUserCode(userId, status, codeData);
			} else {
				// The device reported failure
				// Determine the actual state and treat an exact match as
				// success. The obfuscation leniency does not apply here,
				// since it would confirm the previous code.
				const verified = await api.get(userId);
				succeeded =
					verified?.userIdStatus === status
					&& userCodeEquals(codeData, verified.userCode);
			}

			if (succeeded) {
				const node = this.endpoint.tryGetNode();
				if (node) {
					const userData: UserData = { userId, active, userType };
					node.emit("user added", this.endpoint as any, userData);
					node.emit("credential added", this.endpoint as any, {
						userId,
						credentialType: credential.type,
						credentialSlot: userId,
						data: credential.data,
					});
				}
			}

			return succeeded
				? { user: SetUserResult.OK, credential: SetCredentialResult.OK }
				: {
						user: SetUserResult.Error_Unknown,
						credential: SetCredentialResult.Error_Unknown,
					};
		}
	}

	/**
	 * Creates or updates the user with the given ID.
	 * This communicates with the node.
	 */
	public async setUser(
		userId: number,
		options: SetUserOptions,
	): Promise<SetUserResult> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			const existing = this.#getUserCached_U3C(userId);
			const operationType = existing
				? UserCredentialOperationType.Modify
				: UserCredentialOperationType.Add;

			const userType =
				options.userType
				?? existing?.userType
				?? UserCredentialUserType.General;

			let result: UserCredentialCCUserReport | undefined;
			if (userType === UserCredentialUserType.Expiring) {
				result = await api.setUser({
					operationType,
					userId,
					active: options.active ?? existing?.active ?? true,
					userType,
					expiringTimeoutMinutes:
						options.expiringTimeoutMinutes
						?? existing?.expiringTimeoutMinutes
						?? 0,
					credentialRule:
						options.credentialRule ?? existing?.credentialRule,
					userName: options.userName ?? existing?.userName,
				});
			} else {
				result = await api.setUser({
					operationType,
					userId,
					active: options.active ?? existing?.active ?? true,
					userType,
					credentialRule:
						options.credentialRule ?? existing?.credentialRule,
					userName: options.userName ?? existing?.userName,
				});
			}

			if (result) await this.endpoint.tryGetNode()?.handleCommand(result);
			return u3cUserReportTypeToSetUserResult(result?.reportType);
		} else {
			const api = this.#ucAPI();
			const existing = this.#getUserCached_UC(userId);
			const existingStatus = this.getValue<UserIDStatus>(
				UserCodeCCValues.userIdStatus(userId).endpoint(
					this.endpoint.index,
				),
			);

			const active = options.active ?? existing?.active ?? true;
			const userType =
				options.userType
				?? existing?.userType
				?? UserCredentialUserType.General;

			// Reverse the unified active/userType model back to UserIDStatus
			let status: UserIDStatus;
			if (!active) {
				status = UserIDStatus.Disabled;
			} else if (userType === UserCredentialUserType.NonAccess) {
				status = UserIDStatus.Messaging;
			} else {
				status = UserIDStatus.Enabled;
			}

			// User Code CC requires sending the code along with every status
			// change, so we re-send the existing code to preserve it
			const existingCode = this.getValue<string>(
				UserCodeCCValues.userCode(userId).endpoint(this.endpoint.index),
			);
			if (!existingCode) {
				throw new ZWaveError(
					"On this device, users and codes must be stored together. To add a new user, use the addUser() method and provide a credential.",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			const result = await api.set(userId, status, existingCode);
			let succeeded: boolean;
			let failure = SetUserResult.Error_Unknown;
			if (result == undefined) {
				// Unsupervised - verify the change
				const verified = await api.get(userId);
				const verifiedStatus = verified?.userIdStatus;
				succeeded =
					verifiedStatus != undefined
					&& verifiedStatus !== existingStatus
					&& verifiedStatus !== UserIDStatus.Available;
			} else if (supervisedCommandSucceeded(result)) {
				succeeded = true;
				// Supervision replaces the verification GET, so persist
				// the new state ourselves
				this.#persistCachedUserCode(userId, status, existingCode);
			} else {
				// The device reported failure
				// Determine the actual state and treat a matching status as
				// success.
				const verified = await api.get(userId);
				succeeded = verified?.userIdStatus === status;
				if (
					!succeeded
					&& verified?.userIdStatus === UserIDStatus.Available
				) {
					// There is no user to modify on the device
					failure = SetUserResult.Error_ModifyRejectedLocationEmpty;
				}
			}
			if (succeeded) {
				const node = this.endpoint.tryGetNode();
				if (node) {
					const userData: UserData = { userId, active, userType };
					node.emit(
						existing ? "user modified" : "user added",
						this.endpoint as any,
						userData,
					);
				}
			}
			return succeeded ? SetUserResult.OK : failure;
		}
	}

	/**
	 * Deletes the user with the given ID and all of their credentials.
	 * This communicates with the node.
	 */
	public async deleteUser(userId: number): Promise<SetUserResult> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			const raw = await api.setUser({
				operationType: UserCredentialOperationType.Delete,
				userId,
			});
			if (raw) await this.endpoint.tryGetNode()?.handleCommand(raw);
			return u3cUserReportTypeToSetUserResult(raw?.reportType);
		} else {
			// User Code CC ties each user to their code, so clearing
			// the code implicitly deletes the user and vice versa.
			// The cache entry only gates event emission - the node may have
			// a user we never observed, so a missing entry must not gate the
			// success of the API call itself.
			const existed = this.#getUserCached_UC(userId) != undefined;
			const api = this.#ucAPI();
			const result = await api.clear(userId);
			let succeeded: boolean;
			if (result != undefined && supervisedCommandSucceeded(result)) {
				succeeded = true;
			} else {
				// Unsupervised, or the device reported failure
				// Determine the actual state and treat an empty slot as
				// success in any case.
				const verified = await api.get(userId);
				succeeded = verified?.userIdStatus === UserIDStatus.Available;
			}
			if (succeeded) {
				this.#clearCachedUserCodes(userId);
			}
			if (succeeded && existed) {
				const node = this.endpoint.tryGetNode();
				if (node) {
					node.emit("user deleted", this.endpoint as any, { userId });
					node.emit("credential deleted", this.endpoint as any, {
						userId,
						credentialType: this.#ucCredentialType,
						// For User Code CC, credential slots and users are identical
						credentialSlot: userId,
					});
				}
			}
			return succeeded ? SetUserResult.OK : SetUserResult.Error_Unknown;
		}
	}

	/**
	 * Deletes all users and their credentials.
	 * This communicates with the node.
	 */
	public async deleteAllUsers(): Promise<SetUserResult> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI().withOptions({
				reportTimeoutMs: BULK_DELETE_REPORT_TIMEOUT_MS,
			});
			const raw = await api.setUser({
				operationType: UserCredentialOperationType.Delete,
				userId: 0,
			});
			if (raw) await this.endpoint.tryGetNode()?.handleCommand(raw);
			return u3cUserReportTypeToSetUserResult(raw?.reportType);
		} else {
			const api = this.#ucAPI();
			const result = await api.clear(0);
			// Verifying all users being deleted is unrealistic
			// since there can be up to 65535 users. So we just
			// assume it worked when the command was not supervised.
			const succeeded =
				result == undefined || supervisedCommandSucceeded(result);
			if (succeeded) {
				this.#clearCachedUserCodes();
			}
			return succeeded ? SetUserResult.OK : SetUserResult.Error_Unknown;
		}
	}

	/**
	 * Returns the data for a specific credential type and slot.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getCredential(
		type: UserCredentialType,
		slot: number,
	): Promise<CredentialData | undefined> {
		this.#assertValidSlot(type, slot);

		if (this.#usesUserCredentialCC) {
			const result = await this.#u3cAPI().getCredential(0, type, slot);
			if (result) await this.endpoint.tryGetNode()?.handleCommand(result);
			return this.#mapCredentialData(result);
		} else {
			const api = this.#ucAPI();
			const result = await api.get(slot);
			if (!result) return undefined;
			if (
				result.userIdStatus === UserIDStatus.Available
				|| result.userIdStatus === UserIDStatus.StatusNotAvailable
			) {
				return undefined;
			}
			// For User Code CC, credential slots and users are identical
			return { userId: slot, type, slot, data: result.userCode };
		}
	}

	/**
	 * Returns the data for a specific credential type and slot.
	 * This method uses cached information from the most recent interview.
	 */
	public getCredentialCached(
		type: UserCredentialType,
		slot: number,
	): CredentialData | undefined {
		this.#assertValidSlot(type, slot);

		if (this.#usesUserCredentialCC) {
			return this.#getCredentialCached_U3C(type, slot);
		} else {
			return this.#getCredentialCached_UC(type, slot);
		}
	}

	/**
	 * Returns all credentials for the given user and optional type.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getCredentialsForUser(
		userId: number,
		type?: UserCredentialType,
	): Promise<CredentialData[]> {
		if (this.#usesUserCredentialCC) {
			if (type != undefined && !this.#supportsCredentialType(type)) {
				return [];
			}
			return this.#queryCredentials_U3C(
				userId,
				type ?? UserCredentialType.None,
				0,
				type,
			);
		} else {
			if (type != undefined && type !== this.#ucCredentialType) {
				return [];
			}
			const cred = await this.getCredential(
				this.#ucCredentialType,
				// For User Code CC, credential slots and users are identical
				userId,
			);
			// ...and there is at most one credential per user.
			return cred ? [cred] : [];
		}
	}

	/**
	 * Returns all credentials for the given user and optional type.
	 * This method uses cached information from the most recent interview.
	 */
	public getCredentialsForUserCached(
		userId: number,
		type?: UserCredentialType,
	): CredentialData[] {
		if (this.#usesUserCredentialCC) {
			if (type != undefined && !this.#supportsCredentialType(type)) {
				return [];
			}
			return this.#getAllCredentialsCached_U3C().filter(
				(credential) =>
					credential.userId === userId
					&& (type == undefined || credential.type === type),
			);
		} else {
			if (type != undefined && type !== this.#ucCredentialType) {
				return [];
			}
			const cred = this.#getCredentialCached_UC(
				this.#ucCredentialType,
				// For User Code CC, credential slots and users are identical
				userId,
			);
			// ...and there is at most one credential per user.
			return cred ? [cred] : [];
		}
	}

	/**
	 * Returns all credentials of the given type, regardless of ownership.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getCredentialsByType(
		type: UserCredentialType,
	): Promise<CredentialData[]> {
		if (!this.#supportsCredentialType(type)) {
			return [];
		}

		if (this.#usesUserCredentialCC) {
			return this.#queryCredentials_U3C(0, type, 0, type);
		} else {
			return this.#getAllCredentials_UC();
		}
	}

	/**
	 * Returns all credentials of the given type, regardless of ownership.
	 * This method uses cached information from the most recent interview.
	 */
	public getCredentialsByTypeCached(
		type: UserCredentialType,
	): CredentialData[] {
		if (!this.#supportsCredentialType(type)) {
			return [];
		}

		if (this.#usesUserCredentialCC) {
			return this.#getAllCredentialsCached_U3C().filter(
				(credential) => credential.type === type,
			);
		} else {
			return this.#getAllCredentialsCached_UC();
		}
	}

	/**
	 * Returns all credentials, regardless of ownership or type.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getAllCredentials(): Promise<CredentialData[]> {
		if (this.#usesUserCredentialCC) {
			return this.#queryCredentials_U3C(0, UserCredentialType.None, 0);
		} else {
			return this.#getAllCredentials_UC();
		}
	}

	/**
	 * Returns all credentials, regardless of ownership or type.
	 * This method uses cached information from the most recent interview.
	 */
	public getAllCredentialsCached(): CredentialData[] {
		if (this.#usesUserCredentialCC) {
			return this.#getAllCredentialsCached_U3C();
		} else {
			return this.#getAllCredentialsCached_UC();
		}
	}

	/**
	 * Creates or updates a credential for the given user.
	 * This communicates with the node.
	 */
	public async setCredential(
		userId: number,
		type: UserCredentialType,
		slot: number,
		data: string | Uint8Array,
	): Promise<SetCredentialResult> {
		this.#assertValidUser(userId);

		if (this.#usesUserCredentialCC) {
			this.#assertValidSlot(type, slot);

			const api = this.#u3cAPI();
			const existing = this.#getCredentialCachedForUser_U3C(
				userId,
				type,
				slot,
			);
			const credentialData =
				typeof data === "string"
					? Bytes.from(data, "utf-8")
					: Bytes.from(data);
			const raw = await api.setCredential({
				operationType: existing
					? UserCredentialOperationType.Modify
					: UserCredentialOperationType.Add,
				userId,
				credentialType: type,
				credentialSlot: slot,
				credentialData,
			});
			if (raw) await this.endpoint.tryGetNode()?.handleCommand(raw);
			return u3cCredentialReportTypeToSetCredentialResult(
				raw?.reportType,
			);
		} else {
			// User Code CC stores exactly one credential per user slot. Ignore the
			// caller-provided unified slot and write back to the owning user's slot
			// so events and cached state stay internally consistent. The user was
			// already validated above; here we only reject unsupported types.
			this.#assertValidUCCredentialType(type);
			const api = this.#ucAPI();

			// Determine the current status; default to Enabled for new users
			const existingStatus = this.getValue<UserIDStatus>(
				UserCodeCCValues.userIdStatus(userId).endpoint(
					this.endpoint.index,
				),
			);
			const status =
				existingStatus == undefined
				|| existingStatus === UserIDStatus.Available
					? UserIDStatus.Enabled
					: existingStatus;

			const existingCred = this.#getCredentialCached_UC(type, userId);

			const codeData = typeof data === "string" ? data : Bytes.from(data);
			const result = await api.set(
				userId,
				status as Exclude<
					UserIDStatus,
					UserIDStatus.Available | UserIDStatus.StatusNotAvailable
				>,
				codeData,
			);
			let succeeded: boolean;
			let failure = SetCredentialResult.Error_Unknown;
			if (result == undefined) {
				const verified = await api.get(userId);
				succeeded =
					verified?.userIdStatus === status
					&& userCodeReadBackConfirmsSet(
						codeData,
						verified?.userCode,
						api.version,
					);
			} else if (supervisedCommandSucceeded(result)) {
				succeeded = true;
				// Supervision replaces the verification GET, so persist
				// the new state ourselves
				this.#persistCachedUserCode(userId, status, codeData);
			} else {
				// The device reported failure
				// Determine the actual state and treat an exact match as
				// success. The obfuscation leniency does not apply here,
				// since it would confirm the previous code.
				const verified = await api.get(userId);
				succeeded =
					verified?.userIdStatus === status
					&& userCodeEquals(codeData, verified.userCode);
				if (
					!succeeded
					&& existingCred
					&& verified?.userIdStatus === UserIDStatus.Available
				) {
					// There is no credential to modify on the device
					failure =
						SetCredentialResult.Error_ModifyRejectedLocationEmpty;
				}
			}
			if (succeeded) {
				const node = this.endpoint.tryGetNode();
				if (node) {
					node.emit(
						existingCred
							? "credential modified"
							: "credential added",
						this.endpoint as any,
						{
							userId,
							credentialType: type,
							credentialSlot: userId,
							data,
						},
					);
				}
			}
			return succeeded ? SetCredentialResult.OK : failure;
		}
	}

	/**
	 * Deletes the given credential.
	 * This communicates with the node.
	 */
	public async deleteCredential(
		type: UserCredentialType,
		slot: number,
	): Promise<SetCredentialResult>;
	public async deleteCredential(
		userId: number | undefined,
		type: UserCredentialType,
		slot: number,
	): Promise<SetCredentialResult>;

	public async deleteCredential(
		userIdOrType: number | undefined,
		typeOrSlot: UserCredentialType | number,
		slot?: number,
	): Promise<SetCredentialResult> {
		// 2-arg overload: (type, slot) — normalize to the 3-arg form
		if (slot == undefined) {
			return this.deleteCredential(
				0,
				userIdOrType as UserCredentialType,
				typeOrSlot,
			);
		}
		const userId = userIdOrType ?? 0;
		const type = typeOrSlot;

		if (this.#usesUserCredentialCC) {
			// userId 0 is the wildcard owner, so only range-check a specific user.
			if (userId !== 0) this.#assertValidUser(userId);
			this.#assertValidSlot(type, slot);

			const api = this.#u3cAPI();
			const raw = await api.setCredential({
				operationType: UserCredentialOperationType.Delete,
				userId,
				credentialType: type,
				credentialSlot: slot,
			});
			if (raw) await this.endpoint.tryGetNode()?.handleCommand(raw);
			return u3cCredentialReportTypeToSetCredentialResult(
				raw?.reportType,
			);
		} else {
			// User Code CC stores exactly one credential per user slot, with the
			// user identifier being the slot number. When the caller omits the
			// user (2-arg form), fall back to the slot. When both are given but
			// disagree, no credential can exist at that (user, slot) pair.
			if (userId !== 0 && userId !== slot) {
				return SetCredentialResult.Error_ModifyRejectedLocationEmpty;
			}

			// Make sure the addressed user is valid and the type is supported
			const targetUserId = userId === 0 ? slot : userId;
			this.#assertValidUser(targetUserId);
			this.#assertValidUCCredentialType(type);

			// Only emit deleted events if we knew about the credential beforehand.
			const existed =
				this.#getCredentialCached_UC(type, targetUserId) != undefined;

			const api = this.#ucAPI();
			const result = await api.clear(targetUserId);
			let succeeded: boolean;
			if (result != undefined && supervisedCommandSucceeded(result)) {
				succeeded = true;
			} else {
				// Unsupervised, or the device reported failure
				// Determine the actual state and treat an empty slot as
				// success in any case.
				const verified = await api.get(targetUserId);
				succeeded = verified?.userIdStatus === UserIDStatus.Available;
			}
			if (succeeded) {
				this.#clearCachedUserCodes(targetUserId);
			}
			if (succeeded && existed) {
				const node = this.endpoint.tryGetNode();
				if (node) {
					node.emit("credential deleted", this.endpoint as any, {
						userId: targetUserId,
						credentialType: type,
						credentialSlot: targetUserId,
					});
					node.emit("user deleted", this.endpoint as any, {
						userId: targetUserId,
					});
				}
			}
			return succeeded
				? SetCredentialResult.OK
				: SetCredentialResult.Error_Unknown;
		}
	}

	/**
	 * Deletes credentials matching the given filters.
	 */
	public async deleteCredentials(
		options: DeleteCredentialsOptions = {},
	): Promise<SetCredentialResult> {
		const userId = options.userId ?? 0;
		const credentialType =
			options.credentialType ?? UserCredentialType.None;

		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI().withOptions({
				reportTimeoutMs: BULK_DELETE_REPORT_TIMEOUT_MS,
			});
			const raw = await api.setCredential({
				operationType: UserCredentialOperationType.Delete,
				userId,
				credentialType,
				credentialSlot: 0,
			});
			if (raw) await this.endpoint.tryGetNode()?.handleCommand(raw);
			return u3cCredentialReportTypeToSetCredentialResult(
				raw?.reportType,
			);
		} else {
			// User Code CC
			if (
				credentialType !== UserCredentialType.None
				&& credentialType !== this.#ucCredentialType
			) {
				// Returning OK here would falsely imply the User Code CC user
				// was deleted (cascade), which only happens when the type
				// matches. Reject loudly so callers do not act on a fictional
				// success.
				throw new ZWaveError(
					`Credential type ${getEnumMemberName(
						UserCredentialType,
						credentialType,
					)} is not supported by this node`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			// Only emit deleted events if we knew about the credential beforehand.
			// The wildcard branch (userId === 0) always emits, since verifying
			// the prior state across all users is unrealistic.
			const existed =
				userId !== 0
					? this.#getUserCached_UC(userId) != undefined
					: true;

			const api = this.#ucAPI();
			const result = await api.clear(userId);
			let succeeded: boolean;
			if (result != undefined && supervisedCommandSucceeded(result)) {
				succeeded = true;
			} else if (userId !== 0) {
				// Unsupervised, or the device reported failure
				// Determine the actual state and treat an empty slot as
				// success in any case.
				const verified = await api.get(userId);
				succeeded = verified?.userIdStatus === UserIDStatus.Available;
			} else {
				// Verifying all users being deleted is unrealistic
				// since there can be up to 65535 users. So we just
				// assume it worked when the command was not supervised.
				succeeded = result == undefined;
			}
			if (succeeded) {
				this.#clearCachedUserCodes(userId);
			}
			if (succeeded && existed) {
				const node = this.endpoint.tryGetNode();
				if (node) {
					node.emit("credential deleted", this.endpoint as any, {
						userId,
						credentialType: this.#ucCredentialType,
						credentialSlot: userId,
					});
					node.emit("user deleted", this.endpoint as any, { userId });
				}
			}
			return succeeded
				? SetCredentialResult.OK
				: SetCredentialResult.Error_Unknown;
		}
	}

	/**
	 * Assigns an existing credential to a different user, without re-enrolling
	 * it. Useful for credentials that were added locally on the device (e.g. a
	 * biometric auto-assigned to a fresh user) that need to be attached to an
	 * existing user which already has other credentials.
	 *
	 * Only supported on nodes using the User Credential CC. Use
	 * {@link getCredentialCapabilitiesCached} to check for support via the
	 * `supportsCredentialAssignment` property.
	 *
	 * This communicates with the node.
	 */
	public async assignCredential(
		type: UserCredentialType,
		slot: number,
		destinationUserId: number,
	): Promise<AssignCredentialResult> {
		if (!this.#usesUserCredentialCC) {
			throw new ZWaveError(
				"This node does not support assigning a credential to a different user",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		this.#assertValidSlot(type, slot);

		const api = this.#u3cAPI();
		const response = await api.setUserCredentialAssociation({
			credentialType: type,
			credentialSlot: slot,
			destinationUserId,
		});
		if (response) {
			await this.endpoint.tryGetNode()?.handleCommand(response);
		}
		return u3cAssociationStatusToAssignCredentialResult(response?.status);
	}

	/**
	 * Starts a learn process for the given credential slot, allowing a user
	 * to input a credential directly on the device.
	 * Only supported on nodes using the User Credential CC.
	 * This communicates with the node.
	 */
	public async startCredentialLearn(
		userId: number,
		type: UserCredentialType,
		slot: number,
		timeout?: number,
	): Promise<SupervisionResult | undefined> {
		if (!this.#usesUserCredentialCC) {
			throw new ZWaveError(
				"This node does not support learning credentials",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		this.#assertValidSlot(type, slot);

		const existing = this.#getCredentialCachedForUser_U3C(
			userId,
			type,
			slot,
		);
		const operationType = existing
			? UserCredentialOperationType.Modify
			: UserCredentialOperationType.Add;

		timeout ??=
			this.getCredentialCapabilitiesCached().supportedCredentialTypes.get(
				type,
			)?.credentialLearnRecommendedTimeout;

		if (timeout == undefined) {
			throw new ZWaveError(
				`Credential learning is not supported for credential type ${getEnumMemberName(
					UserCredentialType,
					type,
				)}`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		const api = this.#u3cAPI();
		return api.startCredentialLearn({
			userId,
			credentialType: type,
			credentialSlot: slot,
			operationType,
			learnTimeout: timeout,
		});
	}

	/**
	 * Cancels an ongoing credential learn process.
	 * Only supported on nodes using the User Credential CC.
	 * This communicates with the node.
	 */
	public async cancelCredentialLearn(): Promise<
		SupervisionResult | undefined
	> {
		if (!this.#usesUserCredentialCC) {
			throw new ZWaveError(
				"This node does not support learning credentials",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		const api = this.#u3cAPI();
		return api.cancelCredentialLearn();
	}

	/**
	 * Retrieves the admin code from the node.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getAdminCode(): Promise<string | undefined> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			return api.getAdminPinCode();
		} else {
			const api = this.#ucAPI();
			return api.getAdminCode();
		}
	}

	/**
	 * Sets the admin code on the node.
	 * This communicates with the node.
	 */
	public async setAdminCode(
		code: string,
	): Promise<SupervisionResult | undefined> {
		if (this.#usesUserCredentialCC) {
			const api = this.#u3cAPI();
			return api.setAdminPinCode({ pinCode: code });
		} else {
			const api = this.#ucAPI();
			return api.setAdminCode(code);
		}
	}

	#ucAPI(): UserCodeCCAPI {
		return this.endpoint.commandClasses["User Code"];
	}

	#u3cAPI(): UserCredentialCCAPI {
		return this.endpoint.commandClasses["User Credential"];
	}

	#supportsCredentialType(type: UserCredentialType): boolean {
		return this.getCredentialCapabilitiesCached().supportedCredentialTypes.has(
			type,
		);
	}

	/** The ASCII characters the node accepts in user codes, if known */
	get #supportedASCIIChars(): string | undefined {
		return this.getValue<string>(
			UserCodeCCValues.supportedASCIIChars.endpoint(this.endpoint.index),
		);
	}

	/** Returns the credential type to use for User Code CC based on supported characters */
	get #ucCredentialType(): UserCredentialType {
		return supportsNonPINChars(this.#supportedASCIIChars)
			? UserCredentialType.Password
			: UserCredentialType.PINCode;
	}

	/** Maps User Code CC's UserIDStatus to the unified active/userType model */
	#mapUserCodeStatusToUserData(
		userId: number,
		status: UserIDStatus,
	): UserData | undefined {
		// These statuses indicate no user is configured for this slot
		if (
			status === UserIDStatus.Available
			|| status === UserIDStatus.StatusNotAvailable
			|| status === UserIDStatus.PassageMode
		) {
			return undefined;
		}

		let active: boolean;
		let userType: UserCredentialUserType;
		switch (status) {
			case UserIDStatus.Enabled:
				active = true;
				userType = UserCredentialUserType.General;
				break;
			case UserIDStatus.Disabled:
				active = false;
				userType = UserCredentialUserType.General;
				break;
			// Messaging is the closest User Code CC equivalent to NonAccess
			case UserIDStatus.Messaging:
				active = true;
				userType = UserCredentialUserType.NonAccess;
				break;
			default:
				active = true;
				userType = UserCredentialUserType.General;
				break;
		}

		return { userId, active, userType };
	}

	/**
	 * Removes cached credential values from the value DB that belong to the given
	 * user and fall within the given property-key range.
	 * @param userId The user ID to match, or 0 to match all users
	 * @param fromKey The lower bound of the property key range to match (inclusive)
	 * @param toKey The upper bound of the property key range to match (exclusive)
	 */
	#purgeCachedCredentials(
		userId: number,
		fromKey = 0,
		toKey = Number.POSITIVE_INFINITY,
	): void {
		const valueDB = this.endpoint.tryGetNode()?.valueDB;
		if (!valueDB) return;

		// Determine the ownership of all credentials
		const credentialOwners = valueDB.findValues(
			(vid) =>
				UserCredentialCCValues.credentialOwner.is(vid)
				&& vid.endpoint === this.endpoint.index,
		);
		// And delete them if they lie in the half-open range [fromKey, toKey) (and optionally belong to the given user)
		for (const { endpoint, propertyKey, value } of credentialOwners) {
			const key = propertyKey as number;
			if (key < fromKey || key >= toKey) continue;
			// Skip other users' entries because they aren't visited by this walk
			if (userId !== 0 && value !== userId) continue;

			const type = key >>> 16;
			const slot = key & 0xffff;
			for (const valueId of [
				UserCredentialCCValues.credential(type, slot),
				UserCredentialCCValues.credentialOwner(type, slot),
				UserCredentialCCValues.credentialModifierType(type, slot),
				UserCredentialCCValues.credentialModifierNodeId(type, slot),
			]) {
				valueDB.removeValue(valueId.endpoint(endpoint));
			}
		}
	}

	/**
	 * Persists a User Code CC slot's status and code in the value DB after a
	 * successful supervised write, which does not trigger a verification GET.
	 */
	#persistCachedUserCode(
		userId: number,
		status: UserIDStatus,
		code: string | Uint8Array,
	): void {
		const valueDB = this.endpoint.tryGetNode()?.valueDB;
		if (!valueDB) return;

		valueDB.setValue(
			UserCodeCCValues.userIdStatus(userId).endpoint(this.endpoint.index),
			status,
		);
		valueDB.setValue(
			UserCodeCCValues.userCode(userId).endpoint(this.endpoint.index),
			code,
		);
	}

	/**
	 * Resets cached User Code CC slots in the value DB to the cleared state
	 * (`userIdStatus = Available`, `userCode = ""`).
	 * If `userId` is given, only that slot is reset; otherwise all cached slots are reset.
	 */
	#clearCachedUserCodes(userId?: number): void {
		const valueDB = this.endpoint.tryGetNode()?.valueDB;
		if (!valueDB) return;

		let values = valueDB.findValues(
			(vid) =>
				vid.endpoint === this.endpoint.index
				&& (UserCodeCCValues.userIdStatus.is(vid)
					|| UserCodeCCValues.userCode.is(vid)),
		);
		if (userId) {
			values = values.filter((vid) => vid.propertyKey === userId);
		}

		for (const vid of values) {
			if (UserCodeCCValues.userIdStatus.is(vid)) {
				valueDB.setValue(vid, UserIDStatus.Available);
			} else {
				valueDB.setValue(vid, "");
			}
		}
	}

	#mapCredentialData(
		result: UserCredentialCCCredentialReport | undefined,
	): CredentialData | undefined {
		if (!result?.credentialSlot) return undefined;
		return {
			userId: result.userId,
			type: result.credentialType,
			slot: result.credentialSlot,
			data:
				result.credentialData != undefined
					? normalizeCredentialData(
							result.credentialType,
							result.credentialData,
						)
					: undefined,
		};
	}

	async #queryCredentials_U3C(
		userId: number,
		startType: UserCredentialType,
		startSlot: number,
		filterType?: UserCredentialType,
	): Promise<CredentialData[]> {
		const api = this.#u3cAPI();
		const credentials: CredentialData[] = [];
		let queryType = startType;
		let querySlot = startSlot;

		const scopeEnd =
			filterType != undefined
				? credentialPropertyKey(filterType + 1, 0)
				: credentialPropertyKey(0xff + 1, 0);

		// U3C credential enumeration behaves like a cursor walk.
		// The initial (userId, type, slot) triple may be exact or wildcarded,
		// and each report returns both the matching credential and a pointer to
		// the next credential that should be requested.
		while (true) {
			const result = await api.getCredential(
				userId,
				queryType,
				querySlot,
			);
			if (result) await this.endpoint.tryGetNode()?.handleCommand(result);
			const credential = this.#mapCredentialData(result);
			// Empty report on the first request - there are no credentials for this user and type.
			// Purge them all.
			if (result && !credential && credentials.length === 0) {
				this.#purgeCachedCredentials(
					userId,
					credentialPropertyKey(startType, startSlot),
					scopeEnd,
				);
			}
			// No credential means the walk is exhausted or the current selector did
			// not resolve to a valid entry on this node.
			if (!result || !credential) break;
			// When iterating a single type, stop as soon as the node answers with a
			// credential of another type instead of leaking unrelated results.
			if (filterType != undefined && credential.type !== filterType) {
				break;
			}

			// Purge all cached stale credentials before the first result
			if (credentials.length === 0) {
				this.#purgeCachedCredentials(
					userId,
					credentialPropertyKey(startType, startSlot),
					credentialPropertyKey(credential.type, credential.slot),
				);
			}

			credentials.push(credential);

			const nextType =
				result.nextCredentialType ?? UserCredentialType.None;
			const nextSlot = result.nextCredentialSlot ?? 0;
			// A zero next pointer marks the end of the node's credential sequence,
			// so purge all stale credentials after the last result
			if (nextType === UserCredentialType.None && nextSlot === 0) {
				this.#purgeCachedCredentials(
					userId,
					credentialPropertyKey(credential.type, credential.slot + 1),
					scopeEnd,
				);
				break;
			}
			// Per CC:0083.01.0C.11.024/.025, the next pointer advances to the next
			// existing credential for the user, across credential types. For
			// type-filtered walks, stop before following that pointer into a
			// different type.
			if (filterType != undefined && nextType !== filterType) {
				// Purge the filtered type's tail when the pointer crosses into a later type
				if (nextType > filterType) {
					this.#purgeCachedCredentials(
						userId,
						credentialPropertyKey(
							credential.type,
							credential.slot + 1,
						),
						scopeEnd,
					);
				}
				break;
			}
			// Guard against buggy nodes that repeat the same cursor forever.
			if (nextType === queryType && nextSlot === querySlot) {
				break;
			}

			this.#purgeCachedCredentials(
				userId,
				credentialPropertyKey(credential.type, credential.slot + 1),
				credentialPropertyKey(nextType, nextSlot),
			);

			queryType = nextType;
			querySlot = nextSlot;
		}

		return credentials;
	}

	async #getAllCredentials_UC(): Promise<CredentialData[]> {
		const api = this.#ucAPI();
		const maxUsers = await api.getUsersCount();
		if (!maxUsers) return [];

		const credentials: CredentialData[] = [];
		const supportsBulk = !!this.getValue<boolean>(
			UserCodeCCValues.supportsMultipleUserCodeReport.endpoint(
				this.endpoint.index,
			),
		);

		if (supportsBulk) {
			let nextUserId = 1;
			while (nextUserId > 0 && nextUserId <= maxUsers) {
				const response = await api.get(nextUserId, true);
				if (!response) break;

				for (const entry of response.userCodes) {
					if (
						entry.userIdStatus === UserIDStatus.Available
						|| entry.userIdStatus
							=== UserIDStatus.StatusNotAvailable
					) {
						continue;
					}
					// Bulk User Code reports enumerate user slots, which become the
					// unified credential slots for the returned credentials.
					credentials.push({
						userId: entry.userId,
						type: this.#ucCredentialType,
						slot: entry.userId,
						data: entry.userCode,
					});
				}

				nextUserId = response.nextUserId;
			}
		} else {
			for (let userId = 1; userId <= maxUsers; userId++) {
				const credential = await this.getCredential(
					this.#ucCredentialType,
					userId,
				);
				if (credential) credentials.push(credential);
			}
		}

		return credentials;
	}

	#getAllCredentialsCached_U3C(): CredentialData[] {
		const valueDB = this.endpoint.tryGetNode()?.valueDB;
		if (!valueDB) return [];

		return valueDB
			.findValues(
				(vid) =>
					UserCredentialCCValues.credentialOwner.is(vid)
					&& vid.endpoint === this.endpoint.index,
			)
			.filter(({ propertyKey }) => typeof propertyKey === "number")
			.toSorted(
				(a, b) => (a.propertyKey as number) - (b.propertyKey as number),
			)
			.flatMap(({ propertyKey }) => {
				const key = propertyKey as number;
				const type = key >>> 16;
				const slot = key & 0xffff;
				const credential = this.#getCredentialCached_U3C(type, slot);
				return credential ? [credential] : [];
			});
	}

	#getAllCredentialsCached_UC(): CredentialData[] {
		const maxUsers =
			this.getValue<number>(
				UserCodeCCValues.supportedUsers.endpoint(this.endpoint.index),
			) ?? 0;
		const credentials: CredentialData[] = [];
		// Cached User Code values are keyed by user slot, and the unified
		// abstraction reuses that slot number as the credential slot.
		for (let userId = 1; userId <= maxUsers; userId++) {
			const credential = this.#getCredentialCached_UC(
				this.#ucCredentialType,
				userId,
			);
			if (credential) credentials.push(credential);
		}
		return credentials;
	}

	#assertValidSlot(type: UserCredentialType, slot: number): void {
		const caps =
			this.getCredentialCapabilitiesCached().supportedCredentialTypes.get(
				type,
			);
		if (!caps || slot < 1 || slot > caps.numberOfCredentialSlots) {
			throw new ZWaveError(
				`Credential slot ${slot} is out of range for credential type ${getEnumMemberName(
					UserCredentialType,
					type,
				)}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
	}

	#assertValidUser(userId: number): void {
		const maxUsers = this.getUserCapabilitiesCached().maxUsers;
		if (maxUsers === undefined || maxUsers === 0) {
			// Allow calling the API anyways if the node's interview failed
			return;
		}
		if (userId < 1 || userId > maxUsers) {
			throw new ZWaveError(
				`User ID ${userId} is out of range`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
	}

	/**
	 * Asserts that the given credential type is the one used to represent
	 * User Code CC credentials on this node, which only supports a single type.
	 */
	#assertValidUCCredentialType(type: UserCredentialType): void {
		if (type !== this.#ucCredentialType) {
			throw new ZWaveError(
				`Credential type ${getEnumMemberName(
					UserCredentialType,
					type,
				)} is not supported by this node`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
	}

	#getUserCached_U3C(userId: number): UserData | undefined {
		const userType = this.getValue<UserCredentialUserType>(
			UserCredentialCCValues.userType(userId).endpoint(
				this.endpoint.index,
			),
		);
		if (userType == undefined) return undefined;

		return {
			userId,
			active:
				this.getValue<boolean>(
					UserCredentialCCValues.userActive(userId).endpoint(
						this.endpoint.index,
					),
				) ?? false,
			userType,
			userName:
				this.getValue<string>(
					UserCredentialCCValues.userName(userId).endpoint(
						this.endpoint.index,
					),
				) ?? undefined,
			credentialRule:
				this.getValue<UserCredentialRule>(
					UserCredentialCCValues.credentialRule(userId).endpoint(
						this.endpoint.index,
					),
				) ?? undefined,
			expiringTimeoutMinutes:
				this.getValue<number>(
					UserCredentialCCValues.expiringTimeoutMinutes(
						userId,
					).endpoint(this.endpoint.index),
				) || undefined,
		};
	}

	#getCredentialOwner_U3C(
		type: UserCredentialType,
		slot: number,
	): number | undefined {
		return this.getValue<number>(
			UserCredentialCCValues.credentialOwner(type, slot).endpoint(
				this.endpoint.index,
			),
		);
	}

	#getCredentialCached_U3C(
		type: UserCredentialType,
		slot: number,
	): CredentialData | undefined {
		const owner = this.#getCredentialOwner_U3C(type, slot);
		if (owner == undefined) return undefined;

		// When credentialReadBack is false, the node never returns credential
		// data. In that case, we still know the slot is occupied and to which
		// user it belongs, and return the credential without data.
		const data = this.getValue<string | Uint8Array>(
			UserCredentialCCValues.credential(type, slot).endpoint(
				this.endpoint.index,
			),
		);
		return { userId: owner, type, slot, data };
	}

	#getCredentialCachedForUser_U3C(
		userId: number,
		type: UserCredentialType,
		slot: number,
	): CredentialData | undefined {
		const credential = this.#getCredentialCached_U3C(type, slot);
		if (credential?.userId !== userId) return undefined;
		return credential;
	}

	#getUserCached_UC(userId: number): UserData | undefined {
		const status = this.getValue<UserIDStatus>(
			UserCodeCCValues.userIdStatus(userId).endpoint(this.endpoint.index),
		);
		if (status == undefined) return undefined;
		return this.#mapUserCodeStatusToUserData(userId, status);
	}

	#getCredentialCached_UC(
		type: UserCredentialType,
		slot: number,
	): CredentialData | undefined {
		if (type !== this.#ucCredentialType) return undefined;
		// For User Code CC, credential slots and users are identical
		const status = this.getValue<UserIDStatus>(
			UserCodeCCValues.userIdStatus(slot).endpoint(this.endpoint.index),
		);
		if (
			status == undefined
			|| status === UserIDStatus.Available
			|| status === UserIDStatus.StatusNotAvailable
		) {
			return undefined;
		}
		const data = this.getValue<string>(
			UserCodeCCValues.userCode(slot).endpoint(this.endpoint.index),
		);
		if (data == undefined) return undefined;
		return { userId: slot, type, slot, data };
	}
}
