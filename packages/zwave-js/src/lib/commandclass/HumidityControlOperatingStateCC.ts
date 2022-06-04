import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
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
import {
	HumidityControlOperatingState,
	HumidityControlOperatingStateCommand,
} from "./_Types";

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

		const cc = new HumidityControlOperatingStateCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<HumidityControlOperatingStateCCReport>(
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
		const api = endpoint.commandClasses[
			"Humidity Control Operating State"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current humidity control operating state...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			driver.controllerLog.logNode(node.id, {
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

		this.persistValues();
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
