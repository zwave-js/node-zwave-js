/// <reference types="node" />
import type { Firmware, FirmwareFileFormat } from "./_Types";
/**
 * Guess the firmware format based on filename and firmware buffer
 *
 * @param filename The firmware filename
 * @param rawData A buffer containing the original firmware update file
 */
export declare function guessFirmwareFileFormat(filename: string, rawData: Buffer): FirmwareFileFormat;
/**
 * Extracts the firmware data from a file. The following formats are available:
 * - `"aeotec"` - A Windows executable (.exe or .ex_) that contains Aeotec's upload tool
 * - `"otz"` - A compressed firmware file in Intel HEX format
 * - `"ota"` or `"hex"` - An uncompressed firmware file in Intel HEX format
 * - `"hec"` - An encrypted Intel HEX firmware file
 * - `"gecko"` - A binary gecko bootloader firmware file with `.gbl` extension
 *
 * The returned firmware data and target can be used to start a firmware update process with `node.beginFirmwareUpdate`
 */
export declare function extractFirmware(rawData: Buffer, format: FirmwareFileFormat): Firmware;
//# sourceMappingURL=firmware.d.ts.map