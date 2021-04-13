import type { GenericDeviceClass, SpecificDeviceClass } from "@zwave-js/config";
import {
	CommandClasses,
	encodeBitMask,
	getCCName,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	parseBitMask,
	parseNodeInformationFrame,
	validatePayload,
	ValueID,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
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
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

export enum MultiChannelCommand {
	// Legacy commands for V1 (Multi Instance)
	GetV1 = 0x04,
	ReportV1 = 0x05,
	CommandEncapsulationV1 = 0x06,

	// V2+
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

export function getEndpointIndizesValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		property: "endpointIndizes",
	};
}

export function getEndpointCCsValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		endpoint: endpointIndex,
		property: "commandClasses",
	};
}

export function getEndpointDeviceClassValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		endpoint: endpointIndex,
		property: "deviceClass",
	};
}

export function getCountIsDynamicValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		property: "countIsDynamic",
	};
}
export function getIdenticalCapabilitiesValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		property: "identicalCapabilities",
	};
}
export function getIndividualCountValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		property: "individualCount",
	};
}
export function getAggregatedCountValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel"],
		property: "aggregatedCount",
	};
}

@API(CommandClasses["Multi Channel"])
export class MultiChannelCCAPI extends CCAPI {
	public supportsCommand(cmd: MultiChannelCommand): Maybe<boolean> {
		switch (cmd) {
			// Legacy commands:
			case MultiChannelCommand.GetV1:
				return this.isSinglecast() && this.version === 1;
			case MultiChannelCommand.CommandEncapsulationV1:
				return this.version === 1;

			// The specs start at version 3 but according to OZW,
			// these do seem to be supported in version 2
			case MultiChannelCommand.EndPointGet:
			case MultiChannelCommand.CapabilityGet:
				return this.version >= 2 && this.isSinglecast();
			case MultiChannelCommand.CommandEncapsulation:
				return this.version >= 2;
			case MultiChannelCommand.EndPointFind:
				return this.version >= 3 && this.isSinglecast();
			case MultiChannelCommand.AggregatedMembersGet:
				return this.version >= 4 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getEndpoints() {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.EndPointGet,
		);

		const cc = new MultiChannelCCEndPointGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<MultiChannelCCEndPointReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				isDynamicEndpointCount: response.countIsDynamic,
				identicalCapabilities: response.identicalCapabilities,
				individualEndpointCount: response.individualCount,
				aggregatedEndpointCount: response.aggregatedCount,
			};
		}
	}

	public async getEndpointCapabilities(
		endpoint: number,
	): Promise<EndpointCapability | undefined> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CapabilityGet,
		);

		const cc = new MultiChannelCCCapabilityGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedEndpoint: endpoint,
		});
		const response = await this.driver.sendCommand<MultiChannelCCCapabilityReport>(
			cc,
			this.commandOptions,
		);
		return response?.capability;
	}

	public async findEndpoints(
		genericClass: number,
		specificClass: number,
	): Promise<readonly number[] | undefined> {
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
		const response = await this.driver.sendCommand<MultiChannelCCEndPointFindReport>(
			cc,
			this.commandOptions,
		);
		return response?.foundEndpoints;
	}

	public async getAggregatedMembers(
		endpoint: number,
	): Promise<readonly number[] | undefined> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.AggregatedMembersGet,
		);

		const cc = new MultiChannelCCAggregatedMembersGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedEndpoint: endpoint,
		});
		const response = await this.driver.sendCommand<MultiChannelCCAggregatedMembersReport>(
			cc,
			this.commandOptions,
		);
		return response?.members;
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getEndpointCountV1(
		ccId: CommandClasses,
	): Promise<number | undefined> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.GetV1,
		);

		const cc = new MultiChannelCCV1Get(this.driver, {
			nodeId: this.endpoint.nodeId,
			requestedCC: ccId,
		});
		const response = await this.driver.sendCommand<MultiChannelCCV1Report>(
			cc,
			this.commandOptions,
		);
		return response?.endpointCount;
	}

	public async sendEncapsulatedV1(encapsulated: CommandClass): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CommandEncapsulationV1,
		);

		const cc = new MultiChannelCCV1CommandEncapsulation(this.driver, {
			nodeId: this.endpoint.nodeId,
			encapsulated,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

export interface EndpointCapability {
	generic: GenericDeviceClass;
	specific: SpecificDeviceClass;
	supportedCCs: CommandClasses[];
	isDynamic: boolean;
	wasRemoved: boolean;
}

@commandClass(CommandClasses["Multi Channel"])
@implementedVersion(4)
export class MultiChannelCC extends CommandClass {
	declare ccCommand: MultiChannelCommand;

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(getEndpointCCsValueId(0).property, true);
		this.registerValue(getEndpointDeviceClassValueId(0).property, true);
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
		driver: Driver,
		cc: CommandClass,
	): MultiChannelCCCommandEncapsulation {
		return new MultiChannelCCCommandEncapsulation(driver, {
			nodeId: cc.nodeId,
			encapsulated: cc,
			destination: cc.endpointIndex,
		});
	}

	public skipEndpointInterview(): boolean {
		// The endpoints are discovered by querying the root device
		return true;
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Special interview procedure for legacy nodes
		if (this.version === 1) return this.interviewV1();

		const endpoint = node.getEndpoint(this.endpointIndex)!;
		const api = endpoint.commandClasses["Multi Channel"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Step 1: Retrieve general information about end points
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying device endpoint information...",
			direction: "outbound",
		});
		const multiResponse = await api.getEndpoints();
		if (!multiResponse) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying device endpoint information timed out, aborting interview...",
				level: "warn",
			});
			return this.throwMissingCriticalInterviewResponse();
		}

		let logMessage = `received response for device endpoints:
endpoint count (individual): ${multiResponse.individualEndpointCount}
count is dynamic:            ${multiResponse.isDynamicEndpointCount}
identical capabilities:      ${multiResponse.identicalCapabilities}`;
		if (multiResponse.aggregatedEndpointCount != undefined) {
			logMessage += `\nendpoint count (aggregated): ${multiResponse.aggregatedEndpointCount}`;
		}
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: logMessage,
			direction: "inbound",
		});

		const allEndpoints: number[] = [];
		const addSequentialEndpoints = (): void => {
			for (
				let i = 1;
				i <=
				multiResponse.individualEndpointCount +
					(multiResponse.aggregatedEndpointCount ?? 0);
				i++
			) {
				allEndpoints.push(i);
			}
		};
		if (api.supportsCommand(MultiChannelCommand.EndPointFind)) {
			// Step 2a: Find all endpoints
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying all endpoints...",
				direction: "outbound",
			});

			const foundEndpoints = await api.findEndpoints(0xff, 0xff);
			if (foundEndpoints) allEndpoints.push(...foundEndpoints);
			if (!allEndpoints.length) {
				// Create a sequential list of endpoints
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Endpoint query returned no results, assuming that endpoints are sequential`,
					direction: "inbound",
				});
				addSequentialEndpoints();
			} else {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `received endpoints: ${allEndpoints
						.map(String)
						.join(", ")}`,
					direction: "inbound",
				});
			}
		} else {
			// Step 2b: Assume that the endpoints are in sequential order
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `does not support EndPointFind, assuming that endpoints are sequential`,
				direction: "none",
			});
			addSequentialEndpoints();
		}

		// Step 3: Query endpoints
		let hasQueriedCapabilities = false;
		for (const endpoint of allEndpoints) {
			if (
				endpoint > multiResponse.individualEndpointCount &&
				this.version >= 4
			) {
				// Find members of aggregated end point
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying members of aggregated endpoint #${endpoint}...`,
					direction: "outbound",
				});
				const members = await api.getAggregatedMembers(endpoint);
				if (members) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `aggregated endpoint #${endpoint} has members ${members
							.map(String)
							.join(", ")}`,
						direction: "inbound",
					});
				}
			}

			// When the device reports identical capabilities for all endpoints,
			// we don't need to query them all
			if (multiResponse.identicalCapabilities && hasQueriedCapabilities) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `all endpoints identical, skipping capability query for endpoint #${endpoint}...`,
					direction: "none",
				});

				// copy the capabilities from the first endpoint
				const ep1Caps = this.getValueDB().getValue<CommandClasses[]>(
					getEndpointCCsValueId(allEndpoints[0]),
				)!;
				this.getValueDB().setValue(getEndpointCCsValueId(endpoint), [
					...ep1Caps,
				]);

				continue;
			}

			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying capabilities for endpoint #${endpoint}...`,
				direction: "outbound",
			});
			const caps = await api.getEndpointCapabilities(endpoint);
			if (caps) {
				hasQueriedCapabilities = true;
				logMessage = `received response for endpoint capabilities (#${endpoint}):
generic device class:  ${caps.generic.label}
specific device class: ${caps.specific.label}
is dynamic end point:  ${caps.isDynamic}
supported CCs:`;
				for (const cc of caps.supportedCCs) {
					const ccName = CommandClasses[cc];
					logMessage += `\n  · ${ccName ? ccName : num2hex(cc)}`;
				}
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Querying endpoint #${endpoint} capabilities timed out, aborting interview...`,
					level: "warn",
				});
				return this.throwMissingCriticalInterviewResponse();
			}
		}

		// Now that all endpoints have been interviewed, remember which ones are there
		this.getValueDB().setValue(getEndpointIndizesValueId(), allEndpoints);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	private async interviewV1(): Promise<void> {
		const node = this.getNode()!;
		const api = node.getEndpoint(this.endpointIndex)!.commandClasses[
			"Multi Channel"
		];

		// V1 works the opposite way - we scan all CCs and remember how many
		// endpoints they have
		const supportedCCs = [...node.implementedCommandClasses.keys()]
			// Don't query CCs the node only controls
			.filter((cc) => node.supportsCC(cc))
			// Don't query CCs that want to skip the endpoint interview
			.filter(
				(cc) => !node.createCCInstance(cc)?.skipEndpointInterview(),
			);
		const endpointCounts = new Map<CommandClasses, number>();
		for (const ccId of supportedCCs) {
			this.driver.controllerLog.logNode(node.id, {
				message: `Querying endpoint count for CommandClass ${getCCName(
					ccId,
				)}...`,
				direction: "outbound",
			});
			const endpointCount = await api.getEndpointCountV1(ccId);
			if (endpointCount != undefined) {
				endpointCounts.set(ccId, endpointCount);

				this.driver.controllerLog.logNode(node.id, {
					message: `CommandClass ${getCCName(
						ccId,
					)} has ${endpointCount} endpoints`,
					direction: "inbound",
				});
			}
		}

		// Store the collected information
		// We have only individual and no dynamic and no aggregated endpoints
		const numEndpoints = Math.max(...endpointCounts.values());
		node.valueDB.setValue(getCountIsDynamicValueId(), false);
		node.valueDB.setValue(getAggregatedCountValueId(), 0);
		node.valueDB.setValue(getIndividualCountValueId(), numEndpoints);
		// Since we queried all CCs separately, we can assume that all
		// endpoints have different capabilities
		node.valueDB.setValue(getIdenticalCapabilitiesValueId(), false);

		for (let endpoint = 1; endpoint <= numEndpoints; endpoint++) {
			// Check which CCs exist on this endpoint
			const endpointCCs = [...endpointCounts.entries()]
				.filter(([, ccEndpoints]) => ccEndpoints <= endpoint)
				.map(([ccId]) => ccId);
			// And store it per endpoint
			node.valueDB.setValue(getEndpointCCsValueId(endpoint), endpointCCs);
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(MultiChannelCommand.EndPointReport)
export class MultiChannelCCEndPointReport extends MultiChannelCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"endpoint count (individual)": this.individualCount,
			"count is dynamic": this.countIsDynamic,
			"identical capabilities": this.identicalCapabilities,
		};
		if (this.aggregatedCount != undefined) {
			message["endpoint count (aggregated)"] = this.aggregatedCount;
		}
		const ret = {
			...super.toLogEntry(),
			message,
		};
		return ret;
	}
}

