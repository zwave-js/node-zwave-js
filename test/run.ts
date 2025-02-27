import { wait as _wait } from "alcalzone-shared/async";
import path from "node:path";
import "reflect-metadata";
import { Bytes } from "@zwave-js/shared/safe";
import _os from "node:os";
import { fileURLToPath } from "node:url";
import { Driver } from "zwave-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const wait = _wait;
const os = _os;

process.on("unhandledRejection", (_r) => {
	debugger;
});

// const port = "tcp://Z-Net-R2v2.local:2001";
// 500/700 series
// const port = require("node:os").platform() === "win32"
// 	? "COM5"
// 	: "/dev/ttyACM0";
// const port = require("os").platform() === "win32" ? "COM5" : "/dev/ttyUSB0";
// 800 series
const port = os.platform() === "win32"
	? "COM5"
	: "/dev/serial/by-id/usb-Zooz_800_Z-Wave_Stick_533D004242-if00";
// const port = "tcp://127.0.0.1:5555";

const driver = new Driver(port, {
	// logConfig: {
	// 	logToFile: true,
	// 	forceConsole: true,
	// },
	// testingHooks: {
	// 	skipNodeInterview: true,
	// },
	securityKeys: {
		S0_Legacy: Bytes.from("0102030405060708090a0b0c0d0e0f10", "hex"),
		S2_Unauthenticated: Bytes.from(
			"5369389EFA18EE2A4894C7FB48347FEA",
			"hex",
		),
		S2_Authenticated: Bytes.from(
			"656EF5C0F020F3C14238C04A1748B7E1",
			"hex",
		),
		S2_AccessControl: Bytes.from(
			"31132050077310B6F7032F91C79C2EB8",
			"hex",
		),
	},
	securityKeysLongRange: {
		S2_Authenticated: Bytes.from(
			"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
			"hex",
		),
		S2_AccessControl: Bytes.from(
			"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
			"hex",
		),
	},
	rf: {
		preferLRRegion: false,
	},
	storage: {
		cacheDir: path.join(__dirname, "cache"),
		lockDir: path.join(__dirname, "cache/locks"),
		deviceConfigExternalDir: path.join(__dirname, "config"),
	},
	bootloaderMode: "allow",
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// Test code goes here
	})
	.once("bootloader ready", async () => {
		// What to do when stuck in the bootloader
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });

process.on("SIGINT", async () => {
	await driver.destroy();
});
