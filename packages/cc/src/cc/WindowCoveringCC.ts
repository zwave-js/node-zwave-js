import {
	CommandClasses,
	Duration,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	encodeBitMask,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	SET_VALUE_HOOKS,
	type SetValueImplementation,
	type SetValueImplementationHooksFactory,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
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
import {
	type LevelChangeDirection,
	WindowCoveringCommand,
	WindowCoveringParameter,
} from "../lib/_Types";

function parameterToMetadataStates(
	parameter: WindowCoveringParameter,
): Record<number, string> {
	switch (parameter) {
		case WindowCoveringParameter["Vertical Slats Angle (no position)"]:
		case WindowCoveringParameter["Vertical Slats Angle"]:
			return {
				0: "Closed (right inside)",
				50: "Open",
				99: "Closed (left inside)",
			};

		case WindowCoveringParameter["Horizontal Slats Angle (no position)"]:
		case WindowCoveringParameter["Horizontal Slats Angle"]:
			return {
				0: "Closed (up inside)",
				50: "Open",
				99: "Closed (down inside)",
			};
	}

	return {
		0: "Closed",
		99: "Open",
	};
}

function parameterToLevelChangeLabel(
	parameter: WindowCoveringParameter,
	direction: "up" | "down",
): string {
	switch (parameter) {
		// For angle control, both directions are closed, so we specify it explicitly
		case WindowCoveringParameter["Vertical Slats Angle (no position)"]:
		case WindowCoveringParameter["Vertical Slats Angle"]:
			return `Change tilt (${
				direction === "up" ? "left inside" : "right inside"
			})`;

		case WindowCoveringParameter["Horizontal Slats Angle (no position)"]:
		case WindowCoveringParameter["Horizontal Slats Angle"]:
			// Horizontal slats refer to the position of the inner side of the slats
			// where a high level (99) actually means they face down
			return `Change tilt (${
				direction === "up" ? "down inside" : "up inside"
			})`;
	}
	// For all other parameters, refer to the amount of light that is let in
	return direction === "up" ? "Open" : "Close";
}

export const WindowCoveringCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Window Covering"], {
		...V.staticProperty(
			"supportedParameters",
			undefined, // meta
			{ internal: true }, // value options
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Window Covering"], {
		...V.dynamicPropertyAndKeyWithName(
			"currentValue",
			"currentValue",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "currentValue" && typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) => {
				return {
					...ValueMetadata.ReadOnlyLevel,
					label: `Current value - ${
						getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)
					}`,
					states: parameterToMetadataStates(parameter),
					ccSpecific: { parameter },
				} as const;
			},
		),

		...V.dynamicPropertyAndKeyWithName(
			"targetValue",
			"targetValue",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "targetValue" && typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) => {
				// Only odd-numbered parameters have position support and are writable
				const writeable = parameter % 2 === 1;
				return {
					...ValueMetadata.Level,
					label: `Target value - ${
						getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)
					}`,
					// Only odd-numbered parameters have position support and are writable
					writeable: parameter % 2 === 1,
					states: parameterToMetadataStates(parameter),
					allowManualEntry: writeable,
					ccSpecific: { parameter },
					valueChangeOptions: ["transitionDuration"],
				} as const;
			},
		),

		...V.dynamicPropertyAndKeyWithName(
			"duration",
			"duration",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "duration" && typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) => ({
				...ValueMetadata.ReadOnlyDuration,
				label: `Remaining duration - ${
					getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)
				}`,
				ccSpecific: {
					parameter,
				},
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"levelChangeUp",
			// The direction refers to the change in level, not the physical location
			"levelChangeUp",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "levelChangeUp" && typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) => {
				return {
					...ValueMetadata.WriteOnlyBoolean,
					label: `${
						parameterToLevelChangeLabel(
							parameter,
							"up",
						)
					} - ${
						getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)
					}`,
					valueChangeOptions: ["transitionDuration"],
					states: {
						true: "Start",
						false: "Stop",
					},
					ccSpecific: { parameter },
				} as const;
			},
		),

		...V.dynamicPropertyAndKeyWithName(
			"levelChangeDown",
			// The direction refers to the change in level, not the physical location
			"levelChangeDown",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "levelChangeDown"
				&& typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) => {
				return {
					...ValueMetadata.WriteOnlyBoolean,
					label: `${
						parameterToLevelChangeLabel(
							parameter,
							"down",
						)
					} - ${
						getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)
					}`,
					valueChangeOptions: ["transitionDuration"],
					states: {
						true: "Start",
						false: "Stop",
					},
					ccSpecific: { parameter },
				} as const;
			},
		),
	}),
});

