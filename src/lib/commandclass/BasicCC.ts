import { IDriver } from "../driver/IDriver";
import { Duration } from "../values/Duration";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import {
	CCCommand,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
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
	public ccCommand: BasicCommand;
}

interface BasicCCGetOptions {
	nodeId: number;
}

@CCCommand(BasicCommand.Get)
export class BasicCCGet extends BasicCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BasicCCGetOptions,
	) {
		super(driver, options);
	}
}

interface BasicCCSetOptions {
	nodeId: number;
	targetValue: number;
}

@CCCommand(BasicCommand.Set)
export class BasicCCSet extends BasicCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BasicCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			this.targetValue = this.payload[0];
		} else {
			this.targetValue = options.targetValue;
		}
	}

	public targetValue: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.targetValue]);
		return super.serialize();
	}
}

@CCCommand(BasicCommand.Report)
export class BasicCCReport extends BasicCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this.currentValue = parseMaybeNumber(this.payload[0]);
		// starting in V2:
		this.targetValue = parseNumber(this.payload[1]);
		this.duration = Duration.parseReport(this.payload[2]);
	}

	@ccValue() public currentValue: Maybe<number> | undefined;
	@ccValue() public targetValue: number | undefined;
	@ccValue() public duration: Duration | undefined;
}
