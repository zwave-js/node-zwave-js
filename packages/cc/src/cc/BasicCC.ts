import {
	CommandClasses,
	Duration,
	MessagePriority,
	ValueMetadata,
	parseMaybeNumber,
	parseNumber,
	unknownNumber,
	validatePayload,
	type Maybe,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type SupervisionResult,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { pick, type AllOrNone } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	SET_VALUE,
	SET_VALUE_HOOKS,
	throwUnsupportedProperty,
	throwWrongValueType,
	type PollValueImplementation,
	type SetValueImplementation,
	type SetValueImplementationHooksFactory,
} from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { BasicCommand } from "../lib/_Types";

export const BasicCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Basic, {
		...V.staticProperty("currentValue", {
			...ValueMetadata.ReadOnlyLevel,
			label: "Current value" as const,
		}),
		...V.staticProperty("targetValue", {
			...ValueMetadata.UInt8,
			label: "Target value" as const,
			forceCreation: true,
		}),
		...V.staticProperty("duration", {
			...ValueMetadata.ReadOnlyDuration,
			label: "Remaining duration" as const,
			minVersion: 2,
		}),

		...V.staticProperty("restorePrevious", {
			...ValueMetadata.WriteOnlyBoolean,
			label: "Restore previous value" as const,
			states: {
				true: "Restore",
			},
		}),

		// TODO: This should really not be a static CC value, but depend on compat flags:
		...V.staticPropertyWithName(
			"compatEvent",
			"event",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Event value",
			} as const,
			{
				stateful: false,
				autoCreate: (applHost, endpoint) =>
					!!applHost.getDeviceConfig?.(endpoint.nodeId)?.compat
						?.treatBasicSetAsEvent,
			},
		),
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
	) => {
		// Enable restoring the previous non-zero value
		if (property === "restorePrevious") {
			property = "targetValue";
			value = 255;
		}

		if (property !== "targetValue") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}

		return this.set(value);
	};

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory = (
		{ property },
		value,
		_options,
	) => {
		// Enable restoring the previous non-zero value
		if (property === "restorePrevious") {
			property = "targetValue";
			value = 255;
		}

		if (property === "targetValue") {
			const currentValueValueId = BasicCCValues.currentValue.endpoint(
				this.endpoint.index,
			);
			return {
				optimisticallyUpdateRelatedValues: () => {
					// Only update currentValue for valid target values
					if (
						typeof value === "number" &&
						value >= 0 &&
						value <= 99
					) {
						if (this.isSinglecast()) {
							this.tryGetValueDB()?.setValue(
								currentValueValueId,
								value,
							);
						} else if (this.isMulticast()) {
							// Figure out which nodes were affected by this command
							const affectedNodes =
								this.endpoint.node.physicalNodes.filter(
									(node) =>
										node
											.getEndpoint(this.endpoint.index)
											?.supportsCC(this.ccId),
								);
							// and optimistically update the currentValue
							for (const node of affectedNodes) {
								this.applHost
									.tryGetValueDB(node.id)
									?.setValue(currentValueValueId, value);
							}
						}
					}
				},
				forceVerifyChanges: () => {
					// If we don't know the actual value, we need to verify the change, regardless of the supervision result
					return value === 255;
				},
				verifyChanges: () => {
					if (
						this.isSinglecast() ||
						// We generally don't want to poll for multicasts because of how much traffic it can cause
						// However, when setting the value 255 (ON), we don't know the actual state
						(this.isMulticast() && value === 255)
					) {
						// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
						(this as this).schedulePoll(
							currentValueValueId,
							value === 255 ? undefined : value,
						);
					}
				},
			};
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
	public async set(
		targetValue: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Set);

		const cc = new BasicCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@ccValues(BasicCCValues)
export class BasicCC extends CommandClass {
	declare ccCommand: BasicCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// try to query the current state
		await this.refreshValues(applHost);

		// Remove Basic CC support when there was no response,
		// but only if the compat event shouldn't be used.
		if (
			!applHost.getDeviceConfig?.(node.id)?.compat
				?.treatBasicSetAsEvent &&
			this.getValue(applHost, BasicCCValues.currentValue) == undefined
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
@useSupervision()
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
	@ccValue(BasicCCValues.currentValue)
	public get currentValue(): Maybe<number> | undefined {
		return this._currentValue;
	}

	@ccValue(BasicCCValues.targetValue)
	public readonly targetValue: number | undefined;

	@ccValue(BasicCCValues.duration)
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
