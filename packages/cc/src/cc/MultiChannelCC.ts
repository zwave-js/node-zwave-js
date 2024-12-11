import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	type ApplicationNodeInformation,
	CommandClasses,
	type GenericDeviceClass,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SpecificDeviceClass,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	encodeApplicationNodeInformation,
	encodeBitMask,
	getCCName,
	getGenericDeviceClass,
	getSpecificDeviceClass,
	parseApplicationNodeInformation,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import { CCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	getEffectiveCCVersion,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import {
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
} from "../lib/EncapsulatingCommandClass.js";
import { V } from "../lib/Values.js";
import { MultiChannelCommand } from "../lib/_Types.js";

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
	ctx: GetValueDB,
	nodeId: number,
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
		const devClassValueId = MultiChannelCCValues.endpointDeviceClass
			.endpoint(endpoint);
		const deviceClass = ctx.getValueDB(nodeId).getValue<{
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

	// Endpoints are necessary if more than 1 of them has a switch-type device class
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

		const cc = new MultiChannelCCEndPointGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			MultiChannelCCEndPointReport
		>(
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

		const cc = new MultiChannelCCCapabilityGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			requestedEndpoint: endpoint,
		});
		const response = await this.host.sendCommand<
			MultiChannelCCCapabilityReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			const generic = getGenericDeviceClass(
				response.genericDeviceClass,
			);
			const specific = getSpecificDeviceClass(
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

		const cc = new MultiChannelCCEndPointFind({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			genericClass,
			specificClass,
		});
		const response = await this.host.sendCommand<
			MultiChannelCCEndPointFindReport
		>(
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

		const cc = new MultiChannelCCAggregatedMembersGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			requestedEndpoint: endpoint,
		});
		const response = await this.host.sendCommand<
			MultiChannelCCAggregatedMembersReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.members;
	}

	// Encapsulation is used internally and too frequently that we
	// want to pay the cost of validating each call
	// eslint-disable-next-line @zwave-js/ccapi-validate-args
	public async sendEncapsulated(
		options: MultiChannelCCCommandEncapsulationOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CommandEncapsulation,
		);

		const cc = new MultiChannelCCCommandEncapsulation({
			nodeId: this.endpoint.nodeId,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getEndpointCountV1(
		ccId: CommandClasses,
	): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.GetV1,
		);

		const cc = new MultiChannelCCV1Get({
			nodeId: this.endpoint.nodeId,
			requestedCC: ccId,
		});
		const response = await this.host.sendCommand<
			MultiChannelCCV1Report
		>(
			cc,
			this.commandOptions,
		);
		return response?.endpointCount;
	}

	// Encapsulation is used internally and too frequently that we
	// want to pay the cost of validating each call
	// eslint-disable-next-line @zwave-js/ccapi-validate-args
	public async sendEncapsulatedV1(encapsulated: CommandClass): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelCommand,
			MultiChannelCommand.CommandEncapsulationV1,
		);

		const cc = new MultiChannelCCV1CommandEncapsulation({
			nodeId: this.endpoint.nodeId,
			encapsulated,
		});
		await this.host.sendCommand(cc, this.commandOptions);
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
			cc.endpointIndex !== 0
			&& !(cc instanceof MultiChannelCCCommandEncapsulation)
			&& !(cc instanceof MultiChannelCCV1CommandEncapsulation)
		);
	}

	/** Encapsulates a command that targets a specific endpoint, with version 2+ of the Multi Channel CC */
	public static encapsulate(
		cc: CommandClass,
	): MultiChannelCCCommandEncapsulation {
		const ret = new MultiChannelCCCommandEncapsulation({
			nodeId: cc.nodeId,
			encapsulated: cc,
			destination: cc.endpointIndex,
		});

		// Copy the encapsulation flags from the encapsulated command
		ret.encapsulationFlags = cc.encapsulationFlags;

		return ret;
	}

	/** Encapsulates a command that targets a specific endpoint, with version 1 of the Multi Channel CC */
	public static encapsulateV1(
		cc: CommandClass,
	): MultiChannelCCV1CommandEncapsulation {
		const ret = new MultiChannelCCV1CommandEncapsulation({
			nodeId: cc.nodeId,
			encapsulated: cc,
		});

		// Copy the encapsulation flags from the encapsulated command
		ret.encapsulationFlags = cc.encapsulationFlags;

		return ret;
	}

	public skipEndpointInterview(): boolean {
		// The endpoints are discovered by querying the root device
		return true;
	}

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;

		const removeEndpoints = ctx.getDeviceConfig?.(node.id)?.compat
			?.removeEndpoints;
		if (removeEndpoints === "*") {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`Skipping ${this.ccName} interview b/c all endpoints are ignored by the device config file...`,
				direction: "none",
			});
			return;
		}

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Special interview procedure for legacy nodes
		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (ccVersion === 1) return this.interviewV1(ctx);

		const endpoint = node.getEndpoint(this.endpointIndex)!;
		const api = CCAPI.create(
			CommandClasses["Multi Channel"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(ctx);

		// Step 1: Retrieve general information about end points
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying device endpoint information...",
			direction: "outbound",
		});
		const multiResponse = await api.getEndpoints();
		if (!multiResponse) {
			ctx.logNode(node.id, {
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
			logMessage +=
				`\nendpoint count (aggregated): ${multiResponse.aggregatedEndpointCount}`;
		}
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: logMessage,
			direction: "inbound",
		});

		let allEndpoints: number[] = [];
		const addSequentialEndpoints = (): void => {
			for (
				let i = 1;
				i
					<= multiResponse.individualEndpointCount
						+ (multiResponse.aggregatedEndpointCount ?? 0);
				i++
			) {
				allEndpoints.push(i);
			}
		};
		if (api.supportsCommand(MultiChannelCommand.EndPointFind)) {
			// Step 2a: Find all endpoints
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying all endpoints...",
				direction: "outbound",
			});

			const foundEndpoints = await api.findEndpoints(0xff, 0xff);
			if (foundEndpoints) allEndpoints.push(...foundEndpoints);
			if (!allEndpoints.length) {
				// Create a sequential list of endpoints
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`Endpoint query returned no results, assuming that endpoints are sequential`,
					direction: "inbound",
				});
				addSequentialEndpoints();
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `received endpoints: ${
						allEndpoints
							.map(String)
							.join(", ")
					}`,
					direction: "inbound",
				});
			}
		} else {
			// Step 2b: Assume that the endpoints are in sequential order
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`does not support EndPointFind, assuming that endpoints are sequential`,
				direction: "none",
			});
			addSequentialEndpoints();
		}

		// Step 2.5: remove ignored endpoints
		if (removeEndpoints?.length) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`The following endpoints are ignored through the config file: ${
						removeEndpoints.join(
							", ",
						)
					}`,
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
				endpoint > multiResponse.individualEndpointCount
				&& ccVersion >= 4
			) {
				// Find members of aggregated end point
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`querying members of aggregated endpoint #${endpoint}...`,
					direction: "outbound",
				});
				const members = await api.getAggregatedMembers(endpoint);
				if (members) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`aggregated endpoint #${endpoint} has members ${
								members
									.map(String)
									.join(", ")
							}`,
						direction: "inbound",
					});
				}
			}

			// When the device reports identical capabilities for all endpoints,
			// we don't need to query them all
			if (multiResponse.identicalCapabilities && hasQueriedCapabilities) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`all endpoints identical, skipping capability query for endpoint #${endpoint}...`,
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

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying capabilities for endpoint #${endpoint}...`,
				direction: "outbound",
			});
			const caps = await api.getEndpointCapabilities(endpoint);
			if (caps) {
				hasQueriedCapabilities = true;
				logMessage =
					`received response for endpoint capabilities (#${endpoint}):
generic device class:  ${caps.generic.label}
specific device class: ${caps.specific.label}
is dynamic end point:  ${caps.isDynamic}
supported CCs:`;
				for (const cc of caps.supportedCCs) {
					logMessage += `\n  · ${getCCName(cc)}`;
				}
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`Querying endpoint #${endpoint} capabilities timed out, aborting interview...`,
					level: "warn",
				});
				return this.throwMissingCriticalInterviewResponse();
			}
		}

		// Now that all endpoints have been interviewed, remember which ones are there
		// But first figure out if they seem unnecessary and if they do, which ones should be preserved
		if (
			!multiResponse.identicalCapabilities
			&& areEndpointsUnnecessary(ctx, node.id, allEndpoints)
		) {
			const preserve = ctx.getDeviceConfig?.(node.id)?.compat
				?.preserveEndpoints;
			if (!preserve) {
				allEndpoints = [];
				ctx.logNode(node.id, {
					message:
						`Endpoints seem unnecessary b/c they have different device classes, ignoring all...`,
				});
			} else if (preserve === "*") {
				// preserve all endpoints, do nothing
				ctx.logNode(node.id, {
					message:
						`Endpoints seem unnecessary, but are configured to be preserved.`,
				});
			} else {
				allEndpoints = allEndpoints.filter((ep) =>
					preserve.includes(ep)
				);
				ctx.logNode(node.id, {
					message: `Endpoints seem unnecessary, but endpoints ${
						allEndpoints.join(
							", ",
						)
					} are configured to be preserved.`,
				});
			}
		}
		this.setValue(
			ctx,
			MultiChannelCCValues.endpointIndizes,
			allEndpoints,
		);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	private async interviewV1(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Multi Channel"],
			ctx,
			endpoint,
		);
		const valueDB = this.getValueDB(ctx);

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
						node,
						cc,
					)?.skipEndpointInterview(),
			);
		const endpointCounts = new Map<CommandClasses, number>();
		for (const ccId of supportedCCs) {
			ctx.logNode(node.id, {
				message: `Querying endpoint count for CommandClass ${
					getCCName(
						ccId,
					)
				}...`,
				direction: "outbound",
			});
			const endpointCount = await api.getEndpointCountV1(ccId);
			if (endpointCount != undefined) {
				endpointCounts.set(ccId, endpointCount);

				ctx.logNode(node.id, {
					message: `CommandClass ${
						getCCName(
							ccId,
						)
					} has ${endpointCount} endpoints`,
					direction: "inbound",
				});
			}
		}

		// Store the collected information
		// We have only individual and no dynamic and no aggregated endpoints
		const numEndpoints = Math.max(...endpointCounts.values());
		this.setValue(
			ctx,
			MultiChannelCCValues.endpointCountIsDynamic,
			false,
		);
		this.setValue(
			ctx,
			MultiChannelCCValues.aggregatedEndpointCount,
			0,
		);
		this.setValue(
			ctx,
			MultiChannelCCValues.individualEndpointCount,
			numEndpoints,
		);
		// Since we queried all CCs separately, we can assume that all
		// endpoints have different capabilities
		this.setValue(
			ctx,
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
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface MultiChannelCCEndPointReportOptions {
	countIsDynamic: boolean;
	identicalCapabilities: boolean;
	individualCount: number;
	aggregatedCount?: number;
}

@CCCommand(MultiChannelCommand.EndPointReport)
@ccValueProperty("countIsDynamic", MultiChannelCCValues.endpointCountIsDynamic)
@ccValueProperty(
	"identicalCapabilities",
	MultiChannelCCValues.endpointsHaveIdenticalCapabilities,
)
@ccValueProperty(
	"individualCount",
	MultiChannelCCValues.individualEndpointCount,
)
@ccValueProperty(
	"aggregatedCount",
	MultiChannelCCValues.aggregatedEndpointCount,
)
export class MultiChannelCCEndPointReport extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCEndPointReportOptions>,
	) {
		super(options);

		this.countIsDynamic = options.countIsDynamic;
		this.identicalCapabilities = options.identicalCapabilities;
		this.individualCount = options.individualCount;
		this.aggregatedCount = options.aggregatedCount;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCEndPointReport {
		validatePayload(raw.payload.length >= 2);
		const countIsDynamic = !!(raw.payload[0] & 0b10000000);
		const identicalCapabilities = !!(raw.payload[0] & 0b01000000);
		const individualCount = raw.payload[1] & 0b01111111;
		let aggregatedCount: MaybeNotKnown<number>;

		if (raw.payload.length >= 3) {
			aggregatedCount = raw.payload[2] & 0b01111111;
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			countIsDynamic,
			identicalCapabilities,
			individualCount,
			aggregatedCount,
		});
	}

	public countIsDynamic: boolean;

	public identicalCapabilities: boolean;

	public individualCount: number;

	public aggregatedCount: MaybeNotKnown<number>;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([
			(this.countIsDynamic ? 0b10000000 : 0)
			| (this.identicalCapabilities ? 0b01000000 : 0),
			this.individualCount & 0b01111111,
			this.aggregatedCount ?? 0,
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"endpoint count (individual)": this.individualCount,
			"count is dynamic": this.countIsDynamic,
			"identical capabilities": this.identicalCapabilities,
		};
		if (this.aggregatedCount != undefined) {
			message["endpoint count (aggregated)"] = this.aggregatedCount;
		}
		const ret = {
			...super.toLogEntry(ctx),
			message,
		};
		return ret;
	}
}

@CCCommand(MultiChannelCommand.EndPointGet)
@expectedCCResponse(MultiChannelCCEndPointReport)
export class MultiChannelCCEndPointGet extends MultiChannelCC {}

// @publicAPI
export interface MultiChannelCCCapabilityReportOptions {
	endpointIndex: number;
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
	isDynamic: boolean;
	wasRemoved: boolean;
}

@CCCommand(MultiChannelCommand.CapabilityReport)
export class MultiChannelCCCapabilityReport extends MultiChannelCC
	implements ApplicationNodeInformation
{
	public constructor(
		options: WithAddress<MultiChannelCCCapabilityReportOptions>,
	) {
		super(options);

		this.endpointIndex = options.endpointIndex;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.supportedCCs = options.supportedCCs;
		this.isDynamic = options.isDynamic;
		this.wasRemoved = options.wasRemoved;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCCapabilityReport {
		// Only validate the bytes we expect to see here
		// parseApplicationNodeInformation does its own validation
		validatePayload(raw.payload.length >= 1);
		const endpointIndex = raw.payload[0] & 0b01111111;
		const isDynamic = !!(raw.payload[0] & 0b10000000);
		const NIF = parseApplicationNodeInformation(
			raw.payload.subarray(1),
		);
		const genericDeviceClass = NIF.genericDeviceClass;
		const specificDeviceClass = NIF.specificDeviceClass;
		const supportedCCs: CommandClasses[] = NIF.supportedCCs;

		// Removal reports have very specific information
		const wasRemoved: boolean = isDynamic
			&& genericDeviceClass === 0xff // "Non-Interoperable"
			&& specificDeviceClass === 0x00;

		return new this({
			nodeId: ctx.sourceNodeId,
			endpointIndex,
			isDynamic,
			genericDeviceClass,
			specificDeviceClass,
			supportedCCs,
			wasRemoved,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		const deviceClassValue = MultiChannelCCValues.endpointDeviceClass;
		const ccsValue = MultiChannelCCValues.endpointCCs;

		if (this.wasRemoved) {
			this.removeValue(ctx, deviceClassValue);
			this.removeValue(ctx, ccsValue);
		} else {
			this.setValue(ctx, deviceClassValue, {
				generic: this.genericDeviceClass,
				specific: this.specificDeviceClass,
			});
			this.setValue(ctx, ccsValue, this.supportedCCs);
		}
		return true;
	}

	// The endpoint index must be overridden to be able to attribute the information to the correct endpoint
	public readonly genericDeviceClass: number;
	public readonly specificDeviceClass: number;
	public readonly supportedCCs: CommandClasses[];
	public readonly isDynamic: boolean;
	public readonly wasRemoved: boolean;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([
				(this.endpointIndex & 0b01111111)
				| (this.isDynamic ? 0b10000000 : 0),
			]),
			encodeApplicationNodeInformation(this),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"endpoint index": this.endpointIndex,
				"generic device class": getGenericDeviceClass(
					this.genericDeviceClass,
				).label,
				"specific device class": getSpecificDeviceClass(
					this.genericDeviceClass,
					this.specificDeviceClass,
				).label,
				"is dynamic end point": this.isDynamic,
				"supported CCs": this.supportedCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
			},
		};
	}
}

