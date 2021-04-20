/* wotan-disable no-restricted-property-access */

import { MockSerialPort } from "@zwave-js/serial";
import type { DeepPartial } from "@zwave-js/shared";
import { Driver } from "../driver/Driver";
import type { ZWaveOptions } from "../driver/ZWaveOptions";

// load the driver with stubbed out Serialport
jest.mock("@zwave-js/serial", () => {
	const mdl: typeof import("@zwave-js/serial") = jest.requireActual(
		"@zwave-js/serial",
	);
	return {
		...mdl,
		ZWaveSerialPort: mdl.MockSerialPort,
	};
});

export const PORT_ADDRESS = "/tty/FAKE";

/** Creates a real driver instance with a mocked serial port to enable end to end tests */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function createAndStartDriver(
	options: DeepPartial<ZWaveOptions> = {},
) {
	// Usually we don't want logs in these tests
	if (!options.logConfig) {
		options.logConfig = {
			enabled: false,
		};
	}

	const driver = new Driver(PORT_ADDRESS, {
		...options,
		skipInterview: true,
	});
	driver.on("error", () => {
		/* swallow error events during testing */
	});
	await driver.start();
	const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;

	portInstance.openStub.mockClear();
	portInstance.closeStub.mockClear();
	portInstance.writeStub.mockClear();
	portInstance["_lastWrite"] = undefined;

	// Mock the value DB, because the original one will not be initialized
	// with skipInterview: true
	driver["_valueDB"] = new Map() as any;
	driver["_valueDB"]!.close = () => Promise.resolve();
	driver["_metadataDB"] = new Map() as any;
	driver["_metadataDB"]!.close = () => Promise.resolve();

	// Mock the controller as it will not be initialized with skipInterview: true
	driver["_controller"] = {
		ownNodeId: 1,
		isFunctionSupported: () => true,
		nodes: new Map(),
	} as any;

	return {
		driver,
		serialport: portInstance,
	};
}
