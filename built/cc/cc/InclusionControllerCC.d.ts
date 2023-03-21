/// <reference types="node" />
import { Maybe, MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { InclusionControllerCommand, InclusionControllerStatus, InclusionControllerStep } from "../lib/_Types";
export declare class InclusionControllerCC extends CommandClass {
    ccCommand: InclusionControllerCommand;
}
export declare class InclusionControllerCCAPI extends CCAPI {
    supportsCommand(cmd: InclusionControllerCommand): Maybe<boolean>;
    /** Instruct the target to initiate the given inclusion step for the given node */
    initiateStep(nodeId: number, step: InclusionControllerStep): Promise<void>;
    /** Indicate to the other node that the given inclusion step has been completed */
    completeStep(step: InclusionControllerStep, status: InclusionControllerStatus): Promise<void>;
}
interface InclusionControllerCCCompleteOptions extends CCCommandOptions {
    step: InclusionControllerStep;
    status: InclusionControllerStatus;
}
export declare class InclusionControllerCCComplete extends InclusionControllerCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | InclusionControllerCCCompleteOptions);
    step: InclusionControllerStep;
    status: InclusionControllerStatus;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface InclusionControllerCCInitiateOptions extends CCCommandOptions {
    includedNodeId: number;
    step: InclusionControllerStep;
}
export declare class InclusionControllerCCInitiate extends InclusionControllerCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | InclusionControllerCCInitiateOptions);
    includedNodeId: number;
    step: InclusionControllerStep;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=InclusionControllerCC.d.ts.map