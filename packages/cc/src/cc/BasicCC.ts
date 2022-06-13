import {
	CommandClasses,
	Duration,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	parseMaybeNumber,
	parseNumber,
	unknownNumber,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { AllOrNone, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	ccValueMetadata,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { BasicCommand } from "../lib/_Types";

export const BasicCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Basic, {
		...V.staticProperty("currentValue"),
		...V.staticProperty("targetValue"),
		// TODO: This should really not be a static CC value, but depend on compat flags:
		...V.staticPropertyWithName("compatEvent", "event"),
	}),
});

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
				!this.applHost.options.disableOptimisticValueUpdate &&
				value >= 0 &&
				value <= 99
			) {
				this.getValueDB().setValue(
					BasicCCValues.currentValue.endpoint(this.endpoint.index),
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
				!this.applHost.options.disableOptimisticValueUpdate &&
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
					this.applHost
						.tryGetValueDB(node.id)
						?.setValue(
							BasicCCValues.currentValue.endpoint(
								this.endpoint.index,
							),
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

		const cc = new BasicCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<BasicCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			this.tryGetValueDB()?.setValue(
				BasicCCValues.currentValue.endpoint(this.endpoint.index),
				response.currentValue,
			);
			return pick(response, ["currentValue", "targetValue", "duration"]);
		}
	}

	@validateArgs()
	public async set(targetValue: number): Promise<void> {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Set);

		const cc = new BasicCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
export class BasicCC extends CommandClass {
	declare ccCommand: BasicCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const valueDB = this.getValueDB(applHost);

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// try to query the current state
		await this.refreshValues(applHost);

		// create compat event value if necessary
		if (applHost.getDeviceConfig?.(node.id)?.compat?.treatBasicSetAsEvent) {
			const valueId = BasicCCValues.compatEvent.endpoint(
				this.endpointIndex,
			);
			if (!valueDB.hasMetadata(valueId)) {
				valueDB.setMetadata(valueId, {
					...ValueMetadata.ReadOnlyUInt8,
					label: "Event value",
				});
			}
		} else if (
			valueDB.getValue(
				BasicCCValues.currentValue.endpoint(this.endpointIndex),
			) == undefined
		) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"No response to Basic Get command, assuming the node does not support Basic CC...",
			});
			// SDS14223: A controlling node MUST conclude that the Basic Command Class is not supported by a node (or
			// endpoint) if no Basic Report is returned.
			endpoint.removeCC(CommandClasses.Basic);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Basic,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// try to query the current state
		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
			this._currentValue = parseMaybeNumber(this.payload[0]);

			if (this.version >= 2 && this.payload.length >= 3) {
				this.targetValue = parseNumber(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
			}
			// Do not persist values here. We want to control when this is happening,
			// in case the report is mapped to another CC
		} else {
			this._currentValue = options.currentValue;
			if ("targetValue" in options) {
				this.targetValue = options.targetValue;
				this.duration = options.duration;
			}
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (
			this.currentValue === unknownNumber &&
			!applHost.options.preserveUnknownValues
		) {
			this._currentValue = undefined;
		}

		return super.persistValues(applHost);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(BasicCommand.Get)
@expectedCCResponse(BasicCCReport)
export class BasicCCGet extends BasicCC {}
