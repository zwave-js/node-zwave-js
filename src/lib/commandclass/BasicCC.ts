import type { IDriver } from "../driver/IDriver";
import log from "../log";
import { JSONObject, validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { ValueMetadata } from "../values/Metadata";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import { CCAPI, SetValueImplementation, SET_VALUE, throwUnsupportedProperty, throwWrongValueType } from "./API";
import { API, CCCommand, CCCommandOptions, ccValue, ccValueMetadata, CommandClass, commandClass, CommandClassDeserializationOptions, expectedCCResponse, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@API(CommandClasses.Basic)
export class BasicCCAPI extends CCAPI {
	public supportsCommand(cmd: BasicCommand): Maybe<boolean> {
		switch (cmd) {
			case BasicCommand.Get:
			case BasicCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}
	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "targetValue") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		await this.set(value);

		// Refresh the current value
		await this.get();
	};

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Get);

		const cc = new BasicCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<BasicCCReport>(cc))!;
		return {
			currentValue: response.currentValue,
			targetValue: response.targetValue,
			duration: response.duration,
		};
	}

	public async set(targetValue: number): Promise<void> {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Set);

		const cc = new BasicCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
		});
		await this.driver.sendCommand(cc);

		// Refresh the current value
		await this.get();
	}
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
export class BasicCC extends CommandClass {
	declare ccCommand: BasicCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Basic;

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
				} interview...`,
			direction: "none",
		});

		// always query the current state
		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying Basic CC state...",
			direction: "outbound",
		});

		const basicResponse = await api.get();

		let logMessage = `received Basic CC state:
current value:      ${basicResponse.currentValue}`;
		if (basicResponse.targetValue != undefined) {
			logMessage += `
target value:       ${basicResponse.targetValue}
remaining duration: ${basicResponse.duration}`;
		}
		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: logMessage,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
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

type BasicCCReportOptions = CCCommandOptions &
	({
		currentValue: number;
	} & (
			| {}
			| {
				targetValue: number;
				duration: Duration;
			}
		));

@CCCommand(BasicCommand.Report)
export class BasicCCReport extends BasicCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | BasicCCReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this._currentValue = parseMaybeNumber(this.payload[0]);

			if (this.version >= 2 && this.payload.length >= 3) {
				this._targetValue = parseNumber(this.payload[1]);
				this._duration = Duration.parseReport(this.payload[2]);
			}
			// Do not persist values here. We want to control when this is happening,
			// in case the report is mapped to another CC
		} else {
			this._currentValue = options.currentValue;
			if ("targetValue" in options) {
				this._targetValue = options.targetValue;
				this._duration = options.duration;
			}
		}
	}

	private _currentValue: Maybe<number> | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyLevel,
		label: "Current value",
	})
	public get currentValue(): Maybe<number> | undefined {
		return this._currentValue;
	}

	private _targetValue: number | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Level,
		label: "Target value",
	})
	public get targetValue(): number | undefined {
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

	public serialize(): Buffer {
		const payload: number[] = [
			typeof this._currentValue !== "number" ? 0xfe : this._currentValue,
		];
		if (this.version >= 2 && this._targetValue && this._duration) {
			payload.push(this._targetValue, this._duration.serializeReport());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
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
