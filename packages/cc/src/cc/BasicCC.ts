import {
	CommandClasses,
	Duration,
	type MaybeNotKnown,
	type MaybeUnknown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	type ValueID,
	ValueMetadata,
	maybeUnknownToString,
	parseMaybeNumber,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { type AllOrNone, pick } from "@zwave-js/shared/safe";
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
	gotDeserializationOptions,
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

		// Assume that the endpoint supports Basic CC, so the values get persisted correctly.
		endpoint.addCC(CommandClasses.Basic, { isSupported: true });

		// try to query the current state
		await this.refreshValues(applHost);

		// Remove Basic CC support again when there was no response
		if (
			this.getValue(applHost, BasicCCValues.currentValue) == undefined
		) {
			applHost.controllerLog.logNode(node.id, {
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

	public override getDefinedValueIDs(
		applHost: ZWaveApplicationHost,
	): ValueID[] {
		const ret: ValueID[] = [];
		const endpoint = this.getEndpoint(applHost)!;

		const compat = applHost.getDeviceConfig?.(endpoint.nodeId)?.compat;
		if (compat?.mapBasicSet === "event") {
			// Add the compat event value if it should be exposed
			ret.push(BasicCCValues.compatEvent.endpoint(endpoint.index));
		}

		if (endpoint.supportsCC(this.ccId)) {
			// Defer to the base implementation if Basic CC is supported.
			// This implies that no other actuator CC is supported.
			ret.push(...super.getDefinedValueIDs(applHost));
		} else if (endpoint.controlsCC(CommandClasses.Basic)) {
			// During the interview, we mark Basic CC as controlled only if we want to expose currentValue
			ret.push(BasicCCValues.currentValue.endpoint(endpoint.index));
		}

		return ret;
	}
}

// @publicAPI
export interface BasicCCSetOptions extends CCCommandOptions {
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "target value": this.targetValue },
		};
	}
}

// @publicAPI
export type BasicCCReportOptions =
	& CCCommandOptions
	& {
		currentValue: number;
	}
	& AllOrNone<{
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
			this._currentValue =
				// 0xff is a legacy value for 100% (99)
				this.payload[0] === 0xff
					? 99
					: parseMaybeNumber(this.payload[0]);

			if (this.payload.length >= 3) {
				this.targetValue = parseMaybeNumber(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
			}
		} else {
			this._currentValue = options.currentValue;
			if ("targetValue" in options) {
				this.targetValue = options.targetValue;
				this.duration = options.duration;
			}
		}
	}

	private _currentValue: MaybeUnknown<number> | undefined;
	@ccValue(BasicCCValues.currentValue)
	public get currentValue(): MaybeUnknown<number> | undefined {
		return this._currentValue;
	}

	@ccValue(BasicCCValues.targetValue)
	public readonly targetValue: MaybeUnknown<number> | undefined;

	@ccValue(BasicCCValues.duration)
	public readonly duration: Duration | undefined;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		// Basic CC Report persists its values itself, since there are some
		// specific rules when which value may be persisted.
		// These rules are essentially encoded in the getDefinedValueIDs overload,
		// so we simply reuse that here.

		// Figure out which values may be persisted.
		const definedValueIDs = this.getDefinedValueIDs(applHost);
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
				applHost,
				BasicCCValues.currentValue,
				this.currentValue,
			);
		}
		if (this.targetValue !== undefined && shouldPersistTargetValue) {
			this.setValue(
				applHost,
				BasicCCValues.targetValue,
				this.targetValue,
			);
		}
		if (this.duration !== undefined && shouldPersistDuration) {
			this.setValue(
				applHost,
				BasicCCValues.duration,
				this.duration,
			);
		}

		return true;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.currentValue ?? 0xfe,
			this.targetValue ?? 0xfe,
			(this.duration ?? Duration.unknown()).serializeReport(),
		]);

		if (
			this.version < 2 && this.host.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.encodeCCsUsingTargetVersion
		) {
			// When forcing CC version 1, only send the current value
			this.payload = this.payload.subarray(0, 1);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(BasicCommand.Get)
@expectedCCResponse(BasicCCReport)
export class BasicCCGet extends BasicCC {}
