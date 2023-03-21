import { IZWaveNode } from "@zwave-js/core";
import { type ThrowingMap } from "@zwave-js/shared";
import type { Overwrite } from "alcalzone-shared/types";
import type { ZWaveApplicationHost, ZWaveHost } from "./ZWaveHost";
export interface CreateTestingHostOptions {
    homeId: ZWaveHost["homeId"];
    ownNodeId: ZWaveHost["ownNodeId"];
    getSafeCCVersionForNode: ZWaveHost["getSafeCCVersionForNode"];
    getSupportedCCVersionForEndpoint?: ZWaveHost["getSupportedCCVersionForEndpoint"];
}
export type TestingHost = Overwrite<Omit<ZWaveApplicationHost, "__internalIsMockNode">, {
    nodes: ThrowingMap<number, IZWaveNode>;
}>;
/** Creates a {@link ZWaveApplicationHost} that can be used for testing */
export declare function createTestingHost(options?: Partial<CreateTestingHostOptions>): TestingHost;
//# sourceMappingURL=mocks.d.ts.map