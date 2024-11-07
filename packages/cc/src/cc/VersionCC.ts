import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	SecurityClass,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLibraryTypes,
	enumValuesToMetadataStates,
	getCCName,
	securityClassIsS2,
	securityClassOrder,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	getImplementedVersion,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { VersionCommand } from "../lib/_Types.js";

export const VersionCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Version, {
		...V.staticProperty(
			"firmwareVersions",
			{
				...ValueMetadata.ReadOnly,
				type: "string[]",
				label: "Z-Wave chip firmware versions",
			} as const,
			{ supportsEndpoints: false },
		),

		...V.staticProperty(
			"libraryType",
			{
				...ValueMetadata.ReadOnlyNumber,
				label: "Library type",
				states: enumValuesToMetadataStates(ZWaveLibraryTypes),
			} as const,
			{ supportsEndpoints: false },
		),

		...V.staticProperty(
			"protocolVersion",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave protocol version",
			} as const,
			{ supportsEndpoints: false },
		),

		...V.staticProperty(
			"hardwareVersion",
			{
				...ValueMetadata.ReadOnlyNumber,
				label: "Z-Wave chip hardware version",
			} as const,
			{
				minVersion: 2,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"supportsZWaveSoftwareGet",
			undefined,
			{
				minVersion: 3,
				internal: true,
			} as const,
		),

		...V.staticProperty(
			"sdkVersion",
			{
				...ValueMetadata.ReadOnlyString,
				label: "SDK version",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"applicationFrameworkAPIVersion",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave application framework API version",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"applicationFrameworkBuildNumber",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave application framework API build number",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticPropertyWithName(
			"serialAPIVersion",
			"hostInterfaceVersion",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Serial API version",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticPropertyWithName(
			"serialAPIBuildNumber",
			"hostInterfaceBuildNumber",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Serial API build number",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"zWaveProtocolVersion",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave protocol version",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"zWaveProtocolBuildNumber",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave protocol build number",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"applicationVersion",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Application version",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),

		...V.staticProperty(
			"applicationBuildNumber",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Application build number",
			} as const,
			{
				minVersion: 3,
				supportsEndpoints: false,
			} as const,
		),
	}),
});

function parseVersion(buffer: Uint8Array): string {
	if (buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 0) return "unused";
	return `${buffer[0]}.${buffer[1]}.${buffer[2]}`;
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses.Version)
export class VersionCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: VersionCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case VersionCommand.Get:
			case VersionCommand.Report:
			case VersionCommand.CommandClassGet:
			case VersionCommand.CommandClassReport:
				return true; // This is mandatory

			case VersionCommand.CapabilitiesGet:
			case VersionCommand.CapabilitiesReport:
			case VersionCommand.ZWaveSoftwareReport:
				return this.version >= 3;

			case VersionCommand.ZWaveSoftwareGet: {
				return this.getValueDB().getValue<boolean>(
					VersionCCValues.supportsZWaveSoftwareGet.endpoint(
						this.endpoint.index,
					),
				);
			}
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(VersionCommand, VersionCommand.Get);

		const cc = new VersionCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<VersionCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"libraryType",
				"protocolVersion",
				"firmwareVersions",
				"hardwareVersion",
			]);
		}
	}

	@validateArgs()
	public async sendReport(options: VersionCCReportOptions): Promise<void> {
		this.assertSupportsCommand(VersionCommand, VersionCommand.Report);

		const cc = new VersionCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getCCVersion(
		requestedCC: CommandClasses,
	): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CommandClassGet,
		);

		const cc = new VersionCCCommandClassGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			requestedCC,
		});
		const response = await this.host.sendCommand<
			VersionCCCommandClassReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.ccVersion;
	}

	@validateArgs()
	public async reportCCVersion(requestedCC: CommandClasses): Promise<void> {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CommandClassReport,
		);

		let ccVersion: number;
		switch (requestedCC) {
			case CommandClasses["Z-Wave Protocol"]:
			case CommandClasses["Z-Wave Long Range"]:
				// These two are only for internal use
				ccVersion = 0;
				break;
			case CommandClasses.Hail:
			case CommandClasses["Manufacturer Proprietary"]:
				// These CCs are obsolete, we cannot enter them in the certification portal
				// but not doing so fails a certification test. Just respond that they
				// are not supported or controlled
				ccVersion = 0;
				break;

			default:
				ccVersion = getImplementedVersion(requestedCC);
				break;
		}

		const cc = new VersionCCCommandClassReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			requestedCC,
			ccVersion,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities() {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CapabilitiesGet,
		);

		const cc = new VersionCCCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			VersionCCCapabilitiesReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["supportsZWaveSoftwareGet"]);
		}
	}

	public async reportCapabilities(): Promise<void> {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CapabilitiesReport,
		);

		const cc = new VersionCCCapabilitiesReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			// At this time, we do not support responding to Z-Wave Software Get
			supportsZWaveSoftwareGet: false,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getZWaveSoftware() {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.ZWaveSoftwareGet,
		);

		const cc = new VersionCCZWaveSoftwareGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			VersionCCZWaveSoftwareReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"sdkVersion",
				"applicationFrameworkAPIVersion",
				"applicationFrameworkBuildNumber",
				"hostInterfaceVersion",
				"hostInterfaceBuildNumber",
				"zWaveProtocolVersion",
				"zWaveProtocolBuildNumber",
				"applicationVersion",
				"applicationBuildNumber",
			]);
		}
	}
}

