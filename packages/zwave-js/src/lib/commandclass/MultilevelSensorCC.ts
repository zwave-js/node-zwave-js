import {
	getSensorTypeName,
	lookupSensorScale,
	lookupSensorType,
	Scale,
} from "@zwave-js/config";
import {
	CommandClasses,
	encodeFloatWithScale,
	ignoreTimeout,
	Maybe,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ValueID } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import log from "../log";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	CCResponsePredicate,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

export enum MultilevelSensorCommand {
	GetSupportedSensor = 0x01,
	SupportedSensorReport = 0x02,
	GetSupportedScale = 0x03,
	Get = 0x04,
	Report = 0x05,
	SupportedScaleReport = 0x06,
}

/**
 * @publicAPI
 */
export interface MultilevelSensorValue {
	value: number;
	scale: Scale;
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Multilevel Sensor"])
export class MultilevelSensorCCAPI extends CCAPI {
	public supportsCommand(cmd: MultilevelSensorCommand): Maybe<boolean> {
		switch (cmd) {
			case MultilevelSensorCommand.Get:
			case MultilevelSensorCommand.Report:
				return true; // This is mandatory
			case MultilevelSensorCommand.GetSupportedSensor:
			case MultilevelSensorCommand.GetSupportedScale:
				return this.version >= 5;
		}
		return super.supportsCommand(cmd);
	}

	public async get(): Promise<MultilevelSensorValue & { type: number }>;
	public async get(sensorType: number, scale: number): Promise<number>;
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(sensorType?: number, scale?: number) {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.Get,
		);

		const cc = new MultilevelSensorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
			scale,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSensorCCReport
		>(cc))!;

		if (sensorType === undefined) {
			// Overload #1: return the full response
			return {
				type: response.type,
				value: response.value,
				scale: response.scale,
			};
		} else {
			// Overload #2: return only the value
			return response.value;
		}
	}

	public async getSupportedSensorTypes(): Promise<readonly number[]> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.GetSupportedSensor,
		);

		const cc = new MultilevelSensorCCGetSupportedSensor(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSensorCCSupportedSensorReport
		>(cc))!;
		return response.supportedSensorTypes;
	}

	public async getSupportedScales(
		sensorType: number,
	): Promise<readonly number[]> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.GetSupportedScale,
		);

		const cc = new MultilevelSensorCCGetSupportedScale(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = (await this.driver.sendCommand<
			MultilevelSensorCCSupportedScaleReport
		>(cc))!;
		return response.sensorSupportedScales;
	}

	public async sendReport(
		sensorType: number,
		scale: number | Scale,
		value: number,
	): Promise<void> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.Report,
		);

		const cc = new MultilevelSensorCCReport(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			type: sensorType,
			scale,
			value,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
export class MultilevelSensorCC extends CommandClass {
	declare ccCommand: MultilevelSensorCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Multilevel Sensor"];

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (this.version <= 4) {
			// Sensors up to V4 only support a single value
			// This is to be requested every time

			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current sensor reading...",
				direction: "outbound",
			});
			const mlsResponse = await api.get();
			const sensorScale = lookupSensorScale(
				mlsResponse.type,
				mlsResponse.scale.key,
			);
			const logMessage = `received current sensor reading:
sensor type: ${getSensorTypeName(mlsResponse.type)}
value:       ${mlsResponse.value} ${sensorScale.unit || ""}`;
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			// V5+

			// If we haven't yet, query the supported sensor types
			let sensorTypes: readonly number[];
			if (complete) {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "retrieving supported sensor types...",
					direction: "outbound",
				});
				sensorTypes = await api.getSupportedSensorTypes();
				const logMessage =
					"received supported sensor types:\n" +
					sensorTypes
						.map(getSensorTypeName)
						.map((name) => `· ${name}`)
						.join("\n");
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				sensorTypes =
					this.getValueDB().getValue({
						commandClass: this.ccId,
						property: "supportedSensorTypes",
						endpoint: this.endpointIndex,
					}) || [];
			}

			for (const type of sensorTypes) {
				// If we haven't yet, query the supported scales for each sensor
				let sensorScales: readonly number[];
				if (complete) {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying supported scales for ${getSensorTypeName(
							type,
						)} sensor`,
						direction: "outbound",
					});
					sensorScales = await api.getSupportedScales(type);
					const logMessage =
						"received supported scales:\n" +
						sensorScales
							.map((s) => lookupSensorScale(type, s).label)
							.map((name) => `· ${name}`)
							.join("\n");
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				} else {
					sensorScales =
						this.getValueDB().getValue({
							commandClass: this.ccId,
							endpoint: this.endpointIndex,
							property: "supportedScales",
							propertyKey: type,
						}) || [];
				}

				// Always query the current sensor reading
				await ignoreTimeout(
					async () => {
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `querying ${getSensorTypeName(
								type,
							)} sensor reading...`,
							direction: "outbound",
						});
						// TODO: Add some way to select the scale. For now use the first available one
						const value = await api.get(type, sensorScales[0]);
						const scale = lookupSensorScale(type, sensorScales[0]);
						const logMessage = `received current ${getSensorTypeName(
							type,
						)} sensor reading: ${value} ${scale.unit || ""}`;
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: logMessage,
							direction: "inbound",
						});
					},
					() => {
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `Query of ${getSensorTypeName(
								type,
							)} sensor timed out - skipping because it is not critical...`,
							level: "warn",
						});
					},
				);
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		// TODO: check this
		if (property === "values" && typeof propertyKey === "number") {
			const type = lookupSensorType(propertyKey);
			if (type) return type.label;
		}
		return super.translatePropertyKey(property, propertyKey);
	}
}

// @publicAPI
export interface MultilevelSensorCCReportOptions extends CCCommandOptions {
	type: number;
	scale: number | Scale;
	value: number;
}

@CCCommand(MultilevelSensorCommand.Report)
export class MultilevelSensorCCReport extends MultilevelSensorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.type = this.payload[0];
			// parseFloatWithScale does its own validation
			const { value, scale } = parseFloatWithScale(this.payload.slice(1));
			this.value = value;
			this.scale = lookupSensorScale(this.type, scale);

			this.persistValues();
		} else {
			this.type = options.type;
			this.value = options.value;
			this.scale =
				options.scale instanceof Scale
					? options.scale
					: lookupSensorScale(this.type, options.scale);
		}
	}

	public persistValues(): boolean {
		const typeName = getSensorTypeName(this.type);
		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: typeName,
		};
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.ReadOnlyNumber,
			unit: this.scale.unit,
			label: typeName,
		});
		this.getValueDB().setValue(valueId, this.value);
		return true;
	}

	public type: number;
	public scale: Scale;
	public value: number;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.type]),
			encodeFloatWithScale(this.value, this.scale.key),
		]);
		return super.serialize();
	}
}

const testResponseForMultilevelSensorGet: CCResponsePredicate = (
	sent: MultilevelSensorCCGet,
	received,
	isPositiveTransmitReport,
) => {
	// We expect a Multilevel Sensor Report that matches the requested sensor type (if a type was requested)
	return received instanceof MultilevelSensorCCReport &&
		(sent.sensorType == undefined || received.type === sent.sensorType)
		? "final"
		: isPositiveTransmitReport
		? "confirmation"
		: "unexpected";
};

// These options are supported starting in V5
interface MultilevelSensorCCGetSpecificOptions {
	sensorType: number;
	scale: number;
}
type MultilevelSensorCCGetOptions =
	| CCCommandOptions
	| (CCCommandOptions & MultilevelSensorCCGetSpecificOptions);

@CCCommand(MultilevelSensorCommand.Get)
@expectedCCResponse(testResponseForMultilevelSensorGet)
export class MultilevelSensorCCGet extends MultilevelSensorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if ("sensorType" in options) {
				this.sensorType = options.sensorType;
				this.scale = options.scale;
			}
		}
	}

	public sensorType: number | undefined;
	public scale: number | undefined;

	public serialize(): Buffer {
		if (
			this.version >= 5 &&
			this.sensorType != undefined &&
			this.scale != undefined
		) {
			this.payload = Buffer.from([
				this.sensorType,
				(this.scale & 0b11) << 3,
			]);
		}
		return super.serialize();
	}
}

@CCCommand(MultilevelSensorCommand.SupportedSensorReport)
export class MultilevelSensorCCSupportedSensorReport extends MultilevelSensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this._supportedSensorTypes = parseBitMask(this.payload);
		this.persistValues();
	}

	private _supportedSensorTypes: number[];
	// TODO: Use this during interview to precreate values
	@ccValue({ internal: true })
	public get supportedSensorTypes(): readonly number[] {
		return this._supportedSensorTypes;
	}
}

@CCCommand(MultilevelSensorCommand.GetSupportedSensor)
@expectedCCResponse(MultilevelSensorCCSupportedSensorReport)
export class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(MultilevelSensorCommand.SupportedScaleReport)
export class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		const sensorType = this.payload[0];
		const supportedScales = parseBitMask(
			Buffer.from([this.payload[1] & 0b1111]),
			0,
		);
		this.supportedScales = [sensorType, supportedScales];
		this.persistValues();
	}

	@ccKeyValuePair({ internal: true })
	private supportedScales: [number, number[]];

	public get sensorType(): number {
		return this.supportedScales[0];
	}

	public get sensorSupportedScales(): readonly number[] {
		return this.supportedScales[1];
	}
}

interface MultilevelSensorCCGetSupportedScaleOptions extends CCCommandOptions {
	sensorType: number;
}

@CCCommand(MultilevelSensorCommand.GetSupportedScale)
@expectedCCResponse(MultilevelSensorCCSupportedScaleReport)
export class MultilevelSensorCCGetSupportedScale extends MultilevelSensorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetSupportedScaleOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType;
		}
	}

	public sensorType: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sensorType]);
		return super.serialize();
	}
}
