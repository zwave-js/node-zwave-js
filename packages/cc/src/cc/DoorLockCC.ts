import {
	CommandClasses,
	Duration,
	MessagePriority,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type SupervisionResult,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { isArray } from "alcalzone-shared/typeguards";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
	type PollValueImplementation,
	type SetValueImplementation,
} from "../lib/API";
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
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	DoorLockCommand,
	DoorLockMode,
	DoorLockOperationType,
	type DoorHandleStatus,
} from "../lib/_Types";

export const DoorLockCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Door Lock"], {
		...V.staticProperty("targetMode", {
			...ValueMetadata.UInt8,
			label: "Target lock mode",
			states: enumValuesToMetadataStates(DoorLockMode),
		} as const),

		...V.staticProperty("currentMode", {
			...ValueMetadata.ReadOnlyUInt8,
			label: "Current lock mode",
			states: enumValuesToMetadataStates(DoorLockMode),
		} as const),

		...V.staticProperty(
			"duration",
			{
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration until target lock mode",
			} as const,
			{ minVersion: 3 } as const,
		),

		...V.staticProperty("supportedOutsideHandles", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty("outsideHandlesCanOpenDoorConfiguration", {
			...ValueMetadata.Any,
			label: "Which outside handles can open the door (configuration)",
		} as const),
		...V.staticProperty("outsideHandlesCanOpenDoor", {
			...ValueMetadata.ReadOnly,
			label: "Which outside handles can open the door (actual status)",
		} as const),

		...V.staticProperty("supportedInsideHandles", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty("insideHandlesCanOpenDoorConfiguration", {
			...ValueMetadata.Any,
			label: "Which inside handles can open the door (configuration)",
		} as const),
		...V.staticProperty("insideHandlesCanOpenDoor", {
			...ValueMetadata.ReadOnly,
			label: "Which inside handles can open the door (actual status)",
		} as const),

		...V.staticProperty("operationType", {
			...ValueMetadata.UInt8,
			label: "Lock operation type",
			states: enumValuesToMetadataStates(DoorLockOperationType),
		} as const),

		...V.staticProperty("lockTimeoutConfiguration", {
			...ValueMetadata.UInt16,
			label: "Duration of timed mode in seconds",
		} as const),
		...V.staticProperty("lockTimeout", {
			...ValueMetadata.ReadOnlyUInt16,
			label: "Seconds until lock mode times out",
		} as const),

		...V.staticProperty("autoRelockSupported", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty(
			"autoRelockTime",
			{
				...ValueMetadata.UInt16,
				label: "Duration in seconds until lock returns to secure state",
			} as const,
			{
				minVersion: 4,
				autoCreate: shouldAutoCreateAutoRelockConfigValue,
			} as const,
		),

		...V.staticProperty("holdAndReleaseSupported", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty(
			"holdAndReleaseTime",
			{
				...ValueMetadata.UInt16,
				label: "Duration in seconds the latch stays retracted",
			} as const,
			{
				minVersion: 4,
				autoCreate: shouldAutoCreateHoldAndReleaseConfigValue,
			} as const,
		),

		...V.staticProperty("twistAssistSupported", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty(
			"twistAssist",
			{
				...ValueMetadata.Boolean,
				label: "Twist Assist enabled",
			} as const,
			{
				minVersion: 4,
				autoCreate: shouldAutoCreateTwistAssistConfigValue,
			} as const,
		),

		...V.staticProperty("blockToBlockSupported", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty(
			"blockToBlock",
			{
				...ValueMetadata.Boolean,
				label: "Block-to-block functionality enabled",
			} as const,
			{
				minVersion: 4,
				autoCreate: shouldAutoCreateBlockToBlockConfigValue,
			} as const,
		),

		...V.staticProperty("latchSupported", undefined, { internal: true }),
		...V.staticProperty(
			"latchStatus",
			{
				...ValueMetadata.ReadOnly,
				label: "Current status of the latch",
			} as const,
			{
				autoCreate: shouldAutoCreateLatchStatusValue,
			} as const,
		),

		...V.staticProperty("boltSupported", undefined, { internal: true }),
		...V.staticProperty(
			"boltStatus",
			{
				...ValueMetadata.ReadOnly,
				label: "Current status of the bolt",
			} as const,
			{
				autoCreate: shouldAutoCreateBoltStatusValue,
			} as const,
		),

		...V.staticProperty("doorSupported", undefined, { internal: true }),
		...V.staticProperty(
			"doorStatus",
			{
				...ValueMetadata.ReadOnly,
				label: "Current status of the door",
			} as const,
			{
				autoCreate: shouldAutoCreateDoorStatusValue,
			} as const,
		),
	}),
});

function shouldAutoCreateLatchStatusValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.latchSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateBoltStatusValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.boltSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateDoorStatusValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.doorSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateTwistAssistConfigValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.twistAssistSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateBlockToBlockConfigValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.blockToBlockSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateAutoRelockConfigValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.autoRelockSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateHoldAndReleaseConfigValue(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): boolean {
	const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.holdAndReleaseSupported.endpoint(endpoint.index),
	);
}

const configurationSetParameters = [
	"operationType",
	"outsideHandlesCanOpenDoorConfiguration",
	"insideHandlesCanOpenDoorConfiguration",
	"lockTimeoutConfiguration",
	"autoRelockTime",
	"holdAndReleaseTime",
	"twistAssist",
	"blockToBlock",
] as const;

@API(CommandClasses["Door Lock"])
export class DoorLockCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: DoorLockCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case DoorLockCommand.OperationSet:
			case DoorLockCommand.OperationGet:
			case DoorLockCommand.ConfigurationSet:
			case DoorLockCommand.ConfigurationGet:
				return true; // This is mandatory
			case DoorLockCommand.CapabilitiesGet:
				return this.version >= 4;
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function (this: DoorLockCCAPI, { property }, value) {
			if (property === "targetMode") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				const result = await this.set(value);

				// Verify the current value after a delay, unless the command was supervised and successful
				if (supervisedCommandSucceeded(result)) {
					this.getValueDB().setValue(
						DoorLockCCValues.currentMode.endpoint(
							this.endpoint.index,
						),
						value,
					);
				} else {
					this.schedulePoll({ property }, value);
				}

				return result;
			} else if (
				typeof property === "string" &&
				configurationSetParameters.includes(property as any)
			) {
				// checking every type here would create a LOT of duplicate code, so we don't

				// ConfigurationSet expects all parameters --> read the others from cache
				const config = {
					[property]: value,
				} as DoorLockCCConfigurationSetOptions;
				for (const param of configurationSetParameters) {
					if (param !== property) {
						(config as any)[param] = this.tryGetValueDB()?.getValue(
							{
								commandClass: this.ccId,
								endpoint: this.endpoint.index,
								property: param,
							},
						);
					}
				}

				// Fix insideHandlesCanOpenDoorConfiguration is not iterable
				const allTrue: DoorHandleStatus = [true, true, true, true];
				if (!config.insideHandlesCanOpenDoorConfiguration) {
					config.insideHandlesCanOpenDoorConfiguration = allTrue;
				}
				if (!config.outsideHandlesCanOpenDoorConfiguration) {
					config.outsideHandlesCanOpenDoorConfiguration = allTrue;
				}

				const result = await this.setConfiguration(config);

				// Verify the current value after a delay, unless the command was supervised and successful
				if (!supervisedCommandSucceeded(result)) {
					this.schedulePoll({ property }, value);
				}

				return result;
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function (this: DoorLockCCAPI, { property }) {
			switch (property) {
				case "currentMode":
				case "targetMode":
				case "duration":
				case "outsideHandlesCanOpenDoor":
				case "insideHandlesCanOpenDoor":
				case "latchStatus":
				case "boltStatus":
				case "doorStatus":
				case "lockTimeout":
					return (await this.get())?.[property];

				case "operationType":
				case "outsideHandlesCanOpenDoorConfiguration":
				case "insideHandlesCanOpenDoorConfiguration":
				case "lockTimeoutConfiguration":
				case "autoRelockTime":
				case "holdAndReleaseTime":
				case "twistAssist":
				case "blockToBlock":
					return (await this.getConfiguration())?.[property];

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.CapabilitiesGet,
		);

		const cc = new DoorLockCCCapabilitiesGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<DoorLockCCCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"autoRelockSupported",
				"blockToBlockSupported",
				"boltSupported",
				"doorSupported",
				"holdAndReleaseSupported",
				"latchSupported",
				"twistAssistSupported",
				"supportedDoorLockModes",
				"supportedInsideHandles",
				"supportedOperationTypes",
				"supportedOutsideHandles",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.OperationGet,
		);

		const cc = new DoorLockCCOperationGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<DoorLockCCOperationReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"currentMode",
				"targetMode",
				"duration",
				"outsideHandlesCanOpenDoor",
				"insideHandlesCanOpenDoor",
				"latchStatus",
				"boltStatus",
				"doorStatus",
				"lockTimeout",
			]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(
		mode: DoorLockMode,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.OperationSet,
		);

		const cc = new DoorLockCCOperationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async setConfiguration(
		configuration: DoorLockCCConfigurationSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationSet,
		);

		const cc = new DoorLockCCConfigurationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...configuration,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationGet,
		);

		const cc = new DoorLockCCConfigurationGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<DoorLockCCConfigurationReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"operationType",
				"outsideHandlesCanOpenDoorConfiguration",
				"insideHandlesCanOpenDoorConfiguration",
				"lockTimeoutConfiguration",
				"autoRelockTime",
				"holdAndReleaseTime",
				"twistAssist",
				"blockToBlock",
			]);
		}
	}
}

@commandClass(CommandClasses["Door Lock"])
@implementedVersion(4)
@ccValues(DoorLockCCValues)
export class DoorLockCC extends CommandClass {
	declare ccCommand: DoorLockCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Door Lock"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// We need to do some queries after a potential timeout
		// In this case, do now mark this CC as interviewed completely
		let hadCriticalTimeout = false;

		// By default, assume all status sensors to be supported
		let doorSupported = true;
		let boltSupported = true;
		let latchSupported = true;

		if (this.version >= 4) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting lock capabilities...",
				direction: "outbound",
			});
			const resp = await api.getCapabilities();
			if (resp) {
				const logMessage = `received lock capabilities:
supported operation types: ${resp.supportedOperationTypes
					.map((t) => getEnumMemberName(DoorLockOperationType, t))
					.join(", ")}
supported door lock modes: ${resp.supportedDoorLockModes
					.map((t) => getEnumMemberName(DoorLockMode, t))
					.map((str) => `\n· ${str}`)
					.join("")}
supported outside handles: ${resp.supportedOutsideHandles
					.map(String)
					.join(", ")}
supported inside handles:  ${resp.supportedInsideHandles.map(String).join(", ")}
supports door status:      ${resp.doorSupported}
supports bolt status:      ${resp.boltSupported}
supports latch status:     ${resp.latchSupported}
supports auto-relock:      ${resp.autoRelockSupported}
supports hold-and-release: ${resp.holdAndReleaseSupported}
supports twist assist:     ${resp.twistAssistSupported}
supports block to block:   ${resp.blockToBlockSupported}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				doorSupported = resp.doorSupported;
				boltSupported = resp.boltSupported;
				latchSupported = resp.latchSupported;

				// Update metadata of settable states
				const targetModeValue = DoorLockCCValues.targetMode;
				this.setMetadata(applHost, targetModeValue, {
					...targetModeValue.meta,
					states: enumValuesToMetadataStates(
						DoorLockMode,
						resp.supportedDoorLockModes,
					),
				});

				const operationTypeValue = DoorLockCCValues.operationType;
				this.setMetadata(applHost, operationTypeValue, {
					...operationTypeValue.meta,
					states: enumValuesToMetadataStates(
						DoorLockOperationType,
						resp.supportedOperationTypes,
					),
				});
			} else {
				hadCriticalTimeout = true;
			}
		}

		if (!hadCriticalTimeout) {
			// Save support information for the status values
			const doorStatusValue = DoorLockCCValues.doorStatus;
			if (doorSupported) this.setMetadata(applHost, doorStatusValue);
			this.setValue(
				applHost,
				DoorLockCCValues.doorSupported,
				doorSupported,
			);

			const latchStatusValue = DoorLockCCValues.latchStatus;
			if (latchSupported) this.setMetadata(applHost, latchStatusValue);
			this.setValue(
				applHost,
				DoorLockCCValues.latchSupported,
				latchSupported,
			);

			const boltStatusValue = DoorLockCCValues.boltStatus;
			if (boltSupported) this.setMetadata(applHost, boltStatusValue);
			this.setValue(
				applHost,
				DoorLockCCValues.boltSupported,
				boltSupported,
			);
		}

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		if (!hadCriticalTimeout) this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Door Lock"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting lock configuration...",
			direction: "outbound",
		});
		const config = await api.getConfiguration();
		if (config) {
			let logMessage = `received lock configuration:
operation type:                ${getEnumMemberName(
				DoorLockOperationType,
				config.operationType,
			)}`;
			if (config.operationType === DoorLockOperationType.Timed) {
				logMessage += `
lock timeout:                  ${config.lockTimeoutConfiguration} seconds
`;
			}
			logMessage += `
outside handles can open door: ${config.outsideHandlesCanOpenDoorConfiguration
				.map(String)
				.join(", ")}
inside handles can open door:  ${config.insideHandlesCanOpenDoorConfiguration
				.map(String)
				.join(", ")}`;
			if (this.version >= 4) {
				logMessage += `
auto-relock time               ${config.autoRelockTime ?? "-"} seconds
hold-and-release time          ${config.holdAndReleaseTime ?? "-"} seconds
twist assist                   ${!!config.twistAssist}
block to block                 ${!!config.blockToBlock}`;
			}

			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting current lock status...",
			direction: "outbound",
		});
		const status = await api.get();
		if (status) {
			let logMessage = `received lock status:
current mode:       ${getEnumMemberName(DoorLockMode, status.currentMode)}`;
			if (status.targetMode != undefined) {
				logMessage += `
target mode:        ${getEnumMemberName(DoorLockMode, status.targetMode)}
remaining duration: ${status.duration?.toString() ?? "undefined"}`;
			}
			if (status.lockTimeout != undefined) {
				logMessage += `
lock timeout:       ${status.lockTimeout} seconds`;
			}
			if (status.doorStatus != undefined) {
				logMessage += `
door status:        ${status.doorStatus}`;
			}
			if (status.boltStatus != undefined) {
				logMessage += `
bolt status:        ${status.boltStatus}`;
			}
			if (status.latchStatus != undefined) {
				logMessage += `
latch status:       ${status.latchStatus}`;
			}
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

interface DoorLockCCOperationSetOptions extends CCCommandOptions {
	mode: DoorLockMode;
}

@CCCommand(DoorLockCommand.OperationSet)
@useSupervision()
export class DoorLockCCOperationSet extends DoorLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| DoorLockCCOperationSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.mode === DoorLockMode.Unknown) {
				throw new ZWaveError(
					`Unknown is not a valid door lock target state!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.mode = options.mode;
		}
	}

	public mode: DoorLockMode;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.mode]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"target mode": getEnumMemberName(DoorLockMode, this.mode),
			},
		};
	}
}

@CCCommand(DoorLockCommand.OperationReport)
export class DoorLockCCOperationReport extends DoorLockCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 5);

		this.currentMode = this.payload[0];
		this.outsideHandlesCanOpenDoor = [
			!!(this.payload[1] & 0b0001_0000),
			!!(this.payload[1] & 0b0010_0000),
			!!(this.payload[1] & 0b0100_0000),
			!!(this.payload[1] & 0b1000_0000),
		];
		this.insideHandlesCanOpenDoor = [
			!!(this.payload[1] & 0b0001),
			!!(this.payload[1] & 0b0010),
			!!(this.payload[1] & 0b0100),
			!!(this.payload[1] & 0b1000),
		];

		this.doorStatus = !!(this.payload[2] & 0b1) ? "closed" : "open";
		this.boltStatus = !!(this.payload[2] & 0b10) ? "unlocked" : "locked";
		this.latchStatus = !!(this.payload[2] & 0b100) ? "closed" : "open";

		// Ignore invalid timeout values
		const lockTimeoutMinutes = this.payload[3];
		const lockTimeoutSeconds = this.payload[4];
		if (lockTimeoutMinutes <= 253 && lockTimeoutSeconds <= 59) {
			this.lockTimeout = lockTimeoutSeconds + lockTimeoutMinutes * 60;
		}

		if (this.version >= 3 && this.payload.length >= 7) {
			this.targetMode = this.payload[5];
			this.duration = Duration.parseReport(this.payload[6]);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Only store the door/bolt/latch status if the lock supports it
		const supportsDoorStatus = !!this.getValue(
			applHost,
			DoorLockCCValues.doorSupported,
		);
		if (supportsDoorStatus) {
			this.setValue(
				applHost,
				DoorLockCCValues.doorStatus,
				this.doorStatus,
			);
		}
		const supportsBoltStatus = !!this.getValue(
			applHost,
			DoorLockCCValues.boltSupported,
		);
		if (supportsBoltStatus) {
			this.setValue(
				applHost,
				DoorLockCCValues.boltStatus,
				this.boltStatus,
			);
		}
		const supportsLatchStatus = !!this.getValue(
			applHost,
			DoorLockCCValues.latchSupported,
		);
		if (supportsLatchStatus) {
			this.setValue(
				applHost,
				DoorLockCCValues.latchStatus,
				this.latchStatus,
			);
		}

		return true;
	}

	@ccValue(DoorLockCCValues.currentMode)
	public readonly currentMode: DoorLockMode;

	@ccValue(DoorLockCCValues.targetMode)
	public readonly targetMode?: DoorLockMode;

	@ccValue(DoorLockCCValues.duration)
	public readonly duration?: Duration;

	@ccValue(DoorLockCCValues.outsideHandlesCanOpenDoor)
	public readonly outsideHandlesCanOpenDoor: DoorHandleStatus;

	@ccValue(DoorLockCCValues.insideHandlesCanOpenDoor)
	public readonly insideHandlesCanOpenDoor: DoorHandleStatus;

	public readonly latchStatus?: "open" | "closed";
	public readonly boltStatus?: "locked" | "unlocked";
	public readonly doorStatus?: "open" | "closed";

	@ccValue(DoorLockCCValues.lockTimeout)
	public readonly lockTimeout?: number; // in seconds

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"current mode": getEnumMemberName(DoorLockMode, this.currentMode),
			"active outside handles": this.outsideHandlesCanOpenDoor.join(", "),
			"active inside handles": this.insideHandlesCanOpenDoor.join(", "),
		};

		if (this.latchStatus != undefined) {
			message["latch status"] = this.latchStatus;
		}
		if (this.boltStatus != undefined) {
			message["bolt status"] = this.boltStatus;
		}
		if (this.doorStatus != undefined) {
			message["door status"] = this.doorStatus;
		}

		if (this.targetMode != undefined) {
			message["target mode"] = getEnumMemberName(
				DoorLockMode,
				this.targetMode,
			);
		}
		if (this.duration != undefined) {
			message["remaining duration"] = this.duration.toString();
		}
		if (this.lockTimeout != undefined) {
			message["lock timeout"] = `${this.lockTimeout} seconds`;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(DoorLockCommand.OperationGet)
@expectedCCResponse(DoorLockCCOperationReport)
export class DoorLockCCOperationGet extends DoorLockCC {}

@CCCommand(DoorLockCommand.ConfigurationReport)
export class DoorLockCCConfigurationReport extends DoorLockCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);

		this.operationType = this.payload[0];
		this.outsideHandlesCanOpenDoorConfiguration = [
			!!(this.payload[1] & 0b0001_0000),
			!!(this.payload[1] & 0b0010_0000),
			!!(this.payload[1] & 0b0100_0000),
			!!(this.payload[1] & 0b1000_0000),
		];
		this.insideHandlesCanOpenDoorConfiguration = [
			!!(this.payload[1] & 0b0001),
			!!(this.payload[1] & 0b0010),
			!!(this.payload[1] & 0b0100),
			!!(this.payload[1] & 0b1000),
		];
		if (this.operationType === DoorLockOperationType.Timed) {
			const lockTimeoutMinutes = this.payload[2];
			const lockTimeoutSeconds = this.payload[3];
			if (lockTimeoutMinutes <= 0xfd && lockTimeoutSeconds <= 59) {
				this.lockTimeoutConfiguration =
					lockTimeoutSeconds + lockTimeoutMinutes * 60;
			}
		}
		if (this.version >= 4 && this.payload.length >= 5) {
			this.autoRelockTime = this.payload.readUInt16BE(4);
			this.holdAndReleaseTime = this.payload.readUInt16BE(6);

			const flags = this.payload[8];
			this.twistAssist = !!(flags & 0b1);
			this.blockToBlock = !!(flags & 0b10);
		}
	}

	@ccValue(DoorLockCCValues.operationType)
	public readonly operationType: DoorLockOperationType;

	@ccValue(DoorLockCCValues.outsideHandlesCanOpenDoorConfiguration)
	public readonly outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	@ccValue(DoorLockCCValues.insideHandlesCanOpenDoorConfiguration)
	public readonly insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	@ccValue(DoorLockCCValues.lockTimeoutConfiguration)
	public readonly lockTimeoutConfiguration?: number;

	// These are not always supported and have to be persisted manually
	// to avoid unsupported values being exposed to the user
	public readonly autoRelockTime?: number;
	public readonly holdAndReleaseTime?: number;
	public readonly twistAssist?: boolean;
	public readonly blockToBlock?: boolean;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Only store the autoRelockTime etc. params if the lock supports it
		const supportsAutoRelock = !!this.getValue(
			applHost,
			DoorLockCCValues.autoRelockSupported,
		);
		if (supportsAutoRelock) {
			this.setValue(
				applHost,
				DoorLockCCValues.autoRelockTime,
				this.autoRelockTime,
			);
		}
		const supportsHoldAndRelease = !!this.getValue(
			applHost,
			DoorLockCCValues.holdAndReleaseSupported,
		);
		if (supportsHoldAndRelease) {
			this.setValue(
				applHost,
				DoorLockCCValues.holdAndReleaseTime,
				this.holdAndReleaseTime,
			);
		}
		const supportsTwistAssist = !!this.getValue(
			applHost,
			DoorLockCCValues.twistAssistSupported,
		);
		if (supportsTwistAssist) {
			this.setValue(
				applHost,
				DoorLockCCValues.twistAssist,
				this.twistAssist,
			);
		}
		const supportsBlockToBlock = !!this.getValue(
			applHost,
			DoorLockCCValues.blockToBlockSupported,
		);
		if (supportsBlockToBlock) {
			this.setValue(
				applHost,
				DoorLockCCValues.blockToBlock,
				this.blockToBlock,
			);
		}

		return true;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"operation type": getEnumMemberName(
				DoorLockOperationType,
				this.operationType,
			),
			"outside handle configuration":
				this.outsideHandlesCanOpenDoorConfiguration.join(", "),
			"inside handle configuration":
				this.insideHandlesCanOpenDoorConfiguration.join(", "),
		};
		if (this.lockTimeoutConfiguration != undefined) {
			message[
				"timed mode duration"
			] = `${this.lockTimeoutConfiguration} seconds`;
		}
		if (this.autoRelockTime != undefined) {
			message["auto-relock time"] = `${this.autoRelockTime} seconds`;
		}
		if (this.holdAndReleaseTime != undefined) {
			message[
				"hold-and-release time"
			] = `${this.holdAndReleaseTime} seconds`;
		}
		if (this.twistAssist != undefined) {
			message["twist assist enabled"] = this.twistAssist;
		}
		if (this.blockToBlock != undefined) {
			message["block-to-block enabled"] = this.blockToBlock;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(DoorLockCommand.ConfigurationGet)
@expectedCCResponse(DoorLockCCConfigurationReport)
export class DoorLockCCConfigurationGet extends DoorLockCC {}

type DoorLockCCConfigurationSetOptions = (
	| {
			operationType: DoorLockOperationType.Timed;
			lockTimeoutConfiguration: number;
	  }
	| {
			operationType: DoorLockOperationType.Constant;
			lockTimeoutConfiguration?: undefined;
	  }
) & {
	outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	// V4+
	autoRelockTime?: number;
	holdAndReleaseTime?: number;
	twistAssist?: boolean;
	blockToBlock?: boolean;
};

@CCCommand(DoorLockCommand.ConfigurationSet)
@useSupervision()
export class DoorLockCCConfigurationSet extends DoorLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & DoorLockCCConfigurationSetOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.operationType = options.operationType;
			this.outsideHandlesCanOpenDoorConfiguration =
				options.outsideHandlesCanOpenDoorConfiguration;
			this.insideHandlesCanOpenDoorConfiguration =
				options.insideHandlesCanOpenDoorConfiguration;
			this.lockTimeoutConfiguration = options.lockTimeoutConfiguration;
			this.autoRelockTime = options.autoRelockTime;
			this.holdAndReleaseTime = options.holdAndReleaseTime;
			this.twistAssist = options.twistAssist;
			this.blockToBlock = options.blockToBlock;
		}
	}

	public operationType: DoorLockOperationType;
	public outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	public insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	public lockTimeoutConfiguration?: number;
	public autoRelockTime?: number;
	public holdAndReleaseTime?: number;
	public twistAssist?: boolean;
	public blockToBlock?: boolean;

	public serialize(): Buffer {
		const insideHandles = isArray(
			this.insideHandlesCanOpenDoorConfiguration,
		)
			? this.insideHandlesCanOpenDoorConfiguration
			: [];
		const outsideHandles = isArray(
			this.outsideHandlesCanOpenDoorConfiguration,
		)
			? this.outsideHandlesCanOpenDoorConfiguration
			: [];

		const handles = [...insideHandles, ...outsideHandles]
			.map((val, i) => (val ? 1 << i : 0))
			.reduce((acc, cur) => acc | cur, 0);

		let lockTimeoutMinutes: number;
		let lockTimeoutSeconds: number;
		if (this.operationType === DoorLockOperationType.Constant) {
			lockTimeoutMinutes = lockTimeoutSeconds = 0xfe;
		} else {
			lockTimeoutMinutes = Math.floor(
				this.lockTimeoutConfiguration! / 60,
			);
			lockTimeoutSeconds = this.lockTimeoutConfiguration! % 60;
		}

		this.payload = Buffer.from([
			this.operationType,
			handles,
			lockTimeoutMinutes,
			lockTimeoutSeconds,
		]);
		if (
			this.version >= 4 &&
			(this.twistAssist != undefined ||
				this.blockToBlock != undefined ||
				this.autoRelockTime != undefined ||
				this.holdAndReleaseTime != undefined)
		) {
			const flags =
				(this.twistAssist ? 0b1 : 0) | (this.blockToBlock ? 0b10 : 0);
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([
					// placeholder for auto relock time
					0,
					0,
					// placeholder for hold and release time
					0,
					0,
					flags,
				]),
			]);
			this.payload.writeUInt16BE((this.autoRelockTime ?? 0) & 0xffff, 4);
			this.payload.writeUInt16BE(
				(this.holdAndReleaseTime ?? 0) & 0xffff,
				6,
			);
		}
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const insideHandles = isArray(
			this.insideHandlesCanOpenDoorConfiguration,
		)
			? this.insideHandlesCanOpenDoorConfiguration
			: [];
		const outsideHandles = isArray(
			this.outsideHandlesCanOpenDoorConfiguration,
		)
			? this.outsideHandlesCanOpenDoorConfiguration
			: [];
		const message: MessageRecord = {
			"operation type": getEnumMemberName(
				DoorLockOperationType,
				this.operationType,
			),
			"outside handle configuration": outsideHandles.join(", "),
			"inside handle configuration": insideHandles.join(", "),
		};
		if (this.lockTimeoutConfiguration != undefined) {
			message[
				"timed mode duration"
			] = `${this.lockTimeoutConfiguration} seconds`;
		}
		if (this.autoRelockTime != undefined) {
			message["auto-relock time"] = `${this.autoRelockTime} seconds`;
		}
		if (this.holdAndReleaseTime != undefined) {
			message[
				"hold-and-release time"
			] = `${this.holdAndReleaseTime} seconds`;
		}
		if (this.twistAssist != undefined) {
			message["enable twist assist"] = this.twistAssist;
		}
		if (this.blockToBlock != undefined) {
			message["enable block-to-block"] = this.blockToBlock;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(DoorLockCommand.CapabilitiesReport)
export class DoorLockCCCapabilitiesReport extends DoorLockCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		// parse variable length operation type bit mask
		validatePayload(this.payload.length >= 1);
		const bitMaskLength = this.payload[0] & 0b11111;
		let offset = 1;
		validatePayload(this.payload.length >= offset + bitMaskLength + 1);
		this.supportedOperationTypes = parseBitMask(
			this.payload.slice(offset, offset + bitMaskLength),
			// bit 0 is reserved, bitmask starts at 1
			0,
		);
		offset += bitMaskLength;

		// parse variable length door lock mode list
		const listLength = this.payload[offset];
		offset += 1;
		validatePayload(this.payload.length >= offset + listLength + 3);
		this.supportedDoorLockModes = [
			...this.payload.slice(offset, offset + listLength),
		];
		offset += listLength;

		this.supportedOutsideHandles = [
			!!(this.payload[offset] & 0b0001_0000),
			!!(this.payload[offset] & 0b0010_0000),
			!!(this.payload[offset] & 0b0100_0000),
			!!(this.payload[offset] & 0b1000_0000),
		];
		this.supportedInsideHandles = [
			!!(this.payload[offset] & 0b0001),
			!!(this.payload[offset] & 0b0010),
			!!(this.payload[offset] & 0b0100),
			!!(this.payload[offset] & 0b1000),
		];

		this.doorSupported = !!(this.payload[offset + 1] & 0b1);
		this.boltSupported = !!(this.payload[offset + 1] & 0b10);
		this.latchSupported = !!(this.payload[offset + 1] & 0b100);

		this.blockToBlockSupported = !!(this.payload[offset + 2] & 0b1);
		this.twistAssistSupported = !!(this.payload[offset + 2] & 0b10);
		this.holdAndReleaseSupported = !!(this.payload[offset + 2] & 0b100);
		this.autoRelockSupported = !!(this.payload[offset + 2] & 0b1000);
	}

	public readonly supportedOperationTypes: readonly DoorLockOperationType[];
	public readonly supportedDoorLockModes: readonly DoorLockMode[];

	@ccValue(DoorLockCCValues.supportedOutsideHandles)
	public readonly supportedOutsideHandles: DoorHandleStatus;

	@ccValue(DoorLockCCValues.supportedInsideHandles)
	public readonly supportedInsideHandles: DoorHandleStatus;

	// These 3 are not automatically persisted because in CC version 3
	// we have to assume them to be supported. In v4 we can query this.
	public readonly latchSupported: boolean;
	public readonly boltSupported: boolean;
	public readonly doorSupported: boolean;

	@ccValue(DoorLockCCValues.autoRelockSupported)
	public readonly autoRelockSupported: boolean;

	@ccValue(DoorLockCCValues.holdAndReleaseSupported)
	public readonly holdAndReleaseSupported: boolean;

	@ccValue(DoorLockCCValues.twistAssistSupported)
	public readonly twistAssistSupported: boolean;

	@ccValue(DoorLockCCValues.blockToBlockSupported)
	public readonly blockToBlockSupported: boolean;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				door: this.doorSupported,
				bolt: this.boltSupported,
				latch: this.latchSupported,
				"block-to-block feature": this.blockToBlockSupported,
				"twist assist feature": this.twistAssistSupported,
				"hold-and-release feature": this.holdAndReleaseSupported,
				"auto-relock feature": this.autoRelockSupported,
				"operation types": this.supportedOperationTypes
					.map(
						(t) =>
							`\n· ${getEnumMemberName(
								DoorLockOperationType,
								t,
							)}`,
					)
					.join(""),
				"door lock modes": this.supportedDoorLockModes
					.map((t) => `\n· ${getEnumMemberName(DoorLockMode, t)}`)
					.join(""),
				"outside handles": this.supportedOutsideHandles.join(", "),
				"inside handles": this.supportedInsideHandles.join(", "),
			},
		};
	}
}

@CCCommand(DoorLockCommand.CapabilitiesGet)
@expectedCCResponse(DoorLockCCCapabilitiesReport)
export class DoorLockCCCapabilitiesGet extends DoorLockCC {}
