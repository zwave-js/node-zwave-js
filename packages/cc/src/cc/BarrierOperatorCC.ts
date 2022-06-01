import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	BarrierOperatorCommand,
	BarrierState,
	SubsystemState,
	SubsystemType,
} from "../lib/_Types";

function getSignalingStateValueId(
	endpoint: number | undefined,
	subsystemType: SubsystemType,
): ValueID {
	return {
		commandClass: CommandClasses["Barrier Operator"],
		endpoint,
		property: "signalingState",
		propertyKey: subsystemType,
	};
}

function getSignalingStateMetadata(
	subsystemType: SubsystemType,
): ValueMetadata {
	return {
		...ValueMetadata.UInt8,
		label: `Signaling State (${getEnumMemberName(
			SubsystemType,
			subsystemType,
		)})`,
		states: enumValuesToMetadataStates(SubsystemState),
	};
}

function getSupportedSubsystemTypesValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses["Barrier Operator"],
		endpoint,
		property: "supportedSubsystemTypes",
	};
}

function getTargetStateValueId(endpoint: number | undefined): ValueID {
	return {
		commandClass: CommandClasses["Barrier Operator"],
		endpoint,
		property: "targetState",
	};
}

@API(CommandClasses["Barrier Operator"])
export class BarrierOperatorCCAPI extends CCAPI {
	public supportsCommand(cmd: BarrierOperatorCommand): Maybe<boolean> {
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
		const response =
			await this.applHost.sendCommand<BarrierOperatorCCReport>(
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
	): Promise<void> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.Set,
		);

		const cc = new BarrierOperatorCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetState,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getSignalingCapabilities(): Promise<
		readonly SubsystemType[] | undefined
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
		const response =
			await this.applHost.sendCommand<BarrierOperatorCCSignalingCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedSubsystemTypes;
	}

	@validateArgs({ strictEnums: true })
	public async getEventSignaling(
		subsystemType: SubsystemType,
	): Promise<SubsystemState | undefined> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.EventSignalingGet,
		);

		const cc = new BarrierOperatorCCEventSignalingGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			subsystemType,
		});
		const response =
			await this.applHost.sendCommand<BarrierOperatorCCEventSignalingReport>(
				cc,
				this.commandOptions,
			);
		return response?.subsystemState;
	}

	@validateArgs({ strictEnums: true })
	public async setEventSignaling(
		subsystemType: SubsystemType,
		subsystemState: SubsystemState,
	): Promise<void> {
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

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
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
			await this.set(targetValue);

			// Verify the change after a delay
			if (this.isSinglecast()) {
				this.schedulePoll({ property }, targetValue);
			}
		} else if (property === "signalingState") {
			if (propertyKey == undefined) {
				throwMissingPropertyKey(this.ccId, property);
			} else if (typeof propertyKey !== "number") {
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.setEventSignaling(propertyKey, value);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
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

@commandClass(CommandClasses["Barrier Operator"])
@implementedVersion(1)
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
		const valueDB = this.getValueDB(applHost);

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Create targetState value if it does not exist
		const targetStateValueID = getTargetStateValueId(this.endpointIndex);
		if (!valueDB.hasMetadata(targetStateValueID)) {
			valueDB.setMetadata(targetStateValueID, {
				...ValueMetadata.UInt8,
				label: "Target Barrier State",
				states: enumValuesToMetadataStates(BarrierState, [
					BarrierState.Open,
					BarrierState.Closed,
				]),
			});
		}

		applHost.controllerLog.logNode(node.id, {
			message: "Querying signaling capabilities...",
			direction: "outbound",
		});
		const resp = await api.getSignalingCapabilities();
		if (resp) {
			applHost.controllerLog.logNode(node.id, {
				message: `Received supported subsystem types: ${resp
					.map((t) => `\n· ${getEnumMemberName(SubsystemType, t)}`)
					.join("")}`,
				direction: "inbound",
			});
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
		const valueDB = this.getValueDB(applHost);

		const supportedSubsystems =
			valueDB.getValue<SubsystemType[]>(
				getSupportedSubsystemTypesValueId(this.endpointIndex),
			) ?? [];

		for (const subsystemType of supportedSubsystems) {
			applHost.controllerLog.logNode(node.id, {
				message: `Querying event signaling state for subsystem ${getEnumMemberName(
					SubsystemType,
					subsystemType,
				)}...`,
				direction: "outbound",
			});
			const state = await api.getEventSignaling(subsystemType);
			if (state != undefined) {
				applHost.controllerLog.logNode(node.id, {
					message: `Subsystem ${getEnumMemberName(
						SubsystemType,
						subsystemType,
					)} has state ${getEnumMemberName(SubsystemState, state)}`,
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

interface BarrierOperatorCCSetOptions extends CCCommandOptions {
	targetState: BarrierState.Open | BarrierState.Closed;
}

@CCCommand(BarrierOperatorCommand.Set)
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

		// return values state and position value
		// if state is 0 - 99 or FF (100%) return the appropriate values.
		// if state is different just use the table and
		// return undefined position

		const payloadValue = this.payload[0];
		this.currentState = payloadValue;
		this.position = undefined;
		if (payloadValue <= 99) {
			this.position = payloadValue;
			if (payloadValue > 0) {
				this.currentState = undefined;
			}
		} else if (payloadValue === 255) {
			this.position = 100;
			this.currentState = payloadValue;
		}
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Current Barrier State",
		states: enumValuesToMetadataStates(BarrierState),
	})
	public readonly currentState: BarrierState | undefined;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Barrier Position",
		unit: "%",
		max: 100,
	})
	public readonly position: number | undefined;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"barrier position": this.position,
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

@CCCommand(BarrierOperatorCommand.SignalingCapabilitiesReport)
export class BarrierOperatorCCSignalingCapabilitiesReport extends BarrierOperatorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		this._supportedsubsystemTypes = parseBitMask(
			this.payload,
			SubsystemType.Audible,
		);
	}

	private _supportedsubsystemTypes: SubsystemType[];
	@ccValue({ internal: true })
	public get supportedSubsystemTypes(): readonly SubsystemType[] {
		return this._supportedsubsystemTypes;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
export class BarrierOperatorCCSignalingCapabilitiesGet extends BarrierOperatorCC {}

interface BarrierOperatorCCEventSignalingSetOptions extends CCCommandOptions {
	subsystemType: SubsystemType;
	subsystemState: SubsystemState;
}

@CCCommand(BarrierOperatorCommand.EventSignalingSet)
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

		const valueId = getSignalingStateValueId(
			this.endpointIndex,
			this.subsystemType,
		);
		const valueDB = this.getValueDB(applHost);

		// Create metadata if it does not exist
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(
				valueId,
				getSignalingStateMetadata(this.subsystemType),
			);
		}

		valueDB.setValue(valueId, this.subsystemState);

		return true;
	}

	public readonly subsystemType: SubsystemType;
	public readonly subsystemState: SubsystemState;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

interface BarrierOperatorCCEventSignalingGetOptions extends CCCommandOptions {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"subsystem type": getEnumMemberName(
					SubsystemType,
					this.subsystemType,
				),
			},
		};
	}
}
