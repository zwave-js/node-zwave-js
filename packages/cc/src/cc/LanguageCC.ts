import type {
	MessageOrCCLogEntry,
	MessageRecord,
	SupervisionResult,
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
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API";
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
import { LanguageCommand } from "../lib/_Types";

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

		const cc = new LanguageCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<LanguageCCReport>(
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

		const cc = new LanguageCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			language,
			country,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Language)
@implementedVersion(1)
@ccValues(LanguageCCValues)
export class LanguageCC extends CommandClass {
	declare ccCommand: LanguageCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Language,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			message: "requesting language setting...",
			direction: "outbound",
		});
		const resp = await api.get();
		if (resp) {
			const { language, country } = resp;
			const logMessage = `received current language setting: ${language}${
				country != undefined ? `-${country}` : ""
			}`;
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface LanguageCCSetOptions extends CCCommandOptions {
	language: string;
	country?: string;
}

@CCCommand(LanguageCommand.Set)
@useSupervision()
export class LanguageCCSet extends LanguageCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | LanguageCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// Populate properties from options object
			this._language = options.language;
			this._country = options.country;
		}
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

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(!!this._country ? 5 : 3);
		this.payload.write(this._language, 0, "ascii");
		if (!!this._country) this.payload.write(this._country, 3, "ascii");
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = { language: this.language };
		if (this._country != undefined) {
			message.country = this._country;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(LanguageCommand.Report)
export class LanguageCCReport extends LanguageCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		// if (gotDeserializationOptions(options)) {
		validatePayload(this.payload.length >= 3);
		this.language = this.payload.toString("ascii", 0, 3);
		if (this.payload.length >= 5) {
			this.country = this.payload.toString("ascii", 3, 5);
		}
		// }
	}

	@ccValue(LanguageCCValues.language)
	public readonly language: string;

	@ccValue(LanguageCCValues.country)
	public readonly country: MaybeNotKnown<string>;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = { language: this.language };
		if (this.country != undefined) {
			message.country = this.country;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(LanguageCommand.Get)
@expectedCCResponse(LanguageCCReport)
export class LanguageCCGet extends LanguageCC {}
