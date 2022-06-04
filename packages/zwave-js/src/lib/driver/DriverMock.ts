import type { ZWaveSerialPortBase } from "@zwave-js/serial";
import {
	MockBinding,
	MockPortBinding,
	SerialPortMock,
} from "@zwave-js/serial/mock";
import type { DeepPartial } from "@zwave-js/shared";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import fs from "fs-extra";
import { tmpdir } from "os";
import path from "path";
import type { SerialPort } from "serialport";
import { Driver } from "./Driver";
import type { ZWaveOptions } from "./ZWaveOptions";

interface CreateAndStartDriverWithMockPortResult {
	driver: Driver;
	continueStartup: () => void;
	mockPort: MockPortBinding;
}

export interface CreateAndStartDriverWithMockPortOptions {
	portAddress: string;
}

/** Creates a real driver instance with a mocked serial port to enable end to end tests */
export function createAndStartDriverWithMockPort(
	options: DeepPartial<
		CreateAndStartDriverWithMockPortOptions & ZWaveOptions
	> = {},
): Promise<CreateAndStartDriverWithMockPortResult> {
	const { portAddress = "/tty/FAKE", ...driverOptions } = options;
	return new Promise(async (resolve, reject) => {
		// eslint-disable-next-line prefer-const
		let driver: Driver;
		let mockPort: MockPortBinding;

		MockBinding.reset();
		MockBinding.createPort(portAddress, {
			record: true,
			readyData: Buffer.from([]),
		});

		// This will be called when the driver has opened the serial port
		const onSerialPortOpen = (
			_port: ZWaveSerialPortBase,
		): Promise<void> => {
			// Extract the mock serial port
			mockPort = MockBinding.getInstance(portAddress)!;
			if (!mockPort) reject(new Error("Mock serial port is not open!"));

			// And return the info to the calling code, giving it control over
			// continuing the driver startup.
			const continuePromise = createDeferredPromise();
			resolve({
				driver,
				mockPort,
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
			// instruct the driver to use SerialPortMock as the serialport implementation
			serialPortBinding: SerialPortMock as unknown as typeof SerialPort,
			onSerialPortOpen,
		};

		driver = new Driver(portAddress, {
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
	beforeStartup: (mockPort: MockPortBinding) => void | Promise<void>;
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
	 * Whether configuration files should be loaded (default: true)
	 */
	loadConfiguration?: boolean;

	portAddress: string;
}

export async function createAndStartTestingDriver(
	options: Partial<CreateAndStartTestingDriverOptions> &
		DeepPartial<ZWaveOptions> = {},
): Promise<CreateAndStartTestingDriverResult> {
	const {
		beforeStartup,
		skipControllerIdentification = false,
		skipNodeInterview = false,
		loadConfiguration = true,
		...internalOptions
	} = options;

	// Use a new fake serial port for each test
	const testId = Math.round(Math.random() * 0xffffffff)
		.toString(16)
		.padStart(8, "0");
	internalOptions.portAddress ??= `/tty/FAKE${testId}`;

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

	// TODO: Ideally, this would be using mock-fs, but jest does not play nice with it
	const cacheDir = path.join(tmpdir(), "zwave-js-test-cache", testId);

	internalOptions.storage ??= {};
	internalOptions.storage.cacheDir = cacheDir;

	const { driver, continueStartup, mockPort } =
		await createAndStartDriverWithMockPort(internalOptions);

	if (typeof beforeStartup === "function") {
		await beforeStartup(mockPort);
	}

	// Make sure the mock FS gets restored when the driver is destroyed
	const originalDestroy = driver.destroy.bind(driver);
	driver.destroy = async () => {
		await originalDestroy();
		await fs.remove(cacheDir);
	};

	return new Promise((resolve) => {
		driver.once("driver ready", () => {
			resolve({ driver, mockPort });
		});
		continueStartup();
	});
}
