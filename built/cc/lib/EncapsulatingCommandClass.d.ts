import type { ZWaveApplicationHost } from "@zwave-js/host";
import { CommandClass, CommandClassOptions } from "./CommandClass";
/** Defines the static side of an encapsulating command class */
export interface EncapsulatingCommandClassStatic {
    new (applHost: ZWaveApplicationHost, options: CommandClassOptions): EncapsulatingCommandClass;
    encapsulate(applHost: ZWaveApplicationHost, cc: CommandClass): EncapsulatingCommandClass;
}
export type EncapsulatedCommandClass = CommandClass & {
    encapsulatingCC: EncapsulatingCommandClass;
};
export type EncapsulatingCommandClass = CommandClass & {
    constructor: EncapsulatingCommandClassStatic;
    encapsulated: EncapsulatedCommandClass;
};
/**
 * Tests if a given CC statically implements the EncapsulatingCommandClassStatic interface
 * @param cc The command class instance to test
 */
export declare function isEncapsulatingCommandClass(cc: any): cc is CommandClass & EncapsulatingCommandClass;
/** Defines the static side of an encapsulating command class */
export interface MultiEncapsulatingCommandClassStatic {
    new (applHost: ZWaveApplicationHost, options: CommandClassOptions): MultiEncapsulatingCommandClass;
    requiresEncapsulation(cc: CommandClass): boolean;
    encapsulate(applHost: ZWaveApplicationHost, CCs: CommandClass[]): MultiEncapsulatingCommandClass;
}
export interface MultiEncapsulatingCommandClass {
    constructor: MultiEncapsulatingCommandClassStatic;
    encapsulated: EncapsulatedCommandClass[];
}
/**
 * Tests if a given CC statically implements the EncapsulatingCommandClassStatic interface
 * @param cc The command class instance to test
 */
export declare function isMultiEncapsulatingCommandClass(cc: any): cc is CommandClass & MultiEncapsulatingCommandClass;
//# sourceMappingURL=EncapsulatingCommandClass.d.ts.map