@CCCommand(MultiChannelCommand.EndPointGet)
@expectedCCResponse(MultiChannelCCEndPointReport)
export class MultiChannelCCEndPointGet extends MultiChannelCC {}

@CCCommand(MultiChannelCommand.CapabilityReport)
export class MultiChannelCCCapabilityReport extends MultiChannelCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		// Only validate the bytes we expect to see here
		// parseNodeInformationFrame does its own validation
		validatePayload(this.payload.length >= 1);
		this.endpointIndex = this.payload[0] & 0b01111111;
		const NIF = parseNodeInformationFrame(this.payload.slice(1));
		const capability: EndpointCapability = {
			isDynamic: !!(this.payload[0] & 0b10000000),
			wasRemoved: false,
			generic: this.driver.configManager.lookupGenericDeviceClass(
				NIF.generic,
			),
			specific: this.driver.configManager.lookupSpecificDeviceClass(
				NIF.generic,
				NIF.specific,
			),
			supportedCCs: NIF.supportedCCs,
			// TODO: does this include controlledCCs aswell?
		};
		// Removal reports have very specific information
		capability.wasRemoved =
			capability.isDynamic &&
			capability.generic.key === 0xff && // "Non-Interoperable"
			capability.specific.key === 0x00;

		this.capability = capability;

		// Remember the supported CCs
		this.persistValues();
	}

	public persistValues(): boolean {
		const deviceClassValueId = getEndpointDeviceClassValueId(
			this.endpointIndex,
		);
		const ccsValueId = getEndpointCCsValueId(this.endpointIndex);

		const valueDB = this.getValueDB();
		if (this.capability.wasRemoved) {
			valueDB.removeValue(deviceClassValueId);
			valueDB.removeValue(ccsValueId);
		} else {
			valueDB.setValue(deviceClassValueId, {
				generic: this.capability.generic.key,
				specific: this.capability.specific.key,
			});
			valueDB.setValue(ccsValueId, this.capability.supportedCCs);
		}
		return true;
	}

	public readonly endpointIndex: number;
	public readonly capability: EndpointCapability;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"endpoint index": this.endpointIndex,
				"generic device class": this.capability.generic.label,
				"specific device class": this.capability.specific.label,
				"is dynamic end point": this.capability.isDynamic,
				"supported CCs": this.capability.supportedCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
			},
		};
	}
}

