import os from "os";
import path from "path";
import "reflect-metadata";
import { Driver } from "zwave-js";

process.on("unhandledRejection", (_r) => {
	debugger;
});

const zwavepath =
	os.platform() === "win32"
		? "COM5"
		: "/dev/serial/by-id/usb-Silicon_Labs_CP2102N_USB_to_UART_Bridge_Controller_8ad925bd7b84e911a7a7a1d6217343c2-if00-port0";

const driver = new Driver(zwavepath, {
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
