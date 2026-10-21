import {
	CommandClasses,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	validatePayload,
} from "@zwave-js/core";
import {
	Bytes,
	type BytesView,
	stringToUint8ArrayUTF16BE,
	uint8ArrayToStringUTF16BE,
	escapeControlCharacters,
} from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";

import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type RefreshValuesContext,
	type RefreshValuesOptions,
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
import { NodeNamingAndLocationCommand } from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

export const NodeNamingAndLocationCCValues = V.defineCCValues(
	CommandClasses["Node Naming and Location"],
	{
		...V.staticProperty(
			"name",
			{
				...ValueMetadata.String,
				label: "Node name",
			},
			{ supportsEndpoints: false },
		),
		...V.staticProperty(
			"location",
			{
				...ValueMetadata.String,
				label: "Node location",
			},
			{ supportsEndpoints: false },
		),
	},
);

function isASCII(str: string): boolean {
	return /^[\x00-\x7F]*$/.test(str);
}

function decodeNodeTextPayload(raw: CCRaw): string {
	validatePayload(raw.payload.length >= 1);
	const encoding = raw.payload[0] === 2 ? "utf16le" : "ascii";
	const textBuffer = raw.payload.subarray(1);
	validatePayload(textBuffer.length <= 16);

	if (encoding === "utf16le") {
		validatePayload(textBuffer.length % 2 === 0);
		return escapeControlCharacters(uint8ArrayToStringUTF16BE(textBuffer));
	}

	return escapeControlCharacters(textBuffer.toString("ascii"));
}

function encodeNodeTextPayload(text: string): Bytes {
	const encoding = isASCII(text) ? "ascii" : "utf16le";
	let textBuffer: BytesView;
	if (encoding === "utf16le") {
		textBuffer = stringToUint8ArrayUTF16BE(text);
	} else {
		textBuffer = Bytes.from(text, "ascii");
	}

	// The length of this field MUST be in the range 1..16 bytes
	const textLength = Math.min(16, textBuffer.length);

	return Bytes.concat([
		[encoding === "ascii" ? 0x0 : 0x2],
		textBuffer.subarray(0, textLength),
	]);
}

@API(CommandClasses["Node Naming and Location"])
export class NodeNamingAndLocationCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: NodeNamingAndLocationCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case NodeNamingAndLocationCommand.NameGet:
			case NodeNamingAndLocationCommand.NameSet:
			case NodeNamingAndLocationCommand.LocationGet:
			case NodeNamingAndLocationCommand.LocationSet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function (
			this: NodeNamingAndLocationCCAPI,
			{ property },
			value,
		) {
			if (property !== "name" && property !== "location") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "string") {
				throwWrongValueType(
					this.ccId,
					property,
					"string",
					typeof value,
				);
			}

			switch (property) {
				case "name":
					return this.setName(value);
				case "location":
					return this.setLocation(value);
			}

			return undefined;
		};
	}

	protected override get [POLL_VALUE](): PollValueImplementation {
		return async function (this: NodeNamingAndLocationCCAPI, { property }) {
			switch (property) {
				case "name":
					return this.getName();
				case "location":
					return this.getLocation();
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public async getName(): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.NameGet,
		);

		const cc = new NodeNamingAndLocationCCNameGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<NodeNamingAndLocationCCNameReport>(
				cc,
				this.commandOptions,
			);
		return response?.name;
	}

	@validateArgs()
	public async setName(name: string): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.NameSet,
		);

		const cc = new NodeNamingAndLocationCCNameSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			name,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getLocation(): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.LocationGet,
		);

		const cc = new NodeNamingAndLocationCCLocationGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<NodeNamingAndLocationCCLocationReport>(
				cc,
				this.commandOptions,
			);
		return response?.location;
	}

	@validateArgs()
	public async setLocation(
		location: string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.LocationSet,
		);

		const cc = new NodeNamingAndLocationCCLocationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			location,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Node Naming and Location"])
@implementedVersion(1)
@ccValues(NodeNamingAndLocationCCValues)
export class NodeNamingAndLocationCC extends CommandClass {
	declare ccCommand: NodeNamingAndLocationCommand;

