import { lookupManufacturer } from "../config/Manufacturers";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { MessagePriority } from "../message/Constants";
import { ZWaveNode } from "../node/Node";
import { validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { ValueMetadata } from "../values/Metadata";
import { Maybe } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
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

@API(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
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
		const cc = new ManufacturerSpecificCCDeviceSpecificGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			deviceIdType,
		});
		const response = (await this.driver.sendCommand<
			ManufacturerSpecificCCDeviceSpecificReport
		>(cc))!;
		return response.value;
	}
}

export interface ManufacturerSpecificCC {
	ccCommand: ManufacturerSpecificCommand;
}

@commandClass(CommandClasses["Manufacturer Specific"])
@implementedVersion(2)
export class ManufacturerSpecificCC extends CommandClass {
	public supportsCommand(cmd: ManufacturerSpecificCommand): Maybe<boolean> {
		switch (cmd) {
			case ManufacturerSpecificCommand.Get:
				return true; // This is mandatory
			case ManufacturerSpecificCommand.DeviceSpecificGet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	public static async interview(
		driver: IDriver,
		node: ZWaveNode,
	): Promise<void> {
		if (node.isControllerNode()) {
			log.controller.logNode(
				node.id,
				"not querying manufacturer information from the controller...",
			);
		} else {
			log.controller.logNode(node.id, {
				message: "querying manufacturer information...",
				direction: "outbound",
			});
			const mfResp = await node.commandClasses[
				"Manufacturer Specific"
			].get();
			const logMessage = `received response for manufacturer information:
  manufacturer: ${(await lookupManufacturer(mfResp.manufacturerId)) ||
		"unknown"} (${num2hex(mfResp.manufacturerId)})
  product type: ${num2hex(mfResp.productType)}
  product id:   ${num2hex(mfResp.productId)}`;
			log.controller.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(node, true);
	}
}

@CCCommand(ManufacturerSpecificCommand.Report)
export class ManufacturerSpecificCCReport extends ManufacturerSpecificCC {
	public constructor(
		driver: IDriver,
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
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificReport extends ManufacturerSpecificCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		const deviceIdType = this.payload[0] & 0b111;
		const dataFormat = this.payload[1] >>> 5;
		const dataLength = this.payload[1] & 0b11111;

		validatePayload(dataLength > 0, this.payload.length >= 2 + dataLength);
		const deviceIdData = this.payload.slice(2, 2 + dataLength);
		const deviceId =
			dataFormat === 0
				? deviceIdData.toString("utf8")
				: "0x" + deviceIdData.toString("hex");
		this.deviceId = [deviceIdType, deviceId];
		this.persistValues();
	}

	@ccKeyValuePair()
	private deviceId: [DeviceIdType, string];

	public get deviceIdType(): DeviceIdType {
		return this.deviceId[0];
	}

	public get value(): string {
		return this.deviceId[1];
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
		driver: IDriver,
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
