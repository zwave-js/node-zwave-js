import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
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
import { ThermostatFanState, ThermostatFanStateCommand } from "./_Types";

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
		const response =
			await this.driver.sendCommand<ThermostatFanStateCCReport>(
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

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Fan State"].withOptions(
			{
				priority: MessagePriority.NodeQuery,
			},
		);

		// Query the current status
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat fan state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			driver.controllerLog.logNode(node.id, {
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

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
