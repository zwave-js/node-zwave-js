import type { ConfigManager, Scale } from "@zwave-js/config";
import type {
	MessageOrCCLogEntry,
	ValueID,
	ValueMetadataNumeric,
} from "@zwave-js/core";
import {
	CommandClasses,
	encodeFloatWithScale,
	Maybe,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
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
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { ThermostatSetpointCommand, ThermostatSetpointType } from "./_Types";

// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
// prettier-ignore
const thermostatSetpointTypeMap = [0x00, 0x01, 0x02, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f];

const thermostatSetpointScaleName = "temperature";
function getScale(configManager: ConfigManager, scale: number): Scale {
	return configManager.lookupNamedScale(thermostatSetpointScaleName, scale);
}
function getSetpointUnit(configManager: ConfigManager, scale: number): string {
	return getScale(configManager, scale).unit ?? "";
}

function getSupportedSetpointTypesValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Setpoint"],
		property: "supportedSetpointTypes",
		endpoint,
	};
}

function getSetpointTypesInterpretationValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Setpoint"],
		property: "setpointTypesInterpretation",
		endpoint,
	};
}

function getSetpointValueID(endpoint: number, setpointType: number): ValueID {
	return {
		commandClass: CommandClasses["Thermostat Setpoint"],
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
		commandClass: CommandClasses["Thermostat Setpoint"],
		endpoint,
		property: "setpointScale",
		propertyKey: setpointType,
	};
}

@API(CommandClasses["Thermostat Setpoint"])
export class ThermostatSetpointCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatSetpointCommand): Maybe<boolean> {
		switch (cmd) {
			case ThermostatSetpointCommand.Get:
			case ThermostatSetpointCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatSetpointCommand.Set:
				return true; // This is mandatory
			case ThermostatSetpointCommand.CapabilitiesGet:
				return this.version >= 3 && this.isSinglecast();
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

		// SDS14223: The Scale field value MUST be identical to the value received in the Thermostat Setpoint Report for the
		// actual Setpoint Type during the node interview. Fall back to the first scale if none is known
		const preferredScale = this.endpoint
			.getNodeUnsafe()!
			.getValue<number>(
				getSetpointScaleValueID(this.endpoint.index, propertyKey),
			);
		await this.set(propertyKey, value, preferredScale ?? 0);

		if (this.isSinglecast()) {
			// Verify the current value after a delay
			// TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
			// aren't able to handle the GET this quickly.
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
		setpointType: ThermostatSetpointType,
	): Promise<{ value: number; scale: Scale } | undefined> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Get,
		);

		const cc = new ThermostatSetpointCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.driver.sendCommand<ThermostatSetpointCCReport>(
				cc,
				this.commandOptions,
			);
		if (!response) return;
		if (response.type !== ThermostatSetpointType["N/A"]) {
			// This is a supported setpoint
			const scale = getScale(this.driver.configManager, response.scale);
			return {
				value: response.value,
				scale,
			};
		}
	}

	@validateArgs()
	public async set(
		setpointType: ThermostatSetpointType,
		value: number,
		scale: number,
	): Promise<void> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Set,
		);

		const cc = new ThermostatSetpointCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
			value,
			scale,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities(setpointType: ThermostatSetpointType) {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.CapabilitiesGet,
		);

		const cc = new ThermostatSetpointCCCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.driver.sendCommand<ThermostatSetpointCCCapabilitiesReport>(
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

	/**
	 * Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
	 * to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
	 * during node interview.
	 */
	public async getSupportedSetpointTypes(): Promise<
		readonly ThermostatSetpointType[] | undefined
	> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.SupportedGet,
		);

		const cc = new ThermostatSetpointCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ThermostatSetpointCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedSetpointTypes;
	}
}

