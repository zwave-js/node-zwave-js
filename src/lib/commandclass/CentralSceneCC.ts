import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject, validatePayload } from "../util/misc";
import { ValueMetadata } from "../values/Metadata";
import { parseBitMask } from "../values/Primitive";
import {
	CCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
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
import { CommandClasses } from "./CommandClasses";

export enum CentralSceneCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Notification = 0x03,
	ConfigurationSet = 0x04,
	ConfigurationGet = 0x05,
	ConfigurationReport = 0x06,
}

export enum CentralSceneKeys {
	KeyPressed = 0x00,
	KeyReleased = 0x01,
	KeyHeldDown = 0x02,
	KeyPressed2x = 0x03,
	KeyPressed3x = 0x04,
	KeyPressed4x = 0x05,
	KeyPressed5x = 0x06,
}

@API(CommandClasses["Central Scene"])
export class CentralSceneCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getSupported() {
		const cc = new CentralSceneCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			CentralSceneCCSupportedReport
		>(cc))!;
		return {
			sceneCount: response.sceneCount,
			supportsSlowRefresh: response.supportsSlowRefresh,
			supportsKeyAttribute: response.supportsKeyAttribute.bind(response),
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getConfiguration() {
		const cc = new CentralSceneCCConfigurationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			CentralSceneCCConfigurationReport
		>(cc))!;
		return {
			slowRefresh: response.slowRefresh,
		};
	}

	public async setConfiguration(slowRefresh: boolean): Promise<void> {
		const cc = new CentralSceneCCConfigurationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			slowRefresh,
		});
		await this.driver.sendCommand(cc);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ propertyName },
		value,
	): Promise<void> => {
		if (propertyName !== "slowRefresh") {
			throwUnsupportedProperty(this.ccId, propertyName);
		}
		if (typeof value !== "boolean") {
			throwWrongValueType(
				this.ccId,
				propertyName,
				"boolean",
				typeof value,
			);
		}
		await this.setConfiguration(value);
	};
}

export interface CentralSceneCC {
	ccCommand: CentralSceneCommand;
}

@commandClass(CommandClasses["Central Scene"])
@implementedVersion(3)
export class CentralSceneCC extends CommandClass {
	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			// TODO: ^ OR v
			CommandClasses["Multi Channel Association"],
			CommandClasses["Association Group Information"],
		];
	}

	public static translatePropertyKey(
		propertyName: string,
		propertyKey: number | string,
	): string {
		if (/^scene\d+/.test(propertyName)) {
			return CentralSceneKeys[propertyKey as number];
		} else {
			return super.translatePropertyKey(propertyName, propertyKey);
		}
	}
}

@CCCommand(CentralSceneCommand.Notification)
export class CentralSceneCCNotification extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this._sequenceNumber = this.payload[0];
		this._keyAttribute = this.payload[1] & 0b111;
		this._sceneNumber = this.payload[2];
		if (this._keyAttribute === CentralSceneKeys.KeyHeldDown) {
			// A receiving node MUST ignore this field if the command is not
			// carrying the Key Held Down key attribute.
			this._slowRefresh = !!(this.payload[1] & 0b1000_0000);
		}
		// The described behavior is pretty complicated, so we cannot just store
		// the value and call it a day. Handling of these notifications will
		// happen in the receiving node class
	}

	private _sequenceNumber: number;
	public get sequenceNumber(): number {
		return this._sequenceNumber;
	}

	private _keyAttribute: CentralSceneKeys;
	public get keyAttribute(): CentralSceneKeys {
		return this._keyAttribute;
	}

	private _sceneNumber: number;
	public get sceneNumber(): number {
		return this._sceneNumber;
	}

	private _slowRefresh: boolean | undefined;
	public get slowRefresh(): boolean | undefined {
		return this._slowRefresh;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			sequenceNumber: this.sequenceNumber,
			keyAttribute: CentralSceneKeys[this.keyAttribute],
			sceneNumber: this.sceneNumber,
			slowRefresh: this.slowRefresh,
		});
	}
}

@CCCommand(CentralSceneCommand.SupportedReport)
export class CentralSceneCCSupportedReport extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._sceneCount = this.payload[0];
		this._supportsSlowRefresh = !!(this.payload[1] & 0b1000_0000);
		const bitMaskBytes = this.payload[1] & 0b110;
		this._keyAttributesHaveIdenticalSupport = !!(this.payload[1] & 0b1);
		const numEntries = this._keyAttributesHaveIdenticalSupport
			? 1
			: this.sceneCount;

		validatePayload(this.payload.length >= 2 + bitMaskBytes * numEntries);
		for (let i = 0; i < numEntries; i++) {
			const mask = this.payload.slice(
				2 + i * bitMaskBytes,
				2 + (i + 1) * bitMaskBytes,
			);
			this._supportedKeyAttributes.set(i + 1, parseBitMask(mask));
		}
		this.persistValues();
	}

	// TODO: Use all these values to define the sceneXYZ values and metadata

	private _sceneCount: number;
	@ccValue({ internal: true })
	public get sceneCount(): number {
		return this._sceneCount;
	}

	// TODO: Only offer `slowRefresh` if this is true
	private _supportsSlowRefresh: boolean;
	@ccValue({ internal: true })
	public get supportsSlowRefresh(): boolean {
		return this._supportsSlowRefresh;
	}

	private _supportedKeyAttributes = new Map<
		number,
		readonly CentralSceneKeys[]
	>();
	@ccValue({ internal: true })
	public get supportedKeyAttributes(): ReadonlyMap<
		number,
		readonly CentralSceneKeys[]
	> {
		return this._supportedKeyAttributes;
	}

	private _keyAttributesHaveIdenticalSupport: boolean;
	@ccValue({ internal: true })
	public get keyAttributesHaveIdenticalSupport(): boolean {
		return this._keyAttributesHaveIdenticalSupport;
	}

	public supportsKeyAttribute(
		sceneNumber: number,
		keyAttribute: CentralSceneKeys,
	): boolean {
		const mapIndex = this._keyAttributesHaveIdenticalSupport
			? 1
			: sceneNumber;
		return this._supportedKeyAttributes
			.get(mapIndex)!
			.includes(keyAttribute);
	}
}

@CCCommand(CentralSceneCommand.SupportedGet)
@expectedCCResponse(CentralSceneCCSupportedReport)
export class CentralSceneCCSupportedGet extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(CentralSceneCommand.ConfigurationReport)
export class CentralSceneCCConfigurationReport extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._slowRefresh = !!(this.payload[0] & 0b1000_0000);
		this.persistValues();
	}

	private _slowRefresh: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Send held down notifications at a slow rate",
		description:
			"When this is true, KeyHeldDown notifications are sent every 55s. " +
			"When this is false, the notifications are sent every 200ms.",
	})
	public get slowRefresh(): boolean {
		return this._slowRefresh;
	}
}

@CCCommand(CentralSceneCommand.ConfigurationGet)
@expectedCCResponse(CentralSceneCCConfigurationReport)
export class CentralSceneCCConfigurationGet extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

interface CentralSceneCCConfigurationSetOptions extends CCCommandOptions {
	slowRefresh: boolean;
}

@CCCommand(CentralSceneCommand.ConfigurationSet)
export class CentralSceneCCConfigurationSet extends CentralSceneCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| CentralSceneCCConfigurationSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.slowRefresh = options.slowRefresh;
		}
	}

	public slowRefresh: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.slowRefresh ? 0b1000_0000 : 0]);
		return super.serialize();
	}
}
