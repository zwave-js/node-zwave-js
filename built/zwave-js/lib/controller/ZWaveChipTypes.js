"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChipTypeAndVersion = exports.getZWaveChipType = void 0;
const chipTypes = Object.freeze({
    [0x0102]: "ZW0102",
    [0x0201]: "ZW0201",
    [0x0301]: "ZW0301",
    [0x0401]: "ZM0401 / ZM4102 / SD3402",
    [0x0500]: "ZW050x",
    [0x0700]: "EFR32ZG14 / ZGM130S",
    [0x0800]: "EFR32ZG23 / ZGM230S",
});
function getZWaveChipType(type, version) {
    return (chipTypes[(type << 8) | version] ?? {
        type,
        version,
    });
}
exports.getZWaveChipType = getZWaveChipType;
function getChipTypeAndVersion(zWaveChipType) {
    for (const [id, name] of Object.entries(chipTypes)) {
        if (name === zWaveChipType) {
            const idNum = parseInt(id);
            return {
                type: idNum >>> 8,
                version: idNum & 0xff,
            };
        }
    }
}
exports.getChipTypeAndVersion = getChipTypeAndVersion;
//# sourceMappingURL=ZWaveChipTypes.js.map