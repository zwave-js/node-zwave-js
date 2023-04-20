/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { MultiCommandCommand } from "../lib/_Types";
export declare class MultiCommandCCAPI extends CCAPI {
    supportsCommand(_cmd: MultiCommandCommand): Maybe<boolean>;
    send(commands: CommandClass[]): Promise<void>;
}
export declare class MultiCommandCC extends CommandClass {
    ccCommand: MultiCommandCommand;
    /** Tests if a command targets a specific endpoint and thus requires encapsulation */
    static requiresEncapsulation(cc: CommandClass): boolean;
    static encapsulate(host: ZWaveHost, CCs: CommandClass[]): MultiCommandCCCommandEncapsulation;
}
interface MultiCommandCCCommandEncapsulationOptions extends CCCommandOptions {
    encapsulated: CommandClass[];
}
export declare class MultiCommandCCCommandEncapsulation extends MultiCommandCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiCommandCCCommandEncapsulationOptions);
    encapsulated: CommandClass[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=MultiCommandCC.d.ts.map