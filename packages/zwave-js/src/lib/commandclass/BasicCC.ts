import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	parseMaybeNumber,
	parseNumber,
	validatePayload,
	ValueID,
	ValueMetadata,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { AllOrNone, pick } from "@zwave-js/shared";
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
import { BasicCommand } from "./_Types";

export function getTargetValueValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses.Basic,
		endpoint,
		property: "targetValue",
	};
}

export function getCurrentValueValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses.Basic,
		endpoint,
		property: "currentValue",
	};
}

export function getCompatEventValueId(endpoint?: number): ValueID {
	return {
		commandClass: CommandClasses.Basic,
		endpoint,
		property: "event",
	};
}

@API(CommandClasses.Basic)
export class BasicCCAPI extends CCAPI {
	public supportsCommand(cmd: BasicCommand): Maybe<boolean> {
		switch (cmd) {
			case BasicCommand.Get:
				return this.isSinglecast();
			case BasicCommand.Set:
				return true;
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

		// If the command did not fail, assume that it succeeded and update the currentValue accordingly
		// so UIs have immediate feedback
		if (this.isSinglecast()) {
			// Only update currentValue for valid target values
			if (
				!this.driver.options.disableOptimisticValueUpdate &&
				value >= 0 &&
				value <= 99
			) {
				const valueDB = this.endpoint.getNodeUnsafe()?.valueDB;
				valueDB?.setValue(
					getCurrentValueValueId(this.endpoint.index),
					value,
				);
			}

			// and verify the current value after a delay. We query currentValue instead of targetValue to make sure
			// that unsolicited updates cancel the scheduled poll
			if (property === "targetValue") property = "currentValue";
			this.schedulePoll({ property }, value);
		} else if (this.isMulticast()) {
			// Only update currentValue for valid target values
			if (
				!this.driver.options.disableOptimisticValueUpdate &&
				value >= 0 &&
				value <= 99
			) {
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
			} else if (value === 255) {
				// We generally don't want to poll for multicasts because of how much traffic it can cause
				// However, when setting the value 255 (ON), we don't know the actual state

				// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
				if (property === "targetValue") property = "currentValue";
				this.schedulePoll({ property }, undefined);
			}
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

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Get);

		const cc = new BasicCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<BasicCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			const valueDB = this.endpoint.getNodeUnsafe()?.valueDB;
			valueDB?.setValue(
				getCurrentValueValueId(this.endpoint.index),
				response.currentValue,
			);
			return pick(response, ["currentValue", "targetValue", "duration"]);
		}
	}

	@validateArgs()
	public async set(targetValue: number): Promise<void> {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Set);

		const cc = new BasicCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
export class BasicCC extends CommandClass {
	declare ccCommand: BasicCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// try to query the current state
		await this.refreshValues(driver);

		// create compat event value if necessary
		if (node.deviceConfig?.compat?.treatBasicSetAsEvent) {
			const valueId = getCompatEventValueId(this.endpointIndex);
			if (!node.valueDB.hasMetadata(valueId)) {
				node.valueDB.setMetadata(valueId, {
					...ValueMetadata.ReadOnlyUInt8,
					label: "Event value",
				});
			}
		} else if (
			this.getValueDB().getValue(
				getCurrentValueValueId(this.endpointIndex),
			) == undefined
		) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"No response to Basic Get command, assuming the node does not support Basic CC...",
			});
			// SDS14223: A controlling node MUST conclude that the Basic Command Class is not supported by a node (or
			// endpoint) if no Basic Report is returned.
			endpoint.removeCC(CommandClasses.Basic);
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses.Basic.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// try to query the current state
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying Basic CC state...",
			direction: "outbound",
		});

		const basicResponse = await api.get();
		if (basicResponse) {
			let logMessage = `received Basic CC state:
current value:      ${basicResponse.currentValue}`;
			if (basicResponse.targetValue != undefined) {
				logMessage += `
target value:       ${basicResponse.targetValue}
remaining duration: ${basicResponse.duration?.toString() ?? "undefined"}`;
			}
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

interface BasicCCSetOptions extends CCCommandOptions {
	targetValue: number;
}

@CCCommand(BasicCommand.Set)
export class BasicCCSet extends BasicCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | BasicCCSetOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "target value": this.targetValue },
		};
	}
}

type BasicCCReportOptions = CCCommandOptions & {
	currentValue: number;
} & AllOrNone<{
		targetValue: number;
		duration: Duration;
	}>;

@CCCommand(BasicCommand.Report)
export class BasicCCReport extends BasicCC {
	// @noCCValues See comment in the constructor
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | BasicCCReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.currentValue = parseMaybeNumber(
				this.payload[0],
				host.options.preserveUnknownValues,
			);

			if (this.version >= 2 && this.payload.length >= 3) {
				this.targetValue = parseNumber(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
			}
			// Do not persist values here. We want to control when this is happening,
			// in case the report is mapped to another CC
		} else {
			this.currentValue = options.currentValue;
			if ("targetValue" in options) {
				this.targetValue = options.targetValue;
				this.duration = options.duration;
			}
		}
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyLevel,
		label: "Current value",
	})
	public readonly currentValue: Maybe<number> | undefined;

	@ccValue({ forceCreation: true })
	@ccValueMetadata({
		...ValueMetadata.Level,
		label: "Target value",
	})
	public readonly targetValue: number | undefined;

	@ccValue({ minVersion: 2 })
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyDuration,
		label: "Remaining duration",
	})
	public readonly duration: Duration | undefined;

	public serialize(): Buffer {
		const payload: number[] = [
			typeof this.currentValue !== "number" ? 0xfe : this.currentValue,
		];
		if (this.version >= 2 && this.targetValue && this.duration) {
			payload.push(this.targetValue, this.duration.serializeReport());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
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

@CCCommand(BasicCommand.Get)
@expectedCCResponse(BasicCCReport)
export class BasicCCGet extends BasicCC {}
