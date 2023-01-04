import { wait as _wait } from "alcalzone-shared/async";
import os from "os";
import path from "path";
import "reflect-metadata";
import { Driver } from "zwave-js";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";

const driver = new Driver(port, {
	// logConfig: {
	// 	logToFile: true,
	// 	forceConsole: true,
	// },
	securityKeys: {
		S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
		S2_Unauthenticated: Buffer.from(
			"5369389EFA18EE2A4894C7FB48347FEA",
			"hex",
		),
		S2_Authenticated: Buffer.from(
			"656EF5C0F020F3C14238C04A1748B7E1",
			"hex",
		),
		S2_AccessControl: Buffer.from(
			"31132050077310B6F7032F91C79C2EB8",
			"hex",
		),
	},
	storage: {
		cacheDir: path.join(__dirname, "cache"),
		lockDir: path.join(__dirname, "cache/locks"),
	},
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// Test code goes here
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });
