import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { clamp } from "alcalzone-shared/math";
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
	type CCResponsePredicate,
	CommandClass,
	type InterviewContext,
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
import { SoundSwitchCommand, type ToneId } from "../lib/_Types.js";

export const SoundSwitchCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Sound Switch"], {
		...V.staticProperty(
			"volume",
			{
				...ValueMetadata.UInt8,
				min: 0,
				max: 100,
				unit: "%",
				label: "Volume",
				allowManualEntry: true,
				states: {
					0: "default",
				},
			} as const,
		),

		...V.staticProperty(
			"toneId",
			{
				...ValueMetadata.UInt8,
				label: "Play Tone",
				valueChangeOptions: ["volume"],
			} as const,
		),

		...V.staticProperty(
			"defaultVolume",
			{
				...ValueMetadata.Number,
				min: 0,
				max: 100,
				unit: "%",
				label: "Default volume",
			} as const,
		),

		...V.staticProperty(
			"defaultToneId",
			{
				...ValueMetadata.Number,
				min: 1,
				max: 254,
				label: "Default tone ID",
			} as const,
		),
	}),
});

@API(CommandClasses["Sound Switch"])
export class SoundSwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: SoundSwitchCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case SoundSwitchCommand.TonesNumberGet:
			case SoundSwitchCommand.ToneInfoGet:
			case SoundSwitchCommand.ConfigurationGet:
			case SoundSwitchCommand.TonePlayGet:
				return this.isSinglecast();
			case SoundSwitchCommand.ConfigurationSet:
			case SoundSwitchCommand.TonePlaySet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async getToneCount(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonesNumberGet,
		);

		const cc = new SoundSwitchCCTonesNumberGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			SoundSwitchCCTonesNumberReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.toneCount;
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getToneInfo(toneId: number) {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.ToneInfoGet,
		);

		const cc = new SoundSwitchCCToneInfoGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			toneId,
		});
		const response = await this.host.sendCommand<
			SoundSwitchCCToneInfoReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) return pick(response, ["duration", "name"]);
	}

	@validateArgs()
	public async setConfiguration(
		defaultToneId: number,
		defaultVolume: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.ConfigurationSet,
		);

		const cc = new SoundSwitchCCConfigurationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			defaultToneId,
			defaultVolume,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.ConfigurationGet,
		);

		const cc = new SoundSwitchCCConfigurationGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			SoundSwitchCCConfigurationReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["defaultToneId", "defaultVolume"]);
		}
	}

	@validateArgs()
	public async play(
		toneId: number,
		volume?: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonePlaySet,
		);

		if (toneId === 0) {
			throw new ZWaveError(
				`Tone ID must be > 0. Use stopPlaying to stop the tone.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new SoundSwitchCCTonePlaySet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			toneId,
			volume,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async stopPlaying(): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonePlaySet,
		);

		const cc = new SoundSwitchCCTonePlaySet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			toneId: 0x00,
			volume: 0x00,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getPlaying() {
		this.assertSupportsCommand(
			SoundSwitchCommand,
			SoundSwitchCommand.TonePlayGet,
		);

		const cc = new SoundSwitchCCTonePlayGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			SoundSwitchCCTonePlayReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["toneId", "volume"]);
		}
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: SoundSwitchCCAPI,
			{ property },
			value,
			options,
		) {
			if (property === "defaultToneId") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				return this.setConfiguration(
					value,
					0xff, /* keep current volume */
				);
			} else if (property === "defaultVolume") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				return this.setConfiguration(
					0x00, /* keep current tone */
					value,
				);
			} else if (property === "volume") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				// Allow playing a tone by first setting the volume, then the tone ID
				this.tryGetValueDB()?.setValue(
					SoundSwitchCCValues.volume.endpoint(
						this.endpoint.index,
					),
					value,
					{ source: "driver", updateTimestamp: false },
				);
			} else if (property === "toneId") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				let result: SupervisionResult | undefined;
				if (value > 0) {
					// Use provided volume or try to use the current volume if it exists
					const volume = options?.volume !== undefined
						? options.volume
						: this.tryGetValueDB()?.getValue<number>(
							SoundSwitchCCValues.volume.endpoint(
								this.endpoint.index,
							),
						);
					result = await this.play(value, volume);
				} else {
					result = await this.stopPlaying();
				}
				if (
					this.isSinglecast()
					&& !supervisedCommandSucceeded(result)
				) {
					// Verify the current value after a (short) delay, unless the command was supervised and successful
					this.schedulePoll({ property }, value, {
						transition: "fast",
					});
				}

				return result;
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: SoundSwitchCCAPI, { property }) {
			switch (property) {
				case "defaultToneId":
				case "defaultVolume":
					return (await this.getConfiguration())?.[property];

				case "toneId":
				case "volume":
					return (await this.getPlaying())?.[property];

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}
}

@commandClass(CommandClasses["Sound Switch"])
@implementedVersion(2)
@ccValues(SoundSwitchCCValues)
export class SoundSwitchCC extends CommandClass {
	declare ccCommand: SoundSwitchCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Sound Switch"],
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

		ctx.logNode(node.id, {
			message: "requesting tone count...",
			direction: "outbound",
		});
		const toneCount = await api.getToneCount();
		if (toneCount != undefined) {
			const logMessage = `supports ${toneCount} tones`;
			ctx.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Querying tone count timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		ctx.logNode(node.id, {
			message: "requesting current sound configuration...",
			direction: "outbound",
		});
		const config = await api.getConfiguration();
		if (config) {
			const logMessage = `received current sound configuration:
default tone ID: ${config.defaultToneId}
default volume: ${config.defaultVolume}`;
			ctx.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		const metadataStates: Record<number, string> = {};
		for (let toneId = 1; toneId <= toneCount; toneId++) {
			ctx.logNode(node.id, {
				message: `requesting info for tone #${toneId}`,
				direction: "outbound",
			});
			const info = await api.getToneInfo(toneId);
			if (!info) continue;
			const logMessage = `received info for tone #${toneId}:
name:     ${info.name}
duration: ${info.duration} seconds`;
			ctx.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
			metadataStates[toneId] = `${info.name} (${info.duration} sec)`;
		}

		// Remember tone count and info on the default tone ID metadata
		this.setMetadata(ctx, SoundSwitchCCValues.defaultToneId, {
			...SoundSwitchCCValues.defaultToneId.meta,
			min: 1,
			max: toneCount,
			states: metadataStates,
		});

		// Remember tone count and info on the tone ID metadata
		this.setMetadata(ctx, SoundSwitchCCValues.toneId, {
			...SoundSwitchCCValues.toneId.meta,
			min: 0,
			max: toneCount,
			states: {
				0: "off",
				...metadataStates,
				[0xff]: "default",
			},
		});

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface SoundSwitchCCTonesNumberReportOptions {
	toneCount: number;
}

