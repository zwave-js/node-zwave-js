import { Scale } from "@zwave-js/config";
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
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
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

/**
 * @publicAPI
 */
export type MultilevelSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: number;
		scale: number;
	};
};

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

	public async get(): Promise<
		(MultilevelSensorValue & { type: number }) | undefined
	>;
	public async get(
		sensorType: number,
		scale: number,
	): Promise<number | undefined>;
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
		const response = await this.driver.sendCommand<MultilevelSensorCCReport>(
			cc,
			this.commandOptions,
		);
		if (!response) return;

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
		const response = await this.driver.sendCommand<MultilevelSensorCCSupportedSensorReport>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSensorTypes;
	}

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
		const response = await this.driver.sendCommand<MultilevelSensorCCSupportedScaleReport>(
			cc,
			this.commandOptions,
		);
		return response?.sensorSupportedScales;
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
export class MultilevelSensorCC extends CommandClass {
	declare ccCommand: MultilevelSensorCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Multilevel Sensor"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (this.version >= 5) {
			// Query the supported sensor types
			this.driver.controllerLog.logNode(node.id, {
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
							this.driver.configManager.getSensorTypeName(t),
						)
						.map((name) => `· ${name}`)
						.join("\n");
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported sensor types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			// As well as the supported scales for each sensor

			for (const type of sensorTypes) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying supported scales for ${this.driver.configManager.getSensorTypeName(
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
									this.driver.configManager.lookupSensorScale(
										type,
										s,
									).label,
							)
							.map((name) => `· ${name}`)
							.join("\n");
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				} else {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Querying supported scales timed out, skipping interview...",
						level: "warn",
					});
					return;
				}
			}
		}

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Multilevel Sensor"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version <= 4) {
			// Sensors up to V4 only support a single value
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current sensor reading...",
				direction: "outbound",
			});
			const mlsResponse = await api.get();
			if (mlsResponse) {
				const sensorScale = this.driver.configManager.lookupSensorScale(
					mlsResponse.type,
					mlsResponse.scale.key,
				);
				const logMessage = `received current sensor reading:
sensor type: ${this.driver.configManager.getSensorTypeName(mlsResponse.type)}
value:       ${mlsResponse.value} ${sensorScale.unit || ""}`;
				this.driver.controllerLog.logNode(node.id, {
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
				const sensorScales: readonly number[] =
					this.getValueDB().getValue({
						commandClass: this.ccId,
						endpoint: this.endpointIndex,
						property: "supportedScales",
						propertyKey: type,
					}) || [];

				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying ${this.driver.configManager.getSensorTypeName(
						type,
					)} sensor reading...`,
					direction: "outbound",
				});
				// TODO: Add some way to select the scale. For now use the first available one
				const value = await api.get(type, sensorScales[0]);
				if (value != undefined) {
					const scale = this.driver.configManager.lookupSensorScale(
						type,
						sensorScales[0],
					);
					const logMessage = `received current ${this.driver.configManager.getSensorTypeName(
						type,
					)} sensor reading: ${value} ${scale.unit || ""}`;
					this.driver.controllerLog.logNode(node.id, {
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
			const type = this.driver.configManager.lookupSensorType(
				propertyKey,
			);
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
			this.scale = this.driver.configManager.lookupSensorScale(
				this.type,
				scale,
			);

			this.persistValues();
		} else {
			this.type = options.type;
			this.value = options.value;
			this.scale =
				options.scale instanceof Scale
					? options.scale
					: this.driver.configManager.lookupSensorScale(
							this.type,
							options.scale,
					  );
		}
	}

	public persistValues(): boolean {
		const typeName = this.driver.configManager.getSensorTypeName(this.type);
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
				type: this.driver.configManager.getSensorTypeName(this.type),
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

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord = {};
		if (
			this.version >= 5 &&
			this.sensorType != undefined &&
			this.scale != undefined
		) {
			message = {
				"sensor type": this.driver.configManager.getSensorTypeName(
					this.sensorType,
				),
				scale: this.driver.configManager.lookupSensorScale(
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported sensor types": this.supportedSensorTypes
					.map(
						(t) =>
							`\n· ${this.driver.configManager.getSensorTypeName(
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"sensor type": this.driver.configManager.getSensorTypeName(
					this.sensorType,
				),
				"supported scales": this.sensorSupportedScales
					.map(
						(s) =>
							`\n· ${
								this.driver.configManager.lookupSensorScale(
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"sensor type": this.driver.configManager.getSensorTypeName(
					this.sensorType,
				),
			},
		};
	}
}
