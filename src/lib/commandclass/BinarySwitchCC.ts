import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { JSONObject, validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { Maybe, parseBoolean, parseMaybeBoolean } from "../values/Primitive";
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

// All the supported commands
export enum BinarySwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@API(CommandClasses["Binary Switch"])
export class BinarySwitchCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		const cc = new BinarySwitchCCGet(this.driver, { nodeId: this.node.id });
		const response = (await this.driver.sendCommand<BinarySwitchCCReport>(
			cc,
		))!;
		return {
			// interpret unknown values as false
			currentValue: response.currentValue || false,
			targetValue: response.targetValue,
			duration: response.duration,
		};
	}

	/**
	 * Sets the switch to the given value
	 * @param targetValue The target value to set
	 * @param duration The duration after which the target value should be reached. Only supported in V2 and above
	 */
	public async set(targetValue: boolean, duration?: Duration): Promise<void> {
		const cc = new BinarySwitchCCSet(this.driver, {
			nodeId: this.node.id,
			targetValue,
			duration,
		});
		await this.driver.sendCommand<BinarySwitchCCReport>(cc);
	}
}

@commandClass(CommandClasses["Binary Switch"])
@implementedVersion(2)
export class BinarySwitchCC extends CommandClass {
	public ccCommand!: BinarySwitchCommand;
}

interface BinarySwitchCCSetOptions extends CCCommandOptions {
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
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

		validatePayload(this.payload.length >= 1);
		this._currentValue = parseMaybeBoolean(this.payload[0]);

		if (this.version >= 2 && this.payload.length >= 3) {
			// V2
			this._targetValue = parseBoolean(this.payload[1]);
			this._duration = Duration.parseReport(this.payload[2]);
		}
		this.persistValues();
	}

	private _currentValue: Maybe<boolean> | undefined;
	@ccValue() public get currentValue(): Maybe<boolean> | undefined {
		return this._currentValue;
	}

	private _targetValue: boolean | undefined;
	@ccValue() public get targetValue(): boolean | undefined {
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

@CCCommand(BinarySwitchCommand.Get)
@expectedCCResponse(BinarySwitchCCReport)
export class BinarySwitchCCGet extends BinarySwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
