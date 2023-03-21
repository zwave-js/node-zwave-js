/// <reference types="node" />
import { NodeProtocolInfo } from "@zwave-js/core/safe";
import type { NVMModuleType } from "./shared";
export interface NVMDescriptor {
    manufacturerID: number;
    firmwareID: number;
    productType: number;
    productID: number;
    firmwareVersion: string;
    protocolVersion: string;
}
export declare function parseNVMDescriptor(buffer: Buffer, offset?: number): NVMDescriptor;
export declare function encodeNVMDescriptor(descriptor: NVMDescriptor): Buffer;
export interface NVMModuleDescriptor {
    size: number;
    type: NVMModuleType;
    version: string;
}
export declare function parseNVMModuleDescriptor(buffer: Buffer, offset?: number): NVMModuleDescriptor;
export declare function encodeNVMModuleDescriptor(descriptior: NVMModuleDescriptor): Buffer;
export interface NVM500NodeInfo extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
    genericDeviceClass: number;
    specificDeviceClass: number | null;
}
export declare function parseNVM500NodeInfo(buffer: Buffer, offset: number): NVM500NodeInfo;
export declare function encodeNVM500NodeInfo(nodeInfo: NVM500NodeInfo): Buffer;
//# sourceMappingURL=EntryParsers.d.ts.map