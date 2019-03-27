import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Duration } from "../values/Duration";
import { Maybe, parseBoolean, parseMaybeBoolean } from "../values/Primitive";
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
		duration?: Duration,
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: BinarySwitchCommand,
		targetValue?: boolean,
		duration?: Duration,
	) {
		super(driver, nodeId, ccCommand);
		if (targetValue != undefined) this.currentValue = targetValue;
		if (duration != undefined) this.duration = duration;
	}
	// tslint:enable:unified-signatures

	@ccValue() public currentValue: Maybe<boolean>;
	@ccValue() public targetValue: boolean;
	@ccValue() public duration: Duration;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BinarySwitchCommand.Get:
				// no real payload
				break;

			case BinarySwitchCommand.Set: {
				const payload: number[] = [
					this.targetValue ? 0xFF : 0x00,
				];
				if (this.version >= 2) {
					payload.push(this.duration.serializeSet());
				}
				this.payload = Buffer.from(payload);
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

		switch (this.ccCommand) {
			case BinarySwitchCommand.Report: {
				this.currentValue = parseMaybeBoolean(this.payload[0]);
				if (this.payload.length >= 2) { // V2
					this.targetValue = parseBoolean(this.payload[1]);
					this.duration = Duration.parseReport(this.payload[2]);
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
