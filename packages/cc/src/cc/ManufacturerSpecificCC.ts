import type { MessageOrCCLogEntry } from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
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
import { DeviceIdType, ManufacturerSpecificCommand } from "../lib/_Types";

export const ManufacturerSpecificCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Manufacturer Specific"], {
		...V.staticProperty(
			"manufacturerId",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Manufacturer ID",
			} as const,
			{ supportsEndpoints: false },
		),

		...V.staticProperty(
			"productType",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Product type",
			} as const,
			{ supportsEndpoints: false },
		),

		...V.staticProperty(
			"productId",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Product ID",
			} as const,
			{ supportsEndpoints: false },
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Manufacturer Specific"], {
		...V.dynamicPropertyAndKeyWithName(
			"deviceId",
			"deviceId",
			(type: DeviceIdType) => getEnumMemberName(DeviceIdType, type),
			({ property, propertyKey }) =>
				property === "deviceId"
				&& typeof propertyKey === "string"
				&& propertyKey in DeviceIdType,
			(type: DeviceIdType) => ({
				...ValueMetadata.ReadOnlyString,
				label: `Device ID (${getEnumMemberName(DeviceIdType, type)})`,
			}),
			{ minVersion: 2 } as const,
		),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: ManufacturerSpecificCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ManufacturerSpecificCommand.Get:
			case ManufacturerSpecificCommand.Report:
				return true; // This is mandatory
			case ManufacturerSpecificCommand.DeviceSpecificGet:
			case ManufacturerSpecificCommand.DeviceSpecificReport:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.Get,
		);

		const cc = new ManufacturerSpecificCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			ManufacturerSpecificCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"manufacturerId",
				"productType",
				"productId",
			]);
		}
	}

	@validateArgs()
	public async deviceSpecificGet(
		deviceIdType: DeviceIdType,
	): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.DeviceSpecificGet,
		);

		const cc = new ManufacturerSpecificCCDeviceSpecificGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			deviceIdType,
		});
		const response = await this.applHost.sendCommand<
			ManufacturerSpecificCCDeviceSpecificReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.deviceId;
	}

	@validateArgs()
	public async sendReport(
		options: ManufacturerSpecificCCReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.Report,
		);

		const cc = new ManufacturerSpecificCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Manufacturer Specific"])
@implementedVersion(2)
@ccValues(ManufacturerSpecificCCValues)
export class ManufacturerSpecificCC extends CommandClass {
	declare ccCommand: ManufacturerSpecificCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// The Manufacturer Specific CC MUST be interviewed first
		return [];
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Manufacturer Specific"],
			applHost,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

		if (!applHost.isControllerNode(node.id)) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Interviewing ${this.ccName}...`,
				direction: "none",
			});

			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying manufacturer information...",
				direction: "outbound",
			});
			const mfResp = await api.get();
			if (mfResp) {
				const logMessage =
					`received response for manufacturer information:
  manufacturer: ${
						applHost.configManager.lookupManufacturer(
							mfResp.manufacturerId,
						)
						|| "unknown"
					} (${num2hex(mfResp.manufacturerId)})
  product type: ${num2hex(mfResp.productType)}
  product id:   ${num2hex(mfResp.productId)}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

// @publicAPI
export interface ManufacturerSpecificCCReportOptions {
	manufacturerId: number;
	productType: number;
	productId: number;
}

@CCCommand(ManufacturerSpecificCommand.Report)
export class ManufacturerSpecificCCReport extends ManufacturerSpecificCC {
	public constructor(
		host: ZWaveHost,
		options:
			| (ManufacturerSpecificCCReportOptions & CCCommandOptions)
			| CommandClassDeserializationOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 6);
			this.manufacturerId = this.payload.readUInt16BE(0);
			this.productType = this.payload.readUInt16BE(2);
			this.productId = this.payload.readUInt16BE(4);
		} else {
			this.manufacturerId = options.manufacturerId;
			this.productType = options.productType;
			this.productId = options.productId;
		}
	}

	@ccValue(ManufacturerSpecificCCValues.manufacturerId)
	public readonly manufacturerId: number;

	@ccValue(ManufacturerSpecificCCValues.productType)
	public readonly productType: number;

	@ccValue(ManufacturerSpecificCCValues.productId)
	public readonly productId: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(6);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.productType, 2);
		this.payload.writeUInt16BE(this.productId, 4);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"manufacturer id": num2hex(this.manufacturerId),
				"product type": num2hex(this.productType),
				"product id": num2hex(this.productId),
			},
		};
	}
}

@CCCommand(ManufacturerSpecificCommand.Get)
@expectedCCResponse(ManufacturerSpecificCCReport)
export class ManufacturerSpecificCCGet extends ManufacturerSpecificCC {}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificReport
	extends ManufacturerSpecificCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.type = this.payload[0] & 0b111;
		const dataFormat = this.payload[1] >>> 5;
		const dataLength = this.payload[1] & 0b11111;

		validatePayload(dataLength > 0, this.payload.length >= 2 + dataLength);
		const deviceIdData = this.payload.subarray(2, 2 + dataLength);
		this.deviceId = dataFormat === 0
			? deviceIdData.toString("utf8")
			: "0x" + deviceIdData.toString("hex");
	}

	public readonly type: DeviceIdType;

	@ccValue(
		ManufacturerSpecificCCValues.deviceId,
		(self: ManufacturerSpecificCCDeviceSpecificReport) =>
			[self.type] as const,
	)
	public readonly deviceId: string;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"device id type": getEnumMemberName(DeviceIdType, this.type),
				"device id": this.deviceId,
			},
		};
	}
}

// @publicAPI
export interface ManufacturerSpecificCCDeviceSpecificGetOptions
	extends CCCommandOptions
{
	deviceIdType: DeviceIdType;
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificGet)
@expectedCCResponse(ManufacturerSpecificCCDeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificGet
	extends ManufacturerSpecificCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ManufacturerSpecificCCDeviceSpecificGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.deviceIdType = options.deviceIdType;
		}
	}

	public deviceIdType: DeviceIdType;

	public serialize(): Buffer {
		this.payload = Buffer.from([(this.deviceIdType || 0) & 0b111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"device id type": getEnumMemberName(
					DeviceIdType,
					this.deviceIdType,
				),
			},
		};
	}
}
