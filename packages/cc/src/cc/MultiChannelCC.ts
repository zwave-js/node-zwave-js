import type { GenericDeviceClass, SpecificDeviceClass } from "@zwave-js/config";
import {
	CommandClasses,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	encodeApplicationNodeInformation,
	encodeBitMask,
	getCCName,
	parseApplicationNodeInformation,
	parseBitMask,
	validatePayload,
	type ApplicationNodeInformation,
	type IZWaveNode,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type MessageRecord,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import { CCAPI } from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { MultiChannelCommand } from "../lib/_Types";

// TODO: Handle removal reports of dynamic endpoints

export const MultiChannelCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Multi Channel"], {
		...V.staticProperty("endpointIndizes", undefined, {
			internal: true,
			supportsEndpoints: false,
		}),

		...V.staticPropertyWithName(
			"individualEndpointCount",
			"individualCount",
			undefined,
			{
				internal: true,
				supportsEndpoints: false,
			},
		),

		...V.staticPropertyWithName(
			"aggregatedEndpointCount",
			"aggregatedCount",
			undefined,
			{
				internal: true,
				supportsEndpoints: false,
			},
		),

		...V.staticPropertyWithName(
			"endpointCountIsDynamic",
			"countIsDynamic",
			undefined,
			{
				internal: true,
				supportsEndpoints: false,
			},
		),

		...V.staticPropertyWithName(
			"endpointsHaveIdenticalCapabilities",
			"identicalCapabilities",
			undefined,
			{
				internal: true,
				supportsEndpoints: false,
			},
		),

		...V.staticPropertyWithName(
			"endpointCCs",
			"commandClasses",
			undefined,
			{ internal: true },
		),

		...V.staticPropertyWithName(
			"endpointDeviceClass",
			"deviceClass",
			undefined,
			{ internal: true },
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Multi Channel"], {
		...V.dynamicPropertyAndKeyWithName(
			"aggregatedEndpointMembers",
			"members",
			(endpointIndex: number) => endpointIndex,
			({ property, propertyKey }) =>
				property === "members" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
	}),
});

// @noSetValueAPI

/**
 * Many devices unnecessarily use endpoints when they could (or do) provide all functionality via the root device.
 * This function gives an estimate if this is the case (i.e. all endpoints have a different device class)
 */
function areEndpointsUnnecessary(
	applHost: ZWaveApplicationHost,
	node: IZWaveNode,
	endpointIndizes: number[],
): boolean {
	// Gather all device classes
	const deviceClasses = new Map<
		number,
		{
			generic: number;
			specific: number;
		}
	>();
	for (const endpoint of endpointIndizes) {
		const devClassValueId =
			MultiChannelCCValues.endpointDeviceClass.endpoint(endpoint);
		const deviceClass = applHost.getValueDB(node.id).getValue<{
			generic: number;
			specific: number;
		}>(devClassValueId);
		if (deviceClass) {
			deviceClasses.set(endpoint, {
				generic: deviceClass.generic,
				specific: deviceClass.specific,
			});
		}
	}

	// Endpoints may be useless if all of them have different device classes
	const distinctDeviceClasses = distinct(
		[...deviceClasses.values()].map(
			({ generic, specific }) => generic * 256 + specific,
		),
	);
	if (distinctDeviceClasses.length !== endpointIndizes.length) {
		// There are endpoints with the same device class, so they are not unnecessary
		return false;
	}

	// If any endpoint has a mandatory supported CC that's not exposed by the root device, the endpoints are necessary
	for (const { generic, specific } of deviceClasses.values()) {
		const deviceClass = applHost.configManager.lookupSpecificDeviceClass(
			generic,
			specific,
		);
		// Unsure what this device class is. Probably not a good idea to assume it's unnecessary
		if (!deviceClass) return false;
		if (deviceClass.supportedCCs.some((cc) => !node.supportsCC(cc))) {
			// We found one that's not supported by the root device
			return false;
		}
	}

	// Last heuristic: Endpoints are necessary if more than 1 of them has a switch-type device class
	const switchTypeDeviceClasses = [
		0x10, // Binary Switch
		0x11, // Multilevel Switch
		0x12, // Remote Switch
		0x13, // Toggle Switch
	];
	const numSwitchEndpoints = [...deviceClasses.values()].filter(
		({ generic }) => switchTypeDeviceClasses.includes(generic),
	).length;
	if (numSwitchEndpoints > 1) return false;

	return true;
}

