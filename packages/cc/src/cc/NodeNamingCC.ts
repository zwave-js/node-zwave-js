import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
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

		const cc = new NodeNamingAndLocationCCNameGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new NodeNamingAndLocationCCNameSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			name,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getLocation(): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.LocationGet,
		);

		const cc = new NodeNamingAndLocationCCLocationGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new NodeNamingAndLocationCCLocationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			location,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Node Naming and Location"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			message: "retrieving node name...",
			direction: "outbound",
		});
		const name = await api.getName();
		if (name != undefined) {
			applHost.controllerLog.logNode(node.id, {
				message: `is named "${name}"`,
				direction: "inbound",
			});
		}

		applHost.controllerLog.logNode(node.id, {
			message: "retrieving node location...",
			direction: "outbound",
		});
		const location = await api.getLocation();
		if (location != undefined) {
			applHost.controllerLog.logNode(node.id, {
				message: `received location: ${location}`,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface NodeNamingAndLocationCCNameSetOptions
	extends CCCommandOptions
{
	name: string;
}

@CCCommand(NodeNamingAndLocationCommand.NameSet)
@useSupervision()
export class NodeNamingAndLocationCCNameSet extends NodeNamingAndLocationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| NodeNamingAndLocationCCNameSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.name = options.name;
		}
	}

	public name: string;

	public serialize(): Buffer {
		const encoding = isASCII(this.name) ? "ascii" : "utf16le";
		this.payload = Buffer.allocUnsafe(
			1 + this.name.length * (encoding === "ascii" ? 1 : 2),
		);
		this.payload[0] = encoding === "ascii" ? 0x0 : 0x2;
		let nameAsBuffer = Buffer.from(this.name, encoding);
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
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { name: this.name },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.NameReport)
export class NodeNamingAndLocationCCNameReport extends NodeNamingAndLocationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);
		const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
		let nameBuffer = this.payload.subarray(1);
		if (encoding === "utf16le") {
			validatePayload(nameBuffer.length % 2 === 0);
			// Z-Wave expects UTF16 BE
			nameBuffer = nameBuffer.swap16();
		}
		this.name = nameBuffer.toString(encoding);
	}

	@ccValue(NodeNamingAndLocationCCValues.name)
	public readonly name: string;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { name: this.name },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.NameGet)
@expectedCCResponse(NodeNamingAndLocationCCNameReport)
export class NodeNamingAndLocationCCNameGet extends NodeNamingAndLocationCC {}

// @publicAPI
export interface NodeNamingAndLocationCCLocationSetOptions
	extends CCCommandOptions
{
	location: string;
}

@CCCommand(NodeNamingAndLocationCommand.LocationSet)
@useSupervision()
export class NodeNamingAndLocationCCLocationSet
	extends NodeNamingAndLocationCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| NodeNamingAndLocationCCLocationSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.location = options.location;
		}
	}

	public location: string;

	public serialize(): Buffer {
		const encoding = isASCII(this.location) ? "ascii" : "utf16le";
		this.payload = Buffer.allocUnsafe(
			1 + this.location.length * (encoding === "ascii" ? 1 : 2),
		);
		this.payload[0] = encoding === "ascii" ? 0x0 : 0x2;
		let locationAsBuffer = Buffer.from(this.location, encoding);
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
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { location: this.location },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationReport)
export class NodeNamingAndLocationCCLocationReport
	extends NodeNamingAndLocationCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);
		const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
		let locationBuffer = this.payload.subarray(1);
		if (encoding === "utf16le") {
			validatePayload(locationBuffer.length % 2 === 0);
			// Z-Wave expects UTF16 BE
			locationBuffer = locationBuffer.swap16();
		}
		this.location = locationBuffer.toString(encoding);
	}

	@ccValue(NodeNamingAndLocationCCValues.location)
	public readonly location: string;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { location: this.location },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationGet)
@expectedCCResponse(NodeNamingAndLocationCCLocationReport)
export class NodeNamingAndLocationCCLocationGet
	extends NodeNamingAndLocationCC
{}
