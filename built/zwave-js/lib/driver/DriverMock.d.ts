import { MockPortBinding } from "@zwave-js/serial/mock";
import type { DeepPartial } from "@zwave-js/shared";
import { Driver } from "./Driver";
import type { ZWaveOptions } from "./ZWaveOptions";
export interface CreateAndStartDriverWithMockPortResult {
    driver: Driver;
    continueStartup: () => void;
    mockPort: MockPortBinding;
}
export interface CreateAndStartDriverWithMockPortOptions {
    portAddress: string;
}
/** Creates a real driver instance with a mocked serial port to enable end to end tests */
export declare function createAndStartDriverWithMockPort(options?: DeepPartial<CreateAndStartDriverWithMockPortOptions & ZWaveOptions>): Promise<CreateAndStartDriverWithMockPortResult>;
export type CreateAndStartTestingDriverResult = Omit<CreateAndStartDriverWithMockPortResult, "continueStartup">;
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
     * Set this to true to skip checking if the controller is in bootloader mode (default: true)
     */
    skipBootloaderCheck?: boolean;
    /**
     * Whether configuration files should be loaded (default: true)
     */
    loadConfiguration?: boolean;
    portAddress: string;
}
export declare function createAndStartTestingDriver(options?: Partial<CreateAndStartTestingDriverOptions> & DeepPartial<ZWaveOptions>): Promise<CreateAndStartTestingDriverResult>;
//# sourceMappingURL=DriverMock.d.ts.map