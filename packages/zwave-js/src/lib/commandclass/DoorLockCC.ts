import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	Duration,
	enumValuesToMetadataStates,
	Maybe,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { isArray } from "alcalzone-shared/typeguards";
import type { Driver } from "../driver/Driver";
import {
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
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
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	DoorHandleStatus,
	DoorLockCommand,
	DoorLockMode,
	DoorLockOperationType,
} from "./_Types";

export function getTargetModeValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "targetMode",
	};
}

export function getCurrentModeValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "currentMode",
	};
}

export function getOperationTypeValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "operationType",
	};
}

export function getLatchSupportedValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "latchSupported",
	};
}

export function getBoltSupportedValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "boltSupported",
	};
}

export function getDoorSupportedValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "doorSupported",
	};
}

export function getLatchStatusValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "latchStatus",
	};
}
function getLatchStatusValueMetadata(): ValueMetadata {
	return {
		...ValueMetadata.ReadOnly,
		label: "The current status of the latch",
	};
}

export function getBoltStatusValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "boltStatus",
	};
}
function getBoltStatusValueMetadata(): ValueMetadata {
	return {
		...ValueMetadata.ReadOnly,
		label: "The current status of the bolt",
	};
}

export function getDoorStatusValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock"],
		endpoint,
		property: "doorStatus",
	};
}
function getDoorStatusValueMetadata(): ValueMetadata {
	return {
		...ValueMetadata.ReadOnly,
		label: "The current status of the door",
	};
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
	public supportsCommand(cmd: DoorLockCommand): Maybe<boolean> {
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

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property === "targetMode") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.set(value);

			// Verify the current value after a delay
			this.schedulePoll({ property }, value);
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
					(config as any)[param] = this.endpoint
						.getNodeUnsafe()
						?.valueDB.getValue({
							commandClass: this.ccId,
							endpoint: this.endpoint.index,
							property: param,
						});
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

			await this.setConfiguration(config);

			// Refresh the current value
			// TODO: #1321, #1521
			await this.getConfiguration();
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
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

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.CapabilitiesGet,
		);

		const cc = new DoorLockCCCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<DoorLockCCCapabilitiesReport>(
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

		const cc = new DoorLockCCOperationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<DoorLockCCOperationReport>(
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
	public async set(mode: DoorLockMode): Promise<void> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.OperationSet,
		);

		const cc = new DoorLockCCOperationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async setConfiguration(
		configuration: DoorLockCCConfigurationSetOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationSet,
		);

		const cc = new DoorLockCCConfigurationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...configuration,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationGet,
		);

		const cc = new DoorLockCCConfigurationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<DoorLockCCConfigurationReport>(
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
export class DoorLockCC extends CommandClass {
	declare ccCommand: DoorLockCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Door Lock"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
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
			driver.controllerLog.logNode(node.id, {
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
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				doorSupported = resp.doorSupported;
				boltSupported = resp.boltSupported;
				latchSupported = resp.latchSupported;

				// Update metadata of settable states
				const valueDB = this.getValueDB();
				valueDB.setMetadata(getTargetModeValueId(this.endpointIndex), {
					...ValueMetadata.UInt8,
					states: enumValuesToMetadataStates(
						DoorLockMode,
						resp.supportedDoorLockModes,
					),
				});
				valueDB.setMetadata(
					getOperationTypeValueId(this.endpointIndex),
					{
						...ValueMetadata.UInt8,
						states: enumValuesToMetadataStates(
							DoorLockOperationType,
							resp.supportedOperationTypes,
						),
					},
				);
			} else {
				hadCriticalTimeout = true;
			}
		}

		if (!hadCriticalTimeout) {
			// Save support information for the status values
			const valueDB = this.getValueDB();
			valueDB.setMetadata(
				getDoorStatusValueId(this.endpointIndex),
				doorSupported ? getDoorStatusValueMetadata() : undefined,
			);
			valueDB.setValue(
				getDoorSupportedValueId(this.endpointIndex),
				doorSupported,
			);
			valueDB.setMetadata(
				getLatchStatusValueId(this.endpointIndex),
				latchSupported ? getLatchStatusValueMetadata() : undefined,
			);
			valueDB.setValue(
				getLatchSupportedValueId(this.endpointIndex),
				latchSupported,
			);
			valueDB.setMetadata(
				getBoltStatusValueId(this.endpointIndex),
				boltSupported ? getBoltStatusValueMetadata() : undefined,
			);
			valueDB.setValue(
				getBoltSupportedValueId(this.endpointIndex),
				boltSupported,
			);
		}

		await this.refreshValues(driver);

		// Remember that the interview is complete
		if (!hadCriticalTimeout) this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Door Lock"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
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

			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		driver.controllerLog.logNode(node.id, {
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
			driver.controllerLog.logNode(node.id, {
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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

		const valueDB = this.getValueDB();

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

		// Only store the door/bolt/latch status if the lock supports it
		const supportsDoorStatus = !!valueDB.getValue(
			getDoorSupportedValueId(this.endpointIndex),
		);
		if (supportsDoorStatus) {
			this.doorStatus = !!(this.payload[2] & 0b1) ? "closed" : "open";
		}
		const supportsBoltStatus = !!valueDB.getValue(
			getBoltSupportedValueId(this.endpointIndex),
		);
		if (supportsBoltStatus) {
			this.boltStatus = !!(this.payload[2] & 0b10)
				? "unlocked"
				: "locked";
		}
		const supportsLatchStatus = !!valueDB.getValue(
			getLatchSupportedValueId(this.endpointIndex),
		);
		if (supportsLatchStatus) {
			this.latchStatus = !!(this.payload[2] & 0b100) ? "closed" : "open";
		}

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

		this.persistValues();
	}

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		const valueDB = this.getValueDB();
		if (this.doorStatus != undefined) {
			const valueId = getDoorStatusValueId(this.endpointIndex);
			valueDB.setValue(valueId, this.doorStatus);
		}
		if (this.boltStatus != undefined) {
			const valueId = getBoltStatusValueId(this.endpointIndex);
			valueDB.setValue(valueId, this.boltStatus);
		}
		if (this.latchStatus != undefined) {
			const valueId = getLatchStatusValueId(this.endpointIndex);
			valueDB.setValue(valueId, this.latchStatus);
		}

		return true;
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Current lock mode",
		states: enumValuesToMetadataStates(DoorLockMode),
	})
	public readonly currentMode: DoorLockMode;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Target lock mode",
		states: enumValuesToMetadataStates(DoorLockMode),
	})
	public readonly targetMode?: DoorLockMode;

	@ccValue({ minVersion: 3 })
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyDuration,
		label: "Remaining duration until target lock mode",
	})
	public readonly duration?: Duration;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Which outside handles can open the door (actual status)",
	})
	public readonly outsideHandlesCanOpenDoor: DoorHandleStatus;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Which inside handles can open the door (actual status)",
	})
	public readonly insideHandlesCanOpenDoor: DoorHandleStatus;

	public readonly latchStatus?: "open" | "closed";
	public readonly boltStatus?: "locked" | "unlocked";
	public readonly doorStatus?: "open" | "closed";

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "Seconds until lock mode times out",
	})
	public readonly lockTimeout?: number; // in seconds

	public toLogEntry(): MessageOrCCLogEntry {
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
			...super.toLogEntry(),
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

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Lock operation type",
		states: enumValuesToMetadataStates(DoorLockOperationType),
	})
	public readonly operationType: DoorLockOperationType;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Any,
		label: "Which outside handles can open the door (configuration)",
	})
	public readonly outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Any,
		label: "Which inside handles can open the door (configuration)",
	})
	public readonly insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt16,
		label: "Duration of timed mode in seconds",
	})
	public readonly lockTimeoutConfiguration?: number;

	@ccValue({ minVersion: 4 })
	@ccValueMetadata({
		...ValueMetadata.UInt16,
		label: "Duration in seconds until lock returns to secure state",
	})
	public readonly autoRelockTime?: number;

	@ccValue({ minVersion: 4 })
	@ccValueMetadata({
		...ValueMetadata.UInt16,
		label: "Duration in seconds the latch stays retracted",
	})
	public readonly holdAndReleaseTime?: number;

	@ccValue({ minVersion: 4 })
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Twist Assist enabled",
	})
	public readonly twistAssist?: boolean;

	@ccValue({ minVersion: 4 })
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Block-to-block functionality enabled",
	})
	public readonly blockToBlock?: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
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
			...super.toLogEntry(),
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

	public toLogEntry(): MessageOrCCLogEntry {
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
			...super.toLogEntry(),
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

		this.persistValues();
	}

	public readonly supportedOperationTypes: readonly DoorLockOperationType[];
	public readonly supportedDoorLockModes: readonly DoorLockMode[];

	@ccValue({ internal: true, minVersion: 4 })
	public readonly supportedOutsideHandles: DoorHandleStatus;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly supportedInsideHandles: DoorHandleStatus;

	public readonly latchSupported: boolean;
	public readonly boltSupported: boolean;
	public readonly doorSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly autoRelockSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly holdAndReleaseSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly twistAssistSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly blockToBlockSupported: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
