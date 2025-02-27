import { wait as _wait } from "alcalzone-shared/async";
import path from "node:path";
import "reflect-metadata";
import { Bytes } from "@zwave-js/shared/safe";
import { fileURLToPath } from "node:url";
import { Driver, RFRegion } from "zwave-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const wait = _wait;

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
const port_primary =
	"/dev/serial/by-id/usb-Zooz_800_Z-Wave_Stick_533D004242-if00";
const port_secondary =
	"/dev/serial/by-id/usb-Silicon_Labs_CP2102N_USB_to_UART_Bridge_Controller_ca4d95064355ee118d4d1294de9da576-if00-port0";

// let pin: string | undefined;

const driver_primary = new Driver(port_primary, {
	logConfig: {
		filename: "test/primary_%DATE%.log",
		logToFile: true,
		forceConsole: true,
	},
	testingHooks: {
		skipNodeInterview: true,
	},
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
		// preferLRRegion: false,
		region: RFRegion.Europe,
	},
	storage: {
		cacheDir: path.join(__dirname, "cache"),
		lockDir: path.join(__dirname, "cache/locks"),
	},
	bootloaderMode: "allow",
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// Test code goes here
		// await wait(1000);
		// await driver_primary.hardReset();
		// await wait(5000);
		// await driver_primary.controller.beginInclusion({
		// 	strategy: InclusionStrategy.Default,
		// 	userCallbacks: {
		// 		abort() {},
		// 		async grantSecurityClasses(requested) {
		// 			return {
		// 				clientSideAuth: false,
		// 				securityClasses: [
		// 					SecurityClass.S0_Legacy,
		// 					SecurityClass.S2_Unauthenticated,
		// 					SecurityClass.S2_Authenticated,
		// 					SecurityClass.S2_AccessControl,
		// 				],
		// 			};
		// 		},
		// 		async validateDSKAndEnterPIN(dsk) {
		// 			// Try to read PIN from the file pin.txt
		// 			for (let i = 0; i < 100; i++) {
		// 				if (typeof pin === "string" && pin?.length === 5) {
		// 					return pin;
		// 				}
		// 				await wait(1000);
		// 			}
		// 			return false;
		// 		},
		// 	},
		// });
	})
	.once("bootloader ready", async () => {
		// What to do when stuck in the bootloader
	});
void driver_primary.start();

// ===

const driver_secondary = new Driver(port_secondary, {
	logConfig: {
		filename: "test/secondary_%DATE%.log",
		logToFile: true,
	},
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
		// preferLRRegion: false,
		region: RFRegion.Europe,
	},
	storage: {
		cacheDir: path.join(__dirname, "cache2"),
		lockDir: path.join(__dirname, "cache2/locks"),
	},
	bootloaderMode: "allow",
	// joinNetworkUserCallbacks: {
	// 	showDSK(dsk) {
	// 		pin = dsk.split("-")[0];
	// 	},
	// 	done() {
	// 		pin = undefined;
	// 	},
	// },
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// Test code goes here
		// await wait(5000);
		// await driver_secondary.hardReset();
		// await wait(5000);
		// await driver_secondary.controller.beginJoiningNetwork();
	})
	.once("bootloader ready", async () => {
		// What to do when stuck in the bootloader
	});
void driver_secondary.start();

process.on("SIGINT", async () => {
	await driver_primary.destroy();
	await driver_secondary.destroy();
});
