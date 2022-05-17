import type { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";

export enum NVMType {
	Flash = 0x80,
	DataFlash = 0x81,
	EEPROM = 0xff, // (probably)
}

export enum NVMSize {
	"16KB" = 0x0e,
	"32KB" = 0x0f,
	"64KB" = 0x10,
	"128KB" = 0x11,
	"256KB" = 0x12,
	"512KB" = 0x13,
	"1MB" = 0x14,
	"2MB" = 0x15,
	"4MB" = 0x16,
	"8MB" = 0x17,
	"16MB" = 0x18,
	Unknown = 0xff, // Unknown NVM type, size could not be determined
}

export function nvmSizeToBufferSize(size: NVMSize): number | undefined {
	switch (size) {
		case NVMSize["16KB"]:
			return 16 * 1024;
		case NVMSize["32KB"]:
			return 32 * 1024;
		case NVMSize["64KB"]:
			return 64 * 1024;
		case NVMSize["128KB"]:
			return 128 * 1024;
		case NVMSize["256KB"]:
			return 256 * 1024;
		case NVMSize["512KB"]:
			return 512 * 1024;
		case NVMSize["1MB"]:
			return 1 * 1024 * 1024;
		case NVMSize["2MB"]:
			return 2 * 1024 * 1024;
		case NVMSize["4MB"]:
			return 4 * 1024 * 1024;
		case NVMSize["8MB"]:
			return 8 * 1024 * 1024;
		case NVMSize["16MB"]:
			return 16 * 1024 * 1024;
		default:
			return undefined;
	}
}

export type NVMId = Pick<
	GetNVMIdResponse,
	"nvmManufacturerId" | "memoryType" | "memorySize"
>;

@messageTypes(MessageType.Request, FunctionType.GetNVMId)
@expectedResponse(FunctionType.GetNVMId)
@priority(MessagePriority.Controller)
export class GetNVMIdRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetNVMId)
export class GetNVMIdResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.nvmManufacturerId = this.payload[1];
		this.memoryType = this.payload[2];
		this.memorySize = this.payload[3];
	}

	public readonly nvmManufacturerId: number;
	public readonly memoryType: NVMType;
	public readonly memorySize: NVMSize;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				manufacturer: num2hex(this.nvmManufacturerId),
				"memory type": getEnumMemberName(NVMType, this.memoryType),
				"memory size": getEnumMemberName(NVMSize, this.memorySize),
			},
		};
	}
}
