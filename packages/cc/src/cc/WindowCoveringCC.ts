import {
	CommandClasses,
	Duration,
	Maybe,
	MessagePriority,
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
			(parameter: WindowCoveringParameter) => ({
				...ValueMetadata.ReadOnlyLevel,
				label: `Current value - ${getEnumMemberName(
					WindowCoveringParameter,
					parameter,
				)}`,
				ccSpecific: {
					parameter,
				},
			}),
		),

		...V.dynamicPropertyAndKeyWithName(
			"targetValue",
			"targetValue",
			(parameter: WindowCoveringParameter) => parameter,
			({ property, propertyKey }) =>
				property === "targetValue" && typeof propertyKey === "number",
			(parameter: WindowCoveringParameter) =>
				({
					...ValueMetadata.Level,
					label: `Target value - ${getEnumMemberName(
						WindowCoveringParameter,
						parameter,
					)}`,
					// Only odd-numbered parameters have position support and are writable
					writeable: parameter % 2 === 1,
					ccSpecific: {
						parameter,
					},
					valueChangeOptions: ["transitionDuration"],
				} as const),
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
		if (property !== "targetValue") {
			throwUnsupportedProperty(this.ccId, property);
		}

		if (propertyKey == undefined) {
			throwMissingPropertyKey(this.ccId, property);
		} else if (
			typeof propertyKey !== "number" ||
			// Only odd-numbered parameters have position support and are writable
			propertyKey % 2 === 0
		) {
			throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}

		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}

		const duration = Duration.from(options?.transitionDuration);
		const result = await this.set({ [propertyKey]: value }, duration);

		return result;
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
		parameters: Partial<Record<WindowCoveringParameter, number>>,
		duration?: Duration | string,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			WindowCoveringCommand,
			WindowCoveringCommand.StartLevelChange,
		);

		const cc = new WindowCoveringCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...parameters,
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

				// And for the odd parameters (with position support),
				// query the position
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
}

@CCCommand(WindowCoveringCommand.SupportedReport)
export class WindowCoveringCCSupportedReport extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);

		const numBitmaskBytes = this.payload[0] & 0b1111;
		validatePayload(this.payload.length >= 1 + numBitmaskBytes);
		const bitmask = this.payload.slice(1, 1 + numBitmaskBytes);

		this.supportedParameters = parseBitMask(
			bitmask,
			WindowCoveringParameter["Outbound Left (no position)"],
		);
	}

	@ccValue(WindowCoveringCCValues.supportedParameters)
	public readonly supportedParameters: readonly WindowCoveringParameter[];
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
}

export type WindowCoveringCCSetOptions = Partial<
	Record<WindowCoveringParameter, number>
> & {
	duration?: Duration | string;
};

@CCCommand(WindowCoveringCommand.Set)
@expectedCCResponse(WindowCoveringCCReport)
export class WindowCoveringCCSet extends WindowCoveringCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & WindowCoveringCCSetOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			const parameters: Partial<Record<WindowCoveringParameter, number>> =
				{};
			for (const [key, value] of Object.entries(options)) {
				if (
					key in WindowCoveringParameter &&
					!Number.isNaN(Number(value))
				) {
					(parameters as any)[key] = value;
				}
			}
			this.parameters = parameters;
			this.duration = Duration.from(options.duration);
		}
	}

	public parameters: Partial<Record<WindowCoveringParameter, number>>;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		const parameterEntries = Object.entries(this.parameters).map(
			([key, value]) => ({
				key: +key,
				value,
			}),
		);
		const numEntries = parameterEntries.length & 0b11111;
		this.payload = Buffer.allocUnsafe(2 + numEntries * 2);

		this.payload[0] = numEntries;
		for (let i = 0; i < numEntries; i++) {
			const offset = 1 + i * 2;
			this.payload[offset] = parameterEntries[i].key;
			this.payload[offset + 1] = parameterEntries[i].value;
		}

		this.payload[this.payload.length - 1] = (
			this.duration ?? Duration.default()
		).serializeSet();

		return super.serialize();
	}
}

export interface WindowCoveringCCStartLevelChangeOptions
	extends CCCommandOptions {
	parameter: WindowCoveringParameter;
	direction: keyof typeof LevelChangeDirection;
	duration?: Duration | string;
}

@CCCommand(WindowCoveringCommand.StartLevelChange)
@expectedCCResponse(WindowCoveringCCReport)
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
}

interface WindowCoveringCCStopLevelChangeOptions extends CCCommandOptions {
	parameter: WindowCoveringParameter;
}

@CCCommand(WindowCoveringCommand.StopLevelChange)
@expectedCCResponse(WindowCoveringCCReport)
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
}