@API(CommandClasses["Multi Channel"])
export class MultiChannelCCAPI extends CCAPI {
	public supportsCommand(cmd: MultiChannelCommand): MaybeNotKnown<boolean> {
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

		const cc = new MultiChannelCCEndPointGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<MultiChannelCCEndPointReport>(
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

	@validateArgs()
	public async getEndpointCapabilities(
		endpoint: number,
	): Promise<MaybeNotKnown<EndpointCapability>> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CapabilityGet,
		);

		const cc = new MultiChannelCCCapabilityGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedEndpoint: endpoint,
		});
		const response =
			await this.applHost.sendCommand<MultiChannelCCCapabilityReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			const generic =
				this.applHost.configManager.lookupGenericDeviceClass(
					response.genericDeviceClass,
				);
			const specific =
				this.applHost.configManager.lookupSpecificDeviceClass(
					response.genericDeviceClass,
					response.specificDeviceClass,
				);
			return {
				isDynamic: response.isDynamic,
				wasRemoved: response.wasRemoved,
				supportedCCs: response.supportedCCs,
				generic,
				specific,
			};
		}
	}

	@validateArgs()
	public async findEndpoints(
		genericClass: number,
		specificClass: number,
	): Promise<MaybeNotKnown<readonly number[]>> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.EndPointFind,
		);

		const cc = new MultiChannelCCEndPointFind(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			genericClass,
			specificClass,
		});
		const response =
			await this.applHost.sendCommand<MultiChannelCCEndPointFindReport>(
				cc,
				this.commandOptions,
			);
		return response?.foundEndpoints;
	}

	@validateArgs()
	public async getAggregatedMembers(
		endpoint: number,
	): Promise<MaybeNotKnown<readonly number[]>> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.AggregatedMembersGet,
		);

		const cc = new MultiChannelCCAggregatedMembersGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedEndpoint: endpoint,
		});
		const response =
			await this.applHost.sendCommand<MultiChannelCCAggregatedMembersReport>(
				cc,
				this.commandOptions,
			);
		return response?.members;
	}

	// @noValidateArgs - Encapsulation is used internally and too frequently that we
	// want to pay the cost of validating each call
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

		const cc = new MultiChannelCCCommandEncapsulation(this.applHost, {
			nodeId: this.endpoint.nodeId,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getEndpointCountV1(
		ccId: CommandClasses,
	): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.GetV1,
		);

		const cc = new MultiChannelCCV1Get(this.applHost, {
			nodeId: this.endpoint.nodeId,
			requestedCC: ccId,
		});
		const response =
			await this.applHost.sendCommand<MultiChannelCCV1Report>(
				cc,
				this.commandOptions,
			);
		return response?.endpointCount;
	}

	// @noValidateArgs - Encapsulation is used internally and too frequently that we
	// want to pay the cost of validating each call
	public async sendEncapsulatedV1(encapsulated: CommandClass): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CommandEncapsulationV1,
		);

		const cc = new MultiChannelCCV1CommandEncapsulation(this.applHost, {
			nodeId: this.endpoint.nodeId,
			encapsulated,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
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
@ccValues(MultiChannelCCValues)
export class MultiChannelCC extends CommandClass {
	declare ccCommand: MultiChannelCommand;

	/** Tests if a command targets a specific endpoint and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			cc.endpointIndex !== 0 &&
			!(cc instanceof MultiChannelCCCommandEncapsulation) &&
			!(cc instanceof MultiChannelCCV1CommandEncapsulation)
		);
	}

	/** Encapsulates a command that targets a specific endpoint */
	public static encapsulate(
		host: ZWaveHost,
		cc: CommandClass,
	):
		| MultiChannelCCCommandEncapsulation
		| MultiChannelCCV1CommandEncapsulation {
		const ccVersion = host.getSafeCCVersion(
			CommandClasses["Multi Channel"],
			cc.nodeId as number,
		);
		let ret:
			| MultiChannelCCCommandEncapsulation
			| MultiChannelCCV1CommandEncapsulation;
		if (ccVersion === 1) {
			ret = new MultiChannelCCV1CommandEncapsulation(host, {
				nodeId: cc.nodeId,
				encapsulated: cc,
			});
		} else {
			ret = new MultiChannelCCCommandEncapsulation(host, {
				nodeId: cc.nodeId,
				encapsulated: cc,
				destination: cc.endpointIndex,
			});
		}

		// Copy the encapsulation flags from the encapsulated command
		ret.encapsulationFlags = cc.encapsulationFlags;

		return ret;
	}

	public skipEndpointInterview(): boolean {
		// The endpoints are discovered by querying the root device
		return true;
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		const removeEndpoints = applHost.getDeviceConfig?.(node.id)?.compat
			?.removeEndpoints;
		if (removeEndpoints === "*") {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Skipping ${this.ccName} interview b/c all endpoints are ignored by the device config file...`,
				direction: "none",
			});
			return;
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Special interview procedure for legacy nodes
		if (this.version === 1) return this.interviewV1(applHost);

		const endpoint = node.getEndpoint(this.endpointIndex)!;
		const api = CCAPI.create(
			CommandClasses["Multi Channel"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(applHost);

		// Step 1: Retrieve general information about end points
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying device endpoint information...",
			direction: "outbound",
		});
		const multiResponse = await api.getEndpoints();
		if (!multiResponse) {
			applHost.controllerLog.logNode(node.id, {
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
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: logMessage,
			direction: "inbound",
		});

		let allEndpoints: number[] = [];
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
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying all endpoints...",
				direction: "outbound",
			});

			const foundEndpoints = await api.findEndpoints(0xff, 0xff);
			if (foundEndpoints) allEndpoints.push(...foundEndpoints);
			if (!allEndpoints.length) {
				// Create a sequential list of endpoints
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Endpoint query returned no results, assuming that endpoints are sequential`,
					direction: "inbound",
				});
				addSequentialEndpoints();
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `received endpoints: ${allEndpoints
						.map(String)
						.join(", ")}`,
					direction: "inbound",
				});
			}
		} else {
			// Step 2b: Assume that the endpoints are in sequential order
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `does not support EndPointFind, assuming that endpoints are sequential`,
				direction: "none",
			});
			addSequentialEndpoints();
		}

		// Step 2.5: remove ignored endpoints
		if (removeEndpoints?.length) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `The following endpoints are ignored through the config file: ${removeEndpoints.join(
					", ",
				)}`,
				direction: "none",
			});
			allEndpoints = allEndpoints.filter(
				(e) => !removeEndpoints.includes(e),
			);
		}

		// Step 3: Query endpoints
		let hasQueriedCapabilities = false;
		for (const endpoint of allEndpoints) {
			if (
				endpoint > multiResponse.individualEndpointCount &&
				this.version >= 4
			) {
				// Find members of aggregated end point
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying members of aggregated endpoint #${endpoint}...`,
					direction: "outbound",
				});
				const members = await api.getAggregatedMembers(endpoint);
				if (members) {
					applHost.controllerLog.logNode(node.id, {
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
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `all endpoints identical, skipping capability query for endpoint #${endpoint}...`,
					direction: "none",
				});

				// copy the capabilities from the first endpoint
				const devClass = valueDB.getValue(
					MultiChannelCCValues.endpointDeviceClass.endpoint(
						allEndpoints[0],
					),
				);
				valueDB.setValue(
					MultiChannelCCValues.endpointDeviceClass.endpoint(endpoint),
					devClass,
				);
				const ep1Caps = valueDB.getValue<CommandClasses[]>(
					MultiChannelCCValues.endpointCCs.endpoint(allEndpoints[0]),
				)!;
				valueDB.setValue(
					MultiChannelCCValues.endpointCCs.endpoint(endpoint),
					[...ep1Caps],
				);

				continue;
			}

			applHost.controllerLog.logNode(node.id, {
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
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Querying endpoint #${endpoint} capabilities timed out, aborting interview...`,
					level: "warn",
				});
				return this.throwMissingCriticalInterviewResponse();
			}
		}

		// Now that all endpoints have been interviewed, remember which ones are there
		// But first figure out if they seem unnecessary and if they do, which ones should be preserved
		if (
			!multiResponse.identicalCapabilities &&
			areEndpointsUnnecessary(applHost, node, allEndpoints)
		) {
			const preserve = applHost.getDeviceConfig?.(node.id)?.compat
				?.preserveEndpoints;
			if (!preserve) {
				allEndpoints = [];
				applHost.controllerLog.logNode(node.id, {
					message: `Endpoints seem unnecessary b/c they have different device classes, ignoring all...`,
				});
			} else if (preserve === "*") {
				// preserve all endpoints, do nothing
				applHost.controllerLog.logNode(node.id, {
					message: `Endpoints seem unnecessary, but are configured to be preserved.`,
				});
			} else {
				allEndpoints = allEndpoints.filter((ep) =>
					preserve.includes(ep),
				);
				applHost.controllerLog.logNode(node.id, {
					message: `Endpoints seem unnecessary, but endpoints ${allEndpoints.join(
						", ",
					)} are configured to be preserved.`,
				});
			}
		}
		this.setValue(
			applHost,
			MultiChannelCCValues.endpointIndizes,
			allEndpoints,
		);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	private async interviewV1(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Multi Channel"],
			applHost,
			endpoint,
		);
		const valueDB = this.getValueDB(applHost);

		// V1 works the opposite way - we scan all CCs and remember how many
		// endpoints they have
		const supportedCCs = [...node.getCCs()]
			// Don't query CCs the node only controls
			.filter(([, info]) => info.isSupported)
			.map(([cc]) => cc)
			// Don't query CCs that want to skip the endpoint interview
			.filter(
				(cc) =>
					!CommandClass.createInstanceUnchecked(
						applHost,
						node,
						cc,
					)?.skipEndpointInterview(),
			);
		const endpointCounts = new Map<CommandClasses, number>();
		for (const ccId of supportedCCs) {
			applHost.controllerLog.logNode(node.id, {
				message: `Querying endpoint count for CommandClass ${getCCName(
					ccId,
				)}...`,
				direction: "outbound",
			});
			const endpointCount = await api.getEndpointCountV1(ccId);
			if (endpointCount != undefined) {
				endpointCounts.set(ccId, endpointCount);

				applHost.controllerLog.logNode(node.id, {
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
		this.setValue(
			applHost,
			MultiChannelCCValues.endpointCountIsDynamic,
			false,
		);
		this.setValue(
			applHost,
			MultiChannelCCValues.aggregatedEndpointCount,
			0,
		);
		this.setValue(
			applHost,
			MultiChannelCCValues.individualEndpointCount,
			numEndpoints,
		);
		// Since we queried all CCs separately, we can assume that all
		// endpoints have different capabilities
		this.setValue(
			applHost,
			MultiChannelCCValues.endpointsHaveIdenticalCapabilities,
			false,
		);

		for (let endpoint = 1; endpoint <= numEndpoints; endpoint++) {
			// Check which CCs exist on this endpoint
			const endpointCCs = [...endpointCounts.entries()]
				.filter(([, ccEndpoints]) => ccEndpoints >= endpoint)
				.map(([ccId]) => ccId);
			// And store it per endpoint
			valueDB.setValue(
				MultiChannelCCValues.endpointCCs.endpoint(endpoint),
				endpointCCs,
			);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

export interface MultiChannelCCEndPointReportOptions extends CCCommandOptions {
	countIsDynamic: boolean;
	identicalCapabilities: boolean;
	individualCount: number;
	aggregatedCount?: number;
}

@CCCommand(MultiChannelCommand.EndPointReport)
export class MultiChannelCCEndPointReport extends MultiChannelCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCEndPointReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.countIsDynamic = !!(this.payload[0] & 0b10000000);
			this.identicalCapabilities = !!(this.payload[0] & 0b01000000);
			this.individualCount = this.payload[1] & 0b01111111;
			if (this.version >= 4 && this.payload.length >= 3) {
				this.aggregatedCount = this.payload[2] & 0b01111111;
			}
		} else {
			this.countIsDynamic = options.countIsDynamic;
			this.identicalCapabilities = options.identicalCapabilities;
			this.individualCount = options.individualCount;
			this.aggregatedCount = options.aggregatedCount;
		}
	}

	@ccValue(MultiChannelCCValues.endpointCountIsDynamic)
	public countIsDynamic: boolean;

	@ccValue(MultiChannelCCValues.endpointsHaveIdenticalCapabilities)
	public identicalCapabilities: boolean;

	@ccValue(MultiChannelCCValues.individualEndpointCount)
	public individualCount: number;

	@ccValue(MultiChannelCCValues.aggregatedEndpointCount)
	public aggregatedCount: MaybeNotKnown<number>;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.countIsDynamic ? 0b10000000 : 0) |
				(this.identicalCapabilities ? 0b01000000 : 0),
			this.individualCount & 0b01111111,
			this.aggregatedCount ?? 0,
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"endpoint count (individual)": this.individualCount,
			"count is dynamic": this.countIsDynamic,
			"identical capabilities": this.identicalCapabilities,
		};
		if (this.aggregatedCount != undefined) {
			message["endpoint count (aggregated)"] = this.aggregatedCount;
		}
		const ret = {
			...super.toLogEntry(applHost),
			message,
		};
		return ret;
	}
}

