import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { MessagePriority } from "../message/Constants";
import { NodeStatus } from "../node/INode";
import { ZWaveNode } from "../node/Node";
import { validatePayload } from "../util/misc";
import { CCAPI } from "./API";
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

export enum WakeUpCommand {
	IntervalSet = 0x04,
	IntervalGet = 0x05,
	IntervalReport = 0x06,
	WakeUpNotification = 0x07,
	NoMoreInformation = 0x08,
	IntervalCapabilitiesGet = 0x09,
	IntervalCapabilitiesReport = 0x0a,
}

@API(CommandClasses["Wake Up"])
export class WakeUpCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getInterval() {
		const cc = new WakeUpCCIntervalGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<WakeUpCCIntervalReport>(
			cc,
		))!;
		return {
			wakeupInterval: response.wakeupInterval,
			controllerNodeId: response.controllerNodeId,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getIntervalCapabilities() {
		const cc = new WakeUpCCIntervalCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			WakeUpCCIntervalCapabilitiesReport
		>(cc))!;
		return {
			defaultWakeUpInterval: response.defaultWakeUpInterval,
			minWakeUpInterval: response.minWakeUpInterval,
			maxWakeUpInterval: response.maxWakeUpInterval,
			wakeUpIntervalSteps: response.wakeUpIntervalSteps,
		};
	}

	public async setInterval(
		wakeupInterval: number,
		controllerNodeId: number,
	): Promise<void> {
		const cc = new WakeUpCCIntervalSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			wakeupInterval,
			controllerNodeId,
		});
		await this.driver.sendCommand(cc);
	}

	public async sendNoMoreInformation(): Promise<void> {
		const cc = new WakeUpCCNoMoreInformation(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		await this.driver.sendCommand(cc, {
			// This command must be sent as part of the wake up queue
			priority: MessagePriority.WakeUp,
		});
	}
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(2)
export class WakeUpCC extends CommandClass {
	public ccCommand!: WakeUpCommand;

	public isAwake(): boolean {
		return WakeUpCC.isAwake(this.getNode()!);
	}

	public static isAwake(node: ZWaveNode): boolean {
		switch (node.status) {
			case NodeStatus.Asleep:
			case NodeStatus.Dead:
				return false;
			case NodeStatus.Unknown:
			// We assume all nodes to be awake - we'll find out soon enough if they are
			case NodeStatus.Awake:
				return true;
		}
	}

	public setAwake(awake: boolean): void {
		WakeUpCC.setAwake(this.getNode()!, awake);
	}

	public static setAwake(node: ZWaveNode, awake: boolean): void {
		node.status = awake ? NodeStatus.Awake : NodeStatus.Asleep;
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
				ZWaveErrorCodes.Deserialization_NotImplemented,
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

@CCCommand(WakeUpCommand.IntervalReport)
export class WakeUpCCIntervalReport extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 4);
		this._wakeupInterval = this.payload.readUIntBE(0, 3);
		this._controllerNodeId = this.payload[3];
		this.persistValues();
	}

	private _wakeupInterval: number;
	@ccValue() public get wakeupInterval(): number {
		return this._wakeupInterval;
	}

	private _controllerNodeId: number;
	@ccValue() public get controllerNodeId(): number {
		return this._controllerNodeId;
	}
}

@CCCommand(WakeUpCommand.IntervalGet)
@expectedCCResponse(WakeUpCCIntervalReport)
export class WakeUpCCIntervalGet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
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

@CCCommand(WakeUpCommand.IntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 12);
		this._minWakeUpInterval = this.payload.readUIntBE(0, 3);
		this._maxWakeUpInterval = this.payload.readUIntBE(3, 3);
		this._defaultWakeUpInterval = this.payload.readUIntBE(6, 3);
		this._wakeUpIntervalSteps = this.payload.readUIntBE(9, 3);
		this.persistValues();
	}

	private _minWakeUpInterval: number;
	@ccValue() public get minWakeUpInterval(): number {
		return this._minWakeUpInterval;
	}

	private _maxWakeUpInterval: number;
	@ccValue() public get maxWakeUpInterval(): number {
		return this._maxWakeUpInterval;
	}

	private _defaultWakeUpInterval: number;
	@ccValue() public get defaultWakeUpInterval(): number {
		return this._defaultWakeUpInterval;
	}

	private _wakeUpIntervalSteps: number;
	@ccValue() public get wakeUpIntervalSteps(): number {
		return this._wakeUpIntervalSteps;
	}
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesGet)
@expectedCCResponse(WakeUpCCIntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