	public skipEndpointInterview(): boolean {
		// As the name says, this is for the node, not for endpoints
		return true;
	}

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(ctx, { tag: "interview" });

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
		options?: RefreshValuesOptions,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Node Naming and Location"],
			ctx,
			endpoint,
		).withOptions({
			priority: options?.priority ?? MessagePriority.NodeQuery,
			tag: options?.tag,
		});

		ctx.logNode(node.id, {
			message: "retrieving node name...",
			direction: "outbound",
		});
		const name = await api.getName();
		if (name != undefined) {
			ctx.logNode(node.id, {
				message: `is named "${name}"`,
				direction: "inbound",
			});
		}

		ctx.logNode(node.id, {
			message: "retrieving node location...",
			direction: "outbound",
		});
		const location = await api.getLocation();
		if (location != undefined) {
			ctx.logNode(node.id, {
				message: `received location: ${location}`,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface NodeNamingAndLocationCCNameSetOptions {
	name: string;
}

@CCCommand(NodeNamingAndLocationCommand.NameSet)
@useSupervision()
export class NodeNamingAndLocationCCNameSet extends NodeNamingAndLocationCC {
	public constructor(
		options: WithAddress<NodeNamingAndLocationCCNameSetOptions>,
	) {
		super(options);
		this.name = options.name;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): NodeNamingAndLocationCCNameSet {
		const name = decodeNodeTextPayload(raw);
		return new this({
			nodeId: ctx.sourceNodeId,
			name,
		});
	}

	public name: string;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeTextPayload(this.name);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { name: this.name },
		};
	}
}

// @publicAPI
export interface NodeNamingAndLocationCCNameReportOptions {
	name: string;
}

@CCCommand(NodeNamingAndLocationCommand.NameReport)
@ccValueProperty("name", NodeNamingAndLocationCCValues.name)
export class NodeNamingAndLocationCCNameReport extends NodeNamingAndLocationCC {
	public constructor(
		options: WithAddress<NodeNamingAndLocationCCNameReportOptions>,
	) {
		super(options);
		this.name = options.name;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): NodeNamingAndLocationCCNameReport {
		const name = decodeNodeTextPayload(raw);

		return new this({
			nodeId: ctx.sourceNodeId,
			name,
		});
	}

	public readonly name: string;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeTextPayload(this.name);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { name: this.name },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.NameGet)
@expectedCCResponse(NodeNamingAndLocationCCNameReport)
export class NodeNamingAndLocationCCNameGet extends NodeNamingAndLocationCC {}

// @publicAPI
export interface NodeNamingAndLocationCCLocationSetOptions {
	location: string;
}

@CCCommand(NodeNamingAndLocationCommand.LocationSet)
@useSupervision()
export class NodeNamingAndLocationCCLocationSet extends NodeNamingAndLocationCC {
	public constructor(
		options: WithAddress<NodeNamingAndLocationCCLocationSetOptions>,
	) {
		super(options);
		this.location = options.location;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): NodeNamingAndLocationCCLocationSet {
		const location = decodeNodeTextPayload(raw);
		return new this({
			nodeId: ctx.sourceNodeId,
			location,
		});
	}

	public location: string;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeTextPayload(this.location);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { location: this.location },
		};
	}
}

// @publicAPI
export interface NodeNamingAndLocationCCLocationReportOptions {
	location: string;
}

@CCCommand(NodeNamingAndLocationCommand.LocationReport)
@ccValueProperty("location", NodeNamingAndLocationCCValues.location)
export class NodeNamingAndLocationCCLocationReport extends NodeNamingAndLocationCC {
	public constructor(
		options: WithAddress<NodeNamingAndLocationCCLocationReportOptions>,
	) {
		super(options);
		this.location = options.location;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): NodeNamingAndLocationCCLocationReport {
		const location = decodeNodeTextPayload(raw);

		return new this({
			nodeId: ctx.sourceNodeId,
			location,
		});
	}

	public readonly location: string;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeTextPayload(this.location);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { location: this.location },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationGet)
@expectedCCResponse(NodeNamingAndLocationCCLocationReport)
export class NodeNamingAndLocationCCLocationGet extends NodeNamingAndLocationCC {}