@CCCommand(SoundSwitchCommand.TonesNumberReport)
export class SoundSwitchCCTonesNumberReport extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCTonesNumberReportOptions>,
	) {
		super(options);
		this.toneCount = options.toneCount;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCTonesNumberReport {
		validatePayload(raw.payload.length >= 1);
		const toneCount = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			toneCount,
		});
	}

	public toneCount: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.toneCount]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "# of tones": this.toneCount },
		};
	}
}

@CCCommand(SoundSwitchCommand.TonesNumberGet)
@expectedCCResponse(SoundSwitchCCTonesNumberReport)
export class SoundSwitchCCTonesNumberGet extends SoundSwitchCC {}

// @publicAPI
export interface SoundSwitchCCToneInfoReportOptions {
	toneId: number;
	duration: number;
	name: string;
}

@CCCommand(SoundSwitchCommand.ToneInfoReport)
export class SoundSwitchCCToneInfoReport extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCToneInfoReportOptions>,
	) {
		super(options);
		this.toneId = options.toneId;
		this.duration = options.duration;
		this.name = options.name;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCToneInfoReport {
		validatePayload(raw.payload.length >= 4);
		const toneId = raw.payload[0];
		const duration = raw.payload.readUInt16BE(1);
		const nameLength = raw.payload[3];

		validatePayload(raw.payload.length >= 4 + nameLength);
		const name = raw.payload.subarray(4, 4 + nameLength).toString(
			"utf8",
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			toneId,
			duration,
			name,
		});
	}

	public readonly toneId: number;
	public readonly duration: number;
	public readonly name: string;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([this.toneId, 0, 0, this.name.length]),
			Bytes.from(this.name, "utf8"),
		]);
		this.payload.writeUInt16BE(this.duration, 1);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"tone id": this.toneId,
				duration: `${this.duration} seconds`,
				name: this.name,
			},
		};
	}
}

const testResponseForSoundSwitchToneInfoGet: CCResponsePredicate<
	SoundSwitchCCToneInfoGet,
	SoundSwitchCCToneInfoReport
> = (sent, received) => {
	return received.toneId === sent.toneId;
};

// @publicAPI
export interface SoundSwitchCCToneInfoGetOptions {
	toneId: number;
}

@CCCommand(SoundSwitchCommand.ToneInfoGet)
@expectedCCResponse(
	SoundSwitchCCToneInfoReport,
	testResponseForSoundSwitchToneInfoGet,
)
export class SoundSwitchCCToneInfoGet extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCToneInfoGetOptions>,
	) {
		super(options);
		this.toneId = options.toneId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCToneInfoGet {
		validatePayload(raw.payload.length >= 1);
		const toneId = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			toneId,
		});
	}

	public toneId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.toneId]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "tone id": this.toneId },
		};
	}
}

// @publicAPI
export interface SoundSwitchCCConfigurationSetOptions {
	defaultVolume: number;
	defaultToneId: number;
}

@CCCommand(SoundSwitchCommand.ConfigurationSet)
@useSupervision()
export class SoundSwitchCCConfigurationSet extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCConfigurationSetOptions>,
	) {
		super(options);
		this.defaultVolume = options.defaultVolume;
		this.defaultToneId = options.defaultToneId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCConfigurationSet {
		validatePayload(raw.payload.length >= 2);
		const defaultVolume = raw.payload[0];
		const defaultToneId = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			defaultVolume,
			defaultToneId,
		});
	}

	public defaultVolume: number;
	public defaultToneId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.defaultVolume, this.defaultToneId]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"default volume": `${this.defaultVolume} %`,
				"default tone id": this.defaultToneId,
			},
		};
	}
}

// @publicAPI
export interface SoundSwitchCCConfigurationReportOptions {
	defaultVolume: number;
	defaultToneId: number;
}

@CCCommand(SoundSwitchCommand.ConfigurationReport)
@ccValueProperty("defaultVolume", SoundSwitchCCValues.defaultVolume)
@ccValueProperty("defaultToneId", SoundSwitchCCValues.defaultToneId)
export class SoundSwitchCCConfigurationReport extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCConfigurationReportOptions>,
	) {
		super(options);
		this.defaultVolume = options.defaultVolume;
		this.defaultToneId = options.defaultToneId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCConfigurationReport {
		validatePayload(raw.payload.length >= 2);
		const defaultVolume = clamp(raw.payload[0], 0, 100);
		const defaultToneId = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			defaultVolume,
			defaultToneId,
		});
	}

	public defaultVolume: number;

	public defaultToneId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.defaultVolume, this.defaultToneId]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"default volume": `${this.defaultVolume} %`,
				"default tone id": this.defaultToneId,
			},
		};
	}
}

@CCCommand(SoundSwitchCommand.ConfigurationGet)
@expectedCCResponse(SoundSwitchCCConfigurationReport)
export class SoundSwitchCCConfigurationGet extends SoundSwitchCC {}

// @publicAPI
export interface SoundSwitchCCTonePlaySetOptions {
	toneId: ToneId | number;
	// V2+
	volume?: number;
}

@CCCommand(SoundSwitchCommand.TonePlaySet)
@useSupervision()
export class SoundSwitchCCTonePlaySet extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCTonePlaySetOptions>,
	) {
		super(options);
		this.toneId = options.toneId;
		this.volume = options.volume;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCTonePlaySet {
		validatePayload(raw.payload.length >= 1);
		const toneId = raw.payload[0];
		let volume: number | undefined;
		if (toneId !== 0 && raw.payload.length >= 2) {
			volume = raw.payload[1];
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			toneId,
			volume,
		});
	}

	public toneId: ToneId | number;
	public volume?: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.toneId, this.volume ?? 0]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"tone id": this.toneId,
		};
		if (this.volume != undefined) {
			message.volume = this.volume === 0 ? "default" : `${this.volume} %`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface SoundSwitchCCTonePlayReportOptions {
	toneId: ToneId | number;
	// V2+
	volume?: number;
}

@CCCommand(SoundSwitchCommand.TonePlayReport)
@ccValueProperty("toneId", SoundSwitchCCValues.toneId)
@ccValueProperty("volume", SoundSwitchCCValues.volume)
export class SoundSwitchCCTonePlayReport extends SoundSwitchCC {
	public constructor(
		options: WithAddress<SoundSwitchCCTonePlayReportOptions>,
	) {
		super(options);
		this.toneId = options.toneId;
		this.volume = options.volume;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SoundSwitchCCTonePlayReport {
		validatePayload(raw.payload.length >= 1);
		const toneId = raw.payload[0];

		let volume: number | undefined;
		if (toneId !== 0 && raw.payload.length >= 2) {
			volume = raw.payload[1];
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			toneId,
			volume,
		});
	}

	public readonly toneId: ToneId | number;

	public volume?: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.toneId, this.volume ?? 0]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"tone id": this.toneId,
		};
		if (this.volume != undefined) {
			message.volume = this.volume === 0 ? "default" : `${this.volume} %`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(SoundSwitchCommand.TonePlayGet)
@expectedCCResponse(SoundSwitchCCTonePlayReport)
export class SoundSwitchCCTonePlayGet extends SoundSwitchCC {}
