import {
	CommandClasses,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	parseCCId,
	validatePayload,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type MessageRecord,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { cpp2js, getEnumMemberName, num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	AssociationGroupInfoCommand,
	AssociationGroupInfoProfile,
} from "../lib/_Types";
import { AssociationCC } from "./AssociationCC";
import { MultiChannelAssociationCC } from "./MultiChannelAssociationCC";

export const AssociationGroupInfoCCValues = Object.freeze({
	// Defines values that do not depend on anything else
	...V.defineStaticCCValues(CommandClasses["Association Group Information"], {
		...V.staticProperty("hasDynamicInfo", undefined, { internal: true }),
	}),

	// Defines values that depend on one or more arguments and need to be called as a function
	...V.defineDynamicCCValues(
		CommandClasses["Association Group Information"],
		{
			...V.dynamicPropertyAndKeyWithName(
				"groupName",
				"name",
				(groupId: number) => groupId,
				({ property, propertyKey }) =>
					property === "name" && typeof propertyKey === "number",
				undefined,
				{ internal: true },
			),
			...V.dynamicPropertyAndKeyWithName(
				"groupInfo",
				"info",
				(groupId: number) => groupId,
				({ property, propertyKey }) =>
					property === "info" && typeof propertyKey === "number",
				undefined,
				{ internal: true },
			),
			...V.dynamicPropertyAndKeyWithName(
				"commands",
				"issuedCommands",
				(groupId: number) => groupId,
				({ property, propertyKey }) =>
					property === "issuedCommands" &&
					typeof propertyKey === "number",
				undefined,
				{ internal: true },
			),
		},
	),
});

// @noSetValueAPI This CC only has get-type commands

@API(CommandClasses["Association Group Information"])
export class AssociationGroupInfoCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: AssociationGroupInfoCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case AssociationGroupInfoCommand.NameGet:
			case AssociationGroupInfoCommand.InfoGet:
			case AssociationGroupInfoCommand.CommandListGet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	@validateArgs()
	public async getGroupName(groupId: number): Promise<string | undefined> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.NameGet,
		);

		const cc = new AssociationGroupInfoCCNameGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response =
			await this.applHost.sendCommand<AssociationGroupInfoCCNameReport>(
				cc,
				this.commandOptions,
			);
		if (response) return response.name;
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getGroupInfo(groupId: number, refreshCache: boolean = false) {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.InfoGet,
		);

		const cc = new AssociationGroupInfoCCInfoGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			refreshCache,
		});
		const response =
			await this.applHost.sendCommand<AssociationGroupInfoCCInfoReport>(
				cc,
				this.commandOptions,
			);
		// SDS13782 says: If List Mode is set to 0, the Group Count field MUST be set to 1.
		// But that's not always the case. Apparently some endpoints return 0 groups
		// although they support AGI CC
		if (response && response.groups.length > 0) {
			const { groupId: _, ...info } = response.groups[0];
			return {
				hasDynamicInfo: response.hasDynamicInfo,
				...info,
			};
		}
	}

	@validateArgs()
	public async getCommands(
		groupId: number,
		allowCache: boolean = true,
	): Promise<
		AssociationGroupInfoCCCommandListReport["commands"] | undefined
	> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.CommandListGet,
		);

		const cc = new AssociationGroupInfoCCCommandListGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			allowCache,
		});
		const response =
			await this.applHost.sendCommand<AssociationGroupInfoCCCommandListReport>(
				cc,
				this.commandOptions,
			);
		if (response) return response.commands;
	}
}

