import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ccValue, CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum BinarySwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses["Binary Switch"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Binary Switch"])
export class BinarySwitchCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(
		driver: IDriver,
		nodeId?: number,
	);
	constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BinarySwitchCommand.Get,
	);
	constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BinarySwitchCommand.Set,
		targetValue: boolean,
		duration?: number,
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: BinarySwitchCommand,
		targetValue?: BinarySwitchState,
		duration?: number,
	) {
		super(driver, nodeId);
		if (targetValue != undefined) this.currentValue = targetValue;
		if (duration != undefined) this.duration = duration;
	}
	// tslint:enable:unified-signatures

	@ccValue() public currentValue: BinarySwitchState;
	@ccValue() public targetValue: BinarySwitchState;
	@ccValue() public duration: number;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BinarySwitchCommand.Get:
				this.payload = Buffer.from([this.ccCommand]);
				break;

			case BinarySwitchCommand.Set: {
				const payload: number[] = [
					this.ccCommand,
					this.targetValue ? 0xFF : 0x00,
				];
				if (this.version >= 2) {
					payload.push(this.duration);
				}
				this.payload = Buffer.from([this.ccCommand]);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot serialize a BinarySwitch CC with a command other than Set or Get",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case BinarySwitchCommand.Report: {
				this.currentValue = decodeBinarySwitchState(this.payload[1]);
				if (this.payload.length >= 2) { // V2
					this.targetValue = decodeBinarySwitchState(this.payload[2]);
					this.duration = this.payload[3];
				}
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a BinarySwitch CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}

export type BinarySwitchState = boolean | "unknown";

function decodeBinarySwitchState(val: number): BinarySwitchState {
	return val === 0 ? false :
		val === 0xff ? true :
			"unknown"
		;
}
