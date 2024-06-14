import {
	CommandClasses,
	type MaybeNotKnown,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	UNKNOWN_STATE,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	maybeUnknownToString,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import {
	getEnumMemberName,
	isEnumMember,
	noop,
	pick,
} from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	SET_VALUE_HOOKS,
	type SetValueImplementation,
	type SetValueImplementationHooksFactory,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
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
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	BarrierOperatorCommand,
	BarrierState,
	SubsystemState,
	SubsystemType,
} from "../lib/_Types";

export const BarrierOperatorCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Barrier Operator"], {
		...V.staticProperty("supportedSubsystemTypes", undefined, {
			internal: true,
		}),

		...V.staticProperty(
			"position",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Barrier Position",
				unit: "%",
				max: 100,
			} as const,
		),

		...V.staticProperty(
			"targetState",
			{
				...ValueMetadata.UInt8,
				label: "Target Barrier State",
				states: enumValuesToMetadataStates(BarrierState, [
					BarrierState.Open,
					BarrierState.Closed,
				]),
			} as const,
		),

		...V.staticProperty(
			"currentState",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Current Barrier State",
				states: enumValuesToMetadataStates(BarrierState),
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Barrier Operator"], {
		...V.dynamicPropertyAndKeyWithName(
			"signalingState",
			"signalingState",
			(subsystemType: SubsystemType) => subsystemType,
			({ property, propertyKey }) =>
				property === "signalingState"
				&& typeof propertyKey === "number",
			(subsystemType: SubsystemType) => ({
				...ValueMetadata.UInt8,
				label: `Signaling State (${
					getEnumMemberName(
						SubsystemType,
						subsystemType,
					)
				})`,
				states: enumValuesToMetadataStates(SubsystemState),
			} as const),
		),
	}),
});

@API(CommandClasses["Barrier Operator"])
export class BarrierOperatorCCAPI extends CCAPI {
	public supportsCommand(
		cmd: BarrierOperatorCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case BarrierOperatorCommand.Get:
			case BarrierOperatorCommand.Set:
			case BarrierOperatorCommand.SignalingCapabilitiesGet:
			case BarrierOperatorCommand.EventSignalingGet:
			case BarrierOperatorCommand.EventSignalingSet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.Get,
		);

		const cc = new BarrierOperatorCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			BarrierOperatorCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["currentState", "position"]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(
		targetState: BarrierState.Open | BarrierState.Closed,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.Set,
		);

		const cc = new BarrierOperatorCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetState,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getSignalingCapabilities(): Promise<
		MaybeNotKnown<readonly SubsystemType[]>
	> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.SignalingCapabilitiesGet,
		);

		const cc = new BarrierOperatorCCSignalingCapabilitiesGet(
			this.applHost,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
			},
		);
		const response = await this.applHost.sendCommand<
			BarrierOperatorCCSignalingCapabilitiesReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSubsystemTypes;
	}

	@validateArgs({ strictEnums: true })
	public async getEventSignaling(
		subsystemType: SubsystemType,
	): Promise<MaybeNotKnown<SubsystemState>> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.EventSignalingGet,
		);

		const cc = new BarrierOperatorCCEventSignalingGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			subsystemType,
		});
		const response = await this.applHost.sendCommand<
			BarrierOperatorCCEventSignalingReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.subsystemState;
	}

	@validateArgs({ strictEnums: true })
	public async setEventSignaling(
		subsystemType: SubsystemType,
		subsystemState: SubsystemState,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.EventSignalingSet,
		);

		const cc = new BarrierOperatorCCEventSignalingSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			subsystemType,
			subsystemState,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: BarrierOperatorCCAPI,
			{ property, propertyKey },
			value,
		) {
			if (property === "targetState") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}

				const targetValue = value === BarrierState.Closed
					? BarrierState.Closed
					: BarrierState.Open;
				return this.set(targetValue);
			} else if (property === "signalingState") {
				if (propertyKey == undefined) {
					throwMissingPropertyKey(this.ccId, property);
				} else if (typeof propertyKey !== "number") {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
				}
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				return this.setEventSignaling(propertyKey, value);
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory = (
		{ property, propertyKey },
		value,
		_options,
	) => {
		const valueId = {
			commandClass: this.ccId,
			property,
			propertyKey,
		};

		if (BarrierOperatorCCValues.targetState.is(valueId)) {
			const currentStateValueId = BarrierOperatorCCValues.currentState
				.endpoint(
					this.endpoint.index,
				);

			const targetValue = value === BarrierState.Closed
				? BarrierState.Closed
				: BarrierState.Open;

			return {
				// Barrier Operator commands may take some time to be executed.
				// Therefore we try to supervise the command execution and delay the
				// optimistic update until the final result is received.
				supervisionDelayedUpdates: true,
				supervisionOnSuccess: () => {
					this.tryGetValueDB()?.setValue(
						currentStateValueId,
						targetValue,
					);
				},
				supervisionOnFailure: async () => {
					// The command failed, so now we don't know the status - refresh the current value
					try {
						await this.get();
					} catch {
						// ignore
					}
				},

				optimisticallyUpdateRelatedValues: (
					supervisedAndSuccessful,
				) => {
					// For barriers, do not update the current value unless we actually know the command was successful
					if (!supervisedAndSuccessful) return;

					if (this.isSinglecast()) {
						this.tryGetValueDB()?.setValue(
							currentStateValueId,
							targetValue,
						);
					} else if (this.isMulticast()) {
						// Figure out which nodes were affected by this command
						const affectedNodes = this.endpoint.node.physicalNodes
							.filter((node) =>
								node
									.getEndpoint(this.endpoint.index)
									?.supportsCC(this.ccId)
							);
						// and optimistically update the currentValue
						for (const node of affectedNodes) {
							this.applHost
								.tryGetValueDB(node.id)
								?.setValue(currentStateValueId, targetValue);
						}
					}
				},

				verifyChanges: () => {
					if (this.isSinglecast()) {
						// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
						this.schedulePoll(currentStateValueId, targetValue);
					} else {
						// For multicasts, do not schedule a refresh - this could cause a LOT of traffic
					}
				},
			};
		} else if (BarrierOperatorCCValues.signalingState.is(valueId)) {
			const subsystemType = propertyKey as SubsystemType;
			const signalingStateValueId = BarrierOperatorCCValues
				.signalingState(subsystemType).endpoint(
					this.endpoint.index,
				);

			return {
				verifyChanges: () => {
					if (this.isSinglecast()) {
						this.schedulePoll(signalingStateValueId, value, {
							// Signaling state changes are fast
							transition: "fast",
						});
					}
				},
			};
		}
	};

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: BarrierOperatorCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "currentState":
				case "position":
					return (await this.get())?.[property];
				case "signalingState":
					if (propertyKey == undefined) {
						throwMissingPropertyKey(this.ccId, property);
					} else if (typeof propertyKey !== "number") {
						throwUnsupportedPropertyKey(
							this.ccId,
							property,
							propertyKey,
						);
					}
					return this.getEventSignaling(propertyKey);
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}
}

@commandClass(CommandClasses["Barrier Operator"])
@implementedVersion(1)
@ccValues(BarrierOperatorCCValues)
export class BarrierOperatorCC extends CommandClass {
	declare ccCommand: BarrierOperatorCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Barrier Operator"],
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

		// Create targetState value if it does not exist
		this.ensureMetadata(applHost, BarrierOperatorCCValues.targetState);

		applHost.controllerLog.logNode(node.id, {
			message: "Querying signaling capabilities...",
			direction: "outbound",
		});
		const resp = await api.getSignalingCapabilities();
		if (resp) {
			applHost.controllerLog.logNode(node.id, {
				message: `Received supported subsystem types: ${
					resp
						.map((t) =>
							`\n· ${getEnumMemberName(SubsystemType, t)}`
						)
						.join("")
				}`,
				direction: "inbound",
			});

			// Enable all supported subsystems
			for (const subsystemType of resp) {
				// Some devices report invalid subsystem types, but the CC API checks
				// for valid values and throws otherwise.
				if (!isEnumMember(SubsystemType, subsystemType)) continue;

				applHost.controllerLog.logNode(node.id, {
					message: `Enabling subsystem ${
						getEnumMemberName(
							SubsystemType,
							subsystemType,
						)
					}...`,
					direction: "outbound",
				});
				await api.setEventSignaling(subsystemType, SubsystemState.On)
					.catch(noop);
			}
		}

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Barrier Operator"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const supportedSubsystems: SubsystemType[] = this.getValue(
			applHost,
			BarrierOperatorCCValues.supportedSubsystemTypes,
		) ?? [];

		for (const subsystemType of supportedSubsystems) {
			// Some devices report invalid subsystem types, but the CC API checks
			// for valid values and throws otherwise.
			if (!isEnumMember(SubsystemType, subsystemType)) continue;

			applHost.controllerLog.logNode(node.id, {
				message: `Querying event signaling state for subsystem ${
					getEnumMemberName(
						SubsystemType,
						subsystemType,
					)
				}...`,
				direction: "outbound",
			});
			const state = await api.getEventSignaling(subsystemType);
			if (state != undefined) {
				applHost.controllerLog.logNode(node.id, {
					message: `Subsystem ${
						getEnumMemberName(
							SubsystemType,
							subsystemType,
						)
					} has state ${getEnumMemberName(SubsystemState, state)}`,
					direction: "inbound",
				});
			}
		}

		applHost.controllerLog.logNode(node.id, {
			message: "querying current barrier state...",
			direction: "outbound",
		});
		await api.get();
	}
}

// @publicAPI
export interface BarrierOperatorCCSetOptions extends CCCommandOptions {
	targetState: BarrierState.Open | BarrierState.Closed;
}

@CCCommand(BarrierOperatorCommand.Set)
@useSupervision()
export class BarrierOperatorCCSet extends BarrierOperatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.targetState = options.targetState;
		}
	}

	public targetState: BarrierState.Open | BarrierState.Closed;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.targetState]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "target state": this.targetState },
		};
	}
}

@CCCommand(BarrierOperatorCommand.Report)
export class BarrierOperatorCCReport extends BarrierOperatorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);

		// The payload byte encodes information about the state and position in a single value
		const payloadValue = this.payload[0];
		if (payloadValue <= 99) {
			// known position
			this.position = payloadValue;
		} else if (payloadValue === 255) {
			// known position, fully opened
			this.position = 100;
		} else {
			// unknown position
			this.position = UNKNOWN_STATE;
		}

		if (
			payloadValue === BarrierState.Closed
			|| payloadValue >= BarrierState.Closing
		) {
			// predefined states
			this.currentState = payloadValue;
		} else if (payloadValue > 0 && payloadValue <= 99) {
			// stopped at exact position
			this.currentState = BarrierState.Stopped;
		} else {
			// invalid value, assume unknown
			this.currentState = UNKNOWN_STATE;
		}
	}

	@ccValue(BarrierOperatorCCValues.currentState)
	public readonly currentState: MaybeUnknown<BarrierState>;

	@ccValue(BarrierOperatorCCValues.position)
	public readonly position: MaybeUnknown<number>;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"barrier position": maybeUnknownToString(this.position),
				"barrier state": this.currentState != undefined
					? getEnumMemberName(BarrierState, this.currentState)
					: "unknown",
			},
		};
	}
}

@CCCommand(BarrierOperatorCommand.Get)
@expectedCCResponse(BarrierOperatorCCReport)
export class BarrierOperatorCCGet extends BarrierOperatorCC {}

@CCCommand(BarrierOperatorCommand.SignalingCapabilitiesReport)
export class BarrierOperatorCCSignalingCapabilitiesReport
	extends BarrierOperatorCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		this.supportedSubsystemTypes = parseBitMask(
			this.payload,
			SubsystemType.Audible,
		);
	}

	@ccValue(BarrierOperatorCCValues.supportedSubsystemTypes)
	public readonly supportedSubsystemTypes: readonly SubsystemType[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported types": this.supportedSubsystemTypes
					.map((t) => `\n· ${getEnumMemberName(SubsystemType, t)}`)
					.join(""),
			},
		};
	}
}

@CCCommand(BarrierOperatorCommand.SignalingCapabilitiesGet)
@expectedCCResponse(BarrierOperatorCCSignalingCapabilitiesReport)
export class BarrierOperatorCCSignalingCapabilitiesGet
	extends BarrierOperatorCC
{}

// @publicAPI
export interface BarrierOperatorCCEventSignalingSetOptions
	extends CCCommandOptions
{
	subsystemType: SubsystemType;
	subsystemState: SubsystemState;
}

@CCCommand(BarrierOperatorCommand.EventSignalingSet)
@useSupervision()
export class BarrierOperatorCCEventSignalingSet extends BarrierOperatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCEventSignalingSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.subsystemType = options.subsystemType;
			this.subsystemState = options.subsystemState;
		}
	}
	public subsystemType: SubsystemType;
	public subsystemState: SubsystemState;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.subsystemType, this.subsystemState]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"subsystem type": getEnumMemberName(
					SubsystemType,
					this.subsystemType,
				),
				"subsystem state": getEnumMemberName(
					SubsystemState,
					this.subsystemState,
				),
			},
		};
	}
}

@CCCommand(BarrierOperatorCommand.EventSignalingReport)
export class BarrierOperatorCCEventSignalingReport extends BarrierOperatorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.subsystemType = this.payload[0];
		this.subsystemState = this.payload[1];
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const signalingStateValue = BarrierOperatorCCValues.signalingState(
			this.subsystemType,
		);

		this.ensureMetadata(applHost, signalingStateValue);
		this.setValue(applHost, signalingStateValue, this.subsystemState);

		return true;
	}

	public readonly subsystemType: SubsystemType;
	public readonly subsystemState: SubsystemState;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"subsystem type": getEnumMemberName(
					SubsystemType,
					this.subsystemType,
				),
				"subsystem state": getEnumMemberName(
					SubsystemState,
					this.subsystemState,
				),
			},
		};
	}
}

// @publicAPI
export interface BarrierOperatorCCEventSignalingGetOptions
	extends CCCommandOptions
{
	subsystemType: SubsystemType;
}

@CCCommand(BarrierOperatorCommand.EventSignalingGet)
@expectedCCResponse(BarrierOperatorCCEventSignalingReport)
export class BarrierOperatorCCEventSignalingGet extends BarrierOperatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCEventSignalingGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.subsystemType = options.subsystemType;
		}
	}

	public subsystemType: SubsystemType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.subsystemType]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"subsystem type": getEnumMemberName(
					SubsystemType,
					this.subsystemType,
				),
			},
		};
	}
}
