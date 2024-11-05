import {
	CommandClasses,
	Duration,
	type EndpointId,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { isArray } from "alcalzone-shared/typeguards/index.js";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	type DoorHandleStatus,
	DoorLockCommand,
	DoorLockMode,
	DoorLockOperationType,
} from "../lib/_Types.js";

export const DoorLockCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Door Lock"], {
		...V.staticProperty(
			"targetMode",
			{
				...ValueMetadata.UInt8,
				label: "Target lock mode",
				states: enumValuesToMetadataStates(DoorLockMode),
			} as const,
		),

		...V.staticProperty(
			"currentMode",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Current lock mode",
				states: enumValuesToMetadataStates(DoorLockMode),
			} as const,
		),

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
		...V.staticProperty(
			"outsideHandlesCanOpenDoorConfiguration",
			{
				...ValueMetadata.Any,
				label:
					"Which outside handles can open the door (configuration)",
			} as const,
		),
		...V.staticProperty(
			"outsideHandlesCanOpenDoor",
			{
				...ValueMetadata.ReadOnly,
				label:
					"Which outside handles can open the door (actual status)",
			} as const,
		),

		...V.staticProperty("supportedInsideHandles", undefined, {
			internal: true,
			minVersion: 4,
		}),
		...V.staticProperty(
			"insideHandlesCanOpenDoorConfiguration",
			{
				...ValueMetadata.Any,
				label: "Which inside handles can open the door (configuration)",
			} as const,
		),
		...V.staticProperty(
			"insideHandlesCanOpenDoor",
			{
				...ValueMetadata.ReadOnly,
				label: "Which inside handles can open the door (actual status)",
			} as const,
		),

		...V.staticProperty(
			"operationType",
			{
				...ValueMetadata.UInt8,
				label: "Lock operation type",
				states: enumValuesToMetadataStates(DoorLockOperationType),
			} as const,
		),

		...V.staticProperty(
			"lockTimeoutConfiguration",
			{
				...ValueMetadata.UInt16,
				label: "Duration of timed mode in seconds",
			} as const,
		),
		...V.staticProperty(
			"lockTimeout",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Seconds until lock mode times out",
			} as const,
		),

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
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.latchSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateBoltStatusValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.boltSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateDoorStatusValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.doorSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateTwistAssistConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.twistAssistSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateBlockToBlockConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.blockToBlockSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateAutoRelockConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.autoRelockSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateHoldAndReleaseConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
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
		return async function(this: DoorLockCCAPI, { property }, value) {
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
				typeof property === "string"
				&& configurationSetParameters.includes(property as any)
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
		return async function(this: DoorLockCCAPI, { property }) {
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

		const cc = new DoorLockCCCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			DoorLockCCCapabilitiesReport
		>(
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

		const cc = new DoorLockCCOperationGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			DoorLockCCOperationReport
		>(
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

		const cc = new DoorLockCCOperationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			mode,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async setConfiguration(
		configuration: DoorLockCCConfigurationSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationSet,
		);

		const cc = new DoorLockCCConfigurationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...configuration,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationGet,
		);

		const cc = new DoorLockCCConfigurationGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			DoorLockCCConfigurationReport
		>(
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Door Lock"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
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

		if (api.version >= 4) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting lock capabilities...",
				direction: "outbound",
			});
			const resp = await api.getCapabilities();
			if (resp) {
				const logMessage = `received lock capabilities:
supported operation types: ${
					resp.supportedOperationTypes
						.map((t) => getEnumMemberName(DoorLockOperationType, t))
						.join(", ")
				}
supported door lock modes: ${
					resp.supportedDoorLockModes
						.map((t) => getEnumMemberName(DoorLockMode, t))
						.map((str) => `\n· ${str}`)
						.join("")
				}
supported outside handles: ${
					resp.supportedOutsideHandles
						.map(String)
						.join(", ")
				}
supported inside handles:  ${resp.supportedInsideHandles.map(String).join(", ")}
supports door status:      ${resp.doorSupported}
supports bolt status:      ${resp.boltSupported}
supports latch status:     ${resp.latchSupported}
supports auto-relock:      ${resp.autoRelockSupported}
supports hold-and-release: ${resp.holdAndReleaseSupported}
supports twist assist:     ${resp.twistAssistSupported}
supports block to block:   ${resp.blockToBlockSupported}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				doorSupported = resp.doorSupported;
				boltSupported = resp.boltSupported;
				latchSupported = resp.latchSupported;

				// Update metadata of settable states
				const targetModeValue = DoorLockCCValues.targetMode;
				this.setMetadata(ctx, targetModeValue, {
					...targetModeValue.meta,
					states: enumValuesToMetadataStates(
						DoorLockMode,
						resp.supportedDoorLockModes,
					),
				});

				const operationTypeValue = DoorLockCCValues.operationType;
				this.setMetadata(ctx, operationTypeValue, {
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
			if (doorSupported) this.setMetadata(ctx, doorStatusValue);
			this.setValue(
				ctx,
				DoorLockCCValues.doorSupported,
				doorSupported,
			);

			const latchStatusValue = DoorLockCCValues.latchStatus;
			if (latchSupported) this.setMetadata(ctx, latchStatusValue);
			this.setValue(
				ctx,
				DoorLockCCValues.latchSupported,
				latchSupported,
			);

			const boltStatusValue = DoorLockCCValues.boltStatus;
			if (boltSupported) this.setMetadata(ctx, boltStatusValue);
			this.setValue(
				ctx,
				DoorLockCCValues.boltSupported,
				boltSupported,
			);
		}

		await this.refreshValues(ctx);

		// Remember that the interview is complete
		if (!hadCriticalTimeout) this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Door Lock"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting lock configuration...",
			direction: "outbound",
		});
		const config = await api.getConfiguration();
		if (config) {
			let logMessage = `received lock configuration:
operation type:                ${
				getEnumMemberName(
					DoorLockOperationType,
					config.operationType,
				)
			}`;
			if (config.operationType === DoorLockOperationType.Timed) {
				logMessage += `
lock timeout:                  ${config.lockTimeoutConfiguration} seconds
`;
			}
			logMessage += `
outside handles can open door: ${
				config.outsideHandlesCanOpenDoorConfiguration
					.map(String)
					.join(", ")
			}
inside handles can open door:  ${
				config.insideHandlesCanOpenDoorConfiguration
					.map(String)
					.join(", ")
			}`;
			if (api.version >= 4) {
				logMessage += `
auto-relock time               ${config.autoRelockTime ?? "-"} seconds
hold-and-release time          ${config.holdAndReleaseTime ?? "-"} seconds
twist assist                   ${!!config.twistAssist}
block to block                 ${!!config.blockToBlock}`;
			}

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface DoorLockCCOperationSetOptions {
	mode: DoorLockMode;
}

@CCCommand(DoorLockCommand.OperationSet)
@useSupervision()
export class DoorLockCCOperationSet extends DoorLockCC {
	public constructor(
		options: WithAddress<DoorLockCCOperationSetOptions>,
	) {
		super(options);
		if (options.mode === DoorLockMode.Unknown) {
			throw new ZWaveError(
				`Unknown is not a valid door lock target state!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.mode = options.mode;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): DoorLockCCOperationSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new DoorLockCCOperationSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public mode: DoorLockMode;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.mode]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"target mode": getEnumMemberName(DoorLockMode, this.mode),
			},
		};
	}
}

// @publicAPI
export interface DoorLockCCOperationReportOptions {
	currentMode: DoorLockMode;
	outsideHandlesCanOpenDoor: DoorHandleStatus;
	insideHandlesCanOpenDoor: DoorHandleStatus;
	doorStatus?: "closed" | "open";
	boltStatus?: "unlocked" | "locked";
	latchStatus?: "closed" | "open";
	lockTimeout?: number;
	targetMode?: DoorLockMode;
	duration?: Duration;
}

@CCCommand(DoorLockCommand.OperationReport)
@ccValueProperty("currentMode", DoorLockCCValues.currentMode)
@ccValueProperty("targetMode", DoorLockCCValues.targetMode)
@ccValueProperty("duration", DoorLockCCValues.duration)
@ccValueProperty(
	"outsideHandlesCanOpenDoor",
	DoorLockCCValues.outsideHandlesCanOpenDoor,
)
@ccValueProperty(
	"insideHandlesCanOpenDoor",
	DoorLockCCValues.insideHandlesCanOpenDoor,
)
@ccValueProperty("lockTimeout", DoorLockCCValues.lockTimeout)
export class DoorLockCCOperationReport extends DoorLockCC {
	public constructor(
		options: WithAddress<DoorLockCCOperationReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.currentMode = options.currentMode;
		this.outsideHandlesCanOpenDoor = options.outsideHandlesCanOpenDoor;
		this.insideHandlesCanOpenDoor = options.insideHandlesCanOpenDoor;
		this.doorStatus = options.doorStatus;
		this.boltStatus = options.boltStatus;
		this.latchStatus = options.latchStatus;
		this.lockTimeout = options.lockTimeout;
		this.targetMode = options.targetMode;
		this.duration = options.duration;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): DoorLockCCOperationReport {
		validatePayload(raw.payload.length >= 5);
		const currentMode: DoorLockMode = raw.payload[0];
		const outsideHandlesCanOpenDoor: DoorHandleStatus = [
			!!(raw.payload[1] & 0b0001_0000),
			!!(raw.payload[1] & 0b0010_0000),
			!!(raw.payload[1] & 0b0100_0000),
			!!(raw.payload[1] & 0b1000_0000),
		];
		const insideHandlesCanOpenDoor: DoorHandleStatus = [
			!!(raw.payload[1] & 0b0001),
			!!(raw.payload[1] & 0b0010),
			!!(raw.payload[1] & 0b0100),
			!!(raw.payload[1] & 0b1000),
		];
		const doorStatus: "closed" | "open" | undefined =
			!!(raw.payload[2] & 0b1)
				? "closed"
				: "open";
		const boltStatus: "unlocked" | "locked" | undefined =
			!!(raw.payload[2] & 0b10) ? "unlocked" : "locked";
		const latchStatus: "closed" | "open" | undefined =
			!!(raw.payload[2] & 0b100)
				? "closed"
				: "open";
		// Ignore invalid timeout values
		const lockTimeoutMinutes = raw.payload[3];
		const lockTimeoutSeconds = raw.payload[4];
		let lockTimeout: number | undefined;
		if (lockTimeoutMinutes <= 253 && lockTimeoutSeconds <= 59) {
			lockTimeout = lockTimeoutSeconds + lockTimeoutMinutes * 60;
		}

		let targetMode: DoorLockMode | undefined;
		let duration: Duration | undefined;
		if (raw.payload.length >= 7) {
			targetMode = raw.payload[5];
			duration = Duration.parseReport(raw.payload[6]);
		}

		return new DoorLockCCOperationReport({
			nodeId: ctx.sourceNodeId,
			currentMode,
			outsideHandlesCanOpenDoor,
			insideHandlesCanOpenDoor,
			doorStatus,
			boltStatus,
			latchStatus,
			lockTimeout,
			targetMode,
			duration,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Only store the door/bolt/latch status if the lock supports it
		const supportsDoorStatus = !!this.getValue(
			ctx,
			DoorLockCCValues.doorSupported,
		);
		if (supportsDoorStatus) {
			this.setValue(
				ctx,
				DoorLockCCValues.doorStatus,
				this.doorStatus,
			);
		}
		const supportsBoltStatus = !!this.getValue(
			ctx,
			DoorLockCCValues.boltSupported,
		);
		if (supportsBoltStatus) {
			this.setValue(
				ctx,
				DoorLockCCValues.boltStatus,
				this.boltStatus,
			);
		}
		const supportsLatchStatus = !!this.getValue(
			ctx,
			DoorLockCCValues.latchSupported,
		);
		if (supportsLatchStatus) {
			this.setValue(
				ctx,
				DoorLockCCValues.latchStatus,
				this.latchStatus,
			);
		}

		return true;
	}

	public readonly currentMode: DoorLockMode;

	public readonly targetMode?: DoorLockMode;

	public readonly duration?: Duration;

	public readonly outsideHandlesCanOpenDoor: DoorHandleStatus;

	public readonly insideHandlesCanOpenDoor: DoorHandleStatus;

	public readonly latchStatus?: "open" | "closed";
	public readonly boltStatus?: "locked" | "unlocked";
	public readonly doorStatus?: "open" | "closed";

	public readonly lockTimeout?: number; // in seconds

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(DoorLockCommand.OperationGet)
@expectedCCResponse(DoorLockCCOperationReport)
export class DoorLockCCOperationGet extends DoorLockCC {}

// @publicAPI
export interface DoorLockCCConfigurationReportOptions {
	operationType: DoorLockOperationType;
	outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	lockTimeoutConfiguration?: number;
	autoRelockTime?: number;
	holdAndReleaseTime?: number;
	twistAssist?: boolean;
	blockToBlock?: boolean;
}

@CCCommand(DoorLockCommand.ConfigurationReport)
@ccValueProperty("operationType", DoorLockCCValues.operationType)
@ccValueProperty(
	"outsideHandlesCanOpenDoorConfiguration",
	DoorLockCCValues.outsideHandlesCanOpenDoorConfiguration,
)
@ccValueProperty(
	"insideHandlesCanOpenDoorConfiguration",
	DoorLockCCValues.insideHandlesCanOpenDoorConfiguration,
)
@ccValueProperty(
	"lockTimeoutConfiguration",
	DoorLockCCValues.lockTimeoutConfiguration,
)
export class DoorLockCCConfigurationReport extends DoorLockCC {
	public constructor(
		options: WithAddress<DoorLockCCConfigurationReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
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

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): DoorLockCCConfigurationReport {
		validatePayload(raw.payload.length >= 4);
		const operationType: DoorLockOperationType = raw.payload[0];
		const outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus = [
			!!(raw.payload[1] & 0b0001_0000),
			!!(raw.payload[1] & 0b0010_0000),
			!!(raw.payload[1] & 0b0100_0000),
			!!(raw.payload[1] & 0b1000_0000),
		];
		const insideHandlesCanOpenDoorConfiguration: DoorHandleStatus = [
			!!(raw.payload[1] & 0b0001),
			!!(raw.payload[1] & 0b0010),
			!!(raw.payload[1] & 0b0100),
			!!(raw.payload[1] & 0b1000),
		];
		let lockTimeoutConfiguration: number | undefined;
		if (operationType === DoorLockOperationType.Timed) {
			const lockTimeoutMinutes = raw.payload[2];
			const lockTimeoutSeconds = raw.payload[3];
			if (lockTimeoutMinutes <= 0xfd && lockTimeoutSeconds <= 59) {
				lockTimeoutConfiguration = lockTimeoutSeconds
					+ lockTimeoutMinutes * 60;
			}
		}

		let autoRelockTime: number | undefined;
		let holdAndReleaseTime: number | undefined;
		let twistAssist: boolean | undefined;
		let blockToBlock: boolean | undefined;
		if (raw.payload.length >= 5) {
			autoRelockTime = raw.payload.readUInt16BE(4);
			holdAndReleaseTime = raw.payload.readUInt16BE(6);

			const flags = raw.payload[8];
			twistAssist = !!(flags & 0b1);
			blockToBlock = !!(flags & 0b10);
		}

		return new DoorLockCCConfigurationReport({
			nodeId: ctx.sourceNodeId,
			operationType,
			outsideHandlesCanOpenDoorConfiguration,
			insideHandlesCanOpenDoorConfiguration,
			lockTimeoutConfiguration,
			autoRelockTime,
			holdAndReleaseTime,
			twistAssist,
			blockToBlock,
		});
	}

	public readonly operationType: DoorLockOperationType;

	public readonly outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	public readonly insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	public readonly lockTimeoutConfiguration?: number;

	// These are not always supported and have to be persisted manually
	// to avoid unsupported values being exposed to the user
	public readonly autoRelockTime?: number;
	public readonly holdAndReleaseTime?: number;
	public readonly twistAssist?: boolean;
	public readonly blockToBlock?: boolean;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Only store the autoRelockTime etc. params if the lock supports it
		const supportsAutoRelock = !!this.getValue(
			ctx,
			DoorLockCCValues.autoRelockSupported,
		);
		if (supportsAutoRelock) {
			this.setValue(
				ctx,
				DoorLockCCValues.autoRelockTime,
				this.autoRelockTime,
			);
		}
		const supportsHoldAndRelease = !!this.getValue(
			ctx,
			DoorLockCCValues.holdAndReleaseSupported,
		);
		if (supportsHoldAndRelease) {
			this.setValue(
				ctx,
				DoorLockCCValues.holdAndReleaseTime,
				this.holdAndReleaseTime,
			);
		}
		const supportsTwistAssist = !!this.getValue(
			ctx,
			DoorLockCCValues.twistAssistSupported,
		);
		if (supportsTwistAssist) {
			this.setValue(
				ctx,
				DoorLockCCValues.twistAssist,
				this.twistAssist,
			);
		}
		const supportsBlockToBlock = !!this.getValue(
			ctx,
			DoorLockCCValues.blockToBlockSupported,
		);
		if (supportsBlockToBlock) {
			this.setValue(
				ctx,
				DoorLockCCValues.blockToBlock,
				this.blockToBlock,
			);
		}

		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"operation type": getEnumMemberName(
				DoorLockOperationType,
				this.operationType,
			),
			"outside handle configuration": this
				.outsideHandlesCanOpenDoorConfiguration.join(", "),
			"inside handle configuration": this
				.insideHandlesCanOpenDoorConfiguration.join(", "),
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(DoorLockCommand.ConfigurationGet)
@expectedCCResponse(DoorLockCCConfigurationReport)
export class DoorLockCCConfigurationGet extends DoorLockCC {}

// @publicAPI
export type DoorLockCCConfigurationSetOptions =
	& (
		| {
			operationType: DoorLockOperationType.Timed;
			lockTimeoutConfiguration: number;
		}
		| {
			operationType: DoorLockOperationType.Constant;
			lockTimeoutConfiguration?: undefined;
		}
	)
	& {
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
		options: WithAddress<DoorLockCCConfigurationSetOptions>,
	) {
		super(options);
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

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): DoorLockCCConfigurationSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new DoorLockCCConfigurationSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public operationType: DoorLockOperationType;
	public outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	public insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	public lockTimeoutConfiguration?: number;
	public autoRelockTime?: number;
	public holdAndReleaseTime?: number;
	public twistAssist?: boolean;
	public blockToBlock?: boolean;

	public serialize(ctx: CCEncodingContext): Bytes {
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

		const flags = (this.twistAssist ? 0b1 : 0)
			| (this.blockToBlock ? 0b10 : 0);

		this.payload = Bytes.from([
			this.operationType,
			handles,
			lockTimeoutMinutes,
			lockTimeoutSeconds,
			// placeholder for auto relock time
			0,
			0,
			// placeholder for hold and release time
			0,
			0,
			flags,
		]);

		this.payload.writeUInt16BE((this.autoRelockTime ?? 0) & 0xffff, 4);
		this.payload.writeUInt16BE(
			(this.holdAndReleaseTime ?? 0) & 0xffff,
			6,
		);

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface DoorLockCCCapabilitiesReportOptions {
	supportedOperationTypes: DoorLockOperationType[];
	supportedDoorLockModes: DoorLockMode[];
	supportedOutsideHandles: DoorHandleStatus;
	supportedInsideHandles: DoorHandleStatus;
	doorSupported: boolean;
	boltSupported: boolean;
	latchSupported: boolean;
	blockToBlockSupported: boolean;
	twistAssistSupported: boolean;
	holdAndReleaseSupported: boolean;
	autoRelockSupported: boolean;
}

@CCCommand(DoorLockCommand.CapabilitiesReport)
@ccValueProperty(
	"supportedOutsideHandles",
	DoorLockCCValues.supportedOutsideHandles,
)
@ccValueProperty(
	"supportedInsideHandles",
	DoorLockCCValues.supportedInsideHandles,
)
@ccValueProperty("autoRelockSupported", DoorLockCCValues.autoRelockSupported)
@ccValueProperty(
	"holdAndReleaseSupported",
	DoorLockCCValues.holdAndReleaseSupported,
)
@ccValueProperty("twistAssistSupported", DoorLockCCValues.twistAssistSupported)
@ccValueProperty(
	"blockToBlockSupported",
	DoorLockCCValues.blockToBlockSupported,
)
export class DoorLockCCCapabilitiesReport extends DoorLockCC {
	public constructor(
		options: WithAddress<DoorLockCCCapabilitiesReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedOperationTypes = options.supportedOperationTypes;
		this.supportedDoorLockModes = options.supportedDoorLockModes;
		this.supportedOutsideHandles = options.supportedOutsideHandles;
		this.supportedInsideHandles = options.supportedInsideHandles;
		this.doorSupported = options.doorSupported;
		this.boltSupported = options.boltSupported;
		this.latchSupported = options.latchSupported;
		this.blockToBlockSupported = options.blockToBlockSupported;
		this.twistAssistSupported = options.twistAssistSupported;
		this.holdAndReleaseSupported = options.holdAndReleaseSupported;
		this.autoRelockSupported = options.autoRelockSupported;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): DoorLockCCCapabilitiesReport {
		// parse variable length operation type bit mask
		validatePayload(raw.payload.length >= 1);
		const bitMaskLength = raw.payload[0] & 0b11111;
		let offset = 1;
		validatePayload(raw.payload.length >= offset + bitMaskLength + 1);
		const supportedOperationTypes: DoorLockOperationType[] = parseBitMask(
			raw.payload.subarray(offset, offset + bitMaskLength),
			// bit 0 is reserved, bitmask starts at 1
			0,
		);
		offset += bitMaskLength;
		// parse variable length door lock mode list
		const listLength = raw.payload[offset];
		offset += 1;
		validatePayload(raw.payload.length >= offset + listLength + 3);
		const supportedDoorLockModes: DoorLockMode[] = [
			...raw.payload.subarray(offset, offset + listLength),
		];
		offset += listLength;
		const supportedOutsideHandles: DoorHandleStatus = [
			!!(raw.payload[offset] & 0b0001_0000),
			!!(raw.payload[offset] & 0b0010_0000),
			!!(raw.payload[offset] & 0b0100_0000),
			!!(raw.payload[offset] & 0b1000_0000),
		];
		const supportedInsideHandles: DoorHandleStatus = [
			!!(raw.payload[offset] & 0b0001),
			!!(raw.payload[offset] & 0b0010),
			!!(raw.payload[offset] & 0b0100),
			!!(raw.payload[offset] & 0b1000),
		];
		const doorSupported = !!(raw.payload[offset + 1] & 0b1);
		const boltSupported = !!(raw.payload[offset + 1] & 0b10);
		const latchSupported = !!(raw.payload[offset + 1] & 0b100);
		const blockToBlockSupported = !!(raw.payload[offset + 2] & 0b1);
		const twistAssistSupported = !!(raw.payload[offset + 2] & 0b10);
		const holdAndReleaseSupported = !!(raw.payload[offset + 2] & 0b100);
		const autoRelockSupported = !!(raw.payload[offset + 2] & 0b1000);

		return new DoorLockCCCapabilitiesReport({
			nodeId: ctx.sourceNodeId,
			supportedOperationTypes,
			supportedDoorLockModes,
			supportedOutsideHandles,
			supportedInsideHandles,
			doorSupported,
			boltSupported,
			latchSupported,
			blockToBlockSupported,
			twistAssistSupported,
			holdAndReleaseSupported,
			autoRelockSupported,
		});
	}

	public readonly supportedOperationTypes: readonly DoorLockOperationType[];
	public readonly supportedDoorLockModes: readonly DoorLockMode[];

	public readonly supportedOutsideHandles: DoorHandleStatus;

	public readonly supportedInsideHandles: DoorHandleStatus;

	// These 3 are not automatically persisted because in CC version 3
	// we have to assume them to be supported. In v4 we can query this.
	public readonly latchSupported: boolean;
	public readonly boltSupported: boolean;
	public readonly doorSupported: boolean;

	public readonly autoRelockSupported: boolean;

	public readonly holdAndReleaseSupported: boolean;

	public readonly twistAssistSupported: boolean;

	public readonly blockToBlockSupported: boolean;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
							`\n· ${
								getEnumMemberName(
									DoorLockOperationType,
									t,
								)
							}`,
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
