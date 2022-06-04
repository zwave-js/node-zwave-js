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
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { buffer2hex, getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
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
import { ThermostatMode, ThermostatModeCommand } from "./_Types";

export function getThermostatModeValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Mode"],
		endpoint: endpointIndex,
		property: "mode",
	};
}

export function getSupportedModesValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Mode"],
		endpoint: endpointIndex,
		property: "supportedModes",
	};
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
			// TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
			// aren't able to handle the GET this quickly.
			this.schedulePoll({ property }, value);
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

	@validateArgs({ strictEnums: true })
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
		const response =
			await this.driver.sendCommand<ThermostatModeCCSupportedReport>(
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

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Mode"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// First query the possible modes to set the metadata
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported thermostat modes...",
			direction: "outbound",
		});

		const supportedModes = await api.getSupportedModes();
		if (supportedModes) {
			const logMessage = `received supported thermostat modes:${supportedModes
				.map((mode) => `\n· ${getEnumMemberName(ThermostatMode, mode)}`)
				.join("")}`;
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported thermostat modes timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Mode"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat mode...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			driver.controllerLog.logNode(node.id, {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatModeCCSetOptions,
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(host, options);

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

	public persistValues(): boolean {
		// Update the supported modes if a mode is used that wasn't previously
		// reported to be supported. This shouldn't happen, but well... it does anyways
		const valueDB = this.getValueDB();
		const modeValueId = getThermostatModeValueId(this.endpointIndex);
		const supportedModesValueId = getSupportedModesValueId(
			this.endpointIndex,
		);
		const supportedModes = valueDB.getValue<ThermostatMode[]>(
			supportedModesValueId,
		);

		if (
			supportedModes &&
			this._mode in ThermostatMode &&
			!supportedModes.includes(this._mode)
		) {
			supportedModes.push(this._mode);
			supportedModes.sort();

			valueDB.setValue(supportedModesValueId, supportedModes);
			valueDB.setMetadata(modeValueId, {
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(
					ThermostatMode,
					supportedModes,
				),
			});
		}

		return super.persistValues();
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		this._supportedModes = parseBitMask(this.payload, ThermostatMode.Off);

		// Use this information to create the metadata for the mode property
		const valueId: ValueID = getThermostatModeValueId(this.endpointIndex);
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
