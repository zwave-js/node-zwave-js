import path from "path";
import type winston from "winston";
import { Driver } from "zwave-js";

export async function startDriver(
	port: string,
	logTransport: winston.transport,
): Promise<Driver> {
	const driver = new Driver(port, {
		logConfig: {
			// Do not log to console or file
			enabled: false,
			// But log to our own transport
			transports: [logTransport],
		},
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
		})
		.once("bootloader ready", async () => {
			// What to do when stuck in the bootloader
		});
	await driver.start();

	return driver;
}
