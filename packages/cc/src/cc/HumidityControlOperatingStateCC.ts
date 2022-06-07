import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	expectedCCResponse,
	implementedVersion,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	HumidityControlOperatingState,
	HumidityControlOperatingStateCommand,
} from "../lib/_Types";

@API(CommandClasses["Humidity Control Operating State"])
export class HumidityControlOperatingStateCCAPI extends CCAPI {
	public supportsCommand(
		cmd: HumidityControlOperatingStateCommand,
	): Maybe<boolean> {
		switch (cmd) {
			case HumidityControlOperatingStateCommand.Get:
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

	public async get(): Promise<HumidityControlOperatingState | undefined> {
		this.assertSupportsCommand(
			HumidityControlOperatingStateCommand,
			HumidityControlOperatingStateCommand.Get,
		);

		const cc = new HumidityControlOperatingStateCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<HumidityControlOperatingStateCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return response?.state;
		}
	}
}

@commandClass(CommandClasses["Humidity Control Operating State"])
@implementedVersion(1)
export class HumidityControlOperatingStateCC extends CommandClass {
	declare ccCommand: HumidityControlOperatingStateCommand;

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
			CommandClasses["Humidity Control Operating State"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current humidity control operating state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"received current humidity control operating state: " +
					getEnumMemberName(
						HumidityControlOperatingState,
						currentStatus,
					),
				direction: "inbound",
			});
		}
	}
}

@CCCommand(HumidityControlOperatingStateCommand.Report)
export class HumidityControlOperatingStateCCReport extends HumidityControlOperatingStateCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._state = this.payload[0] & 0b1111;
	}

	private _state: HumidityControlOperatingState;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		states: enumValuesToMetadataStates(HumidityControlOperatingState),
		label: "Humidity control operating state",
	})
	public get state(): HumidityControlOperatingState {
		return this._state;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				state: getEnumMemberName(
					HumidityControlOperatingState,
					this.state,
				),
			},
		};
	}
}

@CCCommand(HumidityControlOperatingStateCommand.Get)
@expectedCCResponse(HumidityControlOperatingStateCCReport)
export class HumidityControlOperatingStateCCGet extends HumidityControlOperatingStateCC {}
