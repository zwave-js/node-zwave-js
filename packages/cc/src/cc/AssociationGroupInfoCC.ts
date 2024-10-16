import {
	CommandClasses,
	type EndpointId,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupportsCC,
	encodeCCId,
	getCCName,
	parseCCId,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	GetValueDB,
	ZWaveApplicationHost,
} from "@zwave-js/host/safe";
import { cpp2js, getEnumMemberName, num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	type CCNode,
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
					property === "issuedCommands"
					&& typeof propertyKey === "number",
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
			case AssociationGroupInfoCommand.NameReport:
			case AssociationGroupInfoCommand.InfoGet:
			case AssociationGroupInfoCommand.InfoReport:
			case AssociationGroupInfoCommand.CommandListGet:
			case AssociationGroupInfoCommand.CommandListReport:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	@validateArgs()
	public async getGroupName(groupId: number): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.NameGet,
		);

		const cc = new AssociationGroupInfoCCNameGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = await this.host.sendCommand<
			AssociationGroupInfoCCNameReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) return response.name;
	}

	@validateArgs()
	public async reportGroupName(groupId: number, name: string): Promise<void> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.NameReport,
		);

		const cc = new AssociationGroupInfoCCNameReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			name,
		});

		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getGroupInfo(groupId: number, refreshCache: boolean = false) {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.InfoGet,
		);

		const cc = new AssociationGroupInfoCCInfoGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			refreshCache,
		});
		const response = await this.host.sendCommand<
			AssociationGroupInfoCCInfoReport
		>(
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
	public async reportGroupInfo(
		options: AssociationGroupInfoCCInfoReportSpecificOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.InfoReport,
		);

		const cc = new AssociationGroupInfoCCInfoReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getCommands(
		groupId: number,
		allowCache: boolean = true,
	): Promise<
		MaybeNotKnown<AssociationGroupInfoCCCommandListReport["commands"]>
	> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.CommandListGet,
		);

		const cc = new AssociationGroupInfoCCCommandListGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			allowCache,
		});
		const response = await this.host.sendCommand<
			AssociationGroupInfoCCCommandListReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) return response.commands;
	}

	@validateArgs()
	public async reportCommands(
		groupId: number,
		commands: ReadonlyMap<CommandClasses, readonly number[]>,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.CommandListReport,
		);

		const cc = new AssociationGroupInfoCCCommandListReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			commands,
		});

		await this.host.sendCommand(cc, this.commandOptions);
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
		ctx: GetValueDB,
		endpoint: EndpointId,
		groupId: number,
	): MaybeNotKnown<string> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				AssociationGroupInfoCCValues.groupName(groupId).endpoint(
					endpoint.index,
				),
			);
	}

	/** Returns the association profile for an association group */
	public static getGroupProfileCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		groupId: number,
	): MaybeNotKnown<AssociationGroupInfoProfile> {
		return ctx.getValueDB(endpoint.nodeId).getValue<{
			profile: AssociationGroupInfoProfile;
		}>(
			AssociationGroupInfoCCValues.groupInfo(groupId).endpoint(
				endpoint.index,
			),
		)
			?.profile;
	}

	/** Returns the dictionary of all commands issued by the given association group */
	public static getIssuedCommandsCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		groupId: number,
	): MaybeNotKnown<ReadonlyMap<CommandClasses, readonly number[]>> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				AssociationGroupInfoCCValues.commands(groupId).endpoint(
					endpoint.index,
				),
			);
	}

	public static findGroupsForIssuedCommand(
		ctx: GetValueDB,
		endpoint: EndpointId & SupportsCC,
		ccId: CommandClasses,
		command: number,
	): number[] {
		const ret: number[] = [];
		const associationGroupCount = this.getAssociationGroupCountCached(
			ctx,
			endpoint,
		);
		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// Scan the issued commands of all groups if there's a match
			const issuedCommands = this.getIssuedCommandsCached(
				ctx,
				endpoint,
				groupId,
			);
			if (!issuedCommands) continue;
			if (
				issuedCommands.has(ccId)
				&& issuedCommands.get(ccId)!.includes(command)
			) {
				ret.push(groupId);
				continue;
			}
		}
		return ret;
	}

	private static getAssociationGroupCountCached(
		ctx: GetValueDB,
		endpoint: EndpointId & SupportsCC,
	): number {
		// The association group count is either determined by the
		// Association CC or the Multi Channel Association CC

		return (
			// First query the Multi Channel Association CC
			(endpoint.supportsCC(CommandClasses["Multi Channel Association"])
				&& MultiChannelAssociationCC.getGroupCountCached(
					ctx,
					endpoint,
				))
			// Then the Association CC
			|| (endpoint.supportsCC(CommandClasses.Association)
				&& AssociationCC.getGroupCountCached(ctx, endpoint))
			// And fall back to 0
			|| 0
		);
	}

	public async interview(
		applHost: ZWaveApplicationHost<CCNode>,
	): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Association Group Information"],
			applHost,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		applHost.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const associationGroupCount = AssociationGroupInfoCC
			.getAssociationGroupCountCached(
				applHost,
				endpoint,
			);

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// First get the group's name
			applHost.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Association group #${groupId}: Querying name...`,
				direction: "outbound",
			});
			const name = await api.getGroupName(groupId);
			if (name) {
				const logMessage =
					`Association group #${groupId} has name "${name}"`;
				applHost.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			// Then the command list
			applHost.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`Association group #${groupId}: Querying command list...`,
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

	public async refreshValues(
		applHost: ZWaveApplicationHost<CCNode>,
	): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Association Group Information"],
			applHost,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		// Query the information for each group (this is the only thing that could be dynamic)
		const associationGroupCount = AssociationGroupInfoCC
			.getAssociationGroupCountCached(
				applHost,
				endpoint,
			);
		const hasDynamicInfo = this.getValue<boolean>(
			applHost,
			AssociationGroupInfoCCValues.hasDynamicInfo,
		);

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// Then its information
			applHost.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Association group #${groupId}: Querying info...`,
				direction: "outbound",
			});
			const info = await api.getGroupInfo(groupId, !!hasDynamicInfo);
			if (info) {
				const logMessage =
					`Received info for association group #${groupId}:
info is dynamic: ${info.hasDynamicInfo}
profile:         ${
						getEnumMemberName(
							AssociationGroupInfoProfile,
							info.profile,
						)
					}`;
				applHost.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface AssociationGroupInfoCCNameReportOptions
	extends CCCommandOptions
{
	groupId: number;
	name: string;
}

@CCCommand(AssociationGroupInfoCommand.NameReport)
export class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCNameReportOptions,
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.groupId = this.payload[0];
			const nameLength = this.payload[1];
			validatePayload(this.payload.length >= 2 + nameLength);
			// The specs don't allow 0-terminated string, but some devices use them
			// So we need to cut them off
			this.name = cpp2js(
				this.payload.subarray(2, 2 + nameLength).toString("utf8"),
			);
		} else {
			this.groupId = options.groupId;
			this.name = options.name;
		}
	}

	public readonly groupId: number;
	public readonly name: string;

	public persistValues(applHost: ZWaveApplicationHost<CCNode>): boolean {
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

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.groupId, this.name.length]),
			Buffer.from(this.name, "utf8"),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				name: this.name,
			},
		};
	}
}

// @publicAPI
export interface AssociationGroupInfoCCNameGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.NameGet)
@expectedCCResponse(AssociationGroupInfoCCNameReport)
export class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCNameGetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.groupId = this.payload[0];
		} else {
			this.groupId = options.groupId;
		}
	}

	public groupId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.groupId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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

// @publicAPI
export interface AssociationGroupInfoCCInfoReportSpecificOptions {
	isListMode: boolean;
	hasDynamicInfo: boolean;
	groups: AssociationGroupInfo[];
}

@CCCommand(AssociationGroupInfoCommand.InfoReport)
export class AssociationGroupInfoCCInfoReport extends AssociationGroupInfoCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| (
				& AssociationGroupInfoCCInfoReportSpecificOptions
				& CCCommandOptions
			),
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
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
				const groupBytes = this.payload.subarray(offset, offset + 7);
				const groupId = groupBytes[0];
				const mode = 0; // groupBytes[1];
				const profile = groupBytes.readUInt16BE(2);
				const eventCode = 0; // groupBytes.readUInt16BE(5);
				_groups.push({ groupId, mode, profile, eventCode });
			}
			this.groups = _groups;
		} else {
			this.isListMode = options.isListMode;
			this.hasDynamicInfo = options.hasDynamicInfo;
			this.groups = options.groups;
		}
	}

	public readonly isListMode: boolean;

	@ccValue(AssociationGroupInfoCCValues.hasDynamicInfo)
	public readonly hasDynamicInfo: boolean;

	public readonly groups: readonly AssociationGroupInfo[];

	public persistValues(applHost: ZWaveApplicationHost<CCNode>): boolean {
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

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.alloc(1 + this.groups.length * 7, 0);

		this.payload[0] = (this.isListMode ? 0b1000_0000 : 0)
			| (this.hasDynamicInfo ? 0b0100_0000 : 0)
			| (this.groups.length & 0b0011_1111);

		for (let i = 0; i < this.groups.length; i++) {
			const offset = 1 + i * 7;
			this.payload[offset] = this.groups[i].groupId;
			this.payload.writeUint16BE(this.groups[i].profile, offset + 2);
			// The remaining bytes are zero
		}

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"is list mode": this.isListMode,
				"has dynamic info": this.hasDynamicInfo,
				groups: `${
					this.groups
						.map(
							(g) => `
· Group #${g.groupId}
  mode:       ${g.mode}
  profile:    ${g.profile}
  event code: ${g.eventCode}`,
						)
						.join("")
				}`,
			},
		};
	}
}

