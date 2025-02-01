import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import { type GetDeviceConfig } from "@zwave-js/config";
import {
	CommandClasses,
	type ControlsCC,
	Duration,
	type EndpointId,
	type GetEndpoint,
	type GetNode,
	type GetSupportedCCVersion,
	type GetValueDB,
	type MaybeNotKnown,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type NodeId,
	type SupervisionResult,
	type SupportsCC,
	type ValueID,
	ValueMetadata,
	type WithAddress,
	maybeUnknownToString,
	parseMaybeNumber,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { pick } from "@zwave-js/shared/safe";
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
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	getEffectiveCCVersion,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { BasicCommand } from "../lib/_Types.js";

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

		...V.staticPropertyWithName(
			"compatEvent",
			"event",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Event value",
			} as const,
			{
				stateful: false,
				autoCreate: false,
			},
		),
	}),
});

@API(CommandClasses.Basic)
export class BasicCCAPI extends CCAPI {
	public supportsCommand(cmd: BasicCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case BasicCommand.Get:
				return this.isSinglecast();
			case BasicCommand.Set:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: BasicCCAPI, { property }, value) {
			// Enable restoring the previous non-zero value
			if (property === "restorePrevious") {
				property = "targetValue";
				value = 255;
			}

			if (property !== "targetValue") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			return this.set(value);
		};
	}

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
				optimisticallyUpdateRelatedValues: (
					_supervisedAndSuccessful,
				) => {
					// Only update currentValue for valid target values
					if (
						typeof value === "number"
						&& value >= 0
						&& value <= 99
					) {
						if (this.isSinglecast()) {
							this.tryGetValueDB()?.setValue(
								currentValueValueId,
								value,
							);
						} else if (this.isMulticast()) {
							// Figure out which nodes were affected by this command
							const affectedNodes = this.endpoint.node
								.physicalNodes.filter(
									(node) =>
										node
											.getEndpoint(this.endpoint.index)
											?.supportsCC(this.ccId),
								);
							// and optimistically update the currentValue
							for (const node of affectedNodes) {
								this.host
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
						this.isSinglecast()
						// We generally don't want to poll for multicasts because of how much traffic it can cause
						// However, when setting the value 255 (ON), we don't know the actual state
						|| (this.isMulticast() && value === 255)
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

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: BasicCCAPI, { property }) {
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

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(BasicCommand, BasicCommand.Get);

		const cc = new BasicCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<BasicCCReport>(
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

		const cc = new BasicCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			targetValue,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@ccValues(BasicCCValues)
export class BasicCC extends CommandClass {
	declare ccCommand: BasicCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Assume that the endpoint supports Basic CC, so the values get persisted correctly.
		endpoint.addCC(CommandClasses.Basic, { isSupported: true });

		// try to query the current state
		await this.refreshValues(ctx);

		// Remove Basic CC support again when there was no response
		if (
			this.getValue(ctx, BasicCCValues.currentValue) == undefined
		) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"No response to Basic Get command, assuming Basic CC is unsupported...",
			});
			// SDS14223: A controlling node MUST conclude that the Basic Command Class is not supported by a node (or
			// endpoint) if no Basic Report is returned.
			endpoint.addCC(CommandClasses.Basic, { isSupported: false });
			if (!endpoint.controlsCC(CommandClasses.Basic)) {
				endpoint.removeCC(CommandClasses.Basic);
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Basic,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// try to query the current state
		ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}

	public override getDefinedValueIDs(
		ctx:
			& GetValueDB
			& GetSupportedCCVersion
			& GetDeviceConfig
			& GetNode<
				NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
			>,
	): ValueID[] {
		const ret: ValueID[] = [];
		const endpoint = this.getEndpoint(ctx)!;

		const compat = ctx.getDeviceConfig?.(endpoint.nodeId)?.compat;
		if (compat?.mapBasicSet === "event") {
			// Add the compat event value if it should be exposed
			ret.push(BasicCCValues.compatEvent.endpoint(endpoint.index));
		}

		if (endpoint.supportsCC(this.ccId)) {
			// Defer to the base implementation if Basic CC is supported.
			// This implies that no other actuator CC is supported.
			ret.push(...super.getDefinedValueIDs(ctx));
		} else if (endpoint.controlsCC(CommandClasses.Basic)) {
			// During the interview, we mark Basic CC as controlled only if we want to expose currentValue
			ret.push(BasicCCValues.currentValue.endpoint(endpoint.index));
		}

		return ret;
	}
}

// @publicAPI
export interface BasicCCSetOptions {
	targetValue: number;
}

@CCCommand(BasicCommand.Set)
@useSupervision()
export class BasicCCSet extends BasicCC {
	public constructor(
		options: WithAddress<BasicCCSetOptions>,
	) {
		super(options);
		this.targetValue = options.targetValue;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): BasicCCSet {
		validatePayload(raw.payload.length >= 1);
		const targetValue = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			targetValue,
		});
	}

	public targetValue: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.targetValue]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "target value": this.targetValue },
		};
	}
}

// @publicAPI
export interface BasicCCReportOptions {
	currentValue?: MaybeUnknown<number>;
	targetValue?: MaybeUnknown<number>;
	duration?: Duration;
}

@CCCommand(BasicCommand.Report)
@ccValueProperty("currentValue", BasicCCValues.currentValue)
@ccValueProperty("targetValue", BasicCCValues.targetValue)
@ccValueProperty("duration", BasicCCValues.duration)
export class BasicCCReport extends BasicCC {
	// @noCCValues See comment in the constructor
	public constructor(
		options: WithAddress<BasicCCReportOptions>,
	) {
		super(options);

		this.currentValue = options.currentValue;
		this.targetValue = options.targetValue;
		this.duration = options.duration;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): BasicCCReport {
		validatePayload(raw.payload.length >= 1);
		const currentValue: MaybeUnknown<number> | undefined =
			// 0xff is a legacy value for 100% (99)
			raw.payload[0] === 0xff
				? 99
				: parseMaybeNumber(raw.payload[0]);
		validatePayload(currentValue !== undefined);

		let targetValue: MaybeUnknown<number> | undefined;
		let duration: Duration | undefined;

		if (raw.payload.length >= 3) {
			targetValue = parseMaybeNumber(raw.payload[1]);
			duration = Duration.parseReport(raw.payload[2]);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			currentValue,
			targetValue,
			duration,
		});
	}

	public currentValue: MaybeUnknown<number> | undefined;

	public readonly targetValue: MaybeUnknown<number> | undefined;

	public readonly duration: Duration | undefined;

	public persistValues(ctx: PersistValuesContext): boolean {
		// Basic CC Report persists its values itself, since there are some
		// specific rules when which value may be persisted.
		// These rules are essentially encoded in the getDefinedValueIDs overload,
		// so we simply reuse that here.

		// Figure out which values may be persisted.
		const definedValueIDs = this.getDefinedValueIDs(ctx);
		const shouldPersistCurrentValue = definedValueIDs.some((vid) =>
			BasicCCValues.currentValue.is(vid)
		);
		const shouldPersistTargetValue = definedValueIDs.some((vid) =>
			BasicCCValues.targetValue.is(vid)
		);
		const shouldPersistDuration = definedValueIDs.some((vid) =>
			BasicCCValues.duration.is(vid)
		);

		if (this.currentValue !== undefined && shouldPersistCurrentValue) {
			this.setValue(
				ctx,
				BasicCCValues.currentValue,
				this.currentValue,
			);
		}
		if (this.targetValue !== undefined && shouldPersistTargetValue) {
			this.setValue(
				ctx,
				BasicCCValues.targetValue,
				this.targetValue,
			);
		}
		if (this.duration !== undefined && shouldPersistDuration) {
			this.setValue(
				ctx,
				BasicCCValues.duration,
				this.duration,
			);
		}

		return true;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			this.currentValue ?? 0xfe,
			this.targetValue ?? 0xfe,
			(this.duration ?? Duration.unknown()).serializeReport(),
		]);

		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (
			ccVersion < 2 && ctx.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.encodeCCsUsingTargetVersion
		) {
			// When forcing CC version 1, only send the current value
			this.payload = this.payload.subarray(0, 1);
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

@CCCommand(BasicCommand.Get)
@expectedCCResponse(BasicCCReport)
export class BasicCCGet extends BasicCC {}
