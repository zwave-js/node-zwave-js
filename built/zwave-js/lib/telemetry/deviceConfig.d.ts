import type { ZWaveApplicationHost } from "@zwave-js/host";
import type { ZWaveNode } from "../node/Node";
export declare function reportMissingDeviceConfig(applHost: ZWaveApplicationHost, node: ZWaveNode & {
    manufacturerId: number;
    productType: number;
    productId: number;
    firmwareVersion: string;
}): Promise<void>;
//# sourceMappingURL=deviceConfig.d.ts.map