import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ZWaveNode } from "../node/Node";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	getCommandClass,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum WakeUpCommand {
	IntervalSet = 0x04,
	IntervalGet = 0x05,
	IntervalReport = 0x06,
	WakeUpNotification = 0x07,
	NoMoreInformation = 0x08,
	IntervalCapabilitiesGet = 0x09,
	IntervalCapabilitiesReport = 0x0a,
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Wake Up"])
export class WakeUpCC extends CommandClass {
	public ccCommand!: WakeUpCommand;

	public isAwake(): boolean {
		const ret = this.getValueDB().getValue(
			getCommandClass(this),
			undefined,
			"awake",
		);
		// TODO: Add a way to configure this
		const assumeAwake = true;
		return ret == undefined ? assumeAwake : !!ret;
	}

	public static isAwake(driver: IDriver, node: ZWaveNode): boolean {
		return new WakeUpCC(driver, { nodeId: node.id }).isAwake();
	}

	public setAwake(awake: boolean): void {
		this.getValueDB().setValue(
			getCommandClass(this),
			undefined,
			"awake",
			awake,
		);
	}

	public static setAwake(
		driver: IDriver,
		node: ZWaveNode,
		awake: boolean,
	): void {
		new WakeUpCC(driver, { nodeId: node.id }).setAwake(awake);
	}
}

interface WakeUpCCIntervalSetOptions extends CCCommandOptions {
	wakeupInterval: number;
	controllerNodeId: number;
}

@CCCommand(WakeUpCommand.IntervalSet)
export class WakeUpCCIntervalSet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| WakeUpCCIntervalSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			// This error is used to test the driver!
			// When implementing this branch, update the corresponding driver test
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.CC_DeserializationNotImplemented,
			);
		} else {
			this.wakeupInterval = options.wakeupInterval;
			this.controllerNodeId = options.controllerNodeId;
		}
	}

	public wakeupInterval: number;
	public controllerNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			0,
			0,
			0, // placeholder
			this.controllerNodeId,
		]);
		this.payload.writeUIntBE(this.wakeupInterval, 0, 3);
		return super.serialize();
	}
}

@CCCommand(WakeUpCommand.IntervalGet)
export class WakeUpCCIntervalGet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.IntervalReport)
export class WakeUpCCIntervalReport extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._wakeupInterval = this.payload.readUIntBE(0, 3);
		this._controllerNodeId = this.payload[3];
	}

	private _wakeupInterval: number;
	public get wakeupInterval(): number {
		return this._wakeupInterval;
	}

	private _controllerNodeId: number;
	public get controllerNodeId(): number {
		return this._controllerNodeId;
	}
}

@CCCommand(WakeUpCommand.WakeUpNotification)
export class WakeUpCCWakeUpNotification extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.NoMoreInformation)
export class WakeUpCCNoMoreInformation extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesGet)
export class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._minWakeUpInterval = this.payload.readUIntBE(0, 3);
		this._maxWakeUpInterval = this.payload.readUIntBE(3, 3);
		this._defaultWakeUpInterval = this.payload.readUIntBE(6, 3);
		this._wakeUpIntervalSteps = this.payload.readUIntBE(9, 3);
	}

	private _minWakeUpInterval: number;
	public get minWakeUpInterval(): number {
		return this._minWakeUpInterval;
	}

	private _maxWakeUpInterval: number;
	public get maxWakeUpInterval(): number {
		return this._maxWakeUpInterval;
	}

	private _defaultWakeUpInterval: number;
	public get defaultWakeUpInterval(): number {
		return this._defaultWakeUpInterval;
	}

	private _wakeUpIntervalSteps: number;
	public get wakeUpIntervalSteps(): number {
		return this._wakeUpIntervalSteps;
	}
}
