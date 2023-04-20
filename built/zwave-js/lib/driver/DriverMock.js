"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndStartTestingDriver = exports.createAndStartDriverWithMockPort = void 0;
const mock_1 = require("@zwave-js/serial/mock");
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const Driver_1 = require("./Driver");
/** Creates a real driver instance with a mocked serial port to enable end to end tests */
function createAndStartDriverWithMockPort(options = {}) {
    const { portAddress = "/tty/FAKE", ...driverOptions } = options;
    return new Promise(async (resolve, reject) => {
        // eslint-disable-next-line prefer-const
        let driver;
        let mockPort;
        mock_1.MockBinding.reset();
        mock_1.MockBinding.createPort(portAddress, {
            record: true,
            readyData: Buffer.from([]),
        });
        // This will be called when the driver has opened the serial port
        const onSerialPortOpen = (_port) => {
            // Extract the mock serial port
            mockPort = mock_1.MockBinding.getInstance(portAddress);
            if (!mockPort)
                reject(new Error("Mock serial port is not open!"));
            // And return the info to the calling code, giving it control over
            // continuing the driver startup.
            const continuePromise = (0, deferred_promise_1.createDeferredPromise)();
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
        const testingHooks = {
            ...driverOptions.testingHooks,
            // instruct the driver to use SerialPortMock as the serialport implementation
            serialPortBinding: mock_1.SerialPortMock,
            onSerialPortOpen,
        };
        driver = new Driver_1.Driver(portAddress, {
            ...driverOptions,
            testingHooks,
        });
        await driver.start();
    });
}
exports.createAndStartDriverWithMockPort = createAndStartDriverWithMockPort;
async function createAndStartTestingDriver(options = {}) {
    const { beforeStartup, skipControllerIdentification = false, skipBootloaderCheck = true, skipNodeInterview = false, loadConfiguration = true, ...internalOptions } = options;
    // Use a new fake serial port for each test
    const testId = Math.round(Math.random() * 0xffffffff)
        .toString(16)
        .padStart(8, "0");
    internalOptions.portAddress ?? (internalOptions.portAddress = `/tty/FAKE${testId}`);
    if (skipControllerIdentification) {
        internalOptions.testingHooks ?? (internalOptions.testingHooks = {});
        internalOptions.testingHooks.skipControllerIdentification = true;
    }
    if (skipNodeInterview) {
        internalOptions.testingHooks ?? (internalOptions.testingHooks = {});
        internalOptions.testingHooks.skipNodeInterview = true;
    }
    if (!loadConfiguration) {
        internalOptions.testingHooks ?? (internalOptions.testingHooks = {});
        internalOptions.testingHooks.loadConfiguration = false;
    }
    if (skipBootloaderCheck) {
        internalOptions.testingHooks ?? (internalOptions.testingHooks = {});
        internalOptions.testingHooks.skipBootloaderCheck = true;
    }
    // TODO: Make sure we delete this from time to time
    const cacheDir = path_1.default.join((0, os_1.tmpdir)(), "zwave-js-test-cache", testId);
    internalOptions.storage ?? (internalOptions.storage = {});
    internalOptions.storage.cacheDir = cacheDir;
    const { driver, continueStartup, mockPort } = await createAndStartDriverWithMockPort(internalOptions);
    if (typeof beforeStartup === "function") {
        await beforeStartup(mockPort);
    }
    // Make sure the mock FS gets restored when the driver is destroyed
    const originalDestroy = driver.destroy.bind(driver);
    driver.destroy = async () => {
        await originalDestroy();
        await fs_extra_1.default.remove(cacheDir);
    };
    return new Promise((resolve) => {
        driver.once("driver ready", () => {
            resolve({ driver, mockPort });
        });
        continueStartup();
    });
}
exports.createAndStartTestingDriver = createAndStartTestingDriver;
//# sourceMappingURL=DriverMock.js.map