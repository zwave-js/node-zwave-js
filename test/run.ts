import os from "os";
import path from "path";
import "reflect-metadata";
import { Driver } from "zwave-js";

process.on("unhandledRejection", (_r) => {
	debugger;
});

const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";

const driver = new Driver(port, {
	// logConfig: {
	// 	logToFile: true,
	// },
	securityKeys: {
		S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
		S2_Unauthenticated: Buffer.from(
			"5F103E487B11BE72EE5ED3F6961B0B46",
			"hex",
		),
		S2_Authenticated: Buffer.from(
			"7666D813DEB4DD0FFDE089A38E883699",
			"hex",
		),
		S2_AccessControl: Buffer.from(
			"92901F4D820FF38A999A751914D1A2BA",
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
		// Test code
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });
