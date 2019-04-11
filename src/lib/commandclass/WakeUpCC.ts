import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ZWaveNode } from "../node/Node";
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
	getCommandClass,
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

function getExpectedResponseToWakeUp(sent: WakeUpCC): CommandClasses {
	switch (sent.ccCommand) {
		// These commands expect no response
		case WakeUpCommand.IntervalSet:
		case WakeUpCommand.NoMoreInformation:
			return undefined;
		// All other expect a WakeUp CC
		default:
			return CommandClasses["Wake Up"];
	}
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(2)
@expectedCCResponse(getExpectedResponseToWakeUp)
export class WakeUpCC extends CommandClass {
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: WakeUpCommand.IntervalSet,
		interval: number,
		controllerNodeId: number,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand:
			| WakeUpCommand.IntervalGet
			| WakeUpCommand.NoMoreInformation
			| WakeUpCommand.IntervalCapabilitiesGet,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: WakeUpCommand,
		wakeupInterval?: number,
		controllerNodeId?: number,
	) {
		super(driver, nodeId, ccCommand);

		if (wakeupInterval != undefined) this.wakeupInterval = wakeupInterval;
		if (controllerNodeId != undefined)
			this.controllerNodeId = controllerNodeId;
	}

	@ccValue() public wakeupInterval: number;
	@ccValue() public controllerNodeId: number;
	@ccValue() public minWakeUpInterval: number;
	@ccValue() public maxWakeUpInterval: number;
	@ccValue() public defaultWakeUpInterval: number;
	@ccValue() public wakeUpIntervalSteps: number;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case WakeUpCommand.IntervalGet:
			case WakeUpCommand.NoMoreInformation:
			case WakeUpCommand.IntervalCapabilitiesGet:
				// no real payload
				break;

			case WakeUpCommand.IntervalSet:
				this.payload = Buffer.from([
					0,
					0,
					0, // placeholder
					this.controllerNodeId,
				]);
				this.payload.writeUIntBE(this.wakeupInterval, 0, 3);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a WakeUp CC with a command other than IntervalSet, IntervalGet or NoMoreInformation, IntervalCapabilitiesGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case WakeUpCommand.IntervalReport:
				this.wakeupInterval = this.payload.readUIntBE(0, 3);
				this.controllerNodeId = this.payload[3];
				break;

			case WakeUpCommand.WakeUpNotification:
				// no real payload
				break;

			case WakeUpCommand.IntervalCapabilitiesReport:
				this.minWakeUpInterval = this.payload.readUIntBE(0, 3);
				this.maxWakeUpInterval = this.payload.readUIntBE(3, 3);
				this.defaultWakeUpInterval = this.payload.readUIntBE(6, 3);
				this.wakeUpIntervalSteps = this.payload.readUIntBE(9, 3);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a WakeUp CC with a command other than IntervalReport or WakeUpNotification",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

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
		return new WakeUpCC(driver, node.id).isAwake();
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
		new WakeUpCC(driver, node.id).setAwake(awake);
	}
}
