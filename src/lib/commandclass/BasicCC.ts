import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { num2hex } from "../util/strings";
import { Duration } from "../values/Duration";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@expectedCCResponse(CommandClasses.Basic)
export class BasicCC extends CommandClass {
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BasicCommand.Get,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BasicCommand.Set,
		targetValue: number,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: BasicCommand,
		targetValue?: number,
	) {
		super(driver, nodeId, ccCommand);
		if (targetValue != undefined) this.targetValue = targetValue;
	}

	@ccValue() public currentValue: Maybe<number> | undefined;
	@ccValue() public targetValue: number | undefined;
	@ccValue() public duration: Duration | undefined;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BasicCommand.Get:
				// no real payload
				break;
			case BasicCommand.Set:
				this.payload = Buffer.from([this.targetValue]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Basic CC with a command other than Get or Set",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case BasicCommand.Report:
				this.currentValue = parseMaybeNumber(this.payload[0]);
				// starting in V2:
				this.targetValue = parseNumber(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
				break;

			default: {
				throw new ZWaveError(
					`Cannot deserialize a Basic CC with a command other than Report. Received ${
						BasicCommand[this.ccCommand]
					} (${num2hex(this.ccCommand)})`,
					ZWaveErrorCodes.CC_Invalid,
				);
			}
		}
	}
}