@API(CommandClasses["Window Covering"])
export class WindowCoveringCCAPI extends CCAPI {
	public supportsCommand(cmd: WindowCoveringCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case WindowCoveringCommand.Get:
			case WindowCoveringCommand.Set:
			case WindowCoveringCommand.SupportedGet:
			case WindowCoveringCommand.StartLevelChange:
			case WindowCoveringCommand.StopLevelChange:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: WindowCoveringCCAPI,
			{ property, propertyKey },
			value,
			options,
		) {
			const valueId = {
				commandClass: this.ccId,
				property,
				propertyKey,
			};

			if (WindowCoveringCCValues.targetValue.is(valueId)) {
				if (
					typeof propertyKey !== "number"
					// Only odd-numbered parameters have position support and are writable
					|| propertyKey % 2 === 0
				) {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey!,
					);
				}

				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}

				const parameter = propertyKey;
				const duration = Duration.from(options?.transitionDuration);

				return this.set([{ parameter, value }], duration);
			} else if (
				WindowCoveringCCValues.levelChangeUp.is(valueId)
				|| WindowCoveringCCValues.levelChangeDown.is(valueId)
			) {
				if (typeof value !== "boolean") {
					throwWrongValueType(
						this.ccId,
						property,
						"boolean",
						typeof value,
					);
				}

				const parameter = propertyKey as number;
				const direction = WindowCoveringCCValues.levelChangeUp.is(
						valueId,
					)
					? "up"
					: "down";

				if (value) {
					// Perform the level change
					const duration = Duration.from(options?.transitionDuration);
					return this.startLevelChange(
						parameter,
						direction,
						duration,
					);
				} else {
					return this.stopLevelChange(parameter);
				}
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory = (
		{ property, propertyKey },
		value,
		options,
	) => {
		const valueId = {
			commandClass: this.ccId,
			property,
			propertyKey,
		};

		if (WindowCoveringCCValues.targetValue.is(valueId)) {
			if (typeof propertyKey !== "number") return;
			const parameter = propertyKey;

			const duration = Duration.from(options?.transitionDuration);

			const currentValueValueId = WindowCoveringCCValues.currentValue(
				parameter,
			).endpoint(this.endpoint.index);

			return {
				// Window Covering commands may take some time to be executed.
				// Therefore we try to supervise the command execution and delay the
				// optimistic update until the final result is received.
				supervisionDelayedUpdates: true,
				supervisionOnSuccess: async () => {
					// Only update currentValue for valid target values
					if (
						typeof value === "number"
						&& value >= 0
						&& value <= 99
					) {
						this.tryGetValueDB()?.setValue(
							currentValueValueId,
							value,
						);
					} else if (value === 255) {
						// We don't know the status now, so refresh the current value
						try {
							await this.get(parameter);
						} catch {
							// ignore
						}
					}
				},
				supervisionOnFailure: async () => {
					// The transition failed, so now we don't know the status - refresh the current value
					try {
						await this.get(parameter);
					} catch {
						// ignore
					}
				},

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

				verifyChanges: () => {
					if (this.isSinglecast()) {
						// We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
						this.schedulePoll(currentValueValueId, value, {
							duration,
						});
					} else {
						// For multicasts, do not schedule a refresh - this could cause a LOT of traffic
					}
				},
			};
		}
	};

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: WindowCoveringCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "currentValue":
				case "targetValue":
				case "duration":
					if (propertyKey == undefined) {
						throwMissingPropertyKey(this.ccId, property);
					} else if (typeof propertyKey !== "number") {
						throwUnsupportedPropertyKey(
							this.ccId,
							property,
							propertyKey,
						);
					}
					return (await this.get(propertyKey))?.[property];
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public async getSupported(): Promise<
		MaybeNotKnown<readonly WindowCoveringParameter[]>
	> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.SupportedGet,
		);

		const cc = new WindowCoveringCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			WindowCoveringCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedParameters;
	}

	@validateArgs({ strictEnums: true })
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(parameter: WindowCoveringParameter) {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.Get,
		);

		const cc = new WindowCoveringCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
		});
		const response = await this.host.sendCommand<
			WindowCoveringCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["currentValue", "targetValue", "duration"]);
		}
	}

	@validateArgs()
	public async set(
		targetValues: {
			parameter: WindowCoveringParameter;
			value: number;
		}[],
		duration?: Duration | string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.StartLevelChange,
		);

		const cc = new WindowCoveringCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValues,
			duration,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async startLevelChange(
		parameter: WindowCoveringParameter,
		direction: keyof typeof LevelChangeDirection,
		duration?: Duration | string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.StartLevelChange,
		);

		const cc = new WindowCoveringCCStartLevelChange({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
			direction,
			duration,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async stopLevelChange(
		parameter: WindowCoveringParameter,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.StopLevelChange,
		);

		const cc = new WindowCoveringCCStopLevelChange({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Window Covering"])
@implementedVersion(1)
@ccValues(WindowCoveringCCValues)
export class WindowCoveringCC extends CommandClass {
	declare ccCommand: WindowCoveringCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Window Covering"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported window covering parameters...",
			direction: "outbound",
		});
		const supported = await api.getSupported();
		if (supported?.length) {
			const logMessage = `supported window covering parameters:
${
				supported
					.map((p) =>
						`· ${getEnumMemberName(WindowCoveringParameter, p)}`
					)
					.join("\n")
			}`;
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			// Create metadata for all supported parameters
			for (const param of supported) {
				// Default values
				this.setMetadata(
					ctx,
					WindowCoveringCCValues.currentValue(param),
				);
				this.setMetadata(
					ctx,
					WindowCoveringCCValues.targetValue(param),
				);
				this.setMetadata(
					ctx,
					WindowCoveringCCValues.duration(param),
				);

				// Level change values
				this.setMetadata(
					ctx,
					WindowCoveringCCValues.levelChangeUp(param),
				);
				this.setMetadata(
					ctx,
					WindowCoveringCCValues.levelChangeDown(param),
				);

				// And for the odd parameters (with position support), query the position
				if (param % 2 === 1) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying position for parameter ${
							getEnumMemberName(
								WindowCoveringParameter,
								param,
							)
						}...`,
						direction: "outbound",
					});
					await api.get(param);
				}
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public translatePropertyKey(
		ctx: GetValueDB,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (typeof propertyKey === "number") {
			return getEnumMemberName(WindowCoveringParameter, propertyKey);
		}
		return super.translatePropertyKey(ctx, property, propertyKey);
	}
}

// @publicAPI
export interface WindowCoveringCCSupportedReportOptions {
	supportedParameters: readonly WindowCoveringParameter[];
}

@CCCommand(WindowCoveringCommand.SupportedReport)
export class WindowCoveringCCSupportedReport extends WindowCoveringCC {
	public constructor(
		options: WindowCoveringCCSupportedReportOptions & CCCommandOptions,
	) {
		super(options);
		this.supportedParameters = options.supportedParameters;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): WindowCoveringCCSupportedReport {
		validatePayload(payload.length >= 1);

		const numBitmaskBytes = payload[0] & 0b1111;
		validatePayload(payload.length >= 1 + numBitmaskBytes);
		const bitmask = payload.subarray(1, 1 + numBitmaskBytes);
		const supportedParameters: WindowCoveringParameter[] = parseBitMask(
			bitmask,
			WindowCoveringParameter["Outbound Left (no position)"],
		);

		return new WindowCoveringCCSupportedReport({
			nodeId: options.context.sourceNodeId,
			supportedParameters,
		});
	}

	@ccValue(WindowCoveringCCValues.supportedParameters)
	public readonly supportedParameters: readonly WindowCoveringParameter[];

	public serialize(ctx: CCEncodingContext): Buffer {
		const bitmask = encodeBitMask(
			this.supportedParameters,
			undefined,
			WindowCoveringParameter["Outbound Left (no position)"],
		).subarray(0, 15);
		const numBitmaskBytes = bitmask.length & 0b1111;

		this.payload = Buffer.concat([
			Buffer.from([numBitmaskBytes]),
			bitmask.subarray(0, numBitmaskBytes),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported parameters": this.supportedParameters
					.map(
						(p) =>
							`\n· ${
								getEnumMemberName(
									WindowCoveringParameter,
									p,
								)
							}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(WindowCoveringCommand.SupportedGet)
@expectedCCResponse(WindowCoveringCCSupportedReport)
export class WindowCoveringCCSupportedGet extends WindowCoveringCC {}

// @publicAPI
export interface WindowCoveringCCReportOptions {
	parameter: WindowCoveringParameter;
	currentValue: number;
	targetValue: number;
	duration: Duration;
}

@CCCommand(WindowCoveringCommand.Report)
export class WindowCoveringCCReport extends WindowCoveringCC {
	public constructor(
		options: WindowCoveringCCReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.parameter = options.parameter;
		this.currentValue = options.currentValue;
		this.targetValue = options.targetValue;
		this.duration = options.duration;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): WindowCoveringCCReport {
		validatePayload(payload.length >= 4);
		const parameter: WindowCoveringParameter = payload[0];
		const currentValue = payload[1];
		const targetValue = payload[2];
		const duration = Duration.parseReport(payload[3])
			?? Duration.unknown();

		return new WindowCoveringCCReport({
			nodeId: options.context.sourceNodeId,
			parameter,
			currentValue,
			targetValue,
			duration,
		});
	}

	public readonly parameter: WindowCoveringParameter;

	@ccValue(
		WindowCoveringCCValues.currentValue,
		(self: WindowCoveringCCReport) => [self.parameter] as const,
	)
	public readonly currentValue: number;
	@ccValue(
		WindowCoveringCCValues.targetValue,
		(self: WindowCoveringCCReport) => [self.parameter] as const,
	)
	public readonly targetValue: number;
	@ccValue(
		WindowCoveringCCValues.duration,
		(self: WindowCoveringCCReport) => [self.parameter] as const,
	)
	public readonly duration: Duration;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				parameter: getEnumMemberName(
					WindowCoveringParameter,
					this.parameter,
				),
				"current value": this.currentValue,
				"target value": this.targetValue,
				duration: this.duration.toString(),
			},
		};
	}
}

// @publicAPI
export interface WindowCoveringCCGetOptions {
	parameter: WindowCoveringParameter;
}

function testResponseForWindowCoveringGet(
	sent: WindowCoveringCCGet,
	received: WindowCoveringCCReport,
) {
	return received.parameter === sent.parameter;
}

@CCCommand(WindowCoveringCommand.Get)
@expectedCCResponse(WindowCoveringCCReport, testResponseForWindowCoveringGet)
export class WindowCoveringCCGet extends WindowCoveringCC {
	public constructor(
		options: WindowCoveringCCGetOptions & CCCommandOptions,
	) {
		super(options);
		this.parameter = options.parameter;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): WindowCoveringCCGet {
		validatePayload(payload.length >= 1);
		const parameter: WindowCoveringParameter = payload[0];

		return new WindowCoveringCCGet({
			nodeId: options.context.sourceNodeId,
			parameter,
		});
	}

	public parameter: WindowCoveringParameter;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				parameter: getEnumMemberName(
					WindowCoveringParameter,
					this.parameter,
				),
			},
		};
	}
}

