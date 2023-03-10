import { getDefaultScale, Scale } from "@zwave-js/config";
import { timespan } from "@zwave-js/core";
import type {
	MessageOrCCLogEntry,
	MessageRecord,
	SinglecastCC,
	SupervisionResult,
	ValueID,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	encodeFloatWithScale,
	Maybe,
	MessagePriority,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CCResponsePredicate,
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
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { MultilevelSensorCommand, MultilevelSensorValue } from "../lib/_Types";

export const MultilevelSensorCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Multilevel Sensor"], {
		...V.staticProperty("supportedSensorTypes", undefined, {
			internal: true,
		}),
	}),

	...V.defineDynamicCCValues(CommandClasses["Multilevel Sensor"], {
		...V.dynamicPropertyAndKeyWithName(
			"supportedScales",
			"supportedScales",
			(sensorType: number) => sensorType,
			({ property, propertyKey }) =>
				property === "supportedScales" &&
				typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		...V.dynamicPropertyWithName(
			"value",
			// This should have been the sensor type, but it is too late to change now
			// Maybe we can migrate this without breaking in the future
			(sensorTypeName: string) => sensorTypeName,
			({ property, propertyKey }) =>
				typeof property === "string" &&
				property !== "supportedSensorTypes" &&
				property !== "supportedScales" &&
				propertyKey == undefined,
			(sensorTypeName: string) =>
				({
					// Just the base metadata, to be extended using a config manager
					...ValueMetadata.ReadOnlyNumber,
					label: sensorTypeName,
				} as const),
		),
	}),
});

/**
 * Determine the scale to use to query a sensor reading. Uses the user-preferred scale if given,
 * otherwise falls back to the first supported one.
 */
