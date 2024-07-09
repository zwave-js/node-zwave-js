import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ValueMetadata,
	enumValuesToMetadataStates,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	CommandClass,
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
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { ThermostatFanState, ThermostatFanStateCommand } from "../lib/_Types";

export const ThermostatFanStateCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Thermostat Fan State"], {
		...V.staticPropertyWithName(
			"fanState",
			"state",
			{
				...ValueMetadata.ReadOnlyUInt8,
				states: enumValuesToMetadataStates(ThermostatFanState),
				label: "Thermostat fan state",
			} as const,
		),
	}),
});

@API(CommandClasses["Thermostat Fan State"])
export class ThermostatFanStateCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ThermostatFanStateCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatFanStateCommand.Get:
				return this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: ThermostatFanStateCCAPI, { property }) {
			switch (property) {
				case "state":
					return this.get();

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatFanStateCommand,
			ThermostatFanStateCommand.Get,
		);

		const cc = new ThermostatFanStateCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			ThermostatFanStateCCReport
		>(
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
@ccValues(ThermostatFanStateCCValues)
export class ThermostatFanStateCC extends CommandClass {
	declare ccCommand: ThermostatFanStateCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Fan State"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat fan state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "received current thermostat fan state: "
					+ getEnumMemberName(ThermostatFanState, currentStatus),
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
		this.state = this.payload[0] & 0b1111;
	}

	@ccValue(ThermostatFanStateCCValues.fanState)
	public readonly state: ThermostatFanState;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			state: getEnumMemberName(ThermostatFanState, this.state),
		};
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(ThermostatFanStateCommand.Get)
@expectedCCResponse(ThermostatFanStateCCReport)
export class ThermostatFanStateCCGet extends ThermostatFanStateCC {}