@commandClass(CommandClasses.Version)
@implementedVersion(3)
@ccValues(VersionCCValues)
export class VersionCC extends CommandClass {
	declare ccCommand: VersionCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// VersionCC must be the 2nd CC after ManufacturerSpecificCC
		return [CommandClasses["Manufacturer Specific"]];
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		// SDS13782: In a Multi Channel device, the Version Command Class MUST be supported by the Root Device, while
		// the Version Command Class SHOULD NOT be supported by individual End Points.
		//
		// There may be cases where a given Command Class is not implemented by the Root Device of a Multi
		// Channel device. However, the Root Device MUST respond to Version requests for any Command Class
		// implemented by the Multi Channel device; also in cases where the actual Command Class is only
		// provided by an End Point.

		const endpoint = this.getEndpoint(ctx)!;

		// Use the CC API of the root device for all queries
		const api = CCAPI.create(
			CommandClasses.Version,
			ctx,
			node,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const queryCCVersion = async (cc: CommandClasses): Promise<void> => {
			// Only query CCs we support. Theoretically we could skip queries where we support only V1,
			// but there are Z-Wave certification tests that require us to query all CCs
			const maxImplemented = getImplementedVersion(cc);
			if (maxImplemented === 0) {
				ctx.logNode(
					node.id,
					`  skipping query for ${CommandClasses[cc]} (${
						num2hex(
							cc,
						)
					}) because max implemented version is ${maxImplemented}`,
				);
				return;
			}

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `  querying the CC version for ${getCCName(cc)}...`,
				direction: "outbound",
			});
			// query the CC version
			const supportedVersion = await api.getCCVersion(cc);
			if (supportedVersion != undefined) {
				// Remember which CC version this endpoint supports
				let logMessage: string;
				if (supportedVersion > 0) {
					// Basic CC has special rules for when it is considered supported
					// Therefore we mark all other CCs as supported, but not Basic CC,
					// for which support is determined later.
					if (cc === CommandClasses.Basic) {
						endpoint.addCC(cc, { version: supportedVersion });
					} else {
						endpoint.addCC(cc, {
							isSupported: true,
							version: supportedVersion,
						});
					}
					logMessage = `  supports CC ${CommandClasses[cc]} (${
						num2hex(cc)
					}) in version ${supportedVersion}`;
				} else {
					// We were lied to - the NIF said this CC is supported, now the node claims it isn't
					// Make sure this is not a critical CC, which must be supported though

					if (
						cc === CommandClasses.Version
						|| cc === CommandClasses["Manufacturer Specific"]
					) {
						logMessage = `  claims NOT to support CC ${
							CommandClasses[cc]
						} (${num2hex(cc)}), but it must. Assuming the ${
							this.endpointIndex === 0 ? "node" : "endpoint"
						} supports version 1...`;
						endpoint.addCC(cc, { version: 1 });
					} else if (
						(cc === CommandClasses.Security
							&& node.hasSecurityClass(SecurityClass.S0_Legacy))
						|| (cc === CommandClasses["Security 2"]
							&& securityClassOrder.some((sc) =>
								securityClassIsS2(sc)
								&& node.hasSecurityClass(sc)
							))
					) {
						logMessage = `  claims NOT to support CC ${
							CommandClasses[cc]
						} (${
							num2hex(cc)
						}), but it is known to support it. Assuming the ${
							this.endpointIndex === 0 ? "node" : "endpoint"
						} supports version 1...`;
						endpoint.addCC(cc, { version: 1 });
					} else {
						logMessage = `  does NOT support CC ${
							CommandClasses[cc]
						} (${num2hex(cc)})`;
						endpoint.removeCC(cc);
					}
				}

				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
				});
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `CC version query for ${
						getCCName(
							cc,
						)
					} timed out - assuming the ${
						this.endpointIndex === 0 ? "node" : "endpoint"
					} supports version 1...`,
					level: "warn",
				});
				endpoint.addCC(cc, { version: 1 });
			}
		};

		// Version information should not change (except for firmware updates)
		// And it is only relevant on the root endpoint (the node)
		if (this.endpointIndex === 0) {
			// Step 1: Query Version CC version
			await queryCCVersion(CommandClasses.Version);

			// Step 2: Query node versions
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying node versions...",
				direction: "outbound",
			});
			const versionGetResponse = await api.get();
			if (versionGetResponse) {
				let logMessage = `received response for node versions:
  library type:      ${ZWaveLibraryTypes[versionGetResponse.libraryType]} (${
					num2hex(versionGetResponse.libraryType)
				})
  protocol version:  ${versionGetResponse.protocolVersion}
  firmware versions: ${versionGetResponse.firmwareVersions.join(", ")}`;
				if (versionGetResponse.hardwareVersion != undefined) {
					logMessage +=
						`\n  hardware version:  ${versionGetResponse.hardwareVersion}`;
				}
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Step 3: Query all other CC versions
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying CC versions...",
			direction: "outbound",
		});
		// Basic CC is not included in the NIF, so it won't be returned by endpoint.getCCs() at this point
		{
			const cc = CommandClasses.Basic;
			// Skip the query of endpoint CCs that are also supported by the root device
			if (this.endpointIndex === 0 || node.getCCVersion(cc) === 0) {
				await queryCCVersion(cc);
			}
		}
		for (const [cc] of endpoint.getCCs()) {
			// We already queried the Version CC version at the start of this interview
			if (cc === CommandClasses.Version) continue;
			// And we queried Basic CC just before this
			if (cc === CommandClasses.Basic) continue;
			// Skip the query of endpoint CCs that are also supported by the root device
			if (this.endpointIndex > 0 && node.getCCVersion(cc) > 0) continue;
			await queryCCVersion(cc);
		}

		// Step 4: Query VersionCC capabilities (root device only)
		if (this.endpointIndex === 0 && api.version >= 3) {
			// Step 4a: Support for SoftwareGet
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying if Z-Wave Software Get is supported...",
				direction: "outbound",
			});
			const capsResponse = await api.getCapabilities();
			if (capsResponse) {
				const { supportsZWaveSoftwareGet } = capsResponse;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Z-Wave Software Get is${
						supportsZWaveSoftwareGet ? "" : " not"
					} supported`,
					direction: "inbound",
				});

				if (supportsZWaveSoftwareGet) {
					// Step 4b: Query Z-Wave Software versions
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "querying Z-Wave software versions...",
						direction: "outbound",
					});
					await api.getZWaveSoftware();
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "received Z-Wave software versions",
						direction: "inbound",
					});
				}
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface VersionCCReportOptions {
	libraryType: ZWaveLibraryTypes;
	protocolVersion: string;
	firmwareVersions: string[];
	hardwareVersion?: number;
}

@CCCommand(VersionCommand.Report)
@ccValueProperty("libraryType", VersionCCValues.libraryType)
@ccValueProperty("protocolVersion", VersionCCValues.protocolVersion)
@ccValueProperty("firmwareVersions", VersionCCValues.firmwareVersions)
@ccValueProperty("hardwareVersion", VersionCCValues.hardwareVersion)
export class VersionCCReport extends VersionCC {
	public constructor(
		options: WithAddress<VersionCCReportOptions>,
	) {
		super(options);

		if (!/^\d+\.\d+(\.\d+)?$/.test(options.protocolVersion)) {
			throw new ZWaveError(
				`protocolVersion must be a string in the format "major.minor" or "major.minor.patch", received "${options.protocolVersion}"`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (
			!options.firmwareVersions.every((fw) =>
				/^\d+\.\d+(\.\d+)?$/.test(fw)
			)
		) {
			throw new ZWaveError(
				`firmwareVersions must be an array of strings in the format "major.minor" or "major.minor.patch", received "${
					JSON.stringify(
						options.firmwareVersions,
					)
				}"`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.libraryType = options.libraryType;
		this.protocolVersion = options.protocolVersion;
		this.firmwareVersions = options.firmwareVersions;
		this.hardwareVersion = options.hardwareVersion;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): VersionCCReport {
		validatePayload(raw.payload.length >= 5);
		const libraryType: ZWaveLibraryTypes = raw.payload[0];
		const protocolVersion = `${raw.payload[1]}.${raw.payload[2]}`;
		const firmwareVersions = [`${raw.payload[3]}.${raw.payload[4]}`];

		let hardwareVersion: number | undefined;
		if (raw.payload.length >= 7) {
			// V2+
			hardwareVersion = raw.payload[5];
			const additionalFirmwares = raw.payload[6];
			validatePayload(
				raw.payload.length >= 7 + 2 * additionalFirmwares,
			);
			for (let i = 0; i < additionalFirmwares; i++) {
				firmwareVersions.push(
					`${raw.payload[7 + 2 * i]}.${raw.payload[7 + 2 * i + 1]}`,
				);
			}
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			libraryType,
			protocolVersion,
			firmwareVersions,
			hardwareVersion,
		});
	}

	public readonly libraryType: ZWaveLibraryTypes;

	public readonly protocolVersion: string;

	public readonly firmwareVersions: string[];

	public readonly hardwareVersion: number | undefined;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([
			this.libraryType,
			...this.protocolVersion
				.split(".")
				.map((n) => parseInt(n))
				.slice(0, 2),
			...this.firmwareVersions[0]
				.split(".")
				.map((n) => parseInt(n))
				.slice(0, 2),
			this.hardwareVersion ?? 0x00,
			this.firmwareVersions.length - 1,
		]);

		if (this.firmwareVersions.length > 1) {
			const firmwaresBuffer = new Bytes(
				(this.firmwareVersions.length - 1) * 2,
			);
			for (let i = 1; i < this.firmwareVersions.length; i++) {
				const [major, minor] = this.firmwareVersions[i]
					.split(".")
					.map((n) => parseInt(n));
				firmwaresBuffer[2 * (i - 1)] = major;
				firmwaresBuffer[2 * (i - 1) + 1] = minor;
			}
			this.payload = Bytes.concat([this.payload, firmwaresBuffer]);
		}

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"library type": getEnumMemberName(
				ZWaveLibraryTypes,
				this.libraryType,
			),
			"protocol version": this.protocolVersion,
			"firmware versions": this.firmwareVersions.join(", "),
		};
		if (this.hardwareVersion != undefined) {
			message["hardware version"] = this.hardwareVersion;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(VersionCommand.Get)
@expectedCCResponse(VersionCCReport)
export class VersionCCGet extends VersionCC {}

// @publicAPI
export interface VersionCCCommandClassReportOptions {
	requestedCC: CommandClasses;
	ccVersion: number;
}

@CCCommand(VersionCommand.CommandClassReport)
export class VersionCCCommandClassReport extends VersionCC {
	public constructor(
		options: WithAddress<VersionCCCommandClassReportOptions>,
	) {
		super(options);
		this.requestedCC = options.requestedCC;
		this.ccVersion = options.ccVersion;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): VersionCCCommandClassReport {
		validatePayload(raw.payload.length >= 2);
		const requestedCC: CommandClasses = raw.payload[0];
		const ccVersion = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			requestedCC,
			ccVersion,
		});
	}

	public ccVersion: number;
	public requestedCC: CommandClasses;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.requestedCC, this.ccVersion]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				CC: getCCName(this.requestedCC),
				version: this.ccVersion,
			},
		};
	}
}

// @publicAPI
export interface VersionCCCommandClassGetOptions {
	requestedCC: CommandClasses;
}

function testResponseForVersionCommandClassGet(
	sent: VersionCCCommandClassGet,
	received: VersionCCCommandClassReport,
) {
	// We expect a Version CommandClass Report that matches the requested CC
	return sent.requestedCC === received.requestedCC;
}

@CCCommand(VersionCommand.CommandClassGet)
@expectedCCResponse(
	VersionCCCommandClassReport,
	testResponseForVersionCommandClassGet,
)
export class VersionCCCommandClassGet extends VersionCC {
	public constructor(
		options: WithAddress<VersionCCCommandClassGetOptions>,
	) {
		super(options);
		this.requestedCC = options.requestedCC;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): VersionCCCommandClassGet {
		validatePayload(raw.payload.length >= 1);
		const requestedCC: CommandClasses = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			requestedCC,
		});
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

// @publicAPI
export interface VersionCCCapabilitiesReportOptions {
	supportsZWaveSoftwareGet: boolean;
}

@CCCommand(VersionCommand.CapabilitiesReport)
@ccValueProperty(
	"supportsZWaveSoftwareGet",
	VersionCCValues.supportsZWaveSoftwareGet,
)
export class VersionCCCapabilitiesReport extends VersionCC {
	public constructor(
		options: WithAddress<VersionCCCapabilitiesReportOptions>,
	) {
		super(options);

		this.supportsZWaveSoftwareGet = options.supportsZWaveSoftwareGet;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): VersionCCCapabilitiesReport {
		validatePayload(raw.payload.length >= 1);
		const capabilities = raw.payload[0];
		const supportsZWaveSoftwareGet = !!(capabilities & 0b100);

		return new this({
			nodeId: ctx.sourceNodeId,
			supportsZWaveSoftwareGet,
		});
	}

	public supportsZWaveSoftwareGet: boolean;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([
			(this.supportsZWaveSoftwareGet ? 0b100 : 0) | 0b11,
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supports Z-Wave Software Get command":
					this.supportsZWaveSoftwareGet,
			},
		};
	}
}

@CCCommand(VersionCommand.CapabilitiesGet)
@expectedCCResponse(VersionCCCapabilitiesReport)
export class VersionCCCapabilitiesGet extends VersionCC {}

// @publicAPI
export interface VersionCCZWaveSoftwareReportOptions {
	sdkVersion: string;
	applicationFrameworkAPIVersion: string;
	applicationFrameworkBuildNumber: number;
	hostInterfaceVersion: string;
	hostInterfaceBuildNumber: number;
	zWaveProtocolVersion: string;
	zWaveProtocolBuildNumber: number;
	applicationVersion: string;
	applicationBuildNumber: number;
}

@CCCommand(VersionCommand.ZWaveSoftwareReport)
@ccValueProperty("sdkVersion", VersionCCValues.sdkVersion)
@ccValueProperty(
	"applicationFrameworkAPIVersion",
	VersionCCValues.applicationFrameworkAPIVersion,
)
@ccValueProperty(
	"applicationFrameworkBuildNumber",
	VersionCCValues.applicationFrameworkBuildNumber,
)
@ccValueProperty("hostInterfaceVersion", VersionCCValues.serialAPIVersion)
@ccValueProperty(
	"hostInterfaceBuildNumber",
	VersionCCValues.serialAPIBuildNumber,
)
@ccValueProperty("zWaveProtocolVersion", VersionCCValues.zWaveProtocolVersion)
@ccValueProperty(
	"zWaveProtocolBuildNumber",
	VersionCCValues.zWaveProtocolBuildNumber,
)
@ccValueProperty("applicationVersion", VersionCCValues.applicationVersion)
@ccValueProperty(
	"applicationBuildNumber",
	VersionCCValues.applicationBuildNumber,
)
export class VersionCCZWaveSoftwareReport extends VersionCC {
	public constructor(
		options: WithAddress<VersionCCZWaveSoftwareReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.sdkVersion = options.sdkVersion;
		this.applicationFrameworkAPIVersion =
			options.applicationFrameworkAPIVersion;
		this.applicationFrameworkBuildNumber =
			options.applicationFrameworkBuildNumber;
		this.hostInterfaceVersion = options.hostInterfaceVersion;
		this.hostInterfaceBuildNumber = options.hostInterfaceBuildNumber;
		this.zWaveProtocolVersion = options.zWaveProtocolVersion;
		this.zWaveProtocolBuildNumber = options.zWaveProtocolBuildNumber;
		this.applicationVersion = options.applicationVersion;
		this.applicationBuildNumber = options.applicationBuildNumber;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): VersionCCZWaveSoftwareReport {
		validatePayload(raw.payload.length >= 23);
		const sdkVersion = parseVersion(raw.payload);
		const applicationFrameworkAPIVersion = parseVersion(
			raw.payload.subarray(3),
		);
		let applicationFrameworkBuildNumber;
		if (applicationFrameworkAPIVersion !== "unused") {
			applicationFrameworkBuildNumber = raw.payload.readUInt16BE(6);
		} else {
			applicationFrameworkBuildNumber = 0;
		}

		const hostInterfaceVersion = parseVersion(raw.payload.subarray(8));
		let hostInterfaceBuildNumber;
		if (hostInterfaceVersion !== "unused") {
			hostInterfaceBuildNumber = raw.payload.readUInt16BE(11);
		} else {
			hostInterfaceBuildNumber = 0;
		}

		const zWaveProtocolVersion = parseVersion(raw.payload.subarray(13));
		let zWaveProtocolBuildNumber;
		if (zWaveProtocolVersion !== "unused") {
			zWaveProtocolBuildNumber = raw.payload.readUInt16BE(16);
		} else {
			zWaveProtocolBuildNumber = 0;
		}

		const applicationVersion = parseVersion(raw.payload.subarray(18));
		let applicationBuildNumber;
		if (applicationVersion !== "unused") {
			applicationBuildNumber = raw.payload.readUInt16BE(21);
		} else {
			applicationBuildNumber = 0;
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			sdkVersion,
			applicationFrameworkAPIVersion,
			applicationFrameworkBuildNumber,
			hostInterfaceVersion,
			hostInterfaceBuildNumber,
			zWaveProtocolVersion,
			zWaveProtocolBuildNumber,
			applicationVersion,
			applicationBuildNumber,
		});
	}

	public readonly sdkVersion: string;

	public readonly applicationFrameworkAPIVersion: string;

	public readonly applicationFrameworkBuildNumber: number;

	public readonly hostInterfaceVersion: string;

	public readonly hostInterfaceBuildNumber: number;

	public readonly zWaveProtocolVersion: string;

	public readonly zWaveProtocolBuildNumber: number;

	public readonly applicationVersion: string;

	public readonly applicationBuildNumber: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"SDK version": this.sdkVersion,
		};
		message["appl. framework API version"] =
			this.applicationFrameworkAPIVersion;
		if (this.applicationFrameworkAPIVersion !== "unused") {
			message["appl. framework build number"] =
				this.applicationFrameworkBuildNumber;
		}
		message["host interface version"] = this.hostInterfaceVersion;
		if (this.hostInterfaceVersion !== "unused") {
			message["host interface  build number"] =
				this.hostInterfaceBuildNumber;
		}
		message["Z-Wave protocol version"] = this.zWaveProtocolVersion;
		if (this.zWaveProtocolVersion !== "unused") {
			message["Z-Wave protocol build number"] =
				this.zWaveProtocolBuildNumber;
		}
		message["application version"] = this.applicationVersion;
		if (this.applicationVersion !== "unused") {
			message["application build number"] = this.applicationBuildNumber;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(VersionCommand.ZWaveSoftwareGet)
@expectedCCResponse(VersionCCZWaveSoftwareReport)
export class VersionCCZWaveSoftwareGet extends VersionCC {}
