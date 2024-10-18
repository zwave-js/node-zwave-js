import {
	CommandClasses,
	Duration,
	type MaybeNotKnown,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	UNKNOWN_STATE,
	ValueMetadata,
	encodeMaybeBoolean,
	maybeUnknownToString,
	parseMaybeBoolean,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	SET_VALUE_HOOKS,
	type SetValueImplementation,
	type SetValueImplementationHooksFactory,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type RefreshValuesContext,
	getEffectiveCCVersion,
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
		...V.staticProperty(
			"currentValue",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Current value",
			} as const,
		),

		...V.staticProperty(
			"targetValue",
			{
				...ValueMetadata.Boolean,
				label: "Target value",
				valueChangeOptions: ["transitionDuration"],
			} as const,
		),

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
	public supportsCommand(cmd: BinarySwitchCommand): MaybeNotKnown<boolean> {
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

		const cc = new BinarySwitchCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<BinarySwitchCCReport>(
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

		const cc = new BinarySwitchCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValue,
			duration,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
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
			const currentValueValueId = BinarySwitchCCValues.currentValue
				.endpoint(this.endpoint.index);

			return {
				optimisticallyUpdateRelatedValues: (
					_supervisedAndSuccessful,
				) => {
					// After setting targetValue, optimistically update currentValue
					if (this.isSinglecast()) {
						this.tryGetValueDB()?.setValue(
							currentValueValueId,
							value,
						);
					} else if (this.isMulticast()) {
						// Figure out which nodes were affected by this command
						const affectedNodes = this.endpoint.node.physicalNodes
							.filter((node) =>
								node
									.getEndpoint(this.endpoint.index)
									?.supportsCC(this.ccId)
							);
						// and optimistically update the currentValue
						for (const node of affectedNodes) {
							this.host
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
		return async function(this: BinarySwitchCCAPI, { property }) {
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Binary Switch"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current state
		ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}

	public setMappedBasicValue(
		ctx: GetValueDB,
		value: number,
	): boolean {
		this.setValue(ctx, BinarySwitchCCValues.currentValue, value > 0);
		return true;
	}
}

// @publicAPI
export interface BinarySwitchCCSetOptions {
	targetValue: boolean;
	duration?: Duration | string;
}

@CCCommand(BinarySwitchCommand.Set)
@useSupervision()
export class BinarySwitchCCSet extends BinarySwitchCC {
	public constructor(
		options: BinarySwitchCCSetOptions & CCCommandOptions,
	) {
		super(options);
		this.targetValue = options.targetValue;
		this.duration = Duration.from(options.duration);
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): BinarySwitchCCSet {
		validatePayload(payload.length >= 1);
		const targetValue = !!payload[0];
		let duration: Duration | undefined;

		if (payload.length >= 2) {
			duration = Duration.parseSet(payload[1]);
		}

		return new BinarySwitchCCSet({
			nodeId: options.context.sourceNodeId,
			targetValue,
			duration,
		});
	}

	public targetValue: boolean;
	public duration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.targetValue ? 0xff : 0x00,
			(this.duration ?? Duration.default()).serializeSet(),
		]);

		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (
			ccVersion < 2 && ctx.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.encodeCCsUsingTargetVersion
		) {
			// When forcing CC version 1, only send the target value
			this.payload = this.payload.subarray(0, 1);
		}

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"target value": this.targetValue,
		};
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface BinarySwitchCCReportOptions {
	currentValue?: MaybeUnknown<boolean>;
	targetValue?: MaybeUnknown<boolean>;
	duration?: Duration | string;
}

@CCCommand(BinarySwitchCommand.Report)
export class BinarySwitchCCReport extends BinarySwitchCC {
	public constructor(
		options: BinarySwitchCCReportOptions & CCCommandOptions,
	) {
		super(options);

		this.currentValue = options.currentValue;
		this.targetValue = options.targetValue;
		this.duration = Duration.from(options.duration);
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): BinarySwitchCCReport {
		validatePayload(payload.length >= 1);
		const currentValue: MaybeUnknown<boolean> | undefined =
			parseMaybeBoolean(
				payload[0],
			);
		let targetValue: MaybeUnknown<boolean> | undefined;
		let duration: Duration | undefined;

		if (payload.length >= 3) {
			targetValue = parseMaybeBoolean(payload[1]);
			duration = Duration.parseReport(payload[2]);
		}

		return new BinarySwitchCCReport({
			nodeId: options.context.sourceNodeId,
			currentValue,
			targetValue,
			duration,
		});
	}

	@ccValue(BinarySwitchCCValues.currentValue)
	public readonly currentValue: MaybeUnknown<boolean> | undefined;

	@ccValue(BinarySwitchCCValues.targetValue)
	public readonly targetValue: MaybeUnknown<boolean> | undefined;

	@ccValue(BinarySwitchCCValues.duration)
	public readonly duration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			encodeMaybeBoolean(this.currentValue ?? UNKNOWN_STATE),
		]);
		if (this.targetValue !== undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([
					encodeMaybeBoolean(this.targetValue),
					(this.duration ?? Duration.default()).serializeReport(),
				]),
			]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"current value": maybeUnknownToString(this.currentValue),
		};
		if (this.targetValue !== undefined) {
			message["target value"] = maybeUnknownToString(this.targetValue);
		}
		if (this.duration != undefined) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(BinarySwitchCommand.Get)
@expectedCCResponse(BinarySwitchCCReport)
export class BinarySwitchCCGet extends BinarySwitchCC {}
