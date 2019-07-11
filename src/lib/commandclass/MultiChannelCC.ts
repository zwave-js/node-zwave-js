import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { MessagePriority } from "../message/Constants";
import { GenericDeviceClasses } from "../node/DeviceClass";
import {
	NodeInformationFrame,
	parseNodeInformationFrame,
} from "../node/NodeInfo";
import { validatePayload } from "../util/misc";
import { encodeBitMask, parseBitMask } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum MultiChannelCommand {
	EndPointGet = 0x07,
	EndPointReport = 0x08,
	CapabilityGet = 0x09,
	CapabilityReport = 0x0a,
	EndPointFind = 0x0b,
	EndPointFindReport = 0x0c,
	CommandEncapsulation = 0x0d,
	AggregatedMembersGet = 0x0e,
	AggregatedMembersReport = 0x0f,
}

// TODO: Implement querying all endpoints
// TODO: Implement removal reports of dynamic endpoints

@API(CommandClasses["Multi Channel"])
export class MultiChannelCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getEndpoints() {
		const cc = new MultiChannelCCEndPointGet(this.driver, {
			nodeId: this.node.id,
		});
		const response = (await this.driver.sendCommand<
			MultiChannelCCEndPointReport
		>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return {
			isDynamicEndpointCount: response.isDynamicEndpointCount,
			identicalCapabilities: response.identicalCapabilities,
			individualEndpointCount: response.individualEndpointCount,
			aggregatedEndpointCount: response.aggregatedEndpointCount,
		};
	}

	public async getEndpointCapabilities(
		endpoint: number,
	): Promise<EndpointCapability> {
		const cc = new MultiChannelCCCapabilityGet(this.driver, {
			nodeId: this.node.id,
			endpoint,
		});
		const response = (await this.driver.sendCommand<
			MultiChannelCCCapabilityReport
		>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return response.capability;
	}

	public async findEndpoints(
		genericClass: GenericDeviceClasses,
		specificClass: number,
	): Promise<readonly number[]> {
		const cc = new MultiChannelCCEndPointFind(this.driver, {
			nodeId: this.node.id,
			genericClass,
			specificClass,
		});
		const response = (await this.driver.sendCommand<
			MultiChannelCCEndPointFindReport
		>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return response.foundEndpoints;
	}

	public async getAggregatedMembers(
		endpoint: number,
	): Promise<readonly number[]> {
		const cc = new MultiChannelCCAggregatedMembersGet(this.driver, {
			nodeId: this.node.id,
			endpoint,
		});
		const response = (await this.driver.sendCommand<
			MultiChannelCCAggregatedMembersReport
		>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return response.members;
	}

	public async sendEncapsulated(
		options: Omit<
			MultiChannelCCCommandEncapsulationOptions,
			keyof CCCommandOptions
		>,
	): Promise<void> {
		const cc = new MultiChannelCCCommandEncapsulation(this.driver, {
			nodeId: this.node.id,
			...options,
		});
		await this.driver.sendCommand(cc);
	}
}

export interface EndpointCapability extends NodeInformationFrame {
	isDynamic: boolean;
}

@commandClass(CommandClasses["Multi Channel"])
@implementedVersion(4)
export class MultiChannelCC extends CommandClass {
	public ccCommand!: MultiChannelCommand;
}

@CCCommand(MultiChannelCommand.EndPointReport)
export class MultiChannelCCEndPointReport extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._isDynamicEndpointCount = !!(this.payload[0] & 0b10000000);
		this._identicalCapabilities = !!(this.payload[0] & 0b01000000);
		this._individualEndpointCount = this.payload[1] & 0b01111111;
		if (this.version >= 4 && this.payload.length >= 3) {
			this._aggregatedEndpointCount = this.payload[2] & 0b01111111;
		}
		this.persistValues();
	}

	private _isDynamicEndpointCount: boolean;
	public get isDynamicEndpointCount(): boolean {
		return this._isDynamicEndpointCount;
	}
	private _identicalCapabilities: boolean;
	public get identicalCapabilities(): boolean {
		return this._identicalCapabilities;
	}
	private _individualEndpointCount: number;
	public get individualEndpointCount(): number {
		return this._individualEndpointCount;
	}
	private _aggregatedEndpointCount: number | undefined;
	public get aggregatedEndpointCount(): number | undefined {
		return this._aggregatedEndpointCount;
	}
}

@CCCommand(MultiChannelCommand.EndPointGet)
@expectedCCResponse(MultiChannelCCEndPointReport)
export class MultiChannelCCEndPointGet extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(MultiChannelCommand.CapabilityReport)
export class MultiChannelCCCapabilityReport extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		// Only validate the bytes we expect to see here
		// parseNodeInformationFrame does its own validation
		validatePayload(this.payload.length >= 1);
		const endpointIndex = this.payload[0] & 0b01111111;
		const capability = {
			isDynamic: !!(this.payload[0] & 0b10000000),
			...parseNodeInformationFrame(this.payload.slice(1)),
		};
		this.capabilities = [endpointIndex, capability];
		this.persistValues();
	}

	@ccKeyValuePair()
	private capabilities: [number, EndpointCapability];

	public get endpointIndex(): number {
		return this.capabilities[0];
	}

	public get capability(): EndpointCapability {
		return this.capabilities[1];
	}
}

