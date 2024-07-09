import {
	CommandClasses,
	Duration,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host";
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
								this.applHost
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

		const cc = new WindowCoveringCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new WindowCoveringCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new WindowCoveringCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			targetValues,
			duration,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new WindowCoveringCCStartLevelChange(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
			direction,
			duration,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async stopLevelChange(
		parameter: WindowCoveringParameter,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.StopLevelChange,
		);

		const cc = new WindowCoveringCCStopLevelChange(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			parameter,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Window Covering"])
@implementedVersion(1)
@ccValues(WindowCoveringCCValues)
export class WindowCoveringCC extends CommandClass {
	declare ccCommand: WindowCoveringCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Window Covering"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			// Create metadata for all supported parameters
			for (const param of supported) {
				// Default values
				this.setMetadata(
					applHost,
					WindowCoveringCCValues.currentValue(param),
				);
				this.setMetadata(
					applHost,
					WindowCoveringCCValues.targetValue(param),
				);
				this.setMetadata(
					applHost,
					WindowCoveringCCValues.duration(param),
				);

				// Level change values
				this.setMetadata(
					applHost,
					WindowCoveringCCValues.levelChangeUp(param),
				);
				this.setMetadata(
					applHost,
					WindowCoveringCCValues.levelChangeDown(param),
				);

				// And for the odd parameters (with position support), query the position
				if (param % 2 === 1) {
					applHost.controllerLog.logNode(node.id, {
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
		this.setInterviewComplete(applHost, true);
	}

	public translatePropertyKey(
		_applHost: ZWaveApplicationHost,
		_property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (typeof propertyKey === "number") {
			return getEnumMemberName(WindowCoveringParameter, propertyKey);
		}
		return super.translatePropertyKey(_applHost, _property, propertyKey);
	}
}

// @publicAPI
export interface WindowCoveringCCSupportedReportOptions
	extends CCCommandOptions
{
	supportedParameters: readonly WindowCoveringParameter[];
}

@CCCommand(WindowCoveringCommand.SupportedReport)
export class WindowCoveringCCSupportedReport extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| WindowCoveringCCSupportedReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);

			const numBitmaskBytes = this.payload[0] & 0b1111;
			validatePayload(this.payload.length >= 1 + numBitmaskBytes);
			const bitmask = this.payload.subarray(1, 1 + numBitmaskBytes);

			this.supportedParameters = parseBitMask(
				bitmask,
				WindowCoveringParameter["Outbound Left (no position)"],
			);
		} else {
			this.supportedParameters = options.supportedParameters;
		}
	}

	@ccValue(WindowCoveringCCValues.supportedParameters)
	public readonly supportedParameters: readonly WindowCoveringParameter[];

	public serialize(): Buffer {
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

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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

@CCCommand(WindowCoveringCommand.Report)
export class WindowCoveringCCReport extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		this.parameter = this.payload[0];
		this.currentValue = this.payload[1];
		this.targetValue = this.payload[2];
		this.duration = Duration.parseReport(this.payload[3])
			?? Duration.unknown();
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface WindowCoveringCCGetOptions extends CCCommandOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| WindowCoveringCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.parameter = this.payload[0];
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: WindowCoveringParameter;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface WindowCoveringCCSetOptions extends CCCommandOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| WindowCoveringCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.targetValues = options.targetValues;
			this.duration = Duration.from(options.duration);
		}
	}

	public targetValues: {
		parameter: WindowCoveringParameter;
		value: number;
	}[];
	public duration: Duration | undefined;

	public serialize(): Buffer {
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

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const { parameter, value } of this.targetValues) {
			message[getEnumMemberName(WindowCoveringParameter, parameter)] =
				value;
		}
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface WindowCoveringCCStartLevelChangeOptions
	extends CCCommandOptions
{
	parameter: WindowCoveringParameter;
	direction: keyof typeof LevelChangeDirection;
	duration?: Duration | string;
}

@CCCommand(WindowCoveringCommand.StartLevelChange)
@useSupervision()
export class WindowCoveringCCStartLevelChange extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| WindowCoveringCCStartLevelChangeOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.parameter = options.parameter;
			this.direction = options.direction;
			this.duration = Duration.from(options.duration);
		}
	}

	public parameter: WindowCoveringParameter;
	public direction: keyof typeof LevelChangeDirection;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.direction === "up" ? 0b0100_0000 : 0b0000_0000,
			this.parameter,
			(this.duration ?? Duration.default()).serializeSet(),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface WindowCoveringCCStopLevelChangeOptions
	extends CCCommandOptions
{
	parameter: WindowCoveringParameter;
}

@CCCommand(WindowCoveringCommand.StopLevelChange)
@useSupervision()
export class WindowCoveringCCStopLevelChange extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| WindowCoveringCCStopLevelChangeOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: WindowCoveringParameter;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				parameter: getEnumMemberName(
					WindowCoveringParameter,
					this.parameter,
				),
			},
		};
	}
}
