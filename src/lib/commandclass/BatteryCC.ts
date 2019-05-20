import { IDriver } from "../driver/IDriver";
import { JSONObject } from "../util/misc";
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
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

@API(CommandClasses.Battery)
export class BatteryCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		const cc = new BatteryCCGet(this.driver, { nodeId: this.node.id });
		const response = (await this.driver.sendCommand<BatteryCCReport>(cc))!;
		return {
			level: response.level,
			isLow: response.isLow,
		};
	}
}

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
		this._level = this.payload[0];
		if (this._level === 0xff) {
			this._level = 0;
			this._isLow = true;
		} else {
			this._isLow = false;
		}
		this.persistValues();
	}

	private _level: number;
	@ccValue() public get level(): number {
		return this._level;
	}

	private _isLow: boolean;
	@ccValue() public get isLow(): boolean {
		return this._isLow;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			level: this.level,
			isLow: this.isLow,
		});
	}
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
