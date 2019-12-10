import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import { Maybe } from "../values/Primitive";
import {
	CCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum IndicatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@API(CommandClasses.Indicator)
export class IndicatorCCAPI extends CCAPI {
	public supportsCommand(cmd: IndicatorCommand): Maybe<boolean> {
		switch (cmd) {
			case IndicatorCommand.Get:
			case IndicatorCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "value") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		await this.set(value);

		// Refresh the current value
		await this.get();
	};

	public async get(): Promise<number> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Get);

		const cc = new IndicatorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<IndicatorCCReport>(
			cc,
		))!;
		return response.value;
	}

	public async set(value: number): Promise<void> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Set);

		const cc = new IndicatorCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			value,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses.Indicator)
@implementedVersion(1)
export class IndicatorCC extends CommandClass {
	declare ccCommand: IndicatorCommand;
}

interface IndicatorCCSetOptions extends CCCommandOptions {
	value: number;
}

@CCCommand(IndicatorCommand.Set)
export class IndicatorCCSet extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | IndicatorCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.value = options.value;
		}
	}

	public value: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.value]);
		return super.serialize();
	}
}

@CCCommand(IndicatorCommand.Report)
export class IndicatorCCReport extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.value = this.payload[0];
	}

	public readonly value: number;
}

@CCCommand(IndicatorCommand.Get)
export class IndicatorCCGet extends IndicatorCC {}
