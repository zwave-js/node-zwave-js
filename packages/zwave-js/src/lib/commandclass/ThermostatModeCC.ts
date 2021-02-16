import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { buffer2hex, getEnumMemberName, pick } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
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

// All the supported commands
export enum ThermostatModeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

/**
 * @publicAPI
 */
export enum ThermostatMode {
	"Off" = 0x00,
	"Heat" = 0x01,
	"Cool" = 0x02,
	"Auto" = 0x03,
	"Auxiliary" = 0x04,
	"Resume (on)" = 0x05,
	"Fan" = 0x06,
	"Furnace" = 0x07,
	"Dry" = 0x08,
	"Moist" = 0x09,
	"Auto changeover" = 0x0a,
	"Energy heat" = 0x0b,
	"Energy cool" = 0x0c,
	"Away" = 0x0d,
	"Full power" = 0x0f,
	"Manufacturer specific" = 0x1f,
}

@API(CommandClasses["Thermostat Mode"])
export class ThermostatModeCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatModeCommand): Maybe<boolean> {
		switch (cmd) {
			case ThermostatModeCommand.Get:
			case ThermostatModeCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatModeCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "mode") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		await this.set(value);

		if (this.isSinglecast()) {
			// Verify the current value after a delay
			this.schedulePoll({ property });
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "mode":
				return (await this.get())?.[property];

			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatModeCommand,
			ThermostatModeCommand.Get,
		);

		const cc = new ThermostatModeCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ThermostatModeCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["mode", "manufacturerData"]);
		}
	}

	public async set(
		mode: Exclude<
			ThermostatMode,
			typeof ThermostatMode["Manufacturer specific"]
		>,
	): Promise<void>;
	public async set(
		mode: typeof ThermostatMode["Manufacturer specific"],
		manufacturerData: Buffer,
	): Promise<void>;

	public async set(
		mode: ThermostatMode,
		manufacturerData?: Buffer,
	): Promise<void> {
		this.assertSupportsCommand(
			ThermostatModeCommand,
			ThermostatModeCommand.Set,
		);

		const cc = new ThermostatModeCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
			manufacturerData: manufacturerData as any,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		readonly ThermostatMode[] | undefined
	> {
		this.assertSupportsCommand(
			ThermostatModeCommand,
			ThermostatModeCommand.SupportedGet,
		);

		const cc = new ThermostatModeCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ThermostatModeCCSupportedReport>(
			cc,
			this.commandOptions,
		);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Thermostat Mode"])
@implementedVersion(3)
export class ThermostatModeCC extends CommandClass {
	declare ccCommand: ThermostatModeCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Thermostat Mode"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// First query the possible modes to set the metadata
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported thermostat modes...",
			direction: "outbound",
		});

		const supportedModes = await api.getSupportedModes();
		if (supportedModes) {
			const logMessage = `received supported thermostat modes:${supportedModes
				.map((mode) => `\n· ${getEnumMemberName(ThermostatMode, mode)}`)
				.join("")}`;
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported thermostat modes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Thermostat Mode"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat mode...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"received current thermostat mode: " +
					getEnumMemberName(ThermostatMode, currentStatus.mode),
				direction: "inbound",
			});
		}
	}
}

type ThermostatModeCCSetOptions = CCCommandOptions &
	(
		| {
				mode: Exclude<
					ThermostatMode,
					typeof ThermostatMode["Manufacturer specific"]
				>;
		  }
		| {
				mode: typeof ThermostatMode["Manufacturer specific"];
				manufacturerData: Buffer;
		  }
	);

@CCCommand(ThermostatModeCommand.Set)
export class ThermostatModeCCSet extends ThermostatModeCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatModeCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.mode = options.mode;
			if ("manufacturerData" in options)
				this.manufacturerData = options.manufacturerData;
		}
	}

	public mode: ThermostatMode;
	public manufacturerData?: Buffer;

	public serialize(): Buffer {
		const manufacturerData =
			this.version >= 3 &&
			this.mode === ThermostatMode["Manufacturer specific"] &&
			this.manufacturerData
				? this.manufacturerData
				: Buffer.from([]);
		const manufacturerDataLength = manufacturerData.length;
		this.payload = Buffer.concat([
			Buffer.from([
				((manufacturerDataLength & 0b111) << 5) + (this.mode & 0b11111),
			]),
			manufacturerData,
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatMode, this.mode),
		};
		if (this.manufacturerData != undefined) {
			message["manufacturer data"] = buffer2hex(this.manufacturerData);
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ThermostatModeCommand.Report)
export class ThermostatModeCCReport extends ThermostatModeCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._mode = this.payload[0] & 0b11111;

		if (this.version >= 3) {
			const manufacturerDataLength = this.payload[0] >>> 5;

			validatePayload(this.payload.length >= 1 + manufacturerDataLength);
			if (manufacturerDataLength) {
				this._manufacturerData = this.payload.slice(
					1,
					1 + manufacturerDataLength,
				);
			}
		}
		this.persistValues();
	}

	private _mode: ThermostatMode;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		states: enumValuesToMetadataStates(ThermostatMode),
		label: "Thermostat mode",
	})
	public get mode(): ThermostatMode {
		return this._mode;
	}

	private _manufacturerData: Buffer | undefined;
	@ccValue()
	public get manufacturerData(): Buffer | undefined {
		return this._manufacturerData;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatMode, this.mode),
		};
		if (this.manufacturerData != undefined) {
			message["manufacturer data"] = buffer2hex(this.manufacturerData);
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ThermostatModeCommand.Get)
@expectedCCResponse(ThermostatModeCCReport)
export class ThermostatModeCCGet extends ThermostatModeCC {}

@CCCommand(ThermostatModeCommand.SupportedReport)
export class ThermostatModeCCSupportedReport extends ThermostatModeCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._supportedModes = parseBitMask(this.payload, ThermostatMode.Off);

		// Use this information to create the metadata for the mode property
		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "mode",
		};
		// Only update the dynamic part
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.UInt8,
			states: enumValuesToMetadataStates(
				ThermostatMode,
				this._supportedModes,
			),
		});

		this.persistValues();
	}

	private _supportedModes: ThermostatMode[];
	@ccValue({ internal: true })
	public get supportedModes(): readonly ThermostatMode[] {
		return this._supportedModes;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported modes": this.supportedModes
					.map(
						(mode) =>
							`\n· ${getEnumMemberName(ThermostatMode, mode)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(ThermostatModeCommand.SupportedGet)
@expectedCCResponse(ThermostatModeCCSupportedReport)
export class ThermostatModeCCSupportedGet extends ThermostatModeCC {}
