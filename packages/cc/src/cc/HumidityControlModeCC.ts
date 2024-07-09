import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
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
import { getEnumMemberName } from "@zwave-js/shared/safe";
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
import { HumidityControlMode, HumidityControlModeCommand } from "../lib/_Types";

export const HumidityControlModeCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Humidity Control Mode"], {
		...V.staticProperty(
			"mode",
			{
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(HumidityControlMode),
				label: "Humidity control mode",
			} as const,
		),

		...V.staticProperty("supportedModes", undefined, { internal: true }),
	}),
});

@API(CommandClasses["Humidity Control Mode"])
export class HumidityControlModeCCAPI extends CCAPI {
	public supportsCommand(
		cmd: HumidityControlModeCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case HumidityControlModeCommand.Get:
			case HumidityControlModeCommand.SupportedGet:
				return this.isSinglecast();
			case HumidityControlModeCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: HumidityControlModeCCAPI,
			{ property },
			value,
		) {
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

			const result = await this.set(value);

			// Verify the change after a delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property }, value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: HumidityControlModeCCAPI, { property }) {
			switch (property) {
				case "mode":
					return this.get();

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public async get(): Promise<MaybeNotKnown<HumidityControlMode>> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.Get,
		);

		const cc = new HumidityControlModeCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			HumidityControlModeCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response?.mode;
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(
		mode: HumidityControlMode,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.Set,
		);

		const cc = new HumidityControlModeCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		MaybeNotKnown<readonly HumidityControlMode[]>
	> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.SupportedGet,
		);

		const cc = new HumidityControlModeCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			HumidityControlModeCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Humidity Control Mode"])
@implementedVersion(2)
@ccValues(HumidityControlModeCCValues)
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
			const logMessage = `received supported humidity control modes:${
				supportedModes
					.map(
						(mode) =>
							`\n· ${
								getEnumMemberName(HumidityControlMode, mode)
							}`,
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
				message: "received current humidity control mode: "
					+ getEnumMemberName(HumidityControlMode, currentMode),
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface HumidityControlModeCCSetOptions extends CCCommandOptions {
	mode: HumidityControlMode;
}

@CCCommand(HumidityControlModeCommand.Set)
@useSupervision()
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
		this.mode = this.payload[0] & 0b1111;
	}

	@ccValue(HumidityControlModeCCValues.mode)
	public readonly mode: HumidityControlMode;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export class HumidityControlModeCCSupportedReport
	extends HumidityControlModeCC
{
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

		// Use this information to create the metadata for the mode property
		const modeValue = HumidityControlModeCCValues.mode;
		this.setMetadata(applHost, modeValue, {
			...modeValue.meta,
			states: enumValuesToMetadataStates(
				HumidityControlMode,
				this._supportedModes,
			),
		});

		return true;
	}

	private _supportedModes: HumidityControlMode[];
	@ccValue(HumidityControlModeCCValues.supportedModes)
	public get supportedModes(): readonly HumidityControlMode[] {
		return this._supportedModes;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported modes": this.supportedModes
					.map(
						(mode) =>
							`\n· ${
								getEnumMemberName(
									HumidityControlMode,
									mode,
								)
							}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(HumidityControlModeCommand.SupportedGet)
@expectedCCResponse(HumidityControlModeCCSupportedReport)
export class HumidityControlModeCCSupportedGet extends HumidityControlModeCC {}