function getPreferredSensorScale(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	endpointIndex: number,
	sensorType: number,
	supportedScales: readonly number[],
): number {
	const scaleGroup =
		applHost.configManager.lookupSensorType(sensorType)?.scales;
	// If the sensor type is unknown, we have no default. Use the user-provided scale or 0
	if (!scaleGroup) {
		const preferred = applHost.options.preferences?.scales[sensorType];
		// We cannot look up strings for unknown sensor types, so this must be a number or we use the fallback
		if (typeof preferred !== "number") return 0;
		return preferred;
	}

	// Look up the preference for the scale
	let preferred: number | string | undefined;
	// Named scales apply to multiple sensor types. To be able to override the scale for single types
	// we need to look at the preferences by sensor type first
	preferred = applHost.options.preferences?.scales[sensorType];
	// If the scale is named, we can then try to use the named preference
	if (preferred == undefined && scaleGroup.name) {
		preferred = applHost.options.preferences?.scales[scaleGroup.name];
	}
	// Then fall back to the first supported scale
	if (preferred == undefined) {
		preferred = supportedScales[0] ?? 0;
		applHost.controllerLog.logNode(nodeId, {
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
		applHost.controllerLog.logNode(nodeId, {
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
		applHost.controllerLog.logNode(nodeId, {
			endpoint: endpointIndex,
			message: `Preferred scale ${preferred} not supported for sensor type ${sensorType}, using the first supported scale`,
		});
		return supportedScales[0];
	} else {
		return preferred;
	}
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
		const ccSpecific =
			this.tryGetValueDB()?.getMetadata(valueId)?.ccSpecific;
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
				this.tryGetValueDB()?.getValue({
					commandClass: this.ccId,
					endpoint: this.endpoint.index,
					property: "supportedScales",
					propertyKey: sensorType,
				}) ?? [];

			preferredScale = getPreferredSensorScale(
				this.applHost,
				this.endpoint.nodeId,
				this.endpoint.index,
				sensorType,
				supportedScales,
			);
		}

		const cc = new MultilevelSensorCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
			scale: scale ?? preferredScale,
		});
		const response =
			await this.applHost.sendCommand<MultilevelSensorCCReport>(
				cc,
				this.commandOptions,
			);
		if (!response) return;

		const responseScale = this.applHost.configManager.lookupSensorScale(
			response.type,
			response.scale,
		);

		if (sensorType == undefined) {
			// Overload #1: return the full response
			return {
				type: response.type,
				value: response.value,
				scale: responseScale,
			};
		} else if (scale == undefined) {
			// Overload #2: return value and scale
			return {
				value: response.value,
				scale: responseScale,
			};
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

		const cc = new MultilevelSensorCCGetSupportedSensor(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<MultilevelSensorCCSupportedSensorReport>(
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

		const cc = new MultilevelSensorCCGetSupportedScale(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response =
			await this.applHost.sendCommand<MultilevelSensorCCSupportedScaleReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedScales;
	}

	@validateArgs()
	public async sendReport(
		sensorType: number,
		scale: number | Scale,
		value: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.Report,
		);

		const cc = new MultilevelSensorCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			type: sensorType,
			scale,
			value,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
@ccValues(MultilevelSensorCCValues)
export class MultilevelSensorCC extends CommandClass {
	declare ccCommand: MultilevelSensorCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Multilevel Sensor"],
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

		if (this.version >= 5) {
			// Query the supported sensor types
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving supported sensor types...",
				direction: "outbound",
			});
			const sensorTypes = await api.getSupportedSensorTypes();
			if (sensorTypes) {
				const logMessage =
					"received supported sensor types:\n" +
					sensorTypes
						.map((t) => applHost.configManager.getSensorTypeName(t))
						.map((name) => `· ${name}`)
						.join("\n");
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported sensor types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			// As well as the supported scales for each sensor

			for (const type of sensorTypes) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying supported scales for ${applHost.configManager.getSensorTypeName(
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
									applHost.configManager.lookupSensorScale(
										type,
										s,
									).label,
							)
							.map((name) => `· ${name}`)
							.join("\n");
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				} else {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Querying supported scales timed out, skipping interview...",
						level: "warn",
					});
					return;
				}
			}
		}

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Multilevel Sensor"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(applHost);

		if (this.version <= 4) {
			// Sensors up to V4 only support a single value
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current sensor reading...",
				direction: "outbound",
			});
			const mlsResponse = await api.get();
			if (mlsResponse) {
				const sensorScale = applHost.configManager.lookupSensorScale(
					mlsResponse.type,
					mlsResponse.scale.key,
				);
				const logMessage = `received current sensor reading:
sensor type: ${applHost.configManager.getSensorTypeName(mlsResponse.type)}
value:       ${mlsResponse.value} ${sensorScale.unit || ""}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		} else {
			// Query all sensor values
			const sensorTypes: readonly number[] =
				valueDB.getValue({
					commandClass: this.ccId,
					property: "supportedSensorTypes",
					endpoint: this.endpointIndex,
				}) || [];

			for (const type of sensorTypes) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying ${applHost.configManager.getSensorTypeName(
						type,
					)} sensor reading...`,
					direction: "outbound",
				});

				const value = await api.get(type);
				if (value) {
					const logMessage = `received current ${applHost.configManager.getSensorTypeName(
						type,
					)} sensor reading: ${value.value} ${
						value.scale.unit || ""
					}`;
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				}
			}
		}
	}

	public shouldRefreshValues(
		this: SinglecastCC<this>,
		applHost: ZWaveApplicationHost,
	): boolean {
		// Check when any of the supported values was last updated longer than 6 hours ago.
		// This may lead to some unnecessary queries, but at least the values are up to date then
		const valueDB = applHost.tryGetValueDB(this.nodeId);
		if (!valueDB) return true;

		const values = this.getDefinedValueIDs(applHost).filter((v) =>
			MultilevelSensorCCValues.value.is(v),
		);
		return values.some((v) => {
			const lastUpdated = valueDB.getTimestamp(v);
			return (
				lastUpdated == undefined ||
				Date.now() - lastUpdated > timespan.hours(6)
			);
		});
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		// TODO: check this
		if (property === "values" && typeof propertyKey === "number") {
			const type = applHost.configManager.lookupSensorType(propertyKey);
			if (type) return type.label;
		}
		return super.translatePropertyKey(applHost, property, propertyKey);
	}
}

// @publicAPI
export interface MultilevelSensorCCReportOptions extends CCCommandOptions {
	type: number;
	scale: number | Scale;
	value: number;
}

@CCCommand(MultilevelSensorCommand.Report)
@useSupervision()
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
			// parseFloatWithScale does its own validation
			const { value, scale } = parseFloatWithScale(this.payload.slice(1));
			this.value = value;
			this.scale = scale;
		} else {
			this.type = options.type;
			this.value = options.value;
			this.scale =
				options.scale instanceof Scale
					? options.scale.key
					: options.scale;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const sensorType = applHost.configManager.lookupSensorType(this.type);
		const scale = applHost.configManager.lookupSensorScale(
			this.type,
			this.scale,
		);

		// Filter out unknown sensor types and scales, unless the strict validation is disabled
		const measurementValidation = !this.host.getDeviceConfig?.(
			this.nodeId as number,
		)?.compat?.disableStrictMeasurementValidation;

		if (measurementValidation) {
			validatePayload.withReason(
				`Unknown sensor type ${num2hex(this.type)} or corrupted data`,
			)(!!sensorType);
			validatePayload.withReason(
				`Unknown scale ${num2hex(this.scale)} or corrupted data`,
			)(scale.label !== getDefaultScale(this.scale).label);

			// Filter out unsupported sensor types and scales if possible
			if (this.version >= 5) {
				const supportedSensorTypes = this.getValue<number[]>(
					applHost,
					MultilevelSensorCCValues.supportedSensorTypes,
				);
				if (supportedSensorTypes?.length) {
					validatePayload.withReason(
						`Unsupported sensor type ${
							sensorType!.label
						} or corrupted data`,
					)(supportedSensorTypes.includes(this.type));
				}

				const supportedScales = this.getValue<number[]>(
					applHost,
					MultilevelSensorCCValues.supportedScales(this.type),
				);
				if (supportedScales?.length) {
					validatePayload.withReason(
						`Unsupported sensor type ${scale.label} or corrupted data`,
					)(supportedScales.includes(scale.key));
				}
			}
		}

		const typeName = applHost.configManager.getSensorTypeName(this.type);
		const sensorValue = MultilevelSensorCCValues.value(typeName);

		this.setMetadata(applHost, sensorValue, {
			...sensorValue.meta,
			unit: scale.unit,
			ccSpecific: {
				sensorType: this.type,
				scale: scale.key,
			},
		});
		this.setValue(applHost, sensorValue, this.value);

		return true;
	}

	public type: number;
	public scale: number;
	public value: number;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.type]),
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				type: applHost.configManager.getSensorTypeName(this.type),
				scale: applHost.configManager.lookupSensorScale(
					this.type,
					this.scale,
				).label,
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		let message: MessageRecord = {};
		if (
			this.version >= 5 &&
			this.sensorType != undefined &&
			this.scale != undefined
		) {
			message = {
				"sensor type": applHost.configManager.getSensorTypeName(
					this.sensorType,
				),
				scale: applHost.configManager.lookupSensorScale(
					this.sensorType,
					this.scale,
				).label,
			};
		}
		return {
			...super.toLogEntry(applHost),
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
		this.supportedSensorTypes = parseBitMask(this.payload);
	}

	// TODO: Use this during interview to precreate values
	@ccValue(MultilevelSensorCCValues.supportedSensorTypes)
	public readonly supportedSensorTypes: readonly number[];

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"supported sensor types": this.supportedSensorTypes
					.map(
						(t) =>
							`\n· ${applHost.configManager.getSensorTypeName(
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
		this.sensorType = this.payload[0];
		this.supportedScales = parseBitMask(
			Buffer.from([this.payload[1] & 0b1111]),
			0,
		);
	}

	public readonly sensorType: number;

	@ccValue(
		MultilevelSensorCCValues.supportedScales,
		(self: MultilevelSensorCCSupportedScaleReport) =>
			[self.sensorType] as const,
	)
	public readonly supportedScales: readonly number[];

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"sensor type": applHost.configManager.getSensorTypeName(
					this.sensorType,
				),
				"supported scales": this.supportedScales
					.map(
						(s) =>
							`\n· ${
								applHost.configManager.lookupSensorScale(
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"sensor type": applHost.configManager.getSensorTypeName(
					this.sensorType,
				),
			},
		};
	}
}
