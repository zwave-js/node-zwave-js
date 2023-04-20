/// <reference types="node" />
import { Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { Powerlevel, PowerlevelCommand, PowerlevelTestStatus } from "../lib/_Types";
export declare class PowerlevelCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: PowerlevelCommand): Maybe<boolean>;
    setNormalPowerlevel(): Promise<SupervisionResult | undefined>;
    setCustomPowerlevel(powerlevel: Powerlevel, timeout: number): Promise<SupervisionResult | undefined>;
    getPowerlevel(): Promise<Pick<PowerlevelCCReport, "powerlevel" | "timeout"> | undefined>;
    startNodeTest(testNodeId: number, powerlevel: Powerlevel, testFrameCount: number): Promise<SupervisionResult | undefined>;
    getNodeTestStatus(): Promise<Pick<PowerlevelCCTestNodeReport, "testNodeId" | "status" | "acknowledgedFrames"> | undefined>;
}
export declare class PowerlevelCC extends CommandClass {
    ccCommand: PowerlevelCommand;
}
type PowerlevelCCSetOptions = CCCommandOptions & ({
    powerlevel: Powerlevel;
    timeout: number;
} | {
    powerlevel: (typeof Powerlevel)["Normal Power"];
    timeout?: undefined;
});
export declare class PowerlevelCCSet extends PowerlevelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | PowerlevelCCSetOptions);
    powerlevel: Powerlevel;
    timeout?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class PowerlevelCCReport extends PowerlevelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly powerlevel: Powerlevel;
    readonly timeout?: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class PowerlevelCCGet extends PowerlevelCC {
}
interface PowerlevelCCTestNodeSetOptions extends CCCommandOptions {
    testNodeId: number;
    powerlevel: Powerlevel;
    testFrameCount: number;
}
export declare class PowerlevelCCTestNodeSet extends PowerlevelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | PowerlevelCCTestNodeSetOptions);
    testNodeId: number;
    powerlevel: Powerlevel;
    testFrameCount: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class PowerlevelCCTestNodeReport extends PowerlevelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly testNodeId: number;
    readonly status: PowerlevelTestStatus;
    readonly acknowledgedFrames: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class PowerlevelCCTestNodeGet extends PowerlevelCC {
}
export {};
//# sourceMappingURL=PowerlevelCC.d.ts.map