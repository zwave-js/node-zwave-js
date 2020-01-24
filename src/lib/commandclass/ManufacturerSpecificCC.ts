import { lookupManufacturer } from "../config/Manufacturers";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { MessagePriority } from "../message/Constants";
import type { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { ValueMetadata } from "../values/Metadata";
import type { Maybe } from "../values/Primitive";
import { CCAPI } from "./API";
import { API, CCCommand, CCCommandOptions, ccValue, ccValueMetadata, CommandClass, commandClass, CommandClassDeserializationOptions, expectedCCResponse, gotDeserializationOptions, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ManufacturerSpecificCommand {
	Get = 0x04,
	Report = 0x05,
	DeviceSpecificGet = 0x06,
	DeviceSpecificReport = 0x07,
}

export enum DeviceIdType {
	FactoryDefault = 0x00,
	SerialNumber = 0x01,
	PseudoRandom = 0x02,
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCCAPI extends CCAPI {
	public supportsCommand(cmd: ManufacturerSpecificCommand): Maybe<boolean> {
		switch (cmd) {
			case ManufacturerSpecificCommand.Get:
				return true; // This is mandatory
			case ManufacturerSpecificCommand.DeviceSpecificGet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.Get,
		);

		const cc = new ManufacturerSpecificCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			ManufacturerSpecificCCReport
		>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return {
			manufacturerId: response.manufacturerId,
			productType: response.productType,
			productId: response.productId,
		};
	}

	public async deviceSpecificGet(
		deviceIdType: DeviceIdType,
	): Promise<string> {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.DeviceSpecificGet,
		);

		const cc = new ManufacturerSpecificCCDeviceSpecificGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			deviceIdType,
		});
		const response = (await this.driver.sendCommand<
			ManufacturerSpecificCCDeviceSpecificReport
		>(cc))!;
		return response.deviceId;
	}
}

@commandClass(CommandClasses["Manufacturer Specific"])
@implementedVersion(2)
export class ManufacturerSpecificCC extends CommandClass {
	declare ccCommand: ManufacturerSpecificCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// The Manufacturer Specific CC MUST be interviewed first
		return [];
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Manufacturer Specific"];

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
				} interview...`,
			direction: "none",
		});

		// manufacturer information is static
		if (complete) {
			if (node.isControllerNode()) {
				log.controller.logNode(
					node.id,
					"not querying manufacturer information from the controller...",
				);
			} else {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "querying manufacturer information...",
					direction: "outbound",
				});
				const mfResp = await api.get();
				const logMessage = `received response for manufacturer information:
  manufacturer: ${lookupManufacturer(mfResp.manufacturerId) ||
					"unknown"} (${num2hex(mfResp.manufacturerId)})
  product type: ${num2hex(mfResp.productType)}
  product id:   ${num2hex(mfResp.productId)}`;
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(ManufacturerSpecificCommand.Report)
export class ManufacturerSpecificCCReport extends ManufacturerSpecificCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 6);
		this._manufacturerId = this.payload.readUInt16BE(0);
		this._productType = this.payload.readUInt16BE(2);
		this._productId = this.payload.readUInt16BE(4);
		this.persistValues();
	}

	private _manufacturerId: number;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt16,
		label: "Manufacturer ID",
	})
	public get manufacturerId(): number {
		return this._manufacturerId;
	}

	private _productType: number;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt16,
		label: "Product type",
	})
	public get productType(): number {
		return this._productType;
	}

	private _productId: number;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt16,
		label: "Product ID",
	})
	public get productId(): number {
		return this._productId;
	}
}

@CCCommand(ManufacturerSpecificCommand.Get)
@expectedCCResponse(ManufacturerSpecificCCReport)
export class ManufacturerSpecificCCGet extends ManufacturerSpecificCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificReport extends ManufacturerSpecificCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0] & 0b111;
		const dataFormat = this.payload[1] >>> 5;
		const dataLength = this.payload[1] & 0b11111;

		validatePayload(dataLength > 0, this.payload.length >= 2 + dataLength);
		const deviceIdData = this.payload.slice(2, 2 + dataLength);
		this._deviceId =
			dataFormat === 0
				? deviceIdData.toString("utf8")
				: "0x" + deviceIdData.toString("hex");

		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "deviceId",
			propertyKey: DeviceIdType[this._type],
		};
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.ReadOnly,
			label: `Device ID (${valueId.propertyKey})`,
		});
		this.getValueDB().setValue(valueId, this._deviceId);
	}

	private _type: DeviceIdType;
	public get type(): DeviceIdType {
		return this._type;
	}

	private _deviceId: string;
	public get deviceId(): string {
		return this._deviceId;
	}
}

interface ManufacturerSpecificCCDeviceSpecificGetOptions
	extends CCCommandOptions {
	deviceIdType: DeviceIdType;
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificGet)
@expectedCCResponse(ManufacturerSpecificCCDeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificGet extends ManufacturerSpecificCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ManufacturerSpecificCCDeviceSpecificGetOptions,
	) {
		super(driver, options);
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
}
