import {
	CommandClasses,
	Duration,
	encodeBitMask,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	parseBitMask,
	SupervisionResult,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	CCCommandOptions,
	CommandClass,
	gotDeserializationOptions,
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
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	LevelChangeDirection,
	WindowCoveringCommand,
	WindowCoveringParameter,
} from "../lib/_Types";

function parameterToMetadataStates(
	parameter: WindowCoveringParameter,
	isTargetValue: boolean,
): Record<number, string> | undefined {
	switch (parameter) {
		case WindowCoveringParameter["Vertical Slats Angle (no position)"]:
			if (isTargetValue) return undefined;
			return {
				0: "Closing (right)",
				50: "Opening",
				99: "Closing (left)",
			};
		case WindowCoveringParameter["Vertical Slats Angle"]:
			return {
				0: "Closed (right)",
				50: "Open",
				99: "Closed (left)",
			};

		case WindowCoveringParameter["Horizontal Slats Angle (no position)"]:
			if (isTargetValue) return undefined;
			return {
				0: "Closing (up)",
				50: "Opening",
				99: "Closing (down)",
			};
		case WindowCoveringParameter["Horizontal Slats Angle"]:
			return {
				0: "Closed (up)",
				50: "Open",
				99: "Closed (down)",
			};
	}

	if (parameter % 2 === 1) {
		// Odd-numbered parameters have position support
		return {
			0: "Closed",
			99: "Open",
		};
	} else {
		if (isTargetValue) return undefined;
		return {
			0: "Closing",
			99: "Opening",
		};
	}
}

function isTiltParameter(parameter: WindowCoveringParameter): boolean {
	return (
		parameter === WindowCoveringParameter["Vertical Slats Angle"] ||
		parameter ===
			WindowCoveringParameter["Vertical Slats Angle (no position)"] ||
		parameter === WindowCoveringParameter["Horizontal Slats Angle"] ||
		parameter ===
			WindowCoveringParameter["Horizontal Slats Angle (no position)"]
	);
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
				const states = parameterToMetadataStates(parameter, false);
				return {
					...ValueMetadata.ReadOnlyLevel,
					label: `Current value - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					...(states ? { states } : {}),
					ccSpecific: {
						parameter,
					},
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
				const states = parameterToMetadataStates(parameter, false);
				return {
					...ValueMetadata.Level,
					label: `Target value - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					// Only odd-numbered parameters have position support and are writable
					writeable: parameter % 2 === 1,
					...(states ? { states } : {}),
					ccSpecific: {
						parameter,
					},
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
			(parameter: WindowCoveringParameter) =>
				({
					...ValueMetadata.ReadOnlyDuration,
					label: `Remaining duration - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					ccSpecific: {
						parameter,
					},
				} as const),
		),

		// Convenience values to control the different parameters
		// Open all parameters
		...V.dynamicPropertyAndKeyWithName(
			"open",
			"open",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "open" && typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) =>
				({
					...ValueMetadata.WriteOnlyBoolean,
					label: `Open - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					ccSpecific: {
						parameter,
					},
					valueChangeOptions: ["transitionDuration"],
				} as const),
		),

		// Close positional parameters
		...V.dynamicPropertyAndKeyWithName(
			"positionClose",
			"close",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "close" &&
				typeof propertyKey === "number" &&
				!isTiltParameter(propertyKey),
			(parameter: WindowCoveringParameter) =>
				({
					...ValueMetadata.WriteOnlyBoolean,
					label: `Close - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					ccSpecific: {
						parameter,
					},
					valueChangeOptions: ["transitionDuration"],
				} as const),
		),

		// Close vertical slats to the right, horizontal to the top
		...V.dynamicPropertyAndKeyWithName(
			"tiltClose0",
			"close0",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "close0" &&
				typeof propertyKey === "number" &&
				isTiltParameter(propertyKey),
			(parameter: WindowCoveringParameter) => {
				const direction =
					parameter ===
						WindowCoveringParameter["Vertical Slats Angle"] ||
					parameter ===
						WindowCoveringParameter[
							"Vertical Slats Angle (no position)"
						]
						? "Right"
						: "Up";
				return {
					...ValueMetadata.WriteOnlyBoolean,
					label: `Close ${direction} - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					ccSpecific: {
						parameter,
					},
					valueChangeOptions: ["transitionDuration"],
				} as const;
			},
		),
		// Close vertical slats to the left, horizontal to the bottom
		...V.dynamicPropertyAndKeyWithName(
			"tiltClose99",
			"close99",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "close99" &&
				typeof propertyKey === "number" &&
				isTiltParameter(propertyKey),
			(parameter: WindowCoveringParameter) => {
				const direction =
					parameter ===
						WindowCoveringParameter["Vertical Slats Angle"] ||
					parameter ===
						WindowCoveringParameter[
							"Vertical Slats Angle (no position)"
						]
						? "Left"
						: "Down";
				return {
					...ValueMetadata.WriteOnlyBoolean,
					label: `Close ${direction} - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					ccSpecific: {
						parameter,
					},
					valueChangeOptions: ["transitionDuration"],
				} as const;
			},
		),
	}),
});

@API(CommandClasses["Window Covering"])
export class WindowCoveringCCAPI extends CCAPI {
	public supportsCommand(cmd: WindowCoveringCommand): Maybe<boolean> {
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

	protected [SET_VALUE]: SetValueImplementation = async (
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
			if (
				typeof propertyKey !== "number" ||
				// Only odd-numbered parameters have position support and are writable
				propertyKey % 2 === 0
			) {
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey!);
			}

			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			const duration = Duration.from(options?.transitionDuration);
			const result = await this.set(
				[{ parameter: propertyKey, value }],
				duration,
			);

			return result;
		} else if (
			// Opening a positional parameter is the same as closing a tilt parameter to one side (99)
			(WindowCoveringCCValues.open.is(valueId) &&
				!isTiltParameter(propertyKey as number)) ||
			WindowCoveringCCValues.tiltClose99.is(valueId)
		) {
			if (!value) {
				throwWrongValueType(this.ccId, property, "true", typeof value);
			}

			// Opening a tilt parameter means setting it to 50
			const duration = Duration.from(options?.transitionDuration);
			const parameter = propertyKey as number;
			const result = await this.set([{ parameter, value: 99 }], duration);

			return result;
		} else if (
			// Opening a tilt parameter means setting it to 50
			WindowCoveringCCValues.open.is(valueId) &&
			isTiltParameter(propertyKey as number)
		) {
			if (!value) {
				throwWrongValueType(this.ccId, property, "true", typeof value);
			}

			const duration = Duration.from(options?.transitionDuration);
			const result = await this.set(
				[{ parameter: propertyKey as number, value: 50 }],
				duration,
			);

			return result;
		} else if (
			WindowCoveringCCValues.positionClose.is(valueId) ||
			WindowCoveringCCValues.tiltClose0.is(valueId)
		) {
			if (!value) {
				throwWrongValueType(this.ccId, property, "true", typeof value);
			}

			// Closing a positional parameter is the same as closing a tilt parameter to the other side
			const duration = Duration.from(options?.transitionDuration);
			const result = await this.set(
				[{ parameter: propertyKey as number, value: 0 }],
				duration,
			);

			return result;
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
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

	public async getSupported(): Promise<
		readonly WindowCoveringParameter[] | undefined
	> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.SupportedGet,
		);

		const cc = new WindowCoveringCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<WindowCoveringCCSupportedReport>(
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
		const response =
			await this.applHost.sendCommand<WindowCoveringCCReport>(
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

		return this.applHost.sendCommand(cc);
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

		return this.applHost.sendCommand(cc);
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

		return this.applHost.sendCommand(cc);
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
${supported
	.map((p) => `· ${getEnumMemberName(WindowCoveringParameter, p)}`)
	.join("\n")}`;
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

				// Convenience values
				this.setMetadata(applHost, WindowCoveringCCValues.open(param));
				if (isTiltParameter(param)) {
					this.setMetadata(
						applHost,
						WindowCoveringCCValues.tiltClose0(param),
					);
					this.setMetadata(
						applHost,
						WindowCoveringCCValues.tiltClose99(param),
					);
				} else {
					this.setMetadata(
						applHost,
						WindowCoveringCCValues.positionClose(param),
					);
				}

				// And for the odd parameters (with position support), query the position
				if (param % 2 === 1) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying position for parameter ${getEnumMemberName(
							WindowCoveringParameter,
							param,
						)}...`,
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

export interface WindowCoveringCCSupportedReportOptions
	extends CCCommandOptions {
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
			const bitmask = this.payload.slice(1, 1 + numBitmaskBytes);

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
		).slice(0, 15);
		const numBitmaskBytes = bitmask.length & 0b1111;

		this.payload = Buffer.concat([
			Buffer.from([numBitmaskBytes]),
			bitmask.slice(0, numBitmaskBytes),
		]);

		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"supported parameters": this.supportedParameters
					.map(
						(p) =>
							`\n· ${getEnumMemberName(
								WindowCoveringParameter,
								p,
							)}`,
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
		this.duration =
			Duration.parseReport(this.payload[3]) ?? Duration.unknown();
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

interface WindowCoveringCCGetOptions extends CCCommandOptions {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				parameter: getEnumMemberName(
					WindowCoveringParameter,
					this.parameter,
				),
			},
		};
	}
}

export interface WindowCoveringCCSetOptions extends CCCommandOptions {
	targetValues: {
		parameter: WindowCoveringParameter;
		value: number;
	}[];
	duration?: Duration | string;
}

@CCCommand(WindowCoveringCommand.Set)
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		for (const { parameter, value } of this.targetValues) {
			message[getEnumMemberName(WindowCoveringParameter, parameter)] =
				value;
		}
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

export interface WindowCoveringCCStartLevelChangeOptions
	extends CCCommandOptions {
	parameter: WindowCoveringParameter;
	direction: keyof typeof LevelChangeDirection;
	duration?: Duration | string;
}

@CCCommand(WindowCoveringCommand.StartLevelChange)
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
			message,
		};
	}
}

interface WindowCoveringCCStopLevelChangeOptions extends CCCommandOptions {
	parameter: WindowCoveringParameter;
}

@CCCommand(WindowCoveringCommand.StopLevelChange)
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				parameter: getEnumMemberName(
					WindowCoveringParameter,
					this.parameter,
				),
			},
		};
	}
}
