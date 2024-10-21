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
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
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
	type CCRaw,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
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

		const cc = new ThermostatFanModeCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

		const cc = new ThermostatFanModeCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
			off,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		MaybeNotKnown<readonly ThermostatFanMode[]>
	> {
		this.assertSupportsCommand(
			ThermostatFanModeCommand,
			ThermostatFanModeCommand.SupportedGet,
		);

		const cc = new ThermostatFanModeCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Fan Mode"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// First query the possible modes to set the metadata
		ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported thermostat fan modes timed out, skipping interview...",
			});
			return;
		}

		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Fan Mode"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
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
		options: ThermostatFanModeCCSetOptions & CCCommandOptions,
	) {
		super(options);
		this.mode = options.mode;
		this.off = options.off;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatFanModeCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ThermostatFanModeCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public mode: ThermostatFanMode;
	public off: boolean | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			(this.off ? 0b1000_0000 : 0)
			| (this.mode & 0b1111),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface ThermostatFanModeCCReportOptions {
	mode: ThermostatFanMode;
	off?: boolean;
}

@CCCommand(ThermostatFanModeCommand.Report)
export class ThermostatFanModeCCReport extends ThermostatFanModeCC {
	public constructor(
		options: ThermostatFanModeCCReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.mode = options.mode;
		this.off = options.off;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatFanModeCCReport {
		validatePayload(raw.payload.length >= 1);
		const mode: ThermostatFanMode = raw.payload[0] & 0b1111;
		// V3+
		const off = !!(raw.payload[0] & 0b1000_0000);

		return new ThermostatFanModeCCReport({
			nodeId: ctx.sourceNodeId,
			mode,
			off,
		});
	}

	@ccValue(ThermostatFanModeCCValues.fanMode)
	public readonly mode: ThermostatFanMode;

	@ccValue(ThermostatFanModeCCValues.turnedOff)
	public readonly off: boolean | undefined;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatFanMode, this.mode),
		};
		if (this.off != undefined) {
			message.off = this.off;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(ThermostatFanModeCommand.Get)
@expectedCCResponse(ThermostatFanModeCCReport)
export class ThermostatFanModeCCGet extends ThermostatFanModeCC {}

// @publicAPI
export interface ThermostatFanModeCCSupportedReportOptions {
	supportedModes: ThermostatFanMode[];
}

@CCCommand(ThermostatFanModeCommand.SupportedReport)
export class ThermostatFanModeCCSupportedReport extends ThermostatFanModeCC {
	public constructor(
		options: ThermostatFanModeCCSupportedReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedModes = options.supportedModes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatFanModeCCSupportedReport {
		const supportedModes: ThermostatFanMode[] = parseBitMask(
			raw.payload,
			ThermostatFanMode["Auto low"],
		);

		return new ThermostatFanModeCCSupportedReport({
			nodeId: ctx.sourceNodeId,
			supportedModes,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Remember which fan modes are supported
		const fanModeValue = ThermostatFanModeCCValues.fanMode;
		this.setMetadata(ctx, fanModeValue, {
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

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
