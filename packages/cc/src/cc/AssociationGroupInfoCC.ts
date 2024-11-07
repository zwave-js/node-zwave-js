import {
	CommandClasses,
	type EndpointId,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupportsCC,
	type WithAddress,
	encodeCCId,
	getCCName,
	parseCCId,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { cpp2js, getEnumMemberName, num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	AssociationGroupInfoCommand,
	AssociationGroupInfoProfile,
} from "../lib/_Types.js";
import { AssociationCC } from "./AssociationCC.js";
import { MultiChannelAssociationCC } from "./MultiChannelAssociationCC.js";

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
			endpointIndex: this.endpoint.index,
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
			endpointIndex: this.endpoint.index,
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
			endpointIndex: this.endpoint.index,
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
		options: AssociationGroupInfoCCInfoReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationGroupInfoCommand,
			AssociationGroupInfoCommand.InfoReport,
		);

		const cc = new AssociationGroupInfoCCInfoReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
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
			endpointIndex: this.endpoint.index,
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
			endpointIndex: this.endpoint.index,
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
			// And fall back to 0
			(endpoint.supportsCC(
				CommandClasses["Multi Channel Association"],
			)
				&& MultiChannelAssociationCC.getGroupCountCached(
					ctx,
					endpoint,
				))
			// Then the Association CC
			|| (endpoint.supportsCC(CommandClasses.Association)
				&& AssociationCC.getGroupCountCached(ctx, endpoint))
			|| 0
		);
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Association Group Information"],
			ctx,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const associationGroupCount = AssociationGroupInfoCC
			.getAssociationGroupCountCached(
				ctx,
				endpoint,
			);

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// First get the group's name
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Association group #${groupId}: Querying name...`,
				direction: "outbound",
			});
			const name = await api.getGroupName(groupId);
			if (name) {
				const logMessage =
					`Association group #${groupId} has name "${name}"`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			// Then the command list
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`Association group #${groupId}: Querying command list...`,
				direction: "outbound",
			});
			await api.getCommands(groupId);
			// Not sure how to log this
		}

		// Finally query each group for its information
		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Association Group Information"],
			ctx,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		// Query the information for each group (this is the only thing that could be dynamic)
		const associationGroupCount = AssociationGroupInfoCC
			.getAssociationGroupCountCached(
				ctx,
				endpoint,
			);
		const hasDynamicInfo = this.getValue<boolean>(
			ctx,
			AssociationGroupInfoCCValues.hasDynamicInfo,
		);

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			// Then its information
			ctx.logNode(node.id, {
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
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface AssociationGroupInfoCCNameReportOptions {
	groupId: number;
	name: string;
}

@CCCommand(AssociationGroupInfoCommand.NameReport)
export class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
	public constructor(
		options: WithAddress<AssociationGroupInfoCCNameReportOptions>,
	) {
		super(options);

		this.groupId = options.groupId;
		this.name = options.name;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationGroupInfoCCNameReport {
		validatePayload(raw.payload.length >= 2);
		const groupId = raw.payload[0];
		const nameLength = raw.payload[1];
		validatePayload(raw.payload.length >= 2 + nameLength);
		// The specs don't allow 0-terminated string, but some devices use them
		// So we need to cut them off
		const name = cpp2js(
			raw.payload.subarray(2, 2 + nameLength).toString("utf8"),
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
			name,
		});
	}

	public readonly groupId: number;
	public readonly name: string;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		const valueDB = this.getValueDB(ctx);

		valueDB.setValue(
			AssociationGroupInfoCCValues.groupName(this.groupId).endpoint(
				this.endpointIndex,
			),
			this.name,
		);

		return true;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([this.groupId, this.name.length]),
			Bytes.from(this.name, "utf8"),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
export interface AssociationGroupInfoCCNameGetOptions {
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.NameGet)
@expectedCCResponse(AssociationGroupInfoCCNameReport)
export class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
	public constructor(
		options: WithAddress<AssociationGroupInfoCCNameGetOptions>,
	) {
		super(options);
		this.groupId = options.groupId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationGroupInfoCCNameGet {
		validatePayload(raw.payload.length >= 1);
		const groupId = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
		});
	}

	public groupId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.groupId]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
export interface AssociationGroupInfoCCInfoReportOptions {
	isListMode: boolean;
	hasDynamicInfo: boolean;
	groups: AssociationGroupInfo[];
}

