import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../../message/Message";

export interface ExtNVMWriteLongByteRequestOptions extends MessageBaseOptions {
	offset: number;
	byte: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtExtWriteLongByte)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtExtWriteLongByte)
export class ExtNVMWriteLongByteRequest extends Message {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| ExtNVMWriteLongByteRequestOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.offset < 0 || options.offset > 0xffffff) {
				throw new ZWaveError(
					"The offset must be a 24-bit number!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if ((options.byte & 0xff) !== options.byte) {
				throw new ZWaveError(
					"The data must be a byte!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.offset = options.offset;
			this.byte = options.byte;
		}
	}

	public offset: number;
	public byte: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(4);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload[3] = this.byte;
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				offset: num2hex(this.offset),
				byte: num2hex(this.byte),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.ExtExtWriteLongByte)
export class ExtNVMWriteLongByteResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.success = this.payload[0] !== 0;
	}

	public readonly success: boolean;

	public isOK(): boolean {
		return this.success;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				success: this.success,
			},
		};
	}
}