// @publicAPI
export interface WindowCoveringCCSetOptions {
	targetValues: {
		parameter: WindowCoveringParameter;
		value: number;
	}[];
	duration?: Duration | string;
}

@CCCommand(WindowCoveringCommand.Set)
@useSupervision()
export class WindowCoveringCCSet extends WindowCoveringCC {
	public constructor(
		options: WindowCoveringCCSetOptions & CCCommandOptions,
	) {
		super(options);
		this.targetValues = options.targetValues;
		this.duration = Duration.from(options.duration);
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): WindowCoveringCCSet {
		validatePayload(payload.length >= 1);
		const numEntries = payload[0] & 0b11111;

		validatePayload(payload.length >= 1 + numEntries * 2);
		const targetValues: WindowCoveringCCSetOptions["targetValues"] = [];

		for (let i = 0; i < numEntries; i++) {
			const offset = 1 + i * 2;
			targetValues.push({
				parameter: payload[offset],
				value: payload[offset + 1],
			});
		}

		let duration: Duration | undefined;

		if (payload.length >= 2 + numEntries * 2) {
			duration = Duration.parseSet(
				payload[1 + numEntries * 2],
			);
		}

		return new WindowCoveringCCSet({
			nodeId: options.context.sourceNodeId,
			targetValues,
			duration,
		});
	}

	public targetValues: {
		parameter: WindowCoveringParameter;
		value: number;
	}[];
	public duration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		const numEntries = this.targetValues.length & 0b11111;
		this.payload = Buffer.allocUnsafe(2 + numEntries * 2);

		this.payload[0] = numEntries;
		for (let i = 0; i < numEntries; i++) {
			const offset = 1 + i * 2;
			this.payload[offset] = this.targetValues[i].parameter;
			this.payload[offset + 1] = this.targetValues[i].value;
		}

		this.payload[this.payload.length - 1] = (
			this.duration ?? Duration.default()
		).serializeSet();

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const { parameter, value } of this.targetValues) {
			message[getEnumMemberName(WindowCoveringParameter, parameter)] =
				value;
		}
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface WindowCoveringCCStartLevelChangeOptions {
	parameter: WindowCoveringParameter;
	direction: keyof typeof LevelChangeDirection;
	duration?: Duration | string;
}

@CCCommand(WindowCoveringCommand.StartLevelChange)
@useSupervision()
export class WindowCoveringCCStartLevelChange extends WindowCoveringCC {
	public constructor(
		options: WindowCoveringCCStartLevelChangeOptions & CCCommandOptions,
	) {
		super(options);
		this.parameter = options.parameter;
		this.direction = options.direction;
		this.duration = Duration.from(options.duration);
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): WindowCoveringCCStartLevelChange {
		validatePayload(payload.length >= 2);
		const direction = !!(payload[0] & 0b0100_0000)
			? "down"
			: "up";
		const parameter: WindowCoveringParameter = payload[1];
		let duration: Duration | undefined;

		if (payload.length >= 3) {
			duration = Duration.parseSet(payload[2]);
		}

		return new WindowCoveringCCStartLevelChange({
			nodeId: options.context.sourceNodeId,
			direction,
			parameter,
			duration,
		});
	}

	public parameter: WindowCoveringParameter;
	public direction: keyof typeof LevelChangeDirection;
	public duration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.direction === "down" ? 0b0100_0000 : 0b0000_0000,
			this.parameter,
			(this.duration ?? Duration.default()).serializeSet(),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			parameter: getEnumMemberName(
				WindowCoveringParameter,
				this.parameter,
			),
			direction: this.direction,
		};
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface WindowCoveringCCStopLevelChangeOptions {
	parameter: WindowCoveringParameter;
}

@CCCommand(WindowCoveringCommand.StopLevelChange)
@useSupervision()
export class WindowCoveringCCStopLevelChange extends WindowCoveringCC {
	public constructor(
		options: WindowCoveringCCStopLevelChangeOptions & CCCommandOptions,
	) {
		super(options);
		this.parameter = options.parameter;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): WindowCoveringCCStopLevelChange {
		validatePayload(payload.length >= 1);
		const parameter: WindowCoveringParameter = payload[0];

		return new WindowCoveringCCStopLevelChange({
			nodeId: options.context.sourceNodeId,
			parameter,
		});
	}

	public parameter: WindowCoveringParameter;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				parameter: getEnumMemberName(
					WindowCoveringParameter,
					this.parameter,
				),
			},
		};
	}
}