// @publicAPI
export interface MultiChannelCCCapabilityGetOptions {
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
		options: WithAddress<MultiChannelCCCapabilityGetOptions>,
	) {
		super(options);
		this.requestedEndpoint = options.requestedEndpoint;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCCapabilityGet {
		validatePayload(raw.payload.length >= 1);
		const requestedEndpoint = raw.payload[0] & 0b01111111;

		return new this({
			nodeId: ctx.sourceNodeId,
			requestedEndpoint,
		});
	}

	public requestedEndpoint: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.requestedEndpoint & 0b01111111]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { endpoint: this.requestedEndpoint },
		};
	}
}

// @publicAPI
export interface MultiChannelCCEndPointFindReportOptions {
	genericClass: number;
	specificClass: number;
	foundEndpoints: number[];
	reportsToFollow: number;
}

@CCCommand(MultiChannelCommand.EndPointFindReport)
export class MultiChannelCCEndPointFindReport extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCEndPointFindReportOptions>,
	) {
		super(options);

		this.genericClass = options.genericClass;
		this.specificClass = options.specificClass;
		this.foundEndpoints = options.foundEndpoints;
		this.reportsToFollow = options.reportsToFollow;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCEndPointFindReport {
		validatePayload(raw.payload.length >= 3);
		const reportsToFollow = raw.payload[0];
		const genericClass = raw.payload[1];
		const specificClass = raw.payload[2];

		// Some devices omit the endpoint list although that is not allowed in the specs
		// therefore don't validatePayload here.
		const foundEndpoints = [...raw.payload.subarray(3)]
			.map((e) => e & 0b01111111)
			.filter((e) => e !== 0);

		return new this({
			nodeId: ctx.sourceNodeId,
			reportsToFollow,
			genericClass,
			specificClass,
			foundEndpoints,
		});
	}

	public genericClass: number;
	public specificClass: number;
	public foundEndpoints: number[];
	public reportsToFollow: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([
				this.reportsToFollow,
				this.genericClass,
				this.specificClass,
			]),
			Bytes.from(this.foundEndpoints.map((e) => e & 0b01111111)),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
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

	/** @deprecated Use {@link mergePartialCCsAsync} instead */
	public mergePartialCCs(
		partials: MultiChannelCCEndPointFindReport[],
		_ctx: CCParsingContext,
	): void {
		// Concat the list of end points
		this.foundEndpoints = [...partials, this]
			.map((report) => report.foundEndpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public mergePartialCCsAsync(
		partials: MultiChannelCCEndPointFindReport[],
		_ctx: CCParsingContext,
	): Promise<void> {
		// Concat the list of end points
		this.foundEndpoints = [...partials, this]
			.map((report) => report.foundEndpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);
		return Promise.resolve();
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"generic device class": getGenericDeviceClass(
					this.genericClass,
				).label,
				"specific device class": getSpecificDeviceClass(
					this.genericClass,
					this.specificClass,
				).label,
				"found endpoints": this.foundEndpoints.join(", "),
				"# of reports to follow": this.reportsToFollow,
			},
		};
	}
}

// @publicAPI
export interface MultiChannelCCEndPointFindOptions {
	genericClass: number;
	specificClass: number;
}

@CCCommand(MultiChannelCommand.EndPointFind)
@expectedCCResponse(MultiChannelCCEndPointFindReport)
export class MultiChannelCCEndPointFind extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCEndPointFindOptions>,
	) {
		super(options);
		this.genericClass = options.genericClass;
		this.specificClass = options.specificClass;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCEndPointFind {
		validatePayload(raw.payload.length >= 2);
		const genericClass = raw.payload[0];
		const specificClass = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			genericClass,
			specificClass,
		});
	}

	public genericClass: number;
	public specificClass: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.genericClass, this.specificClass]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"generic device class":
					getGenericDeviceClass(this.genericClass).label,
				"specific device class": getSpecificDeviceClass(
					this.genericClass,
					this.specificClass,
				).label,
			},
		};
	}
}

// @publicAPI
export interface MultiChannelCCAggregatedMembersReportOptions {
	aggregatedEndpointIndex: number;
	members: number[];
}

@CCCommand(MultiChannelCommand.AggregatedMembersReport)
@ccValueProperty(
	"members",
	MultiChannelCCValues.aggregatedEndpointMembers,
	(self) => [self.aggregatedEndpointIndex],
)
export class MultiChannelCCAggregatedMembersReport extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCAggregatedMembersReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.aggregatedEndpointIndex = options.aggregatedEndpointIndex;
		this.members = options.members;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCAggregatedMembersReport {
		validatePayload(raw.payload.length >= 2);
		const aggregatedEndpointIndex = raw.payload[0] & 0b0111_1111;
		const bitMaskLength = raw.payload[1];
		validatePayload(raw.payload.length >= 2 + bitMaskLength);
		const bitMask = raw.payload.subarray(2, 2 + bitMaskLength);
		const members = parseBitMask(bitMask);

		return new this({
			nodeId: ctx.sourceNodeId,
			aggregatedEndpointIndex,
			members,
		});
	}

	public readonly aggregatedEndpointIndex: number;

	public readonly members: readonly number[];

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"aggregated endpoint": this.aggregatedEndpointIndex,
				members: this.members.join(", "),
			},
		};
	}
}

