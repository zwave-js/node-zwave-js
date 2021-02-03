import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
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

// @publicAPI
export enum SubsystemType {
	Audible = 0x01,
	Visual = 0x02,
}

// @publicAPI
export enum SubsystemState {
	Off = 0x00,
	On = 0xff,
}

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
		...ValueMetadata.ReadOnlyUInt8,
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

// All the supported commands
export enum BarrierOperatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SignalingCapabilitiesGet = 0x04,
	SignalingCapabilitiesReport = 0x05,
	EventSignalingSet = 0x06,
	EventSignalingGet = 0x07,
	EventSignalingReport = 0x08,
}

/**
 * @publicAPI
 */
export enum BarrierState {
	Closed = 0x00,
	Closing = 0xfc,
	Stopped = 0xfd,
	Opening = 0xfe,
	Open = 0xff,
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

		const cc = new BarrierOperatorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<BarrierOperatorCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["state", "position"]);
		}
	}

	public async set(
		state: BarrierState.Open | BarrierState.Closed,
	): Promise<void> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.Set,
		);

		const cc = new BarrierOperatorCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			state,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getSignalingCapabilities(): Promise<
		readonly SubsystemType[] | undefined
	> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.SignalingCapabilitiesGet,
		);

		const cc = new BarrierOperatorCCSignalingCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<BarrierOperatorCCSignalingCapabilitiesReport>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSubsystemTypes;
	}

	public async getEventSignaling(
		subsystemType: SubsystemType,
	): Promise<SubsystemState | undefined> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.EventSignalingGet,
		);

		const cc = new BarrierOperatorCCEventSignalingGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			subsystemType,
		});
		const response = await this.driver.sendCommand<BarrierOperatorCCEventSignalingReport>(
			cc,
			this.commandOptions,
		);
		return response?.subsystemState;
	}

	public async setEventSignaling(
		subsystemType: SubsystemType,
		subsystemState: SubsystemState,
	): Promise<void> {
		this.assertSupportsCommand(
			BarrierOperatorCommand,
			BarrierOperatorCommand.EventSignalingSet,
		);

		const cc = new BarrierOperatorCCEventSignalingSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			subsystemType,
			subsystemState,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		if (property === "state") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.set(value);
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
			case "state":
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

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Barrier Operator"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		let supportedSubsystems: readonly SubsystemType[];
		if (complete) {
			this.driver.controllerLog.logNode(node.id, {
				message: "querying signaling capabilities...",
				direction: "outbound",
			});
			const resp = await api.getSignalingCapabilities();
			supportedSubsystems = resp ?? [];
			if (resp) {
				this.driver.controllerLog.logNode(node.id, {
					message: `received supported subsystem types: ${resp
						.map(
							(t) => `\n· ${getEnumMemberName(SubsystemType, t)}`,
						)
						.join("")}`,
					direction: "inbound",
				});
			}
		} else {
			supportedSubsystems =
				node.getValue<SubsystemType[]>(
					getSupportedSubsystemTypesValueId(this.endpointIndex),
				) ?? [];
		}

		for (const subsystemType of supportedSubsystems) {
			this.driver.controllerLog.logNode(node.id, {
				message: `querying event signaling state for subsystem ${getEnumMemberName(
					SubsystemType,
					subsystemType,
				)}...`,
				direction: "outbound",
			});
			const state = await api.getEventSignaling(subsystemType);
			if (state != undefined) {
				this.driver.controllerLog.logNode(node.id, {
					message: `subsystem ${getEnumMemberName(
						SubsystemType,
						subsystemType,
					)} has state ${getEnumMemberName(SubsystemState, state)}`,
					direction: "inbound",
				});
			}
		}

		this.driver.controllerLog.logNode(node.id, {
			message: "querying current barrier state...",
			direction: "outbound",
		});
		await api.get();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface BarrierOperatorCCSetOptions extends CCCommandOptions {
	state: BarrierState.Open | BarrierState.Closed;
}

@CCCommand(BarrierOperatorCommand.Set)
export class BarrierOperatorCCSet extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.state = options.state;
		}
	}

	public state: BarrierState.Open | BarrierState.Closed;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.state]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "target state": this.state },
		};
	}
}

@CCCommand(BarrierOperatorCommand.Report)
export class BarrierOperatorCCReport extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);

		// return values state and position value
		// if state is 0 - 99 or FF (100%) return the appropriate values.
		// if state is different just use the table and
		// return undefined position

		const payloadValue = this.payload[0];
		this.state = payloadValue;
		this.position = undefined;
		if (payloadValue <= 99) {
			this.position = payloadValue;
			if (payloadValue > 0) {
				this.state = undefined;
			}
		} else if (payloadValue === 255) {
			this.position = 100;
			this.state = payloadValue;
		}

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Barrier State",
		states: enumValuesToMetadataStates(BarrierState),
	})
	public readonly state: BarrierState | undefined;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Barrier Position",
		unit: "%",
		max: 100,
	})
	public readonly position: number | undefined;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"barrier position": this.position,
				"barrier state":
					this.state != undefined
						? getEnumMemberName(BarrierState, this.state)
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
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		this._supportedsubsystemTypes = parseBitMask(
			this.payload,
			SubsystemType.Audible,
		);

		this.persistValues();
	}

	private _supportedsubsystemTypes: SubsystemType[];
	@ccValue({ internal: true })
	public get supportedSubsystemTypes(): readonly SubsystemType[] {
		return this._supportedsubsystemTypes;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCEventSignalingSetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this.subsystemType = this.payload[0];
		this.subsystemState = this.payload[1];

		this.persistValues();
	}

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		const valueId = getSignalingStateValueId(
			this.endpointIndex,
			this.subsystemType,
		);
		const valueDB = this.getValueDB();

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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCEventSignalingGetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"subsystem type": getEnumMemberName(
					SubsystemType,
					this.subsystemType,
				),
			},
		};
	}
}
