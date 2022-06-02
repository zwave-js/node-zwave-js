import type {
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
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
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import { ThermostatFanMode, ThermostatFanModeCommand } from "../lib/_Types";

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
		const valueDB = this.getValueDB();
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

		const cc = new ThermostatFanModeCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<ThermostatFanModeCCReport>(
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

		const cc = new ThermostatFanModeCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
			off,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		readonly ThermostatFanMode[] | undefined
	> {
		this.assertSupportsCommand(
			ThermostatFanModeCommand,
			ThermostatFanModeCommand.SupportedGet,
		);

		const cc = new ThermostatFanModeCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<ThermostatFanModeCCSupportedReport>(
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Fan Mode"],
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
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported thermostat fan modes timed out, skipping interview...",
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
			CommandClasses["Thermostat Fan Mode"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		return {
			...super.toLogEntry(applHost),
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		if (this.off != undefined) {
			message.off = this.off;
		}
		return {
			...super.toLogEntry(applHost),
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
				ThermostatFanMode,
				this._supportedModes,
			),
		});

		return true;
	}

	private _supportedModes: ThermostatFanMode[];
	@ccValue({ internal: true })
	public get supportedModes(): readonly ThermostatFanMode[] {
		return this._supportedModes;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