interface MultiChannelCCCapabilityGetOptions extends CCCommandOptions {
	requestedEndpoint: number;
}

@CCCommand(MultiChannelCommand.CapabilityGet)
@expectedCCResponse(MultiChannelCCCapabilityReport)
export class MultiChannelCCCapabilityGet extends MultiChannelCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { endpoint: this.requestedEndpoint },
		};
	}
}

@CCCommand(MultiChannelCommand.EndPointFindReport)
export class MultiChannelCCEndPointFindReport extends MultiChannelCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this._reportsToFollow = this.payload[0];
		this._genericClass = this.payload[1];
		this._specificClass = this.payload[2];

		// Some devices omit the endpoint list althought that is not allowed in the specs
		// therefore don't validatePayload here.
		this._foundEndpoints = [...this.payload.slice(3)]
			.map((e) => e & 0b01111111)
			.filter((e) => e !== 0);
	}

	private _genericClass: number;
	public get genericClass(): number {
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

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the requested device classes
		return {
			genericClass: this.genericClass,
			specificClass: this.specificClass,
		};
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: MultiChannelCCEndPointFindReport[]): void {
		// Concat the list of end points
		this._foundEndpoints = [...partials, this]
			.map((report) => report._foundEndpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"generic device class": this.driver.configManager.lookupGenericDeviceClass(
					this.genericClass,
				).label,
				"specific device class": this.driver.configManager.lookupSpecificDeviceClass(
					this.genericClass,
					this.specificClass,
				).label,
				"found endpoints": this._foundEndpoints.join(", "),
				"# of reports to follow": this._reportsToFollow,
			},
		};
	}
}

interface MultiChannelCCEndPointFindOptions extends CCCommandOptions {
	genericClass: number;
	specificClass: number;
}

@CCCommand(MultiChannelCommand.EndPointFind)
@expectedCCResponse(MultiChannelCCEndPointFindReport)
export class MultiChannelCCEndPointFind extends MultiChannelCC {
	public constructor(
		driver: Driver,
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

	public genericClass: number;
	public specificClass: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.genericClass, this.specificClass]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"generic device class": this.driver.configManager.lookupGenericDeviceClass(
					this.genericClass,
				).label,
				"specific device class": this.driver.configManager.lookupSpecificDeviceClass(
					this.genericClass,
					this.specificClass,
				).label,
			},
		};
	}
}

@CCCommand(MultiChannelCommand.AggregatedMembersReport)
export class MultiChannelCCAggregatedMembersReport extends MultiChannelCC {
	public constructor(
		driver: Driver,
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
		this.persistValues();
	}

	@ccKeyValuePair({ internal: true })
	private aggregatedEndpointMembers: [number, number[]];

	public get aggregatedEndpoint(): number {
		return this.aggregatedEndpointMembers[0];
	}

	public get members(): readonly number[] {
		return this.aggregatedEndpointMembers[1];
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				endpoint: this.endpointIndex,
				members: this.members.join(", "),
			},
		};
	}
}

interface MultiChannelCCAggregatedMembersGetOptions extends CCCommandOptions {
	requestedEndpoint: number;
}

@CCCommand(MultiChannelCommand.AggregatedMembersGet)
@expectedCCResponse(MultiChannelCCAggregatedMembersReport)
export class MultiChannelCCAggregatedMembersGet extends MultiChannelCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { endpoint: this.requestedEndpoint },
		};
	}
}

type MultiChannelCCDestination = number | (1 | 2 | 3 | 4 | 5 | 6 | 7)[];

interface MultiChannelCCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
	destination: MultiChannelCCDestination;
}

// SDS13783: A receiving node MAY respond to a Multi Channel encapsulated command if the Destination
// End Point field specifies a single End Point. In that case, the response MUST be Multi Channel
// encapsulated.
// A receiving node MUST NOT respond to a Multi Channel encapsulated command if the
// Destination End Point field specifies multiple End Points via bit mask addressing.

function getCCResponseForCommandEncapsulation(
	sent: MultiChannelCCCommandEncapsulation,
) {
	if (
		typeof sent.destination === "number" &&
		sent.encapsulated.expectsCCResponse()
	) {
		// Allow both versions of the encapsulation command
		// Our implementation check is a bit too strict, so change the return type
		return ([
			MultiChannelCCCommandEncapsulation,
			MultiChannelCCV1CommandEncapsulation,
		] as any) as typeof MultiChannelCCCommandEncapsulation[];
	}
}

function testResponseForCommandEncapsulation(
	sent: MultiChannelCCCommandEncapsulation,
	received:
		| MultiChannelCCCommandEncapsulation
		| MultiChannelCCV1CommandEncapsulation,
) {
	if (
		typeof sent.destination === "number" &&
		sent.destination === received.endpointIndex
	) {
		return "checkEncapsulated";
	}
	return false;
}

