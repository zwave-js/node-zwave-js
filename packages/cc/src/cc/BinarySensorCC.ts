import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	API,
	CCCommand,
	ccValue,
	commandClass,
	CommandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import { BinarySensorCommand, BinarySensorType } from "../lib/_Types";

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
	@validateArgs({ strictEnums: true })
	public async get(
		sensorType?: BinarySensorType,
	): Promise<boolean | undefined> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.Get,
		);

		const cc = new BinarySensorCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = await this.applHost.sendCommand<BinarySensorCCReport>(
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

		const cc = new BinarySensorCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<BinarySensorCCSupportedReport>(
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Binary Sensor"],
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

		// Find out which sensor types this sensor supports
		if (this.version >= 2) {
			applHost.controllerLog.logNode(node.id, {
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
		}

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Binary Sensor"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(applHost);

		// Query (all of) the sensor's current value(s)
		if (this.version === 1) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current value...",
				direction: "outbound",
			});
			const currentValue = await api.get();
			if (currentValue != undefined) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `received current value: ${currentValue}`,
					direction: "inbound",
				});
			}
		} else {
			const supportedSensorTypes: readonly BinarySensorType[] =
				valueDB.getValue(
					getSupportedSensorTypesValueId(this.endpointIndex),
				) ?? [];

			for (const type of supportedSensorTypes) {
				const sensorName = getEnumMemberName(BinarySensorType, type);
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value for ${sensorName}...`,
					direction: "outbound",
				});
				const currentValue = await api.get(type);
				if (currentValue != undefined) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `received current value for ${sensorName}: ${currentValue}`,
						direction: "inbound",
					});
				}
			}
		}
	}

	public setMappedBasicValue(
		applHost: ZWaveApplicationHost,
		value: number,
	): boolean {
		this.getValueDB(applHost).setValue(
			getBinarySensorValueId(this.endpointIndex, BinarySensorType.Any),
			value > 0,
		);
		return true;
	}
}

@CCCommand(BinarySensorCommand.Report)
export class BinarySensorCCReport extends BinarySensorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._value = this.payload[0] === 0xff;
		this._type = BinarySensorType.Any;
		if (this.version >= 2 && this.payload.length >= 2) {
			this._type = this.payload[1];
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		const valueId: ValueID = getBinarySensorValueId(
			this.endpointIndex,
			this._type,
		);
		valueDB.setMetadata(valueId, {
			...ValueMetadata.ReadOnlyBoolean,
			label: getEnumMemberName(BinarySensorType, this._type),
			ccSpecific: { sensorType: this._type },
		});
		valueDB.setValue(valueId, this._value);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | BinarySensorCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		// The enumeration starts at 1, but the first (reserved) bit is included
		// in the report
		this._supportedSensorTypes = parseBitMask(this.payload, 0).filter(
			(t) => t !== 0,
		);
	}

	private _supportedSensorTypes: BinarySensorType[];
	@ccValue({ internal: true })
	public get supportedSensorTypes(): readonly BinarySensorType[] {
		return this._supportedSensorTypes;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
