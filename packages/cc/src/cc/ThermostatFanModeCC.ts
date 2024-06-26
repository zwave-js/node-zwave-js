import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { ThermostatFanMode, ThermostatFanModeCommand } from "../lib/_Types";

export const ThermostatFanModeCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Thermostat Fan Mode"], {
		...V.staticPropertyWithName(
			"turnedOff",
			"off",
			{
				...ValueMetadata.Boolean,
				label: "Thermostat fan turned off",
			} as const,
			{ minVersion: 3 } as const,
		),

		...V.staticPropertyWithName(
			"fanMode",
			"mode",
			{
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(ThermostatFanMode),
				label: "Thermostat fan mode",
			} as const,
		),

		...V.staticPropertyWithName(
			"supportedFanModes",
			"supportedModes",
			undefined,
			{ internal: true },
		),
	}),
});

@API(CommandClasses["Thermostat Fan Mode"])
export class ThermostatFanModeCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ThermostatFanModeCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatFanModeCommand.Get:
			case ThermostatFanModeCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatFanModeCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: ThermostatFanModeCCAPI,
			{ property },
			value,
		) {
			const valueDB = this.getValueDB();
			let result: SupervisionResult | undefined;

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
					ThermostatFanModeCCValues.turnedOff.endpoint(
						this.endpoint.index,
					),
				);
				result = await this.set(value, off);
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
					ThermostatFanModeCCValues.fanMode.endpoint(
						this.endpoint.index,
					),
				);
				if (mode == undefined) {
					throw new ZWaveError(
						`The "off" property cannot be changed before the fan mode is known!`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				result = await this.set(mode, value);
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}

			// Verify the current value after a delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				// TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
				// aren't able to handle the GET this quickly.
				this.schedulePoll({ property }, value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: ThermostatFanModeCCAPI, { property }) {
			switch (property) {
				case "mode":
				case "off":
					return (await this.get())?.[property];

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

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
		const response = await this.applHost.sendCommand<
			ThermostatFanModeCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["mode", "off"]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(
		mode: ThermostatFanMode,
		off?: boolean,
	): Promise<SupervisionResult | undefined> {
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
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		MaybeNotKnown<readonly ThermostatFanMode[]>
	> {
		this.assertSupportsCommand(
			ThermostatFanModeCommand,
			ThermostatFanModeCommand.SupportedGet,
		);

		const cc = new ThermostatFanModeCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			ThermostatFanModeCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Thermostat Fan Mode"])
@implementedVersion(5)
@ccValues(ThermostatFanModeCCValues)
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
			const logMessage = `received supported thermostat fan modes:${
				supportedModes
					.map(
						(mode) =>
							`\n· ${getEnumMemberName(ThermostatFanMode, mode)}`,
					)
					.join("")
			}`;
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
			let logMessage = `received current thermostat fan mode: ${
				getEnumMemberName(
					ThermostatFanMode,
					currentStatus.mode,
				)
			}`;
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

// @publicAPI
export type ThermostatFanModeCCSetOptions = CCCommandOptions & {
	mode: ThermostatFanMode;
	off?: boolean;
};

@CCCommand(ThermostatFanModeCommand.Set)
@useSupervision()
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
			(this.off ? 0b1000_0000 : 0)
			| (this.mode & 0b1111),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		return {
			...super.toLogEntry(host),
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
		this.mode = this.payload[0] & 0b1111;

		if (this.version >= 3) {
			this.off = !!(this.payload[0] & 0b1000_0000);
		}
	}

	@ccValue(ThermostatFanModeCCValues.fanMode)
	public readonly mode: ThermostatFanMode;

	@ccValue(ThermostatFanModeCCValues.turnedOff)
	public readonly off: boolean | undefined;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		if (this.off != undefined) {
			message.off = this.off;
		}
		return {
			...super.toLogEntry(host),
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
		this.supportedModes = parseBitMask(
			this.payload,
			ThermostatFanMode["Auto low"],
		);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Remember which fan modes are supported
		const fanModeValue = ThermostatFanModeCCValues.fanMode;
		this.setMetadata(applHost, fanModeValue, {
			...fanModeValue.meta,
			states: enumValuesToMetadataStates(
				ThermostatFanMode,
				this.supportedModes,
			),
		});

		return true;
	}

	@ccValue(ThermostatFanModeCCValues.supportedFanModes)
	public readonly supportedModes: ThermostatFanMode[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
