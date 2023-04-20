"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRC16_CCITT = void 0;
// Implementation based on SDS13782
function CRC16_CCITT(data, startValue = 0x1d0f) {
    let crc = startValue;
    const poly = 0x1021;
    for (let i = 0; i < data.length; i++) {
        for (let bitMask = 0x80; bitMask !== 0; bitMask >>= 1) {
            const xorFlag = !!(data[i] & bitMask) !== !!(crc & 0x8000);
            crc <<= 1;
            if (xorFlag)
                crc ^= poly;
        }
    }
    return crc & 0xffff;
}
exports.CRC16_CCITT = CRC16_CCITT;
//# sourceMappingURL=crc.js.map