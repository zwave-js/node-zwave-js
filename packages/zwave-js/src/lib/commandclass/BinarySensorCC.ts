import {
	CommandClasses,
	ignoreTimeout,
	Maybe,
	parseBitMask,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import log from "../log";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CCResponsePredicate,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum BinarySensorCommand {
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x01,
	SupportedReport = 0x04,
}

/**
 * @publicAPI
 */
export enum BinarySensorType {
	"General Purpose" = 0x01,
	Smoke = 0x02,
	CO = 0x03,
	CO2 = 0x04,
	Heat = 0x05,
	Water = 0x06,
	Freeze = 0x07,
	Tamper = 0x08,
	Aux = 0x09,
	"Door/Window" = 0x0a,
	Tilt = 0x0b,
	Motion = 0x0c,
	"Glass Break" = 0x0d,
	Any = 0xff,
}

export function getBinarySensorValueId(
	endpointIndex: number | undefined,
	sensorType: BinarySensorType,
): ValueID {
	return {
		commandClass: CommandClasses["Binary Sensor"],
		endpoint: endpointIndex,
		property: getEnumMemberName(BinarySensorType, sensorType),
	};
}

export function getSupportedSensorTypesValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Binary Sensor"],
		endpoint: endpointIndex,
		property: "supportedSensorTypes",
	};
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Binary Sensor"])
export class BinarySensorCCAPI extends CCAPI {
	public supportsCommand(cmd: BinarySensorCommand): Maybe<boolean> {
		switch (cmd) {
			case BinarySensorCommand.Get:
				return true; // This is mandatory
			case BinarySensorCommand.SupportedGet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Retrieves the current value from this sensor
	 * @param sensorType The (optional) sensor type to retrieve the value for
	 */
	public async get(sensorType?: BinarySensorType): Promise<boolean> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.Get,
		);

		const cc = new BinarySensorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = (await this.driver.sendCommand<BinarySensorCCReport>(
			cc,
		))!;
		// We don't want to repeat the sensor type
		return response.value;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupportedSensorTypes() {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.SupportedGet,
		);

		const cc = new BinarySensorCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			BinarySensorCCSupportedReport
		>(cc))!;
		// We don't want to repeat the sensor type
		return response.supportedSensorTypes;
	}
}

@commandClass(CommandClasses["Binary Sensor"])
@implementedVersion(2)
export class BinarySensorCC extends CommandClass {
	declare ccCommand: BinarySensorCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Binary Sensor"];

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		// Find out which sensor types this sensor supports
		let supportedSensorTypes: readonly BinarySensorType[] | undefined;
		if (complete && this.version >= 2) {
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying supported sensor types...",
				direction: "outbound",
			});
			supportedSensorTypes = await api.getSupportedSensorTypes();
			const logMessage = `received supported sensor types: ${supportedSensorTypes
				.map((type) => getEnumMemberName(BinarySensorType, type))
				.map((name) => `\n· ${name}`)
				.join("")}`;
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			supportedSensorTypes = this.getValueDB().getValue(
				getSupportedSensorTypesValueId(this.endpointIndex),
			);
		}

		// Always query (all of) the sensor's current value(s)
		if (this.version === 1) {
			await ignoreTimeout(
				async () => {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "querying current value...",
						direction: "outbound",
					});
					const currentValue = await api.get();
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `received current value: ${currentValue}`,
						direction: "inbound",
					});
				},
				() => {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Current value query timed out - skipping because it is not critical...",
						level: "warn",
					});
				},
			);
		} else if (supportedSensorTypes) {
			for (const type of supportedSensorTypes) {
				const sensorName = getEnumMemberName(BinarySensorType, type);
				await ignoreTimeout(
					async () => {
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `querying current value for ${sensorName}...`,
							direction: "outbound",
						});
						const currentValue = await api.get(type);
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `received current value for ${sensorName}: ${currentValue}`,
							direction: "inbound",
						});
					},
					() => {
						log.controller.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `Current value query for ${sensorName} timed out - skipping because it is not critical...`,
							level: "warn",
						});
					},
				);
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public setMappedBasicValue(value: number): boolean {
		this.getValueDB().setValue(
			getBinarySensorValueId(this.endpointIndex, BinarySensorType.Any),
			value === 0xff,
		);
		return true;
	}
}

@CCCommand(BinarySensorCommand.Report)
export class BinarySensorCCReport extends BinarySensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._value = this.payload[0] === 0xff;
		this._type = BinarySensorType.Any;
		if (this.version >= 2 && this.payload.length >= 2) {
			this._type = this.payload[1];
		}
		this.persistValues();
	}

	public persistValues(): boolean {
		const valueId: ValueID = getBinarySensorValueId(
			this.endpointIndex,
			this._type,
		);
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.ReadOnlyBoolean,
		});
		this.getValueDB().setValue(valueId, this._value);
		return true;
	}

	private _type: BinarySensorType;
	public get type(): BinarySensorType {
		return this._type;
	}

	private _value: boolean;
	public get value(): boolean {
		return this._value;
	}
}

const testResponseForBinarySensorGet: CCResponsePredicate = (
	sent: BinarySensorCCGet,
	received,
	isPositiveTransmitReport,
) => {
	// We expect a Binary Sensor Report that matches the requested sensor type (if a type was requested)
	return received instanceof BinarySensorCCReport &&
		(sent.sensorType == undefined ||
			sent.sensorType === BinarySensorType.Any ||
			received.type === sent.sensorType)
		? "final"
		: isPositiveTransmitReport
		? "confirmation"
		: "unexpected";
};

interface BinarySensorCCGetOptions extends CCCommandOptions {
	sensorType?: BinarySensorType;
}

@CCCommand(BinarySensorCommand.Get)
@expectedCCResponse(testResponseForBinarySensorGet)
export class BinarySensorCCGet extends BinarySensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | BinarySensorCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType;
		}
	}

	public sensorType: BinarySensorType | undefined;

	public serialize(): Buffer {
		if (this.version >= 2 && this.sensorType != undefined) {
			this.payload = Buffer.from([this.sensorType]);
		}
		return super.serialize();
	}
}

@CCCommand(BinarySensorCommand.SupportedReport)
export class BinarySensorCCSupportedReport extends BinarySensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._supportedSensorTypes = parseBitMask(this.payload);
		this.persistValues();
	}

	private _supportedSensorTypes: BinarySensorType[];
	@ccValue({ internal: true })
	public get supportedSensorTypes(): readonly BinarySensorType[] {
		return this._supportedSensorTypes;
	}
}

@CCCommand(BinarySensorCommand.SupportedGet)
@expectedCCResponse(BinarySensorCCSupportedReport)
export class BinarySensorCCSupportedGet extends BinarySensorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
