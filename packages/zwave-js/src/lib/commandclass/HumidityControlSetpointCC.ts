import type { ConfigManager, Scale } from "@zwave-js/config";
import type { ValueID, ValueMetadataNumeric } from "@zwave-js/core";
import {
	CommandClasses,
	encodeFloatWithScale,
	Maybe,
	MessageOrCCLogEntry,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	HumidityControlSetpointCapabilities,
	HumidityControlSetpointCommand,
	HumidityControlSetpointType,
	HumidityControlSetpointValue,
} from "./_Types";

const humidityControlSetpointScaleName = "humidity";
function getScale(configManager: ConfigManager, scale: number): Scale {
	return configManager.lookupNamedScale(
		humidityControlSetpointScaleName,
		scale,
	);
}
function getSetpointUnit(configManager: ConfigManager, scale: number): string {
	return getScale(configManager, scale).unit ?? "";
}

function getSupportedSetpointTypesValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "supportedSetpointTypes",
		endpoint,
	};
}

function getSetpointValueID(endpoint: number, setpointType: number): ValueID {
	return {
		commandClass: CommandClasses["Humidity Control Setpoint"],
		endpoint,
		property: "setpoint",
		propertyKey: setpointType,
	};
}

function getSetpointScaleValueID(
	endpoint: number,
	setpointType: number,
): ValueID {
	return {
		commandClass: CommandClasses["Humidity Control Setpoint"],
		endpoint,
		property: "setpointScale",
		propertyKey: setpointType,
	};
}

@API(CommandClasses["Humidity Control Setpoint"])
export class HumidityControlSetpointCCAPI extends CCAPI {
	public supportsCommand(
		cmd: HumidityControlSetpointCommand,
	): Maybe<boolean> {
		switch (cmd) {
			case HumidityControlSetpointCommand.Get:
			case HumidityControlSetpointCommand.SupportedGet:
			case HumidityControlSetpointCommand.CapabilitiesGet:
				return this.isSinglecast();
			case HumidityControlSetpointCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		if (property !== "setpoint") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof propertyKey !== "number") {
			throw new ZWaveError(
				`${
					CommandClasses[this.ccId]
				}: "${property}" must be further specified by a numeric property key`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}

		const preferredScale = this.endpoint
			.getNodeUnsafe()!
			.getValue<number>(
				getSetpointScaleValueID(this.endpoint.index, propertyKey),
			);
		await this.set(propertyKey, value, preferredScale ?? 0);

		if (this.isSinglecast()) {
			// Verify the current value after a delay
			this.schedulePoll({ property, propertyKey }, value);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
		switch (property) {
			case "setpoint":
				if (typeof propertyKey !== "number") {
					throw new ZWaveError(
						`${
							CommandClasses[this.ccId]
						}: "${property}" must be further specified by a numeric property key`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}

				return (await this.get(propertyKey))?.value;
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	@validateArgs()
	public async get(
		setpointType: HumidityControlSetpointType,
	): Promise<HumidityControlSetpointValue | undefined> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.Get,
		);

		const cc = new HumidityControlSetpointCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.driver.sendCommand<HumidityControlSetpointCCReport>(
				cc,
				this.commandOptions,
			);
		if (!response) return;
		return response.type === HumidityControlSetpointType["N/A"]
			? // not supported
			  undefined
			: // supported
			  {
					value: response.value,
					scale: response.scale.key,
			  };
	}

	@validateArgs()
	public async set(
		setpointType: HumidityControlSetpointType,
		value: number,
		scale: number,
	): Promise<void> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.Set,
		);

		const cc = new HumidityControlSetpointCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
			value,
			scale,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getCapabilities(
		setpointType: HumidityControlSetpointType,
	): Promise<HumidityControlSetpointCapabilities | undefined> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.CapabilitiesGet,
		);

		const cc = new HumidityControlSetpointCCCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.driver.sendCommand<HumidityControlSetpointCCCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"minValue",
				"maxValue",
				"minValueScale",
				"maxValueScale",
			]);
		}
	}

	public async getSupportedSetpointTypes(): Promise<
		readonly HumidityControlSetpointType[] | undefined
	> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.SupportedGet,
		);

		const cc = new HumidityControlSetpointCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<HumidityControlSetpointCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedSetpointTypes;
	}

	@validateArgs()
	public async getSupportedScales(
		setpointType: HumidityControlSetpointType,
	): Promise<readonly Scale[] | undefined> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.SupportedGet,
		);

		const cc = new HumidityControlSetpointCCScaleSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.driver.sendCommand<HumidityControlSetpointCCScaleSupportedReport>(
				cc,
				this.commandOptions,
			);

		return response?.supportedScales;
	}
}

@commandClass(CommandClasses["Humidity Control Setpoint"])
@implementedVersion(2)
export class HumidityControlSetpointCC extends CommandClass {
	declare ccCommand: HumidityControlSetpointCommand;

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				HumidityControlSetpointType,
				propertyKey as any,
			);
		} else {
			return super.translatePropertyKey(property, propertyKey);
		}
	}

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses[
			"Humidity Control Setpoint"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Query the supported setpoint types
		let setpointTypes: HumidityControlSetpointType[] = [];
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "retrieving supported setpoint types...",
			direction: "outbound",
		});
		const resp = await api.getSupportedSetpointTypes();
		if (resp) {
			setpointTypes = [...resp];
			const logMessage =
				"received supported setpoint types:\n" +
				setpointTypes
					.map((type) =>
						getEnumMemberName(HumidityControlSetpointType, type),
					)
					.map((name) => `· ${name}`)
					.join("\n");

			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported setpoint types timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				HumidityControlSetpointType,
				type,
			);
			// Find out the capabilities of this setpoint
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `retrieving capabilities for setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpointScaleSupported = await api.getSupportedScales(type);
			if (setpointScaleSupported) {
				const logMessage = `received supported scales for setpoint ${setpointName}: 
${setpointScaleSupported
	.map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
	.join("")}`;
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
				const scaleValueId = getSetpointScaleValueID(
					this.endpointIndex,
					type,
				);
				const states: Record<number, string> = {};
				for (const scale of setpointScaleSupported) {
					if (scale.unit) states[scale.key] = scale.unit;
				}
				this.getValueDB().setMetadata(scaleValueId, {
					...ValueMetadata.ReadOnlyUInt8,
					states: states,
				});
			}
			const setpointCaps = await api.getCapabilities(type);
			if (setpointCaps) {
				const minValueUnit = getSetpointUnit(
					this.host.configManager,
					setpointCaps.minValueScale,
				);
				const maxValueUnit = getSetpointUnit(
					this.host.configManager,
					setpointCaps.maxValueScale,
				);
				const logMessage = `received capabilities for setpoint ${setpointName}:
minimum value: ${setpointCaps.minValue} ${minValueUnit}
maximum value: ${setpointCaps.maxValue} ${maxValueUnit}`;
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Query the current value for all setpoint types
		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses[
			"Humidity Control Setpoint"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const setpointTypes: HumidityControlSetpointType[] =
			this.getValueDB().getValue(
				getSupportedSetpointTypesValueID(this.endpointIndex),
			) ?? [];

		// Query each setpoint's current value
		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				HumidityControlSetpointType,
				type,
			);
			// Every time, query the current value
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying current value of setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpoint = await api.get(type);
			if (setpoint) {
				const logMessage = `received current value of setpoint ${setpointName}: ${
					setpoint.value
				} ${
					getScale(this.host.configManager, setpoint.scale).unit ?? ""
				}`;
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

interface HumidityControlSetpointCCSetOptions extends CCCommandOptions {
	setpointType: HumidityControlSetpointType;
	value: number;
	scale: number;
}

@CCCommand(HumidityControlSetpointCommand.Set)
export class HumidityControlSetpointCCSet extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
			this.value = options.value;
			this.scale = options.scale;
		}
	}

	public setpointType: HumidityControlSetpointType;
	public value: number;
	public scale: number;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const scale = getScale(this.host.configManager, this.scale);
		return {
			...super.toLogEntry(),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.Report)
export class HumidityControlSetpointCCReport extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0] & 0b1111;
		// Setpoint type 0 is not defined in the spec, prevent devices from using it.
		if (this._type === 0) {
			// Not supported
			this._value = 0;
			this._scale = getScale(this.host.configManager, 0);
			return;
		}

		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(this.payload.slice(1));
		this._value = value;
		this._scale = getScale(this.host.configManager, scale);

		this.persistValues();
	}

	public persistValues(): boolean {
		const valueDB = this.getValueDB();
		const setpointValueId = getSetpointValueID(
			this.endpointIndex,
			this._type,
		);
		// Update the metadata when it is missing or the unit has changed
		if (
			(
				valueDB.getMetadata(setpointValueId) as
					| ValueMetadataNumeric
					| undefined
			)?.unit !== this._scale.unit
		) {
			valueDB.setMetadata(setpointValueId, {
				...ValueMetadata.Number,
				unit: this._scale.unit,
				ccSpecific: {
					setpointType: this._type,
				},
			});
		}
		valueDB.setValue(setpointValueId, this._value);

		// Remember the device-preferred setpoint scale so it can be used in SET commands
		const scaleValueId = getSetpointScaleValueID(
			this.endpointIndex,
			this._type,
		);
		valueDB.setValue(scaleValueId, this._scale.key);
		return true;
	}

	private _type: HumidityControlSetpointType;
	public get type(): HumidityControlSetpointType {
		return this._type;
	}

	private _scale: Scale;
	public get scale(): Scale {
		return this._scale;
	}

	private _value: number;
	public get value(): number {
		return this._value;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.type,
				),
				value: `${this.value} ${this.scale.unit}`,
			},
		};
	}
}

function testResponseForHumidityControlSetpointGet(
	sent: HumidityControlSetpointCCGet,
	received: HumidityControlSetpointCCReport,
) {
	// We expect a Humidity Control Setpoint Report that matches the requested setpoint type
	return received.type === sent.setpointType;
}

interface HumidityControlSetpointCCGetOptions extends CCCommandOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.Get)
@expectedCCResponse(
	HumidityControlSetpointCCReport,
	testResponseForHumidityControlSetpointGet,
)
export class HumidityControlSetpointCCGet extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.SupportedReport)
export class HumidityControlSetpointCCSupportedReport extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._supportedSetpointTypes = parseBitMask(
			this.payload,
			HumidityControlSetpointType["N/A"],
		);

		this.persistValues();
	}

	private _supportedSetpointTypes: HumidityControlSetpointType[];
	@ccValue({ internal: true })
	public get supportedSetpointTypes(): readonly HumidityControlSetpointType[] {
		return this._supportedSetpointTypes;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported setpoint types": this.supportedSetpointTypes
					.map(
						(t) =>
							`\n· ${getEnumMemberName(
								HumidityControlSetpointType,
								t,
							)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.SupportedGet)
@expectedCCResponse(HumidityControlSetpointCCSupportedReport)
export class HumidityControlSetpointCCSupportedGet extends HumidityControlSetpointCC {}

@CCCommand(HumidityControlSetpointCommand.ScaleSupportedReport)
export class HumidityControlSetpointCCScaleSupportedReport extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);

		const supportedScaleIndices = parseBitMask(
			Buffer.from([this.payload[0] & 0b1111]),
			0,
		);
		this._supportedScales = supportedScaleIndices.map((scale) =>
			getScale(this.host.configManager, scale),
		);

		this.persistValues();
	}

	private _supportedScales: Scale[];
	public get supportedScales(): Scale[] {
		return this._supportedScales;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"scale supported": this.supportedScales
					.map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
					.join(""),
			},
		};
	}
}

interface HumidityControlSetpointCCScaleSupportedGetOptions
	extends CCCommandOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.ScaleSupportedGet)
@expectedCCResponse(HumidityControlSetpointCCScaleSupportedReport)
export class HumidityControlSetpointCCScaleSupportedGet extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCScaleSupportedGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.CapabilitiesReport)
export class HumidityControlSetpointCCCapabilitiesReport extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0] & 0b1111;
		let bytesRead: number;
		// parseFloatWithScale does its own validation
		({
			value: this._minValue,
			scale: this._minValueScale,
			bytesRead,
		} = parseFloatWithScale(this.payload.slice(1)));
		({ value: this._maxValue, scale: this._maxValueScale } =
			parseFloatWithScale(this.payload.slice(1 + bytesRead)));

		// Predefine the metadata
		const valueId = getSetpointValueID(this.endpointIndex, this.type);
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.Number,
			min: this._minValue,
			max: this._maxValue,
			unit:
				getSetpointUnit(this.host.configManager, this._minValueScale) ||
				getSetpointUnit(this.host.configManager, this._maxValueScale),
			ccSpecific: {
				setpointType: this._type,
			},
		});

		this.persistValues();
	}

	private _type: HumidityControlSetpointType;
	public get type(): HumidityControlSetpointType {
		return this._type;
	}

	private _minValue: number;
	public get minValue(): number {
		return this._minValue;
	}

	private _maxValue: number;
	public get maxValue(): number {
		return this._maxValue;
	}

	private _minValueScale: number;
	public get minValueScale(): number {
		return this._minValueScale;
	}

	private _maxValueScale: number;
	public get maxValueScale(): number {
		return this._maxValueScale;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const minValueScale = getScale(
			this.host.configManager,
			this.minValueScale,
		);
		const maxValueScale = getScale(
			this.host.configManager,
			this.maxValueScale,
		);
		return {
			...super.toLogEntry(),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.type,
				),
				"min value": `${this.minValue} ${minValueScale.unit}`,
				"max value": `${this.maxValue} ${maxValueScale.unit}`,
			},
		};
	}
}

interface HumidityControlSetpointCCCapabilitiesGetOptions
	extends CCCommandOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.CapabilitiesGet)
@expectedCCResponse(HumidityControlSetpointCCCapabilitiesReport)
export class HumidityControlSetpointCCCapabilitiesGet extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCCapabilitiesGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}
