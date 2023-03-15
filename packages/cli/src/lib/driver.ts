import path from "path";
import type winston from "winston";
import { Driver } from "zwave-js";

export interface StartDriverOptions {
	logTransport: winston.transport;
	onDriverReady: (driver: Driver) => void;
	onBootloaderReady: (driver: Driver) => void;
	onError: (error: Error) => void;
}

export async function startDriver(
	port: string,
	options: StartDriverOptions,
): Promise<Driver> {
	const driver = new Driver(port, {
		logConfig: {
			// TODO: Make this configurable
			enabled: true,
			logToFile: true,
			// But log to our own transport
			transports: [options.logTransport],
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
			cacheDir: path.join(process.cwd(), "test/cache"),
			lockDir: path.join(process.cwd(), "test/cache/locks"),
		},
		allowBootloaderOnly: true,
	});

	driver
		.on("error", options.onError)
		.once("driver ready", () => options.onDriverReady(driver))
		.once("bootloader ready", () => options.onBootloaderReady(driver));

	await driver.start();

	return driver;
}
