import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	parseBitMask,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
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

/**
 * @publicAPI
 */
export type BinarySensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: BinarySensorType;
	};
};

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
export class BinarySensorCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: BinarySensorCommand): Maybe<boolean> {
		switch (cmd) {
			case BinarySensorCommand.Get:
				return true; // This is mandatory
			case BinarySensorCommand.SupportedGet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		if (typeof property === "string") {
			const sensorType = (BinarySensorType as any)[property] as
				| BinarySensorType
				| undefined;
			if (sensorType) return this.get(sensorType);
		}
		throwUnsupportedProperty(this.ccId, property);
	};

	/**
	 * Retrieves the current value from this sensor
	 * @param sensorType The (optional) sensor type to retrieve the value for
	 */
	public async get(
		sensorType?: BinarySensorType,
	): Promise<boolean | undefined> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.Get,
		);

		const cc = new BinarySensorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = await this.driver.sendCommand<BinarySensorCCReport>(
			cc,
			this.commandOptions,
		);
		// We don't want to repeat the sensor type
		return response?.value;
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
		const response = await this.driver.sendCommand<BinarySensorCCSupportedReport>(
			cc,
			this.commandOptions,
		);
		// We don't want to repeat the sensor type
		return response?.supportedSensorTypes;
	}
}

@commandClass(CommandClasses["Binary Sensor"])
@implementedVersion(2)
export class BinarySensorCC extends CommandClass {
	declare ccCommand: BinarySensorCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Binary Sensor"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Find out which sensor types this sensor supports
		if (this.version >= 2) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying supported sensor types...",
				direction: "outbound",
			});
			const supportedSensorTypes = await api.getSupportedSensorTypes();
			if (supportedSensorTypes) {
				const logMessage = `received supported sensor types: ${supportedSensorTypes
					.map((type) => getEnumMemberName(BinarySensorType, type))
					.map((name) => `\n· ${name}`)
					.join("")}`;
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
		}

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Binary Sensor"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query (all of) the sensor's current value(s)
		if (this.version === 1) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current value...",
				direction: "outbound",
			});
			const currentValue = await api.get();
			if (currentValue != undefined) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `received current value: ${currentValue}`,
					direction: "inbound",
				});
			}
		} else {
			const supportedSensorTypes: readonly BinarySensorType[] =
				this.getValueDB().getValue(
					getSupportedSensorTypesValueId(this.endpointIndex),
				) ?? [];

			for (const type of supportedSensorTypes) {
				const sensorName = getEnumMemberName(BinarySensorType, type);
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value for ${sensorName}...`,
					direction: "outbound",
				});
				const currentValue = await api.get(type);
				if (currentValue != undefined) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `received current value for ${sensorName}: ${currentValue}`,
						direction: "inbound",
					});
				}
			}
		}
	}

	public setMappedBasicValue(value: number): boolean {
		this.getValueDB().setValue(
			getBinarySensorValueId(this.endpointIndex, BinarySensorType.Any),
			value > 0,
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
			label: getEnumMemberName(BinarySensorType, this._type),
			ccSpecific: { sensorType: this._type },
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				type: getEnumMemberName(BinarySensorType, this._type),
				value: this._value,
			},
		};
	}
}

function testResponseForBinarySensorGet(
	sent: BinarySensorCCGet,
	received: BinarySensorCCReport,
) {
	// We expect a Binary Sensor Report that matches the requested sensor type (if a type was requested)
	return (
		sent.sensorType == undefined ||
		sent.sensorType === BinarySensorType.Any ||
		received.type === sent.sensorType
	);
}

interface BinarySensorCCGetOptions extends CCCommandOptions {
	sensorType?: BinarySensorType;
}

@CCCommand(BinarySensorCommand.Get)
@expectedCCResponse(BinarySensorCCReport, testResponseForBinarySensorGet)
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				type: getEnumMemberName(
					BinarySensorType,
					this.sensorType ?? BinarySensorType.Any,
				),
			},
		};
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
		// The enumeration starts at 1, but the first (reserved) bit is included
		// in the report
		this._supportedSensorTypes = parseBitMask(this.payload, 0).filter(
			(t) => t !== 0,
		);
		this.persistValues();
	}

	private _supportedSensorTypes: BinarySensorType[];
	@ccValue({ internal: true })
	public get supportedSensorTypes(): readonly BinarySensorType[] {
		return this._supportedSensorTypes;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported types": this._supportedSensorTypes
					.map((type) => getEnumMemberName(BinarySensorType, type))
					.join(", "),
			},
		};
	}
}

@CCCommand(BinarySensorCommand.SupportedGet)
@expectedCCResponse(BinarySensorCCSupportedReport)
export class BinarySensorCCSupportedGet extends BinarySensorCC {}
