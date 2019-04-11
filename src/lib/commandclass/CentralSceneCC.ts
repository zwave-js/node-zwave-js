import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject } from "../util/misc";
import {
	ccValue,
	CommandClass,
	commandClass,
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

@commandClass(CommandClasses["Central Scene"])
@implementedVersion(3)
export class CentralSceneCC extends CommandClass {
	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		command:
			| CentralSceneCommand.SupportedGet
			| CentralSceneCommand.ConfigurationGet,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		command: CentralSceneCommand.ConfigurationSet,
		slowRefresh: boolean,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: CentralSceneCommand,
		slowRefresh?: boolean,
	) {
		super(driver, nodeId, ccCommand);
		if (slowRefresh != undefined) this.slowRefresh = slowRefresh;
	}
	// tslint:enable:unified-signatures

	@ccValue() public slowRefresh: boolean;
	@ccValue() public supportsSlowRefresh: boolean;

	private _sequenceNumber: number;
	public get sequenceNumber(): number {
		return this._sequenceNumber;
	}

	private _keyAttribute: CentralSceneKeys;
	public get keyAttribute(): CentralSceneKeys {
		return this._keyAttribute;
	}

	@ccValue() public sceneCount: number;

	private _supportedKeyAttributes: number[];
	private _keyAttributesIdenticalSupport: boolean;
	public supportsKeyAttribute(
		sceneNumber: number,
		keyAttribute: CentralSceneKeys,
	): boolean {
		const bitArrayIndex = this._keyAttributesIdenticalSupport
			? 0
			: sceneNumber - 1;
		const bitmap = this._supportedKeyAttributes[bitArrayIndex];
		return !!(bitmap & (1 << keyAttribute));
	}

	private _sceneNumber: number;
	public get sceneNumber(): number {
		return this._sceneNumber;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case CentralSceneCommand.SupportedGet:
			case CentralSceneCommand.ConfigurationGet:
				// no real payload
				break;

			case CentralSceneCommand.ConfigurationSet:
				this.payload = Buffer.from([
					this.slowRefresh ? 0b1000_0000 : 0,
				]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a Version CC with a command other than SupportedGet, ConfigurationGet and ConfigurationSet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case CentralSceneCommand.ConfigurationReport: {
				this.slowRefresh = !!(this.payload[0] & 0b1000_0000);
				break;
			}

			case CentralSceneCommand.SupportedReport: {
				this.sceneCount = this.payload[0];
				this.supportsSlowRefresh = !!(this.payload[1] & 0b1000_0000);
				const bitMaskBytes = this.payload[1] & 0b110;
				this._keyAttributesIdenticalSupport = !!(this.payload[1] & 0b1);
				const numEntries = this._keyAttributesIdenticalSupport
					? 1
					: this.sceneCount;
				this._supportedKeyAttributes = [];
				for (let i = 0; i < numEntries; i++) {
					let mask = 0;
					for (let j = 0; j < bitMaskBytes; j++) {
						mask +=
							this.payload[3 + bitMaskBytes * i + j] << (8 * j);
					}
					this._supportedKeyAttributes.push(mask);
				}
				break;
			}

			case CentralSceneCommand.Notification: {
				this._sequenceNumber = this.payload[0];
				this._keyAttribute = this.payload[1] & 0b111;
				this._sceneNumber = this.payload[2];
				this.slowRefresh = !!(this.payload[1] & 0b1000_0000);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a Version CC with a command other than Notification",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			centralSceneCommand: CentralSceneCommand[this.ccCommand],
			slowRefresh: this.slowRefresh,
			sequenceNumber: this.sequenceNumber,
			keyAttribute: CentralSceneKeys[this.keyAttribute],
			sceneNumber: this.sceneNumber,
		});
	}
}
