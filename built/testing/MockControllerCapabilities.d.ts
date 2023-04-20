import { ZWaveApiVersion, ZWaveLibraryTypes } from "@zwave-js/core/safe";
import { FunctionType } from "@zwave-js/serial/safe";
export interface MockControllerCapabilities {
    firmwareVersion: string;
    manufacturerId: number;
    productType: number;
    productId: number;
    supportedFunctionTypes: FunctionType[];
    zwaveApiVersion: ZWaveApiVersion;
    controllerType: ZWaveLibraryTypes;
    libraryVersion: string;
    isSecondary: boolean;
    isUsingHomeIdFromOtherNetwork: boolean;
    isSISPresent: boolean;
    wasRealPrimary: boolean;
    isStaticUpdateController: boolean;
    sucNodeId: number;
    supportsTimers: boolean;
    zwaveChipType?: string | {
        type: number;
        version: number;
    };
    supportsLongRange: boolean;
    watchdogEnabled: boolean;
}
export declare function getDefaultMockControllerCapabilities(): MockControllerCapabilities;
//# sourceMappingURL=MockControllerCapabilities.d.ts.map