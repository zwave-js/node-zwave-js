import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	SecurityClass,
	ValueMetadata,
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
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
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
	getImplementedVersion,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { VersionCommand } from "../lib/_Types";

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

function parseVersion(buffer: Buffer): string {
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
				// The API might have been created before the versions were determined,
				// so `this.version` may contains a wrong value
				return (
					this.applHost.getSafeCCVersion(
						this.ccId,
						this.endpoint.nodeId,
						this.endpoint.index,
					) >= 3
				);
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

		const cc = new VersionCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<VersionCCReport>(
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

		const cc = new VersionCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getCCVersion(
		requestedCC: CommandClasses,
	): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CommandClassGet,
		);

		const cc = new VersionCCCommandClassGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedCC,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new VersionCCCommandClassReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedCC,
			ccVersion,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities() {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CapabilitiesGet,
		);

		const cc = new VersionCCCapabilitiesGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new VersionCCCapabilitiesReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			// At this time, we do not support responding to Z-Wave Software Get
			supportsZWaveSoftwareGet: false,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getZWaveSoftware() {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.ZWaveSoftwareGet,
		);

		const cc = new VersionCCZWaveSoftwareGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		// SDS13782: In a Multi Channel device, the Version Command Class MUST be supported by the Root Device, while
		// the Version Command Class SHOULD NOT be supported by individual End Points.
		//
		// There may be cases where a given Command Class is not implemented by the Root Device of a Multi
		// Channel device. However, the Root Device MUST respond to Version requests for any Command Class
		// implemented by the Multi Channel device; also in cases where the actual Command Class is only
		// provided by an End Point.

		const endpoint = this.getEndpoint(applHost)!;

		// Use the CC API of the root device for all queries
		const api = CCAPI.create(
			CommandClasses.Version,
			applHost,
			node,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const queryCCVersion = async (cc: CommandClasses): Promise<void> => {
			// Only query CCs we support. Theoretically we could skip queries where we support only V1,
			// but there are Z-Wave certification tests that require us to query all CCs
			const maxImplemented = getImplementedVersion(cc);
			if (maxImplemented === 0) {
				applHost.controllerLog.logNode(
					node.id,
					`  skipping query for ${CommandClasses[cc]} (${
						num2hex(
							cc,
						)
					}) because max implemented version is ${maxImplemented}`,
				);
				return;
			}

			applHost.controllerLog.logNode(node.id, {
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

				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
				});
			} else {
				applHost.controllerLog.logNode(node.id, {
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
			// The CC instance was created before the versions were determined, so `this.version` contains a wrong value
			this.version = applHost.getSafeCCVersion(
				CommandClasses.Version,
				node.id,
				this.endpointIndex,
			);

			// Step 2: Query node versions
			applHost.controllerLog.logNode(node.id, {
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
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Step 3: Query all other CC versions
		applHost.controllerLog.logNode(node.id, {
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
		if (this.endpointIndex === 0 && this.version >= 3) {
			// Step 4a: Support for SoftwareGet
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying if Z-Wave Software Get is supported...",
				direction: "outbound",
			});
			const capsResponse = await api.getCapabilities();
			if (capsResponse) {
				const { supportsZWaveSoftwareGet } = capsResponse;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Z-Wave Software Get is${
						supportsZWaveSoftwareGet ? "" : " not"
					} supported`,
					direction: "inbound",
				});

				if (supportsZWaveSoftwareGet) {
					// Step 4b: Query Z-Wave Software versions
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "querying Z-Wave software versions...",
						direction: "outbound",
					});
					await api.getZWaveSoftware();
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "received Z-Wave software versions",
						direction: "inbound",
					});
				}
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
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
export class VersionCCReport extends VersionCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (VersionCCReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 5);
			this.libraryType = this.payload[0];
			this.protocolVersion = `${this.payload[1]}.${this.payload[2]}`;
			this.firmwareVersions = [`${this.payload[3]}.${this.payload[4]}`];
			if (this.version >= 2 && this.payload.length >= 7) {
				this.hardwareVersion = this.payload[5];
				const additionalFirmwares = this.payload[6];
				validatePayload(
					this.payload.length >= 7 + 2 * additionalFirmwares,
				);
				for (let i = 0; i < additionalFirmwares; i++) {
					this.firmwareVersions.push(
						`${this.payload[7 + 2 * i]}.${
							this.payload[7 + 2 * i + 1]
						}`,
					);
				}
			}
		} else {
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
	}

	@ccValue(VersionCCValues.libraryType)
	public readonly libraryType: ZWaveLibraryTypes;

	@ccValue(VersionCCValues.protocolVersion)
	public readonly protocolVersion: string;

	@ccValue(VersionCCValues.firmwareVersions)
	public readonly firmwareVersions: string[];

	@ccValue(VersionCCValues.hardwareVersion)
	public readonly hardwareVersion: number | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
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
			const firmwaresBuffer = Buffer.allocUnsafe(
				(this.firmwareVersions.length - 1) * 2,
			);
			for (let i = 1; i < this.firmwareVersions.length; i++) {
				const [major, minor] = this.firmwareVersions[i]
					.split(".")
					.map((n) => parseInt(n));
				firmwaresBuffer[2 * (i - 1)] = major;
				firmwaresBuffer[2 * (i - 1) + 1] = minor;
			}
			this.payload = Buffer.concat([this.payload, firmwaresBuffer]);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(VersionCommand.Get)
@expectedCCResponse(VersionCCReport)
export class VersionCCGet extends VersionCC {}

// @publicAPI
export interface VersionCCCommandClassReportOptions extends CCCommandOptions {
	requestedCC: CommandClasses;
	ccVersion: number;
}

@CCCommand(VersionCommand.CommandClassReport)
export class VersionCCCommandClassReport extends VersionCC {
	public constructor(
		host: ZWaveHost,
		options:
			| VersionCCCommandClassReportOptions
			| CommandClassDeserializationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.requestedCC = this.payload[0];
			this.ccVersion = this.payload[1];
		} else {
			this.requestedCC = options.requestedCC;
			this.ccVersion = options.ccVersion;
		}
	}

	public ccVersion: number;
	public requestedCC: CommandClasses;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedCC, this.ccVersion]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				CC: getCCName(this.requestedCC),
				version: this.ccVersion,
			},
		};
	}
}

// @publicAPI
export interface VersionCCCommandClassGetOptions extends CCCommandOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| VersionCCCommandClassGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.requestedCC = this.payload[0];
		} else {
			this.requestedCC = options.requestedCC;
		}
	}

	public requestedCC: CommandClasses;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedCC]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { CC: getCCName(this.requestedCC) },
		};
	}
}

// @publicAPI
export interface VersionCCCapabilitiesReportOptions {
	supportsZWaveSoftwareGet: boolean;
}

@CCCommand(VersionCommand.CapabilitiesReport)
export class VersionCCCapabilitiesReport extends VersionCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (VersionCCCapabilitiesReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const capabilities = this.payload[0];
			this.supportsZWaveSoftwareGet = !!(capabilities & 0b100);
		} else {
			this.supportsZWaveSoftwareGet = options.supportsZWaveSoftwareGet;
		}
	}

	@ccValue(VersionCCValues.supportsZWaveSoftwareGet)
	public supportsZWaveSoftwareGet: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.supportsZWaveSoftwareGet ? 0b100 : 0) | 0b11,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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

@CCCommand(VersionCommand.ZWaveSoftwareReport)
export class VersionCCZWaveSoftwareReport extends VersionCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 23);
		this.sdkVersion = parseVersion(this.payload);
		this.applicationFrameworkAPIVersion = parseVersion(
			this.payload.subarray(3),
		);
		if (this.applicationFrameworkAPIVersion !== "unused") {
			this.applicationFrameworkBuildNumber = this.payload.readUInt16BE(6);
		} else {
			this.applicationFrameworkBuildNumber = 0;
		}
		this.hostInterfaceVersion = parseVersion(this.payload.subarray(8));
		if (this.hostInterfaceVersion !== "unused") {
			this.hostInterfaceBuildNumber = this.payload.readUInt16BE(11);
		} else {
			this.hostInterfaceBuildNumber = 0;
		}
		this.zWaveProtocolVersion = parseVersion(this.payload.subarray(13));
		if (this.zWaveProtocolVersion !== "unused") {
			this.zWaveProtocolBuildNumber = this.payload.readUInt16BE(16);
		} else {
			this.zWaveProtocolBuildNumber = 0;
		}
		this.applicationVersion = parseVersion(this.payload.subarray(18));
		if (this.applicationVersion !== "unused") {
			this.applicationBuildNumber = this.payload.readUInt16BE(21);
		} else {
			this.applicationBuildNumber = 0;
		}
	}

	@ccValue(VersionCCValues.sdkVersion)
	public readonly sdkVersion: string;

	@ccValue(VersionCCValues.applicationFrameworkAPIVersion)
	public readonly applicationFrameworkAPIVersion: string;

	@ccValue(VersionCCValues.applicationFrameworkBuildNumber)
	public readonly applicationFrameworkBuildNumber: number;

	@ccValue(VersionCCValues.serialAPIVersion)
	public readonly hostInterfaceVersion: string;

	@ccValue(VersionCCValues.serialAPIBuildNumber)
	public readonly hostInterfaceBuildNumber: number;

	@ccValue(VersionCCValues.zWaveProtocolVersion)
	public readonly zWaveProtocolVersion: string;

	@ccValue(VersionCCValues.zWaveProtocolBuildNumber)
	public readonly zWaveProtocolBuildNumber: number;

	@ccValue(VersionCCValues.applicationVersion)
	public readonly applicationVersion: string;

	@ccValue(VersionCCValues.applicationBuildNumber)
	public readonly applicationBuildNumber: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(VersionCommand.ZWaveSoftwareGet)
@expectedCCResponse(VersionCCZWaveSoftwareReport)
export class VersionCCZWaveSoftwareGet extends VersionCC {}
