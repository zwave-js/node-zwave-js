import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	parseBoolean,
	parseMaybeBoolean,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
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
import { BinarySwitchCommand } from "./_Types";

function getCurrentValueValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses["Binary Switch"],
		endpoint,
		property: "currentValue",
	};
}

@API(CommandClasses["Binary Switch"])
export class BinarySwitchCCAPI extends CCAPI {
	public supportsCommand(cmd: BinarySwitchCommand): Maybe<boolean> {
		switch (cmd) {
			case BinarySwitchCommand.Get:
				return this.isSinglecast();
			case BinarySwitchCommand.Set:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			BinarySwitchCommand,
			BinarySwitchCommand.Get,
		);

		const cc = new BinarySwitchCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<BinarySwitchCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				// interpret unknown values as false
				currentValue: response.currentValue || false,
				targetValue: response.targetValue,
				duration: response.duration,
			};
		}
	}

	/**
	 * Sets the switch to the given value
	 * @param targetValue The target value to set
	 * @param duration The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
	 */
	@validateArgs()
	public async set(
		targetValue: boolean,
		duration?: Duration | string,
	): Promise<void> {
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
		options,
	): Promise<void> => {
		if (property !== "targetValue") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "boolean") {
			throwWrongValueType(this.ccId, property, "boolean", typeof value);
		}
		const duration = Duration.from(options?.transitionDuration);
		await this.set(value, duration);

		// If the command did not fail, assume that it succeeded and update the currentValue accordingly
		// so UIs have immediate feedback
		if (this.isSinglecast()) {
			if (!this.driver.options.disableOptimisticValueUpdate) {
				const valueDB = this.endpoint.getNodeUnsafe()?.valueDB;
				valueDB?.setValue(
					getCurrentValueValueId(this.endpoint.index),
					value,
				);
			}

			// Verify the current value after a delay
			// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
			if (property === "targetValue") property = "currentValue";
			this.schedulePoll({ property }, value, {
				duration,
				// on/off "transitions" are usually fast
				transition: "fast",
			});
		} else if (this.isMulticast()) {
			if (!this.driver.options.disableOptimisticValueUpdate) {
				// Figure out which nodes were affected by this command
				const affectedNodes = this.endpoint.node.physicalNodes.filter(
					(node) =>
						node
							.getEndpoint(this.endpoint.index)
							?.supportsCC(this.ccId),
				);
				// and optimistically update the currentValue
				for (const node of affectedNodes) {
					node.valueDB?.setValue(
						getCurrentValueValueId(this.endpoint.index),
						value,
					);
				}
			}
			// For multicasts, do not schedule a refresh - this could cause a LOT of traffic
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "currentValue":
			case "targetValue":
			case "duration":
				return (await this.get())?.[property];
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};
}

@commandClass(CommandClasses["Binary Switch"])
@implementedVersion(2)
export class BinarySwitchCC extends CommandClass {
	declare ccCommand: BinarySwitchCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Binary Switch"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current state
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying Binary Switch state...",
			direction: "outbound",
		});

		const resp = await api.get();
		if (resp) {
			let logMessage = `received Binary Switch state:
current value:      ${resp.currentValue}`;
			if (resp.targetValue != undefined) {
				logMessage += `
target value:       ${resp.targetValue}
remaining duration: ${resp.duration?.toString() ?? "undefined"}`;
			}
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}

	public setMappedBasicValue(value: number): boolean {
		this.getValueDB().setValue(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: "currentValue",
			},
			value > 0,
		);
		return true;
	}
}

interface BinarySwitchCCSetOptions extends CCCommandOptions {
	targetValue: boolean;
	duration?: Duration | string;
}

@CCCommand(BinarySwitchCommand.Set)
export class BinarySwitchCCSet extends BinarySwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | BinarySwitchCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.targetValue = options.targetValue;
			this.duration = Duration.from(options.duration);
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"target value": this.targetValue,
		};
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(BinarySwitchCommand.Report)
export class BinarySwitchCCReport extends BinarySwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

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
	@ccValue({ forceCreation: true })
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Target value",
		valueChangeOptions: ["transitionDuration"],
	})
	public get targetValue(): boolean | undefined {
		return this._targetValue;
	}

	private _duration: Duration | undefined;
	@ccValue({ minVersion: 2 })
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyDuration,
		label: "Remaining duration",
	})
	public get duration(): Duration | undefined {
		return this._duration;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"current value": this.currentValue,
		};
		if (this.targetValue != undefined) {
			message["target value"] = this.targetValue;
		}
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(BinarySwitchCommand.Get)
@expectedCCResponse(BinarySwitchCCReport)
export class BinarySwitchCCGet extends BinarySwitchCC {}
