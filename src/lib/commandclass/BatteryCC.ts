import { IDriver } from "../driver/IDriver";
import {
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum BatteryCommand {
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses.Battery)
@implementedVersion(1)
export class BatteryCC extends CommandClass {
	public ccCommand!: BatteryCommand;
}

@CCCommand(BatteryCommand.Report)
export class BatteryCCReport extends BatteryCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this.level = this.payload[0];
		if (this.level === 0xff) {
			this.level = 0;
			this.isLow = true;
		} else {
			this.isLow = false;
		}
	}

	@ccValue() public level: number;
	@ccValue() public isLow: boolean;
}

@CCCommand(BatteryCommand.Get)
@expectedCCResponse(BatteryCCReport)
export class BatteryCCGet extends BatteryCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
