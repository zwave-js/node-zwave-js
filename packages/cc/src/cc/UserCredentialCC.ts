import {
	CommandClasses,
	type EndpointId,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import {
	Bytes,
	getEnumMemberName,
	pick,
	stringToUint8ArrayUTF16BE,
	uint8ArrayToStringUTF16BE,
} from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";

import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	type RefreshValuesOptions,
	getEffectiveCCVersion,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	UserCredentialAdminCodeOperationResult,
	type UserCredentialCapability,
	UserCredentialCommand,
	UserCredentialCredentialReportType,
	type UserCredentialKeyLockerEntryCapability,
	UserCredentialKeyLockerEntryType,
	UserCredentialLearnStatus,
	UserCredentialModifierType,
	UserCredentialNameEncoding,
	UserCredentialOperationType,
	UserCredentialRule,
	UserCredentialType,
	UserCredentialUserReportType,
	UserCredentialUserType,
} from "../lib/_Types.js";
export type { UserCredentialCapability as UserCredentialCredentialCapability } from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

function credentialToLogString(credential: string | Bytes): string {
	if (credential.length === 0) return "(empty)";
	return "*".repeat(credential.length);
}

/**
 * Returns the canonical form of a credential for storage and reporting:
 * text credentials (PIN codes, passwords) are returned as strings, binary
 * credentials (biometric data, BLE/NFC/RFID identifiers, ...) as raw bytes.
 */
export function normalizeCredentialData(
	credentialType: UserCredentialType,
	credentialData: Bytes,
): string | Bytes {
	if (
		credentialType === UserCredentialType.PINCode
		|| credentialType === UserCredentialType.Password
	) {
		return credentialData.toString("utf8");
	}
	return credentialData;
}

// All of these values are internal, and not meant to be used by applications directly.
// To interact with user credentials, use the functionality on the ZWaveNode class.
export const UserCredentialCCValues = V.defineCCValues(
	CommandClasses["User Credential"],
	{
		// Internal capability values
		...V.staticProperty("supportedUsers", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedCredentialRules", undefined, {
			internal: true,
		}),
		...V.staticProperty("maxUserNameLength", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsUserSchedule", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsAllUsersChecksum", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsUserChecksum", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedUserNameEncodings", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedUserTypes", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsCredentialChecksum", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsAdminCode", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsAdminCodeDeactivation", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedCredentialTypes", undefined, {
			internal: true,
		}),
		...V.dynamicPropertyAndKeyWithName(
			"credentialCapabilities",
			"credentialCapabilities",
			(credentialType: UserCredentialType) => credentialType,
			({ property, propertyKey }) =>
				property === "credentialCapabilities"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.staticProperty("allUsersChecksum", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedKeyLockerEntryTypes", undefined, {
			internal: true,
			minVersion: 2,
		}),
		...V.dynamicPropertyAndKeyWithName(
			"keyLockerCapabilities",
			"keyLockerCapabilities",
			(entryType: UserCredentialKeyLockerEntryType) => entryType,
			({ property, propertyKey }) =>
				property === "keyLockerCapabilities"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true, minVersion: 2 },
		),

		// Per-user values
		...V.dynamicPropertyAndKeyWithName(
			"userType",
			"userType",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userType" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"userActive",
			"userActive",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userActive" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"credentialRule",
			"credentialRule",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "credentialRule"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"expiringTimeoutMinutes",
			"expiringTimeoutMinutes",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "expiringTimeoutMinutes"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"userName",
			"userName",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userName" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"userModifierType",
			"userModifierType",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userModifierType"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"userModifierNodeId",
			"userModifierNodeId",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userModifierNodeId"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"userChecksum",
			"userChecksum",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userChecksum" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		// Per-credential owner info (keyed by type << 16 | slot)
		...V.dynamicPropertyAndKeyWithName(
			"credentialOwner",
			"credentialOwner",
			(type: UserCredentialType, slot: number) => (type << 16) | slot,
			({ property, propertyKey }) =>
				property === "credentialOwner"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		// Per-credential modifier info (keyed by type << 16 | slot)
		...V.dynamicPropertyAndKeyWithName(
			"credentialModifierType",
			"credentialModifierType",
			(type: UserCredentialType, slot: number) => (type << 16) | slot,
			({ property, propertyKey }) =>
				property === "credentialModifierType"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"credentialModifierNodeId",
			"credentialModifierNodeId",
			(type: UserCredentialType, slot: number) => (type << 16) | slot,
			({ property, propertyKey }) =>
				property === "credentialModifierNodeId"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		// Per-credential values (keyed by type << 16 | slot)
		...V.dynamicPropertyAndKeyWithName(
			"credential",
			"credential",
			(type: UserCredentialType, slot: number) => (type << 16) | slot,
			({ property, propertyKey }) =>
				property === "credential" && typeof propertyKey === "number",
			undefined,
			{ internal: true, secret: true },
		),

		// Admin PIN Code
		...V.staticProperty("adminPinCode", undefined, {
			internal: true,
			secret: true,
		}),

		// V2 Key Locker entries
		...V.dynamicPropertyAndKeyWithName(
			"keyLockerEntry",
			"keyLockerEntry",
			(type: UserCredentialKeyLockerEntryType, slot: number) =>
				(type << 16) | slot,
			({ property, propertyKey }) =>
				property === "keyLockerEntry"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true, minVersion: 2 },
		),
	},
);

// API class
@API(CommandClasses["User Credential"])
export class UserCredentialCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: UserCredentialCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			// Mandatory v1 commands
			case UserCredentialCommand.UserCapabilitiesGet:
			case UserCredentialCommand.UserCapabilitiesReport:
			case UserCredentialCommand.CredentialCapabilitiesGet:
			case UserCredentialCommand.CredentialCapabilitiesReport:
			case UserCredentialCommand.UserSet:
			case UserCredentialCommand.UserGet:
			case UserCredentialCommand.UserReport:
			case UserCredentialCommand.CredentialSet:
			case UserCredentialCommand.CredentialGet:
			case UserCredentialCommand.CredentialReport:
			case UserCredentialCommand.CredentialLearnStart:
			case UserCredentialCommand.CredentialLearnCancel:
			case UserCredentialCommand.CredentialLearnReport:
			case UserCredentialCommand.UserCredentialAssociationSet:
			case UserCredentialCommand.UserCredentialAssociationReport:
				return true;

			case UserCredentialCommand.AllUsersChecksumGet:
			case UserCredentialCommand.AllUsersChecksumReport: {
				return this.tryGetValueDB()?.getValue<boolean>(
					UserCredentialCCValues.supportsAllUsersChecksum.endpoint(
						this.endpoint.index,
					),
				);
			}
			case UserCredentialCommand.UserChecksumGet:
			case UserCredentialCommand.UserChecksumReport: {
				return this.tryGetValueDB()?.getValue<boolean>(
					UserCredentialCCValues.supportsUserChecksum.endpoint(
						this.endpoint.index,
					),
				);
			}
			case UserCredentialCommand.CredentialChecksumGet:
			case UserCredentialCommand.CredentialChecksumReport: {
				return this.tryGetValueDB()?.getValue<boolean>(
					UserCredentialCCValues.supportsCredentialChecksum.endpoint(
						this.endpoint.index,
					),
				);
			}
			case UserCredentialCommand.AdminPinCodeSet:
			case UserCredentialCommand.AdminPinCodeGet:
			case UserCredentialCommand.AdminPinCodeReport: {
				return this.tryGetValueDB()?.getValue<boolean>(
					UserCredentialCCValues.supportsAdminCode.endpoint(
						this.endpoint.index,
					),
				);
			}

			// V2 commands
			case UserCredentialCommand.KeyLockerCapabilitiesGet:
			case UserCredentialCommand.KeyLockerCapabilitiesReport:
			case UserCredentialCommand.KeyLockerEntrySet:
			case UserCredentialCommand.KeyLockerEntryGet:
			case UserCredentialCommand.KeyLockerEntryReport:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getUserCapabilities() {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserCapabilitiesGet,
		);

		const cc = new UserCredentialCCUserCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCUserCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"numberOfSupportedUsers",
				"supportedCredentialRules",
				"maxUserNameLength",
				"supportsUserSchedule",
				"supportsAllUsersChecksum",
				"supportsUserChecksum",
				"supportedUserNameEncodings",
				"supportedUserTypes",
			]);
		}
	}

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getCredentialCapabilities() {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialCapabilitiesGet,
		);

		const cc = new UserCredentialCCCredentialCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCCredentialCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"supportsCredentialChecksum",
				"supportsAdminCode",
				"supportsAdminCodeDeactivation",
				"credentialTypes",
			]);
		}
	}

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getKeyLockerCapabilities() {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.KeyLockerCapabilitiesGet,
		);

		const cc = new UserCredentialCCKeyLockerCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCKeyLockerCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		return response?.keyLockerCapabilities;
	}

	// User Management
	/**
	 * Applications should not use this method directly. Prefer the
	 * `endpoint.accessControl` API for managing users.
	 */
	@validateArgs()
	public async setUser(
		options: UserCredentialCCUserSetOptions,
	): Promise<UserCredentialCCUserReport | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserSet,
		);

		const cc = new UserCredentialCCUserSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand<UserCredentialCCUserReport>(
			cc,
			this.commandOptions,
		);
	}

	/**
	 * Applications should not use this method directly. Prefer the
	 * `endpoint.accessControl` API for querying users.
	 */
	@validateArgs()
	public async getUser(
		userId: number,
	): Promise<UserCredentialCCUserReport | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserGet,
		);

		const cc = new UserCredentialCCUserGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			userId,
		});
		return this.host.sendCommand<UserCredentialCCUserReport>(
			cc,
			this.commandOptions,
		);
	}

	// Credential Management
	/**
	 * Applications should not use this method directly. Prefer the
	 * `endpoint.accessControl` API for managing credentials.
	 */
	@validateArgs()
	public async setCredential(
		options: UserCredentialCCCredentialSetOptions,
	): Promise<UserCredentialCCCredentialReport | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialSet,
		);

		const cc = new UserCredentialCCCredentialSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand<UserCredentialCCCredentialReport>(
			cc,
			this.commandOptions,
		);
	}

	/**
	 * Applications should not use this method directly. Prefer the
	 * `endpoint.accessControl` API for querying credentials.
	 */
	@validateArgs()
	public async getCredential(
		userId: number,
		credentialType: UserCredentialType,
		credentialSlot: number,
	): Promise<UserCredentialCCCredentialReport | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialGet,
		);

		const cc = new UserCredentialCCCredentialGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			userId,
			credentialType,
			credentialSlot,
		});
		return this.host.sendCommand<UserCredentialCCCredentialReport>(
			cc,
			this.commandOptions,
		);
	}

	@validateArgs()
	public async startCredentialLearn(
		options: UserCredentialCCCredentialLearnStartOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialLearnStart,
		);

		// The node will ignore the command if credential learning is not
		// supported for this credential type (CC:0083.01.0F.11.004)
		const caps = UserCredentialCC.getCredentialCapabilitiesCached(
			this.host,
			this.endpoint,
			options.credentialType,
		);
		if (caps && !caps.supportsCredentialLearn) {
			throw new ZWaveError(
				`Credential learning is not supported for credential type ${getEnumMemberName(
					UserCredentialType,
					options.credentialType,
				)}`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		const cc = new UserCredentialCCCredentialLearnStart({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async cancelCredentialLearn(): Promise<
		SupervisionResult | undefined
	> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialLearnCancel,
		);

		const cc = new UserCredentialCCCredentialLearnCancel({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Applications should not use this method directly. Prefer the
	 * `endpoint.accessControl` API for reassigning credentials between users.
	 */
	@validateArgs()
	public async setUserCredentialAssociation(
		options: UserCredentialCCAssociationSetOptions,
	): Promise<UserCredentialCCAssociationReport | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserCredentialAssociationSet,
		);

		const cc = new UserCredentialCCAssociationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand<UserCredentialCCAssociationReport>(
			cc,
			this.commandOptions,
		);
	}

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getAllUsersChecksum() {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.AllUsersChecksumGet,
		);

		const cc = new UserCredentialCCAllUsersChecksumGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCAllUsersChecksumReport>(
				cc,
				this.commandOptions,
			);
		return response?.checksum;
	}

	@validateArgs()
	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getUserChecksum(userId: number) {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserChecksumGet,
		);

		const cc = new UserCredentialCCUserChecksumGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			userId,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCUserChecksumReport>(
				cc,
				this.commandOptions,
			);
		return response?.checksum;
	}

	@validateArgs()
	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getCredentialChecksum(credentialType: UserCredentialType) {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialChecksumGet,
		);

		const cc = new UserCredentialCCCredentialChecksumGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			credentialType,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCCredentialChecksumReport>(
				cc,
				this.commandOptions,
			);
		return response?.checksum;
	}

	@validateArgs()
	public async setAdminPinCode(
		options: UserCredentialCCAdminPinCodeSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.AdminPinCodeSet,
		);

		// Deactivating the admin code (empty string) requires ACD support,
		// otherwise the node may ignore the command (CC:0083.01.1A.13.003)
		if (options.pinCode.length === 0) {
			const supportsDeactivation =
				this.tryGetValueDB()?.getValue<boolean>(
					UserCredentialCCValues.supportsAdminCodeDeactivation.endpoint(
						this.endpoint.index,
					),
				);
			if (supportsDeactivation === false) {
				throw new ZWaveError(
					"This node does not support deactivating the Admin Code",
					ZWaveErrorCodes.CC_NotSupported,
				);
			}
		}

		const cc = new UserCredentialCCAdminPinCodeSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getAdminPinCode() {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.AdminPinCodeGet,
		);

		const cc = new UserCredentialCCAdminPinCodeGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCAdminPinCodeReport>(
				cc,
				this.commandOptions,
			);
		return response?.pinCode;
	}

	@validateArgs()
	public async setKeyLockerEntry(
		options: UserCredentialCCKeyLockerEntrySetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.KeyLockerEntrySet,
		);

		const cc = new UserCredentialCCKeyLockerEntrySet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getKeyLockerEntry(
		entryType: UserCredentialKeyLockerEntryType,
		entrySlot: number,
	) {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.KeyLockerEntryGet,
		);

		const cc = new UserCredentialCCKeyLockerEntryGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			entryType,
			entrySlot,
		});
		const response =
			await this.host.sendCommand<UserCredentialCCKeyLockerEntryReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["occupied", "entryType", "entrySlot"]);
		}
	}

	@validateArgs()
	public async sendUserCapabilitiesReport(
		options: UserCredentialCCUserCapabilitiesReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserCapabilitiesReport,
		);

		const cc = new UserCredentialCCUserCapabilitiesReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendCredentialCapabilitiesReport(
		options: UserCredentialCCCredentialCapabilitiesReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialCapabilitiesReport,
		);

		const cc = new UserCredentialCCCredentialCapabilitiesReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendKeyLockerCapabilitiesReport(
		options: UserCredentialCCKeyLockerCapabilitiesReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.KeyLockerCapabilitiesReport,
		);

		const cc = new UserCredentialCCKeyLockerCapabilitiesReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendUserReport(
		options: UserCredentialCCUserReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserReport,
		);

		const cc = new UserCredentialCCUserReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendCredentialReport(
		options: UserCredentialCCCredentialReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialReport,
		);

		const cc = new UserCredentialCCCredentialReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendCredentialLearnReport(
		options: UserCredentialCCCredentialLearnReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialLearnReport,
		);

		const cc = new UserCredentialCCCredentialLearnReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendUserCredentialAssociationReport(
		options: UserCredentialCCAssociationReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserCredentialAssociationReport,
		);

		const cc = new UserCredentialCCAssociationReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendAllUsersChecksumReport(
		options: UserCredentialCCAllUsersChecksumReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.AllUsersChecksumReport,
		);

		const cc = new UserCredentialCCAllUsersChecksumReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendUserChecksumReport(
		options: UserCredentialCCUserChecksumReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.UserChecksumReport,
		);

		const cc = new UserCredentialCCUserChecksumReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendCredentialChecksumReport(
		options: UserCredentialCCCredentialChecksumReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.CredentialChecksumReport,
		);

		const cc = new UserCredentialCCCredentialChecksumReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendAdminPinCodeReport(
		options: UserCredentialCCAdminPinCodeReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.AdminPinCodeReport,
		);

		const cc = new UserCredentialCCAdminPinCodeReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendKeyLockerEntryReport(
		options: UserCredentialCCKeyLockerEntryReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCredentialCommand,
			UserCredentialCommand.KeyLockerEntryReport,
		);

		const cc = new UserCredentialCCKeyLockerEntryReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["User Credential"])
@implementedVersion(2)
@ccValues(UserCredentialCCValues)
export class UserCredentialCC extends CommandClass {
	declare ccCommand: UserCredentialCommand;

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["User Credential"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
			tag: "interview",
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying user capabilities...",
			direction: "outbound",
		});
		const userCaps = await api.getUserCapabilities();
		if (!userCaps) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"User capabilities query timed out - skipping interview",
				level: "warn",
			});
			return;
		}

		// CL:0083.01.21.00.4: The controlling node MUST use User Credential
		// Command Class to control a supporting node unless the supporting
		// node reports that (0) Users are supported.
		if (userCaps.numberOfSupportedUsers === 0) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Node reports 0 supported users and operates in User Code CC mode, skipping the rest of the interview...",
				direction: "none",
			});
			this.setInterviewComplete(ctx, true);
			return;
		}

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying credential capabilities...",
			direction: "outbound",
		});
		const credCaps = await api.getCredentialCapabilities();
		if (!credCaps) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Credential capabilities query timed out - skipping interview",
				level: "warn",
			});
			return;
		}

		if (api.version >= 2) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying key locker capabilities...",
				direction: "outbound",
			});
			await api.getKeyLockerCapabilities();
		}

		await this.refreshValues(ctx, {
			tag: "interview",
			onProgress: (completed, total) =>
				node.reportInterviewProgress(completed, total),
		});

		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
		options?: RefreshValuesOptions,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;

		const supportedUsers = this.getValue<number>(
			ctx,
			UserCredentialCCValues.supportedUsers,
		);

		// CL:0083.01.21.00.4: The controlling node MUST use User Credential
		// Command Class to control a supporting node unless the supporting
		// node reports that (0) Users are supported.
		// In that case, User Code CC is used instead of this CC:
		if (supportedUsers === 0) {
			return;
		}

		const api = CCAPI.create(
			CommandClasses["User Credential"],
			ctx,
			endpoint,
		).withOptions({
			priority: options?.priority ?? MessagePriority.NodeQuery,
			tag: options?.tag,
		});

		const supportsAllUsersChecksum = this.getValue<boolean>(
			ctx,
			UserCredentialCCValues.supportsAllUsersChecksum,
		);
		const supportsUserChecksum = this.getValue<boolean>(
			ctx,
			UserCredentialCCValues.supportsUserChecksum,
		);
		const supportsAdminCode = this.getValue<boolean>(
			ctx,
			UserCredentialCCValues.supportsAdminCode,
		);
		const supportedKeyLockerEntryTypes = this.getValue<
			UserCredentialKeyLockerEntryType[]
		>(ctx, UserCredentialCCValues.supportedKeyLockerEntryTypes);

		// If possible use the all-users checksum to determine whether to
		// skip full sync of all users and credentials
		let skipFullSync = false;
		let allUsersChecksum: number | undefined;
		if (supportsAllUsersChecksum) {
			allUsersChecksum = await api.getAllUsersChecksum();
			const cachedChecksum = this.getValue<number>(
				ctx,
				UserCredentialCCValues.allUsersChecksum,
			);
			if (
				allUsersChecksum != undefined
				&& cachedChecksum != undefined
				&& allUsersChecksum === cachedChecksum
			) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "all-users checksum unchanged, skipping full sync",
					direction: "none",
				});
				skipFullSync = true;
			}
		}

		if (!skipFullSync) {
			// Iterate all users starting from UUID 0
			let nextUserId = 0;
			let previousUserId = 0;
			do {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying user with UUID ${nextUserId}...`,
					direction: "outbound",
				});
				const user = await api.getUser(nextUserId);
				if (!user?.userId) break; // No user found, stop iterating

				const currentUserId = user.userId;

				// Purge cached data for any users in the gap between the
				// last reported user and this one
				for (
					let gapUserId = previousUserId + 1;
					gapUserId < currentUserId;
					gapUserId++
				) {
					this.purgeUserFromCache(ctx, gapUserId);
				}

				// If possible use the checksum to determine whether to sync
				// credentials for this user
				let userChecksum: number | undefined;
				let syncCredentials = true;

				if (supportsUserChecksum) {
					userChecksum = await api.getUserChecksum(currentUserId);
					const cachedUserChecksum = this.getValue<number>(
						ctx,
						UserCredentialCCValues.userChecksum(currentUserId),
					);
					if (
						userChecksum != undefined
						&& cachedUserChecksum != undefined
						&& userChecksum === cachedUserChecksum
					) {
						ctx.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `user ${currentUserId} checksum unchanged, skipping credential sync`,
							direction: "none",
						});
						syncCredentials = false;
					}
				}

				if (syncCredentials) {
					await this.queryCredentialsForUser(
						ctx,
						api,
						node.id,
						currentUserId,
					);
					if (userChecksum != undefined) {
						this.setValue(
							ctx,
							UserCredentialCCValues.userChecksum(currentUserId),
							userChecksum,
						);
					}
				}

				options?.onProgress?.(currentUserId, supportedUsers ?? 0);

				previousUserId = currentUserId;
				nextUserId = user.nextUserId ?? 0;
			} while (nextUserId > 0);
		}

		// After querying all users, save the checksum for the next refresh.
		if (allUsersChecksum != undefined) {
			this.setValue(
				ctx,
				UserCredentialCCValues.allUsersChecksum,
				allUsersChecksum,
			);
		}

		// Query admin PIN code if supported
		if (supportsAdminCode) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying admin PIN code...",
				direction: "outbound",
			});
			await api.getAdminPinCode();
		}

		// Query key locker entries (V2)
		if (api.version >= 2 && supportedKeyLockerEntryTypes?.length) {
			for (const entryType of supportedKeyLockerEntryTypes) {
				const entry =
					this.getValue<UserCredentialKeyLockerEntryCapability>(
						ctx,
						UserCredentialCCValues.keyLockerCapabilities(entryType),
					);
				if (!entry) continue;
				for (let slot = 1; slot <= entry.numberOfEntrySlots; slot++) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying key locker entry type ${entryType}, slot ${slot}...`,
						direction: "outbound",
					});
					await api.getKeyLockerEntry(entryType, slot);
				}
			}
		}
	}

	private purgeUserFromCache(
		ctx: RefreshValuesContext,
		userId: number,
	): void {
		// Remove all per-user values
		this.removeValue(ctx, UserCredentialCCValues.userType(userId));
		this.removeValue(ctx, UserCredentialCCValues.userActive(userId));
		this.removeValue(ctx, UserCredentialCCValues.credentialRule(userId));
		this.removeValue(
			ctx,
			UserCredentialCCValues.expiringTimeoutMinutes(userId),
		);
		this.removeValue(ctx, UserCredentialCCValues.userName(userId));
		this.removeValue(ctx, UserCredentialCCValues.userModifierType(userId));
		this.removeValue(
			ctx,
			UserCredentialCCValues.userModifierNodeId(userId),
		);
		this.removeValue(ctx, UserCredentialCCValues.userChecksum(userId));

		// Remove all credential values for this user
		const valueDB = this.getValueDB(ctx);
		const credentialOwners = valueDB.findValues(
			(vid) =>
				UserCredentialCCValues.credentialOwner.is(vid)
				&& vid.endpoint === this.endpointIndex,
		);
		for (const { endpoint, propertyKey, value } of credentialOwners) {
			if (value !== userId) continue;

			const key = propertyKey as number;
			const credentialType = key >>> 16;
			const credentialSlot = key & 0xffff;

			valueDB.removeValue(
				UserCredentialCCValues.credential(
					credentialType,
					credentialSlot,
				).endpoint(endpoint),
			);
			valueDB.removeValue(
				UserCredentialCCValues.credentialOwner(
					credentialType,
					credentialSlot,
				).endpoint(endpoint),
			);
			valueDB.removeValue(
				UserCredentialCCValues.credentialModifierType(
					credentialType,
					credentialSlot,
				).endpoint(endpoint),
			);
			valueDB.removeValue(
				UserCredentialCCValues.credentialModifierNodeId(
					credentialType,
					credentialSlot,
				).endpoint(endpoint),
			);
		}
	}

	private async queryCredentialsForUser(
		ctx: RefreshValuesContext,
		api: UserCredentialCCAPI,
		nodeId: number,
		userId: number,
	): Promise<void> {
		// Start with credential type 0, slot 0 to get the first credential for this user
		let nextCredType: UserCredentialType = UserCredentialType.None;
		let nextCredSlot = 0;
		do {
			ctx.logNode(nodeId, {
				endpoint: this.endpointIndex,
				message: `querying credential for user ${userId}, type ${nextCredType}, slot ${nextCredSlot}...`,
				direction: "outbound",
			});
			const cred = await api.getCredential(
				userId,
				nextCredType,
				nextCredSlot,
			);
			if (!cred?.credentialSlot) break; // No credential found, stop iterating
			nextCredType = cred.nextCredentialType ?? UserCredentialType.None;
			nextCredSlot = cred.nextCredentialSlot ?? 0;
		} while (
			nextCredType !== UserCredentialType.None
			|| nextCredSlot !== 0
		);
	}

	public static getSupportedUsersCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<number> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				UserCredentialCCValues.supportedUsers.endpoint(endpoint.index),
			);
	}

	public static getSupportedCredentialTypesCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<UserCredentialType[]> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				UserCredentialCCValues.supportedCredentialTypes.endpoint(
					endpoint.index,
				),
			);
	}

	public static getCredentialCapabilitiesCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		credentialType: UserCredentialType,
	): MaybeNotKnown<UserCredentialCapability> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				UserCredentialCCValues.credentialCapabilities(
					credentialType,
				).endpoint(endpoint.index),
			);
	}

	public static supportsAdminCodeCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): boolean {
		return (
			ctx
				.getValueDB(endpoint.nodeId)
				.getValue<boolean>(
					UserCredentialCCValues.supportsAdminCode.endpoint(
						endpoint.index,
					),
				) ?? false
		);
	}
}