// @publicAPI
export interface MultiChannelCCAggregatedMembersGetOptions {
	requestedEndpoint: number;
}

@CCCommand(MultiChannelCommand.AggregatedMembersGet)
@expectedCCResponse(MultiChannelCCAggregatedMembersReport)
export class MultiChannelCCAggregatedMembersGet extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCAggregatedMembersGetOptions>,
	) {
		super(options);
		this.requestedEndpoint = options.requestedEndpoint;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): MultiChannelCCAggregatedMembersGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new MultiChannelCCAggregatedMembersGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public requestedEndpoint: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.requestedEndpoint & 0b0111_1111]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { endpoint: this.requestedEndpoint },
		};
	}
}

type MultiChannelCCDestination = number | (1 | 2 | 3 | 4 | 5 | 6 | 7)[];

// @publicAPI
export interface MultiChannelCCCommandEncapsulationOptions {
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
		typeof sent.destination === "number"
		&& sent.encapsulated.expectsCCResponse()
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
		typeof sent.destination === "number"
		&& sent.destination === received.endpointIndex
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
		options: WithAddress<MultiChannelCCCommandEncapsulationOptions>,
	) {
		super(options);
		this.encapsulated = options.encapsulated;
		this.encapsulated.encapsulatingCC = this as any;
		// Propagate the endpoint index all the way down
		let cur: CommandClass = this;
		while (cur) {
			if (isMultiEncapsulatingCommandClass(cur)) {
				for (const cc of cur.encapsulated) {
					cc.endpointIndex = this.endpointIndex;
				}
				break;
			} else if (isEncapsulatingCommandClass(cur)) {
				cur.encapsulated.endpointIndex = this.endpointIndex;
				cur = cur.encapsulated;
			} else {
				break;
			}
		}
		this.destination = options.destination;
	}

	/** @deprecated Use {@link fromAsync} instead */
	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCCommandEncapsulation {
		validatePayload(raw.payload.length >= 2);

		let endpointIndex: number;
		let destination: MultiChannelCCDestination;

		if (
			ctx.getDeviceConfig?.(ctx.sourceNodeId)
				?.compat?.treatDestinationEndpointAsSource
		) {
			// This device incorrectly uses the destination field to indicate the source endpoint
			endpointIndex = raw.payload[1] & 0b0111_1111;
			destination = 0;
		} else {
			// Parse normally
			endpointIndex = raw.payload[0] & 0b0111_1111;
			const isBitMask = !!(raw.payload[1] & 0b1000_0000);
			destination = raw.payload[1] & 0b0111_1111;
			if (isBitMask) {
				destination = parseBitMask(
					Bytes.from([destination]),
				) as any;
			}
		}
		// No need to validate further, each CC does it for itself
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const encapsulated = CommandClass.parse(raw.payload.subarray(2), ctx);
		return new this({
			nodeId: ctx.sourceNodeId,
			endpointIndex,
			destination,
			encapsulated,
		});
	}

	public static async fromAsync(
		raw: CCRaw,
		ctx: CCParsingContext,
	): Promise<MultiChannelCCCommandEncapsulation> {
		validatePayload(raw.payload.length >= 2);

		let endpointIndex: number;
		let destination: MultiChannelCCDestination;

		if (
			ctx.getDeviceConfig?.(ctx.sourceNodeId)
				?.compat?.treatDestinationEndpointAsSource
		) {
			// This device incorrectly uses the destination field to indicate the source endpoint
			endpointIndex = raw.payload[1] & 0b0111_1111;
			destination = 0;
		} else {
			// Parse normally
			endpointIndex = raw.payload[0] & 0b0111_1111;
			const isBitMask = !!(raw.payload[1] & 0b1000_0000);
			destination = raw.payload[1] & 0b0111_1111;
			if (isBitMask) {
				destination = parseBitMask(
					Bytes.from([destination]),
				) as any;
			}
		}
		// No need to validate further, each CC does it for itself
		const encapsulated = await CommandClass.parseAsync(
			raw.payload.subarray(2),
			ctx,
		);
		return new this({
			nodeId: ctx.sourceNodeId,
			endpointIndex,
			destination,
			encapsulated,
		});
	}

	public encapsulated: CommandClass;
	/** The destination end point (0-127) or an array of destination end points (1-7) */
	public destination: MultiChannelCCDestination;

	/** @deprecated Use {@link serializeAsync} instead */
	public serialize(ctx: CCEncodingContext): Bytes {
		if (
			ctx.getDeviceConfig?.(this.nodeId as number)?.compat
				?.treatDestinationEndpointAsSource
		) {
			// This device incorrectly responds from the endpoint we've passed as our source endpoint
			if (typeof this.destination === "number") {
				this.endpointIndex = this.destination;
			}
		}

		const destination = typeof this.destination === "number"
			// The destination is a single number
			? this.destination & 0b0111_1111
			// The destination is a bit mask
			: encodeBitMask(this.destination, 7)[0] | 0b1000_0000;
		this.payload = Bytes.concat([
			Bytes.from([this.endpointIndex & 0b0111_1111, destination]),
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.encapsulated.serialize(ctx),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public async serializeAsync(ctx: CCEncodingContext): Promise<Bytes> {
		if (
			ctx.getDeviceConfig?.(this.nodeId as number)?.compat
				?.treatDestinationEndpointAsSource
		) {
			// This device incorrectly responds from the endpoint we've passed as our source endpoint
			if (typeof this.destination === "number") {
				this.endpointIndex = this.destination;
			}
		}

		const destination = typeof this.destination === "number"
			// The destination is a single number
			? this.destination & 0b0111_1111
			// The destination is a bit mask
			: encodeBitMask(this.destination, 7)[0] | 0b1000_0000;
		this.payload = Bytes.concat([
			Bytes.from([this.endpointIndex & 0b0111_1111, destination]),
			await this.encapsulated.serializeAsync(ctx),
		]);
		return super.serializeAsync(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				source: this.endpointIndex,
				destination: typeof this.destination === "number"
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

// @publicAPI
export interface MultiChannelCCV1ReportOptions {
	requestedCC: CommandClasses;
	endpointCount: number;
}

@CCCommand(MultiChannelCommand.ReportV1)
export class MultiChannelCCV1Report extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCV1ReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.requestedCC = options.requestedCC;
		this.endpointCount = options.endpointCount;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCV1Report {
		// V1 won't be extended in the future, so do an exact check
		validatePayload(raw.payload.length === 2);
		const requestedCC: CommandClasses = raw.payload[0];
		const endpointCount = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			requestedCC,
			endpointCount,
		});
	}

	public readonly requestedCC: CommandClasses;
	public readonly endpointCount: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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

// @publicAPI
export interface MultiChannelCCV1GetOptions {
	requestedCC: CommandClasses;
}

@CCCommand(MultiChannelCommand.GetV1)
@expectedCCResponse(MultiChannelCCV1Report, testResponseForMultiChannelV1Get)
export class MultiChannelCCV1Get extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCV1GetOptions>,
	) {
		super(options);
		this.requestedCC = options.requestedCC;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): MultiChannelCCV1Get {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new MultiChannelCCV1Get({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public requestedCC: CommandClasses;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.requestedCC]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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

// @publicAPI
export interface MultiChannelCCV1CommandEncapsulationOptions {
	encapsulated: CommandClass;
}

@CCCommand(MultiChannelCommand.CommandEncapsulationV1)
@expectedCCResponse(
	getResponseForV1CommandEncapsulation,
	testResponseForV1CommandEncapsulation,
)
export class MultiChannelCCV1CommandEncapsulation extends MultiChannelCC {
	public constructor(
		options: WithAddress<MultiChannelCCV1CommandEncapsulationOptions>,
	) {
		super(options);
		this.encapsulated = options.encapsulated;
		// No need to distinguish between source and destination in V1
		this.endpointIndex = this.encapsulated.endpointIndex;
	}

	/** @deprecated Use {@link fromAsync} instead */
	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelCCV1CommandEncapsulation {
		validatePayload(raw.payload.length >= 1);
		const endpointIndex = raw.payload[0];

		// Some devices send invalid reports, i.e. MultiChannelCCV1CommandEncapsulation, but with V2+ binary format
		// This would be a NoOp CC, but it makes no sense to encapsulate that.
		const isV2withV1Header = raw.payload.length >= 2
			&& raw.payload[1] === 0x00;

		// No need to validate further, each CC does it for itself
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const encapsulated = CommandClass.parse(
			raw.payload.subarray(isV2withV1Header ? 2 : 1),
			ctx,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			endpointIndex,
			encapsulated,
		});
	}

	public static async fromAsync(
		raw: CCRaw,
		ctx: CCParsingContext,
	): Promise<MultiChannelCCV1CommandEncapsulation> {
		validatePayload(raw.payload.length >= 1);
		const endpointIndex = raw.payload[0];

		// Some devices send invalid reports, i.e. MultiChannelCCV1CommandEncapsulation, but with V2+ binary format
		// This would be a NoOp CC, but it makes no sense to encapsulate that.
		const isV2withV1Header = raw.payload.length >= 2
			&& raw.payload[1] === 0x00;

		// No need to validate further, each CC does it for itself
		const encapsulated = await CommandClass.parseAsync(
			raw.payload.subarray(isV2withV1Header ? 2 : 1),
			ctx,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			endpointIndex,
			encapsulated,
		});
	}

	public encapsulated!: CommandClass;

	/** @deprecated Use {@link serializeAsync} instead */
	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([this.endpointIndex]),
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.encapsulated.serialize(ctx),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public async serializeAsync(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			Bytes.from([this.endpointIndex]),
			await this.encapsulated.serializeAsync(ctx),
		]);
		return super.serializeAsync(ctx);
	}

	protected computeEncapsulationOverhead(): number {
		// Multi Channel CC V1 adds one byte for the endpoint index
		return super.computeEncapsulationOverhead() + 1;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { source: this.endpointIndex },
		};
	}
}
