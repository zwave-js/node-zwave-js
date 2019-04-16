import { IDriver } from "../driver/IDriver";
import { Duration } from "../values/Duration";
import { Maybe, parseBoolean, parseMaybeBoolean } from "../values/Primitive";
import {
	CCCommand,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum BinarySwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses["Binary Switch"])
@implementedVersion(2)
@expectedCCResponse(CommandClasses["Binary Switch"])
export class BinarySwitchCC extends CommandClass {
	public ccCommand: BinarySwitchCommand;
}

interface BinarySwitchCCGetOptions {
	nodeId: number;
}

@CCCommand(BinarySwitchCommand.Get)
export class BinarySwitchCCGet extends BinarySwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BinarySwitchCCGetOptions,
	) {
		super(driver, options);
	}
}

interface BinarySwitchCCSetOptions {
	nodeId: number;
	targetValue: boolean;
	duration?: Duration;
}

@CCCommand(BinarySwitchCommand.Set)
export class BinarySwitchCCSet extends BinarySwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BinarySwitchCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// Deserialization not implemented
		} else {
			this.targetValue = options.targetValue;
			this.duration = options.duration;
		}
	}

	public targetValue: boolean;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		const payload: number[] = [this.targetValue ? 0xff : 0x00];
		if (this.version >= 2 && this.duration) {
			payload.push(this.duration.serializeSet());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}
}

@CCCommand(BinarySwitchCommand.Report)
export class BinarySwitchCCReport extends BinarySwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this.currentValue = parseMaybeBoolean(this.payload[0]);
		if (this.payload.length >= 2) {
			// V2
			this.targetValue = parseBoolean(this.payload[1]);
			this.duration = Duration.parseReport(this.payload[2]);
		}
	}

	public currentValue: Maybe<boolean> | undefined;
	public targetValue: boolean | undefined;
	public duration: Duration | undefined;
}
