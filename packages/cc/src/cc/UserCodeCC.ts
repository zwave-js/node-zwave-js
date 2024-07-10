import {
	CommandClasses,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	enumValuesToMetadataStates,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import {
	getEnumMemberName,
	isPrintableASCII,
	isPrintableASCIIWithWhitespace,
	num2hex,
	pick,
} from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import type { NotificationEventPayload } from "../lib/NotificationEventPayload";
import { V } from "../lib/Values";
import { KeypadMode, UserCodeCommand, UserIDStatus } from "../lib/_Types";

export const UserCodeCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["User Code"], {
		...V.staticProperty("supportedUsers", undefined, { internal: true }),
		...V.staticProperty("supportsAdminCode", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsAdminCodeDeactivation", undefined, {
			internal: true,
		}),
		// The following two properties are only kept for compatibility with devices
		// that were interviewed before the rename to admin code
		...V.staticPropertyWithName(
			"_deprecated_supportsMasterCode",
			"supportsMasterCode",
			undefined,
			{
				internal: true,
			},
		),
		...V.staticPropertyWithName(
			"_deprecated_supportsMasterCodeDeactivation",
			"supportsMasterCodeDeactivation",
			undefined,
			{
				internal: true,
			},
		),
		...V.staticProperty("supportsUserCodeChecksum", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsMultipleUserCodeReport", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsMultipleUserCodeSet", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedUserIDStatuses", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedKeypadModes", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedASCIIChars", undefined, {
			internal: true,
		}),
		...V.staticProperty("userCodeChecksum", undefined, { internal: true }),

		...V.staticProperty(
			"keypadMode",
			{
				...ValueMetadata.ReadOnlyNumber,
				label: "Keypad Mode",
			} as const,
			{ minVersion: 2 } as const,
		),

		...V.staticProperty(
			"adminCode",
			{
				...ValueMetadata.String,
				label: "Admin Code",
				minLength: 4,
				maxLength: 10,
			} as const,
			{
				minVersion: 2,
				secret: true,
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["User Code"], {
		...V.dynamicPropertyAndKeyWithName(
			"userIdStatus",
			"userIdStatus",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userIdStatus" && typeof propertyKey === "number",
			(userId: number) => ({
				...ValueMetadata.Number,
				label: `User ID status (${userId})`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"userCode",
			"userCode",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userCode" && typeof propertyKey === "number",
			// The user code metadata is dynamically created
			undefined,
			{ secret: true },
		),
	}),
});

function parseExtendedUserCode(payload: Buffer): {
	code: UserCode;
	bytesRead: number;
} {
	validatePayload(payload.length >= 4);
	const userId = payload.readUInt16BE(0);
	const status: UserIDStatus = payload[2];
	const codeLength = payload[3] & 0b1111;
	validatePayload(payload.length >= 4 + codeLength);
	const code = payload.subarray(4, 4 + codeLength).toString("ascii");
	return {
		code: {
			userId,
			userIdStatus: status,
			userCode: code,
		},
		bytesRead: 4 + codeLength,
	};
}

function validateCode(code: string, supportedChars: string): boolean {
	if (code.length < 4 || code.length > 10) return false;
	return [...code].every((char) => supportedChars.includes(char));
}

function setUserCodeMetadata(
	this: UserCodeCC,
	applHost: ZWaveApplicationHost,
	userId: number,
	userCode?: string | Buffer,
) {
	const statusValue = UserCodeCCValues.userIdStatus(userId);
	const codeValue = UserCodeCCValues.userCode(userId);

	const supportedUserIDStatuses: UserIDStatus[] =
		this.getValue(applHost, UserCodeCCValues.supportedUserIDStatuses)
			?? (this.version === 1
				? [
					UserIDStatus.Available,
					UserIDStatus.Enabled,
					UserIDStatus.Disabled,
				]
				: [
					UserIDStatus.Available,
					UserIDStatus.Enabled,
					UserIDStatus.Disabled,
					UserIDStatus.Messaging,
					UserIDStatus.PassageMode,
				]);

	this.ensureMetadata(applHost, statusValue, {
		...statusValue.meta,
		states: enumValuesToMetadataStates(
			UserIDStatus,
			supportedUserIDStatuses,
		),
	});

	const codeMetadata: ValueMetadata = {
		...(Buffer.isBuffer(userCode)
			? ValueMetadata.Buffer
			: ValueMetadata.String),
		minLength: 4,
		maxLength: 10,
		label: `User Code (${userId})`,
	};
	if (this.getMetadata(applHost, codeValue)?.type !== codeMetadata.type) {
		this.setMetadata(applHost, codeValue, codeMetadata);
	}
}

function persistUserCode(
	this: UserCodeCC,
	applHost: ZWaveApplicationHost,
	userId: number,
	userIdStatus: UserIDStatus,
	userCode: string | Buffer,
) {
	const statusValue = UserCodeCCValues.userIdStatus(userId);
	const codeValue = UserCodeCCValues.userCode(userId);

	// Check if this code is supported
	if (userIdStatus === UserIDStatus.StatusNotAvailable) {
		// It is not, remove all values if any exist
		this.removeValue(applHost, statusValue);
		this.removeValue(applHost, codeValue);
		this.removeMetadata(applHost, statusValue);
		this.removeMetadata(applHost, codeValue);
	} else {
		// Always create metadata in case it does not exist
		setUserCodeMetadata.call(this, applHost, userId, userCode);
		this.setValue(applHost, statusValue, userIdStatus);
		this.setValue(applHost, codeValue, userCode);
	}

	return true;
}

/** Formats a user code in a way that's safe to print in public logs */
export function userCodeToLogString(userCode: string | Buffer): string {
	if (userCode === "") return "(empty)";
	return "*".repeat(userCode.length);
}

@API(CommandClasses["User Code"])
export class UserCodeCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: UserCodeCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case UserCodeCommand.Get:
			case UserCodeCommand.Set:
			case UserCodeCommand.UsersNumberGet:
				return true; // This is mandatory

			case UserCodeCommand.CapabilitiesGet:
			case UserCodeCommand.KeypadModeSet:
			case UserCodeCommand.KeypadModeGet:
			case UserCodeCommand.ExtendedUserCodeSet:
			case UserCodeCommand.ExtendedUserCodeGet:
				return this.version >= 2;

			case UserCodeCommand.AdminCodeSet:
			case UserCodeCommand.AdminCodeGet: {
				if (this.version < 2) return false;
				return this.tryGetValueDB()?.getValue<boolean>(
					UserCodeCCValues.supportsAdminCode.endpoint(
						this.endpoint.index,
					),
				);
			}

			case UserCodeCommand.UserCodeChecksumGet: {
				if (this.version < 2) return false;
				return this.tryGetValueDB()?.getValue<boolean>(
					UserCodeCCValues.supportsUserCodeChecksum.endpoint(
						this.endpoint.index,
					),
				);
			}
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: UserCodeCCAPI,
			{ property, propertyKey },
			value,
		) {
			let result: SupervisionResult | undefined;
			if (property === "keypadMode") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				result = await this.setKeypadMode(value);
			} else if (
				property === "adminCode"
				// Support devices that were interviewed before the rename to adminCode
				|| property === "masterCode"
			) {
				if (typeof value !== "string") {
					throwWrongValueType(
						this.ccId,
						property,
						"string",
						typeof value,
					);
				}
				result = await this.setAdminCode(value);
			} else if (property === "userIdStatus") {
				if (propertyKey == undefined) {
					throwMissingPropertyKey(this.ccId, property);
				} else if (typeof propertyKey !== "number") {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
				}
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}

				if (value === UserIDStatus.Available) {
					// Clear Code
					result = await this.clear(propertyKey);
				} else {
					// We need to set the user code along with the status
					const userCode = this.getValueDB().getValue<string>(
						UserCodeCCValues.userCode(propertyKey).endpoint(
							this.endpoint.index,
						),
					);
					result = await this.set(propertyKey, value, userCode!);
				}
			} else if (property === "userCode") {
				if (propertyKey == undefined) {
					throwMissingPropertyKey(this.ccId, property);
				} else if (typeof propertyKey !== "number") {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
				}
				if (typeof value !== "string" && !Buffer.isBuffer(value)) {
					throwWrongValueType(
						this.ccId,
						property,
						"string or Buffer",
						typeof value,
					);
				}

				// We need to set the user id status along with the code
				let userIdStatus = this.getValueDB().getValue<UserIDStatus>(
					UserCodeCCValues.userIdStatus(propertyKey).endpoint(
						this.endpoint.index,
					),
				);
				if (
					userIdStatus === UserIDStatus.Available
					|| userIdStatus == undefined
				) {
					userIdStatus = UserIDStatus.Enabled;
				}
				result = await this.set(
					propertyKey,
					userIdStatus as any,
					value,
				);
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}

			// Verify the change after a short delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property, propertyKey }, value, {
					transition: "fast",
				});
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: UserCodeCCAPI, { property, propertyKey }) {
			switch (property) {
				case "keypadMode":
					return this.getKeypadMode();
				case "adminCode":
					return this.getAdminCode();
				case "userIdStatus":
				case "userCode": {
					if (propertyKey == undefined) {
						throwMissingPropertyKey(this.ccId, property);
					} else if (typeof propertyKey !== "number") {
						throwUnsupportedPropertyKey(
							this.ccId,
							property,
							propertyKey,
						);
					}
					return (await this.get(propertyKey))?.[property];
				}
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public async getUsersCount(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.UsersNumberGet,
		);

		const cc = new UserCodeCCUsersNumberGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			UserCodeCCUsersNumberReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedUsers;
	}

	public async get(
		userId: number,
		multiple?: false,
	): Promise<MaybeNotKnown<Pick<UserCode, "userIdStatus" | "userCode">>>;
	public async get(
		userId: number,
		multiple: true,
	): Promise<
		MaybeNotKnown<{ userCodes: readonly UserCode[]; nextUserId: number }>
	>;

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(userId: number, multiple: boolean = false) {
		if (userId > 255 || multiple) {
			this.assertSupportsCommand(
				UserCodeCommand,
				UserCodeCommand.ExtendedUserCodeGet,
			);

			const cc = new UserCodeCCExtendedUserCodeGet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				userId,
				reportMore: multiple,
			});
			const response = await this.applHost.sendCommand<
				UserCodeCCExtendedUserCodeReport
			>(
				cc,
				this.commandOptions,
			);
			if (!response) {
				return;
			} else if (multiple) {
				return pick(response, ["userCodes", "nextUserId"]);
			} else {
				return pick(response.userCodes[0], [
					"userIdStatus",
					"userCode",
				]);
			}
		} else {
			this.assertSupportsCommand(UserCodeCommand, UserCodeCommand.Get);

			const cc = new UserCodeCCGet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				userId,
			});
			const response = await this.applHost.sendCommand<UserCodeCCReport>(
				cc,
				this.commandOptions,
			);
			if (response) return pick(response, ["userIdStatus", "userCode"]);
		}
	}

	/** Configures a single user code */
	@validateArgs()
	public async set(
		userId: number,
		userIdStatus: Exclude<
			UserIDStatus,
			UserIDStatus.Available | UserIDStatus.StatusNotAvailable
		>,
		userCode: string | Buffer,
	): Promise<SupervisionResult | undefined> {
		if (userId > 255) {
			return this.setMany([{ userId, userIdStatus, userCode }]);
		}

		this.assertSupportsCommand(UserCodeCommand, UserCodeCommand.Set);

		const numUsers = UserCodeCC.getSupportedUsersCached(
			this.applHost,
			this.endpoint,
		);
		if (numUsers != undefined && userId > numUsers) {
			throw new ZWaveError(
				`The user ID must be between 0 and the number of supported users ${numUsers}.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new UserCodeCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			userId,
			userIdStatus,
			userCode,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/** Configures multiple user codes */
	@validateArgs()
	public async setMany(
		codes: UserCodeCCSetOptions[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.ExtendedUserCodeSet,
		);

		const numUsers = UserCodeCC.getSupportedUsersCached(
			this.applHost,
			this.endpoint,
		);
		const supportedStatuses = UserCodeCC.getSupportedUserIDStatusesCached(
			this.applHost,
			this.endpoint,
		);
		const supportedASCIIChars = UserCodeCC.getSupportedASCIICharsCached(
			this.applHost,
			this.endpoint,
		);
		const supportsMultipleUserCodeSet =
			UserCodeCC.supportsMultipleUserCodeSetCached(
				this.applHost,
				this.endpoint,
			) ?? false;

		// Validate options
		if (numUsers != undefined) {
			if (
				codes.some((code) => code.userId < 0 || code.userId > numUsers)
			) {
				throw new ZWaveError(
					`All User IDs must be between 0 and the number of supported users ${numUsers}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		} else {
			if (codes.some((code) => code.userId < 0)) {
				throw new ZWaveError(
					`All User IDs must be greater than 0.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		if (codes.some((code) => code.userId === 0) && codes.length > 1) {
			throw new ZWaveError(
				`If user ID 0 is used, only one code may be set`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (
			codes.some(
				(code) =>
					code.userId === 0
					&& code.userIdStatus !== UserIDStatus.Available,
			)
		) {
			throw new ZWaveError(
				`User ID 0 may only be used to clear all user codes`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (codes.length > 1 && !supportsMultipleUserCodeSet) {
			throw new ZWaveError(
				`The node does not support setting multiple user codes at once`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		for (const code of codes) {
			if (
				supportedStatuses != undefined
				&& !supportedStatuses.includes(code.userIdStatus)
			) {
				throw new ZWaveError(
					`The user ID status ${
						getEnumMemberName(
							UserIDStatus,
							code.userIdStatus,
						)
					} is not supported by the node`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (code.userIdStatus === UserIDStatus.Available) {
				code.userCode = undefined;
			} else if (supportedASCIIChars) {
				if (
					!validateCode(
						code.userCode.toString("ascii"),
						supportedASCIIChars,
					)
				) {
					throw new ZWaveError(
						`The user code must consist of 4 to 10 of the following characters: ${supportedASCIIChars}`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			}
		}
		const cc = new UserCodeCCExtendedUserCodeSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			userCodes: codes,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Clears one or all user code
	 * @param userId The user code to clear. If none or 0 is given, all codes are cleared
	 */
	@validateArgs()
	public async clear(
		userId: number = 0,
	): Promise<SupervisionResult | undefined> {
		if (this.version > 1 || userId > 255) {
			return this.setMany([
				{ userId, userIdStatus: UserIDStatus.Available },
			]);
		} else {
			this.assertSupportsCommand(UserCodeCommand, UserCodeCommand.Set);

			const numUsers = UserCodeCC.getSupportedUsersCached(
				this.applHost,
				this.endpoint,
			);
			if (numUsers != undefined && userId > numUsers) {
				throw new ZWaveError(
					`The user ID must be between 0 and the number of supported users ${numUsers}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			const cc = new UserCodeCCSet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				userId,
				userIdStatus: UserIDStatus.Available,
			});
			return this.applHost.sendCommand(cc, this.commandOptions);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities() {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.CapabilitiesGet,
		);

		const cc = new UserCodeCCCapabilitiesGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			UserCodeCCCapabilitiesReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"supportsAdminCode",
				"supportsAdminCodeDeactivation",
				"supportsUserCodeChecksum",
				"supportsMultipleUserCodeReport",
				"supportsMultipleUserCodeSet",
				"supportedUserIDStatuses",
				"supportedKeypadModes",
				"supportedASCIIChars",
			]);
		}
	}

	public async getKeypadMode(): Promise<MaybeNotKnown<KeypadMode>> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.KeypadModeGet,
		);

		const cc = new UserCodeCCKeypadModeGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			UserCodeCCKeypadModeReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.keypadMode;
	}

	@validateArgs({ strictEnums: true })
	public async setKeypadMode(
		keypadMode: KeypadMode,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.KeypadModeSet,
		);

		const supportedModes = UserCodeCC.getSupportedKeypadModesCached(
			this.applHost,
			this.endpoint,
		);

		if (!supportedModes) {
			throw new ZWaveError(
				`The keypad mode can only be set after the interview is complete!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (!supportedModes.includes(keypadMode)) {
			throw new ZWaveError(
				`The keypad mode ${
					getEnumMemberName(
						KeypadMode,
						keypadMode,
					)
				} is not supported by the node!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new UserCodeCCKeypadModeSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			keypadMode,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getAdminCode(): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.AdminCodeGet,
		);

		const cc = new UserCodeCCAdminCodeGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			UserCodeCCAdminCodeReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.adminCode;
	}

	@validateArgs()
	public async setAdminCode(
		adminCode: string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.AdminCodeSet,
		);

		const supportedASCIIChars = UserCodeCC.getSupportedASCIICharsCached(
			this.applHost,
			this.endpoint,
		);
		if (!supportedASCIIChars) {
			throw new ZWaveError(
				`The admin code can only be set after the interview is complete!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Validate the code
		if (!adminCode) {
			const supportsDeactivation = UserCodeCC
				.supportsAdminCodeDeactivationCached(
					this.applHost,
					this.endpoint,
				);
			if (!supportsDeactivation) {
				throw new ZWaveError(
					`The node does not support deactivating the admin code!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		} else if (!validateCode(adminCode, supportedASCIIChars)) {
			throw new ZWaveError(
				`The admin code must consist of 4 to 10 of the following characters: ${supportedASCIIChars}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new UserCodeCCAdminCodeSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			adminCode,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getUserCodeChecksum(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			UserCodeCommand,
			UserCodeCommand.UserCodeChecksumGet,
		);

		const cc = new UserCodeCCUserCodeChecksumGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			UserCodeCCUserCodeChecksumReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.userCodeChecksum;
	}
}

@commandClass(CommandClasses["User Code"])
@implementedVersion(2)
@ccValues(UserCodeCCValues)
export class UserCodeCC extends CommandClass {
	declare ccCommand: UserCodeCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["User Code"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Query capabilities first to determine what needs to be done when refreshing
		if (this.version >= 2) {
			applHost.controllerLog.logNode(node.id, {
				message: "querying capabilities...",
				direction: "outbound",
			});
			const caps = await api.getCapabilities();
			if (!caps) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"User Code capabilities query timed out, skipping interview...",
					level: "warn",
				});
				return;
			}
		}

		applHost.controllerLog.logNode(node.id, {
			message: "querying number of user codes...",
			direction: "outbound",
		});
		const supportedUsers = await api.getUsersCount();
		if (supportedUsers == undefined) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying number of user codes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		for (let userId = 1; userId <= supportedUsers; userId++) {
			setUserCodeMetadata.call(this, applHost, userId);
		}

		// Synchronize user codes and settings
		if (applHost.options.interview?.queryAllUserCodes) {
			await this.refreshValues(applHost);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["User Code"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const supportsAdminCode: boolean = UserCodeCC.supportsAdminCodeCached(
			applHost,
			endpoint,
		);
		const supportsUserCodeChecksum: boolean = this.getValue(
			applHost,
			UserCodeCCValues.supportsUserCodeChecksum,
		) ?? false;
		const supportedKeypadModes: readonly KeypadMode[] =
			this.getValue(applHost, UserCodeCCValues.supportedKeypadModes)
				?? [];
		const supportedUsers: number =
			this.getValue(applHost, UserCodeCCValues.supportedUsers) ?? 0;
		const supportsMultipleUserCodeReport = !!this.getValue(
			applHost,
			UserCodeCCValues.supportsMultipleUserCodeReport,
		);

		// Check for changed values and codes
		if (this.version >= 2) {
			if (supportsAdminCode) {
				applHost.controllerLog.logNode(node.id, {
					message: "querying admin code...",
					direction: "outbound",
				});
				await api.getAdminCode();
			}
			if (supportedKeypadModes.length > 1) {
				applHost.controllerLog.logNode(node.id, {
					message: "querying active keypad mode...",
					direction: "outbound",
				});
				await api.getKeypadMode();
			}
			const storedUserCodeChecksum: number =
				this.getValue(applHost, UserCodeCCValues.userCodeChecksum) ?? 0;

			let currentUserCodeChecksum: number | undefined = 0;
			if (supportsUserCodeChecksum) {
				applHost.controllerLog.logNode(node.id, {
					message: "retrieving current user code checksum...",
					direction: "outbound",
				});
				currentUserCodeChecksum = await api.getUserCodeChecksum();
			}
			if (
				!supportsUserCodeChecksum
				|| currentUserCodeChecksum !== storedUserCodeChecksum
			) {
				applHost.controllerLog.logNode(node.id, {
					message:
						"checksum changed or is not supported, querying all user codes...",
					direction: "outbound",
				});

				if (supportsMultipleUserCodeReport) {
					// Query the user codes in bulk
					let nextUserId = 1;
					while (nextUserId > 0 && nextUserId <= supportedUsers) {
						const response = await api.get(nextUserId, true);
						if (response) {
							nextUserId = response.nextUserId;
						} else {
							applHost.controllerLog.logNode(node.id, {
								endpoint: this.endpointIndex,
								message:
									`Querying user code #${nextUserId} timed out, skipping the remaining interview...`,
								level: "warn",
							});
							break;
						}
					}
				} else {
					// Query one user code at a time
					for (let userId = 1; userId <= supportedUsers; userId++) {
						await api.get(userId);
					}
				}
			}
		} else {
			// V1
			applHost.controllerLog.logNode(node.id, {
				message: "querying all user codes...",
				direction: "outbound",
			});
			for (let userId = 1; userId <= supportedUsers; userId++) {
				await api.get(userId);
			}
		}
	}

	/**
	 * Returns the number of supported users.
	 * This only works AFTER the interview process
	 */
	public static getSupportedUsersCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<number> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(UserCodeCCValues.supportedUsers.endpoint(endpoint.index));
	}

	/**
	 * Returns the supported keypad modes.
	 * This only works AFTER the interview process
	 */
	public static getSupportedKeypadModesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<KeypadMode[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				UserCodeCCValues.supportedKeypadModes.endpoint(endpoint.index),
			);
	}

	/**
	 * Returns the supported user ID statuses.
	 * This only works AFTER the interview process
	 */
	public static getSupportedUserIDStatusesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<UserIDStatus[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				UserCodeCCValues.supportedUserIDStatuses.endpoint(
					endpoint.index,
				),
			);
	}

	/**
	 * Returns the supported ASCII characters.
	 * This only works AFTER the interview process
	 */
	public static getSupportedASCIICharsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<string> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				UserCodeCCValues.supportedASCIIChars.endpoint(endpoint.index),
			);
	}

	/**
	 * Returns whether the admin code functionality is supported.
	 * This only works AFTER the interview process
	 */
	public static supportsAdminCodeCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): boolean {
		const valueDB = applHost
			.getValueDB(endpoint.nodeId);
		return valueDB.getValue<boolean>(
			UserCodeCCValues.supportsAdminCode.endpoint(
				endpoint.index,
			),
		) ?? valueDB.getValue<boolean>(
			UserCodeCCValues._deprecated_supportsMasterCode.endpoint(
				endpoint.index,
			),
		) ?? false;
	}

	/**
	 * Returns whether deactivating the admin code is supported.
	 * This only works AFTER the interview process
	 */
	public static supportsAdminCodeDeactivationCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): boolean {
		const valueDB = applHost
			.getValueDB(endpoint.nodeId);
		return valueDB.getValue<boolean>(
			UserCodeCCValues.supportsAdminCodeDeactivation.endpoint(
				endpoint.index,
			),
		) ?? valueDB.getValue<boolean>(
			UserCodeCCValues._deprecated_supportsMasterCodeDeactivation
				.endpoint(
					endpoint.index,
				),
		) ?? false;
	}

	/**
	 * Returns whether setting multiple user codes at once is supported.
	 * This only works AFTER the interview process
	 */
	public static supportsMultipleUserCodeSetCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): boolean {
		return !!applHost
			.getValueDB(endpoint.nodeId)
			.getValue<boolean>(
				UserCodeCCValues.supportsMultipleUserCodeSet.endpoint(
					endpoint.index,
				),
			);
	}

	/**
	 * Returns the current status of a user ID.
	 * This only works AFTER the user IDs have been queried.
	 */
	public static getUserIdStatusCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		userId: number,
	): MaybeNotKnown<UserIDStatus> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue<UserIDStatus>(
				UserCodeCCValues.userIdStatus(userId).endpoint(endpoint.index),
			);
	}

	/**
	 * Returns the current code belonging to a user ID.
	 * This only works AFTER the user IDs have been queried.
	 */
	public static getUserCodeCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		userId: number,
	): MaybeNotKnown<string | Buffer> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue<string | Buffer>(
				UserCodeCCValues.userCode(userId).endpoint(endpoint.index),
			);
	}
}

