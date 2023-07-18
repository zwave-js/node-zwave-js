import { isZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { wait } from "alcalzone-shared/async";
import fs from "fs-extra";
import path from "path";
import yargs from "yargs";
import {
	ControllerFirmwareUpdateStatus,
	Driver,
	extractFirmware,
	getEnumMemberName,
	guessFirmwareFileFormat,
} from "zwave-js";

const argv = yargs.parseSync();
const [port, filename] = argv._.map(String);

if (!port || !filename) {
	console.error("Usage: flasher <port> <filename>");
	process.exit(1);
}

const verbose = !!argv.verbose;

let firmware: Buffer;

const driver = new Driver(port, {
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
		cacheDir: path.join(__dirname, "cache"),
		lockDir: path.join(__dirname, "cache/locks"),
	},
	allowBootloaderOnly: true,
})
	.on("error", (e) => {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.Driver_Failed) {
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
	if (verbose) return;
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
			console.log(
				`Flashing firmware... ${rounded.toString().padStart(3, " ")}%`,
			);
		}
	});
	driver.controller.on("firmware update finished", async (r) => {
		if (r.success) {
			console.log("Firmware update successful");
			await wait(1000);
			process.exit(0);
		} else {
			console.log(
				`Firmware update failed: ${getEnumMemberName(
					ControllerFirmwareUpdateStatus,
					r.status,
				)}`,
			);
			await wait(1000);
			process.exit(2);
		}
	});

	try {
		await driver.controller.firmwareUpdateOTW(firmware);
	} catch (e: any) {
		console.error("Failed to update firmware:", e.message);
		process.exit(1);
	}
}

async function main() {
	let rawFile: Buffer;
	try {
		const fullPath = path.isAbsolute(filename)
			? filename
			: path.join(process.cwd(), filename);
		rawFile = await fs.readFile(fullPath);
	} catch (e: any) {
		console.error("Could not read firmware file:", e.message);
		process.exit(1);
	}

	try {
		const format = guessFirmwareFileFormat(filename, rawFile);
		firmware = extractFirmware(rawFile, format).data;
	} catch (e: any) {
		console.error("Could not parse firmware file:", e.message);
		process.exit(1);
	}

	try {
		console.log("Starting driver...");
		await driver.start();
	} catch (e: any) {
		console.error("The Z-Wave driver could not be started:", e.message);
		process.exit(1);
	}
}

void main().catch(console.error);
