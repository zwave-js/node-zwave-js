/// <reference types="node" />
import { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { CRC16Command } from "../lib/_Types";
export declare class CRC16CCAPI extends CCAPI {
    supportsCommand(_cmd: CRC16Command): Maybe<boolean>;
    sendEncapsulated(encapsulatedCC: CommandClass): Promise<void>;
}
export declare class CRC16CC extends CommandClass {
    ccCommand: CRC16Command;
    /** Tests if a command should be supervised and thus requires encapsulation */
    static requiresEncapsulation(cc: CommandClass): boolean;
    /** Encapsulates a command in a CRC-16 CC */
    static encapsulate(host: ZWaveHost, cc: CommandClass): CRC16CCCommandEncapsulation;
}
interface CRC16CCCommandEncapsulationOptions extends CCCommandOptions {
    encapsulated: CommandClass;
}
export declare class CRC16CCCommandEncapsulation extends CRC16CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CRC16CCCommandEncapsulationOptions);
    encapsulated: CommandClass;
    private readonly headerBuffer;
    serialize(): Buffer;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=CRC16CC.d.ts.map