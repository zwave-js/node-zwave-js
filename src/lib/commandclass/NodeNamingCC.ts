import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

function isASCII(str: string): boolean {
	return /^[\x00-\x7F]*$/.test(str);
}

@API(CommandClasses["Node Naming and Location"])
export class NodeNamingAndLocationCCAPI extends CCAPI {
	public async getName(): Promise<string> {
		const cc = new NodeNamingAndLocationCCNameGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			NodeNamingAndLocationCCNameReport
		>(cc))!;
		return response.name;
	}

	public async setName(name: string): Promise<void> {
		const cc = new NodeNamingAndLocationCCNameSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			name,
		});
		await this.driver.sendCommand(cc);
	}

	public async getLocation(): Promise<string> {
		const cc = new NodeNamingAndLocationCCLocationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			NodeNamingAndLocationCCLocationReport
		>(cc))!;
		return response.location;
	}

	public async setLocation(location: string): Promise<void> {
		const cc = new NodeNamingAndLocationCCLocationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			location,
		});
		await this.driver.sendCommand(cc);
	}
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

export interface NodeNamingAndLocationCC {
	ccCommand: NodeNamingAndLocationCommand;
}

@commandClass(CommandClasses["Node Naming and Location"])
@implementedVersion(1)
export class NodeNamingAndLocationCC extends CommandClass {}

interface NodeNamingAndLocationCCNameSetOptions extends CCCommandOptions {
	name: string;
}

@CCCommand(NodeNamingAndLocationCommand.NameSet)
export class NodeNamingAndLocationCCNameSet extends NodeNamingAndLocationCC {
	public constructor(
		driver: IDriver,
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
}

@CCCommand(NodeNamingAndLocationCommand.NameReport)
export class NodeNamingAndLocationCCNameReport extends NodeNamingAndLocationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
		const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
		let nameBuffer = this.payload.slice(1);
		if (encoding === "utf16le") {
			// Z-Wave expects UTF16 BE
			nameBuffer = nameBuffer.swap16();
		}
		this._name = nameBuffer.toString(encoding);
	}

	private _name: string;
	public get name(): string {
		return this._name;
	}
}

@CCCommand(NodeNamingAndLocationCommand.NameGet)
@expectedCCResponse(NodeNamingAndLocationCCNameReport)
export class NodeNamingAndLocationCCNameGet extends NodeNamingAndLocationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

interface NodeNamingAndLocationCCLocationSetOptions extends CCCommandOptions {
	location: string;
}

@CCCommand(NodeNamingAndLocationCommand.LocationSet)
export class NodeNamingAndLocationCCLocationSet extends NodeNamingAndLocationCC {
	public constructor(
		driver: IDriver,
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
}

@CCCommand(NodeNamingAndLocationCommand.LocationReport)
export class NodeNamingAndLocationCCLocationReport extends NodeNamingAndLocationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
		const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
		let locationBuffer = this.payload.slice(1);
		if (encoding === "utf16le") {
			// Z-Wave expects UTF16 BE
			locationBuffer = locationBuffer.swap16();
		}
		this._location = locationBuffer.toString(encoding);
	}

	private _location: string;
	public get location(): string {
		return this._location;
	}
}

@CCCommand(NodeNamingAndLocationCommand.LocationGet)
@expectedCCResponse(NodeNamingAndLocationCCLocationReport)
export class NodeNamingAndLocationCCLocationGet extends NodeNamingAndLocationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
