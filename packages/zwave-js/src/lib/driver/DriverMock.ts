import type { ZWaveSerialPortBase } from "@zwave-js/serial";
import {
	MockBinding,
	MockPortBinding,
	SerialPortMock,
} from "@zwave-js/serial/mock";
import type { DeepPartial } from "@zwave-js/shared";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import type { SerialPort } from "serialport";
import { Driver } from "./Driver";
import type { ZWaveOptions } from "./ZWaveOptions";

interface Result {
	driver: Driver;
	continueStartup: () => void;
	mockPort: MockPortBinding;
}

/** Creates a real driver instance with a mocked serial port to enable end to end tests */
export function createAndStartDriverWithMockPort(
	portAddress: string,
	options: DeepPartial<ZWaveOptions> = {},
): Promise<Result> {
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
		if (!options.logConfig) {
			options.logConfig = {
				enabled: false,
			};
		}

		const testingHooks: ZWaveOptions["testingHooks"] = {
			// instruct the driver to use SerialPortMock as the serialport implementation
			serialPortBinding: SerialPortMock as unknown as typeof SerialPort,
			onSerialPortOpen,
		};

		driver = new Driver(portAddress, {
			...options,
			testingHooks,
		});
		await driver.start();
	});
}
