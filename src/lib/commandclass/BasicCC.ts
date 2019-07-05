import { IDriver } from "../driver/IDriver";
import { JSONObject, validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
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

@API(CommandClasses.Basic)
export class BasicCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		const cc = new BasicCCGet(this.driver, { nodeId: this.node.id });
		const response = (await this.driver.sendCommand<BasicCCReport>(cc))!;
		return {
			currentValue: response.currentValue,
			targetValue: response.targetValue,
			duration: response.duration,
		};
	}

	public async set(targetValue: number): Promise<void> {
		const cc = new BasicCCSet(this.driver, {
			nodeId: this.node.id,
			targetValue,
		});
		await this.driver.sendCommand(cc);
	}
}

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
export class BasicCC extends CommandClass {
	public ccCommand!: BasicCommand;
}

interface BasicCCSetOptions extends CCCommandOptions {
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
			validatePayload(this.payload.length >= 1);
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

		validatePayload(this.payload.length >= 1);
		this._currentValue = parseMaybeNumber(this.payload[0]);

		if (this.version >= 2) {
			validatePayload(this.payload.length >= 3);
			this._targetValue = parseNumber(this.payload[1]);
			this._duration = Duration.parseReport(this.payload[2]);
		}
		this.persistValues();
	}

	private _currentValue: Maybe<number> | undefined;
	@ccValue() public get currentValue(): Maybe<number> | undefined {
		return this._currentValue;
	}

	private _targetValue: number | undefined;
	@ccValue() public get targetValue(): number | undefined {
		return this._targetValue;
	}

	private _duration: Duration | undefined;
	@ccValue() public get duration(): Duration | undefined {
		return this._duration;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			currentValue: this.currentValue,
			targetValue: this.targetValue,
			duration: this.duration,
		});
	}
}

@CCCommand(BasicCommand.Get)
@expectedCCResponse(BasicCCReport)
export class BasicCCGet extends BasicCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
