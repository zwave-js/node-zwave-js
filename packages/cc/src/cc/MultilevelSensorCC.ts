import {
	encodeBitMask,
	getSensor,
	getSensorName,
	getSensorScale,
	getUnknownScale,
	timespan,
} from "@zwave-js/core";
import type {
	IZWaveEndpoint,
	MessageOrCCLogEntry,
	MessageRecord,
	Scale,
	SinglecastCC,
	SupervisionResult,
	ValueID,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ValueMetadata,
	encodeFloatWithScale,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	type CCCommandOptions,
	type CCResponsePredicate,
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
	MultilevelSensorCommand,
	type MultilevelSensorValue,
} from "../lib/_Types";

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
				property === "supportedScales"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		...V.dynamicPropertyWithName(
			"value",
			// This should have been the sensor type, but it is too late to change now
			// Maybe we can migrate this without breaking in the future
			(sensorTypeName: string) => sensorTypeName,
			({ property, propertyKey }) =>
				typeof property === "string"
				&& property !== "supportedSensorTypes"
				&& property !== "supportedScales"
				&& propertyKey == undefined,
			(sensorTypeName: string) => ({
				// Just the base metadata, to be extended using a config manager
				...ValueMetadata.ReadOnlyNumber,
				label: sensorTypeName,
			} as const),
		),
	}),
});

/**
 * Determine the scale to use to query a sensor reading. Uses the user-preferred scale if given,
 * followed by the most recently used scale, otherwile falls back to the first supported one.
 */
function getPreferredSensorScale(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	endpointIndex: number,
	sensorType: number,
	supportedScales: readonly number[],
): number {
	const sensor = getSensor(sensorType);
	// If the sensor type is unknown, we have no default. Use the user-provided scale or 0
	if (!sensor) {
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
	const scaleGroupName = sensor.scaleGroupName;
	if (preferred == undefined && scaleGroupName) {
		preferred = applHost.options.preferences?.scales[scaleGroupName];
	}
	// Then attempt reading the scale from the corresponding value
	if (preferred == undefined) {
		const sensorName = getSensorName(sensorType);
		const sensorValue = MultilevelSensorCCValues.value(sensorName);
		const metadata = applHost
			.tryGetValueDB(nodeId)
			?.getMetadata(sensorValue.endpoint(endpointIndex));
		const scale = metadata?.ccSpecific?.scale;
		if (typeof scale === "number" && supportedScales.includes(scale)) {
			preferred = scale;
			applHost.controllerLog.logNode(nodeId, {
				endpoint: endpointIndex,
				message:
					`No scale preference for sensor type ${sensorType}, using the last-used scale ${preferred}`,
			});
		}
	}
	// Then fall back to the first supported scale
	if (preferred == undefined) {
		preferred = supportedScales[0] ?? 0;
		applHost.controllerLog.logNode(nodeId, {
			endpoint: endpointIndex,
			message:
				`No scale preference for sensor type ${sensorType}, using the first supported scale ${preferred}`,
		});
		return preferred;
	}

	// If the scale name or unit was given, try to look it up
	if (typeof preferred === "string") {
		for (const [key, scale] of Object.entries(sensor.scales)) {
			if (scale.label === preferred || scale.unit === preferred) {
				preferred = key;
				break;
			}
		}
	}

	if (typeof preferred === "string") {
		// Looking up failed
		applHost.controllerLog.logNode(nodeId, {
			endpoint: endpointIndex,
			message:
				`Preferred scale "${preferred}" for sensor type ${sensorType} not found, using the first supported scale ${
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
			message:
				`Preferred scale ${preferred} not supported for sensor type ${sensorType}, using the first supported scale`,
		});
		return supportedScales[0];
	} else {
		return preferred;
	}
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Multilevel Sensor"])
export class MultilevelSensorCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: MultilevelSensorCommand,
	): MaybeNotKnown<boolean> {
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

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: MultilevelSensorCCAPI, { property }) {
			// Look up the necessary information
			const valueId: ValueID = {
				commandClass: CommandClasses["Multilevel Sensor"],
				endpoint: this.endpoint.index,
				property,
			};
			const ccSpecific = this.tryGetValueDB()?.getMetadata(valueId)
				?.ccSpecific;
			if (!ccSpecific) {
				throwUnsupportedProperty(this.ccId, property);
			}

			const { sensorType, scale } = ccSpecific;
			return this.get(sensorType, scale);
		};
	}

	/** Query the default sensor value */
	public async get(): Promise<
		MaybeNotKnown<MultilevelSensorValue & { type: number }>
	>;
	/** Query the sensor value for the given sensor type using the preferred sensor scale */
	public async get(
		sensorType: number,
	): Promise<MaybeNotKnown<MultilevelSensorValue>>;
	/** Query the sensor value for the given sensor type using the given sensor scale */
	public async get(
		sensorType: number,
		scale: number,
	): Promise<MaybeNotKnown<number>>;

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
		const response = await this.applHost.sendCommand<
			MultilevelSensorCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (!response) return;

		const responseScale = getSensorScale(response.type, response.scale);

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
		MaybeNotKnown<readonly number[]>
	> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.GetSupportedSensor,
		);

		const cc = new MultilevelSensorCCGetSupportedSensor(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			MultilevelSensorCCSupportedSensorReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSensorTypes;
	}

	@validateArgs()
	public async getSupportedScales(
		sensorType: number,
	): Promise<MaybeNotKnown<readonly number[]>> {
		this.assertSupportsCommand(
			MultilevelSensorCommand,
			MultilevelSensorCommand.GetSupportedScale,
		);

		const cc = new MultilevelSensorCCGetSupportedScale(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = await this.applHost.sendCommand<
			MultilevelSensorCCSupportedScaleReport
		>(
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
				const logMessage = "received supported sensor types:\n"
					+ sensorTypes
						.map((t) => getSensorName(t))
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
					message: `querying supported scales for ${
						getSensorName(type)
					} sensor`,
					direction: "outbound",
				});
				const sensorScales = await api.getSupportedScales(type);
				if (sensorScales) {
					const logMessage = "received supported scales:\n"
						+ sensorScales
							.map(
								(s) =>
									(getSensorScale(type, s)
										?? getUnknownScale(s)).label,
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
				const sensorScale = getSensorScale(
					mlsResponse.type,
					mlsResponse.scale.key,
				);
				const logMessage = `received current sensor reading:
sensor type: ${getSensorName(mlsResponse.type)}
value:       ${mlsResponse.value}${
					sensorScale?.unit ? ` ${sensorScale.unit}` : ""
				}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		} else {
			// Query all sensor values
			const sensorTypes: readonly number[] = valueDB.getValue({
				commandClass: this.ccId,
				property: "supportedSensorTypes",
				endpoint: this.endpointIndex,
			}) || [];

			for (const type of sensorTypes) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying ${
						getSensorName(type)
					} sensor reading...`,
					direction: "outbound",
				});

				const value = await api.get(type);
				if (value) {
					const logMessage = `received current ${
						getSensorName(type)
					} sensor reading: ${value.value} ${value.scale.unit || ""}`;
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
		// Poll the device when all of the supported values were last updated longer than 6 hours ago.
		// This may lead to some values not being updated, but the user may have disabled some unnecessary
		// reports to reduce traffic.
		const valueDB = applHost.tryGetValueDB(this.nodeId);
		if (!valueDB) return true;

		const values = this.getDefinedValueIDs(applHost).filter((v) =>
			MultilevelSensorCCValues.value.is(v)
		);
		return values.every((v) => {
			const lastUpdated = valueDB.getTimestamp(v);
			return (
				lastUpdated == undefined
				|| Date.now() - lastUpdated > timespan.hours(6)
			);
		});
	}

	/**
	 * Returns which sensor types are supported.
	 * This only works AFTER the interview process
	 */
	public static getSupportedSensorTypesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<number[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				MultilevelSensorCCValues.supportedSensorTypes.endpoint(
					endpoint.index,
				),
			);
	}

	/**
	 * Returns which scales are supported for a given sensor type.
	 * This only works AFTER the interview process
	 */
	public static getSupportedScalesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		sensorType: number,
	): MaybeNotKnown<number[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				MultilevelSensorCCValues.supportedScales(sensorType).endpoint(
					endpoint.index,
				),
			);
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		// TODO: check this
		if (property === "values" && typeof propertyKey === "number") {
			const sensor = getSensor(propertyKey);
			if (sensor) return sensor.label;
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
			const { value, scale } = parseFloatWithScale(
				this.payload.subarray(1),
			);
			this.value = value;
			this.scale = scale;
		} else {
			this.type = options.type;
			this.value = options.value;
			this.scale = typeof options.scale === "number"
				? options.scale
				: options.scale.key;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const sensor = getSensor(this.type);
		const scale = getSensorScale(
			this.type,
			this.scale,
		) ?? getUnknownScale(this.scale);

		// Filter out unknown sensor types and scales, unless the strict validation is disabled
		const measurementValidation = !this.host.getDeviceConfig?.(
			this.nodeId as number,
		)?.compat?.disableStrictMeasurementValidation;

		if (measurementValidation) {
			// Filter out unsupported sensor types and scales if possible
			if (this.version >= 5) {
				const supportedSensorTypes = this.getValue<number[]>(
					applHost,
					MultilevelSensorCCValues.supportedSensorTypes,
				);
				if (supportedSensorTypes?.length) {
					validatePayload.withReason(
						`Unsupported sensor type ${
							getSensorName(this.type)
						} or corrupted data`,
					)(supportedSensorTypes.includes(this.type));
				}

				const supportedScales = this.getValue<number[]>(
					applHost,
					MultilevelSensorCCValues.supportedScales(this.type),
				);
				if (supportedScales?.length) {
					validatePayload.withReason(
						`Unsupported scale ${scale.label} or corrupted data`,
					)(supportedScales.includes(scale.key));
				}
			} else {
				// We support a higher CC version than the device, so any types and scales it uses should be known to us
				// Filter out unknown ones.
				validatePayload.withReason(
					`Unknown sensor type ${
						num2hex(
							this.type,
						)
					} or corrupted data`,
				)(!!sensor);
				validatePayload.withReason(
					`Unknown scale ${num2hex(this.scale)} or corrupted data`,
				)(scale.label !== getUnknownScale(this.scale).label);
			}
		}

		const sensorName = getSensorName(this.type);
		const sensorValue = MultilevelSensorCCValues.value(sensorName);

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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"sensor type": getSensorName(this.type),
				scale: (getSensorScale(this.type, this.scale)
					?? getUnknownScale(this.scale)).label,
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
// @publicAPI
export type MultilevelSensorCCGetOptions =
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
			if (this.payload.length >= 2) {
				this.sensorType = this.payload[0];
				this.scale = (this.payload[1] >> 3) & 0b11;
			}
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
			this.sensorType != undefined
			&& this.scale != undefined
		) {
			this.payload = Buffer.from([
				this.sensorType,
				(this.scale & 0b11) << 3,
			]);
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord = {};
		if (
			this.sensorType != undefined
			&& this.scale != undefined
		) {
			message = {
				"sensor type": getSensorName(
					this.sensorType,
				),
				scale: (getSensorScale(
					this.sensorType,
					this.scale,
				) ?? getUnknownScale(this.scale)).label,
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface MultilevelSensorCCSupportedSensorReportOptions
	extends CCCommandOptions
{
	supportedSensorTypes: readonly number[];
}

@CCCommand(MultilevelSensorCommand.SupportedSensorReport)
export class MultilevelSensorCCSupportedSensorReport
	extends MultilevelSensorCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCSupportedSensorReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.supportedSensorTypes = parseBitMask(this.payload);
		} else {
			this.supportedSensorTypes = options.supportedSensorTypes;
		}
	}

	// TODO: Use this during interview to precreate values
	@ccValue(MultilevelSensorCCValues.supportedSensorTypes)
	public supportedSensorTypes: readonly number[];

	public serialize(): Buffer {
		this.payload = encodeBitMask(this.supportedSensorTypes);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported sensor types": this.supportedSensorTypes
					.map((t) => `\n· ${getSensorName(t)}`)
					.join(""),
			},
		};
	}
}

@CCCommand(MultilevelSensorCommand.GetSupportedSensor)
@expectedCCResponse(MultilevelSensorCCSupportedSensorReport)
export class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {}

// @publicAPI
export interface MultilevelSensorCCSupportedScaleReportOptions
	extends CCCommandOptions
{
	sensorType: number;
	supportedScales: readonly number[];
}

@CCCommand(MultilevelSensorCommand.SupportedScaleReport)
export class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCSupportedScaleReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.sensorType = this.payload[0];
			this.supportedScales = parseBitMask(
				Buffer.from([this.payload[1] & 0b1111]),
				0,
			);
		} else {
			this.sensorType = options.sensorType;
			this.supportedScales = options.supportedScales;
		}
	}

	public readonly sensorType: number;

	@ccValue(
		MultilevelSensorCCValues.supportedScales,
		(self: MultilevelSensorCCSupportedScaleReport) =>
			[self.sensorType] as const,
	)
	public readonly supportedScales: readonly number[];

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.sensorType]),
			encodeBitMask(this.supportedScales, 4, 0),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"sensor type": getSensorName(this.sensorType),
				"supported scales": this.supportedScales
					.map(
						(s) =>
							`\n· ${
								(getSensorScale(this.sensorType, s)
									?? getUnknownScale(s)).label
							}`,
					)
					.join(""),
			},
		};
	}
}

// @publicAPI
export interface MultilevelSensorCCGetSupportedScaleOptions
	extends CCCommandOptions
{
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
			validatePayload(this.payload.length >= 1);
			this.sensorType = this.payload[0];
		} else {
			this.sensorType = options.sensorType;
		}
	}

	public sensorType: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sensorType]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"sensor type": getSensorName(this.sensorType),
			},
		};
	}
}
