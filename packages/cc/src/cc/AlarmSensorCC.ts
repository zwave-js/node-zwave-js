import {
	CommandClasses,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, isEnumMember, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	type CCCommandOptions,
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
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { AlarmSensorCommand, AlarmSensorType } from "../lib/_Types";

export const AlarmSensorCCValues = Object.freeze({
	...V.defineDynamicCCValues(CommandClasses["Alarm Sensor"], {
		...V.dynamicPropertyAndKeyWithName(
			"state",
			"state",
			(sensorType: AlarmSensorType) => sensorType,
			({ property, propertyKey }) =>
				property === "state" && typeof propertyKey === "number",
			(sensorType: AlarmSensorType) => {
				const alarmName = getEnumMemberName(
					AlarmSensorType,
					sensorType,
				);
				return {
					...ValueMetadata.ReadOnlyBoolean,
					label: `${alarmName} state`,
					description: "Whether the alarm is active",
					ccSpecific: { sensorType },
				} as const;
			},
		),
		...V.dynamicPropertyAndKeyWithName(
			"severity",
			"severity",
			(sensorType: AlarmSensorType) => sensorType,
			({ property, propertyKey }) =>
				property === "severity" && typeof propertyKey === "number",
			(sensorType: AlarmSensorType) => {
				const alarmName = getEnumMemberName(
					AlarmSensorType,
					sensorType,
				);
				return {
					...ValueMetadata.ReadOnlyNumber,
					min: 1,
					max: 100,
					unit: "%",
					label: `${alarmName} severity`,
					ccSpecific: { sensorType },
				} as const;
			},
		),
		...V.dynamicPropertyAndKeyWithName(
			"duration",
			"duration",
			(sensorType: AlarmSensorType) => sensorType,
			({ property, propertyKey }) =>
				property === "duration" && typeof propertyKey === "number",
			(sensorType: AlarmSensorType) => {
				const alarmName = getEnumMemberName(
					AlarmSensorType,
					sensorType,
				);
				return {
					...ValueMetadata.ReadOnlyNumber,
					unit: "s",
					label: `${alarmName} duration`,
					description: "For how long the alarm should be active",
					ccSpecific: { sensorType },
				} as const;
			},
		),
	}),
	...V.defineStaticCCValues(CommandClasses["Alarm Sensor"], {
		...V.staticProperty("supportedSensorTypes", undefined, {
			internal: true,
		}),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Alarm Sensor"])
export class AlarmSensorCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: AlarmSensorCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case AlarmSensorCommand.Get:
			case AlarmSensorCommand.SupportedGet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Retrieves the current value from this sensor
	 * @param sensorType The (optional) sensor type to retrieve the value for
	 */
	@validateArgs({ strictEnums: true })
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(sensorType?: AlarmSensorType) {
		this.assertSupportsCommand(AlarmSensorCommand, AlarmSensorCommand.Get);

		const cc = new AlarmSensorCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			sensorType,
		});
		const response = await this.applHost.sendCommand<AlarmSensorCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) return pick(response, ["state", "severity", "duration"]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupportedSensorTypes() {
		this.assertSupportsCommand(
			AlarmSensorCommand,
			AlarmSensorCommand.SupportedGet,
		);

		const cc = new AlarmSensorCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			AlarmSensorCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) return response.supportedSensorTypes;
	}
}

@commandClass(CommandClasses["Alarm Sensor"])
@implementedVersion(1)
@ccValues(AlarmSensorCCValues)
export class AlarmSensorCC extends CommandClass {
	declare ccCommand: AlarmSensorCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;

		// Skip the interview in favor of Notification CC if possible
		if (endpoint.supportsCC(CommandClasses.Notification)) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`${this.constructor.name}: skipping interview because Notification CC is supported...`,
				direction: "none",
			});
			this.setInterviewComplete(applHost, true);
			return;
		}

		const api = CCAPI.create(
			CommandClasses["Alarm Sensor"],
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
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported sensor types...",
			direction: "outbound",
		});
		const supportedSensorTypes = await api.getSupportedSensorTypes();
		if (supportedSensorTypes) {
			const logMessage = `received supported sensor types: ${
				supportedSensorTypes
					.map((type) => getEnumMemberName(AlarmSensorType, type))
					.map((name) => `\n· ${name}`)
					.join("")
			}`;
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

		// Query (all of) the sensor's current value(s)
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Alarm Sensor"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const supportedSensorTypes: readonly AlarmSensorType[] =
			this.getValue(applHost, AlarmSensorCCValues.supportedSensorTypes)
				?? [];

		// Always query (all of) the sensor's current value(s)
		for (const type of supportedSensorTypes) {
			// Some devices report invalid sensor types, but the CC API checks
			// for valid values and throws otherwise.
			if (!isEnumMember(AlarmSensorType, type)) continue;

			const sensorName = getEnumMemberName(AlarmSensorType, type);

			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying current value for ${sensorName}...`,
				direction: "outbound",
			});
			const currentValue = await api.get(type);
			if (currentValue) {
				let message = `received current value for ${sensorName}: 
state:    ${currentValue.state}`;
				if (currentValue.severity != undefined) {
					message += `
severity: ${currentValue.severity}`;
				}
				if (currentValue.duration != undefined) {
					message += `
duration: ${currentValue.duration}`;
				}
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message,
					direction: "inbound",
				});
			}
		}
	}

	/**
	 * Returns which sensor types are supported.
	 * This only works AFTER the interview process
	 */
	public static getSupportedSensorTypesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<AlarmSensorType[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				AlarmSensorCCValues.supportedSensorTypes.endpoint(
					endpoint.index,
				),
			);
	}

	protected createMetadataForSensorType(
		applHost: ZWaveApplicationHost,
		sensorType: AlarmSensorType,
	): void {
		const stateValue = AlarmSensorCCValues.state(sensorType);
		const severityValue = AlarmSensorCCValues.severity(sensorType);
		const durationValue = AlarmSensorCCValues.duration(sensorType);

		// Always create metadata if it does not exist
		this.ensureMetadata(applHost, stateValue);
		this.ensureMetadata(applHost, severityValue);
		this.ensureMetadata(applHost, durationValue);
	}
}

@CCCommand(AlarmSensorCommand.Report)
export class AlarmSensorCCReport extends AlarmSensorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 5, this.payload[1] !== 0xff);
		// Alarm Sensor reports may be forwarded by a different node, in this case
		// (and only then!) the payload contains the original node ID
		const sourceNodeId = this.payload[0];
		if (sourceNodeId !== 0) {
			this.nodeId = sourceNodeId;
		}
		this.sensorType = this.payload[1];
		// Any positive value gets interpreted as alarm
		this.state = this.payload[2] > 0;
		// Severity only ranges from 1 to 100
		if (this.payload[2] > 0 && this.payload[2] <= 0x64) {
			this.severity = this.payload[2];
		}
		// ignore zero durations
		this.duration = this.payload.readUInt16BE(3) || undefined;
	}

	public readonly sensorType: AlarmSensorType;
	public readonly state: boolean;
	public readonly severity: number | undefined;
	public readonly duration: number | undefined;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sensor type": getEnumMemberName(AlarmSensorType, this.sensorType),
			"alarm state": this.state,
		};
		if (this.severity != undefined) {
			message.severity = this.severity;
		}
		if (this.duration != undefined) {
			message.duration = `${this.duration} seconds`;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		// Create metadata if it does not exist
		this.createMetadataForSensorType(applHost, this.sensorType);

		const stateValue = AlarmSensorCCValues.state(this.sensorType);
		const severityValue = AlarmSensorCCValues.severity(this.sensorType);
		const durationValue = AlarmSensorCCValues.duration(this.sensorType);

		this.setValue(applHost, stateValue, this.state);
		this.setValue(applHost, severityValue, this.severity);
		this.setValue(applHost, durationValue, this.duration);

		return true;
	}
}

function testResponseForAlarmSensorGet(
	sent: AlarmSensorCCGet,
	received: AlarmSensorCCReport,
) {
	// We expect a Alarm Sensor Report that matches the requested sensor type (if a type was requested)
	return (
		sent.sensorType === AlarmSensorType.Any
		|| received.sensorType === sent.sensorType
	);
}

// @publicAPI
export interface AlarmSensorCCGetOptions extends CCCommandOptions {
	sensorType?: AlarmSensorType;
}

@CCCommand(AlarmSensorCommand.Get)
@expectedCCResponse(AlarmSensorCCReport, testResponseForAlarmSensorGet)
export class AlarmSensorCCGet extends AlarmSensorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | AlarmSensorCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType ?? AlarmSensorType.Any;
		}
	}

	public sensorType: AlarmSensorType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sensorType]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"sensor type": getEnumMemberName(
					AlarmSensorType,
					this.sensorType,
				),
			},
		};
	}
}

@CCCommand(AlarmSensorCommand.SupportedReport)
export class AlarmSensorCCSupportedReport extends AlarmSensorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		const bitMaskLength = this.payload[0];
		validatePayload(this.payload.length >= 1 + bitMaskLength);
		this._supportedSensorTypes = parseBitMask(
			this.payload.subarray(1, 1 + bitMaskLength),
			AlarmSensorType["General Purpose"],
		);
	}

	private _supportedSensorTypes: AlarmSensorType[];
	@ccValue(AlarmSensorCCValues.supportedSensorTypes)
	public get supportedSensorTypes(): readonly AlarmSensorType[] {
		return this._supportedSensorTypes;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		// Create metadata for each sensor type
		for (const type of this._supportedSensorTypes) {
			this.createMetadataForSensorType(applHost, type);
		}
		return true;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported sensor types": this._supportedSensorTypes
					.map((t) => getEnumMemberName(AlarmSensorType, t))
					.join(", "),
			},
		};
	}
}

@CCCommand(AlarmSensorCommand.SupportedGet)
@expectedCCResponse(AlarmSensorCCSupportedReport)
export class AlarmSensorCCSupportedGet extends AlarmSensorCC {}
