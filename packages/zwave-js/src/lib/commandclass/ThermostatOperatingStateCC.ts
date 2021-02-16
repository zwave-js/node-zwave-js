import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "./API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum ThermostatOperatingStateCommand {
	Get = 0x02,
	Report = 0x03,
	// TODO: Implement V2 commands
	// LoggingSupportedGet = 0x01,
	// LoggingSupportedReport = 0x04,
	// LoggingGet = 0x05,
	// LoggingReport = 0x06,
}

/**
 * @publicAPI
 */
export enum ThermostatOperatingState {
	"Idle" = 0x00,
	"Heating" = 0x01,
	"Cooling" = 0x02,
	"Fan Only" = 0x03,
	"Pending Heat" = 0x04,
	"Pending Cool" = 0x05,
	"Vent/Economizer" = 0x06,
	"Aux Heating" = 0x07,
	"2nd Stage Heating" = 0x08,
	"2nd Stage Cooling" = 0x09,
	"2nd Stage Aux Heat" = 0x0a,
	"3rd Stage Aux Heat" = 0x0b,
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Thermostat Operating State"])
export class ThermostatOperatingStateCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: ThermostatOperatingStateCommand,
	): Maybe<boolean> {
		switch (cmd) {
			case ThermostatOperatingStateCommand.Get:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "state":
				return this.get();
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	public async get(): Promise<ThermostatOperatingState | undefined> {
		this.assertSupportsCommand(
			ThermostatOperatingStateCommand,
			ThermostatOperatingStateCommand.Get,
		);

		const cc = new ThermostatOperatingStateCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ThermostatOperatingStateCCReport>(
			cc,
			this.commandOptions,
		);
		return response?.state;
	}
}

@commandClass(CommandClasses["Thermostat Operating State"])
@implementedVersion(2)
export class ThermostatOperatingStateCC extends CommandClass {
	declare ccCommand: ThermostatOperatingStateCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses[
			"Thermostat Operating State"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current state
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying thermostat operating state...",
			direction: "outbound",
		});

		const state = await api.get();
		if (state) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received current thermostat operating state: ${getEnumMemberName(
					ThermostatOperatingState,
					state,
				)}`,
				direction: "inbound",
			});
		}
	}
}

@CCCommand(ThermostatOperatingStateCommand.Report)
export class ThermostatOperatingStateCCReport extends ThermostatOperatingStateCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._state = this.payload[0];
		this.persistValues();
	}

	private _state: ThermostatOperatingState;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Operating state",
		states: enumValuesToMetadataStates(ThermostatOperatingState),
	})
	public get state(): ThermostatOperatingState {
		return this._state;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				state: getEnumMemberName(ThermostatOperatingState, this.state),
			},
		};
	}
}

@CCCommand(ThermostatOperatingStateCommand.Get)
@expectedCCResponse(ThermostatOperatingStateCCReport)
export class ThermostatOperatingStateCCGet extends ThermostatOperatingStateCC {}
