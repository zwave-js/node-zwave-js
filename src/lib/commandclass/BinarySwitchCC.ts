import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject, validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { ValueMetadata } from "../values/Metadata";
import { Maybe, parseBoolean, parseMaybeBoolean } from "../values/Primitive";
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
	ccValue,
	ccValueMetadata,
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
	public supportsCommand(cmd: BinarySwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case BinarySwitchCommand.Get:
			case BinarySwitchCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(
			BinarySwitchCommand,
			BinarySwitchCommand.Get,
		);

		const cc = new BinarySwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
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
		this.assertSupportsCommand(
			BinarySwitchCommand,
			BinarySwitchCommand.Set,
		);

		const cc = new BinarySwitchCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
			duration,
		});
		await this.driver.sendCommand(cc);

		// Refresh the current value
		await this.get();
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ propertyName },
		value,
	): Promise<void> => {
		if (propertyName !== "targetValue") {
			throwUnsupportedProperty(this.ccId, propertyName);
		}
		if (typeof value !== "boolean") {
			throwWrongValueType(
				this.ccId,
				propertyName,
				"boolean",
				typeof value,
			);
		}
		await this.set(value);
	};
}

export interface BinarySwitchCC {
	ccCommand: BinarySwitchCommand;
}

@commandClass(CommandClasses["Binary Switch"])
@implementedVersion(2)
export class BinarySwitchCC extends CommandClass {
	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const api = this.getEndpoint()!.commandClasses["Binary Switch"];

		log.controller.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		// always query the current state
		log.controller.logNode(node.id, {
			message: "querying Binary Switch state...",
			direction: "outbound",
		});

		const binarySwitchResponse = await api.get();

		let logMessage = `received Binary Switch state:
current value:      ${binarySwitchResponse.currentValue}`;
		if (binarySwitchResponse.targetValue != undefined) {
			logMessage += `
target value:       ${binarySwitchResponse.targetValue}
remaining duration: ${binarySwitchResponse.duration}`;
		}
		log.controller.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
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
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Current value",
	})
	public get currentValue(): Maybe<boolean> | undefined {
		return this._currentValue;
	}

	private _targetValue: boolean | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Target value",
	})
	public get targetValue(): boolean | undefined {
		return this._targetValue;
	}

	private _duration: Duration | undefined;
	@ccValue({ minVersion: 2 })
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Remaining duration until target value",
	})
	public get duration(): Duration | undefined {
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
