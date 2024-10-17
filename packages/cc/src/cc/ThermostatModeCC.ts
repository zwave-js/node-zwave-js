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
	encodeBitMask,
	enumValuesToMetadataStates,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host/safe";
import { buffer2hex, getEnumMemberName, pick } from "@zwave-js/shared/safe";
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
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
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
import { ThermostatMode, ThermostatModeCommand } from "../lib/_Types";

export const ThermostatModeCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Thermostat Mode"], {
		...V.staticPropertyWithName(
			"thermostatMode",
			"mode",
			{
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(ThermostatMode),
				label: "Thermostat mode",
			} as const,
		),

		...V.staticProperty(
			"manufacturerData",
			{
				...ValueMetadata.ReadOnlyBuffer,
				label: "Manufacturer data",
			} as const,
		),

		...V.staticProperty("supportedModes", undefined, { internal: true }),
	}),
});

@API(CommandClasses["Thermostat Mode"])
export class ThermostatModeCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatModeCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatModeCommand.Get:
			case ThermostatModeCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatModeCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: ThermostatModeCCAPI, { property }, value) {
			if (property !== "mode") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			const result = await this.set(value);

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
		return async function(this: ThermostatModeCCAPI, { property }) {
			switch (property) {
				case "mode":
					return (await this.get())?.[property];

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatModeCommand,
			ThermostatModeCommand.Get,
		);

		const cc = new ThermostatModeCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ThermostatModeCCReport
		>(
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
			(typeof ThermostatMode)["Manufacturer specific"]
		>,
	): Promise<SupervisionResult | undefined>;
	public async set(
		mode: (typeof ThermostatMode)["Manufacturer specific"],
		manufacturerData: Buffer | string,
	): Promise<SupervisionResult | undefined>;

	@validateArgs({ strictEnums: true })
	public async set(
		mode: ThermostatMode,
		manufacturerData?: Buffer | string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ThermostatModeCommand,
			ThermostatModeCommand.Set,
		);

		if (typeof manufacturerData === "string") {
			// We accept the manufacturer data as a hex string. Make sure it's valid
			if (
				manufacturerData.length % 2 !== 0
				|| !/^[0-9a-f]+$/i.test(manufacturerData)
			) {
				throw new ZWaveError(
					`Manufacturer data must be represented as hexadecimal when passed as a string!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			manufacturerData = Buffer.from(manufacturerData, "hex");
		}

		const cc = new ThermostatModeCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
			manufacturerData: manufacturerData as any,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedModes(): Promise<
		MaybeNotKnown<readonly ThermostatMode[]>
	> {
		this.assertSupportsCommand(
			ThermostatModeCommand,
			ThermostatModeCommand.SupportedGet,
		);

		const cc = new ThermostatModeCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ThermostatModeCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedModes;
	}
}

@commandClass(CommandClasses["Thermostat Mode"])
@implementedVersion(3)
@ccValues(ThermostatModeCCValues)
export class ThermostatModeCC extends CommandClass {
	declare ccCommand: ThermostatModeCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Mode"],
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
			message: "querying supported thermostat modes...",
			direction: "outbound",
		});

		const supportedModes = await api.getSupportedModes();
		if (supportedModes) {
			const logMessage = `received supported thermostat modes:${
				supportedModes
					.map((mode) =>
						`\n· ${getEnumMemberName(ThermostatMode, mode)}`
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
					"Querying supported thermostat modes timed out, skipping interview...",
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
			CommandClasses["Thermostat Mode"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current status
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying current thermostat mode...",
			direction: "outbound",
		});
		const currentStatus = await api.get();
		if (currentStatus) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "received current thermostat mode: "
					+ getEnumMemberName(ThermostatMode, currentStatus.mode),
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export type ThermostatModeCCSetOptions =
	& CCCommandOptions
	& (
		| {
			mode: Exclude<
				ThermostatMode,
				(typeof ThermostatMode)["Manufacturer specific"]
			>;
		}
		| {
			mode: (typeof ThermostatMode)["Manufacturer specific"];
			manufacturerData: Buffer;
		}
	);

@CCCommand(ThermostatModeCommand.Set)
@useSupervision()
export class ThermostatModeCCSet extends ThermostatModeCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| ThermostatModeCCSetOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const manufacturerDataLength = (this.payload[0] >>> 5) & 0b111;
			this.mode = this.payload[0] & 0b11111;
			if (manufacturerDataLength > 0) {
				validatePayload(
					this.payload.length >= 1 + manufacturerDataLength,
				);
				this.manufacturerData = this.payload.subarray(
					1,
					1 + manufacturerDataLength,
				);
			}
		} else {
			this.mode = options.mode;
			if ("manufacturerData" in options) {
				this.manufacturerData = options.manufacturerData;
			}
		}
	}

	public mode: ThermostatMode;
	public manufacturerData?: Buffer;

	public serialize(ctx: CCEncodingContext): Buffer {
		const manufacturerData =
			this.mode === ThermostatMode["Manufacturer specific"]
				&& this.manufacturerData
				? this.manufacturerData
				: Buffer.from([]);
		const manufacturerDataLength = manufacturerData.length;
		this.payload = Buffer.concat([
			Buffer.from([
				((manufacturerDataLength & 0b111) << 5) + (this.mode & 0b11111),
			]),
			manufacturerData,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatMode, this.mode),
		};
		if (this.manufacturerData != undefined) {
			message["manufacturer data"] = buffer2hex(this.manufacturerData);
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ThermostatModeCCReportOptions =
	& CCCommandOptions
	& (
		| {
			mode: Exclude<
				ThermostatMode,
				(typeof ThermostatMode)["Manufacturer specific"]
			>;
			manufacturerData?: undefined;
		}
		| {
			mode: (typeof ThermostatMode)["Manufacturer specific"];
			manufacturerData?: Buffer;
		}
	);

@CCCommand(ThermostatModeCommand.Report)
export class ThermostatModeCCReport extends ThermostatModeCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| ThermostatModeCCReportOptions,
	) {
		super(options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.mode = this.payload[0] & 0b11111;

			// V3+
			const manufacturerDataLength = this.payload[0] >>> 5;
			if (manufacturerDataLength > 0) {
				validatePayload(
					this.payload.length >= 1 + manufacturerDataLength,
				);
				this.manufacturerData = this.payload.subarray(
					1,
					1 + manufacturerDataLength,
				);
			}
		} else {
			this.mode = options.mode;
			this.manufacturerData = options.manufacturerData;
		}
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Update the supported modes if a mode is used that wasn't previously
		// reported to be supported. This shouldn't happen, but well... it does anyways
		const thermostatModeValue = ThermostatModeCCValues.thermostatMode;
		const supportedModesValue = ThermostatModeCCValues.supportedModes;

		const supportedModes = this.getValue<ThermostatMode[]>(
			ctx,
			supportedModesValue,
		);

		if (
			supportedModes
			&& this.mode in ThermostatMode
			&& !supportedModes.includes(this.mode)
		) {
			supportedModes.push(this.mode);
			supportedModes.sort();

			this.setMetadata(ctx, thermostatModeValue, {
				...thermostatModeValue.meta,
				states: enumValuesToMetadataStates(
					ThermostatMode,
					supportedModes,
				),
			});
			this.setValue(ctx, supportedModesValue, supportedModes);
		}
		return true;
	}

	@ccValue(ThermostatModeCCValues.thermostatMode)
	public readonly mode: ThermostatMode;

	@ccValue(ThermostatModeCCValues.manufacturerData)
	public readonly manufacturerData: Buffer | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		const manufacturerDataLength =
			this.mode === ThermostatMode["Manufacturer specific"]
				&& this.manufacturerData
				? Math.min(0b111, this.manufacturerData.length)
				: 0;
		this.payload = Buffer.allocUnsafe(1 + manufacturerDataLength);
		this.payload[0] = (manufacturerDataLength << 5) + (this.mode & 0b11111);
		if (manufacturerDataLength) {
			this.manufacturerData!.copy(
				this.payload,
				1,
				0,
				manufacturerDataLength,
			);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			mode: getEnumMemberName(ThermostatMode, this.mode),
		};
		if (this.manufacturerData != undefined) {
			message["manufacturer data"] = buffer2hex(this.manufacturerData);
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(ThermostatModeCommand.Get)
@expectedCCResponse(ThermostatModeCCReport)
export class ThermostatModeCCGet extends ThermostatModeCC {}

// @publicAPI
export interface ThermostatModeCCSupportedReportOptions
	extends CCCommandOptions
{
	supportedModes: ThermostatMode[];
}

@CCCommand(ThermostatModeCommand.SupportedReport)
export class ThermostatModeCCSupportedReport extends ThermostatModeCC {
	public constructor(
		options:
			| CommandClassDeserializationOptions
			| ThermostatModeCCSupportedReportOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.supportedModes = parseBitMask(
				this.payload,
				ThermostatMode.Off,
			);
		} else {
			this.supportedModes = options.supportedModes;
		}
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Use this information to create the metadata for the mode property
		const thermostatModeValue = ThermostatModeCCValues.thermostatMode;
		this.setMetadata(ctx, thermostatModeValue, {
			...thermostatModeValue.meta,
			states: enumValuesToMetadataStates(
				ThermostatMode,
				this.supportedModes,
			),
		});

		return true;
	}

	@ccValue(ThermostatModeCCValues.supportedModes)
	public readonly supportedModes: ThermostatMode[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = encodeBitMask(
			this.supportedModes,
			ThermostatMode["Manufacturer specific"],
			ThermostatMode.Off,
		);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
