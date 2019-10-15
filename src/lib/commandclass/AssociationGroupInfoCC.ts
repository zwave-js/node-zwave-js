import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	parseCCId,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum AssociationGroupInfoCommand {
	NameGet = 0x01,
	NameReport = 0x02,
	InfoGet = 0x03,
	InfoReport = 0x04,
	CommandListGet = 0x05,
	CommandListReport = 0x06,
}

export interface AssociationGroupInfoCC {
	ccCommand: AssociationGroupInfoCommand;
}

@commandClass(CommandClasses["Association Group Information"])
@implementedVersion(1)
export class AssociationGroupInfoCC extends CommandClass {}

@CCCommand(AssociationGroupInfoCommand.NameReport)
export class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.groupId = this.payload[0];
		const nameLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + nameLength);
		this.name = this.payload.slice(2, 2 + nameLength).toString("utf8");
	}

	public readonly groupId: number;
	public readonly name: string;
}

interface AssociationGroupInfoCCNameGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.NameGet)
@expectedCCResponse(AssociationGroupInfoCCNameReport)
export class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCNameGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.groupId = options.groupId;
		}
	}

	public groupId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId]);
		return super.serialize();
	}
}

export interface AssociationGroupInfo {
	groupId: number;
	mode: number;
	profile: number;
	eventCode: number;
}

@CCCommand(AssociationGroupInfoCommand.InfoReport)
export class AssociationGroupInfoCCInfoReport extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.isListMode = !!(this.payload[0] & 0b1000_0000);
		this.hasDynamicInfo = !!(this.payload[0] & 0b0100_0000);

		const groupCount = this.payload[0] & 0b0011_1111;
		// each group requires 7 bytes of payload
		validatePayload(this.payload.length >= 1 + groupCount * 7);
		const _groups: AssociationGroupInfo[] = [];
		for (let i = 0; i < groupCount; i++) {
			const offset = 1 + i * groupCount;
			const groupBytes = this.payload.slice(offset, offset + 7);
			_groups.push({
				groupId: groupBytes[0],
				mode: 0, //groupBytes[1],
				profile: groupBytes.readUInt16BE(2),
				eventCode: 0, // groupBytes.readUInt16BE(5),
			});
		}
		this.groups = _groups;
	}

	public readonly isListMode: boolean;
	public readonly hasDynamicInfo: boolean;
	public readonly groups: readonly AssociationGroupInfo[];
}

type AssociationGroupInfoCCInfoGetOptions = CCCommandOptions & {
	refreshCache: boolean;
} & (
		| {
				listMode: boolean;
		  }
		| {
				groupId: number;
		  });

@CCCommand(AssociationGroupInfoCommand.InfoGet)
@expectedCCResponse(AssociationGroupInfoCCInfoReport)
export class AssociationGroupInfoCCInfoGet extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCInfoGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.refreshCache = options.refreshCache;
			if ("listMode" in options) this.listMode = options.listMode;
			if ("groupId" in options) this.groupId = options.groupId;
		}
	}

	public refreshCache: boolean;
	public listMode?: boolean;
	public groupId?: number;

	public serialize(): Buffer {
		const isListMode = this.listMode === true;
		const optionByte =
			(this.refreshCache ? 0b1000_0000 : 0) |
			(isListMode ? 0b0100_0000 : 0);
		this.payload = Buffer.from([
			optionByte,
			(isListMode && this.groupId) || 0,
		]);
		return super.serialize();
	}
}

@CCCommand(AssociationGroupInfoCommand.CommandListReport)
export class AssociationGroupInfoCCCommandListReport extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.groupId = this.payload[0];
		const listLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + listLength);
		const listBytes = this.payload.slice(2, 2 + listLength);
		// Parse all CC ids and commands
		let offset = 0;
		while (offset < listLength) {
			const { ccId, bytesRead } = parseCCId(listBytes, offset);
			const command = listBytes[offset + bytesRead];
			if (!this._commands.has(ccId)) this._commands.set(ccId, []);
			this._commands.get(ccId)!.push(command);
			offset += bytesRead + 1;
		}
	}

	public readonly groupId: number;

	private _commands = new Map<CommandClasses, number[]>();
	public get commands(): ReadonlyMap<CommandClasses, readonly number[]> {
		return this._commands;
	}
}

interface AssociationGroupInfoCCCommandListGetOptions extends CCCommandOptions {
	allowCache: boolean;
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.CommandListGet)
@expectedCCResponse(AssociationGroupInfoCCCommandListReport)
export class AssociationGroupInfoCCCommandListGet extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCCommandListGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.allowCache = options.allowCache;
			this.groupId = options.groupId;
		}
	}

	public allowCache: boolean;
	public groupId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.allowCache ? 0b1000_0000 : 0,
			this.groupId,
		]);
		return super.serialize();
	}
}