@CCCommand(AssociationGroupInfoCommand.InfoReport)
@ccValueProperty("hasDynamicInfo", AssociationGroupInfoCCValues.hasDynamicInfo)
export class AssociationGroupInfoCCInfoReport extends AssociationGroupInfoCC {
	public constructor(
		options: WithAddress<AssociationGroupInfoCCInfoReportOptions>,
	) {
		super(options);

		this.isListMode = options.isListMode;
		this.hasDynamicInfo = options.hasDynamicInfo;
		this.groups = options.groups;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationGroupInfoCCInfoReport {
		validatePayload(raw.payload.length >= 1);
		const isListMode = !!(raw.payload[0] & 0b1000_0000);
		const hasDynamicInfo = !!(raw.payload[0] & 0b0100_0000);
		const groupCount = raw.payload[0] & 0b0011_1111;
		// each group requires 7 bytes of payload
		validatePayload(raw.payload.length >= 1 + groupCount * 7);
		const groups: AssociationGroupInfo[] = [];
		for (let i = 0; i < groupCount; i++) {
			const offset = 1 + i * 7;
			// Parse the payload
			const groupBytes = raw.payload.subarray(offset, offset + 7);
			const groupId = groupBytes[0];
			const mode = 0; // groupBytes[1];
			const profile = groupBytes.readUInt16BE(2);
			const eventCode = 0; // groupBytes.readUInt16BE(5);
			groups.push({ groupId, mode, profile, eventCode });
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			isListMode,
			hasDynamicInfo,
			groups,
		});
	}

	public readonly isListMode: boolean;

	public readonly hasDynamicInfo: boolean;

	public readonly groups: readonly AssociationGroupInfo[];

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		for (const group of this.groups) {
			const { groupId, mode, profile, eventCode } = group;
			this.setValue(
				ctx,
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

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.alloc(1 + this.groups.length * 7, 0);

		this.payload[0] = (this.isListMode ? 0b1000_0000 : 0)
			| (this.hasDynamicInfo ? 0b0100_0000 : 0)
			| (this.groups.length & 0b0011_1111);

		for (let i = 0; i < this.groups.length; i++) {
			const offset = 1 + i * 7;
			this.payload[offset] = this.groups[i].groupId;
			this.payload.writeUInt16BE(this.groups[i].profile, offset + 2);
			// The remaining bytes are zero
		}

		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
		options: WithAddress<AssociationGroupInfoCCInfoGetOptions>,
	) {
		super(options);
		this.refreshCache = options.refreshCache;
		if ("listMode" in options) this.listMode = options.listMode;
		if ("groupId" in options) this.groupId = options.groupId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationGroupInfoCCInfoGet {
		validatePayload(raw.payload.length >= 2);
		const optionByte = raw.payload[0];
		const refreshCache = !!(optionByte & 0b1000_0000);
		const listMode: boolean | undefined = !!(optionByte & 0b0100_0000);
		let groupId: number | undefined;

		if (!listMode) {
			groupId = raw.payload[1];
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			refreshCache,
			listMode,
			groupId,
		});
	}

	public refreshCache: boolean;
	public listMode?: boolean;
	public groupId?: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		const isListMode = this.listMode === true;
		const optionByte = (this.refreshCache ? 0b1000_0000 : 0)
			| (isListMode ? 0b0100_0000 : 0);
		this.payload = Bytes.from([
			optionByte,
			isListMode ? 0 : this.groupId!,
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
export interface AssociationGroupInfoCCCommandListReportOptions {
	groupId: number;
	commands: ReadonlyMap<CommandClasses, readonly number[]>;
}

@CCCommand(AssociationGroupInfoCommand.CommandListReport)
@ccValueProperty(
	"commands",
	AssociationGroupInfoCCValues.commands,
	(self) => [self.groupId],
)
export class AssociationGroupInfoCCCommandListReport
	extends AssociationGroupInfoCC
{
	public constructor(
		options: WithAddress<AssociationGroupInfoCCCommandListReportOptions>,
	) {
		super(options);

		this.groupId = options.groupId;
		this.commands = options.commands;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationGroupInfoCCCommandListReport {
		validatePayload(raw.payload.length >= 2);
		const groupId = raw.payload[0];
		const listLength = raw.payload[1];
		validatePayload(raw.payload.length >= 2 + listLength);
		const listBytes = raw.payload.subarray(2, 2 + listLength);
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

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
			commands,
		});
	}

	public readonly groupId: number;

	public readonly commands: ReadonlyMap<CommandClasses, readonly number[]>;

	public serialize(ctx: CCEncodingContext): Bytes {
		// To make it easier to encode possible extended CCs, we first
		// allocate as much space as we may need, then trim it again
		this.payload = new Bytes(2 + this.commands.size * 3);
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

		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
export interface AssociationGroupInfoCCCommandListGetOptions {
	allowCache: boolean;
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.CommandListGet)
@expectedCCResponse(AssociationGroupInfoCCCommandListReport)
export class AssociationGroupInfoCCCommandListGet
	extends AssociationGroupInfoCC
{
	public constructor(
		options: WithAddress<AssociationGroupInfoCCCommandListGetOptions>,
	) {
		super(options);
		this.allowCache = options.allowCache;
		this.groupId = options.groupId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationGroupInfoCCCommandListGet {
		validatePayload(raw.payload.length >= 2);
		const allowCache = !!(raw.payload[0] & 0b1000_0000);
		const groupId = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			allowCache,
			groupId,
		});
	}

	public allowCache: boolean;
	public groupId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([
			this.allowCache ? 0b1000_0000 : 0,
			this.groupId,
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
