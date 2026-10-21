import {
	CommandClasses,
	type GetNode,
	type GetValueDB,
	type MaybeNotKnown,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type NodeId,
	type SupervisionResult,
	type SupportsCC,
	UNKNOWN_STATE,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	logList,
	logText,
	maybeUnknownToString,
	parseBitMask,
	encodeBitMask,
	parseEnumValue,
	validatePayload,
} from "@zwave-js/core";
import {
	Bytes,
	getEnumMemberName,
	isEnumMember,
	noop,
	pick,
} from "@zwave-js/shared";
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
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	type RefreshValuesOptions,
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
	BarrierOperatorCommand,
	BarrierState,
	SubsystemState,
	SubsystemType,
} from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

import { ApplicationStatusCCRejectedRequest } from "./ApplicationStatusCC.js";

export const BarrierOperatorCCValues = V.defineCCValues(
	CommandClasses["Barrier Operator"],
	{
		...V.staticProperty("supportedSubsystemTypes", undefined, {
			internal: true,
		}),

		...V.staticProperty("position", {
			...ValueMetadata.ReadOnlyUInt8,
			label: "Barrier Position",
			unit: "%",
			max: 100,
		}),

		...V.staticProperty("targetState", {
			...ValueMetadata.UInt8,
			label: "Target Barrier State",
			states: enumValuesToMetadataStates(BarrierState, [
				BarrierState.Open,
				BarrierState.Closed,
			]),
		}),

		...V.staticProperty("currentState", {
			...ValueMetadata.ReadOnlyUInt8,
			label: "Current Barrier State",
			states: enumValuesToMetadataStates(BarrierState),
		}),

		...V.dynamicPropertyAndKeyWithName(
			"signalingState",
			"signalingState",
			(subsystemType: SubsystemType) => subsystemType,
			({ property, propertyKey }) =>
				property === "signalingState"
				&& typeof propertyKey === "number",
			(subsystemType: SubsystemType) => ({
				...ValueMetadata.UInt8,
				label: `Signaling State (${getEnumMemberName(
					SubsystemType,
					subsystemType,
				)})`,
				states: enumValuesToMetadataStates(SubsystemState),
			}),
		),
	},
);

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

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.Get,
		);

		const cc = new BarrierOperatorCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<BarrierOperatorCCReport>(
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

		const cc = new BarrierOperatorCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			targetState,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getSignalingCapabilities(): Promise<
		MaybeNotKnown<readonly SubsystemType[]>
	> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.SignalingCapabilitiesGet,
		);

		const cc = new BarrierOperatorCCSignalingCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<BarrierOperatorCCSignalingCapabilitiesReport>(
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

		const cc = new BarrierOperatorCCEventSignalingGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			subsystemType,
		});
		const response =
			await this.host.sendCommand<BarrierOperatorCCEventSignalingReport>(
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

		const cc = new BarrierOperatorCCEventSignalingSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			subsystemType,
			subsystemState,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function (
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

				const targetValue =
					value === BarrierState.Closed
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
			const currentStateValueId =
				BarrierOperatorCCValues.currentState.endpoint(
					this.endpoint.index,
				);

			const targetValue =
				value === BarrierState.Closed
					? BarrierState.Closed
					: BarrierState.Open;

			return {
				// This is the target value for a split target/current state pair.
				isSplitStateTargetValue: true,
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
						const affectedNodes =
							this.endpoint.node.physicalNodes.filter((node) =>
								node
									.getEndpoint(this.endpoint.index)
									?.supportsCC(this.ccId),
							);
						// and optimistically update the currentValue
						for (const node of affectedNodes) {
							this.host
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
			const signalingStateValueId =
				BarrierOperatorCCValues.signalingState(subsystemType).endpoint(
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
		return async function (
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

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Barrier Operator"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
			tag: "interview",
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Create targetState value if it does not exist
		this.ensureMetadata(ctx, BarrierOperatorCCValues.targetState);

		ctx.logNode(node.id, {
			message: "Querying signaling capabilities...",
			direction: "outbound",
		});
		const resp = await api.getSignalingCapabilities();
		if (resp) {
			ctx.logNode(node.id, {
				message: logText("Received supported subsystem types:", {
					nested: logList(
						resp.map((t) => getEnumMemberName(SubsystemType, t)),
					),
				}),
				direction: "inbound",
			});

			// Enable all supported subsystems
			for (const subsystemType of resp) {
				// Some devices report invalid subsystem types, but the CC API checks
				// for valid values and throws otherwise.
				if (!isEnumMember(SubsystemType, subsystemType)) continue;

				ctx.logNode(node.id, {
					message: `Enabling subsystem ${getEnumMemberName(
						SubsystemType,
						subsystemType,
					)}...`,
					direction: "outbound",
				});
				await api
					.setEventSignaling(subsystemType, SubsystemState.On)
					.catch(noop);
			}
		}

		await this.refreshValues(ctx, { tag: "interview" });

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
		options?: RefreshValuesOptions,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Barrier Operator"],
			ctx,
			endpoint,
		).withOptions({
			priority: options?.priority ?? MessagePriority.NodeQuery,
			tag: options?.tag,
		});

		const supportedSubsystems: SubsystemType[] =
			this.getValue(ctx, BarrierOperatorCCValues.supportedSubsystemTypes)
			?? [];

		for (const subsystemType of supportedSubsystems) {
			// Some devices report invalid subsystem types, but the CC API checks
			// for valid values and throws otherwise.
			if (!isEnumMember(SubsystemType, subsystemType)) continue;

			ctx.logNode(node.id, {
				message: `Querying event signaling state for subsystem ${getEnumMemberName(
					SubsystemType,
					subsystemType,
				)}...`,
				direction: "outbound",
			});
			const state = await api.getEventSignaling(subsystemType);
			if (state != undefined) {
				ctx.logNode(node.id, {
					message: `Subsystem ${getEnumMemberName(
						SubsystemType,
						subsystemType,
					)} has state ${getEnumMemberName(SubsystemState, state)}`,
					direction: "inbound",
				});
			}
		}

		ctx.logNode(node.id, {
			message: "querying current barrier state...",
			direction: "outbound",
		});
		await api.get();
	}
}

// @publicAPI
export interface BarrierOperatorCCSetOptions {
	targetState: BarrierState.Open | BarrierState.Closed;
}

function getCCResponseForBarrierOperatorCCSet(
	ctx: GetNode<NodeId & SupportsCC>,
	sent: BarrierOperatorCCSet,
) {
	// CC:0066.01.01.11.009: If the requested operation is prohibited by
	// the specific device class [...], the device MUST notify the requester
	// by issuing an Application Rejected Request Command
	if (
		sent.isSinglecast()
		&& !sent.isEncapsulatedWith(CommandClasses.Supervision)
		&& ctx
			.getNode(sent.nodeId)
			?.supportsCC(CommandClasses["Application Status"])
	) {
		return ApplicationStatusCCRejectedRequest;
	}
}

@CCCommand(BarrierOperatorCommand.Set)
@expectedCCResponse(getCCResponseForBarrierOperatorCCSet)
@useSupervision()
export class BarrierOperatorCCSet extends BarrierOperatorCC {
	public constructor(options: WithAddress<BarrierOperatorCCSetOptions>) {
		super(options);
		this.targetState = options.targetState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BarrierOperatorCCSet {
		validatePayload(raw.payload.length >= 1);
		const targetState = raw.payload[0];
		validatePayload(
			targetState === BarrierState.Open
				|| targetState === BarrierState.Closed,
		);
		return new this({ nodeId: ctx.sourceNodeId, targetState });
	}

	public targetState: BarrierState.Open | BarrierState.Closed;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.targetState]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "target state": this.targetState },
		};
	}
}

