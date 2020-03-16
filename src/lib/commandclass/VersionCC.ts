import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { ValueMetadata } from "../values/Metadata";
import { Maybe, unknownBoolean } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	getCommandClass,
	getImplementedVersion,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export function getFirmwareVersionsValueId(): ValueID {
	return {
		commandClass: CommandClasses.Version,
		property: "firmwareVersions",
	};
}

export enum VersionCommand {
	Get = 0x11,
	Report = 0x12,
	CommandClassGet = 0x13,
	CommandClassReport = 0x14,
	CapabilitiesGet = 0x15,
	CapabilitiesReport = 0x16,
	ZWaveSoftwareGet = 0x17,
	ZWaveSoftwareReport = 0x18,
}

function parseVersion(buffer: Buffer): string {
	if (buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 0) return "unused";
	return `${buffer[0]}.${buffer[1]}.${buffer[2]}`;
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses.Version)
export class VersionCCAPI extends CCAPI {
	public supportsCommand(cmd: VersionCommand): Maybe<boolean> {
		switch (cmd) {
			case VersionCommand.Get:
			case VersionCommand.CommandClassGet:
				return true; // This is mandatory
			case VersionCommand.CapabilitiesGet:
				// The API might have been created before the versions were determined,
				// so `this.version` may contains a wrong value
				return (
					this.driver.getSafeCCVersionForNode(
						this.ccId,
						this.endpoint.nodeId,
						this.endpoint.index,
					) >= 3
				);
			case VersionCommand.ZWaveSoftwareGet: {
				const node = this.endpoint.getNodeUnsafe()!;
				let ret = node.getValue<Maybe<boolean>>({
					commandClass: getCommandClass(this),
					endpoint: this.endpoint.index,
					property: "supportsZWaveSoftwareGet",
				});
				if (ret == undefined) ret = unknownBoolean;
				return ret;
			}
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(VersionCommand, VersionCommand.Get);

		const cc = new VersionCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<VersionCCReport>(cc))!;
		return {
			libraryType: response.libraryType,
			protocolVersion: response.protocolVersion,
			firmwareVersions: response.firmwareVersions,
			hardwareVersion: response.hardwareVersion,
		};
	}

	public async getCCVersion(requestedCC: CommandClasses): Promise<number> {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CommandClassGet,
		);

		const cc = new VersionCCCommandClassGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			requestedCC,
		});
		const response = (await this.driver.sendCommand<
			VersionCCCommandClassReport
		>(cc))!;
		return response.ccVersion;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getCapabilities() {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.CapabilitiesGet,
		);

		const cc = new VersionCCCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			VersionCCCapabilitiesReport
		>(cc))!;
		return {
			supportsZWaveSoftwareGet: response.supportsZWaveSoftwareGet,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getZWaveSoftware() {
		this.assertSupportsCommand(
			VersionCommand,
			VersionCommand.ZWaveSoftwareGet,
		);

		const cc = new VersionCCZWaveSoftwareGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			VersionCCZWaveSoftwareReport
		>(cc))!;
		return {
			sdkVersion: response.sdkVersion,
			applicationFrameworkAPIVersion:
				response.applicationFrameworkAPIVersion,
			applicationFrameworkBuildNumber:
				response.applicationFrameworkBuildNumber,
			hostInterfaceVersion: response.hostInterfaceVersion,
			hostInterfaceBuildNumber: response.hostInterfaceBuildNumber,
			zWaveProtocolVersion: response.zWaveProtocolVersion,
			zWaveProtocolBuildNumber: response.zWaveProtocolBuildNumber,
			applicationVersion: response.applicationVersion,
			applicationBuildNumber: response.applicationBuildNumber,
		};
	}
}

@commandClass(CommandClasses.Version)
@implementedVersion(3)
export class VersionCC extends CommandClass {
	declare ccCommand: VersionCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// VersionCC must be the 2nd CC after ManufacturerSpecificCC
		return [CommandClasses["Manufacturer Specific"]];
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Version;

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		// Version information should not change (except for firmware updates)
		if (complete) {
			// Step 1: Query node versions
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying node versions...",
				direction: "outbound",
			});
			const versionGetResponse = await api.get();
			// prettier-ignore
			let logMessage = `received response for node versions:
  library type:      ${ZWaveLibraryTypes[versionGetResponse.libraryType]} (${num2hex(versionGetResponse.libraryType)})
  protocol version:  ${versionGetResponse.protocolVersion}
  firmware versions: ${versionGetResponse.firmwareVersions.join(", ")}`;
			if (versionGetResponse.hardwareVersion != undefined) {
				logMessage += `\n  hardware version:  ${versionGetResponse.hardwareVersion}`;
			}

			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			// Step 2: Query all CC versions
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying CC versions...",
				direction: "outbound",
			});
			for (const [cc] of endpoint.implementedCommandClasses.entries()) {
				// only query the ones we support a version > 1 for
				const maxImplemented = getImplementedVersion(cc);
				if (maxImplemented <= 1) {
					log.controller.logNode(
						node.id,
						`  skipping query for ${CommandClasses[cc]} (${num2hex(
							cc,
						)}) because max implemented version is ${maxImplemented}`,
					);
					continue;
				}
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `  querying the CC version for ${
						CommandClasses[cc]
					} (${num2hex(cc)})...`,
					direction: "outbound",
				});
				// query the CC version
				const supportedVersion = await api.getCCVersion(cc);
				// Remember which CC version this endpoint supports
				let logMessage: string;
				if (supportedVersion > 0) {
					endpoint.addCC(cc, { version: supportedVersion });
					logMessage = `  supports CC ${
						CommandClasses[cc]
					} (${num2hex(cc)}) in version ${supportedVersion}`;
				} else {
					// We were lied to - the NIF said this CC is supported, now the node claims it isn't
					endpoint.removeCC(cc);
					logMessage = `  does NOT support CC ${
						CommandClasses[cc]
					} (${num2hex(cc)})`;
				}
				log.controller.logNode(node.id, logMessage);
			}

			// Step 3: Query VersionCC capabilities
			if (
				// The CC was created before the versions were determined, so `this.version` contains a wrong value
				this.driver.getSafeCCVersionForNode(
					CommandClasses.Version,
					node.id,
					this.endpointIndex,
				) >= 3
			) {
				// Step 3a: Support for SoftwareGet
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "querying if Z-Wave Software Get is supported...",
					direction: "outbound",
				});
				const {
					supportsZWaveSoftwareGet,
				} = await api.getCapabilities();
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `Z-Wave Software Get is${
						supportsZWaveSoftwareGet ? "" : " not"
					} supported`,
					direction: "inbound",
				});

				if (supportsZWaveSoftwareGet) {
					// Step 3b: Query Z-Wave Software versions
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "querying Z-Wave software versions...",
						direction: "outbound",
					});
					await api.getZWaveSoftware();
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "received Z-Wave software versions..",
						direction: "inbound",
					});
				}
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(VersionCommand.Report)
export class VersionCCReport extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 5);
		this._libraryType = this.payload[0];
		this._protocolVersion = `${this.payload[1]}.${this.payload[2]}`;
		this._firmwareVersions = [`${this.payload[3]}.${this.payload[4]}`];
		if (this.version >= 2 && this.payload.length >= 7) {
			this._hardwareVersion = this.payload[5];
			const additionalFirmwares = this.payload[6];
			validatePayload(this.payload.length >= 7 + 2 * additionalFirmwares);
			for (let i = 0; i < additionalFirmwares; i++) {
				this.firmwareVersions.push(
					`${this.payload[7 + 2 * i]}.${this.payload[7 + 2 * i + 1]}`,
				);
			}
		}
		this.persistValues();
	}

	private _libraryType: ZWaveLibraryTypes;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Libary type",
	})
	public get libraryType(): ZWaveLibraryTypes {
		return this._libraryType;
	}

	private _protocolVersion: string;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Z-Wave protocol version",
	})
	public get protocolVersion(): string {
		return this._protocolVersion;
	}

	private _firmwareVersions: string[];
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Z-Wave chip firmware versions",
	})
	public get firmwareVersions(): string[] {
		return this._firmwareVersions;
	}

	private _hardwareVersion: number | undefined;
	@ccValue({ minVersion: 2 })
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Z-Wave chip hardware version",
	})
	public get hardwareVersion(): number | undefined {
		return this._hardwareVersion;
	}
}

@CCCommand(VersionCommand.Get)
@expectedCCResponse(VersionCCReport)
export class VersionCCGet extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(VersionCommand.CommandClassReport)
export class VersionCCCommandClassReport extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this._requestedCC = this.payload[0];
		this._ccVersion = this.payload[1];
		// No need to persist this, we're storing it manually
	}

	private _ccVersion: number;
	public get ccVersion(): number {
		return this._ccVersion;
	}

	private _requestedCC: CommandClasses;
	public get requestedCC(): CommandClasses {
		return this._requestedCC;
	}
}

interface VersionCCCommandClassGetOptions extends CCCommandOptions {
	requestedCC: CommandClasses;
}

@CCCommand(VersionCommand.CommandClassGet)
@expectedCCResponse(VersionCCCommandClassReport)
export class VersionCCCommandClassGet extends VersionCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| VersionCCCommandClassGetOptions,
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
}

@CCCommand(VersionCommand.CapabilitiesReport)
export class VersionCCCapabilitiesReport extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		const capabilities = this.payload[0];
		this._supportsZWaveSoftwareGet = !!(capabilities & 0b100);
		this.persistValues();
	}

	private _supportsZWaveSoftwareGet: boolean;
	@ccValue({
		minVersion: 3,
		internal: true,
	})
	public get supportsZWaveSoftwareGet(): boolean {
		return this._supportsZWaveSoftwareGet;
	}
}

@CCCommand(VersionCommand.CapabilitiesGet)
@expectedCCResponse(VersionCCCapabilitiesReport)
export class VersionCCCapabilitiesGet extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(VersionCommand.ZWaveSoftwareReport)
export class VersionCCZWaveSoftwareReport extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 23);
		this._sdkVersion = parseVersion(this.payload);
		this._applicationFrameworkAPIVersion = parseVersion(
			this.payload.slice(3),
		);
		if (this._applicationFrameworkAPIVersion !== "unused") {
			this._applicationFrameworkBuildNumber = this.payload.readUInt16BE(
				6,
			);
		} else {
			this._applicationFrameworkBuildNumber = 0;
		}
		this._hostInterfaceVersion = parseVersion(this.payload.slice(8));
		if (this._hostInterfaceVersion !== "unused") {
			this._hostInterfaceBuildNumber = this.payload.readUInt16BE(11);
		} else {
			this._hostInterfaceBuildNumber = 0;
		}
		this._zWaveProtocolVersion = parseVersion(this.payload.slice(13));
		if (this._zWaveProtocolVersion !== "unused") {
			this._zWaveProtocolBuildNumber = this.payload.readUInt16BE(16);
		} else {
			this._zWaveProtocolBuildNumber = 0;
		}
		this._applicationVersion = parseVersion(this.payload.slice(18));
		if (this._applicationVersion !== "unused") {
			this._applicationBuildNumber = this.payload.readUInt16BE(21);
		} else {
			this._applicationBuildNumber = 0;
		}
		this.persistValues();
	}

	private _sdkVersion: string;
	@ccValue({ minVersion: 3 })
	public get sdkVersion(): string {
		return this._sdkVersion;
	}
	private _applicationFrameworkAPIVersion: string;
	@ccValue({ minVersion: 3 })
	public get applicationFrameworkAPIVersion(): string {
		return this._applicationFrameworkAPIVersion;
	}
	private _applicationFrameworkBuildNumber: number;
	@ccValue({ minVersion: 3 })
	public get applicationFrameworkBuildNumber(): number {
		return this._applicationFrameworkBuildNumber;
	}
	private _hostInterfaceVersion: string;
	@ccValue({ minVersion: 3 })
	public get hostInterfaceVersion(): string {
		return this._hostInterfaceVersion;
	}
	private _hostInterfaceBuildNumber: number;
	@ccValue({ minVersion: 3 })
	public get hostInterfaceBuildNumber(): number {
		return this._hostInterfaceBuildNumber;
	}
	private _zWaveProtocolVersion: string;
	@ccValue({ minVersion: 3 })
	public get zWaveProtocolVersion(): string {
		return this._zWaveProtocolVersion;
	}
	private _zWaveProtocolBuildNumber: number;
	@ccValue({ minVersion: 3 })
	public get zWaveProtocolBuildNumber(): number {
		return this._zWaveProtocolBuildNumber;
	}
	private _applicationVersion: string;
	@ccValue({ minVersion: 3 })
	public get applicationVersion(): string {
		return this._applicationVersion;
	}
	private _applicationBuildNumber: number;
	@ccValue({ minVersion: 3 })
	public get applicationBuildNumber(): number {
		return this._applicationBuildNumber;
	}
}

@CCCommand(VersionCommand.ZWaveSoftwareGet)
@expectedCCResponse(VersionCCZWaveSoftwareReport)
export class VersionCCZWaveSoftwareGet extends VersionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
