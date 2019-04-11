import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { GenericDeviceClasses } from "../node/DeviceClass";
import {
	NodeInformationFrame,
	parseNodeInformationFrame,
} from "../node/NodeInfo";
import { encodeBitMask, parseBitMask } from "../values/Primitive";
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
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

export interface EndpointCapability extends NodeInformationFrame {
	isDynamic: boolean;
}

@commandClass(CommandClasses["Multi Channel"])
@implementedVersion(4)
@expectedCCResponse(CommandClasses["Multi Channel"])
export class MultiChannelCC extends CommandClass {
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultiChannelCommand.EndPointGet,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand:
			| MultiChannelCommand.CapabilityGet
			| MultiChannelCommand.AggregatedMembersGet,
		endpoint: number,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultiChannelCommand.EndPointFind,
		genericClass: GenericDeviceClasses,
		specificClass: number,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultiChannelCommand.CommandEncapsulation,
		encapsulatedCC: CommandClass,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: MultiChannelCommand,
		...args: any[]
	) {
		super(driver, nodeId, ccCommand);

		if (
			ccCommand === MultiChannelCommand.CapabilityGet ||
			ccCommand === MultiChannelCommand.AggregatedMembersGet
		) {
			this.endpoint = args[0];
		} else if (ccCommand === MultiChannelCommand.EndPointFind) {
			[this.genericClass, this.specificClass] = args;
		} else if (ccCommand === MultiChannelCommand.CommandEncapsulation) {
			this.encapsulatedCC = args[0];
		}
	}

	@ccValue() public isDynamicEndpointCount: boolean;
	@ccValue() public identicalCapabilities: boolean;
	@ccValue() public individualEndpointCount: number;
	@ccValue() public aggregatedEndpointCount: number;

	private _endpointCapabilities = new Map<number, EndpointCapability>();
	public get endpointCapabilities(): Map<number, EndpointCapability> {
		return this._endpointCapabilities;
	}

	public endpoint: number;
	public genericClass: GenericDeviceClasses;
	public specificClass: number;

	private _foundEndpoints: number[];
	public get foundEndpoints(): number[] {
		return this._foundEndpoints;
	}

	public sourceEndPoint: number;
	/** The destination end point (0-127) or an array of destination end points (1-7) */
	public destination: number | number[];

	public encapsulatedCC: CommandClass;

	private _aggregatedEndpointMembers: number[];
	public get aggregatedEndpointMembers(): number[] {
		return this._aggregatedEndpointMembers;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case MultiChannelCommand.EndPointGet:
				// no real payload
				break;

			case MultiChannelCommand.CapabilityGet:
				this.payload = Buffer.from([this.endpoint & 0b01111111]);
				break;

			case MultiChannelCommand.EndPointFind:
				this.payload = Buffer.from([
					this.genericClass,
					this.specificClass,
				]);
				break;

			case MultiChannelCommand.CommandEncapsulation: {
				const destination =
					typeof this.destination === "number"
						? // The destination is a single number
						  this.destination & 0b0111_1111
						: // The destination is a bit mask
						  encodeBitMask(this.destination, 7)[0] | 0b1000_0000;
				this.payload = Buffer.concat([
					Buffer.from([
						this.sourceEndPoint & 0b0111_1111,
						destination,
					]),
					this.encapsulatedCC.serializeForEncapsulation(),
				]);
				break;
			}

			case MultiChannelCommand.AggregatedMembersGet:
				this.payload = Buffer.from([this.endpoint & 0b0111_1111]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a MultiChannel CC with a command other than EndPointGet, CapabilityGet, AggregatedMembersGet or CommandEncapsulation",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case MultiChannelCommand.EndPointReport:
				this.isDynamicEndpointCount = !!(this.payload[0] & 0b10000000);
				this.identicalCapabilities = !!(this.payload[0] & 0b01000000);
				this.individualEndpointCount = this.payload[1] & 0b01111111;
				if (this.version >= 4) {
					this.aggregatedEndpointCount = this.payload[2] & 0b01111111;
				}
				break;

			case MultiChannelCommand.CapabilityReport: {
				const endpointIndex = this.payload[0] & 0b01111111;
				const capability: EndpointCapability = {
					isDynamic: !!(this.payload[0] & 0b10000000),
					...parseNodeInformationFrame(this.payload.slice(1)),
				};
				this._endpointCapabilities.set(endpointIndex, capability);
				break;
			}

			case MultiChannelCommand.EndPointFindReport: {
				const numReports = this.payload[0];
				this.genericClass = this.payload[1];
				this.specificClass = this.payload[2];
				this._foundEndpoints = [
					...this.payload.slice(3, 3 + numReports),
				].map(e => e & 0b01111111);
				break;
			}

			case MultiChannelCommand.CommandEncapsulation: {
				this.sourceEndPoint = this.payload[0] & 0b0111_1111;
				const isBitMask = !!(this.payload[1] & 0b1000_0000);
				const destination = this.payload[1] & 0b0111_1111;
				if (isBitMask) {
					this.destination = parseBitMask(Buffer.from([destination]));
				} else {
					this.destination = destination;
				}
				this.encapsulatedCC = CommandClass.fromEncapsulated(
					this.driver,
					this,
					this.payload.slice(2),
				);
				break;
			}

			case MultiChannelCommand.AggregatedMembersReport: {
				this.endpoint = this.payload[0] & 0b0111_1111;
				const bitMaskLength = this.payload[1];
				const bitMask = this.payload.slice(2, 2 + bitMaskLength);
				this._aggregatedEndpointMembers = parseBitMask(bitMask);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a MultiChannel CC with a command other than EndPointReport, CapabilityReport, EndPointFindReport, AggregatedMembersReport or CommandEncapsulation",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
