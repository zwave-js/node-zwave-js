import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { CCAPI } from "zwave-js/src/lib/commandclass/API";
import type { Driver } from "../driver/Driver";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum UserCodeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	UsersNumberGet = 0x04,
	UsersNumberReport = 0x05,
}

// @publicAPI
export enum UserIDStatus {
	Available = 0x00,
	Occupied,
	ReservedByAdmin,
	StatusNotAvailable = 0xfe,
}

export function getSupportedUsersValueID(
	endpoint: number | undefined,
): ValueID {
	return {
		commandClass: CommandClasses["User Code"],
		endpoint,
		property: "supportedUsers",
	};
}

export function getUserIdStatusValueID(
	endpoint: number | undefined,
	userId: number,
): ValueID {
	return {
		commandClass: CommandClasses["User Code"],
		endpoint,
		property: "userIdStatus",
		propertyKey: userId,
	};
}

export function getUserCodeValueID(
	endpoint: number | undefined,
	userId: number,
): ValueID {
	return {
		commandClass: CommandClasses["User Code"],
		endpoint,
		property: "userCode",
		propertyKey: userId,
	};
}

@API(CommandClasses["User Code"])
export class UserCodeCCAPI extends CCAPI {
	public supportsCommand(cmd: UserCodeCommand): Maybe<boolean> {
		switch (cmd) {
			case UserCodeCommand.Get:
			case UserCodeCommand.Set:
			case UserCodeCommand.UsersNumberGet:
				return true; // This is mandatory
			// case UserCodeCommand.SomeV2Command:
			// 	return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(userId: number) {
		this.assertSupportsCommand(UserCodeCommand, UserCodeCommand.Get);

		const cc = new UserCodeCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			userId,
		});
		const response = (await this.driver.sendCommand<UserCodeCCReport>(
			cc,
			this.commandOptions,
		))!;
		return pick(response, ["userIdStatus", "userCode"]);
	}

	/** Sets a user code and ID status */
	public async set(
		userId: number,
		userIdStatus: UserIDStatus.Occupied | UserIDStatus.ReservedByAdmin,
		userCode: string,
	): Promise<void> {
		this.assertSupportsCommand(UserCodeCommand, UserCodeCommand.Set);

		const cc = new UserCodeCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			userId,
			userIdStatus,
			userCode,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Clears one or all user code
	 * @param userId The user code to clear. If none or 0 is given, all codes are cleared
	 */
	public async clear(userId: number = 0): Promise<void> {
		this.assertSupportsCommand(UserCodeCommand, UserCodeCommand.Set);

		const cc = new UserCodeCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			userId,
			userIdStatus: UserIDStatus.Available,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["User Code"])
@implementedVersion(1)
export class UserCodeCC extends CommandClass {
	declare ccCommand: UserCodeCommand;
}

type UserCodeCCSetOptions =
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
			userIdStatus: UserIDStatus.Occupied | UserIDStatus.ReservedByAdmin;
			userCode: string;
	  };

@CCCommand(UserCodeCommand.Set)
export class UserCodeCCSet extends UserCodeCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & UserCodeCCSetOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.userId = options.userId;
			this.userIdStatus = options.userIdStatus;

			// Validate options
			if (
				this.userId === 0 &&
				this.userIdStatus !== UserIDStatus.Available
			) {
				throw new ZWaveError(
					`${this.constructor.name}: User ID 0 may only be used to clear all user codes`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (this.userIdStatus === UserIDStatus.Available) {
				this.userCode = "\x00".repeat(4);
			} else {
				this.userCode = options.userCode!;
				if (!/^[0-9]{4,10}$/.test(this.userCode)) {
					throw new ZWaveError(
						`${this.constructor.name}: The user code must consist of 4 to 10 numeric digits in ASCII representation.`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			}
		}
	}

	public userId: number;
	public userIdStatus: UserIDStatus;
	public userCode: string;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.userId, this.userIdStatus]),
			Buffer.from(this.userCode, "ascii"),
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: [
				`user id:   ${this.userId}`,
				`id status: ${getEnumMemberName(
					UserIDStatus,
					this.userIdStatus,
				)}`,
				`user code: ${this.userCode}`,
			],
		};
	}
}

@CCCommand(UserCodeCommand.Report)
export class UserCodeCCReport extends UserCodeCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 6);
		this.userId = this.payload[0];
		this.userIdStatus = this.payload[1];
		this.userCode = this.payload.slice(2).toString("ascii");
		this.persistValues();
	}

	public readonly userId: number;
	public readonly userIdStatus: UserIDStatus;
	public readonly userCode: string;

	public persistValues(): boolean {
		const statusValueId = getUserIdStatusValueID(
			this.endpointIndex,
			this.userId,
		);
		const codeValueId = getUserCodeValueID(this.endpointIndex, this.userId);
		const valueDB = this.getValueDB();

		// Always create metadata if it does not exist
		if (!valueDB.hasMetadata(statusValueId)) {
			valueDB.setMetadata(statusValueId, {
				...ValueMetadata.Number,
				label: `User ID status (${this.userId})`,
				states: enumValuesToMetadataStates(UserIDStatus, [
					UserIDStatus.Available,
					UserIDStatus.Occupied,
					UserIDStatus.ReservedByAdmin,
				]),
			});
		}
		if (!valueDB.hasMetadata(codeValueId)) {
			valueDB.setMetadata(codeValueId, {
				...ValueMetadata.String,
				minLength: 4,
				maxLength: 10,
				label: `User Code (${this.userId})`,
			});
		}

		valueDB.setValue(statusValueId, this.userIdStatus);
		valueDB.setValue(codeValueId, this.userCode);

		return true;
	}
	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: [
				`user id:   ${this.userId}`,
				`id status: ${getEnumMemberName(
					UserIDStatus,
					this.userIdStatus,
				)}`,
				`user code: ${this.userCode}`,
			],
		};
	}
}

interface UserCodeCCGetOptions extends CCCommandOptions {
	userId: number;
}

@CCCommand(UserCodeCommand.Get)
@expectedCCResponse(UserCodeCCReport)
export class UserCodeCCGet extends UserCodeCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | UserCodeCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.userId = options.userId;
		}
	}

	public userId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `user id: ${this.userId}`,
		};
	}
}

@CCCommand(UserCodeCommand.UsersNumberReport)
export class UserCodeCCUsersNumberReport extends UserCodeCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.supportedUsers = this.payload[0];
		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly supportedUsers: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `supported users: ${this.supportedUsers}`,
		};
	}
}

@CCCommand(UserCodeCommand.UsersNumberGet)
@expectedCCResponse(UserCodeCCUsersNumberReport)
export class UserCodeCCUsersNumberGet extends UserCodeCC {}
