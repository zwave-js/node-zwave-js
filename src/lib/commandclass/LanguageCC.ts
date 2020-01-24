import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import { ValueMetadata } from "../values/Metadata";
import type { Maybe } from "../values/Primitive";
import { CCAPI } from "./API";
import { API, CCCommand, CCCommandOptions, ccValue, ccValueMetadata, CommandClass, commandClass, CommandClassDeserializationOptions, expectedCCResponse, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum LanguageCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@API(CommandClasses.Language)
export class LanguageCCAPI extends CCAPI {
	public supportsCommand(cmd: LanguageCommand): Maybe<boolean> {
		switch (cmd) {
			case LanguageCommand.Get:
			case LanguageCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(LanguageCommand, LanguageCommand.Get);

		const cc = new LanguageCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<LanguageCCReport>(cc))!;
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
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses.Language)
@implementedVersion(1)
export class LanguageCC extends CommandClass {
	declare ccCommand: LanguageCommand;
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
			throw new Error(
				"language must be a 3 digit (lowercase) code according to ISO 639-2",
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
			throw new Error(
				"country must be a 2 digit (uppercase) code according to ISO 3166-1",
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
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
	})
	public readonly language: string;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
	})
	public readonly country: string | undefined;
}

@CCCommand(LanguageCommand.Get)
@expectedCCResponse(LanguageCCReport)
export class LanguageCCGet extends LanguageCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