// ============================================================
// Group 1: Capabilities
// ============================================================

// @publicAPI
export interface UserCredentialCCUserCapabilitiesReportOptions {
	numberOfSupportedUsers: number;
	supportedCredentialRules: UserCredentialRule[];
	maxUserNameLength: number;
	supportsUserSchedule: boolean;
	supportsAllUsersChecksum: boolean;
	supportsUserChecksum: boolean;
	supportedUserNameEncodings: UserCredentialNameEncoding[];
	supportedUserTypes: UserCredentialUserType[];
}

@CCCommand(UserCredentialCommand.UserCapabilitiesReport)
@ccValueProperty(
	"numberOfSupportedUsers",
	UserCredentialCCValues.supportedUsers,
)
@ccValueProperty(
	"supportedCredentialRules",
	UserCredentialCCValues.supportedCredentialRules,
)
@ccValueProperty("maxUserNameLength", UserCredentialCCValues.maxUserNameLength)
@ccValueProperty(
	"supportsUserSchedule",
	UserCredentialCCValues.supportsUserSchedule,
)
@ccValueProperty(
	"supportsAllUsersChecksum",
	UserCredentialCCValues.supportsAllUsersChecksum,
)
@ccValueProperty(
	"supportsUserChecksum",
	UserCredentialCCValues.supportsUserChecksum,
)
@ccValueProperty(
	"supportedUserNameEncodings",
	UserCredentialCCValues.supportedUserNameEncodings,
)
@ccValueProperty(
	"supportedUserTypes",
	UserCredentialCCValues.supportedUserTypes,
)
export class UserCredentialCCUserCapabilitiesReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCUserCapabilitiesReportOptions>,
	) {
		super(options);
		this.numberOfSupportedUsers = options.numberOfSupportedUsers;
		this.supportedCredentialRules = options.supportedCredentialRules;
		this.maxUserNameLength = options.maxUserNameLength;
		this.supportsUserSchedule = options.supportsUserSchedule;
		this.supportsAllUsersChecksum = options.supportsAllUsersChecksum;
		this.supportsUserChecksum = options.supportsUserChecksum;
		this.supportedUserNameEncodings = options.supportedUserNameEncodings;
		this.supportedUserTypes = options.supportedUserTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCUserCapabilitiesReport {
		validatePayload(raw.payload.length >= 4);

		const numberOfSupportedUsers = raw.payload.readUInt16BE(0);
		const credentialRulesBitmask = raw.payload[2];
		const supportedCredentialRules: UserCredentialRule[] = parseBitMask(
			Bytes.from([credentialRulesBitmask]),
			0,
		).filter((v) => v in UserCredentialRule);
		const maxUserNameLength = raw.payload[3];

		validatePayload(raw.payload.length >= 5);
		const flagsByte = raw.payload[4];
		const supportsUserSchedule = !!(flagsByte & 0b1000_0000);
		const supportsAllUsersChecksum = !!(flagsByte & 0b0100_0000);
		const supportsUserChecksum = !!(flagsByte & 0b0010_0000);

		// Name encoding bitmask in bits 4:2
		const nameEncodingBitmask = (flagsByte >> 2) & 0b111;
		let supportedUserNameEncodings: UserCredentialNameEncoding[];
		if (nameEncodingBitmask === 0) {
			// All encodings assumed supported per spec
			supportedUserNameEncodings = [
				UserCredentialNameEncoding.ASCII,
				UserCredentialNameEncoding.ExtendedASCII,
				UserCredentialNameEncoding.UTF16BE,
			];
		} else {
			supportedUserNameEncodings = parseBitMask(
				Bytes.from([nameEncodingBitmask]),
				0,
			).filter((v) => v in UserCredentialNameEncoding);
		}

		validatePayload(raw.payload.length >= 6);
		const userTypesBitmaskLength = raw.payload[5];
		validatePayload(raw.payload.length >= 6 + userTypesBitmaskLength);
		const supportedUserTypes: UserCredentialUserType[] = parseBitMask(
			raw.payload.subarray(6, 6 + userTypesBitmaskLength),
			0,
		).filter((v) => v in UserCredentialUserType);

		return new this({
			nodeId: ctx.sourceNodeId,
			numberOfSupportedUsers,
			supportedCredentialRules,
			maxUserNameLength,
			supportsUserSchedule,
			supportsAllUsersChecksum,
			supportsUserChecksum,
			supportedUserNameEncodings,
			supportedUserTypes,
		});
	}

	public readonly numberOfSupportedUsers: number;
	public readonly supportedCredentialRules: UserCredentialRule[];
	public readonly maxUserNameLength: number;
	public readonly supportsUserSchedule: boolean;
	public readonly supportsAllUsersChecksum: boolean;
	public readonly supportsUserChecksum: boolean;
	public readonly supportedUserNameEncodings: UserCredentialNameEncoding[];
	public readonly supportedUserTypes: UserCredentialUserType[];

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const credentialRulesBitmask = encodeBitMask(
			this.supportedCredentialRules,
			UserCredentialRule.Triple,
			0, // Bit 0 in Bit Mask MUST be set to 0
		);
		const nameEncodingBitmask = encodeBitMask(
			this.supportedUserNameEncodings,
			UserCredentialNameEncoding.UTF16BE,
			UserCredentialNameEncoding.ASCII,
		);
		const flagsByte =
			(this.supportsUserSchedule ? 0x80 : 0)
			| (this.supportsAllUsersChecksum ? 0x40 : 0)
			| (this.supportsUserChecksum ? 0x20 : 0)
			| ((nameEncodingBitmask[0] & 0b111) << 2);
		const userTypesBitmask = encodeBitMask(
			this.supportedUserTypes,
			UserCredentialUserType.RemoteOnly,
			UserCredentialUserType.General,
		);
		this.payload = Bytes.alloc(6 + userTypesBitmask.length);
		this.payload.writeUInt16BE(this.numberOfSupportedUsers, 0);
		this.payload[2] = credentialRulesBitmask[0];
		this.payload[3] = this.maxUserNameLength;
		this.payload[4] = flagsByte;
		this.payload[5] = userTypesBitmask.length;
		this.payload.set(userTypesBitmask, 6);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported users": this.numberOfSupportedUsers,
				"supported credential rules": this.supportedCredentialRules
					.map((r) => getEnumMemberName(UserCredentialRule, r))
					.join(", "),
				"max user name length": this.maxUserNameLength,
				"user schedule support": this.supportsUserSchedule,
				"all users checksum support": this.supportsAllUsersChecksum,
				"user checksum support": this.supportsUserChecksum,
				"supported name encodings": this.supportedUserNameEncodings
					.map((e) =>
						getEnumMemberName(UserCredentialNameEncoding, e),
					)
					.join(", "),
				"supported user types": this.supportedUserTypes
					.map((t) => getEnumMemberName(UserCredentialUserType, t))
					.join(", "),
			},
		};
	}
}

@CCCommand(UserCredentialCommand.UserCapabilitiesGet)
@expectedCCResponse(UserCredentialCCUserCapabilitiesReport)
export class UserCredentialCCUserCapabilitiesGet extends UserCredentialCC {}

// @publicAPI
export interface UserCredentialCCCredentialCapabilitiesReportOptions {
	supportsCredentialChecksum: boolean;
	supportsAdminCode: boolean;
	supportsAdminCodeDeactivation: boolean;
	credentialTypes: Map<UserCredentialType, UserCredentialCapability>;
}

