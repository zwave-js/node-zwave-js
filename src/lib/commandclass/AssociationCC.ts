import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import {
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
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum AssociationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Remove = 0x04,
	SupportedGroupingsGet = 0x05,
	SupportedGroupingsReport = 0x06,
	SpecificGroupGet = 0x0b,
	SpecificGroupReport = 0x0c,
}

export interface AssociationCC {
	ccCommand: AssociationCommand;
}

@commandClass(CommandClasses.Association)
@implementedVersion(1)
export class AssociationCC extends CommandClass {}

interface AssociationCCSetOptions extends CCCommandOptions {
	groupId: number;
	nodeIds: number[];
}

@CCCommand(AssociationCommand.Set)
export class AssociationCCSet extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | AssociationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// TODO: Validate! groupId >= 1, nodeIds 1..232
			this.groupId = options.groupId;
			this.nodeIds = options.nodeIds;
		}
	}

	public groupId: number;
	public nodeIds: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId, ...this.nodeIds]);
		return super.serialize();
	}
}

interface AssociationCCRemoveOptions extends CCCommandOptions {
	groupId: number;
	nodeIds?: number[];
}

@CCCommand(AssociationCommand.Remove)
export class AssociationCCRemove extends AssociationCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationCCRemoveOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// TODO: Validate! groupId >= 1, nodeIds 1..232
			this.groupId = options.groupId;
			this.nodeIds = options.nodeIds;
		}
	}

	public groupId: number;
	public nodeIds?: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId, ...(this.nodeIds || [])]);
		return super.serialize();
	}
}

@CCCommand(AssociationCommand.Report)
export class AssociationCCReport extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this._groupId = this.payload[0];
		this._maxNodes = this.payload[1];
		this._reportsToFollow = this.payload[2];
		this._nodeIds = [...this.payload.slice(3)];
	}

	private _groupId: number;
	public get groupId(): number {
		return this._groupId;
	}

	private _maxNodes: number;
	public get maxNodes(): number {
		return this._maxNodes;
	}

	private _nodeIds: number[];
	public get nodeIds(): readonly number[] {
		return this._nodeIds;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: AssociationCCReport[]): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map(report => report._nodeIds)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}
}

interface AssociationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationCommand.Get)
@expectedCCResponse(AssociationCCReport)
export class AssociationCCGet extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | AssociationCCGetOptions,
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

@CCCommand(AssociationCommand.SupportedGroupingsReport)
export class AssociationCCSupportedGroupingsReport extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._groupCount = this.payload[0];

		this.persistValues();
	}

	private _groupCount: number;
	@ccValue(true)
	public get groupCount(): number {
		return this._groupCount;
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(AssociationCCSupportedGroupingsReport)
export class AssociationCCSupportedGroupingsGet extends AssociationCC {}
