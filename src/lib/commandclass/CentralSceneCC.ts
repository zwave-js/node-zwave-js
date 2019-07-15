import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject, validatePayload } from "../util/misc";
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
			slowRefresh,
		});
		await this.driver.sendCommand(cc);
	}

	protected [SET_VALUE]: SetValueImplementation = async ({
		propertyName,
		value,
	}): Promise<void> => {
		if (propertyName !== "slowRefresh") {
			return throwUnsupportedProperty(this.ccId, propertyName);
		}
		if (typeof value !== "boolean") {
			return throwWrongValueType(
				this.ccId,
				propertyName,
				"boolean",
				typeof value,
			);
		}
		await this.setConfiguration(value);
	};
}

@commandClass(CommandClasses["Central Scene"])
@implementedVersion(3)
export class CentralSceneCC extends CommandClass {
	public ccCommand!: CentralSceneCommand;

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
		this._supportedKeyAttributes = [];

		validatePayload(this.payload.length >= 2 + bitMaskBytes * numEntries);
		// TODO: Can this be done with parseBitMask()?
		for (let i = 0; i < numEntries; i++) {
			let mask = 0;
			for (let j = 0; j < bitMaskBytes; j++) {
				mask += this.payload[3 + bitMaskBytes * i + j] << (8 * j);
			}
			this._supportedKeyAttributes.push(mask);
		}
		this.persistValues();
	}

	private _sceneCount: number;
	@ccValue() public get sceneCount(): number {
		return this._sceneCount;
	}

	private _supportsSlowRefresh: boolean;
	@ccValue() public get supportsSlowRefresh(): boolean {
		return this._supportsSlowRefresh;
	}

	private _supportedKeyAttributes: CentralSceneKeys[];
	@ccValue()
	public get supportedKeyAttributes(): readonly CentralSceneKeys[] {
		return this._supportedKeyAttributes;
	}

	private _keyAttributesHaveIdenticalSupport: boolean;
	@ccValue() public get keyAttributesHaveIdenticalSupport(): boolean {
		return this._keyAttributesHaveIdenticalSupport;
	}

	public supportsKeyAttribute(
		sceneNumber: number,
		keyAttribute: CentralSceneKeys,
	): boolean {
		const bitArrayIndex = this._keyAttributesHaveIdenticalSupport
			? 0
			: sceneNumber - 1;
		const bitmap = this._supportedKeyAttributes[bitArrayIndex];
		return !!(bitmap & (1 << keyAttribute));
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
	@ccValue() public get slowRefresh(): boolean {
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