// @publicAPI
export interface BarrierOperatorCCReportOptions {
	position: MaybeUnknown<number>;
	currentState: MaybeUnknown<BarrierState>;
}

@CCCommand(BarrierOperatorCommand.Report)
@ccValueProperty("currentState", BarrierOperatorCCValues.currentState)
@ccValueProperty("position", BarrierOperatorCCValues.position)
export class BarrierOperatorCCReport extends BarrierOperatorCC {
	public constructor(options: WithAddress<BarrierOperatorCCReportOptions>) {
		super(options);

		// TODO: Check implementation:
		this.position = options.position;
		this.currentState = options.currentState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BarrierOperatorCCReport {
		validatePayload(raw.payload.length >= 1);
		// The payload byte encodes information about the state and position in a single value
		const payloadValue = raw.payload[0];
		let position: MaybeUnknown<number>;
		if (payloadValue <= 99) {
			// known position
			position = payloadValue;
		} else if (payloadValue === 255) {
			// known position, fully opened
			position = 100;
		} else {
			// unknown position
			position = UNKNOWN_STATE;
		}

		let currentState: MaybeUnknown<BarrierState>;
		if (
			payloadValue === BarrierState.Closed
			|| payloadValue >= BarrierState.Closing
		) {
			// predefined states
			currentState = payloadValue;
		} else if (payloadValue > 0 && payloadValue <= 99) {
			// stopped at exact position
			currentState = BarrierState.Stopped;
		} else {
			// invalid value, assume unknown
			currentState = UNKNOWN_STATE;
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			position,
			currentState,
		});
	}

	public readonly currentState: MaybeUnknown<BarrierState>;

	public readonly position: MaybeUnknown<number>;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		let value: number;
		if (
			this.currentState === BarrierState.Stopped
			&& typeof this.position === "number"
		) {
			value = this.position === 100 ? 0xff : this.position;
		} else if (this.currentState != null) {
			value = this.currentState;
		} else {
			throw new ZWaveError(
				"Cannot serialize a Barrier Operator Report without a known state",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.payload = Bytes.from([value]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"barrier position": maybeUnknownToString(this.position),
				"barrier state":
					this.currentState != undefined
						? getEnumMemberName(BarrierState, this.currentState)
						: "unknown",
			},
		};
	}
}

@CCCommand(BarrierOperatorCommand.Get)
@expectedCCResponse(BarrierOperatorCCReport)
export class BarrierOperatorCCGet extends BarrierOperatorCC {}

// @publicAPI
export interface BarrierOperatorCCSignalingCapabilitiesReportOptions {
	supportedSubsystemTypes: SubsystemType[];
}

@CCCommand(BarrierOperatorCommand.SignalingCapabilitiesReport)
@ccValueProperty(
	"supportedSubsystemTypes",
	BarrierOperatorCCValues.supportedSubsystemTypes,
)
export class BarrierOperatorCCSignalingCapabilitiesReport extends BarrierOperatorCC {
	public constructor(
		options: WithAddress<BarrierOperatorCCSignalingCapabilitiesReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedSubsystemTypes = options.supportedSubsystemTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BarrierOperatorCCSignalingCapabilitiesReport {
		const supportedSubsystemTypes: SubsystemType[] = parseBitMask(
			raw.payload,
			SubsystemType.Audible,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			supportedSubsystemTypes,
		});
	}

	public readonly supportedSubsystemTypes: readonly SubsystemType[];

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = encodeBitMask(
			this.supportedSubsystemTypes,
			undefined,
			SubsystemType.Audible,
		);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported types": logList(
					this.supportedSubsystemTypes.map((t) =>
						getEnumMemberName(SubsystemType, t),
					),
				),
			},
		};
	}
}

@CCCommand(BarrierOperatorCommand.SignalingCapabilitiesGet)
@expectedCCResponse(BarrierOperatorCCSignalingCapabilitiesReport)
export class BarrierOperatorCCSignalingCapabilitiesGet extends BarrierOperatorCC {}

// @publicAPI
export interface BarrierOperatorCCEventSignalingSetOptions {
	subsystemType: SubsystemType;
	subsystemState: SubsystemState;
}

@CCCommand(BarrierOperatorCommand.EventSignalingSet)
@useSupervision()
export class BarrierOperatorCCEventSignalingSet extends BarrierOperatorCC {
	public constructor(
		options: WithAddress<BarrierOperatorCCEventSignalingSetOptions>,
	) {
		super(options);
		this.subsystemType = options.subsystemType;
		this.subsystemState = options.subsystemState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BarrierOperatorCCEventSignalingSet {
		validatePayload(raw.payload.length >= 2);
		const subsystemType = parseEnumValue(SubsystemType, raw.payload[0]);
		const subsystemState = parseEnumValue(SubsystemState, raw.payload[1]);
		return new this({
			nodeId: ctx.sourceNodeId,
			subsystemType,
			subsystemState,
		});
	}

	public subsystemType: SubsystemType;
	public subsystemState: SubsystemState;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.subsystemType, this.subsystemState]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
export interface BarrierOperatorCCEventSignalingReportOptions {
	subsystemType: SubsystemType;
	subsystemState: SubsystemState;
}

@CCCommand(BarrierOperatorCommand.EventSignalingReport)
export class BarrierOperatorCCEventSignalingReport extends BarrierOperatorCC {
	public constructor(
		options: WithAddress<BarrierOperatorCCEventSignalingReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.subsystemType = options.subsystemType;
		this.subsystemState = options.subsystemState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BarrierOperatorCCEventSignalingReport {
		validatePayload(raw.payload.length >= 2);
		const subsystemType = parseEnumValue(SubsystemType, raw.payload[0]);
		const subsystemState = parseEnumValue(SubsystemState, raw.payload[1]);

		return new this({
			nodeId: ctx.sourceNodeId,
			subsystemType,
			subsystemState,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		const signalingStateValue = BarrierOperatorCCValues.signalingState(
			this.subsystemType,
		);

		this.ensureMetadata(ctx, signalingStateValue);
		this.setValue(ctx, signalingStateValue, this.subsystemState);

		return true;
	}

	public readonly subsystemType: SubsystemType;
	public readonly subsystemState: SubsystemState;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.subsystemType, this.subsystemState]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
export interface BarrierOperatorCCEventSignalingGetOptions {
	subsystemType: SubsystemType;
}

@CCCommand(BarrierOperatorCommand.EventSignalingGet)
@expectedCCResponse(BarrierOperatorCCEventSignalingReport)
export class BarrierOperatorCCEventSignalingGet extends BarrierOperatorCC {
	public constructor(
		options: WithAddress<BarrierOperatorCCEventSignalingGetOptions>,
	) {
		super(options);
		this.subsystemType = options.subsystemType;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BarrierOperatorCCEventSignalingGet {
		validatePayload(raw.payload.length >= 1);
		const subsystemType = parseEnumValue(SubsystemType, raw.payload[0]);
		return new this({ nodeId: ctx.sourceNodeId, subsystemType });
	}

	public subsystemType: SubsystemType;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.subsystemType]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"subsystem type": getEnumMemberName(
					SubsystemType,
					this.subsystemType,
				),
			},
		};
	}
}