// @publicAPI
export type AssociationGroupInfoCCInfoGetOptions =
	& CCCommandOptions
	& {
		refreshCache: boolean;
	}
	& (
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
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCInfoGetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			const optionByte = this.payload[0];
			this.refreshCache = !!(optionByte & 0b1000_0000);
			this.listMode = !!(optionByte & 0b0100_0000);
			if (!this.listMode) {
				this.groupId = this.payload[1];
			}
		} else {
			this.refreshCache = options.refreshCache;
			if ("listMode" in options) this.listMode = options.listMode;
			if ("groupId" in options) this.groupId = options.groupId;
		}
	}

	public refreshCache: boolean;
	public listMode?: boolean;
	public groupId?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		const isListMode = this.listMode === true;
		const optionByte = (this.refreshCache ? 0b1000_0000 : 0)
			| (isListMode ? 0b0100_0000 : 0);
		this.payload = Buffer.from([
			optionByte,
			isListMode ? 0 : this.groupId!,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.groupId != undefined) {
			message["group id"] = this.groupId;
		}
		if (this.listMode != undefined) {
			message["list mode"] = this.listMode;
		}
		message["refresh cache"] = this.refreshCache;
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface AssociationGroupInfoCCCommandListReportOptions
	extends CCCommandOptions
{
	groupId: number;
	commands: ReadonlyMap<CommandClasses, readonly number[]>;
}

@CCCommand(AssociationGroupInfoCommand.CommandListReport)
export class AssociationGroupInfoCCCommandListReport
	extends AssociationGroupInfoCC
{
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCCommandListReportOptions,
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.groupId = this.payload[0];
			const listLength = this.payload[1];
			validatePayload(this.payload.length >= 2 + listLength);
			const listBytes = this.payload.subarray(2, 2 + listLength);
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
		} else {
			this.groupId = options.groupId;
			this.commands = options.commands;
		}
	}

	public readonly groupId: number;

	@ccValue(
		AssociationGroupInfoCCValues.commands,
		(self: AssociationGroupInfoCCCommandListReport) =>
			[self.groupId] as const,
	)
	public readonly commands: ReadonlyMap<CommandClasses, readonly number[]>;

	public serialize(ctx: CCEncodingContext): Buffer {
		// To make it easier to encode possible extended CCs, we first
		// allocate as much space as we may need, then trim it again
		this.payload = Buffer.allocUnsafe(2 + this.commands.size * 3);
		this.payload[0] = this.groupId;
		let offset = 2;
		for (const [ccId, commands] of this.commands) {
			for (const command of commands) {
				offset += encodeCCId(ccId, this.payload, offset);
				this.payload[offset] = command;
				offset++;
			}
		}
		this.payload[1] = offset - 2; // list length

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				commands: `${
					[...this.commands]
						.map(([cc, cmds]) => {
							return `\n· ${getCCName(cc)}: ${
								cmds
									.map((cmd) => num2hex(cmd))
									.join(", ")
							}`;
						})
						.join("")
				}`,
			},
		};
	}
}

// @publicAPI
export interface AssociationGroupInfoCCCommandListGetOptions
	extends CCCommandOptions
{
	allowCache: boolean;
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.CommandListGet)
@expectedCCResponse(AssociationGroupInfoCCCommandListReport)
export class AssociationGroupInfoCCCommandListGet
	extends AssociationGroupInfoCC
{
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCCommandListGetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.allowCache = !!(this.payload[0] & 0b1000_0000);
			this.groupId = this.payload[1];
		} else {
			this.allowCache = options.allowCache;
			this.groupId = options.groupId;
		}
	}

	public allowCache: boolean;
	public groupId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.allowCache ? 0b1000_0000 : 0,
			this.groupId,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				"allow cache": this.allowCache,
			},
		};
	}
}
