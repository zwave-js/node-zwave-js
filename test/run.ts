import { wait as _wait } from "alcalzone-shared/async";
import fs from "fs/promises";
import os from "os";
import path from "path";
import "reflect-metadata";
import { Driver } from "zwave-js";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

// 500/700 series
// const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";
// 800 series
const port = os.platform() === "win32" ? "COM5" : "/dev/ttyACM0";

const driver = new Driver(port, {
	// logConfig: {
	// 	logToFile: true,
	// 	forceConsole: true,
	// },
	// testingHooks: {
	// 	skipNodeInterview: true,
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
	allowBootloaderOnly: true,
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// Test code goes here
		// await wait(2000);
		const node11 = driver.controller.nodes.getOrThrow(11);
		// const node12 = driver.controller.nodes.getOrThrow(11);

		driver.on("all nodes ready", async () => {
			console.log("nodes ready");

			// Sync the SPAN state beforehand, to trigger SOS plus MOS at once
			await node11.commandClasses["Binary Switch"].set(false);
			// now put it out of sync
			for (let i = 1; i < 10; i++) driver.securityManager2?.nextNonce(11);
			// // await node12.commandClasses["Binary Switch"].set(false);

			const grp = driver.controller.getMulticastGroupS2([11, 11]);
			// await wait(1000);
			// await grp.commandClasses["Binary Switch"].set(true);

			await wait(5000);

			console.log();
			console.log();
			console.log("BEGIN TEST");
			console.log();
			console.log();

			await fs.writeFile(path.join(__dirname, "zwavejs_current.log"), "");

			// await wait(200);
			await grp.commandClasses["Binary Switch"].set(false);
			await wait(100);
			await grp.commandClasses["Binary Switch"].set(true);

			// await wait(100);
			// await grp.commandClasses["Binary Switch"].set(false);
			// await wait(100);
			// await grp.commandClasses["Binary Switch"].set(true);
		});
	})
	.once("bootloader ready", async () => {
		// What to do when stuck in the bootloader
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });
