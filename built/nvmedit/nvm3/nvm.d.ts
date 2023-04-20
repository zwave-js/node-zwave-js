/// <reference types="node" />
import { PageWriteSize } from "./consts";
import { NVM3Object } from "./object";
import { NVM3Page } from "./page";
export interface NVMMeta {
    pageSize: number;
    deviceFamily: number;
    writeSize: PageWriteSize;
    memoryMapped: boolean;
}
export interface NVM3Pages {
    /** All application pages in the NVM */
    applicationPages: NVM3Page[];
    /** All application pages in the NVM */
    protocolPages: NVM3Page[];
}
export interface NVM3Objects {
    /** A compressed map of application-level NVM objects */
    applicationObjects: Map<number, NVM3Object>;
    /** A compressed map of protocol-level NVM objects */
    protocolObjects: Map<number, NVM3Object>;
}
export declare function parseNVM(buffer: Buffer, verbose?: boolean): NVM3Pages & NVM3Objects;
export type EncodeNVMOptions = Partial<NVMMeta>;
export declare function encodeNVM(
/** A compressed map of application-level NVM objects */
applicationObjects: Map<number, NVM3Object>, 
/** A compressed map of protocol-level NVM objects */
protocolObjects: Map<number, NVM3Object>, options?: EncodeNVMOptions): Buffer;
export declare function getNVMMeta(page: NVM3Page): NVMMeta;
//# sourceMappingURL=nvm.d.ts.map