@CCCommand(MultiChannelCommand.CommandEncapsulation)
@expectedCCResponse(
	getCCResponseForCommandEncapsulation,
	testResponseForCommandEncapsulation,
)
export class MultiChannelCCCommandEncapsulation extends MultiChannelCC {
	public constructor(
		driver: Driver,
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
			this.encapsulated = CommandClass.from(this.driver, {
				data: this.payload.slice(2),
				fromEncapsulation: true,
				encapCC: this,
			});
		} else {
			this.encapsulated = options.encapsulated;
			options.encapsulated.encapsulatingCC = this as any;
			this.destination = options.destination;
			// If the encapsulated command requires security, so does this one
			if (this.encapsulated.secure) this.secure = true;
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
			this.encapsulated.serialize(),
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				source: this.endpointIndex,
				destination:
					typeof this.destination === "number"
						? this.destination
						: this.destination.join(", "),
			},
		};
	}

	protected computeEncapsulationOverhead(): number {
		// Multi Channel CC adds two bytes for the source and destination endpoint
		return super.computeEncapsulationOverhead() + 2;
	}
}

@CCCommand(MultiChannelCommand.ReportV1)
export class MultiChannelCCV1Report extends MultiChannelCC {
	// @noCCValues This information is stored during the interview

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// V1 won't be extended in the future, so do an exact check
		validatePayload(this.payload.length === 2);
		this.requestedCC = this.payload[0];
		this.endpointCount = this.payload[1];
	}

	public readonly requestedCC: CommandClasses;
	public readonly endpointCount: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				CC: getCCName(this.requestedCC),
				"# of endpoints": this.endpointCount,
			},
		};
	}
}

function testResponseForMultiChannelV1Get(
	sent: MultiChannelCCV1Get,
	received: MultiChannelCCV1Report,
) {
	return sent.requestedCC === received.requestedCC;
}

interface MultiChannelCCV1GetOptions extends CCCommandOptions {
	requestedCC: CommandClasses;
}

@CCCommand(MultiChannelCommand.GetV1)
@expectedCCResponse(MultiChannelCCV1Report, testResponseForMultiChannelV1Get)
export class MultiChannelCCV1Get extends MultiChannelCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCV1GetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.requestedCC = options.requestedCC;
		}
	}

	public requestedCC: CommandClasses;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedCC]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { CC: getCCName(this.requestedCC) },
		};
	}
}

// This indirection is necessary to be able to define the same CC as the response
function getResponseForV1CommandEncapsulation() {
	return MultiChannelCCV1CommandEncapsulation;
}

interface MultiChannelCCV1CommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
}

@CCCommand(MultiChannelCommand.CommandEncapsulationV1)
@expectedCCResponse(getResponseForV1CommandEncapsulation)
export class MultiChannelCCV1CommandEncapsulation extends MultiChannelCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCV1CommandEncapsulationOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.endpointIndex = this.payload[0];

			// Some devices send invalid reports, i.e. MultiChannelCCV1CommandEncapsulation, but with V2+ binary format
			// This would be a NoOp CC, but it makes no sense to encapsulate that.
			const isV2withV1Header =
				this.payload.length >= 2 && this.payload[1] === 0x00;

			// No need to validate further, each CC does it for itself
			this.encapsulated = CommandClass.from(this.driver, {
				data: this.payload.slice(isV2withV1Header ? 2 : 1),
				fromEncapsulation: true,
				encapCC: this,
			});
		} else {
			this.encapsulated = options.encapsulated;
			// No need to distinguish between source and destination in V1
			this.endpointIndex = this.encapsulated.endpointIndex;
		}
	}

	public encapsulated!: CommandClass;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.endpointIndex]),
			this.encapsulated.serialize(),
		]);
		return super.serialize();
	}

	protected computeEncapsulationOverhead(): number {
		// Multi Channel CC V1 adds one byte for the endpoint index
		return super.computeEncapsulationOverhead() + 1;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { source: this.endpointIndex },
		};
	}
}
