import {
	CommandClasses,
	Duration,
	encodeBoolean,
	encodeMaybeBoolean,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	parseBoolean,
	parseMaybeBoolean,
	SupervisionResult,
	unknownBoolean,
	validatePayload,
	ValueMetadata,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import type { AllOrNone } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SetValueImplementationHooksFactory,
	SET_VALUE,
	SET_VALUE_HOOKS,
	throwUnsupportedProperty,
	throwWrongValueType,
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
import { BinarySwitchCommand } from "../lib/_Types";

export const BinarySwitchCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Binary Switch"], {
		...V.staticProperty("currentValue", {
			...ValueMetadata.ReadOnlyBoolean,
			label: "Current value",
		} as const),

		...V.staticProperty("targetValue", {
			...ValueMetadata.Boolean,
			label: "Target value",
			valueChangeOptions: ["transitionDuration"],
		} as const),

		...V.staticProperty(
			"duration",
			{
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration",
			} as const,
			{ minVersion: 2 } as const,
		),
	}),
});

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

		const cc = new BinarySwitchCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<BinarySwitchCCReport>(
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
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			BinarySwitchCommand,
			BinarySwitchCommand.Set,
		);

		const cc = new BinarySwitchCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
			duration,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function (
			this: BinarySwitchCCAPI,
			{ property },
			value,
			options,
		) {
			if (property !== "targetValue") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "boolean") {
				throwWrongValueType(
					this.ccId,
					property,
					"boolean",
					typeof value,
				);
			}
			const duration = Duration.from(options?.transitionDuration);
			return this.set(value, duration);
		};
	}

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory = (
		{ property },
		value,
		options,
	) => {
		if (property === "targetValue") {
			const currentValueValueId =
				BinarySwitchCCValues.currentValue.endpoint(this.endpoint.index);

			return {
				optimisticallyUpdateRelatedValues: () => {
					// After setting targetValue, optimistically update currentValue
					if (this.isSinglecast()) {
						this.tryGetValueDB()?.setValue(
							currentValueValueId,
							value,
						);
					} else if (this.isMulticast()) {
						// Figure out which nodes were affected by this command
						const affectedNodes =
							this.endpoint.node.physicalNodes.filter((node) =>
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
				},

				verifyChanges: () => {
					if (this.isSinglecast()) {
						// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
						this.schedulePoll(currentValueValueId, value, {
							duration: Duration.from(
								options?.transitionDuration,
							),
							// on/off "transitions" are usually fast
							transition: "fast",
						});
					} else {
						// For multicasts, do not schedule a refresh - this could cause a LOT of traffic
					}
				},
			};
		}
	};

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function (this: BinarySwitchCCAPI, { property }) {
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
}

@commandClass(CommandClasses["Binary Switch"])
@implementedVersion(2)
@ccValues(BinarySwitchCCValues)
export class BinarySwitchCC extends CommandClass {
	declare ccCommand: BinarySwitchCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Binary Switch"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current state
		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}

	public setMappedBasicValue(
		applHost: ZWaveApplicationHost,
		value: number,
	): boolean {
		this.setValue(applHost, BinarySwitchCCValues.currentValue, value > 0);
		return true;
	}
}

interface BinarySwitchCCSetOptions extends CCCommandOptions {
	targetValue: boolean;
	duration?: Duration | string;
}

@CCCommand(BinarySwitchCommand.Set)
@useSupervision()
export class BinarySwitchCCSet extends BinarySwitchCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | BinarySwitchCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.targetValue = !!this.payload[0];
			if (this.payload.length >= 2) {
				this.duration = Duration.parseSet(this.payload[1]);
			}
		} else {
			this.targetValue = options.targetValue;
			this.duration = Duration.from(options.duration);
		}
	}

	public targetValue: boolean;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		const payload: number[] = [this.targetValue ? 0xff : 0x00];
		if (this.version >= 2) {
			payload.push((this.duration ?? Duration.default()).serializeSet());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"target value": this.targetValue,
		};
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

export type BinarySwitchCCReportOptions = CCCommandOptions & {
	currentValue: boolean;
} & AllOrNone<{
		targetValue: boolean;
		duration: Duration | string;
	}>;

@CCCommand(BinarySwitchCommand.Report)
export class BinarySwitchCCReport extends BinarySwitchCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| BinarySwitchCCReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.currentValue = parseMaybeBoolean(this.payload[0]);

			if (this.version >= 2 && this.payload.length >= 3) {
				// V2
				this.targetValue = parseBoolean(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
			}
		} else {
			this.currentValue = options.currentValue;
			this.targetValue = options.targetValue;
			this.duration = Duration.from(options.duration);
		}
	}

	@ccValue(BinarySwitchCCValues.currentValue)
	public readonly currentValue: Maybe<boolean> | undefined;

	@ccValue(BinarySwitchCCValues.targetValue)
	public readonly targetValue: boolean | undefined;

	@ccValue(BinarySwitchCCValues.duration)
	public readonly duration: Duration | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			encodeMaybeBoolean(this.currentValue ?? unknownBoolean),
		]);
		if (this.targetValue != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([
					encodeBoolean(this.targetValue),
					(this.duration ?? Duration.default()).serializeReport(),
				]),
			]);
		}
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

@CCCommand(BinarySwitchCommand.Get)
@expectedCCResponse(BinarySwitchCCReport)
export class BinarySwitchCCGet extends BinarySwitchCC {}
