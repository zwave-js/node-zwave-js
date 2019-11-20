import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { MessagePriority } from "../message/Constants";
import { GenericDeviceClasses } from "../node/DeviceClass";
import {
	NodeInformationFrame,
	parseNodeInformationFrame,
} from "../node/NodeInfo";
import { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { encodeBitMask, Maybe, parseBitMask } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	DynamicCCResponse,
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

// TODO: Handle removal reports of dynamic endpoints

// @noSetValueAPI

export function getEndpointCCsValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		endpoint: endpointIndex,
		property: "commandClasses",
	};
}

@API(CommandClasses["Multi Channel"])
export class MultiChannelCCAPI extends CCAPI {
	public supportsCommand(cmd: MultiChannelCommand): Maybe<boolean> {
		switch (cmd) {
			// We don't know what's supported in V2
			case MultiChannelCommand.EndPointGet:
			case MultiChannelCommand.CapabilityGet:
			case MultiChannelCommand.EndPointFind:
			case MultiChannelCommand.CommandEncapsulation:
				return this.version >= 3;
			case MultiChannelCommand.AggregatedMembersGet:
				return this.version >= 4;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getEndpoints() {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.EndPointGet,
		);

		const cc = new MultiChannelCCEndPointGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			MultiChannelCCEndPointReport
		>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return {
			isDynamicEndpointCount: response.countIsDynamic,
			identicalCapabilities: response.identicalCapabilities,
			individualEndpointCount: response.individualCount,
			aggregatedEndpointCount: response.aggregatedCount,
		};
	}

	public async getEndpointCapabilities(
		endpoint: number,
	): Promise<EndpointCapability> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CapabilityGet,
		);

		const cc = new MultiChannelCCCapabilityGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedEndpoint: endpoint,
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
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.EndPointFind,
		);

		const cc = new MultiChannelCCEndPointFind(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
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
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.AggregatedMembersGet,
		);

		const cc = new MultiChannelCCAggregatedMembersGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedEndpoint: endpoint,
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
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CommandEncapsulation,
		);

		const cc = new MultiChannelCCCommandEncapsulation(this.driver, {
			nodeId: this.endpoint.nodeId,
			...options,
		});
		await this.driver.sendCommand(cc);
	}
}

export interface EndpointCapability extends NodeInformationFrame {
	isDynamic: boolean;
	wasRemoved: boolean;
}

@commandClass(CommandClasses["Multi Channel"])
@implementedVersion(4)
export class MultiChannelCC extends CommandClass {
	declare ccCommand: MultiChannelCommand;

	public constructor(driver: IDriver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(getEndpointCCsValueId(0).property as any, true);
	}

	/** Tests if a command targets a specific endpoint and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			cc.endpointIndex !== 0 &&
			!(cc instanceof MultiChannelCCCommandEncapsulation)
		);
	}

	/** Encapsulates a command that targets a specific endpoint */
	public static encapsulate(
		driver: IDriver,
		cc: CommandClass,
	): MultiChannelCCCommandEncapsulation {
		return new MultiChannelCCCommandEncapsulation(driver, {
			nodeId: cc.nodeId,
			encapsulated: cc,
			destination: cc.endpointIndex,
		});
	}

	/** Unwraps a multi channel encapsulated command */
	public static unwrap(cc: MultiChannelCCCommandEncapsulation): CommandClass {
		return cc.encapsulated;
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const api = node.getEndpoint(this.endpointIndex)!.commandClasses[
			"Multi Channel"
		];

		// Step 1: Retrieve general information about end points
		log.controller.logNode(node.id, {
			message: "querying device endpoint information...",
			direction: "outbound",
		});
		const multiResponse = await api.getEndpoints();

		let logMessage = `received response for device endpoints:
endpoint count (individual): ${multiResponse.individualEndpointCount}
count is dynamic:            ${multiResponse.isDynamicEndpointCount}
identical capabilities:      ${multiResponse.identicalCapabilities}`;
		if (multiResponse.aggregatedEndpointCount != undefined) {
			logMessage += `\nendpoint count (aggregated): ${multiResponse.aggregatedEndpointCount}`;
		}
		log.controller.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Step 2: Find all endpoints
		log.controller.logNode(node.id, {
			message: "querying all endpoints...",
			direction: "outbound",
		});
		const foundEndpoints = [...(await api.findEndpoints(0xff, 0xff))];
		if (!foundEndpoints.length) {
			log.controller.logNode(node.id, {
				message: `Endpoint query returned no results, assuming that endpoints are sequential`,
				direction: "inbound",
			});
			// Create a sequential list of endpoints
			for (
				let i = 1;
				i <=
				multiResponse.individualEndpointCount +
					(multiResponse.aggregatedEndpointCount ?? 0);
				i++
			) {
				foundEndpoints.push(i);
			}
		} else {
			log.controller.logNode(node.id, {
				message: `received endpoints: ${foundEndpoints
					.map(String)
					.join(", ")}`,
				direction: "inbound",
			});
		}

		// Step 3: Query endpoints
		for (const endpoint of foundEndpoints) {
			if (
				endpoint > multiResponse.individualEndpointCount &&
				this.version >= 4
			) {
				// Find members of aggregated end point
				log.controller.logNode(node.id, {
					message: `querying members of aggregated endpoint #${endpoint}...`,
					direction: "outbound",
				});
				const members = await api.getAggregatedMembers(endpoint);
				log.controller.logNode(node.id, {
					message: `aggregated endpoint #${endpoint} has members ${members
						.map(String)
						.join(", ")}`,
					direction: "inbound",
				});
			}

			// TODO: When security is implemented, we need to change stuff here
			log.controller.logNode(node.id, {
				message: `querying capabilities for endpoint #${endpoint}...`,
				direction: "outbound",
			});
			const caps = await api.getEndpointCapabilities(endpoint);
			logMessage = `received response for endpoint capabilities (#${endpoint}):
generic device class:  ${caps.generic.name} (${num2hex(caps.generic.key)})
specific device class: ${caps.specific.name} (${num2hex(caps.specific.key)})
is dynamic end point:  ${caps.isDynamic}
supported CCs:`;
			for (const cc of caps.supportedCCs) {
				const ccName = CommandClasses[cc];
				logMessage += `\n  · ${ccName ? ccName : num2hex(cc)}`;
			}
			log.controller.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(MultiChannelCommand.EndPointReport)
export class MultiChannelCCEndPointReport extends MultiChannelCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._countIsDynamic = !!(this.payload[0] & 0b10000000);
		this._identicalCapabilities = !!(this.payload[0] & 0b01000000);
		this._individualCount = this.payload[1] & 0b01111111;
		if (this.version >= 4 && this.payload.length >= 3) {
			this._aggregatedCount = this.payload[2] & 0b01111111;
		}
		this.persistValues();
	}

	private _countIsDynamic: boolean;
	@ccValue({ internal: true })
	public get countIsDynamic(): boolean {
		return this._countIsDynamic;
	}

	private _identicalCapabilities: boolean;
	@ccValue({ internal: true })
	public get identicalCapabilities(): boolean {
		return this._identicalCapabilities;
	}

	private _individualCount: number;
	@ccValue({ internal: true })
	public get individualCount(): number {
		return this._individualCount;
	}

	private _aggregatedCount: number | undefined;
	@ccValue({ internal: true })
	public get aggregatedCount(): number | undefined {
		return this._aggregatedCount;
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
		this.endpointIndex = this.payload[0] & 0b01111111;
		const capability = {
			isDynamic: !!(this.payload[0] & 0b10000000),
			wasRemoved: false,
			// TODO: does this include controlledCCs aswell?
			...parseNodeInformationFrame(this.payload.slice(1)),
		};
		// Removal reports have very specific information
		capability.wasRemoved =
			capability.isDynamic &&
			capability.generic.key ===
				GenericDeviceClasses["Non-Interoperable"] &&
			capability.specific.key === 0x00;

		this.capability = capability;

		// Remember the supported CCs
		const ccsValueId = getEndpointCCsValueId(this.endpointIndex);
		if (capability.wasRemoved) {
			this.getValueDB().removeValue(ccsValueId);
		} else {
			this.getValueDB().setValue(
				ccsValueId,
				this.capability.supportedCCs,
			);
		}
	}

	public readonly endpointIndex: number;
	public readonly capability: EndpointCapability;
}

interface MultiChannelCCCapabilityGetOptions extends CCCommandOptions {
	requestedEndpoint: number;
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
			this.requestedEndpoint = options.requestedEndpoint;
		}
	}

	public requestedEndpoint: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedEndpoint & 0b01111111]);
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
		this._reportsToFollow = this.payload[0];
		this._genericClass = this.payload[1];
		this._specificClass = this.payload[2];

		validatePayload(this.payload.length >= 4);
		this._foundEndpoints = [...this.payload.slice(3)]
			.map(e => e & 0b01111111)
			.filter(e => e !== 0);
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

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: MultiChannelCCEndPointFindReport[]): void {
		// Concat the list of end points
		this._foundEndpoints = [...partials, this]
			.map(report => report._foundEndpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);
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

	@ccKeyValuePair({ internal: true })
	private aggregatedEndpointMembers: [number, number[]];

	public get endpointIndex(): number {
		return this.aggregatedEndpointMembers[0];
	}

	public get members(): readonly number[] {
		return this.aggregatedEndpointMembers[1];
	}
}

interface MultiChannelCCAggregatedMembersGetOptions extends CCCommandOptions {
	requestedEndpoint: number;
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
			this.requestedEndpoint = options.requestedEndpoint;
		}
	}

	public requestedEndpoint: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedEndpoint & 0b0111_1111]);
		return super.serialize();
	}
}

type MultiChannelCCDestination = number | (1 | 2 | 3 | 4 | 5 | 6 | 7)[];

interface MultiChannelCCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
	destination: MultiChannelCCDestination;
}

const getResponseForCommandEncapsulation: DynamicCCResponse = (
	sent: MultiChannelCCCommandEncapsulation,
) => {
	// SDS13783: A receiving node MAY respond to a Multi Channel encapsulated command if the Destination
	// End Point field specifies a single End Point. In that case, the response MUST be Multi Channel
	// encapsulated.
	// A receiving node MUST NOT respond to a Multi Channel encapsulated command if the
	// Destination End Point field specifies multiple End Points via bit mask addressing.
	return typeof sent.destination === "number"
		? MultiChannelCCCommandEncapsulation
		: undefined;
};

@CCCommand(MultiChannelCommand.CommandEncapsulation)
@expectedCCResponse(getResponseForCommandEncapsulation)
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
			this.endpointIndex = this.payload[0] & 0b0111_1111;
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
			this.encapsulated = CommandClass.fromEncapsulated(
				this.driver,
				this,
				this.payload.slice(2),
			);
		} else {
			this.encapsulated = options.encapsulated;
			this.destination = options.destination;
		}
	}

	public encapsulated: CommandClass;
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
			Buffer.from([this.endpointIndex & 0b0111_1111, destination]),
			this.encapsulated.serializeForEncapsulation(),
		]);
		return super.serialize();
	}
}
