"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bootloader = exports.BootloaderState = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
var BootloaderState;
(function (BootloaderState) {
    BootloaderState[BootloaderState["Menu"] = 0] = "Menu";
    BootloaderState[BootloaderState["UploadingFirmware"] = 1] = "UploadingFirmware";
})(BootloaderState = exports.BootloaderState || (exports.BootloaderState = {}));
/** Encapsulates information about the currently active bootloader */
class Bootloader {
    constructor(writeSerial, version, options) {
        this.writeSerial = writeSerial;
        this.version = version;
        this.state = BootloaderState.Menu;
        const uploadOption = options.find((o) => o.option === "upload gbl")?.num;
        if (!uploadOption) {
            throw new core_1.ZWaveError("The bootloader does not support uploading a GBL file!", core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        this.uploadOption = uploadOption;
        const runOption = options.find((o) => o.option === "run")?.num;
        if (!runOption) {
            throw new core_1.ZWaveError("Could not find run option in bootloader menu!", core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        this.runOption = runOption;
    }
    async beginUpload() {
        await this.writeSerial(Buffer.from(this.uploadOption.toString(), "ascii"));
    }
    async runApplication() {
        await this.writeSerial(Buffer.from(this.runOption.toString(), "ascii"));
    }
    async uploadFragment(fragmentNumber, data) {
        const command = Buffer.concat([
            Buffer.from([
                serial_1.XModemMessageHeaders.SOF,
                fragmentNumber & 0xff,
                0xff - (fragmentNumber & 0xff),
            ]),
            data,
            Buffer.allocUnsafe(2),
        ]);
        command.writeUint16BE((0, core_1.CRC16_CCITT)(data, 0x0000), command.length - 2);
        await this.writeSerial(command);
    }
    async finishUpload() {
        await this.writeSerial(Buffer.from([serial_1.XModemMessageHeaders.EOT]));
    }
}
exports.Bootloader = Bootloader;
//# sourceMappingURL=Bootloader.js.map