@commandClass(CommandClasses["Thermostat Setpoint"])
@implementedVersion(3)
export class ThermostatSetpointCC extends CommandClass {
	declare ccCommand: ThermostatSetpointCommand;

	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		super(host, options);
		this.registerValue(getSetpointTypesInterpretationValueID(0).property, {
			internal: true,
		});
		// The setpoint scale is only used internally
		this.registerValue(getSetpointScaleValueID(0, 0).property, {
			internal: true,
		});
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				ThermostatSetpointType,
				propertyKey as any,
			);
		} else {
			return super.translatePropertyKey(applHost, property, propertyKey);
		}
	}

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Setpoint"].withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(driver);

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (this.version <= 2) {
			let setpointTypes: ThermostatSetpointType[];
			let interpretation: "A" | "B" | undefined;
			// Whether our tests changed the assumed bitmask interpretation
			let interpretationChanged = false;

			const supportedSetpointTypesValueId =
				getSupportedSetpointTypesValueID(this.endpointIndex);

			// Query the supported setpoint types
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving supported setpoint types...",
				direction: "outbound",
			});
			const resp = await api.getSupportedSetpointTypes();
			if (!resp) {
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported setpoint types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}
			setpointTypes = [...resp];
			interpretation = undefined; // we don't know yet which interpretation the device uses

			// If necessary, test which interpretation the device follows

			// Assume interpretation B
			// --> If setpoints 3,4,5 or 6 are supported, the assumption is wrong ==> A
			function switchToInterpretationA(): void {
				setpointTypes = setpointTypes.map(
					(i) => thermostatSetpointTypeMap[i],
				);
				interpretation = "A";
				interpretationChanged = true;
			}

			if ([3, 4, 5, 6].some((type) => setpointTypes.includes(type))) {
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "uses Thermostat Setpoint bitmap interpretation A",
					direction: "none",
				});
				switchToInterpretationA();
			} else {
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Thermostat Setpoint bitmap interpretation is unknown, assuming B for now",
					direction: "none",
				});
			}

			// Now scan all endpoints. Each type we received a value for gets marked as supported
			const supportedSetpointTypes: ThermostatSetpointType[] = [];
			for (let i = 0; i < setpointTypes.length; i++) {
				const type = setpointTypes[i];
				const setpointName = getEnumMemberName(
					ThermostatSetpointType,
					type,
				);
				// Every time, query the current value
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value of setpoint ${setpointName}...`,
					direction: "outbound",
				});

				const setpoint = await api.get(type);
				// If the node did not respond, assume the setpoint type is not supported

				let logMessage: string;
				if (setpoint) {
					// Setpoint supported, remember the type
					supportedSetpointTypes.push(type);
					logMessage = `received current value of setpoint ${setpointName}: ${
						setpoint.value
					} ${setpoint.scale.unit ?? ""}`;
				} else if (!interpretation) {
					// The setpoint type is not supported, switch to interpretation A
					driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `the setpoint type ${type} is unsupported, switching to interpretation A`,
						direction: "none",
					});
					switchToInterpretationA();
					// retry the current type and scan the remaining types as A
					i--;
					continue;
				} else {
					// We're sure about the interpretation - this should not happen
					logMessage = `Setpoint ${setpointName} is not supported`;
				}
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			// If we made an assumption and did not switch to interpretation A,
			// the device adheres to interpretation B
			if (!interpretation && !interpretationChanged) {
				// our assumption about interpretation B was correct
				interpretation = "B";
				interpretationChanged = true;
			}

			// Remember which setpoint types are actually supported, so we don't
			// need to do this guesswork again
			valueDB.setValue(
				supportedSetpointTypesValueId,
				supportedSetpointTypes,
			);

			// Also save the bitmap interpretation if we know it now
			if (interpretationChanged) {
				valueDB.setValue(
					getSetpointTypesInterpretationValueID(this.endpointIndex),
					interpretation,
				);
			}
		} else {
			// Versions >= 3 adhere to bitmap interpretation A, so we can rely on getSupportedSetpointTypes

			// Query the supported setpoint types
			let setpointTypes: ThermostatSetpointType[] = [];
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
							getEnumMemberName(ThermostatSetpointType, type),
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
					ThermostatSetpointType,
					type,
				);
				// Find out the capabilities of this setpoint
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `retrieving capabilities for setpoint ${setpointName}...`,
					direction: "outbound",
				});
				const setpointCaps = await api.getCapabilities(type);
				if (setpointCaps) {
					const minValueUnit = getSetpointUnit(
						driver.configManager,
						setpointCaps.minValueScale,
					);
					const maxValueUnit = getSetpointUnit(
						driver.configManager,
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
		}

		// Remember that the interview is complete
		this.setInterviewComplete(driver, true);
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Setpoint"].withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(driver);

		const setpointTypes: ThermostatSetpointType[] =
			valueDB.getValue(
				getSupportedSetpointTypesValueID(this.endpointIndex),
			) ?? [];

		// Query each setpoint's current value
		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				ThermostatSetpointType,
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
				} ${setpoint.scale.unit ?? ""}`;
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

interface ThermostatSetpointCCSetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
	value: number;
	scale: number;
}

@CCCommand(ThermostatSetpointCommand.Set)
export class ThermostatSetpointCCSet extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCSetOptions,
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

	public setpointType: ThermostatSetpointType;
	public value: number;
	public scale: number;

	public serialize(): Buffer {
		// If a config file overwrites how the float should be encoded, use that information
		const override = this.host.getCompatConfig?.(
			this.nodeId as number,
		)?.overrideFloatEncoding;
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
			encodeFloatWithScale(this.value, this.scale, override),
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const scale = getScale(applHost.configManager, this.scale);
		return {
			...super.toLogEntry(applHost),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

@CCCommand(ThermostatSetpointCommand.Report)
export class ThermostatSetpointCCReport extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0] & 0b1111;
		if (this._type === 0) {
			// Not supported
			this._value = 0;
			this.scale = 0;
			return;
		}

		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(this.payload.slice(1));
		this._value = value;
		this.scale = scale;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const scale = getScale(applHost.configManager, this.scale);

		const valueDB = this.getValueDB(applHost);
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
			)?.unit !== scale.unit
		) {
			valueDB.setMetadata(setpointValueId, {
				...ValueMetadata.Number,
				unit: scale.unit,
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
		valueDB.setValue(scaleValueId, scale.key);
		return true;
	}

	private _type: ThermostatSetpointType;
	public get type(): ThermostatSetpointType {
		return this._type;
	}

	public readonly scale: number;

	private _value: number;
	public get value(): number {
		return this._value;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const scale = getScale(applHost.configManager, this.scale);
		return {
			...super.toLogEntry(applHost),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.type,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

function testResponseForThermostatSetpointGet(
	sent: ThermostatSetpointCCGet,
	received: ThermostatSetpointCCReport,
) {
	// We expect a Thermostat Setpoint Report that matches the requested setpoint type
	return received.type === sent.setpointType;
}

interface ThermostatSetpointCCGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.Get)
@expectedCCResponse(
	ThermostatSetpointCCReport,
	testResponseForThermostatSetpointGet,
)
export class ThermostatSetpointCCGet extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCGetOptions,
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

	public setpointType: ThermostatSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesReport extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0];
		let bytesRead: number;
		// parseFloatWithScale does its own validation
		({
			value: this._minValue,
			scale: this._minValueScale,
			bytesRead,
		} = parseFloatWithScale(this.payload.slice(1)));
		({ value: this._maxValue, scale: this._maxValueScale } =
			parseFloatWithScale(this.payload.slice(1 + bytesRead)));
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Predefine the metadata
		const valueId = getSetpointValueID(this.endpointIndex, this._type);
		this.getValueDB(applHost).setMetadata(valueId, {
			...ValueMetadata.Number,
			min: this._minValue,
			max: this._maxValue,
			unit:
				getSetpointUnit(applHost.configManager, this._minValueScale) ||
				getSetpointUnit(applHost.configManager, this._maxValueScale),
			ccSpecific: {
				setpointType: this._type,
			},
		});

		return true;
	}

	private _type: ThermostatSetpointType;
	public get type(): ThermostatSetpointType {
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const minValueScale = getScale(
			applHost.configManager,
			this.minValueScale,
		);
		const maxValueScale = getScale(
			applHost.configManager,
			this.maxValueScale,
		);
		return {
			...super.toLogEntry(applHost),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this._type,
				),
				"min value": `${this.minValue} ${minValueScale.unit}`,
				"max value": `${this.maxValue} ${maxValueScale.unit}`,
			},
		};
	}
}

interface ThermostatSetpointCCCapabilitiesGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesGet)
@expectedCCResponse(ThermostatSetpointCCCapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCCapabilitiesGetOptions,
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

	public setpointType: ThermostatSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

@CCCommand(ThermostatSetpointCommand.SupportedReport)
export class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		const bitMask = this.payload;
		const supported = parseBitMask(bitMask, ThermostatSetpointType["N/A"]);
		if (this.version >= 3) {
			// Interpretation A
			this._supportedSetpointTypes = supported.map(
				(i) => thermostatSetpointTypeMap[i],
			);
		} else {
			// It is unknown which interpretation the device complies to.
			// This must be tested during the interview
			this._supportedSetpointTypes = supported;
		}
		// TODO:
		// Some devices skip the gaps in the ThermostatSetpointType (Interpretation A), some don't (Interpretation B)
		// Devices with V3+ must comply with Interpretation A
		// It is RECOMMENDED that a controlling node determines supported Setpoint Types
		// by sending one Thermostat Setpoint Get Command at a time while incrementing
		// the requested Setpoint Type. If the same Setpoint Type is advertised in the
		// resulting Thermostat Setpoint Report Command, the controlling node MAY conclude
		// that the actual Setpoint Type is supported. If the Setpoint Type 0x00 (type N/A)
		// is advertised in the resulting Thermostat Setpoint Report Command, the controlling
		// node MUST conclude that the actual Setpoint Type is not supported.
	}

	private _supportedSetpointTypes: ThermostatSetpointType[];
	@ccValue({ internal: true })
	public get supportedSetpointTypes(): readonly ThermostatSetpointType[] {
		return this._supportedSetpointTypes;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"supported setpoint types": this.supportedSetpointTypes
					.map(
						(t) =>
							`\n· ${getEnumMemberName(
								ThermostatSetpointType,
								t,
							)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(ThermostatSetpointCommand.SupportedGet)
@expectedCCResponse(ThermostatSetpointCCSupportedReport)
/**
 * Issues a SupportedGet command to the node. Due to inconsistencies in interpretation,
 * this command should not be used for nodes with CC versions 1 or 2
 */
export class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {}
