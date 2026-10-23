import {
	CommandClasses,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	ValueMetadata,
	type WithAddress,
	logBuffer,
	validatePayload,
} from "@zwave-js/core";
import {
	Bytes,
	escapeControlCharacters,
	getEnumMemberName,
	num2hex,
	pick,
} from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";

import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	DeviceIdDataFormat,
	DeviceIdType,
	ManufacturerSpecificCommand,
} from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

export const ManufacturerSpecificCCValues = V.defineCCValues(
	CommandClasses["Manufacturer Specific"],
	{
		...V.staticProperty(
			"manufacturerId",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Manufacturer ID",
			},
			{ supportsEndpoints: false },
		),
		...V.staticProperty(
			"productType",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Product type",
			},
			{ supportsEndpoints: false },
		),
		...V.staticProperty(
			"productId",
			{
				...ValueMetadata.ReadOnlyUInt16,
				label: "Product ID",
			},
			{ supportsEndpoints: false },
		),
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
			{ minVersion: 2 },
		),
	},
);

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

	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.Get,
		);

		const cc = new ManufacturerSpecificCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<ManufacturerSpecificCCReport>(
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
	): Promise<MaybeNotKnown<string | Bytes>> {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.DeviceSpecificGet,
		);

		const cc = new ManufacturerSpecificCCDeviceSpecificGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			deviceIdType,
		});
		const response =
			await this.host.sendCommand<ManufacturerSpecificCCDeviceSpecificReport>(
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

		const cc = new ManufacturerSpecificCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendDeviceSpecificReport(
		options: ManufacturerSpecificCCDeviceSpecificReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.DeviceSpecificReport,
		);

		const cc = new ManufacturerSpecificCCDeviceSpecificReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
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

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Manufacturer Specific"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
			tag: "interview",
		});

		if (node.id !== ctx.ownNodeId) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Interviewing ${this.ccName}...`,
				direction: "none",
			});

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying manufacturer information...",
				direction: "outbound",
			});
			const mfResp = await api.get();
			if (mfResp) {
				const logMessage = `received response for manufacturer information:
  manufacturer: ${
		ctx.lookupManufacturer(mfResp.manufacturerId) || "unknown"
  } (${num2hex(mfResp.manufacturerId)})
  product type: ${num2hex(mfResp.productType)}
  product id:   ${num2hex(mfResp.productId)}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface ManufacturerSpecificCCReportOptions {
	manufacturerId: number;
	productType: number;
	productId: number;
}

@CCCommand(ManufacturerSpecificCommand.Report)
@ccValueProperty("manufacturerId", ManufacturerSpecificCCValues.manufacturerId)
@ccValueProperty("productType", ManufacturerSpecificCCValues.productType)
@ccValueProperty("productId", ManufacturerSpecificCCValues.productId)
export class ManufacturerSpecificCCReport extends ManufacturerSpecificCC {
	public constructor(
		options: WithAddress<ManufacturerSpecificCCReportOptions>,
	) {
		super(options);

		this.manufacturerId = options.manufacturerId;
		this.productType = options.productType;
		this.productId = options.productId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ManufacturerSpecificCCReport {
		validatePayload(raw.payload.length >= 6);
		const manufacturerId = raw.payload.readUInt16BE(0);
		const productType = raw.payload.readUInt16BE(2);
		const productId = raw.payload.readUInt16BE(4);

		return new this({
			nodeId: ctx.sourceNodeId,
			manufacturerId,
			productType,
			productId,
		});
	}

	public readonly manufacturerId: number;

	public readonly productType: number;

	public readonly productId: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(6);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.productType, 2);
		this.payload.writeUInt16BE(this.productId, 4);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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

// @publicAPI
export interface ManufacturerSpecificCCDeviceSpecificReportOptions {
	type: DeviceIdType;
	deviceId: string | Uint8Array;
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificReport)
@ccValueProperty("deviceId", ManufacturerSpecificCCValues.deviceId, (self) => [
	self.type,
])
export class ManufacturerSpecificCCDeviceSpecificReport extends ManufacturerSpecificCC {
	public constructor(
		options: WithAddress<ManufacturerSpecificCCDeviceSpecificReportOptions>,
	) {
		super(options);

		this.type = options.type;
		if (typeof options.deviceId === "string") {
			this.deviceId = options.deviceId;
		} else {
			this.deviceId = Bytes.from(options.deviceId);
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ManufacturerSpecificCCDeviceSpecificReport {
		validatePayload(raw.payload.length >= 2);
		const type: DeviceIdType = raw.payload[0] & 0b111;
		const dataFormat: DeviceIdDataFormat = raw.payload[1] >>> 5;
		const dataLength = raw.payload[1] & 0b11111;
		validatePayload(
			type === DeviceIdType.SerialNumber
				|| type === DeviceIdType.PseudoRandom,
			dataFormat === DeviceIdDataFormat.UTF8
				|| dataFormat === DeviceIdDataFormat.Binary,
			dataLength > 0,
			raw.payload.length >= 2 + dataLength,
		);
		const deviceIdData = raw.payload.subarray(2, 2 + dataLength);
		const deviceId: string | Bytes =
			dataFormat === DeviceIdDataFormat.UTF8
				? escapeControlCharacters(deviceIdData.toString("utf8"))
				: deviceIdData;

		return new this({
			nodeId: ctx.sourceNodeId,
			type,
			deviceId,
		});
	}

	public readonly type: DeviceIdType;

	public readonly deviceId: string | Bytes;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const deviceIdData =
			typeof this.deviceId === "string"
				? Bytes.from(this.deviceId, "utf8")
				: this.deviceId;

		const format =
			typeof this.deviceId === "string"
				? DeviceIdDataFormat.UTF8
				: DeviceIdDataFormat.Binary;
		const length = Math.min(deviceIdData.length, 0b11111);
		this.payload = Bytes.concat([
			[this.type & 0b111, (format << 5) | length],
			deviceIdData.subarray(0, length),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"device id type": getEnumMemberName(DeviceIdType, this.type),
				"device id":
					typeof this.deviceId === "string"
						? this.deviceId
						: logBuffer(this.deviceId),
			},
		};
	}
}

// @publicAPI
export interface ManufacturerSpecificCCDeviceSpecificGetOptions {
	deviceIdType: DeviceIdType;
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificGet)
@expectedCCResponse(ManufacturerSpecificCCDeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificGet extends ManufacturerSpecificCC {
	public constructor(
		options: WithAddress<ManufacturerSpecificCCDeviceSpecificGetOptions>,
	) {
		super(options);
		this.deviceIdType = options.deviceIdType;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ManufacturerSpecificCCDeviceSpecificGet {
		validatePayload(raw.payload.length >= 1);
		const deviceIdType: DeviceIdType = raw.payload[0] & 0b111;

		return new this({
			nodeId: ctx.sourceNodeId,
			deviceIdType,
		});
	}

	public deviceIdType: DeviceIdType;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([(this.deviceIdType || 0) & 0b111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"device id type": getEnumMemberName(
					DeviceIdType,
					this.deviceIdType,
				),
			},
		};
	}
}
