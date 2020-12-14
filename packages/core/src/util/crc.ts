// Implementation based on SDS13782
export function CRC16_CCITT(data: Buffer, startValue: number = 0x1d0f): number {
	let crc = startValue;
	const poly = 0x1021;

	// wotan-disable-next-line prefer-for-of
	for (let i = 0; i < data.length; i++) {
		for (let bitMask = 0x80; bitMask !== 0; bitMask >>= 1) {
			const xorFlag = !!(data[i] & bitMask) !== !!(crc & 0x8000);
			crc <<= 1;

			if (xorFlag) crc ^= poly;
		}
	}
	return crc & 0xffff;
}
