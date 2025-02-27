import { type ZWaveSerialStream } from "@zwave-js/serial";
import { MockPort } from "@zwave-js/serial/mock";
import { type FileSystem } from "@zwave-js/shared/bindings";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { tmpdir } from "node:os";
import path from "pathe";
import { Driver } from "./Driver.js";
import type { PartialZWaveOptions, ZWaveOptions } from "./ZWaveOptions.js";

export interface CreateAndStartDriverWithMockPortResult {
	driver: Driver;
	continueStartup: () => void;
	mockPort: MockPort;
	serial: ZWaveSerialStream;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreateAndStartDriverWithMockPortOptions {
	// portAddress: string;
}

/** Creates a real driver instance with a mocked serial port to enable end to end tests */
export function createAndStartDriverWithMockPort(
	options:
		& Partial<CreateAndStartDriverWithMockPortOptions>
		& PartialZWaveOptions = {},
): Promise<CreateAndStartDriverWithMockPortResult> {
	const { ...driverOptions } = options;
	return new Promise(async (resolve, _reject) => {
		// eslint-disable-next-line prefer-const
		let driver: Driver;
		const mockPort = new MockPort();
		const bindingFactory = mockPort.factory();
		// let mockPort: MockPortBinding;

		// MockBinding.reset();
		// MockBinding.createPort(portAddress, {
		// 	record: true,
		// 	readyData: new Uint8Array(),
		// });

		// This will be called when the driver has opened the serial port
		const onSerialPortOpen = (
			serial: ZWaveSerialStream,
		): Promise<void> => {
			// // Extract the mock serial port
			// mockPort = MockBinding.getInstance(portAddress)!;
			// if (!mockPort) reject(new Error("Mock serial port is not open!"));

			// And return the info to the calling code, giving it control over
			// continuing the driver startup.
			const continuePromise = createDeferredPromise();
			resolve({
				driver,
				mockPort,
				serial,
				continueStartup: () => continuePromise.resolve(),
			});

			return continuePromise;
		};

		// Usually we don't want logs in these tests
		if (!driverOptions.logConfig) {
			driverOptions.logConfig = {
				enabled: false,
			};
		}

		const testingHooks: ZWaveOptions["testingHooks"] = {
			...driverOptions.testingHooks,
			onSerialPortOpen,
		};

		driver = new Driver(bindingFactory, {
			...driverOptions,
			testingHooks,
		});
		await driver.start();
	});
}

export type CreateAndStartTestingDriverResult = Omit<
	CreateAndStartDriverWithMockPortResult,
	"continueStartup"
>;

export interface CreateAndStartTestingDriverOptions {
	beforeStartup: (
		mockPort: MockPort,
		serial: ZWaveSerialStream,
	) => void | Promise<void>;
	/**
	 * Whether the controller identification should be skipped (default: false).
	 * If not, a Mock controller must be available on the serial port.
	 */
	skipControllerIdentification?: boolean;
	/**
	 * Whether the node interview should be skipped (default: false).
	 * If not, a Mock controller and/or mock nodes must be available on the serial port.
	 */
	skipNodeInterview?: boolean;

	/**
	 * Set this to true to skip checking if the controller is in bootloader, serial API, or CLI mode (default: true)
	 */
	skipFirmwareIdentification?: boolean;

	/**
	 * Whether configuration files should be loaded (default: true)
	 */
	loadConfiguration?: boolean;

	portAddress: string;
	fs?: FileSystem;
}

export async function createAndStartTestingDriver(
	options:
		& Partial<CreateAndStartTestingDriverOptions>
		& PartialZWaveOptions = {},
): Promise<CreateAndStartTestingDriverResult> {
	const {
		beforeStartup,
		skipControllerIdentification = false,
		skipFirmwareIdentification = true,
		skipNodeInterview = false,
		loadConfiguration = true,
		fs = (await import("@zwave-js/core/bindings/fs/node")).fs,
		...internalOptions
	} = options;

	// Use a new fake serial port for each test
	const testId = Math.round(Math.random() * 0xffffffff)
		.toString(16)
		.padStart(8, "0");
	// internalOptions.portAddress ??= `/tty/FAKE${testId}`;

	if (skipControllerIdentification) {
		internalOptions.testingHooks ??= {};
		internalOptions.testingHooks.skipControllerIdentification = true;
	}
	if (skipNodeInterview) {
		internalOptions.testingHooks ??= {};
		internalOptions.testingHooks.skipNodeInterview = true;
	}
	if (!loadConfiguration) {
		internalOptions.testingHooks ??= {};
		internalOptions.testingHooks.loadConfiguration = false;
	}
	if (skipFirmwareIdentification) {
		internalOptions.testingHooks ??= {};
		internalOptions.testingHooks.skipFirmwareIdentification = true;
	}

	// TODO: Make sure we delete this from time to time
	const cacheDir = path.join(tmpdir(), "zwave-js-test-cache", testId);

	internalOptions.storage ??= {};
	internalOptions.storage.cacheDir = cacheDir;

	const { driver, continueStartup, mockPort, serial } =
		await createAndStartDriverWithMockPort(internalOptions);

	if (typeof beforeStartup === "function") {
		await beforeStartup(mockPort, serial);
	}

	// Make sure the mock FS gets restored when the driver is destroyed
	const originalDestroy = driver.destroy.bind(driver);
	driver.destroy = async () => {
		await originalDestroy();
		await fs.deleteDir(cacheDir);
	};

	return new Promise((resolve) => {
		driver.once("driver ready", () => {
			resolve({ driver, mockPort, serial });
		});
		continueStartup();
	});
}
