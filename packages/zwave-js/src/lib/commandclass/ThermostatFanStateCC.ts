import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
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
export enum ThermostatFanStateCommand {
	Get = 0x02,
	Report = 0x03,
}

export enum ThermostatFanState {
	"Idle / off" = 0x00,
	"Running / running low" = 0x01,
	"Running high" = 0x02,
	"Running medium" = 0x03,
	"Circulation mode" = 0x04,
	"Humidity circulation mode" = 0x05,
	"Right - left circulation mode" = 0x06,
	"Up - down circulation mode" = 0x07,
	"Quiet circulation mode" = 0x08,
}

@API(CommandClasses["Thermostat Fan State"])
export class ThermostatFanStateCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatFanStateCommand): Maybe<boolean> {
		switch (cmd) {
			case ThermostatFanStateCommand.Get:
				return this.isSinglecast();
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

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatFanStateCommand,
			ThermostatFanStateCommand.Get,
		);

		const cc = new ThermostatFanStateCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ThermostatFanStateCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response?.state;
		}
	}
}

@commandClass(CommandClasses["Thermostat Fan State"])
@implementedVersion(2)
export class ThermostatFanStateCC extends CommandClass {
	declare ccCommand: ThermostatFanStateCommand;

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
		const api = endpoint.commandClasses["Thermostat Fan State"].withOptions(
			{
				priority: MessagePriority.NodeQuery,
			},
		);

		// Query the current status
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat fan state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"received current thermostat fan state: " +
					getEnumMemberName(ThermostatFanState, currentStatus),
				direction: "inbound",
			});
		}
	}
}

@CCCommand(ThermostatFanStateCommand.Report)
export class ThermostatFanStateCCReport extends ThermostatFanStateCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length == 1);
		this._state = this.payload[0] & 0b1111;

		this.persistValues();
	}

	private _state: ThermostatFanState;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		states: enumValuesToMetadataStates(ThermostatFanState),
		label: "Thermostat fan state",
	})
	public get state(): ThermostatFanState {
		return this._state;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			state: getEnumMemberName(ThermostatFanState, this.state),
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ThermostatFanStateCommand.Get)
@expectedCCResponse(ThermostatFanStateCCReport)
export class ThermostatFanStateCCGet extends ThermostatFanStateCC {}
