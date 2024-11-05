import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
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
import { Bytes } from "@zwave-js/shared/safe";
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
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	HumidityControlMode,
	HumidityControlModeCommand,
} from "../lib/_Types.js";

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

		const cc = new HumidityControlModeCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

		const cc = new HumidityControlModeCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			mode,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		MaybeNotKnown<readonly HumidityControlMode[]>
	> {
		this.assertSupportsCommand(
			HumidityControlModeCommand,
			HumidityControlModeCommand.SupportedGet,
		);

		const cc = new HumidityControlModeCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			HumidityControlModeCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Humidity Control Mode"])
@implementedVersion(1)
@ccValues(HumidityControlModeCCValues)
export class HumidityControlModeCC extends CommandClass {
	declare ccCommand: HumidityControlModeCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Humidity Control Mode"],
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported humidity control modes timed out, skipping interview...",
				level: "warn",
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
			CommandClasses["Humidity Control Mode"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current humidity control mode...",
			direction: "outbound",
		});
		const currentMode = await api.get();
		if (currentMode) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "received current humidity control mode: "
					+ getEnumMemberName(HumidityControlMode, currentMode),
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface HumidityControlModeCCSetOptions {
	mode: HumidityControlMode;
}

@CCCommand(HumidityControlModeCommand.Set)
@useSupervision()
export class HumidityControlModeCCSet extends HumidityControlModeCC {
	public constructor(
		options: WithAddress<HumidityControlModeCCSetOptions>,
	) {
		super(options);
		this.mode = options.mode;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): HumidityControlModeCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new HumidityControlModeCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public mode: HumidityControlMode;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.mode & 0b1111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				mode: getEnumMemberName(HumidityControlMode, this.mode),
			},
		};
	}
}

// @publicAPI
export interface HumidityControlModeCCReportOptions {
	mode: HumidityControlMode;
}

@CCCommand(HumidityControlModeCommand.Report)
@ccValueProperty("mode", HumidityControlModeCCValues.mode)
export class HumidityControlModeCCReport extends HumidityControlModeCC {
	public constructor(
		options: WithAddress<HumidityControlModeCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.mode = options.mode;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlModeCCReport {
		validatePayload(raw.payload.length >= 1);
		const mode: HumidityControlMode = raw.payload[0] & 0b1111;

		return new this({
			nodeId: ctx.sourceNodeId,
			mode,
		});
	}

	public readonly mode: HumidityControlMode;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				mode: getEnumMemberName(HumidityControlMode, this.mode),
			},
		};
	}
}

@CCCommand(HumidityControlModeCommand.Get)
@expectedCCResponse(HumidityControlModeCCReport)
export class HumidityControlModeCCGet extends HumidityControlModeCC {}

// @publicAPI
export interface HumidityControlModeCCSupportedReportOptions {
	supportedModes: HumidityControlMode[];
}

@CCCommand(HumidityControlModeCommand.SupportedReport)
@ccValueProperty("supportedModes", HumidityControlModeCCValues.supportedModes)
export class HumidityControlModeCCSupportedReport
	extends HumidityControlModeCC
{
	public constructor(
		options: WithAddress<HumidityControlModeCCSupportedReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedModes = options.supportedModes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlModeCCSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const supportedModes: HumidityControlMode[] = parseBitMask(
			raw.payload,
			HumidityControlMode.Off,
		);
		if (!supportedModes.includes(HumidityControlMode.Off)) {
			supportedModes.unshift(HumidityControlMode.Off);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			supportedModes,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Use this information to create the metadata for the mode property
		const modeValue = HumidityControlModeCCValues.mode;
		this.setMetadata(ctx, modeValue, {
			...modeValue.meta,
			states: enumValuesToMetadataStates(
				HumidityControlMode,
				this.supportedModes,
			),
		});

		return true;
	}

	public supportedModes: HumidityControlMode[];

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
