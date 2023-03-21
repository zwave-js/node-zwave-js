"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const safe_1 = require("@zwave-js/core/safe");
const async_1 = require("alcalzone-shared/async");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const zwave_js_1 = require("zwave-js");
const argv = yargs_1.default.parseSync();
const [port, filename] = argv._.map(String);
if (!port || !filename) {
    console.error("Usage: flasher <port> <filename>");
    process.exit(1);
}
const verbose = !!argv.verbose;
let firmware;
const driver = new zwave_js_1.Driver(port, {
    logConfig: verbose
        ? {
            enabled: true,
            level: "silly",
        }
        : { enabled: false },
    testingHooks: {
        skipNodeInterview: true,
        loadConfiguration: false,
    },
    storage: {
        cacheDir: path_1.default.join(__dirname, "cache"),
        lockDir: path_1.default.join(__dirname, "cache/locks"),
    },
    allowBootloaderOnly: true,
})
    .on("error", (e) => {
    if ((0, safe_1.isZWaveError)(e) && e.code === safe_1.ZWaveErrorCodes.Driver_Failed) {
        process.exit(0);
    }
})
    .once("driver ready", async () => {
    await flash();
})
    .once("bootloader ready", async () => {
    await flash();
});
function clearLastLine() {
    if (verbose)
        return;
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
}
async function flash() {
    console.log("Flashing firmware...");
    let lastProgress = 0;
    driver.controller.on("firmware update progress", (p) => {
        const rounded = Math.round(p.progress);
        if (rounded > lastProgress) {
            lastProgress = rounded;
            clearLastLine();
            console.log(`Flashing firmware... ${rounded.toString().padStart(3, " ")}%`);
        }
    });
    driver.controller.on("firmware update finished", async (r) => {
        if (r.success) {
            console.log("Firmware update successful");
            await (0, async_1.wait)(1000);
            process.exit(0);
        }
        else {
            console.log(`Firmware update failed: ${(0, zwave_js_1.getEnumMemberName)(zwave_js_1.ControllerFirmwareUpdateStatus, r.status)}`);
            await (0, async_1.wait)(1000);
            process.exit(2);
        }
    });
    try {
        await driver.controller.firmwareUpdateOTW(firmware);
    }
    catch (e) {
        console.error("Failed to update firmware:", e.message);
        process.exit(1);
    }
}
async function main() {
    let rawFile;
    try {
        const fullPath = path_1.default.isAbsolute(filename)
            ? filename
            : path_1.default.join(process.cwd(), filename);
        rawFile = await fs_extra_1.default.readFile(fullPath);
    }
    catch (e) {
        console.error("Could not read firmware file:", e.message);
        process.exit(1);
    }
    try {
        const format = (0, zwave_js_1.guessFirmwareFileFormat)(filename, rawFile);
        firmware = (0, zwave_js_1.extractFirmware)(rawFile, format).data;
    }
    catch (e) {
        console.error("Could not parse firmware file:", e.message);
        process.exit(1);
    }
    try {
        console.log("Starting driver...");
        await driver.start();
    }
    catch (e) {
        console.error("The Z-Wave driver could not be started:", e.message);
        process.exit(1);
    }
}
void main().catch(console.error);
//# sourceMappingURL=cli.js.map