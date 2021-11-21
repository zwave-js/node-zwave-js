// To test with Sentry reporting:
// import { Driver } from "../packages/zwave-js";

// To test without Sentry reporting
import { wait } from "alcalzone-shared/async";
import path from "path";
import "reflect-metadata";
import { Driver } from "../packages/zwave-js/src/lib/driver/Driver";

process.on("unhandledRejection", (_r) => {
	debugger;
});

const driver = new Driver("COM5", {
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
		await wait(2500);
		const health = await driver.controller.nodes
			.getOrThrow(2)
			.checkRouteHealth(3, 3, (n, t, r) => {
				console.debug(`Health check round ${n}/${t}: rating = ${r}`);
			});

		await wait(100);
		process.exit(0);
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });
