import { getDefaultScale, Scale } from "@zwave-js/config";
import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
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
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { num2hex, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import {
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "./API";
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
import { MultilevelSensorCommand, MultilevelSensorValue } from "./_Types";

/**
 * Determine the scale to use to query a sensor reading. Uses the user-preferred scale if given,
 * otherwise falls back to the first supported one.
 */
function getPreferredSensorScale(
	driver: Driver,
	nodeId: number,
	endpointIndex: number,
	sensorType: number,
	supportedScales: readonly number[],
): number {
	const scaleGroup =
		driver.configManager.lookupSensorType(sensorType)?.scales;
	// If the sensor type is unknown, we have no default. Use the user-provided scale or 0
	if (!scaleGroup) {
		const preferred = driver.options.preferences.scales[sensorType];
		// We cannot look up strings for unknown sensor types, so this must be a number or we use the fallback
		if (typeof preferred !== "number") return 0;
		return preferred;
	}

	// Look up the preference for the scale
	let preferred: number | string | undefined;
	// Named scales apply to multiple sensor types. To be able to override the scale for single types
	// we need to look at the preferences by sensor type first
	preferred = driver.options.preferences.scales[sensorType];
	// If the scale is named, we can then try to use the named preference
	if (preferred == undefined && scaleGroup.name) {
		preferred = driver.options.preferences.scales[scaleGroup.name];
	}
	// Then fall back to the first supported scale
	if (preferred == undefined) {
		preferred = supportedScales[0] ?? 0;
		driver.controllerLog.logNode(nodeId, {
			endpoint: endpointIndex,
			message: `No scale preference for sensor type ${sensorType}, using the first supported scale ${preferred}`,
		});
		return preferred;
	}

	// If the scale name or unit was given, try to look it up
	if (typeof preferred === "string") {
		for (const scale of scaleGroup.values()) {
			if (scale.label === preferred || scale.unit === preferred) {
				preferred = scale.key;
				break;
			}
		}
	}

	if (typeof preferred === "string") {
		// Looking up failed
		driver.controllerLog.logNode(nodeId, {
			endpoint: endpointIndex,
			message: `Preferred scale "${preferred}" for sensor type ${sensorType} not found, using the first supported scale ${
				supportedScales[0] ?? 0
			}`,
		});
		return supportedScales[0] ?? 0;
	}

	// We have a numeric scale key, nothing to look up. Make sure it is supported though
	if (!supportedScales.length) {
		// No info about supported scales, just use the preferred one
		return preferred;
	} else if (!supportedScales.includes(preferred)) {
		driver.controllerLog.logNode(nodeId, {
			endpoint: endpointIndex,
			message: `Preferred scale ${preferred} not supported for sensor type ${sensorType}, using the first supported scale`,
		});
		return supportedScales[0];
	} else {
		return preferred;
	}
}

export function getSupportedSensorTypesValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Sensor"],
		endpoint: endpoint,
		property: "supportedSensorTypes",
	};
}
export function getSupportedScalesValueId(
	endpoint: number,
	sensorType: number,
): ValueID {
	return {
		commandClass: CommandClasses["Multilevel Sensor"],
		endpoint: endpoint,
		property: "supportedScales",
		propertyKey: sensorType,
	};
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Multilevel Sensor"])
export class MultilevelSensorCCAPI extends PhysicalCCAPI {
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

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		// Look up the necessary information
		const valueId: ValueID = {
			commandClass: CommandClasses["Multilevel Sensor"],
			endpoint: this.endpoint.index,
			property,
		};
		const ccSpecific = this.endpoint
			.getNodeUnsafe()
			?.valueDB.getMetadata(valueId)?.ccSpecific;
		if (!ccSpecific) {
			throwUnsupportedProperty(this.ccId, property);
		}

		const { sensorType, scale } = ccSpecific;
		return this.get(sensorType, scale);
	};

	/** Query the default sensor value */
	public async get(): Promise<
		(MultilevelSensorValue & { type: number }) | undefined
	>;
	/** Query the sensor value for the given sensor type using the preferred sensor scale */
	public async get(
		sensorType: number,
	): Promise<MultilevelSensorValue | undefined>;
	/** Query the sensor value for the given sensor type using the given sensor scale */
	public async get(
		sensorType: number,
		scale: number,
	): Promise<number | undefined>;

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(sensorType?: number, scale?: number) {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.Get,
		);

		// Figure out the preferred scale if none was given
		let preferredScale: number | undefined;
		if (sensorType != undefined && scale == undefined) {
			const supportedScales: readonly number[] =
				this.endpoint.getNodeUnsafe()?.getValue({
					commandClass: this.ccId,
					endpoint: this.endpoint.index,
					property: "supportedScales",
					propertyKey: sensorType,
				}) ?? [];

			preferredScale = getPreferredSensorScale(
				this.driver,
				this.endpoint.nodeId,
				this.endpoint.index,
				sensorType,
				supportedScales,
			);
		}

		const cc = new MultilevelSensorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
			scale: scale ?? preferredScale,
		});
		const response =
			await this.driver.sendCommand<MultilevelSensorCCReport>(
				cc,
				this.commandOptions,
			);
		if (!response) return;

		if (sensorType == undefined) {
			// Overload #1: return the full response
			return {
				type: response.type,
				value: response.value,
				scale: response.scale,
			};
		} else if (scale == undefined) {
			// Overload #2: return value and scale
			return pick(response, ["value", "scale"]);
		} else {
			// Overload #3: return only the value
			return response.value;
		}
	}

	public async getSupportedSensorTypes(): Promise<
		readonly number[] | undefined
	> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.GetSupportedSensor,
		);

		const cc = new MultilevelSensorCCGetSupportedSensor(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<MultilevelSensorCCSupportedSensorReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedSensorTypes;
	}

	@validateArgs()
	public async getSupportedScales(
		sensorType: number,
	): Promise<readonly number[] | undefined> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.GetSupportedScale,
		);

		const cc = new MultilevelSensorCCGetSupportedScale(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response =
			await this.driver.sendCommand<MultilevelSensorCCSupportedScaleReport>(
				cc,
				this.commandOptions,
			);
		return response?.sensorSupportedScales;
	}

	@validateArgs()
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
export class MultilevelSensorCC extends CommandClass {
	declare ccCommand: MultilevelSensorCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Multilevel Sensor"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (this.version >= 5) {
			// Query the supported sensor types
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving supported sensor types...",
				direction: "outbound",
			});
			const sensorTypes = await api.getSupportedSensorTypes();
			if (sensorTypes) {
				const logMessage =
					"received supported sensor types:\n" +
					sensorTypes
						.map((t) =>
							this.host.configManager.getSensorTypeName(t),
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
						"Querying supported sensor types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			// As well as the supported scales for each sensor

			for (const type of sensorTypes) {
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying supported scales for ${this.host.configManager.getSensorTypeName(
						type,
					)} sensor`,
					direction: "outbound",
				});
				const sensorScales = await api.getSupportedScales(type);
				if (sensorScales) {
					const logMessage =
						"received supported scales:\n" +
						sensorScales
							.map(
								(s) =>
									this.host.configManager.lookupSensorScale(
										type,
										s,
									).label,
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
							"Querying supported scales timed out, skipping interview...",
						level: "warn",
					});
					return;
				}
			}
		}

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Multilevel Sensor"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version <= 4) {
			// Sensors up to V4 only support a single value
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current sensor reading...",
				direction: "outbound",
			});
			const mlsResponse = await api.get();
			if (mlsResponse) {
				const sensorScale = this.host.configManager.lookupSensorScale(
					mlsResponse.type,
					mlsResponse.scale.key,
				);
				const logMessage = `received current sensor reading:
sensor type: ${this.host.configManager.getSensorTypeName(mlsResponse.type)}
value:       ${mlsResponse.value} ${sensorScale.unit || ""}`;
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		} else {
			// Query all sensor values
			const sensorTypes: readonly number[] =
				this.getValueDB().getValue({
					commandClass: this.ccId,
					property: "supportedSensorTypes",
					endpoint: this.endpointIndex,
				}) || [];

			for (const type of sensorTypes) {
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying ${this.host.configManager.getSensorTypeName(
						type,
					)} sensor reading...`,
					direction: "outbound",
				});

				const value = await api.get(type);
				if (value) {
					const logMessage = `received current ${this.host.configManager.getSensorTypeName(
						type,
					)} sensor reading: ${value.value} ${
						value.scale.unit || ""
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

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		// TODO: check this
		if (property === "values" && typeof propertyKey === "number") {
			const type = this.host.configManager.lookupSensorType(propertyKey);
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.type = this.payload[0];
			const sensorType = this.host.configManager.lookupSensorType(
				this.type,
			);
			// parseFloatWithScale does its own validation
			const { value, scale } = parseFloatWithScale(this.payload.slice(1));
			this.value = value;
			this.scale = this.host.configManager.lookupSensorScale(
				this.type,
				scale,
			);

			// Filter out unknown sensor types and scales, unless the strict validation is disabled
			const measurementValidation =
				!this.getNodeUnsafe()?.deviceConfig?.compat
					?.disableStrictMeasurementValidation;

			if (measurementValidation) {
				validatePayload.withReason(
					`Unknown sensor type ${num2hex(
						this.type,
					)} or corrupted data`,
				)(!!sensorType);
				validatePayload.withReason(
					`Unknown scale ${num2hex(scale)} or corrupted data`,
				)(this.scale.label !== getDefaultScale(scale).label);

				// Filter out unsupported sensor types and scales if possible
				if (this.version >= 5) {
					const valueDB = this.getValueDB();

					const supportedSensorTypes = valueDB.getValue<number[]>(
						getSupportedSensorTypesValueId(this.endpointIndex),
					);
					if (supportedSensorTypes?.length) {
						validatePayload.withReason(
							`Unsupported sensor type ${
								sensorType!.label
							} or corrupted data`,
						)(supportedSensorTypes.includes(this.type));
					}

					const supportedScales = valueDB.getValue<number[]>(
						getSupportedScalesValueId(
							this.endpointIndex,
							this.type,
						),
					);
					if (supportedScales?.length) {
						validatePayload.withReason(
							`Unsupported sensor type ${this.scale.label} or corrupted data`,
						)(supportedScales.includes(this.scale.key));
					}
				}
			}

			this.persistValues();
		} else {
			this.type = options.type;
			this.value = options.value;
			this.scale =
				options.scale instanceof Scale
					? options.scale
					: this.host.configManager.lookupSensorScale(
							this.type,
							options.scale,
					  );
		}
	}

	public persistValues(): boolean {
		const typeName = this.host.configManager.getSensorTypeName(this.type);
		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: typeName,
		};
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.ReadOnlyNumber,
			unit: this.scale.unit,
			label: typeName,
			ccSpecific: {
				sensorType: this.type,
				scale: this.scale.key,
			},
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				type: this.host.configManager.getSensorTypeName(this.type),
				scale: this.scale.label,
				value: this.value,
			},
		};
	}
}

const testResponseForMultilevelSensorGet: CCResponsePredicate<
	MultilevelSensorCCGet,
	MultilevelSensorCCReport
> = (sent, received) => {
	// We expect a Multilevel Sensor Report that matches the requested sensor type (if a type was requested)
	return sent.sensorType == undefined || received.type === sent.sensorType;
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
@expectedCCResponse(
	MultilevelSensorCCReport,
	testResponseForMultilevelSensorGet,
)
export class MultilevelSensorCCGet extends MultilevelSensorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord = {};
		if (
			this.version >= 5 &&
			this.sensorType != undefined &&
			this.scale != undefined
		) {
			message = {
				"sensor type": this.host.configManager.getSensorTypeName(
					this.sensorType,
				),
				scale: this.host.configManager.lookupSensorScale(
					this.sensorType,
					this.scale,
				).label,
			};
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(MultilevelSensorCommand.SupportedSensorReport)
export class MultilevelSensorCCSupportedSensorReport extends MultilevelSensorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported sensor types": this.supportedSensorTypes
					.map(
						(t) =>
							`\n· ${this.host.configManager.getSensorTypeName(
								t,
							)}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(MultilevelSensorCommand.GetSupportedSensor)
@expectedCCResponse(MultilevelSensorCCSupportedSensorReport)
export class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {}

@CCCommand(MultilevelSensorCommand.SupportedScaleReport)
export class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"sensor type": this.host.configManager.getSensorTypeName(
					this.sensorType,
				),
				"supported scales": this.sensorSupportedScales
					.map(
						(s) =>
							`\n· ${
								this.host.configManager.lookupSensorScale(
									this.sensorType,
									s,
								).label
							}`,
					)
					.join(""),
			},
		};
	}
}

interface MultilevelSensorCCGetSupportedScaleOptions extends CCCommandOptions {
	sensorType: number;
}

@CCCommand(MultilevelSensorCommand.GetSupportedScale)
@expectedCCResponse(MultilevelSensorCCSupportedScaleReport)
export class MultilevelSensorCCGetSupportedScale extends MultilevelSensorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetSupportedScaleOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"sensor type": this.host.configManager.getSensorTypeName(
					this.sensorType,
				),
			},
		};
	}
}
