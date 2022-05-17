import type {
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, pick } from "@zwave-js/shared";
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
import { ThermostatFanMode, ThermostatFanModeCommand } from "./_Types";

export function getOffStateValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Fan Mode"],
		endpoint,
		property: "off",
	};
}

export function getModeStateValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Fan Mode"],
		endpoint,
		property: "mode",
	};
}

@API(CommandClasses["Thermostat Fan Mode"])
export class ThermostatFanModeCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatFanModeCommand): Maybe<boolean> {
		switch (cmd) {
			case ThermostatFanModeCommand.Get:
			case ThermostatFanModeCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatFanModeCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		const valueDB = this.endpoint.getNodeUnsafe()!.valueDB;
		if (property === "mode") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			// Preserve the value of the "off" flag
			const off = valueDB.getValue<boolean>(
				getOffStateValueID(this.endpoint.index),
			);
			await this.set(value, off);
		} else if (property === "off") {
			if (typeof value !== "boolean") {
				throwWrongValueType(
					this.ccId,
					property,
					"boolean",
					typeof value,
				);
			}
			const mode = valueDB.getValue<ThermostatFanMode>(
				getModeStateValueID(this.endpoint.index),
			);
			if (mode == undefined) {
				throw new ZWaveError(
					`The "off" property cannot be changed before the fan mode is known!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			await this.set(mode, value);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}

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
			case "off":
				return (await this.get())?.[property];

			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatFanModeCommand,
			ThermostatFanModeCommand.Get,
		);

		const cc = new ThermostatFanModeCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ThermostatFanModeCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["mode", "off"]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(mode: ThermostatFanMode, off?: boolean): Promise<void> {
		this.assertSupportsCommand(
			ThermostatFanModeCommand,
			ThermostatFanModeCommand.Set,
		);

		const cc = new ThermostatFanModeCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
			off,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		readonly ThermostatFanMode[] | undefined
	> {
		this.assertSupportsCommand(
			ThermostatFanModeCommand,
			ThermostatFanModeCommand.SupportedGet,
		);

		const cc = new ThermostatFanModeCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ThermostatFanModeCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Thermostat Fan Mode"])
@implementedVersion(5)
export class ThermostatFanModeCC extends CommandClass {
	declare ccCommand: ThermostatFanModeCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Fan Mode"].withOptions({
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
			message: "querying supported thermostat fan modes...",
			direction: "outbound",
		});

		const supportedModes = await api.getSupportedModes();
		if (supportedModes) {
			const logMessage = `received supported thermostat fan modes:${supportedModes
				.map(
					(mode) =>
						`\n· ${getEnumMemberName(ThermostatFanMode, mode)}`,
				)
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
					"Querying supported thermostat fan modes timed out, skipping interview...",
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
		const api = endpoint.commandClasses["Thermostat Fan Mode"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat fan mode...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			let logMessage = `received current thermostat fan mode: ${getEnumMemberName(
				ThermostatFanMode,
				currentStatus.mode,
			)}`;
			if (currentStatus.off != undefined) {
				logMessage += ` (turned off)`;
			}
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

type ThermostatFanModeCCSetOptions = CCCommandOptions & {
	mode: ThermostatFanMode;
	off?: boolean;
};

@CCCommand(ThermostatFanModeCommand.Set)
export class ThermostatFanModeCCSet extends ThermostatFanModeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatFanModeCCSetOptions,
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
			this.off = options.off;
		}
	}

	public mode: ThermostatFanMode;
	public off: boolean | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.version >= 2 && this.off ? 0b1000_0000 : 0) |
				(this.mode & 0b1111),
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ThermostatFanModeCommand.Report)
export class ThermostatFanModeCCReport extends ThermostatFanModeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._mode = this.payload[0] & 0b1111;

		if (this.version >= 3) {
			this._off = !!(this.payload[0] & 0b1000_0000);
		}

		this.persistValues();
	}

	private _mode: ThermostatFanMode;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		states: enumValuesToMetadataStates(ThermostatFanMode),
		label: "Thermostat fan mode",
	})
	public get mode(): ThermostatFanMode {
		return this._mode;
	}

	private _off: boolean | undefined;
	@ccValue({ minVersion: 3 })
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Thermostat fan turned off",
	})
	public get off(): boolean | undefined {
		return this._off;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		if (this.off != undefined) {
			message.off = this.off;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ThermostatFanModeCommand.Get)
@expectedCCResponse(ThermostatFanModeCCReport)
export class ThermostatFanModeCCGet extends ThermostatFanModeCC {}

@CCCommand(ThermostatFanModeCommand.SupportedReport)
export class ThermostatFanModeCCSupportedReport extends ThermostatFanModeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		this._supportedModes = parseBitMask(
			this.payload,
			ThermostatFanMode["Auto low"],
		);

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
				ThermostatFanMode,
				this._supportedModes,
			),
		});

		this.persistValues();
	}

	private _supportedModes: ThermostatFanMode[];
	@ccValue({ internal: true })
	public get supportedModes(): readonly ThermostatFanMode[] {
		return this._supportedModes;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported modes": this.supportedModes
					.map(
						(mode) =>
							`\n· ${getEnumMemberName(ThermostatFanMode, mode)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(ThermostatFanModeCommand.SupportedGet)
@expectedCCResponse(ThermostatFanModeCCSupportedReport)
export class ThermostatFanModeCCSupportedGet extends ThermostatFanModeCC {}
