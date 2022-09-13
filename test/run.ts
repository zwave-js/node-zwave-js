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
		// setTimeout(
		// 	() => driver.controller.nodes.getOrThrow(2).refreshInfo(),
		// 	2500,
		// );
		// Test code
		// await wait(1000);
		// const updates = await driver.controller.getAvailableFirmwareUpdates(10);
		// console.log("Found updates:");
		// console.dir(updates, { depth: Infinity });
		// await wait(1000);
		// try {
		// 	console.log(`Installing update ${updates[0].version}...`);
		// 	await wait(1000);
		// 	await driver.controller.beginOTAFirmwareUpdate(
		// 		2,
		// 		updates[0].files[0],
		// 	);
		// } catch (e) {
		// 	console.error(e);
		// }
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });
