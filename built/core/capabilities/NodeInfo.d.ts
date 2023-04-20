/// <reference types="node" />
import { CommandClasses } from "./CommandClasses";
export interface ApplicationNodeInformation {
    genericDeviceClass: number;
    specificDeviceClass: number;
    supportedCCs: CommandClasses[];
}
export declare function parseApplicationNodeInformation(nif: Buffer): ApplicationNodeInformation;
export declare function encodeApplicationNodeInformation(nif: ApplicationNodeInformation): Buffer;
export interface NodeUpdatePayload extends ApplicationNodeInformation {
    nodeId: number;
    basicDeviceClass: number;
}
export declare function parseNodeUpdatePayload(nif: Buffer): NodeUpdatePayload;
export declare function encodeNodeUpdatePayload(nif: NodeUpdatePayload): Buffer;
export declare function isExtendedCCId(ccId: CommandClasses): boolean;
/**
 * Reads a CC id from the given buffer, returning the parsed CC id and the number of bytes read
 * @param offset The offset at which the CC id is located
 */
export declare function parseCCId(payload: Buffer, offset?: number): {
    ccId: CommandClasses;
    bytesRead: number;
};
/**
 * Writes the given CC id into the given buffer at the given location
 * @returns The number of bytes written
 */
export declare function encodeCCId(ccId: CommandClasses, payload: Buffer, offset?: number): number;
export declare function parseCCList(payload: Buffer): {
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
};
export declare function encodeCCList(supportedCCs: readonly CommandClasses[], controlledCCs: readonly CommandClasses[]): Buffer;
export declare enum ProtocolVersion {
    "unknown" = 0,
    "2.0" = 1,
    "4.2x / 5.0x" = 2,
    "4.5x / 6.0x" = 3
}
export type FLiRS = false | "250ms" | "1000ms";
export type DataRate = 9600 | 40000 | 100000;
export declare enum NodeType {
    Controller = 0,
    /** @deprecated Use `NodeType["End Node"]` instead */
    "Routing End Node" = 1,
    "End Node" = 1
}
export interface NodeProtocolInfo {
    /** Whether this node is always listening or not */
    isListening: boolean;
    /** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
    isFrequentListening: FLiRS;
    /** Whether the node supports routing/forwarding messages. */
    isRouting: boolean;
    supportedDataRates: DataRate[];
    protocolVersion: ProtocolVersion;
    /** Whether this node supports additional CCs besides the mandatory minimum */
    optionalFunctionality: boolean;
    /** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
    nodeType: NodeType;
    /** Whether this node supports (legacy) network security */
    supportsSecurity: boolean;
    /** Whether this node can issue wakeup beams to FLiRS nodes */
    supportsBeaming: boolean;
    /** Whether this node's device class has the specific part */
    hasSpecificDeviceClass: boolean;
}
export interface NodeProtocolInfoAndDeviceClass extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
    basicDeviceClass: number;
    genericDeviceClass: number;
    specificDeviceClass: number;
}
export type NodeInformationFrame = NodeProtocolInfoAndDeviceClass & ApplicationNodeInformation;
export declare function parseNodeProtocolInfo(buffer: Buffer, offset: number): NodeProtocolInfo;
export declare function encodeNodeProtocolInfo(info: NodeProtocolInfo): Buffer;
export declare function parseNodeProtocolInfoAndDeviceClass(buffer: Buffer): {
    info: NodeProtocolInfoAndDeviceClass;
    bytesRead: number;
};
export declare function encodeNodeProtocolInfoAndDeviceClass(info: NodeProtocolInfoAndDeviceClass): Buffer;
export declare function parseNodeInformationFrame(buffer: Buffer): NodeInformationFrame;
export declare function encodeNodeInformationFrame(info: NodeInformationFrame): Buffer;
//# sourceMappingURL=NodeInfo.d.ts.map