@CCCommand(UserCredentialCommand.CredentialCapabilitiesReport)
@ccValueProperty(
	"supportsCredentialChecksum",
	UserCredentialCCValues.supportsCredentialChecksum,
)
@ccValueProperty("supportsAdminCode", UserCredentialCCValues.supportsAdminCode)
@ccValueProperty(
	"supportsAdminCodeDeactivation",
	UserCredentialCCValues.supportsAdminCodeDeactivation,
)
export class UserCredentialCCCredentialCapabilitiesReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialCapabilitiesReportOptions>,
	) {
		super(options);
		this.supportsCredentialChecksum = options.supportsCredentialChecksum;
		this.supportsAdminCode = options.supportsAdminCode;
		this.supportsAdminCodeDeactivation =
			options.supportsAdminCodeDeactivation;
		this.credentialTypes = options.credentialTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialCapabilitiesReport {
		validatePayload(raw.payload.length >= 2);
		const flagsByte = raw.payload[0];
		const supportsCredentialChecksum = !!(flagsByte & 0b1000_0000);
		const supportsAdminCode = !!(flagsByte & 0b0100_0000);
		const supportsAdminCodeDeactivation = !!(flagsByte & 0b0010_0000);

		const numberOfCredentialTypes = raw.payload[1];
		const n = numberOfCredentialTypes;
		validatePayload(raw.payload.length >= 2 + n * 9);

		const credentialTypes = new Map<
			UserCredentialType,
			UserCredentialCapability
		>();
		// Grouped block offsets
		const credTypeOff = 2;
		const clSupportOff = credTypeOff + n;
		const numSlotsOff = clSupportOff + n;
		const minLenOff = numSlotsOff + n * 2;
		const maxLenOff = minLenOff + n;
		const clTimeoutOff = maxLenOff + n;
		const clStepsOff = clTimeoutOff + n;
		const maxHashLenOff = clStepsOff + n;

		for (let i = 0; i < n; i++) {
			const credentialType: UserCredentialType =
				raw.payload[credTypeOff + i];
			const clByte = raw.payload[clSupportOff + i];
			const supportsCredentialLearn = !!(clByte & 0b1000_0000);
			const numberOfCredentialSlots = raw.payload.readUInt16BE(
				numSlotsOff + i * 2,
			);
			const minCredentialLength = raw.payload[minLenOff + i];
			const maxCredentialLength = raw.payload[maxLenOff + i];
			const credentialLearnRecommendedTimeout =
				raw.payload[clTimeoutOff + i];
			const credentialLearnNumberOfSteps = raw.payload[clStepsOff + i];
			const maxCredentialHashLength = raw.payload[maxHashLenOff + i];

			if (supportsCredentialLearn) {
				validatePayload(credentialLearnRecommendedTimeout > 0);
				validatePayload(credentialLearnNumberOfSteps > 0);
				credentialTypes.set(credentialType, {
					supportsCredentialLearn,
					numberOfCredentialSlots,
					minCredentialLength,
					maxCredentialLength,
					credentialLearnRecommendedTimeout,
					credentialLearnNumberOfSteps,
					maxCredentialHashLength,
				});
			} else {
				validatePayload(credentialLearnRecommendedTimeout === 0);
				validatePayload(credentialLearnNumberOfSteps === 0);
				credentialTypes.set(credentialType, {
					supportsCredentialLearn,
					numberOfCredentialSlots,
					minCredentialLength,
					maxCredentialLength,
					maxCredentialHashLength,
				});
			}
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			supportsCredentialChecksum,
			supportsAdminCode,
			supportsAdminCodeDeactivation,
			credentialTypes: credentialTypes,
		});
	}

	public readonly supportsCredentialChecksum: boolean;
	public readonly supportsAdminCode: boolean;
	public readonly supportsAdminCodeDeactivation: boolean;
	public readonly credentialTypes: Map<
		UserCredentialType,
		UserCredentialCapability
	>;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		this.setValue(ctx, UserCredentialCCValues.supportedCredentialTypes, [
			...this.credentialTypes.keys(),
		]);

		for (const [credentialType, capability] of this.credentialTypes) {
			this.setValue(
				ctx,
				UserCredentialCCValues.credentialCapabilities(credentialType),
				capability,
			);
		}

		return true;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const n = this.credentialTypes.size;
		this.payload = Bytes.alloc(2 + n * 9);
		this.payload[0] =
			(this.supportsCredentialChecksum ? 0x80 : 0)
			| (this.supportsAdminCode ? 0x40 : 0)
			| (this.supportsAdminCodeDeactivation ? 0x20 : 0);
		this.payload[1] = n;

		const credTypeOff = 2;
		const clSupportOff = credTypeOff + n;
		const numSlotsOff = clSupportOff + n;
		const minLenOff = numSlotsOff + n * 2;
		const maxLenOff = minLenOff + n;
		const clTimeoutOff = maxLenOff + n;
		const clStepsOff = clTimeoutOff + n;
		const maxHashLenOff = clStepsOff + n;

		let i = 0;
		for (const [credentialType, ct] of this.credentialTypes) {
			this.payload[credTypeOff + i] = credentialType;
			this.payload[clSupportOff + i] = ct.supportsCredentialLearn
				? 0x80
				: 0;
			this.payload.writeUInt16BE(
				ct.numberOfCredentialSlots,
				numSlotsOff + i * 2,
			);
			this.payload[minLenOff + i] = ct.minCredentialLength;
			this.payload[maxLenOff + i] = ct.maxCredentialLength;
			this.payload[clTimeoutOff + i] =
				ct.credentialLearnRecommendedTimeout ?? 0;
			this.payload[clStepsOff + i] = ct.credentialLearnNumberOfSteps ?? 0;
			this.payload[maxHashLenOff + i] = ct.maxCredentialHashLength;
			i++;
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"credential checksum support": this.supportsCredentialChecksum,
			"admin code support": this.supportsAdminCode,
			"admin code deactivation support":
				this.supportsAdminCodeDeactivation,
		};
		for (const [credentialType, ct] of this.credentialTypes) {
			message[
				`credential type ${getEnumMemberName(
					UserCredentialType,
					credentialType,
				)}`
			] =
				`slots: ${ct.numberOfCredentialSlots}, length: ${ct.minCredentialLength}-${ct.maxCredentialLength}`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(UserCredentialCommand.CredentialCapabilitiesGet)
@expectedCCResponse(UserCredentialCCCredentialCapabilitiesReport)
export class UserCredentialCCCredentialCapabilitiesGet extends UserCredentialCC {}

// @publicAPI
export interface UserCredentialCCKeyLockerCapabilitiesReportOptions {
	keyLockerCapabilities: Map<
		UserCredentialKeyLockerEntryType,
		UserCredentialKeyLockerEntryCapability
	>;
}

@CCCommand(UserCredentialCommand.KeyLockerCapabilitiesReport)
export class UserCredentialCCKeyLockerCapabilitiesReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCKeyLockerCapabilitiesReportOptions>,
	) {
		super(options);
		this.keyLockerCapabilities = options.keyLockerCapabilities;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCKeyLockerCapabilitiesReport {
		validatePayload(raw.payload.length >= 1);
		const numberOfEntryTypes = raw.payload[0];
		const n = numberOfEntryTypes;
		validatePayload(raw.payload.length >= 1 + n * 7);

		const keyLockerCapabilities = new Map<
			UserCredentialKeyLockerEntryType,
			UserCredentialKeyLockerEntryCapability
		>();
		// Grouped block offsets
		const entryTypeOff = 1;
		const numSlotsOff = entryTypeOff + n;
		const minLenOff = numSlotsOff + n * 2;
		const maxLenOff = minLenOff + n * 2;

		for (let i = 0; i < n; i++) {
			const entryType: UserCredentialKeyLockerEntryType =
				raw.payload[entryTypeOff + i];
			const numberOfEntrySlots = raw.payload.readUInt16BE(
				numSlotsOff + i * 2,
			);
			const minEntryDataLength = raw.payload.readUInt16BE(
				minLenOff + i * 2,
			);
			const maxEntryDataLength = raw.payload.readUInt16BE(
				maxLenOff + i * 2,
			);
			keyLockerCapabilities.set(entryType, {
				numberOfEntrySlots,
				minEntryDataLength,
				maxEntryDataLength,
			});
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			keyLockerCapabilities,
		});
	}

	public readonly keyLockerCapabilities: Map<
		UserCredentialKeyLockerEntryType,
		UserCredentialKeyLockerEntryCapability
	>;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// This command only exists in V2. Ignore it if the device advertises a lower version.
		if (getEffectiveCCVersion(ctx, this) < 2) return true;

		this.setValue(
			ctx,
			UserCredentialCCValues.supportedKeyLockerEntryTypes,
			[...this.keyLockerCapabilities.keys()],
		);

		for (const [entryType, capability] of this.keyLockerCapabilities) {
			this.setValue(
				ctx,
				UserCredentialCCValues.keyLockerCapabilities(entryType),
				capability,
			);
		}

		return true;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const n = this.keyLockerCapabilities.size;
		this.payload = Bytes.alloc(1 + n * 7);
		this.payload[0] = n;

		const entryTypeOff = 1;
		const numSlotsOff = entryTypeOff + n;
		const minLenOff = numSlotsOff + n * 2;
		const maxLenOff = minLenOff + n * 2;

		let i = 0;
		for (const [entryType, capability] of this.keyLockerCapabilities) {
			this.payload[entryTypeOff + i] = entryType;
			this.payload.writeUInt16BE(
				capability.numberOfEntrySlots,
				numSlotsOff + i * 2,
			);
			this.payload.writeUInt16BE(
				capability.minEntryDataLength,
				minLenOff + i * 2,
			);
			this.payload.writeUInt16BE(
				capability.maxEntryDataLength,
				maxLenOff + i * 2,
			);

			i++;
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const [entryType, capability] of this.keyLockerCapabilities) {
			message[
				`entry type ${getEnumMemberName(
					UserCredentialKeyLockerEntryType,
					entryType,
				)}`
			] =
				`slots: ${capability.numberOfEntrySlots}, length: ${capability.minEntryDataLength}-${capability.maxEntryDataLength}`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(UserCredentialCommand.KeyLockerCapabilitiesGet)
@expectedCCResponse(UserCredentialCCKeyLockerCapabilitiesReport)
export class UserCredentialCCKeyLockerCapabilitiesGet extends UserCredentialCC {}

// ============================================================
// Group 2: User Management
// ============================================================

// @publicAPI
export type UserCredentialCCUserSetOptions = {
	userId: number;
} & (
	| ({
			operationType:
				| UserCredentialOperationType.Add
				| UserCredentialOperationType.Modify;
			active?: boolean;
			credentialRule?: UserCredentialRule;
			nameEncoding?: UserCredentialNameEncoding;
			userName?: string;
	  } & (
			| {
					userType: UserCredentialUserType.Expiring;
					expiringTimeoutMinutes: number;
			  }
			| {
					userType?: Exclude<
						UserCredentialUserType,
						UserCredentialUserType.Expiring
					>;
					expiringTimeoutMinutes?: undefined;
			  }
	  ))
	| {
			operationType: UserCredentialOperationType.Delete;
			userType?: undefined;
			active?: undefined;
			credentialRule?: undefined;
			expiringTimeoutMinutes?: undefined;
			nameEncoding?: undefined;
			userName?: undefined;
	  }
);

function testResponseForUserCredentialUserSet(
	sent: UserCredentialCCUserSet,
	received: UserCredentialCCUserReport,
) {
	// CC:0083.01.05.11.010, CC:0083.01.05.11.011, CC:0083.01.05.11.012,
	// CC:0083.01.05.11.013: UserSet MUST be answered by a UserReport.
	// Match any report type other than ResponseToGet. For Add/Modify/Delete
	// the report echoes the requested userId; for DeleteAll (userId 0) the
	// report contains userId 0.
	return (
		received.reportType !== UserCredentialUserReportType.ResponseToGet
		&& received.userId === sent.userId
	);
}

// Extended ASCII user names use a single byte per character, so they are
// interpreted as ISO-8859-1, whose code points match the byte values
function decodeExtendedASCII(data: Uint8Array): string {
	return String.fromCharCode(...data);
}

function encodeExtendedASCII(name: string): Bytes {
	const ret = new Bytes(name.length);
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i);
		if (code > 0xff) {
			throw new ZWaveError(
				`The user name "${name}" cannot be encoded as Extended ASCII`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		ret[i] = code;
	}
	return ret;
}

@CCCommand(UserCredentialCommand.UserSet)
// The response class is forward-declared here, so use a dynamic CC response
// that resolves the class lazily.
@expectedCCResponse(
	() => UserCredentialCCUserReport,
	testResponseForUserCredentialUserSet,
)
export class UserCredentialCCUserSet extends UserCredentialCC {
	public constructor(options: WithAddress<UserCredentialCCUserSetOptions>) {
		super(options);
		this.operationType = options.operationType;
		this.userId = options.userId;

		if (options.operationType !== UserCredentialOperationType.Delete) {
			this.userType = options.userType;
			this.active = options.active;
			this.credentialRule = options.credentialRule;
			this.expiringTimeoutMinutes = options.expiringTimeoutMinutes;
			this.nameEncoding = options.nameEncoding;
			this.userName = options.userName;
		}
	}

	public operationType: UserCredentialOperationType;
	public userId: number;
	public userType: UserCredentialUserType | undefined;
	public active: boolean | undefined;
	public credentialRule: UserCredentialRule | undefined;
	public expiringTimeoutMinutes: number | undefined;
	public nameEncoding: UserCredentialNameEncoding | undefined;
	public userName: string | undefined;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCUserSet {
		validatePayload(raw.payload.length >= 3);
		const operationType: UserCredentialOperationType =
			raw.payload[0] & 0b11;
		const userId = raw.payload.readUInt16BE(1);

		if (operationType === UserCredentialOperationType.Delete) {
			return new this({
				nodeId: ctx.sourceNodeId,
				operationType,
				userId,
			});
		}

		// For Delete, the remaining fields MAY be omitted
		if (raw.payload.length < 10) {
			return new this({
				nodeId: ctx.sourceNodeId,
				operationType,
				userId,
			});
		}

		const userType: UserCredentialUserType = raw.payload[3];
		const active = !!(raw.payload[4] & 0b1);
		const credentialRule: UserCredentialRule = raw.payload[5];
		const expiringTimeoutMinutes = raw.payload.readUInt16BE(6);
		const nameEncoding: UserCredentialNameEncoding = raw.payload[8] & 0b111;
		const nameLength = raw.payload[9];
		validatePayload(raw.payload.length >= 10 + nameLength);
		let userName: string;
		if (nameEncoding === UserCredentialNameEncoding.UTF16BE) {
			userName = uint8ArrayToStringUTF16BE(
				raw.payload.subarray(10, 10 + nameLength),
			);
		} else if (nameEncoding === UserCredentialNameEncoding.ExtendedASCII) {
			userName = decodeExtendedASCII(
				raw.payload.subarray(10, 10 + nameLength),
			);
		} else {
			userName = raw.payload
				.subarray(10, 10 + nameLength)
				.toString("ascii");
		}

		if (userType === UserCredentialUserType.Expiring) {
			return new this({
				nodeId: ctx.sourceNodeId,
				operationType,
				userId,
				userType,
				expiringTimeoutMinutes,
				active,
				credentialRule,
				nameEncoding,
				userName,
			});
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			operationType,
			userId,
			userType,
			active,
			credentialRule,
			nameEncoding,
			userName,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// For Delete, remaining user-detail fields MAY be omitted
		if (this.operationType === UserCredentialOperationType.Delete) {
			this.payload = Bytes.alloc(3);
			this.payload[0] = this.operationType & 0b11;
			this.payload.writeUInt16BE(this.userId, 1);
			return super.serialize(ctx);
		}

		if (this.userType == undefined) {
			throw new ZWaveError(
				`${this.constructor.name}: user type must be set for Add/Modify operations`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (this.active == undefined) {
			throw new ZWaveError(
				`${this.constructor.name}: The active flag must be set for Add/Modify operations`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Credential rule defaults to Single
		const credentialRule = this.credentialRule ?? UserCredentialRule.Single;
		// Expiring timeout MUST be 0 for non-Expiring user types
		let expiringTimeoutMinutes: number;
		if (this.userType === UserCredentialUserType.Expiring) {
			if (this.expiringTimeoutMinutes == undefined) {
				throw new ZWaveError(
					`${this.constructor.name}: expiring timeout minutes must be set for Expiring user type`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			expiringTimeoutMinutes = this.expiringTimeoutMinutes;
		} else {
			expiringTimeoutMinutes = 0;
		}
		// Name encoding defaults to ASCII
		const nameEncoding =
			this.nameEncoding ?? UserCredentialNameEncoding.ASCII;
		// User name defaults to empty string
		const userName = this.userName ?? "";

		let nameBuffer: Uint8Array;
		if (nameEncoding === UserCredentialNameEncoding.UTF16BE) {
			nameBuffer = stringToUint8ArrayUTF16BE(userName);
		} else if (nameEncoding === UserCredentialNameEncoding.ExtendedASCII) {
			nameBuffer = encodeExtendedASCII(userName);
		} else {
			nameBuffer = Bytes.from(userName, "ascii");
		}
		this.payload = Bytes.alloc(10 + nameBuffer.length);
		this.payload[0] = this.operationType & 0b11;
		this.payload.writeUInt16BE(this.userId, 1);
		this.payload[3] = this.userType;
		this.payload[4] = this.active ? 0b1 : 0;
		this.payload[5] = credentialRule;
		this.payload.writeUInt16BE(expiringTimeoutMinutes, 6);
		this.payload[8] = nameEncoding & 0b111;
		this.payload[9] = nameBuffer.length;
		if (nameBuffer.length > 0) {
			this.payload.set(nameBuffer, 10);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"operation type": getEnumMemberName(
				UserCredentialOperationType,
				this.operationType,
			),
			"user ID": this.userId,
		};
		if (this.userType != undefined) {
			message["user type"] = getEnumMemberName(
				UserCredentialUserType,
				this.userType,
			);
		}
		if (this.active != undefined) {
			message["active"] = this.active;
		}
		if (this.credentialRule != undefined) {
			message["credential rule"] = getEnumMemberName(
				UserCredentialRule,
				this.credentialRule,
			);
		}
		if (this.expiringTimeoutMinutes != undefined) {
			message["expiring timeout (minutes)"] = this.expiringTimeoutMinutes;
		}
		if (this.nameEncoding != undefined) {
			message["name encoding"] = getEnumMemberName(
				UserCredentialNameEncoding,
				this.nameEncoding,
			);
		}
		if (this.userName != undefined) {
			message["user name"] = this.userName;
		}
		return { ...super.toLogEntry(ctx), message };
	}
}

// @publicAPI
export type UserCredentialCCUserReportOptions = {
	modifierType: UserCredentialModifierType;
	modifierNodeId: number;
	userId: number;
	userType: UserCredentialUserType;
	active: boolean;
	credentialRule: UserCredentialRule;
	expiringTimeoutMinutes: number;
	nameEncoding: UserCredentialNameEncoding;
	userName: string;
} & (
	| {
			reportType: UserCredentialUserReportType.ResponseToGet;
			nextUserId: number;
	  }
	| {
			reportType: Exclude<
				UserCredentialUserReportType,
				UserCredentialUserReportType.ResponseToGet
			>;
			nextUserId?: undefined;
	  }
);

@CCCommand(UserCredentialCommand.UserReport)
export class UserCredentialCCUserReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCUserReportOptions>,
	) {
		super(options);
		this.reportType = options.reportType;
		if (options.reportType === UserCredentialUserReportType.ResponseToGet) {
			this.nextUserId = options.nextUserId;
		}
		this.modifierType = options.modifierType;
		this.modifierNodeId = options.modifierNodeId;
		this.userId = options.userId;
		this.userType = options.userType;
		this.active = options.active;
		this.credentialRule = options.credentialRule;
		this.expiringTimeoutMinutes = options.expiringTimeoutMinutes;
		this.nameEncoding = options.nameEncoding;
		this.userName = options.userName;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCUserReport {
		validatePayload(raw.payload.length >= 13);
		const reportType: UserCredentialUserReportType = raw.payload[0];
		const nextUserId = raw.payload.readUInt16BE(1);
		const modifierType: UserCredentialModifierType = raw.payload[3];
		const modifierNodeId = raw.payload.readUInt16BE(4);
		const userId = raw.payload.readUInt16BE(6);
		const userType: UserCredentialUserType = raw.payload[8];
		const active = !!(raw.payload[9] & 0b1);
		const credentialRule: UserCredentialRule = raw.payload[10];
		const expiringTimeoutMinutes = raw.payload.readUInt16BE(11);

		validatePayload(raw.payload.length >= 15);
		const nameEncoding: UserCredentialNameEncoding =
			raw.payload[13] & 0b111;
		const nameLength = raw.payload[14];
		validatePayload(raw.payload.length >= 15 + nameLength);
		let userName: string;
		if (nameEncoding === UserCredentialNameEncoding.UTF16BE) {
			userName = uint8ArrayToStringUTF16BE(
				raw.payload.subarray(15, 15 + nameLength),
			);
		} else if (nameEncoding === UserCredentialNameEncoding.ExtendedASCII) {
			userName = decodeExtendedASCII(
				raw.payload.subarray(15, 15 + nameLength),
			);
		} else {
			userName = raw.payload
				.subarray(15, 15 + nameLength)
				.toString("ascii");
		}

		const common = {
			nodeId: ctx.sourceNodeId,
			modifierType,
			modifierNodeId,
			userId,
			userType,
			active,
			credentialRule,
			expiringTimeoutMinutes,
			nameEncoding,
			userName,
		};

		if (reportType === UserCredentialUserReportType.ResponseToGet) {
			return new this({ ...common, reportType, nextUserId });
		}
		return new this({ ...common, reportType });
	}

	public readonly reportType: UserCredentialUserReportType;
	public readonly nextUserId?: number;
	public readonly modifierType: UserCredentialModifierType;
	public readonly modifierNodeId: number;
	public readonly userId: number;
	public readonly userType: UserCredentialUserType;
	public readonly active: boolean;
	public readonly credentialRule: UserCredentialRule;
	public readonly expiringTimeoutMinutes: number;
	public readonly nameEncoding: UserCredentialNameEncoding;
	public readonly userName: string;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		let nameBuffer: Uint8Array;
		if (this.nameEncoding === UserCredentialNameEncoding.UTF16BE) {
			nameBuffer = stringToUint8ArrayUTF16BE(this.userName);
		} else if (
			this.nameEncoding === UserCredentialNameEncoding.ExtendedASCII
		) {
			nameBuffer = encodeExtendedASCII(this.userName);
		} else {
			nameBuffer = Bytes.from(this.userName, "ascii");
		}
		this.payload = Bytes.alloc(15 + nameBuffer.length);
		this.payload[0] = this.reportType;
		this.payload.writeUInt16BE(this.nextUserId ?? 0, 1);
		this.payload[3] = this.modifierType;
		this.payload.writeUInt16BE(this.modifierNodeId, 4);
		this.payload.writeUInt16BE(this.userId, 6);
		this.payload[8] = this.userType;
		this.payload[9] = this.active ? 0b1 : 0;
		this.payload[10] = this.credentialRule;
		this.payload.writeUInt16BE(this.expiringTimeoutMinutes, 11);
		this.payload[13] = this.nameEncoding & 0b111;
		this.payload[14] = nameBuffer.length;
		if (nameBuffer.length > 0) {
			this.payload.set(nameBuffer, 15);
		}
		return super.serialize(ctx);
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		if (this.userId === 0) {
			if (this.reportType === UserCredentialUserReportType.UserDeleted) {
				const valueDB = this.getValueDB(ctx);
				const cachedUsersAndCredentials = valueDB.findValues(
					(vid) =>
						vid.endpoint === this.endpointIndex
						&& (UserCredentialCCValues.userType.is(vid)
							|| UserCredentialCCValues.userActive.is(vid)
							|| UserCredentialCCValues.credentialRule.is(vid)
							|| UserCredentialCCValues.expiringTimeoutMinutes.is(
								vid,
							)
							|| UserCredentialCCValues.userName.is(vid)
							|| UserCredentialCCValues.userModifierType.is(vid)
							|| UserCredentialCCValues.userModifierNodeId.is(vid)
							|| UserCredentialCCValues.userChecksum.is(vid)
							|| UserCredentialCCValues.credential.is(vid)
							|| UserCredentialCCValues.credentialOwner.is(vid)
							|| UserCredentialCCValues.credentialModifierType.is(
								vid,
							)
							|| UserCredentialCCValues.credentialModifierNodeId.is(
								vid,
							)),
				);
				for (const value of cachedUsersAndCredentials) {
					valueDB.removeValue(value);
				}
				this.removeValue(ctx, UserCredentialCCValues.allUsersChecksum);
			}
			return true;
		}

		// A UserModifyRejectedLocationEmpty report means we have a stale cache
		// entry for a user that no longer exists on the device.
		if (
			this.reportType === UserCredentialUserReportType.UserDeleted
			|| this.reportType
				=== UserCredentialUserReportType.UserModifyRejectedLocationEmpty
		) {
			// Remove all values for this user
			const userId = this.userId;
			this.removeValue(ctx, UserCredentialCCValues.userType(userId));
			this.removeValue(ctx, UserCredentialCCValues.userActive(userId));
			this.removeValue(
				ctx,
				UserCredentialCCValues.credentialRule(userId),
			);
			this.removeValue(
				ctx,
				UserCredentialCCValues.expiringTimeoutMinutes(userId),
			);
			this.removeValue(ctx, UserCredentialCCValues.userName(userId));
			this.removeValue(
				ctx,
				UserCredentialCCValues.userModifierType(userId),
			);
			this.removeValue(
				ctx,
				UserCredentialCCValues.userModifierNodeId(userId),
			);
			this.removeValue(ctx, UserCredentialCCValues.userChecksum(userId));
			this.removeValue(ctx, UserCredentialCCValues.allUsersChecksum);

			// Deleting a user also deletes all credentials assigned to them.
			const valueDB = this.getValueDB(ctx);
			const credentialOwners = valueDB.findValues(
				(vid) =>
					UserCredentialCCValues.credentialOwner.is(vid)
					&& vid.endpoint === this.endpointIndex,
			);
			for (const { endpoint, propertyKey, value } of credentialOwners) {
				if (value !== userId) continue;

				const key = propertyKey as number;
				const credentialType = key >>> 16;
				const credentialSlot = key & 0xffff;
				for (const valueId of [
					UserCredentialCCValues.credential(
						credentialType,
						credentialSlot,
					),
					UserCredentialCCValues.credentialOwner(
						credentialType,
						credentialSlot,
					),
					UserCredentialCCValues.credentialModifierType(
						credentialType,
						credentialSlot,
					),
					UserCredentialCCValues.credentialModifierNodeId(
						credentialType,
						credentialSlot,
					),
				]) {
					valueDB.removeValue(valueId.endpoint(endpoint));
				}
			}
			return true;
		}

		// A UserAddRejectedLocationOccupied report contains the data for the
		// existing user, so we can update our cache with the actual state.
		if (
			this.reportType !== UserCredentialUserReportType.ResponseToGet
			&& this.reportType !== UserCredentialUserReportType.UserAdded
			&& this.reportType !== UserCredentialUserReportType.UserModified
			&& this.reportType
				!== UserCredentialUserReportType.UserAddRejectedLocationOccupied
		) {
			return true;
		}

		const userId = this.userId;
		this.ensureMetadata(ctx, UserCredentialCCValues.userType(userId));
		this.setValue(
			ctx,
			UserCredentialCCValues.userType(userId),
			this.userType,
		);
		this.ensureMetadata(ctx, UserCredentialCCValues.userActive(userId));
		this.setValue(
			ctx,
			UserCredentialCCValues.userActive(userId),
			this.active,
		);
		this.ensureMetadata(ctx, UserCredentialCCValues.credentialRule(userId));
		this.setValue(
			ctx,
			UserCredentialCCValues.credentialRule(userId),
			this.credentialRule,
		);
		this.ensureMetadata(
			ctx,
			UserCredentialCCValues.expiringTimeoutMinutes(userId),
		);
		this.setValue(
			ctx,
			UserCredentialCCValues.expiringTimeoutMinutes(userId),
			this.expiringTimeoutMinutes,
		);
		this.ensureMetadata(ctx, UserCredentialCCValues.userName(userId));
		this.setValue(
			ctx,
			UserCredentialCCValues.userName(userId),
			this.userName,
		);
		this.setValue(
			ctx,
			UserCredentialCCValues.userModifierType(userId),
			this.modifierType,
		);
		this.setValue(
			ctx,
			UserCredentialCCValues.userModifierNodeId(userId),
			this.modifierNodeId,
		);

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"report type": getEnumMemberName(
				UserCredentialUserReportType,
				this.reportType,
			),
		};
		if (this.nextUserId != undefined) {
			message["next user ID"] = this.nextUserId;
		}
		message["modifier type"] = getEnumMemberName(
			UserCredentialModifierType,
			this.modifierType,
		);
		message["modifier node id"] = this.modifierNodeId;
		message["user ID"] = this.userId;
		message["user type"] = getEnumMemberName(
			UserCredentialUserType,
			this.userType,
		);
		message.active = this.active;
		message["credential rule"] = getEnumMemberName(
			UserCredentialRule,
			this.credentialRule,
		);
		message["expiring timeout (minutes)"] = this.expiringTimeoutMinutes;
		message["name encoding"] = getEnumMemberName(
			UserCredentialNameEncoding,
			this.nameEncoding,
		);
		message["user name"] = this.userName;
		return { ...super.toLogEntry(ctx), message };
	}
}

// @publicAPI
export interface UserCredentialCCUserGetOptions {
	userId: number;
}

function testResponseForUserCredentialUserGet(
	sent: UserCredentialCCUserGet,
	received: UserCredentialCCUserReport,
) {
	return received.reportType === UserCredentialUserReportType.ResponseToGet;
}

@CCCommand(UserCredentialCommand.UserGet)
@expectedCCResponse(
	UserCredentialCCUserReport,
	testResponseForUserCredentialUserGet,
)
export class UserCredentialCCUserGet extends UserCredentialCC {
	public constructor(options: WithAddress<UserCredentialCCUserGetOptions>) {
		super(options);
		this.userId = options.userId;
	}

	public userId: number;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCUserGet {
		validatePayload(raw.payload.length >= 2);
		const userId = raw.payload.readUInt16BE(0);
		return new this({
			nodeId: ctx.sourceNodeId,
			userId,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(2);
		this.payload.writeUInt16BE(this.userId, 0);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
			},
		};
	}
}

// ============================================================
// Group 3: Credential Management
// ============================================================

// @publicAPI
export type UserCredentialCCCredentialSetOptions = {
	userId: number;
	credentialType: UserCredentialType;
	credentialSlot: number;
} & (
	| {
			operationType:
				| UserCredentialOperationType.Add
				| UserCredentialOperationType.Modify;
			credentialData: Bytes;
	  }
	| {
			operationType: UserCredentialOperationType.Delete;
			credentialData?: undefined;
	  }
);

function testResponseForUserCredentialCredentialSet(
	sent: UserCredentialCCCredentialSet,
	received: UserCredentialCCCredentialReport,
) {
	// CC:0083.01.0A.11.010, CC:0083.01.0A.11.011, CC:0083.01.0A.11.012,
	// CC:0083.01.0A.11.013: CredentialSet MUST be answered by a
	// CredentialReport. The credentialType is always echoed, so we use it
	// as the primary correlation. DuplicateCredential and DuplicateAdminPINCode
	// reports reference the EXISTING duplicate's (userId, slot) rather than
	// the requested location, so we cannot correlate them on slot.
	if (
		received.reportType === UserCredentialCredentialReportType.ResponseToGet
	) {
		return false;
	}
	if (received.credentialType !== sent.credentialType) {
		return false;
	}
	if (
		received.reportType
			=== UserCredentialCredentialReportType.DuplicateCredential
		|| received.reportType
			=== UserCredentialCredentialReportType.DuplicateAdminPINCode
	) {
		return true;
	}
	return received.credentialSlot === sent.credentialSlot;
}

@CCCommand(UserCredentialCommand.CredentialSet)
@expectedCCResponse(
	() => UserCredentialCCCredentialReport,
	testResponseForUserCredentialCredentialSet,
)
export class UserCredentialCCCredentialSet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialSetOptions>,
	) {
		super(options);
		this.userId = options.userId;
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
		this.operationType = options.operationType;
		if (options.operationType !== UserCredentialOperationType.Delete) {
			this.credentialData = options.credentialData;
		}
	}

	public userId: number;
	public credentialType: UserCredentialType;
	public credentialSlot: number;
	public operationType: UserCredentialOperationType;
	public credentialData: Bytes | undefined;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialSet {
		validatePayload(raw.payload.length >= 6);
		const userId = raw.payload.readUInt16BE(0);
		const credentialType: UserCredentialType = raw.payload[2];
		const credentialSlot = raw.payload.readUInt16BE(3);
		const operationType: UserCredentialOperationType =
			raw.payload[5] & 0b11;

		if (operationType === UserCredentialOperationType.Delete) {
			return new this({
				nodeId: ctx.sourceNodeId,
				userId,
				credentialType,
				credentialSlot,
				operationType,
			});
		}

		let credentialData = new Bytes();
		if (raw.payload.length >= 7) {
			const credentialLength = raw.payload[6];
			validatePayload(raw.payload.length >= 7 + credentialLength);
			credentialData = Bytes.from(
				raw.payload.subarray(7, 7 + credentialLength),
			);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			userId,
			credentialType,
			credentialSlot,
			operationType,
			credentialData,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// For Delete, credential data MAY be omitted
		if (this.operationType === UserCredentialOperationType.Delete) {
			this.payload = Bytes.alloc(6);
			this.payload.writeUInt16BE(this.userId, 0);
			this.payload[2] = this.credentialType;
			this.payload.writeUInt16BE(this.credentialSlot, 3);
			this.payload[5] = this.operationType & 0b11;
			return super.serialize(ctx);
		}

		if (this.credentialData == undefined) {
			throw new ZWaveError(
				`${this.constructor.name}: credential data must be set for Add/Modify operations`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.payload = Bytes.alloc(7 + this.credentialData.length);
		this.payload.writeUInt16BE(this.userId, 0);
		this.payload[2] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 3);
		this.payload[5] = this.operationType & 0b11;
		this.payload[6] = this.credentialData.length;
		if (this.credentialData.length > 0) {
			this.payload.set(this.credentialData, 7);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"user ID": this.userId,
			"credential type": getEnumMemberName(
				UserCredentialType,
				this.credentialType,
			),
			"credential slot": this.credentialSlot,
			"operation type": getEnumMemberName(
				UserCredentialOperationType,
				this.operationType,
			),
		};
		if (this.credentialData != undefined) {
			message["credential data"] = credentialToLogString(
				this.credentialData,
			);
		}
		return { ...super.toLogEntry(ctx), message };
	}
}

// @publicAPI
export type UserCredentialCCCredentialReportOptions = {
	userId: number;
	credentialType: UserCredentialType;
	credentialSlot: number;
	modifierType: UserCredentialModifierType;
	modifierNodeId: number;
} & (
	| {
			credentialReadBack: true;
			credentialData: Bytes;
	  }
	| {
			credentialReadBack: false;
			credentialData?: undefined;
	  }
)
	& (
		| {
				reportType: UserCredentialCredentialReportType.ResponseToGet;
				nextCredentialType: UserCredentialType;
				nextCredentialSlot: number;
		  }
		| {
				reportType: Exclude<
					UserCredentialCredentialReportType,
					UserCredentialCredentialReportType.ResponseToGet
				>;
				nextCredentialType?: undefined;
				nextCredentialSlot?: undefined;
		  }
	);

@CCCommand(UserCredentialCommand.CredentialReport)
export class UserCredentialCCCredentialReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialReportOptions>,
	) {
		super(options);
		this.reportType = options.reportType;
		this.userId = options.userId;
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
		this.credentialReadBack = options.credentialReadBack;
		if (options.credentialReadBack) {
			this.credentialData = options.credentialData;
		}
		this.modifierType = options.modifierType;
		this.modifierNodeId = options.modifierNodeId;
		if (
			options.reportType
			=== UserCredentialCredentialReportType.ResponseToGet
		) {
			this.nextCredentialType = options.nextCredentialType;
			this.nextCredentialSlot = options.nextCredentialSlot;
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialReport {
		validatePayload(raw.payload.length >= 8);
		const reportType: UserCredentialCredentialReportType = raw.payload[0];
		const userId = raw.payload.readUInt16BE(1);
		const credentialType: UserCredentialType = raw.payload[3];
		const credentialSlot = raw.payload.readUInt16BE(4);
		const credentialReadBack = !!(raw.payload[6] & 0b1000_0000);
		const credentialLength = raw.payload[7];
		validatePayload(raw.payload.length >= 8 + credentialLength + 6);

		const offset = 8 + credentialLength;
		const modifierType: UserCredentialModifierType = raw.payload[offset];
		const modifierNodeId = raw.payload.readUInt16BE(offset + 1);

		const common = {
			nodeId: ctx.sourceNodeId,
			userId,
			credentialType,
			credentialSlot,
			modifierType,
			modifierNodeId,
		};
		const dataOptions = credentialReadBack
			? ({
					credentialReadBack: true,
					credentialData: Bytes.from(
						raw.payload.subarray(8, 8 + credentialLength),
					),
				} as const)
			: ({ credentialReadBack: false } as const);

		if (reportType === UserCredentialCredentialReportType.ResponseToGet) {
			return new this({
				...common,
				...dataOptions,
				reportType,
				nextCredentialType: raw.payload[offset + 3],
				nextCredentialSlot: raw.payload.readUInt16BE(offset + 4),
			});
		}
		return new this({
			...common,
			...dataOptions,
			reportType,
		});
	}

	public readonly reportType: UserCredentialCredentialReportType;
	public readonly userId: number;
	public readonly credentialType: UserCredentialType;
	public readonly credentialSlot: number;
	public readonly credentialReadBack: boolean;
	public readonly credentialData?: Bytes;
	public readonly modifierType: UserCredentialModifierType;
	public readonly modifierNodeId: number;
	public readonly nextCredentialType?: UserCredentialType;
	public readonly nextCredentialSlot?: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const credentialData = this.credentialData ?? new Bytes();
		this.payload = Bytes.alloc(14 + credentialData.length);
		this.payload[0] = this.reportType;
		this.payload.writeUInt16BE(this.userId, 1);
		this.payload[3] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 4);
		this.payload[6] = this.credentialReadBack ? 0x80 : 0x00;
		this.payload[7] = credentialData.length;
		if (credentialData.length > 0) {
			this.payload.set(credentialData, 8);
		}
		const offset = 8 + credentialData.length;
		this.payload[offset] = this.modifierType;
		this.payload.writeUInt16BE(this.modifierNodeId, offset + 1);
		this.payload[offset + 3] =
			this.nextCredentialType ?? UserCredentialType.None;
		this.payload.writeUInt16BE(this.nextCredentialSlot ?? 0, offset + 4);
		return super.serialize(ctx);
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// A CredentialModifyRejectedLocationEmpty report means we have a stale
		// cache entry for a credential that no longer exists on the device.
		// CredentialDeleted reports may echo the request fields, including the
		// wildcard zeros used to trigger bulk deletes per CC:0083.01.0A.
		if (
			this.reportType
				=== UserCredentialCredentialReportType.CredentialDeleted
			|| this.reportType
				=== UserCredentialCredentialReportType.CredentialModifyRejectedLocationEmpty
		) {
			if (
				this.credentialType !== UserCredentialType.None
				&& this.credentialSlot !== 0
			) {
				// Single credential. The (type, slot) tuple uniquely identifies
				// the entry in the value DB, so the userId is not needed.
				this.removeValue(
					ctx,
					UserCredentialCCValues.credential(
						this.credentialType,
						this.credentialSlot,
					),
				);
				this.removeValue(
					ctx,
					UserCredentialCCValues.credentialOwner(
						this.credentialType,
						this.credentialSlot,
					),
				);
				this.removeValue(
					ctx,
					UserCredentialCCValues.credentialModifierType(
						this.credentialType,
						this.credentialSlot,
					),
				);
				this.removeValue(
					ctx,
					UserCredentialCCValues.credentialModifierNodeId(
						this.credentialType,
						this.credentialSlot,
					),
				);
			} else {
				// Bulk delete. Walk all cached credentials and remove those
				// matching the (userId, type) filter (zero means wildcard).
				const valueDB = this.getValueDB(ctx);
				const credentialOwners = valueDB.findValues(
					(vid) =>
						UserCredentialCCValues.credentialOwner.is(vid)
						&& vid.endpoint === this.endpointIndex,
				);
				for (const {
					endpoint,
					propertyKey,
					value,
				} of credentialOwners) {
					// If a user ID is given, only delete credentials owned by that user
					if (this.userId !== 0 && value !== this.userId) continue;

					const key = propertyKey as number;
					const cType = key >>> 16;
					const cSlot = key & 0xffff;

					// If a credential type is given, only delete credentials of that type
					if (
						this.credentialType !== UserCredentialType.None
						&& cType !== this.credentialType
					) {
						continue;
					}

					valueDB.removeValue(
						UserCredentialCCValues.credential(
							cType,
							cSlot,
						).endpoint(endpoint),
					);
					valueDB.removeValue(
						UserCredentialCCValues.credentialOwner(
							cType,
							cSlot,
						).endpoint(endpoint),
					);
					valueDB.removeValue(
						UserCredentialCCValues.credentialModifierType(
							cType,
							cSlot,
						).endpoint(endpoint),
					);
					valueDB.removeValue(
						UserCredentialCCValues.credentialModifierNodeId(
							cType,
							cSlot,
						).endpoint(endpoint),
					);
				}
			}
			return true;
		}

		// Non-delete reports may carry (None, 0) as a sentinel for "no credential
		// at this location" — e.g. the end-of-walk marker in nextCredential* of
		// a ResponseToGet. Bail out so we don't write bogus cache entries.
		if (
			this.credentialType === UserCredentialType.None
			|| this.credentialSlot === 0
		) {
			return true;
		}

		// A CredentialAddRejectedLocationOccupied report includes the actual
		// credential data in the read-back field when the device chooses to
		// reveal it, so we can update our cache with the real state.
		const isRejectionWithReadback =
			this.reportType
				=== UserCredentialCredentialReportType.CredentialAddRejectedLocationOccupied
			&& this.credentialReadBack;
		if (
			this.reportType !== UserCredentialCredentialReportType.ResponseToGet
			&& this.reportType
				!== UserCredentialCredentialReportType.CredentialAdded
			&& this.reportType
				!== UserCredentialCredentialReportType.CredentialModified
			&& !isRejectionWithReadback
		) {
			return true;
		}

		if (this.credentialData != undefined) {
			this.ensureMetadata(
				ctx,
				UserCredentialCCValues.credential(
					this.credentialType,
					this.credentialSlot,
				),
			);
			this.setValue(
				ctx,
				UserCredentialCCValues.credential(
					this.credentialType,
					this.credentialSlot,
				),
				normalizeCredentialData(
					this.credentialType,
					this.credentialData,
				),
			);
		}
		this.setValue(
			ctx,
			UserCredentialCCValues.credentialOwner(
				this.credentialType,
				this.credentialSlot,
			),
			this.userId,
		);
		this.setValue(
			ctx,
			UserCredentialCCValues.credentialModifierType(
				this.credentialType,
				this.credentialSlot,
			),
			this.modifierType,
		);
		this.setValue(
			ctx,
			UserCredentialCCValues.credentialModifierNodeId(
				this.credentialType,
				this.credentialSlot,
			),
			this.modifierNodeId,
		);

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"report type": getEnumMemberName(
				UserCredentialCredentialReportType,
				this.reportType,
			),
			"user ID": this.userId,
			"credential type": getEnumMemberName(
				UserCredentialType,
				this.credentialType,
			),
			"credential slot": this.credentialSlot,
			"credential read-back": this.credentialReadBack,
		};
		if (this.credentialData != undefined) {
			message["credential data"] = credentialToLogString(
				this.credentialData,
			);
		}
		message["modifier type"] = getEnumMemberName(
			UserCredentialModifierType,
			this.modifierType,
		);
		message["modifier node id"] = this.modifierNodeId;
		if (this.nextCredentialType != undefined) {
			message["next credential type"] = getEnumMemberName(
				UserCredentialType,
				this.nextCredentialType,
			);
		}
		if (this.nextCredentialSlot != undefined) {
			message["next credential slot"] = this.nextCredentialSlot;
		}
		return { ...super.toLogEntry(ctx), message };
	}
}

// @publicAPI
export interface UserCredentialCCCredentialGetOptions {
	userId: number;
	credentialType: UserCredentialType;
	credentialSlot: number;
}

function testResponseForUserCredentialCredentialGet(
	_sent: UserCredentialCCCredentialGet,
	received: UserCredentialCCCredentialReport,
) {
	return (
		received.reportType === UserCredentialCredentialReportType.ResponseToGet
	);
}

@CCCommand(UserCredentialCommand.CredentialGet)
@expectedCCResponse(
	UserCredentialCCCredentialReport,
	testResponseForUserCredentialCredentialGet,
)
export class UserCredentialCCCredentialGet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialGetOptions>,
	) {
		super(options);
		this.userId = options.userId;
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
	}

	public userId: number;
	public credentialType: UserCredentialType;
	public credentialSlot: number;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialGet {
		validatePayload(raw.payload.length >= 5);
		const userId = raw.payload.readUInt16BE(0);
		const credentialType: UserCredentialType = raw.payload[2];
		const credentialSlot = raw.payload.readUInt16BE(3);

		return new this({
			nodeId: ctx.sourceNodeId,
			userId,
			credentialType,
			credentialSlot,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(5);
		this.payload.writeUInt16BE(this.userId, 0);
		this.payload[2] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 3);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
				"credential slot": this.credentialSlot,
			},
		};
	}
}

