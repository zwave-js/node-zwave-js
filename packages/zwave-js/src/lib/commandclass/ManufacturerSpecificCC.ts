import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { DeviceIdType, ManufacturerSpecificCommand } from "./_Types";

export function getManufacturerIdValueId(): ValueID {
	return {
		commandClass: CommandClasses["Manufacturer Specific"],
		property: "manufacturerId",
	};
}

export function getProductTypeValueId(): ValueID {
	return {
		commandClass: CommandClasses["Manufacturer Specific"],
		property: "productType",
	};
}

export function getProductIdValueId(): ValueID {
	return {
		commandClass: CommandClasses["Manufacturer Specific"],
		property: "productId",
	};
}

export function getManufacturerIdValueMetadata(): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyUInt16,
		label: "Manufacturer ID",
	};
}

export function getProductTypeValueMetadata(): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyUInt16,
		label: "Product type",
	};
}

export function getProductIdValueMetadata(): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyUInt16,
		label: "Product ID",
	};
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Manufacturer Specific"])
export class ManufacturerSpecificCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: ManufacturerSpecificCommand): Maybe<boolean> {
		switch (cmd) {
			case ManufacturerSpecificCommand.Get:
				return true; // This is mandatory
			case ManufacturerSpecificCommand.DeviceSpecificGet:
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

		const cc = new ManufacturerSpecificCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ManufacturerSpecificCCReport>(
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
	): Promise<string | undefined> {
		this.assertSupportsCommand(
			ManufacturerSpecificCommand,
			ManufacturerSpecificCommand.DeviceSpecificGet,
		);

		const cc = new ManufacturerSpecificCCDeviceSpecificGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			deviceIdType,
		});
		const response =
			await this.driver.sendCommand<ManufacturerSpecificCCDeviceSpecificReport>(
				cc,
				this.commandOptions,
			);
		return response?.deviceId;
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

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses[
			"Manufacturer Specific"
		].withOptions({ priority: MessagePriority.NodeQuery });

		if (!node.isControllerNode) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Interviewing ${this.ccName}...`,
				direction: "none",
			});

			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying manufacturer information...",
				direction: "outbound",
			});
			const mfResp = await api.get();
			if (mfResp) {
				const logMessage = `received response for manufacturer information:
  manufacturer: ${
		this.host.configManager.lookupManufacturer(mfResp.manufacturerId) ||
		"unknown"
  } (${num2hex(mfResp.manufacturerId)})
  product type: ${num2hex(mfResp.productType)}
  product id:   ${num2hex(mfResp.productId)}`;
				driver.controllerLog.logNode(node.id, {
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 6);
		this._manufacturerId = this.payload.readUInt16BE(0);
		this._productType = this.payload.readUInt16BE(2);
		this._productId = this.payload.readUInt16BE(4);
		this.persistValues();
	}

	private _manufacturerId: number;
	@ccValue()
	@ccValueMetadata(getManufacturerIdValueMetadata())
	public get manufacturerId(): number {
		return this._manufacturerId;
	}

	private _productType: number;
	@ccValue()
	@ccValueMetadata(getProductTypeValueMetadata())
	public get productType(): number {
		return this._productType;
	}

	private _productId: number;
	@ccValue()
	@ccValueMetadata(getProductIdValueMetadata())
	public get productId(): number {
		return this._productId;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"manufacturer id": num2hex(this._manufacturerId),
				"product type": num2hex(this._productType),
				"product id": num2hex(this._productId),
			},
		};
	}
}

@CCCommand(ManufacturerSpecificCommand.Get)
@expectedCCResponse(ManufacturerSpecificCCReport)
export class ManufacturerSpecificCCGet extends ManufacturerSpecificCC {}

@CCCommand(ManufacturerSpecificCommand.DeviceSpecificReport)
export class ManufacturerSpecificCCDeviceSpecificReport extends ManufacturerSpecificCC {
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
		const deviceIdData = this.payload.slice(2, 2 + dataLength);
		this.deviceId =
			dataFormat === 0
				? deviceIdData.toString("utf8")
				: "0x" + deviceIdData.toString("hex");
		this.persistValues();
	}

	public persistValues(): boolean {
		const valueId: ValueID = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "deviceId",
			propertyKey: DeviceIdType[this.type],
		};
		this.getValueDB().setMetadata(valueId, {
			...ValueMetadata.ReadOnly,
			label: `Device ID (${valueId.propertyKey})`,
		});
		this.getValueDB().setValue(valueId, this.deviceId);
		return true;
	}

	public readonly type: DeviceIdType;
	public readonly deviceId: string;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"device id type": getEnumMemberName(DeviceIdType, this.type),
				"device id": this.deviceId,
			},
		};
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"device id type": getEnumMemberName(
					DeviceIdType,
					this.deviceIdType,
				),
			},
		};
	}
}
