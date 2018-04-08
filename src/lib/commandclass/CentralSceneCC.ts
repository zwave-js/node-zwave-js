import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

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
	constructor(nodeId?: number);
	constructor(nodeId: number, command: CentralSceneCommand.SupportedGet | CentralSceneCommand.ConfigurationGet);
	constructor(nodeId: number, command: CentralSceneCommand.ConfigurationSet, slowRefresh: boolean);

	constructor(
		public nodeId: number,
		public centralSceneCommand?: CentralSceneCommand,
		slowRefresh?: boolean,
	) {
		super(nodeId);
		this._slowRefresh = slowRefresh;
	}
	// tslint:enable:unified-signatures

	private _slowRefresh: boolean;
	public get slowRefresh(): boolean {
		return this._slowRefresh;
	}

	private _supportsSlowRefresh: boolean;
	public get supportsSlowRefresh(): boolean {
		return this._supportsSlowRefresh;
	}

	private _sequenceNumber: number;
	public get sequenceNumber(): number {
		return this._sequenceNumber;
	}

	private _keyAttribute: CentralSceneKeys;
	public get keyAttribute(): CentralSceneKeys {
		return this._keyAttribute;
	}

	private _sceneCount: number;
	public get sceneCount(): number {
		return this._sceneCount;
	}

	private _supportedKeyAttributes: number[];
	private _keyAttributesIdenticalSupport: boolean;
	public supportsKeyAttribute(sceneNumber: number, keyAttribute: CentralSceneKeys): boolean {
		const bitArrayIndex = this._keyAttributesIdenticalSupport ? 0 : sceneNumber - 1;
		const bitmap = this._supportedKeyAttributes[bitArrayIndex];
		return !!(bitmap & (1 << keyAttribute));
	}

	private _sceneNumber: number;
	public get sceneNumber(): number {
		return this._sceneNumber;
	}

	public serialize(): Buffer {
		switch (this.centralSceneCommand) {
			case CentralSceneCommand.SupportedGet:
			case CentralSceneCommand.ConfigurationGet:
				this.payload = Buffer.from([this.centralSceneCommand]);
				break;

			case CentralSceneCommand.ConfigurationSet:
				this.payload = Buffer.from([
					this.centralSceneCommand,
					this._slowRefresh ? 0b1000_0000 : 0,
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

		this.centralSceneCommand = this.payload[0];
		switch (this.centralSceneCommand) {

			case CentralSceneCommand.ConfigurationReport: {
				this._slowRefresh = !!(this.payload[1] & 0b1000_0000);
				break;
			}

			case CentralSceneCommand.SupportedReport: {
				this._sceneCount = this.payload[1];
				this._supportsSlowRefresh = !!(this.payload[2] & 0b1000_0000);
				const bitMaskBytes = this.payload[2] & 0b110;
				this._keyAttributesIdenticalSupport = !!(this.payload[2] & 0b1);
				const numEntries = this._keyAttributesIdenticalSupport ? 1 : this._sceneCount;
				this._supportedKeyAttributes = [];
				for (let i = 0; i < numEntries; i++) {
					let mask = 0;
					for (let j = 0; j < bitMaskBytes; j++) {
						mask += this.payload[3 + bitMaskBytes * i + j] << (8 * j);
					}
					this._supportedKeyAttributes.push(mask);
				}
				break;
			}

			case CentralSceneCommand.Notification: {
				this._sequenceNumber = this.payload[1];
				this._keyAttribute = this.payload[2] & 0b111;
				this._sceneNumber = this.payload[3];
				this._slowRefresh = !!(this.payload[2] & 0b1000_0000);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a Version CC with a command other than Notification",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

	public toJSON() {
		return super.toJSONInherited({
			centralSceneCommand: CentralSceneCommand[this.centralSceneCommand],
			slowRefresh: this.slowRefresh,
			sequenceNumber: this.sequenceNumber,
			keyAttribute: CentralSceneKeys[this.keyAttribute],
			sceneNumber: this.sceneNumber,
		});
	}

}