// ============================================================
// Group 4: Credential Learn
// ============================================================

// @publicAPI
export interface UserCredentialCCCredentialLearnStartOptions {
	userId: number;
	credentialType: UserCredentialType;
	credentialSlot: number;
	operationType: UserCredentialOperationType;
	learnTimeout: number;
}

@CCCommand(UserCredentialCommand.CredentialLearnStart)
@useSupervision()
export class UserCredentialCCCredentialLearnStart extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialLearnStartOptions>,
	) {
		super(options);
		this.userId = options.userId;
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
		this.operationType = options.operationType;
		this.learnTimeout = options.learnTimeout;
	}

	public userId: number;
	public credentialType: UserCredentialType;
	public credentialSlot: number;
	public operationType: UserCredentialOperationType;
	public learnTimeout: number;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialLearnStart {
		validatePayload(raw.payload.length >= 7);
		const userId = raw.payload.readUInt16BE(0);
		const credentialType: UserCredentialType = raw.payload[2];
		const credentialSlot = raw.payload.readUInt16BE(3);
		const operationType: UserCredentialOperationType =
			raw.payload[5] & 0b11;
		const learnTimeout = raw.payload[6];

		return new this({
			nodeId: ctx.sourceNodeId,
			userId,
			credentialType,
			credentialSlot,
			operationType,
			learnTimeout,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(7);
		this.payload.writeUInt16BE(this.userId, 0);
		this.payload[2] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 3);
		this.payload[5] = this.operationType & 0b11;
		this.payload[6] = this.learnTimeout;
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
				"credential slot": this.credentialSlot,
				"operation type": getEnumMemberName(
					UserCredentialOperationType,
					this.operationType,
				),
				"learn timeout": this.learnTimeout,
			},
		};
	}
}

@CCCommand(UserCredentialCommand.CredentialLearnCancel)
@useSupervision()
export class UserCredentialCCCredentialLearnCancel extends UserCredentialCC {}

// @publicAPI
export interface UserCredentialCCCredentialLearnReportOptions {
	learnStatus: UserCredentialLearnStatus;
	userId: number;
	credentialType: UserCredentialType;
	credentialSlot: number;
	stepsRemaining: number;
}

@CCCommand(UserCredentialCommand.CredentialLearnReport)
export class UserCredentialCCCredentialLearnReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialLearnReportOptions>,
	) {
		super(options);
		this.learnStatus = options.learnStatus;
		this.userId = options.userId;
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
		this.stepsRemaining = options.stepsRemaining;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialLearnReport {
		validatePayload(raw.payload.length >= 7);
		const learnStatus = raw.payload[0];
		const userId = raw.payload.readUInt16BE(1);
		const credentialType: UserCredentialType = raw.payload[3];
		const credentialSlot = raw.payload.readUInt16BE(4);
		const stepsRemaining = raw.payload[6];

		return new this({
			nodeId: ctx.sourceNodeId,
			learnStatus,
			userId,
			credentialType,
			credentialSlot,
			stepsRemaining,
		});
	}

	public readonly learnStatus: UserCredentialLearnStatus;
	public readonly userId: number;
	public readonly credentialType: UserCredentialType;
	public readonly credentialSlot: number;
	public readonly stepsRemaining: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(7);
		this.payload[0] = this.learnStatus;
		this.payload.writeUInt16BE(this.userId, 1);
		this.payload[3] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 4);
		this.payload[6] = this.stepsRemaining;
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"learn status": getEnumMemberName(
					UserCredentialLearnStatus,
					this.learnStatus,
				),
				"user ID": this.userId,
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
				"credential slot": this.credentialSlot,
				"steps remaining": this.stepsRemaining,
			},
		};
	}
}

// ============================================================
// Group 5: Association
// ============================================================

// @publicAPI
export interface UserCredentialCCAssociationReportOptions {
	credentialType: UserCredentialType;
	credentialSlot: number;
	destinationUserId: number;
	status: number;
}

@CCCommand(UserCredentialCommand.UserCredentialAssociationReport)
export class UserCredentialCCAssociationReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCAssociationReportOptions>,
	) {
		super(options);
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
		this.destinationUserId = options.destinationUserId;
		this.status = options.status;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCAssociationReport {
		validatePayload(raw.payload.length >= 6);
		const credentialType: UserCredentialType = raw.payload[0];
		const credentialSlot = raw.payload.readUInt16BE(1);
		const destinationUserId = raw.payload.readUInt16BE(3);
		const status = raw.payload[5];

		return new this({
			nodeId: ctx.sourceNodeId,
			credentialType,
			credentialSlot,
			destinationUserId: destinationUserId,
			status,
		});
	}

	public readonly credentialType: UserCredentialType;
	public readonly credentialSlot: number;
	public readonly destinationUserId: number;
	public readonly status: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(6);
		this.payload[0] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 1);
		this.payload.writeUInt16BE(this.destinationUserId, 3);
		this.payload[5] = this.status;
		return super.serialize(ctx);
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		if (
			this.status !== 0
			|| this.credentialType === UserCredentialType.None
			|| this.credentialSlot === 0
		) {
			return true;
		}

		this.setValue(
			ctx,
			UserCredentialCCValues.credentialOwner(
				this.credentialType,
				this.credentialSlot,
			),
			this.destinationUserId,
		);

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
				"credential slot": this.credentialSlot,
				"destination user ID": this.destinationUserId,
				status: this.status,
			},
		};
	}
}

// @publicAPI
export interface UserCredentialCCAssociationSetOptions {
	credentialType: UserCredentialType;
	credentialSlot: number;
	destinationUserId: number;
}

function testResponseForUserCredentialAssociationSet(
	sent: UserCredentialCCAssociationSet,
	received: UserCredentialCCAssociationReport,
) {
	return (
		sent.credentialType === received.credentialType
		&& sent.credentialSlot === received.credentialSlot
	);
}

@CCCommand(UserCredentialCommand.UserCredentialAssociationSet)
@expectedCCResponse(
	UserCredentialCCAssociationReport,
	testResponseForUserCredentialAssociationSet,
)
export class UserCredentialCCAssociationSet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCAssociationSetOptions>,
	) {
		super(options);
		this.credentialType = options.credentialType;
		this.credentialSlot = options.credentialSlot;
		this.destinationUserId = options.destinationUserId;
	}

	public credentialType: UserCredentialType;
	public credentialSlot: number;
	public destinationUserId: number;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCAssociationSet {
		validatePayload(raw.payload.length >= 5);
		const credentialType: UserCredentialType = raw.payload[0];
		const credentialSlot = raw.payload.readUInt16BE(1);
		const destinationUserId = raw.payload.readUInt16BE(3);

		return new this({
			nodeId: ctx.sourceNodeId,
			credentialType,
			credentialSlot,
			destinationUserId,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(5);
		this.payload[0] = this.credentialType;
		this.payload.writeUInt16BE(this.credentialSlot, 1);
		this.payload.writeUInt16BE(this.destinationUserId, 3);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
				"credential slot": this.credentialSlot,
				"destination user ID": this.destinationUserId,
			},
		};
	}
}

// ============================================================
// Group 6: Checksums
// ============================================================

// @publicAPI
export interface UserCredentialCCAllUsersChecksumReportOptions {
	checksum: number;
}

@CCCommand(UserCredentialCommand.AllUsersChecksumReport)
export class UserCredentialCCAllUsersChecksumReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCAllUsersChecksumReportOptions>,
	) {
		super(options);
		this.checksum = options.checksum;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCAllUsersChecksumReport {
		validatePayload(raw.payload.length >= 2);
		const checksum = raw.payload.readUInt16BE(0);

		return new this({
			nodeId: ctx.sourceNodeId,
			checksum,
		});
	}

	public readonly checksum: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(2);
		this.payload.writeUInt16BE(this.checksum, 0);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { checksum: this.checksum },
		};
	}
}

@CCCommand(UserCredentialCommand.AllUsersChecksumGet)
@expectedCCResponse(UserCredentialCCAllUsersChecksumReport)
export class UserCredentialCCAllUsersChecksumGet extends UserCredentialCC {}

// @publicAPI
export interface UserCredentialCCUserChecksumReportOptions {
	userId: number;
	checksum: number;
}

@CCCommand(UserCredentialCommand.UserChecksumReport)
export class UserCredentialCCUserChecksumReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCUserChecksumReportOptions>,
	) {
		super(options);
		this.userId = options.userId;
		this.checksum = options.checksum;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCUserChecksumReport {
		validatePayload(raw.payload.length >= 4);
		const userId = raw.payload.readUInt16BE(0);
		const checksum = raw.payload.readUInt16BE(2);

		return new this({
			nodeId: ctx.sourceNodeId,
			userId,
			checksum,
		});
	}

	public readonly userId: number;
	public readonly checksum: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(4);
		this.payload.writeUInt16BE(this.userId, 0);
		this.payload.writeUInt16BE(this.checksum, 2);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				checksum: this.checksum,
			},
		};
	}
}

// @publicAPI
export interface UserCredentialCCUserChecksumGetOptions {
	userId: number;
}

function testResponseForUserCredentialUserChecksumGet(
	sent: UserCredentialCCUserChecksumGet,
	received: UserCredentialCCUserChecksumReport,
) {
	return received.userId === sent.userId;
}

@CCCommand(UserCredentialCommand.UserChecksumGet)
@expectedCCResponse(
	UserCredentialCCUserChecksumReport,
	testResponseForUserCredentialUserChecksumGet,
)
export class UserCredentialCCUserChecksumGet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCUserChecksumGetOptions>,
	) {
		super(options);
		this.userId = options.userId;
	}

	public userId: number;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCUserChecksumGet {
		validatePayload(raw.payload.length >= 2);
		const userId = raw.payload.readUInt16BE(0);

		return new this({
			nodeId: ctx.sourceNodeId,
			userId,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(2);
		this.payload.writeUInt16BE(this.userId, 0);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
			},
		};
	}
}

// @publicAPI
export interface UserCredentialCCCredentialChecksumReportOptions {
	credentialType: UserCredentialType;
	checksum: number;
}

@CCCommand(UserCredentialCommand.CredentialChecksumReport)
export class UserCredentialCCCredentialChecksumReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialChecksumReportOptions>,
	) {
		super(options);
		this.credentialType = options.credentialType;
		this.checksum = options.checksum;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialChecksumReport {
		validatePayload(raw.payload.length >= 3);
		const credentialType: UserCredentialType = raw.payload[0];
		const checksum = raw.payload.readUInt16BE(1);

		return new this({
			nodeId: ctx.sourceNodeId,
			credentialType,
			checksum,
		});
	}

	public readonly credentialType: UserCredentialType;
	public readonly checksum: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(3);
		this.payload[0] = this.credentialType;
		this.payload.writeUInt16BE(this.checksum, 1);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
				checksum: this.checksum,
			},
		};
	}
}

// @publicAPI
export interface UserCredentialCCCredentialChecksumGetOptions {
	credentialType: UserCredentialType;
}

function testResponseForUserCredentialCredentialChecksumGet(
	sent: UserCredentialCCCredentialChecksumGet,
	received: UserCredentialCCCredentialChecksumReport,
) {
	return received.credentialType === sent.credentialType;
}

@CCCommand(UserCredentialCommand.CredentialChecksumGet)
@expectedCCResponse(
	UserCredentialCCCredentialChecksumReport,
	testResponseForUserCredentialCredentialChecksumGet,
)
export class UserCredentialCCCredentialChecksumGet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCCredentialChecksumGetOptions>,
	) {
		super(options);
		this.credentialType = options.credentialType;
	}

	public credentialType: UserCredentialType;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCCredentialChecksumGet {
		validatePayload(raw.payload.length >= 1);
		const credentialType: UserCredentialType = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			credentialType,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(1);
		this.payload[0] = this.credentialType;
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"credential type": getEnumMemberName(
					UserCredentialType,
					this.credentialType,
				),
			},
		};
	}
}

// ============================================================
// Group 7: Admin PIN Code
// ============================================================

// @publicAPI
export interface UserCredentialCCAdminPinCodeSetOptions {
	pinCode: string;
}

@CCCommand(UserCredentialCommand.AdminPinCodeSet)
@useSupervision()
export class UserCredentialCCAdminPinCodeSet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCAdminPinCodeSetOptions>,
	) {
		super(options);
		this.pinCode = options.pinCode;
	}

	public pinCode: string;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCAdminPinCodeSet {
		validatePayload(raw.payload.length >= 1);
		const pinLength = raw.payload[0] & 0b1111;
		validatePayload(raw.payload.length >= 1 + pinLength);
		const pinCode = raw.payload
			.subarray(1, 1 + pinLength)
			.toString("ascii");

		return new this({
			nodeId: ctx.sourceNodeId,
			pinCode,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const pinCode = this.pinCode.slice(0, 15);
		this.payload = Bytes.concat([
			[pinCode.length & 0b1111],
			Bytes.from(pinCode, "ascii"),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"PIN code": credentialToLogString(this.pinCode),
			},
		};
	}
}

// @publicAPI
export interface UserCredentialCCAdminPinCodeReportOptions {
	operationResult: UserCredentialAdminCodeOperationResult;
	pinCode: string;
}

@CCCommand(UserCredentialCommand.AdminPinCodeReport)
export class UserCredentialCCAdminPinCodeReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCAdminPinCodeReportOptions>,
	) {
		super(options);
		this.operationResult = options.operationResult;
		this.pinCode = options.pinCode;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCAdminPinCodeReport {
		validatePayload(raw.payload.length >= 1);
		const operationResult: UserCredentialAdminCodeOperationResult =
			(raw.payload[0] >> 4) & 0b1111;
		const pinLength = raw.payload[0] & 0b1111;
		validatePayload(raw.payload.length >= 1 + pinLength);
		const pinCode = raw.payload
			.subarray(1, 1 + pinLength)
			.toString("ascii");

		return new this({
			nodeId: ctx.sourceNodeId,
			operationResult,
			pinCode,
		});
	}

	public readonly operationResult: UserCredentialAdminCodeOperationResult;
	public readonly pinCode: string;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const pinBuffer = Bytes.from(this.pinCode, "ascii");
		this.payload = Bytes.alloc(1 + pinBuffer.length);
		this.payload[0] =
			((this.operationResult & 0b1111) << 4)
			| (pinBuffer.length & 0b1111);
		if (pinBuffer.length > 0) {
			this.payload.set(pinBuffer, 1);
		}
		return super.serialize(ctx);
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		if (
			this.operationResult
				=== UserCredentialAdminCodeOperationResult.Modified
			|| this.operationResult
				=== UserCredentialAdminCodeOperationResult.ResponseToGet
		) {
			this.setValue(
				ctx,
				UserCredentialCCValues.adminPinCode,
				this.pinCode,
			);
		}

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"operation result": getEnumMemberName(
					UserCredentialAdminCodeOperationResult,
					this.operationResult,
				),
				"PIN code": credentialToLogString(this.pinCode),
			},
		};
	}
}

function testResponseForUserCredentialAdminPinCodeGet(
	_sent: UserCredentialCCAdminPinCodeGet,
	received: UserCredentialCCAdminPinCodeReport,
) {
	return (
		received.operationResult
		=== UserCredentialAdminCodeOperationResult.ResponseToGet
	);
}

@CCCommand(UserCredentialCommand.AdminPinCodeGet)
@expectedCCResponse(
	UserCredentialCCAdminPinCodeReport,
	testResponseForUserCredentialAdminPinCodeGet,
)
export class UserCredentialCCAdminPinCodeGet extends UserCredentialCC {}

// ============================================================
// Group 8: Key Locker V2
// ============================================================

// @publicAPI
export type UserCredentialCCKeyLockerEntrySetOptions = {
	entryType: UserCredentialKeyLockerEntryType;
	entrySlot: number;
} & (
	| {
			operationType:
				| UserCredentialOperationType.Add
				| UserCredentialOperationType.Modify;
			entryData: Bytes;
	  }
	| {
			operationType: UserCredentialOperationType.Delete;
			entryData?: undefined;
	  }
);

@CCCommand(UserCredentialCommand.KeyLockerEntrySet)
@useSupervision()
export class UserCredentialCCKeyLockerEntrySet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCKeyLockerEntrySetOptions>,
	) {
		super(options);
		this.entryType = options.entryType;
		this.entrySlot = options.entrySlot;
		this.operationType = options.operationType;
		if (options.operationType !== UserCredentialOperationType.Delete) {
			this.entryData = options.entryData;
		}
	}

	public entryType: UserCredentialKeyLockerEntryType;
	public entrySlot: number;
	public operationType: UserCredentialOperationType;
	public entryData: Bytes | undefined;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCKeyLockerEntrySet {
		validatePayload(raw.payload.length >= 4);
		const entryType: UserCredentialKeyLockerEntryType = raw.payload[0];
		const entrySlot = raw.payload.readUInt16BE(1);
		const operationType: UserCredentialOperationType =
			raw.payload[3] & 0b11;

		if (operationType === UserCredentialOperationType.Delete) {
			return new this({
				nodeId: ctx.sourceNodeId,
				entryType,
				entrySlot,
				operationType,
			});
		}

		let entryData = new Bytes();
		if (raw.payload.length >= 6) {
			const entryDataLength = raw.payload.readUInt16BE(4);
			validatePayload(raw.payload.length >= 6 + entryDataLength);
			entryData = Bytes.from(
				raw.payload.subarray(6, 6 + entryDataLength),
			);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			entryType,
			entrySlot,
			operationType,
			entryData,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// For Delete, entry data MAY be omitted
		if (this.operationType === UserCredentialOperationType.Delete) {
			this.payload = Bytes.alloc(4);
			this.payload[0] = this.entryType;
			this.payload.writeUInt16BE(this.entrySlot, 1);
			this.payload[3] = this.operationType & 0b11;
			return super.serialize(ctx);
		}

		if (this.entryData == undefined) {
			throw new ZWaveError(
				`${this.constructor.name}: entry data must be set for Add/Modify operations`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.payload = Bytes.alloc(6 + this.entryData.length);
		this.payload[0] = this.entryType;
		this.payload.writeUInt16BE(this.entrySlot, 1);
		this.payload[3] = this.operationType & 0b11;
		this.payload.writeUInt16BE(this.entryData.length, 4);
		if (this.entryData.length > 0) {
			this.payload.set(this.entryData, 6);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"entry type": getEnumMemberName(
				UserCredentialKeyLockerEntryType,
				this.entryType,
			),
			"entry slot": this.entrySlot,
			"operation type": getEnumMemberName(
				UserCredentialOperationType,
				this.operationType,
			),
		};
		if (this.entryData != undefined) {
			message["entry data length"] = this.entryData.length;
		}
		return { ...super.toLogEntry(ctx), message };
	}
}

// @publicAPI
export interface UserCredentialCCKeyLockerEntryReportOptions {
	occupied: boolean;
	entryType: UserCredentialKeyLockerEntryType;
	entrySlot: number;
}

@CCCommand(UserCredentialCommand.KeyLockerEntryReport)
export class UserCredentialCCKeyLockerEntryReport extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCKeyLockerEntryReportOptions>,
	) {
		super(options);
		this.occupied = options.occupied;
		this.entryType = options.entryType;
		this.entrySlot = options.entrySlot;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCKeyLockerEntryReport {
		validatePayload(raw.payload.length >= 4);
		const occupied = !!(raw.payload[0] & 0x01);
		const entryType: UserCredentialKeyLockerEntryType = raw.payload[1];
		const entrySlot = raw.payload.readUInt16BE(2);

		return new this({
			nodeId: ctx.sourceNodeId,
			occupied,
			entryType,
			entrySlot,
		});
	}

	public readonly occupied: boolean;
	public readonly entryType: UserCredentialKeyLockerEntryType;
	public readonly entrySlot: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(4);
		this.payload[0] = this.occupied ? 0x01 : 0x00;
		this.payload[1] = this.entryType;
		this.payload.writeUInt16BE(this.entrySlot, 2);
		return super.serialize(ctx);
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// This command only exists in V2. Ignore it if the device advertises a lower version.
		if (getEffectiveCCVersion(ctx, this) < 2) return true;

		this.setValue(
			ctx,
			UserCredentialCCValues.keyLockerEntry(
				this.entryType,
				this.entrySlot,
			),
			this.occupied,
		);

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				occupied: this.occupied,
				"entry type": getEnumMemberName(
					UserCredentialKeyLockerEntryType,
					this.entryType,
				),
				"entry slot": this.entrySlot,
			},
		};
	}
}

// @publicAPI
export interface UserCredentialCCKeyLockerEntryGetOptions {
	entryType: UserCredentialKeyLockerEntryType;
	entrySlot: number;
}

function testResponseForUserCredentialKeyLockerEntryGet(
	sent: UserCredentialCCKeyLockerEntryGet,
	received: UserCredentialCCKeyLockerEntryReport,
) {
	return (
		received.entryType === sent.entryType
		&& received.entrySlot === sent.entrySlot
	);
}

@CCCommand(UserCredentialCommand.KeyLockerEntryGet)
@expectedCCResponse(
	UserCredentialCCKeyLockerEntryReport,
	testResponseForUserCredentialKeyLockerEntryGet,
)
export class UserCredentialCCKeyLockerEntryGet extends UserCredentialCC {
	public constructor(
		options: WithAddress<UserCredentialCCKeyLockerEntryGetOptions>,
	) {
		super(options);
		this.entryType = options.entryType;
		this.entrySlot = options.entrySlot;
	}

	public entryType: UserCredentialKeyLockerEntryType;
	public entrySlot: number;

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): UserCredentialCCKeyLockerEntryGet {
		validatePayload(raw.payload.length >= 3);
		const entryType: UserCredentialKeyLockerEntryType = raw.payload[0];
		const entrySlot = raw.payload.readUInt16BE(1);

		return new this({
			nodeId: ctx.sourceNodeId,
			entryType,
			entrySlot,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.alloc(3);
		this.payload[0] = this.entryType;
		this.payload.writeUInt16BE(this.entrySlot, 1);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"entry type": getEnumMemberName(
					UserCredentialKeyLockerEntryType,
					this.entryType,
				),
				"entry slot": this.entrySlot,
			},
		};
	}
}
