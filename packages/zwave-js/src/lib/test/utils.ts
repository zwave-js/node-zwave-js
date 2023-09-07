import { MockSerialPort } from "@zwave-js/serial/mock";
import type { DeepPartial } from "@zwave-js/shared";
import proxyquire from "proxyquire";
import type { ZWaveOptions } from "../driver/ZWaveOptions";

// load the driver with stubbed out Serialport
const { Driver } = proxyquire<typeof import("../driver/Driver")>(
	"../driver/Driver",
	{
		"@zwave-js/serial": {
			ZWaveSerialPort: MockSerialPort,
		},
	},
);

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
		testingHooks: {
			skipBootloaderCheck: true,
			skipControllerIdentification: true,
			skipNodeInterview: true,
		},
	});
	driver.on("error", () => {
		/* swallow error events during testing */
	});
	// We don't need to test the soft reset logic in CI
	// Return a promise that never resolves, so we don't accidentally stumble into interview code
	driver.softReset = () => new Promise(() => {});
	await driver.start();
	const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;

	portInstance.openStub.resetHistory();
	portInstance.closeStub.resetHistory();
	portInstance.writeStub.resetHistory();
	portInstance["_lastWrite"] = undefined;

	// Mock the value DB, because the original one will not be initialized
	// with skipInterview: true
	driver["_valueDB"] = new Map() as any;
	driver["_valueDB"]!.close = () => Promise.resolve();
	driver["_metadataDB"] = new Map() as any;
	driver["_metadataDB"]!.close = () => Promise.resolve();
	driver["_networkCache"] = new Map() as any;
	driver["_networkCache"]!.close = () => Promise.resolve();

	// Mock the controller as it will not be initialized with skipInterview: true
	driver["_controller"] = {
		ownNodeId: 1,
		isFunctionSupported: () => true,
		nodes: new Map(),
		incrementStatistics: () => {},
		removeAllListeners: () => {},
	} as any;

	return {
		driver,
		serialport: portInstance,
	};
}
