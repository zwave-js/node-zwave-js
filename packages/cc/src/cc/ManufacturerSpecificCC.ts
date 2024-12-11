import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import type {
	GetValueDB,
	MessageOrCCLogEntry,
	WithAddress,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
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
import { DeviceIdType, ManufacturerSpecificCommand } from "../lib/_Types.js";

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

		const cc = new ManufacturerSpecificCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

		const cc = new ManufacturerSpecificCCDeviceSpecificGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			deviceIdType,
		});
		const response = await this.host.sendCommand<
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

		const cc = new ManufacturerSpecificCCReport({
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Manufacturer Specific"],
			ctx,
			endpoint,
		).withOptions({ priority: MessagePriority.NodeQuery });

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
				const logMessage =
					`received response for manufacturer information:
  manufacturer: ${
						ctx.lookupManufacturer(
							mfResp.manufacturerId,
						)
						|| "unknown"
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

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = new Bytes(6);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.productType, 2);
		this.payload.writeUInt16BE(this.productId, 4);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
	deviceId: string;
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificReport)
@ccValueProperty(
	"deviceId",
	ManufacturerSpecificCCValues.deviceId,
	(self) => [self.type],
)
export class ManufacturerSpecificCCDeviceSpecificReport
	extends ManufacturerSpecificCC
{
	public constructor(
		options: WithAddress<ManufacturerSpecificCCDeviceSpecificReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.type = options.type;
		this.deviceId = options.deviceId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ManufacturerSpecificCCDeviceSpecificReport {
		validatePayload(raw.payload.length >= 2);
		const type: DeviceIdType = raw.payload[0] & 0b111;
		const dataFormat = raw.payload[1] >>> 5;
		const dataLength = raw.payload[1] & 0b11111;
		validatePayload(dataLength > 0, raw.payload.length >= 2 + dataLength);
		const deviceIdData = raw.payload.subarray(2, 2 + dataLength);
		const deviceId: string = dataFormat === 0
			? deviceIdData.toString("utf8")
			: "0x" + deviceIdData.toString("hex");

		return new this({
			nodeId: ctx.sourceNodeId,
			type,
			deviceId,
		});
	}

	public readonly type: DeviceIdType;

	public readonly deviceId: string;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"device id type": getEnumMemberName(DeviceIdType, this.type),
				"device id": this.deviceId,
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
export class ManufacturerSpecificCCDeviceSpecificGet
	extends ManufacturerSpecificCC
{
	public constructor(
		options: WithAddress<ManufacturerSpecificCCDeviceSpecificGetOptions>,
	) {
		super(options);
		this.deviceIdType = options.deviceIdType;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): ManufacturerSpecificCCDeviceSpecificGet {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ManufacturerSpecificCCDeviceSpecificGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public deviceIdType: DeviceIdType;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([(this.deviceIdType || 0) & 0b111]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
