/// <reference types="node" />
import { PageStatus, PageWriteSize } from "./consts";
import { NVM3Object } from "./object";
export interface NVM3PageHeader {
    offset: number;
    version: number;
    eraseCount: number;
    status: PageStatus;
    encrypted: boolean;
    pageSize: number;
    writeSize: PageWriteSize;
    memoryMapped: boolean;
    deviceFamily: number;
}
export interface NVM3Page {
    header: NVM3PageHeader;
    objects: NVM3Object[];
}
export declare function pageSizeToBits(pageSize: number): number;
export declare function pageSizeFromBits(bits: number): number;
export declare function readPage(buffer: Buffer, offset: number): {
    page: NVM3Page;
    bytesRead: number;
};
export declare function writePageHeader(header: Omit<NVM3PageHeader, "offset">): Buffer;
//# sourceMappingURL=page.d.ts.map