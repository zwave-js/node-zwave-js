import type { Maybe, MessageOrCCLogEntry, MessageRecord } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { CCAPI } from "./API";
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

export enum LanguageCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

// @noSetValueAPI It doesn't make sense

@API(CommandClasses.Language)
export class LanguageCCAPI extends CCAPI {
	public supportsCommand(cmd: LanguageCommand): Maybe<boolean> {
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

		const cc = new LanguageCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<LanguageCCReport>(
			cc,
			this.commandOptions,
		))!;
		return {
			language: response.language,
			country: response.country,
		};
	}

	public async set(language: string, country?: string): Promise<void> {
		this.assertSupportsCommand(LanguageCommand, LanguageCommand.Set);

		const cc = new LanguageCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			language,
			country,
		});
		await this.driver.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast()) {
			// Refresh the current value
			await this.get();
		}
	}
}

@commandClass(CommandClasses.Language)
@implementedVersion(1)
export class LanguageCC extends CommandClass {
	declare ccCommand: LanguageCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Language.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		this.driver.controllerLog.logNode(node.id, {
			message: "requesting language setting...",
			direction: "outbound",
		});
		const { language, country } = await api.get();
		const logMessage = `received current language setting: ${language}${
			country != undefined ? "-" + country : ""
		}`;
		this.driver.controllerLog.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface LanguageCCSetOptions extends CCCommandOptions {
	language: string;
	country?: string;
}

@CCCommand(LanguageCommand.Set)
export class LanguageCCSet extends LanguageCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | LanguageCCSetOptions,
	) {
		super(driver, options);
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

	private _country: string | undefined;
	public get country(): string | undefined {
		return this._country;
	}
	public set country(value: string | undefined) {
		if (
			typeof value === "string" &&
			(value.length !== 2 || value.toUpperCase() !== value)
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = { language: this.language };
		if (this._country != undefined) {
			message.country = this._country;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(LanguageCommand.Report)
export class LanguageCCReport extends LanguageCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// if (gotDeserializationOptions(options)) {
		validatePayload(this.payload.length >= 3);
		this.language = this.payload.toString("ascii", 0, 3);
		if (this.payload.length >= 5) {
			this.country = this.payload.toString("ascii", 3, 5);
		}
		// }

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Language code",
	})
	public readonly language: string;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Country code",
	})
	public readonly country: string | undefined;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = { language: this.language };
		if (this.country != undefined) {
			message.country = this.country;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(LanguageCommand.Get)
@expectedCCResponse(LanguageCCReport)
export class LanguageCCGet extends LanguageCC {}
