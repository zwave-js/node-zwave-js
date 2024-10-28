import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
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
} from "../lib/API";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type RefreshValuesContext,
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
import { V } from "../lib/Values";
import { NodeNamingAndLocationCommand } from "../lib/_Types";

export const NodeNamingAndLocationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Node Naming and Location"], {
		...V.staticProperty(
			"name",
			{
				...ValueMetadata.String,
				label: "Node name",
			} as const,
			{ supportsEndpoints: false },
		),

		...V.staticProperty(
			"location",
			{
				...ValueMetadata.String,
				label: "Node location",
			} as const,
			{ supportsEndpoints: false },
		),
	}),
});

function isASCII(str: string): boolean {
	return /^[\x00-\x7F]*$/.test(str);
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
		return async function(
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
		return async function(this: NodeNamingAndLocationCCAPI, { property }) {
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
		const response = await this.host.sendCommand<
			NodeNamingAndLocationCCNameReport
		>(
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
		const response = await this.host.sendCommand<
			NodeNamingAndLocationCCLocationReport
		>(
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

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
			CommandClasses["Node Naming and Location"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
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
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): NodeNamingAndLocationCCNameSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new NodeNamingAndLocationCCNameSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public name: string;

	public serialize(ctx: CCEncodingContext): Bytes {
		const encoding = isASCII(this.name) ? "ascii" : "utf16le";
		this.payload = new Bytes(
			1 + this.name.length * (encoding === "ascii" ? 1 : 2),
		);
		this.payload[0] = encoding === "ascii" ? 0x0 : 0x2;
		let nameAsBuffer = Bytes.from(this.name, encoding);
		if (encoding === "utf16le") {
			// Z-Wave expects UTF16 BE
			nameAsBuffer = nameAsBuffer.swap16();
		}
		// Copy at max 16 bytes
		nameAsBuffer.copy(
			this.payload,
			0,
			0,
			Math.min(16, nameAsBuffer.length),
		);
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
		validatePayload(raw.payload.length >= 1);
		const encoding = raw.payload[0] === 2 ? "utf16le" : "ascii";
		let nameBuffer = raw.payload.subarray(1);
		if (encoding === "utf16le") {
			validatePayload(nameBuffer.length % 2 === 0);
			// Z-Wave expects UTF16 BE
			nameBuffer = nameBuffer.swap16();
		}

		return new NodeNamingAndLocationCCNameReport({
			nodeId: ctx.sourceNodeId,
			name: nameBuffer.toString(encoding),
		});
	}

	@ccValue(NodeNamingAndLocationCCValues.name)
	public readonly name: string;

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
export class NodeNamingAndLocationCCLocationSet
	extends NodeNamingAndLocationCC
{
	public constructor(
		options: WithAddress<NodeNamingAndLocationCCLocationSetOptions>,
	) {
		super(options);
		this.location = options.location;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): NodeNamingAndLocationCCLocationSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new NodeNamingAndLocationCCLocationSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public location: string;

	public serialize(ctx: CCEncodingContext): Bytes {
		const encoding = isASCII(this.location) ? "ascii" : "utf16le";
		this.payload = new Bytes(
			1 + this.location.length * (encoding === "ascii" ? 1 : 2),
		);
		this.payload[0] = encoding === "ascii" ? 0x0 : 0x2;
		let locationAsBuffer = Bytes.from(this.location, encoding);
		if (encoding === "utf16le") {
			// Z-Wave expects UTF16 BE
			locationAsBuffer = locationAsBuffer.swap16();
		}
		// Copy at max 16 bytes
		locationAsBuffer.copy(
			this.payload,
			0,
			0,
			Math.min(16, locationAsBuffer.length),
		);
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
export class NodeNamingAndLocationCCLocationReport
	extends NodeNamingAndLocationCC
{
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
		validatePayload(raw.payload.length >= 1);
		const encoding = raw.payload[0] === 2 ? "utf16le" : "ascii";
		let locationBuffer = raw.payload.subarray(1);
		if (encoding === "utf16le") {
			validatePayload(locationBuffer.length % 2 === 0);
			// Z-Wave expects UTF16 BE
			locationBuffer = locationBuffer.swap16();
		}

		return new NodeNamingAndLocationCCLocationReport({
			nodeId: ctx.sourceNodeId,
			location: locationBuffer.toString(encoding),
		});
	}

	@ccValue(NodeNamingAndLocationCCValues.location)
	public readonly location: string;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { location: this.location },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationGet)
@expectedCCResponse(NodeNamingAndLocationCCLocationReport)
export class NodeNamingAndLocationCCLocationGet
	extends NodeNamingAndLocationCC
{}
