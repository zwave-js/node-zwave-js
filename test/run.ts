import { TransactionState } from "@zwave-js/core";
import { wait as _wait } from "alcalzone-shared/async";
import path from "path";
import "reflect-metadata";
import { Driver, getEnumMemberName } from "zwave-js";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

const port = "tcp://Z-Net-R2v2.local:2001";
// 500/700 series
// const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";
// 800 series
// const port = os.platform() === "win32" ? "COM5" : "/dev/ttyACM0";

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

		const node = driver.controller.nodes.get(12)!;
		node.once("ready", async () => {
			await wait(3000);
			await node.commandClasses["No Operation"]
				.withOptions({
					onProgress: (progress) => {
						console.log(
							getEnumMemberName(TransactionState, progress.state),
						);
					},
				}).send();
			console.log("promise resolved");
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