@CCCommand(MultiChannelCommand.EndPointGet)
@expectedCCResponse(MultiChannelCCEndPointReport)
export class MultiChannelCCEndPointGet extends MultiChannelCC {}

export interface MultiChannelCCCapabilityReportOptions
	extends CCCommandOptions {
	endpointIndex: number;
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
	isDynamic: boolean;
	wasRemoved: boolean;
}

@CCCommand(MultiChannelCommand.CapabilityReport)
export class MultiChannelCCCapabilityReport
	extends MultiChannelCC
	implements ApplicationNodeInformation
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCCapabilityReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			// Only validate the bytes we expect to see here
			// parseApplicationNodeInformation does its own validation
			validatePayload(this.payload.length >= 1);
			this.endpointIndex = this.payload[0] & 0b01111111;
			this.isDynamic = !!(this.payload[0] & 0b10000000);

			const NIF = parseApplicationNodeInformation(this.payload.slice(1));
			this.genericDeviceClass = NIF.genericDeviceClass;
			this.specificDeviceClass = NIF.specificDeviceClass;
			this.supportedCCs = NIF.supportedCCs;

			// Removal reports have very specific information
			this.wasRemoved =
				this.isDynamic &&
				this.genericDeviceClass === 0xff && // "Non-Interoperable"
				this.specificDeviceClass === 0x00;
		} else {
			this.endpointIndex = options.endpointIndex;
			this.genericDeviceClass = options.genericDeviceClass;
			this.specificDeviceClass = options.specificDeviceClass;
			this.supportedCCs = options.supportedCCs;
			this.isDynamic = options.isDynamic;
			this.wasRemoved = options.wasRemoved;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const deviceClassValue = MultiChannelCCValues.endpointDeviceClass;
		const ccsValue = MultiChannelCCValues.endpointCCs;

		if (this.wasRemoved) {
			this.removeValue(applHost, deviceClassValue);
			this.removeValue(applHost, ccsValue);
		} else {
			this.setValue(applHost, deviceClassValue, {
				generic: this.genericDeviceClass,
				specific: this.specificDeviceClass,
			});
			this.setValue(applHost, ccsValue, this.supportedCCs);
		}
		return true;
	}

	// The endpoint index must be overridden to be able to attribute the information to the correct endpoint
	public readonly genericDeviceClass: number;
	public readonly specificDeviceClass: number;
	public readonly supportedCCs: CommandClasses[];
	public readonly isDynamic: boolean;
	public readonly wasRemoved: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([
				(this.endpointIndex & 0b01111111) |
					(this.isDynamic ? 0b10000000 : 0),
			]),
			encodeApplicationNodeInformation(this),
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const generic = applHost.configManager.lookupGenericDeviceClass(
			this.genericDeviceClass,
		);
		const specific = applHost.configManager.lookupSpecificDeviceClass(
			this.genericDeviceClass,
			this.specificDeviceClass,
		);
		return {
			...super.toLogEntry(applHost),
			message: {
				"endpoint index": this.endpointIndex,
				"generic device class": generic.label,
				"specific device class": specific.label,
				"is dynamic end point": this.isDynamic,
				"supported CCs": this.supportedCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
			},
		};
	}
}

interface MultiChannelCCCapabilityGetOptions extends CCCommandOptions {
	requestedEndpoint: number;
}

function testResponseForMultiChannelCapabilityGet(
	sent: MultiChannelCCCapabilityGet,
	received: MultiChannelCCCapabilityReport,
) {
	return received.endpointIndex === sent.requestedEndpoint;
}

@CCCommand(MultiChannelCommand.CapabilityGet)
@expectedCCResponse(
	MultiChannelCCCapabilityReport,
	testResponseForMultiChannelCapabilityGet,
)
export class MultiChannelCCCapabilityGet extends MultiChannelCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCCapabilityGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.requestedEndpoint = this.payload[0] & 0b01111111;
		} else {
			this.requestedEndpoint = options.requestedEndpoint;
		}
	}

	public requestedEndpoint: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedEndpoint & 0b01111111]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { endpoint: this.requestedEndpoint },
		};
	}
}

export interface MultiChannelCCEndPointFindReportOptions
	extends CCCommandOptions {
	genericClass: number;
	specificClass: number;
	foundEndpoints: number[];
	reportsToFollow: number;
}

@CCCommand(MultiChannelCommand.EndPointFindReport)
export class MultiChannelCCEndPointFindReport extends MultiChannelCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCEndPointFindReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.reportsToFollow = this.payload[0];
			this.genericClass = this.payload[1];
			this.specificClass = this.payload[2];

			// Some devices omit the endpoint list although that is not allowed in the specs
			// therefore don't validatePayload here.
			this.foundEndpoints = [...this.payload.slice(3)]
				.map((e) => e & 0b01111111)
				.filter((e) => e !== 0);
		} else {
			this.genericClass = options.genericClass;
			this.specificClass = options.specificClass;
			this.foundEndpoints = options.foundEndpoints;
			this.reportsToFollow = options.reportsToFollow;
		}
	}

	public genericClass: number;
	public specificClass: number;
	public foundEndpoints: number[];
	public reportsToFollow: number;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([
				this.reportsToFollow,
				this.genericClass,
				this.specificClass,
			]),
			Buffer.from(this.foundEndpoints.map((e) => e & 0b01111111)),
		]);
		return super.serialize();
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the requested device classes
		return {
			genericClass: this.genericClass,
			specificClass: this.specificClass,
		};
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	public mergePartialCCs(
		applHost: ZWaveApplicationHost,
		partials: MultiChannelCCEndPointFindReport[],
	): void {
		// Concat the list of end points
		this.foundEndpoints = [...partials, this]
			.map((report) => report.foundEndpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"generic device class":
					applHost.configManager.lookupGenericDeviceClass(
						this.genericClass,
					).label,
				"specific device class":
					applHost.configManager.lookupSpecificDeviceClass(
						this.genericClass,
						this.specificClass,
					).label,
				"found endpoints": this.foundEndpoints.join(", "),
				"# of reports to follow": this.reportsToFollow,
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCEndPointFindOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.genericClass = this.payload[0];
			this.specificClass = this.payload[1];
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"generic device class":
					applHost.configManager.lookupGenericDeviceClass(
						this.genericClass,
					).label,
				"specific device class":
					applHost.configManager.lookupSpecificDeviceClass(
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.aggregatedEndpointIndex = this.payload[0] & 0b0111_1111;
		const bitMaskLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + bitMaskLength);
		const bitMask = this.payload.slice(2, 2 + bitMaskLength);
		this.members = parseBitMask(bitMask);
	}

	public readonly aggregatedEndpointIndex: number;

	@ccValue(
		MultiChannelCCValues.aggregatedEndpointMembers,
		(self: MultiChannelCCAggregatedMembersReport) =>
			[self.aggregatedEndpointIndex] as const,
	)
	public readonly members: readonly number[];

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"aggregated endpoint": this.aggregatedEndpointIndex,
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCAggregatedMembersGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		return [
			MultiChannelCCCommandEncapsulation,
			MultiChannelCCV1CommandEncapsulation,
		] as any as (typeof MultiChannelCCCommandEncapsulation)[];
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCCommandEncapsulationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			if (
				this.host.getDeviceConfig?.(this.nodeId as number)?.compat
					?.treatDestinationEndpointAsSource
			) {
				// This device incorrectly uses the destination field to indicate the source endpoint
				this.endpointIndex = this.payload[1] & 0b0111_1111;
				this.destination = 0;
			} else {
				// Parse normally
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
			}
			// No need to validate further, each CC does it for itself
			this.encapsulated = CommandClass.from(this.host, {
				data: this.payload.slice(2),
				fromEncapsulation: true,
				encapCC: this,
				origin: options.origin,
				frameType: options.frameType,
			});
		} else {
			this.encapsulated = options.encapsulated;
			options.encapsulated.encapsulatingCC = this as any;
			this.destination = options.destination;

			if (
				this.host.getDeviceConfig?.(this.nodeId as number)?.compat
					?.treatDestinationEndpointAsSource
			) {
				// This device incorrectly responds from the endpoint we've passed as our source endpoint
				if (typeof this.destination === "number")
					this.endpointIndex = this.destination;
			}
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		// V1 won't be extended in the future, so do an exact check
		validatePayload(this.payload.length === 2);
		this.requestedCC = this.payload[0];
		this.endpointCount = this.payload[1];
	}

	public readonly requestedCC: CommandClasses;
	public readonly endpointCount: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCV1GetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { CC: getCCName(this.requestedCC) },
		};
	}
}

function getResponseForV1CommandEncapsulation(
	sent: MultiChannelCCV1CommandEncapsulation,
) {
	if (sent.encapsulated.expectsCCResponse()) {
		return MultiChannelCCV1CommandEncapsulation;
	}
}

function testResponseForV1CommandEncapsulation(
	sent: MultiChannelCCV1CommandEncapsulation,
	received: MultiChannelCCV1CommandEncapsulation,
) {
	if (sent.endpointIndex === received.endpointIndex) {
		return "checkEncapsulated";
	}
	return false;
}

interface MultiChannelCCV1CommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
}

@CCCommand(MultiChannelCommand.CommandEncapsulationV1)
@expectedCCResponse(
	getResponseForV1CommandEncapsulation,
	testResponseForV1CommandEncapsulation,
)
export class MultiChannelCCV1CommandEncapsulation extends MultiChannelCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelCCV1CommandEncapsulationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.endpointIndex = this.payload[0];

			// Some devices send invalid reports, i.e. MultiChannelCCV1CommandEncapsulation, but with V2+ binary format
			// This would be a NoOp CC, but it makes no sense to encapsulate that.
			const isV2withV1Header =
				this.payload.length >= 2 && this.payload[1] === 0x00;

			// No need to validate further, each CC does it for itself
			this.encapsulated = CommandClass.from(this.host, {
				data: this.payload.slice(isV2withV1Header ? 2 : 1),
				fromEncapsulation: true,
				encapCC: this,
				origin: options.origin,
				frameType: options.frameType,
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { source: this.endpointIndex },
		};
	}
}
