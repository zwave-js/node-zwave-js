import type { ValueID } from "@zwave-js/core/safe";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	ccValueMetadata,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { HumidityControlMode, HumidityControlModeCommand } from "../lib/_Types";

@API(CommandClasses["Humidity Control Mode"])
export class HumidityControlModeCCAPI extends CCAPI {
	public supportsCommand(cmd: HumidityControlModeCommand): Maybe<boolean> {
		switch (cmd) {
			case HumidityControlModeCommand.Get:
			case HumidityControlModeCommand.SupportedGet:
				return this.isSinglecast();
			case HumidityControlModeCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property === "mode") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
		await this.set(value);

		if (this.isSinglecast()) {
			this.schedulePoll({ property }, value);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "mode":
				return this.get();

			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	public async get(): Promise<HumidityControlMode | undefined> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.Get,
		);

		const cc = new HumidityControlModeCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<HumidityControlModeCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return response?.mode;
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(mode: HumidityControlMode): Promise<void> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.Set,
		);

		const cc = new HumidityControlModeCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		readonly HumidityControlMode[] | undefined
	> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.SupportedGet,
		);

		const cc = new HumidityControlModeCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<HumidityControlModeCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Humidity Control Mode"])
@implementedVersion(2)
export class HumidityControlModeCC extends CommandClass {
	declare ccCommand: HumidityControlModeCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Humidity Control Mode"],
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

		// First query the possible modes to set the metadata
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported humidity control modes...",
			direction: "outbound",
		});

		const supportedModes = await api.getSupportedModes();
		if (supportedModes) {
			const logMessage = `received supported humidity control modes:${supportedModes
				.map(
					(mode) =>
						`\n· ${getEnumMemberName(HumidityControlMode, mode)}`,
				)
				.join("")}`;
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported humidity control modes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Humidity Control Mode"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current humidity control mode...",
			direction: "outbound",
		});
		const currentMode = await api.get();
		if (currentMode) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"received current humidity control mode: " +
					getEnumMemberName(HumidityControlMode, currentMode),
				direction: "inbound",
			});
		}
	}
}

interface HumidityControlModeCCSetOptions extends CCCommandOptions {
	mode: HumidityControlMode;
}

@CCCommand(HumidityControlModeCommand.Set)
export class HumidityControlModeCCSet extends HumidityControlModeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlModeCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.mode = options.mode;
		}
	}

	public mode: HumidityControlMode;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.mode & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				mode: getEnumMemberName(HumidityControlMode, this.mode),
			},
		};
	}
}

@CCCommand(HumidityControlModeCommand.Report)
export class HumidityControlModeCCReport extends HumidityControlModeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._mode = this.payload[0] & 0b1111;
	}

	private _mode: HumidityControlMode;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		states: enumValuesToMetadataStates(HumidityControlMode),
		label: "Humidity control mode",
	})
	public get mode(): HumidityControlMode {
		return this._mode;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				mode: getEnumMemberName(HumidityControlMode, this.mode),
			},
		};
	}
}

@CCCommand(HumidityControlModeCommand.Get)
@expectedCCResponse(HumidityControlModeCCReport)
export class HumidityControlModeCCGet extends HumidityControlModeCC {}

@CCCommand(HumidityControlModeCommand.SupportedReport)
export class HumidityControlModeCCSupportedReport extends HumidityControlModeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._supportedModes = parseBitMask(
			this.payload,
			HumidityControlMode.Off,
		);

		if (!this._supportedModes.includes(HumidityControlMode.Off)) {
			this._supportedModes.unshift(HumidityControlMode.Off);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		// Use this information to create the metadata for the mode property
		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "mode",
		};
		// Only update the dynamic part
		valueDB.setMetadata(valueId, {
			...ValueMetadata.UInt8,
			states: enumValuesToMetadataStates(
				HumidityControlMode,
				this._supportedModes,
			),
		});

		return true;
	}

	private _supportedModes: HumidityControlMode[];
	@ccValue({ internal: true })
	public get supportedModes(): readonly HumidityControlMode[] {
		return this._supportedModes;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"supported modes": this.supportedModes
					.map(
						(mode) =>
							`\n· ${getEnumMemberName(
								HumidityControlMode,
								mode,
							)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(HumidityControlModeCommand.SupportedGet)
@expectedCCResponse(HumidityControlModeCCSupportedReport)
export class HumidityControlModeCCSupportedGet extends HumidityControlModeCC {}