// @publicAPI
export type UserCodeCCSetOptions =
	| {
		userId: 0;
		userIdStatus: UserIDStatus.Available;
		userCode?: undefined;
	}
	| {
		userId: number;
		userIdStatus: UserIDStatus.Available;
		userCode?: undefined;
	}
	| {
		userId: number;
		userIdStatus: Exclude<
			UserIDStatus,
			UserIDStatus.Available | UserIDStatus.StatusNotAvailable
		>;
		userCode: string | Buffer;
	};

@CCCommand(UserCodeCommand.Set)
@useSupervision()
export class UserCodeCCSet extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & UserCodeCCSetOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.userIdStatus = this.payload[1];
			if (
				this.userIdStatus !== UserIDStatus.Available
				&& this.userIdStatus !== UserIDStatus.StatusNotAvailable
			) {
				this.userCode = this.payload.subarray(2);
			} else {
				this.userCode = Buffer.alloc(4, 0x00);
			}
		} else {
			this.userId = options.userId;
			this.userIdStatus = options.userIdStatus;

			// Validate options
			if (this.userId < 0) {
				throw new ZWaveError(
					`${this.constructor.name}: The user ID must be between greater than 0.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (
				this.userId === 0
				&& this.userIdStatus !== UserIDStatus.Available
			) {
				throw new ZWaveError(
					`${this.constructor.name}: User ID 0 may only be used to clear all user codes`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (this.userIdStatus === UserIDStatus.Available) {
				this.userCode = "\0".repeat(4);
			} else {
				this.userCode = options.userCode!;
				// Specs say ASCII 0-9, manufacturers don't care :)
				if (this.userCode.length < 4 || this.userCode.length > 10) {
					throw new ZWaveError(
						`${this.constructor.name}: The user code must have a length of 4 to 10 ${
							typeof this.userCode === "string"
								? "characters"
								: "bytes"
						}`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			}
		}
	}

	public userId: number;
	public userIdStatus: UserIDStatus;
	public userCode: string | Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.userId, this.userIdStatus]),
			typeof this.userCode === "string"
				? Buffer.from(this.userCode, "ascii")
				: this.userCode,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user id": this.userId,
				"id status": getEnumMemberName(UserIDStatus, this.userIdStatus),
				"user code": userCodeToLogString(this.userCode),
			},
		};
	}
}

// @publicAPI
export interface UserCodeCCReportOptions extends CCCommandOptions {
	userId: number;
	userIdStatus: UserIDStatus;
	userCode?: string | Buffer;
}

@CCCommand(UserCodeCommand.Report)
export class UserCodeCCReport extends UserCodeCC
	implements NotificationEventPayload
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | UserCodeCCReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.userIdStatus = this.payload[1];

			if (
				this.payload.length === 2
				&& (this.userIdStatus === UserIDStatus.Available
					|| this.userIdStatus === UserIDStatus.StatusNotAvailable)
			) {
				// The user code is not set or not available and this report contains no user code
				this.userCode = "";
			} else {
				// The specs require the user code to be at least 4 digits
				validatePayload(this.payload.length >= 6);

				let userCodeBuffer = this.payload.subarray(2);
				// Specs say infer user code from payload length, manufacturers send zero-padded strings
				while (userCodeBuffer.at(-1) === 0) {
					userCodeBuffer = userCodeBuffer.subarray(0, -1);
				}
				// Specs say ASCII 0-9, manufacturers don't care :)
				// Thus we check if the code is printable using ASCII, if not keep it as a Buffer
				const userCodeString = userCodeBuffer.toString("utf8");
				if (isPrintableASCII(userCodeString)) {
					this.userCode = userCodeString;
				} else if (
					this.version === 1
					&& isPrintableASCIIWithWhitespace(userCodeString)
				) {
					// Ignore leading and trailing whitespace in V1 reports if the rest is ASCII
					this.userCode = userCodeString.trim();
				} else {
					this.userCode = userCodeBuffer;
				}
			}
		} else {
			this.userId = options.userId;
			this.userIdStatus = options.userIdStatus;
			this.userCode = options.userCode ?? "";
		}
	}

	public readonly userId: number;
	public readonly userIdStatus: UserIDStatus;
	public readonly userCode: string | Buffer;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		persistUserCode.call(
			this,
			applHost,
			this.userId,
			this.userIdStatus,
			this.userCode,
		);
		return true;
	}

	public serialize(): Buffer {
		let userCodeBuffer: Buffer;
		if (typeof this.userCode === "string") {
			userCodeBuffer = Buffer.from(this.userCode, "ascii");
		} else {
			userCodeBuffer = this.userCode;
		}

		this.payload = Buffer.concat([
			Buffer.from([this.userId, this.userIdStatus]),
			userCodeBuffer,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user id": this.userId,
				"id status": getEnumMemberName(UserIDStatus, this.userIdStatus),
				"user code": userCodeToLogString(this.userCode),
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toNotificationEventParameters() {
		return { userId: this.userId };
	}
}

// @publicAPI
export interface UserCodeCCGetOptions extends CCCommandOptions {
	userId: number;
}

@CCCommand(UserCodeCommand.Get)
@expectedCCResponse(UserCodeCCReport)
export class UserCodeCCGet extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | UserCodeCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.userId = this.payload[0];
		} else {
			this.userId = options.userId;
		}
	}

	public userId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "user id": this.userId },
		};
	}
}

// @publicAPI
export interface UserCodeCCUsersNumberReportOptions extends CCCommandOptions {
	supportedUsers: number;
}

@CCCommand(UserCodeCommand.UsersNumberReport)
export class UserCodeCCUsersNumberReport extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCUsersNumberReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			if (this.payload.length >= 3) {
				// V2+
				this.supportedUsers = this.payload.readUInt16BE(1);
			} else {
				// V1
				this.supportedUsers = this.payload[0];
			}
		} else {
			this.supportedUsers = options.supportedUsers;
		}
	}

	@ccValue(UserCodeCCValues.supportedUsers)
	public readonly supportedUsers: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(3);
		// If the node implements more than 255 users, this field MUST be set to 255
		this.payload[0] = Math.min(255, this.supportedUsers);
		this.payload.writeUInt16BE(this.supportedUsers, 1);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "supported users": this.supportedUsers },
		};
	}
}

@CCCommand(UserCodeCommand.UsersNumberGet)
@expectedCCResponse(UserCodeCCUsersNumberReport)
export class UserCodeCCUsersNumberGet extends UserCodeCC {}

// @publicAPI
export interface UserCodeCCCapabilitiesReportOptions extends CCCommandOptions {
	supportsAdminCode: boolean;
	supportsAdminCodeDeactivation: boolean;
	supportsUserCodeChecksum: boolean;
	supportsMultipleUserCodeReport: boolean;
	supportsMultipleUserCodeSet: boolean;
	supportedUserIDStatuses: readonly UserIDStatus[];
	supportedKeypadModes: readonly KeypadMode[];
	supportedASCIIChars: string;
}

@CCCommand(UserCodeCommand.CapabilitiesReport)
export class UserCodeCCCapabilitiesReport extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCCapabilitiesReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			let offset = 0;

			validatePayload(this.payload.length >= offset + 1);
			this.supportsAdminCode = !!(this.payload[offset] & 0b100_00000);
			this.supportsAdminCodeDeactivation = !!(
				this.payload[offset] & 0b010_00000
			);
			const statusBitMaskLength = this.payload[offset] & 0b000_11111;
			offset += 1;

			validatePayload(
				this.payload.length >= offset + statusBitMaskLength + 1,
			);
			this.supportedUserIDStatuses = parseBitMask(
				this.payload.subarray(offset, offset + statusBitMaskLength),
				UserIDStatus.Available,
			);
			offset += statusBitMaskLength;

			this.supportsUserCodeChecksum = !!(
				this.payload[offset] & 0b100_00000
			);
			this.supportsMultipleUserCodeReport = !!(
				this.payload[offset] & 0b010_00000
			);
			this.supportsMultipleUserCodeSet = !!(
				this.payload[offset] & 0b001_00000
			);
			const keypadModesBitMaskLength = this.payload[offset] & 0b000_11111;
			offset += 1;

			validatePayload(
				this.payload.length >= offset + keypadModesBitMaskLength + 1,
			);
			this.supportedKeypadModes = parseBitMask(
				this.payload.subarray(
					offset,
					offset + keypadModesBitMaskLength,
				),
				KeypadMode.Normal,
			);
			offset += keypadModesBitMaskLength;

			const keysBitMaskLength = this.payload[offset] & 0b000_11111;
			offset += 1;

			validatePayload(this.payload.length >= offset + keysBitMaskLength);
			this.supportedASCIIChars = Buffer.from(
				parseBitMask(
					this.payload.subarray(offset, offset + keysBitMaskLength),
					0,
				),
			).toString("ascii");
		} else {
			this.supportsAdminCode = options.supportsAdminCode;
			this.supportsAdminCodeDeactivation =
				options.supportsAdminCodeDeactivation;
			this.supportsUserCodeChecksum = options.supportsUserCodeChecksum;
			this.supportsMultipleUserCodeReport =
				options.supportsMultipleUserCodeReport;
			this.supportsMultipleUserCodeSet =
				options.supportsMultipleUserCodeSet;
			this.supportedUserIDStatuses = options.supportedUserIDStatuses;
			this.supportedKeypadModes = options.supportedKeypadModes;
			this.supportedASCIIChars = options.supportedASCIIChars;
		}
	}

	@ccValue(UserCodeCCValues.supportsAdminCode)
	public readonly supportsAdminCode: boolean;

	@ccValue(UserCodeCCValues.supportsAdminCodeDeactivation)
	public readonly supportsAdminCodeDeactivation: boolean;

	@ccValue(UserCodeCCValues.supportsUserCodeChecksum)
	public readonly supportsUserCodeChecksum: boolean;

	@ccValue(UserCodeCCValues.supportsMultipleUserCodeReport)
	public readonly supportsMultipleUserCodeReport: boolean;

	@ccValue(UserCodeCCValues.supportsMultipleUserCodeSet)
	public readonly supportsMultipleUserCodeSet: boolean;

	@ccValue(UserCodeCCValues.supportedUserIDStatuses)
	public readonly supportedUserIDStatuses: readonly UserIDStatus[];

	@ccValue(UserCodeCCValues.supportedKeypadModes)
	public readonly supportedKeypadModes: readonly KeypadMode[];

	@ccValue(UserCodeCCValues.supportedASCIIChars)
	public readonly supportedASCIIChars: string;

	public serialize(): Buffer {
		const supportedStatusesBitmask = encodeBitMask(
			this.supportedUserIDStatuses,
			undefined,
			UserIDStatus.Available,
		);
		const controlByte1 = (this.supportsAdminCode ? 0b100_00000 : 0)
			| (this.supportsAdminCodeDeactivation ? 0b010_00000 : 0)
			| (supportedStatusesBitmask.length & 0b000_11111);

		const supportedKeypadModesBitmask = encodeBitMask(
			this.supportedKeypadModes,
			undefined,
			KeypadMode.Normal,
		);
		const controlByte2 = (this.supportsUserCodeChecksum ? 0b100_00000 : 0)
			| (this.supportsMultipleUserCodeReport ? 0b010_00000 : 0)
			| (this.supportsMultipleUserCodeSet ? 0b001_00000 : 0)
			| (supportedKeypadModesBitmask.length & 0b000_11111);

		const keysAsNumbers = [...this.supportedASCIIChars].map((char) =>
			char.charCodeAt(0)
		);
		const supportedKeysBitmask = encodeBitMask(keysAsNumbers, undefined, 0);
		const controlByte3 = supportedKeysBitmask.length & 0b000_11111;

		this.payload = Buffer.concat([
			Buffer.from([controlByte1]),
			supportedStatusesBitmask,
			Buffer.from([controlByte2]),
			supportedKeypadModesBitmask,
			Buffer.from([controlByte3]),
			supportedKeysBitmask,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supports admin code": this.supportsAdminCode,
				"supports admin code deactivation":
					this.supportsAdminCodeDeactivation,
				"supports user code checksum": this.supportsUserCodeChecksum,
				"supports multiple codes in report":
					this.supportsMultipleUserCodeReport,
				"supports multiple codes in set":
					this.supportsMultipleUserCodeSet,
				"supported user id statuses": this.supportedUserIDStatuses
					.map(
						(status) =>
							`\n· ${getEnumMemberName(UserIDStatus, status)}`,
					)
					.join(""),
				"supported keypad modes": this.supportedKeypadModes
					.map((mode) => `\n· ${getEnumMemberName(KeypadMode, mode)}`)
					.join(""),
				"supported ASCII chars": this.supportedASCIIChars,
			},
		};
	}
}

@CCCommand(UserCodeCommand.CapabilitiesGet)
@expectedCCResponse(UserCodeCCCapabilitiesReport)
export class UserCodeCCCapabilitiesGet extends UserCodeCC {}

// @publicAPI
export interface UserCodeCCKeypadModeSetOptions extends CCCommandOptions {
	keypadMode: KeypadMode;
}

@CCCommand(UserCodeCommand.KeypadModeSet)
@useSupervision()
export class UserCodeCCKeypadModeSet extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCKeypadModeSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.keypadMode = this.payload[0];
		} else {
			this.keypadMode = options.keypadMode;
		}
	}

	public keypadMode: KeypadMode;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.keypadMode]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { mode: getEnumMemberName(KeypadMode, this.keypadMode) },
		};
	}
}

// @publicAPI
export interface UserCodeCCKeypadModeReportOptions extends CCCommandOptions {
	keypadMode: KeypadMode;
}

@CCCommand(UserCodeCommand.KeypadModeReport)
export class UserCodeCCKeypadModeReport extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCKeypadModeReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.keypadMode = this.payload[0];
		} else {
			this.keypadMode = options.keypadMode;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Update the keypad modes metadata
		const supportedKeypadModes: KeypadMode[] = this.getValue(
			applHost,
			UserCodeCCValues.supportedKeypadModes,
		) ?? [this.keypadMode];

		const keypadModeValue = UserCodeCCValues.keypadMode;
		this.setMetadata(applHost, keypadModeValue, {
			...keypadModeValue.meta,
			states: enumValuesToMetadataStates(
				KeypadMode,
				supportedKeypadModes,
			),
		});

		return true;
	}

	@ccValue(UserCodeCCValues.keypadMode)
	public readonly keypadMode: KeypadMode;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.keypadMode]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				keypadMode: getEnumMemberName(KeypadMode, this.keypadMode),
			},
		};
	}
}

@CCCommand(UserCodeCommand.KeypadModeGet)
@expectedCCResponse(UserCodeCCKeypadModeReport)
export class UserCodeCCKeypadModeGet extends UserCodeCC {}

// @publicAPI
export interface UserCodeCCAdminCodeSetOptions extends CCCommandOptions {
	adminCode: string;
}

@CCCommand(UserCodeCommand.AdminCodeSet)
@useSupervision()
export class UserCodeCCAdminCodeSet extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCAdminCodeSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const codeLength = this.payload[0] & 0b1111;
			validatePayload(this.payload.length >= 1 + codeLength);
			this.adminCode = this.payload
				.subarray(1, 1 + codeLength)
				.toString("ascii");
		} else {
			this.adminCode = options.adminCode;
		}
	}

	public adminCode: string;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.adminCode.length & 0b1111]),
			Buffer.from(this.adminCode, "ascii"),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "admin code": userCodeToLogString(this.adminCode) },
		};
	}
}

// @publicAPI
export interface UserCodeCCAdminCodeReportOptions extends CCCommandOptions {
	adminCode: string;
}

@CCCommand(UserCodeCommand.AdminCodeReport)
export class UserCodeCCAdminCodeReport extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCAdminCodeReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const codeLength = this.payload[0] & 0b1111;
			validatePayload(this.payload.length >= 1 + codeLength);
			this.adminCode = this.payload
				.subarray(1, 1 + codeLength)
				.toString("ascii");
		} else {
			this.adminCode = options.adminCode;
		}
	}

	@ccValue(UserCodeCCValues.adminCode)
	public readonly adminCode: string;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.adminCode.length & 0b1111]),
			Buffer.from(this.adminCode, "ascii"),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "admin code": userCodeToLogString(this.adminCode) },
		};
	}
}

@CCCommand(UserCodeCommand.AdminCodeGet)
@expectedCCResponse(UserCodeCCAdminCodeReport)
export class UserCodeCCAdminCodeGet extends UserCodeCC {}

// @publicAPI
export interface UserCodeCCUserCodeChecksumReportOptions
	extends CCCommandOptions
{
	userCodeChecksum: number;
}

@CCCommand(UserCodeCommand.UserCodeChecksumReport)
export class UserCodeCCUserCodeChecksumReport extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCUserCodeChecksumReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userCodeChecksum = this.payload.readUInt16BE(0);
		} else {
			this.userCodeChecksum = options.userCodeChecksum;
		}
	}

	@ccValue(UserCodeCCValues.userCodeChecksum)
	public readonly userCodeChecksum: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(2);
		this.payload.writeUInt16BE(this.userCodeChecksum, 0);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "user code checksum": num2hex(this.userCodeChecksum) },
		};
	}
}

@CCCommand(UserCodeCommand.UserCodeChecksumGet)
@expectedCCResponse(UserCodeCCUserCodeChecksumReport)
export class UserCodeCCUserCodeChecksumGet extends UserCodeCC {}

// @publicAPI
export interface UserCodeCCExtendedUserCodeSetOptions extends CCCommandOptions {
	userCodes: UserCodeCCSetOptions[];
}

export interface UserCode {
	userId: number;
	userIdStatus: UserIDStatus;
	userCode: string;
}

@CCCommand(UserCodeCommand.ExtendedUserCodeSet)
@useSupervision()
export class UserCodeCCExtendedUserCodeSet extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCExtendedUserCodeSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.userCodes = options.userCodes;
		}
	}

	public userCodes: UserCodeCCSetOptions[];

	public serialize(): Buffer {
		const userCodeBuffers = this.userCodes.map((code) => {
			const ret = Buffer.concat([
				Buffer.from([
					0,
					0,
					code.userIdStatus,
					code.userCode?.length ?? 0,
				]),
				Buffer.isBuffer(code.userCode)
					? code.userCode
					: Buffer.from(code.userCode ?? "", "ascii"),
			]);
			ret.writeUInt16BE(code.userId, 0);
			return ret;
		});
		this.payload = Buffer.concat([
			Buffer.from([this.userCodes.length]),
			...userCodeBuffers,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const { userId, userIdStatus, userCode } of this.userCodes) {
			message[`code #${userId}`] = `${
				userCodeToLogString(
					userCode ?? "",
				)
			} (status: ${getEnumMemberName(UserIDStatus, userIdStatus)})`;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(UserCodeCommand.ExtendedUserCodeReport)
export class UserCodeCCExtendedUserCodeReport extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		const numCodes = this.payload[0];
		let offset = 1;
		const userCodes: UserCode[] = [];
		// parse each user code
		for (let i = 0; i < numCodes; i++) {
			const { code, bytesRead } = parseExtendedUserCode(
				this.payload.subarray(offset),
			);
			userCodes.push(code);
			offset += bytesRead;
		}
		this.userCodes = userCodes;

		validatePayload(this.payload.length >= offset + 2);
		this.nextUserId = this.payload.readUInt16BE(offset);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		for (const { userId, userIdStatus, userCode } of this.userCodes) {
			persistUserCode.call(
				this,
				applHost,
				userId,
				userIdStatus,
				userCode,
			);
		}
		return true;
	}

	public readonly userCodes: readonly UserCode[];
	public readonly nextUserId: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const { userId, userIdStatus, userCode } of this.userCodes) {
			message[`code #${userId}`] = `${
				userCodeToLogString(
					userCode,
				)
			} (status: ${getEnumMemberName(UserIDStatus, userIdStatus)})`;
		}
		message["next user id"] = this.nextUserId;
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface UserCodeCCExtendedUserCodeGetOptions extends CCCommandOptions {
	userId: number;
	reportMore?: boolean;
}

@CCCommand(UserCodeCommand.ExtendedUserCodeGet)
@expectedCCResponse(UserCodeCCExtendedUserCodeReport)
export class UserCodeCCExtendedUserCodeGet extends UserCodeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| UserCodeCCExtendedUserCodeGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.userId = options.userId;
			this.reportMore = !!options.reportMore;
		}
	}

	public userId: number;
	public reportMore: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([0, 0, this.reportMore ? 1 : 0]);
		this.payload.writeUInt16BE(this.userId, 0);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user id": this.userId,
				"report more": this.reportMore,
			},
		};
	}
}
