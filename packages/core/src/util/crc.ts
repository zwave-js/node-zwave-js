import {
	CRC16_CCITT as CRC16_CCITT_native,
	CRC16_CCITT_FE95,
} from "@zwave-js/crc16-ccitt";
import { num2hex } from "@zwave-js/shared";
import { ZWaveError, ZWaveErrorCodes } from "..";

export function CRC16_CCITT(data: Buffer, startValue: number = 0x1d0f): number {
	// Use native CRC implementations for better performance
	if (startValue === 0x1d0f) return CRC16_CCITT_native(data);
	else if (startValue === 0xfe95) return CRC16_CCITT_FE95(data);

	throw new ZWaveError(
		`Unsupported CRC16 start value ${num2hex(startValue)}`,
		ZWaveErrorCodes.Argument_Invalid,
	);
	// let crc = startValue;
	// const poly = 0x1021;

	// for (let i = 0; i < data.length; i++) {
	// 	for (let bitMask = 0x80; bitMask !== 0; bitMask >>= 1) {
	// 		const xorFlag = !!(data[i] & bitMask) !== !!(crc & 0x8000);
	// 		crc <<= 1;

	// 		if (xorFlag) crc ^= poly;
	// 	}
	// }
	// return crc & 0xffff;
}