@commandClass(CommandClasses["Association Group Information"])
@implementedVersion(3)
@ccValues(AssociationGroupInfoCCValues)
export class AssociationGroupInfoCC extends CommandClass {
	declare ccCommand: AssociationGroupInfoCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// AssociationCC must be interviewed after Z-Wave+ if that is supported
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			CommandClasses["Multi Channel Association"],
		];
	}

	/** Returns the name of an association group */
	public static getGroupNameCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		groupId: number,
	): string | undefined {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				AssociationGroupInfoCCValues.groupName(groupId).endpoint(
					endpoint.index,
				),
			);
	}

	/** Returns the association profile for an association group */
	public static getGroupProfileCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		groupId: number,
	): AssociationGroupInfoProfile | undefined {
		return applHost.getValueDB(endpoint.nodeId).getValue<{
			profile: AssociationGroupInfoProfile;
		}>(AssociationGroupInfoCCValues.groupInfo(groupId).endpoint(endpoint.index))
			?.profile;
	}

	/** Returns the dictionary of all commands issued by the given association group */
	public static getIssuedCommandsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		groupId: number,
	): ReadonlyMap<CommandClasses, readonly number[]> | undefined {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				AssociationGroupInfoCCValues.commands(groupId).endpoint(
					endpoint.index,
				),
			);
	}

	public static findGroupsForIssuedCommand(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		ccId: CommandClasses,
		command: number,
	): number[] {
		const ret: number[] = [];
		const associationGroupCount = this.getAssociationGroupCountCached(
			applHost,
			endpoint,
		);
		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// Scan the issued commands of all groups if there's a match
			const issuedCommands = this.getIssuedCommandsCached(
				applHost,
				endpoint,
				groupId,
			);
			if (!issuedCommands) continue;
			if (
				issuedCommands.has(ccId) &&
				issuedCommands.get(ccId)!.includes(command)
			) {
				ret.push(groupId);
				continue;
			}
		}
		return ret;
	}

	private static getAssociationGroupCountCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		// The association group count is either determined by the
		// Association CC or the Multi Channel Association CC

		return (
			// First query the Multi Channel Association CC
			(endpoint.supportsCC(CommandClasses["Multi Channel Association"]) &&
				MultiChannelAssociationCC.getGroupCountCached(
					applHost,
					endpoint,
				)) ||
			// Then the Association CC
			(endpoint.supportsCC(CommandClasses.Association) &&
				AssociationCC.getGroupCountCached(applHost, endpoint)) ||
			// And fall back to 0
			0
		);
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Association Group Information"],
			applHost,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const associationGroupCount =
			AssociationGroupInfoCC.getAssociationGroupCountCached(
				applHost,
				endpoint,
			);

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// First get the group's name
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Association group #${groupId}: Querying name...`,
				direction: "outbound",
			});
			const name = await api.getGroupName(groupId);
			if (name) {
				const logMessage = `Association group #${groupId} has name "${name}"`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			// Then the command list
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Association group #${groupId}: Querying command list...`,
				direction: "outbound",
			});
			await api.getCommands(groupId);
			// Not sure how to log this
		}

		// Finally query each group for its information
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Association Group Information"],
			applHost,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		// Query the information for each group (this is the only thing that could be dynamic)
		const associationGroupCount =
			AssociationGroupInfoCC.getAssociationGroupCountCached(
				applHost,
				endpoint,
			);
		const hasDynamicInfo = this.getValue<boolean>(
			applHost,
			AssociationGroupInfoCCValues.hasDynamicInfo,
		);

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// Then its information
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Association group #${groupId}: Querying info...`,
				direction: "outbound",
			});
			const info = await api.getGroupInfo(groupId, !!hasDynamicInfo);
			if (info) {
				const logMessage = `Received info for association group #${groupId}:
info is dynamic: ${info.hasDynamicInfo}
profile:         ${getEnumMemberName(
					AssociationGroupInfoProfile,
					info.profile,
				)}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}
@CCCommand(AssociationGroupInfoCommand.NameReport)
export class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this.groupId = this.payload[0];
		const nameLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + nameLength);
		// The specs don't allow 0-terminated string, but some devices use them
		// So we need to cut them off
		this.name = cpp2js(
			this.payload.slice(2, 2 + nameLength).toString("utf8"),
		);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		valueDB.setValue(
			AssociationGroupInfoCCValues.groupName(this.groupId).endpoint(
				this.endpointIndex,
			),
			this.name,
		);

		return true;
	}

	public readonly groupId: number;
	public readonly name: string;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				name: this.name,
			},
		};
	}
}

interface AssociationGroupInfoCCNameGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.NameGet)
@expectedCCResponse(AssociationGroupInfoCCNameReport)
export class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCNameGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "group id": this.groupId },
		};
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.isListMode = !!(this.payload[0] & 0b1000_0000);
		this.hasDynamicInfo = !!(this.payload[0] & 0b0100_0000);

		const groupCount = this.payload[0] & 0b0011_1111;
		// each group requires 7 bytes of payload
		validatePayload(this.payload.length >= 1 + groupCount * 7);
		const _groups: AssociationGroupInfo[] = [];
		for (let i = 0; i < groupCount; i++) {
			const offset = 1 + i * 7;
			// Parse the payload
			const groupBytes = this.payload.slice(offset, offset + 7);
			const groupId = groupBytes[0];
			const mode = 0; //groupBytes[1];
			const profile = groupBytes.readUInt16BE(2);
			const eventCode = 0; // groupBytes.readUInt16BE(5);
			_groups.push({ groupId, mode, profile, eventCode });
		}
		this.groups = _groups;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		for (const group of this.groups) {
			const { groupId, mode, profile, eventCode } = group;
			this.setValue(
				applHost,
				AssociationGroupInfoCCValues.groupInfo(groupId),
				{
					mode,
					profile,
					eventCode,
				},
			);
		}
		return true;
	}

	public readonly isListMode: boolean;

	@ccValue(AssociationGroupInfoCCValues.hasDynamicInfo)
	public readonly hasDynamicInfo: boolean;

	public readonly groups: readonly AssociationGroupInfo[];

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"is list mode": this.isListMode,
				"has dynamic info": this.hasDynamicInfo,
				groups: `${this.groups
					.map(
						(g) => `
· Group #${g.groupId}
  mode:       ${g.mode}
  profile:    ${g.profile}
  event code: ${g.eventCode}`,
					)
					.join("")}`,
			},
		};
	}
}

type AssociationGroupInfoCCInfoGetOptions = CCCommandOptions & {
	refreshCache: boolean;
} & (
		| {
				listMode: boolean;
		  }
		| {
				groupId: number;
		  }
	);

@CCCommand(AssociationGroupInfoCommand.InfoGet)
@expectedCCResponse(AssociationGroupInfoCCInfoReport)
export class AssociationGroupInfoCCInfoGet extends AssociationGroupInfoCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCInfoGetOptions,
	) {
		super(host, options);
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
			isListMode ? 0 : this.groupId!,
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.groupId != undefined) {
			message["group id"] = this.groupId;
		}
		if (this.listMode != undefined) {
			message["list mode"] = this.listMode;
		}
		message["refresh cache"] = this.refreshCache;
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(AssociationGroupInfoCommand.CommandListReport)
export class AssociationGroupInfoCCCommandListReport extends AssociationGroupInfoCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this.groupId = this.payload[0];
		const listLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + listLength);
		const listBytes = this.payload.slice(2, 2 + listLength);
		// Parse all CC ids and commands
		let offset = 0;
		const commands = new Map<CommandClasses, number[]>();
		while (offset < listLength) {
			const { ccId, bytesRead } = parseCCId(listBytes, offset);
			const command = listBytes[offset + bytesRead];
			if (!commands.has(ccId)) commands.set(ccId, []);
			commands.get(ccId)!.push(command);
			offset += bytesRead + 1;
		}

		this.commands = commands;
	}

	public readonly groupId: number;

	@ccValue(
		AssociationGroupInfoCCValues.commands,
		(self: AssociationGroupInfoCCCommandListReport) =>
			[self.groupId] as const,
	)
	public readonly commands: ReadonlyMap<CommandClasses, readonly number[]>;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				commands: `${[...this.commands]
					.map(([cc, cmds]) => {
						return `\n· ${getCCName(cc)}: ${cmds
							.map((cmd) => num2hex(cmd))
							.join(", ")}`;
					})
					.join("")}`,
			},
		};
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCCommandListGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				"allow cache": this.allowCache,
			},
		};
	}
}
