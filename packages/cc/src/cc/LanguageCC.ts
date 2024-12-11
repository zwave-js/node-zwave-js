import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import type {
	GetValueDB,
	MessageOrCCLogEntry,
	MessageRecord,
	SupervisionResult,
	WithAddress,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
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
import { LanguageCommand } from "../lib/_Types.js";

export const LanguageCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Language, {
		...V.staticProperty(
			"language",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Language code",
			} as const,
		),

		...V.staticProperty(
			"country",
			{
				...ValueMetadata.ReadOnlyString,
				label: "Country code",
			} as const,
		),
	}),
});

// @noSetValueAPI It doesn't make sense

@API(CommandClasses.Language)
export class LanguageCCAPI extends CCAPI {
	public supportsCommand(cmd: LanguageCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case LanguageCommand.Get:
				return this.isSinglecast();
			case LanguageCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(LanguageCommand, LanguageCommand.Get);

		const cc = new LanguageCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<LanguageCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["language", "country"]);
		}
	}

	@validateArgs()
	public async set(
		language: string,
		country?: string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(LanguageCommand, LanguageCommand.Set);

		const cc = new LanguageCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			language,
			country,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Language)
@implementedVersion(1)
@ccValues(LanguageCCValues)
export class LanguageCC extends CommandClass {
	declare ccCommand: LanguageCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

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
			CommandClasses.Language,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			message: "requesting language setting...",
			direction: "outbound",
		});
		const resp = await api.get();
		if (resp) {
			const { language, country } = resp;
			const logMessage = `received current language setting: ${language}${
				country != undefined ? `-${country}` : ""
			}`;
			ctx.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface LanguageCCSetOptions {
	language: string;
	country?: string;
}

@CCCommand(LanguageCommand.Set)
@useSupervision()
export class LanguageCCSet extends LanguageCC {
	public constructor(
		options: WithAddress<LanguageCCSetOptions>,
	) {
		super(options);
		// Populate properties from options object
		this._language = options.language;
		this._country = options.country;
	}

	public static from(_raw: CCRaw, _ctx: CCParsingContext): LanguageCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new LanguageCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	private _language: string;
	public get language(): string {
		return this._language;
	}
	public set language(value: string) {
		if (value.length !== 3 || value.toLowerCase() !== value) {
			throw new ZWaveError(
				"language must be a 3 digit (lowercase) code according to ISO 639-2",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this._language = value;
	}

	private _country: MaybeNotKnown<string>;
	public get country(): MaybeNotKnown<string> {
		return this._country;
	}
	public set country(value: MaybeNotKnown<string>) {
		if (
			typeof value === "string"
			&& (value.length !== 2 || value.toUpperCase() !== value)
		) {
			throw new ZWaveError(
				"country must be a 2 digit (uppercase) code according to ISO 3166-1",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this._country = value;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from(this._language, "ascii");
		if (this._country) {
			this.payload = Bytes.concat([
				this.payload,
				Bytes.from(this._country, "ascii"),
			]);
		}
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = { language: this.language };
		if (this._country != undefined) {
			message.country = this._country;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface LanguageCCReportOptions {
	language: string;
	country: MaybeNotKnown<string>;
}

@CCCommand(LanguageCommand.Report)
@ccValueProperty("language", LanguageCCValues.language)
@ccValueProperty("country", LanguageCCValues.country)
export class LanguageCCReport extends LanguageCC {
	public constructor(
		options: WithAddress<LanguageCCReportOptions>,
	) {
		super(options);
		this.language = options.language;
		this.country = options.country;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): LanguageCCReport {
		validatePayload(raw.payload.length >= 3);
		const language = raw.payload.subarray(0, 3).toString("ascii");
		let country: MaybeNotKnown<string>;
		if (raw.payload.length >= 5) {
			country = raw.payload.subarray(3, 5).toString("ascii");
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			language,
			country,
		});
	}

	public readonly language: string;

	public readonly country: MaybeNotKnown<string>;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = { language: this.language };
		if (this.country != undefined) {
			message.country = this.country;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(LanguageCommand.Get)
@expectedCCResponse(LanguageCCReport)
export class LanguageCCGet extends LanguageCC {}
