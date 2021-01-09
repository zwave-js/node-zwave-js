import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	PhysicalCCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
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

function isASCII(str: string): boolean {
	return /^[\x00-\x7F]*$/.test(str);
}

// All the supported commands
export enum NodeNamingAndLocationCommand {
	NameSet = 0x01,
	NameGet = 0x02,
	NameReport = 0x03,
	LocationSet = 0x04,
	LocationGet = 0x05,
	LocationReport = 0x06,
}

export function getNodeNameValueId(): ValueID {
	return {
		commandClass: CommandClasses["Node Naming and Location"],
		property: "name",
	};
}

export function getNodeLocationValueId(): ValueID {
	return {
		commandClass: CommandClasses["Node Naming and Location"],
		property: "location",
	};
}

@API(CommandClasses["Node Naming and Location"])
export class NodeNamingAndLocationCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: NodeNamingAndLocationCommand): Maybe<boolean> {
		switch (cmd) {
			case NodeNamingAndLocationCommand.NameGet:
			case NodeNamingAndLocationCommand.LocationGet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "name" && property !== "location") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "string") {
			throwWrongValueType(this.ccId, property, "string", typeof value);
		}

		switch (property) {
			case "name":
				await this.setName(value);
				// Refresh the current value
				await this.getName();
				break;
			case "location":
				await this.setLocation(value);
				// Refresh the current value
				await this.getLocation();
		}
	};

	public async getName(): Promise<string> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.NameGet,
		);

		const cc = new NodeNamingAndLocationCCNameGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<NodeNamingAndLocationCCNameReport>(
			cc,
			this.commandOptions,
		))!;
		return response.name;
	}

	public async setName(name: string): Promise<void> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.NameSet,
		);

		const cc = new NodeNamingAndLocationCCNameSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			name,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getLocation(): Promise<string> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.LocationGet,
		);

		const cc = new NodeNamingAndLocationCCLocationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<NodeNamingAndLocationCCLocationReport>(
			cc,
			this.commandOptions,
		))!;
		return response.location;
	}

	public async setLocation(location: string): Promise<void> {
		this.assertSupportsCommand(
			NodeNamingAndLocationCommand,
			NodeNamingAndLocationCommand.LocationSet,
		);

		const cc = new NodeNamingAndLocationCCLocationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			location,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Node Naming and Location"])
@implementedVersion(1)
export class NodeNamingAndLocationCC extends CommandClass {
	declare ccCommand: NodeNamingAndLocationCommand;

	public skipEndpointInterview(): boolean {
		// As the name says, this is for the node, not for endpoints
		return true;
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses[
			"Node Naming and Location"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		this.driver.controllerLog.logNode(node.id, {
			message: "retrieving node name...",
			direction: "outbound",
		});
		const name = await api.getName();
		this.driver.controllerLog.logNode(node.id, {
			message: `is named "${name}"`,
			direction: "inbound",
		});

		this.driver.controllerLog.logNode(node.id, {
			message: "retrieving node location...",
			direction: "outbound",
		});
		const location = await api.getLocation();
		this.driver.controllerLog.logNode(node.id, {
			message: `received location: ${location}`,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface NodeNamingAndLocationCCNameSetOptions extends CCCommandOptions {
	name: string;
}

@CCCommand(NodeNamingAndLocationCommand.NameSet)
export class NodeNamingAndLocationCCNameSet extends NodeNamingAndLocationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| NodeNamingAndLocationCCNameSetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { name: this.name },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.NameReport)
export class NodeNamingAndLocationCCNameReport extends NodeNamingAndLocationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
		const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
		let nameBuffer = this.payload.slice(1);
		if (encoding === "utf16le") {
			// Z-Wave expects UTF16 BE
			nameBuffer = nameBuffer.swap16();
		}
		this.name = nameBuffer.toString(encoding);
		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly name: string;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { name: this.name },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.NameGet)
@expectedCCResponse(NodeNamingAndLocationCCNameReport)
export class NodeNamingAndLocationCCNameGet extends NodeNamingAndLocationCC {}

interface NodeNamingAndLocationCCLocationSetOptions extends CCCommandOptions {
	location: string;
}

@CCCommand(NodeNamingAndLocationCommand.LocationSet)
export class NodeNamingAndLocationCCLocationSet extends NodeNamingAndLocationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| NodeNamingAndLocationCCLocationSetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { location: this.location },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationReport)
export class NodeNamingAndLocationCCLocationReport extends NodeNamingAndLocationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
		const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
		let locationBuffer = this.payload.slice(1);
		if (encoding === "utf16le") {
			// Z-Wave expects UTF16 BE
			locationBuffer = locationBuffer.swap16();
		}
		this.location = locationBuffer.toString(encoding);
		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly location: string;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { location: this.location },
		};
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationGet)
@expectedCCResponse(NodeNamingAndLocationCCLocationReport)
export class NodeNamingAndLocationCCLocationGet extends NodeNamingAndLocationCC {}
