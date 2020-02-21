import { lookupNamedScale, Scale } from "../config/Scales";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import type { ValueID } from "../node/ValueDB";
import { getEnumMemberName, validatePayload } from "../util/misc";
import { ValueMetadata } from "../values/Metadata";
import { encodeFloatWithScale, Maybe, parseBitMask, parseFloatWithScale } from "../values/Primitive";
import { CCAPI, SetValueImplementation, SET_VALUE, throwUnsupportedProperty, throwWrongValueType } from "./API";
import { API, CCCommand, CCCommandOptions, CCResponsePredicate, ccValue, CommandClass, commandClass, CommandClassDeserializationOptions, CommandClassOptions, expectedCCResponse, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ThermostatSetpointCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	CapabilitiesGet = 0x09,
	CapabilitiesReport = 0x0a,
}

// TODO: Can we merge this with ThermostatMode?
export enum ThermostatSetpointType {
	"N/A" = 0x00,
	"Heating" = 0x01, // CC v1
	"Cooling" = 0x02, // CC v1
	"Furnace" = 0x07, // CC v1
	"Dry Air" = 0x08, // CC v1
	"Moist Air" = 0x09, // CC v1
	"Auto Changeover" = 0x0a, // CC v1
	"Energy Save Heating" = 0x0b, // CC v2
	"Energy Save Cooling" = 0x0c, // CC v2
	"Away Heating" = 0x0d, // CC v2
	"Away Cooling" = 0x0e, // CC v3
	"Full Power" = 0x0f, // CC v3
}
// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
// prettier-ignore
const thermostatSetpointTypeMap = [0x00, 0x01, 0x02, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f];

const thermostatSetpointScaleName = "temperature";
function getScale(scale: number): Scale {
	return lookupNamedScale(thermostatSetpointScaleName, scale);
}
function getSetpointUnit(scale: number): string {
	return getScale(scale).unit ?? "";
}

export interface ThermostatSetpointValue {
	value: number;
	scale: number;
}

export interface ThermostatSetpointCapabilities {
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
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

@API(CommandClasses["Thermostat Setpoint"])
export class ThermostatSetpointCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatSetpointCommand): Maybe<boolean> {
		switch (cmd) {
			case ThermostatSetpointCommand.Get:
			case ThermostatSetpointCommand.Set:
			case ThermostatSetpointCommand.SupportedGet:
				return true; // This is mandatory
			case ThermostatSetpointCommand.CapabilitiesGet:
				return this.version >= 3;
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

		// TODO: GH#323 retrieve the actual scale the thermostat is using
		// SDS14223: The Scale field value MUST be identical to the value received in the Thermostat Setpoint Report for the
		// actual Setpoint Type during the node interview.
		await this.set(propertyKey, value, 0);

		// Refresh the current value
		await this.get(propertyKey);
	};

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get(setpointType: ThermostatSetpointType) {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Get,
		);

		const cc = new ThermostatSetpointCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response = (await this.driver.sendCommand<
			ThermostatSetpointCCReport
		>(cc))!;
		return response.type === ThermostatSetpointType["N/A"]
			? // not supported
			undefined
			: // supported
			{
				value: response.value,
				scale: response.scale,
			};
	}

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
		await this.driver.sendCommand(cc);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
		const response = (await this.driver.sendCommand<
			ThermostatSetpointCCCapabilitiesReport
		>(cc))!;
		return {
			minValue: response.minValue,
			maxValue: response.maxValue,
			minValueScale: response.minValueScale,
			maxValueScale: response.maxValueScale,
		};
	}

	/**
	 * Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
	 * to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
	 * during node interview.
	 */
	public async getSupportedSetpointTypes(): Promise<
		readonly ThermostatSetpointType[]
	> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.SupportedGet,
		);

		const cc = new ThermostatSetpointCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			ThermostatSetpointCCSupportedReport
		>(cc))!;
		return response.supportedSetpointTypes;
	}
}

@commandClass(CommandClasses["Thermostat Setpoint"])
@implementedVersion(3)
export class ThermostatSetpointCC extends CommandClass {
	declare ccCommand: ThermostatSetpointCommand;

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(
			getSetpointTypesInterpretationValueID(0).property,
			true,
		);
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				ThermostatSetpointType,
				propertyKey as any,
			);
		} else {
			return super.translatePropertyKey(property, propertyKey);
		}
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Thermostat Setpoint"];

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
				} interview...`,
			direction: "none",
		});

		if (this.version <= 2) {
			let setpointTypes: ThermostatSetpointType[];
			let interpretation: "A" | "B" | undefined;
			// Whether our tests changed the assumed bitmask interpretation
			let interpretationChanged = false;

			const supportedSetpointTypesValueId = getSupportedSetpointTypesValueID(
				this.endpointIndex,
			);

			// If we haven't yet, query the supported setpoint types
			if (complete) {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "retrieving supported setpoint types...",
					direction: "outbound",
				});
				setpointTypes = [...(await api.getSupportedSetpointTypes())];
				interpretation = undefined; // we don't know yet which interpretation the device uses
			} else {
				setpointTypes =
					this.getValueDB().getValue(supportedSetpointTypesValueId) ??
					[];
				interpretation = this.getValueDB().getValue(
					getSetpointTypesInterpretationValueID(this.endpointIndex),
				);
			}

			// If necessary, test which interpretation the device follows

			// Assume interpretation B
			// --> If setpoints 3,4,5 or 6 are supported, the assumption is wrong ==> A
			function switchToInterpretationA(): void {
				setpointTypes = setpointTypes.map(
					i => thermostatSetpointTypeMap[i],
				);
				interpretation = "A";
				interpretationChanged = true;
			}

			if (!interpretation) {
				if ([3, 4, 5, 6].some(type => setpointTypes.includes(type))) {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"uses Thermostat Setpoint bitmap interpretation A",
						direction: "none",
					});
					switchToInterpretationA();
				} else {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Thermostat Setpoint bitmap interpretation is unknown, assuming B for now",
						direction: "none",
					});
				}
			} else if (interpretation === "A") {
				setpointTypes = setpointTypes.map(
					i => thermostatSetpointTypeMap[i],
				);
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
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value of setpoint ${setpointName}...`,
					direction: "outbound",
				});

				let setpoint:
					| {
							value: number;
							scale: Scale;
					  }
					| undefined;
				try {
					setpoint = await api.get(type);
				} catch (e) {
					if (
						e instanceof ZWaveError &&
						e.code === ZWaveErrorCodes.Controller_NodeTimeout
					) {
						// The node did not respond, assume the setpoint type is not supported
					} else {
						throw e;
					}
				}

				let logMessage: string;
				if (setpoint) {
					// Setpoint supported, remember the type
					supportedSetpointTypes.push(type);
					logMessage = `received current value of setpoint ${setpointName}: ${
						setpoint.value
					} ${setpoint.scale.unit ?? ""}`;
				} else if (!interpretation) {
					// The setpoint type is not supported, switch to interpretation A
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `the setpoint type ${setpointTypes} is unsupported, switching to interpretation A`,
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
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			// If we made an assumption and did not switch to interpretation A,
			// the device adheres to interpretation B
			// wotan-disable-next-line no-useless-predicate
			if (!interpretation && !interpretationChanged) {
				// our assumption about interpretation B was correct
				interpretation = "B";
				interpretationChanged = true;
			}

			// After a complete interview, we need to remember which setpoint types are supported
			if (complete) {
				this.getValueDB().setValue(
					supportedSetpointTypesValueId,
					supportedSetpointTypes,
				);
			}

			// Also save the bitmap interpretation if we know it now
			if (interpretationChanged) {
				this.getValueDB().setValue(
					getSetpointTypesInterpretationValueID(this.endpointIndex),
					interpretation,
				);
			}
		} else {
			// Versions >= 3 adhere to bitmap interpretation A, so we can rely on getSupportedSetpointTypes

			// If we haven't yet, query the supported setpoint types
			let setpointTypes: ThermostatSetpointType[];
			if (complete) {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "retrieving supported setpoint types...",
					direction: "outbound",
				});
				setpointTypes = [...(await api.getSupportedSetpointTypes())];
				const logMessage =
					"received supported setpoint types:\n" +
					setpointTypes
						.map(type =>
							getEnumMemberName(ThermostatSetpointType, type),
						)
						.map(name => `· ${name}`)
						.join("\n");
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				setpointTypes =
					this.getValueDB().getValue({
						commandClass: this.ccId,
						property: "supportedSetpointTypes",
						endpoint: this.endpointIndex,
					}) || [];
			}

			for (const type of setpointTypes) {
				const setpointName = getEnumMemberName(
					ThermostatSetpointType,
					type,
				);
				// If we haven't yet, find out the capabilities of this setpoint
				if (complete) {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `retrieving capabilities for setpoint ${setpointName}...`,
						direction: "outbound",
					});
					const setpointCaps = await api.getCapabilities(type);
					const minValueUnit = getSetpointUnit(
						setpointCaps.minValueScale,
					);
					const maxValueUnit = getSetpointUnit(
						setpointCaps.maxValueScale,
					);
					const logMessage = `received capabilities for setpoint ${setpointName}:
minimum value: ${setpointCaps.minValue} ${minValueUnit}
maximum value: ${setpointCaps.maxValue} ${maxValueUnit}`;
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				}
				// Every time, query the current value
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value of setpoint ${setpointName}...`,
					direction: "outbound",
				});
				const setpoint = await api.get(type);
				let logMessage: string;
				if (setpoint) {
					logMessage = `received current value of setpoint ${setpointName}: ${
						setpoint.value
						} ${setpoint.scale.unit ?? ""}`;
				} else {
					// This shouldn't happen since we used getSupported
					// But better be sure we don't crash
					logMessage = `Setpoint ${setpointName} is not supported`;
				}
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
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
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCSetOptions,
	) {
		super(driver, options);
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
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize();
	}
}

@CCCommand(ThermostatSetpointCommand.Report)
export class ThermostatSetpointCCReport extends ThermostatSetpointCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0] & 0b1111;
		if (this._type === 0) {
			// Not supported
			this._value = 0;
			this._scale = getScale(0);
			return;
		}

		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(this.payload.slice(1));
		this._value = value;
		this._scale = getScale(scale);

		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "setpoint",
			propertyKey: this._type,
		};
		if (!this.getValueDB().hasMetadata(valueId)) {
			this.getValueDB().setMetadata(valueId, {
				...ValueMetadata.Number,
				unit: this._scale.unit,
			});
		}
		this.getValueDB().setValue(valueId, value);
	}

	private _type: ThermostatSetpointType;
	public get type(): ThermostatSetpointType {
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
}

const testResponseForThermostatSetpointGet: CCResponsePredicate = (
	sent: ThermostatSetpointCCGet,
	received,
	isPositiveTransmitReport,
) => {
	// We expect a Thermostat Setpoint Report that matches the requested setpoint type
	return received instanceof ThermostatSetpointCCReport &&
		received.type === sent.setpointType
		? "final"
		: isPositiveTransmitReport
		? "confirmation"
		: "unexpected";
};

interface ThermostatSetpointCCGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.Get)
@expectedCCResponse(testResponseForThermostatSetpointGet)
export class ThermostatSetpointCCGet extends ThermostatSetpointCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCGetOptions,
	) {
		super(driver, options);
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
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesReport extends ThermostatSetpointCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0];
		let bytesRead: number;
		// parseFloatWithScale does its own validation
		({
			value: this._minValue,
			scale: this._minValueScale,
			bytesRead,
		} = parseFloatWithScale(this.payload.slice(1)));
		({
			value: this._maxValue,
			scale: this._maxValueScale,
		} = parseFloatWithScale(this.payload.slice(1 + bytesRead)));

		// Predefine the metadata
		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "setpoint",
			propertyKey: this._type,
		};
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.Number,
			min: this._minValue,
			max: this._maxValue,
			unit:
				getSetpointUnit(this._minValueScale) ||
				getSetpointUnit(this._maxValueScale),
		});

		this.persistValues();
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
}

interface ThermostatSetpointCCCapabilitiesGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesGet)
@expectedCCResponse(ThermostatSetpointCCCapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCCapabilitiesGetOptions,
	) {
		super(driver, options);
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
}

@CCCommand(ThermostatSetpointCommand.SupportedReport)
export class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		const bitMask = this.payload;
		const supported = parseBitMask(bitMask, ThermostatSetpointType["N/A"]);
		if (this.version >= 3) {
			// Interpretation A
			this._supportedSetpointTypes = supported.map(
				i => thermostatSetpointTypeMap[i],
			);
		} else {
			// It is unknown which interpretation the device complies to.
			// This must be tested during the interview
			this._supportedSetpointTypes = supported;
		}

		this.persistValues();
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
}

@CCCommand(ThermostatSetpointCommand.SupportedGet)
@expectedCCResponse(ThermostatSetpointCCSupportedReport)
/**
 * Issues a SupportedGet command to the node. Due to inconsistencies in interpretation,
 * this command should not be used for nodes with CC versions 1 or 2
 */
export class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