interface MultiChannelCCCapabilityGetOptions extends CCCommandOptions {
	endpoint: number;
}

@CCCommand(MultiChannelCommand.CapabilityGet)
@expectedCCResponse(MultiChannelCCCapabilityReport)
export class MultiChannelCCCapabilityGet extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCCapabilityGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this._endpoint = options.endpoint;
		}
	}

	private _endpoint: number;
	public get endpoint(): number {
		return this._endpoint;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.endpoint & 0b01111111]);
		return super.serialize();
	}
}

@CCCommand(MultiChannelCommand.EndPointFindReport)
export class MultiChannelCCEndPointFindReport extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		const numReports = this.payload[0];
		this._genericClass = this.payload[1];
		this._specificClass = this.payload[2];

		validatePayload(this.payload.length >= 3 + numReports);
		this._foundEndpoints = [...this.payload.slice(3, 3 + numReports)].map(
			e => e & 0b01111111,
		);
	}

	private _genericClass: GenericDeviceClasses;
	public get genericClass(): GenericDeviceClasses {
		return this._genericClass;
	}
	private _specificClass: number;
	public get specificClass(): number {
		return this._specificClass;
	}

	private _foundEndpoints: number[];
	public get foundEndpoints(): readonly number[] {
		return this._foundEndpoints;
	}
}

interface MultiChannelCCEndPointFindOptions extends CCCommandOptions {
	genericClass: GenericDeviceClasses;
	specificClass: number;
}

@CCCommand(MultiChannelCommand.EndPointFind)
@expectedCCResponse(MultiChannelCCEndPointFindReport)
export class MultiChannelCCEndPointFind extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCEndPointFindOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.genericClass = options.genericClass;
			this.specificClass = options.specificClass;
		}
	}

	public genericClass: GenericDeviceClasses;
	public specificClass: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.genericClass, this.specificClass]);
		return super.serialize();
	}
}

@CCCommand(MultiChannelCommand.AggregatedMembersReport)
export class MultiChannelCCAggregatedMembersReport extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		const endpoint = this.payload[0] & 0b0111_1111;
		const bitMaskLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + bitMaskLength);
		const bitMask = this.payload.slice(2, 2 + bitMaskLength);
		const members = parseBitMask(bitMask);
		this.aggregatedEndpointMembers = [endpoint, members];
	}

	@ccKeyValuePair()
	private aggregatedEndpointMembers: [number, number[]];

	public get endpoint(): number {
		return this.aggregatedEndpointMembers[0];
	}

	public get members(): readonly number[] {
		return this.aggregatedEndpointMembers[1];
	}
}

interface MultiChannelCCAggregatedMembersGetOptions extends CCCommandOptions {
	endpoint: number;
}

@CCCommand(MultiChannelCommand.AggregatedMembersGet)
@expectedCCResponse(MultiChannelCCAggregatedMembersReport)
export class MultiChannelCCAggregatedMembersGet extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCAggregatedMembersGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.endpoint = options.endpoint;
		}
	}

	public endpoint: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.endpoint & 0b0111_1111]);
		return super.serialize();
	}
}

type MultiChannelCCDestination = number | (1 | 2 | 3 | 4 | 5 | 6 | 7)[];

interface MultiChannelCCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulatedCC: CommandClass;
	sourceEndPoint: number;
	destination: MultiChannelCCDestination;
}

@CCCommand(MultiChannelCommand.CommandEncapsulation)
// TODO: This probably expects multiple responses
export class MultiChannelCCCommandEncapsulation extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCCommandEncapsulationOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.sourceEndPoint = this.payload[0] & 0b0111_1111;
			const isBitMask = !!(this.payload[1] & 0b1000_0000);
			const destination = this.payload[1] & 0b0111_1111;
			if (isBitMask) {
				this.destination = parseBitMask(
					Buffer.from([destination]),
				) as any;
			} else {
				this.destination = destination;
			}
			// No need to validate further, each CC does it for itself
			this.encapsulatedCC = CommandClass.fromEncapsulated(
				this.driver,
				this,
				this.payload.slice(2),
			);
		} else {
			this.encapsulatedCC = options.encapsulatedCC;
			this.sourceEndPoint = options.sourceEndPoint;
			this.destination = options.destination;
		}
	}

	public encapsulatedCC: CommandClass;
	public sourceEndPoint: number;
	/** The destination end point (0-127) or an array of destination end points (1-7) */
	public destination: MultiChannelCCDestination;

	public serialize(): Buffer {
		const destination =
			typeof this.destination === "number"
				? // The destination is a single number
				  this.destination & 0b0111_1111
				: // The destination is a bit mask
				  encodeBitMask(this.destination, 7)[0] | 0b1000_0000;
		this.payload = Buffer.concat([
			Buffer.from([this.sourceEndPoint & 0b0111_1111, destination]),
			this.encapsulatedCC.serializeForEncapsulation(),
		]);
		return super.serialize();
	}
}
