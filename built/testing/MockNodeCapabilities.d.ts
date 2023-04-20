import { CommandClasses, CommandClassInfo, NodeProtocolInfoAndDeviceClass } from "@zwave-js/core";
export type PartialCCCapabilities = ({
    ccId: CommandClasses;
} & Partial<CommandClassInfo>) | CommandClasses;
export interface MockNodeCapabilities extends NodeProtocolInfoAndDeviceClass {
    firmwareVersion: string;
    manufacturerId: number;
    productType: number;
    productId: number;
    /** How long it takes to send a command to or from the node */
    txDelay: number;
}
export interface MockEndpointCapabilities {
    genericDeviceClass: number;
    specificDeviceClass: number;
}
export declare function getDefaultMockNodeCapabilities(): MockNodeCapabilities;
export declare function getDefaultMockEndpointCapabilities(nodeCaps: MockNodeCapabilities): MockEndpointCapabilities;
//# sourceMappingURL=MockNodeCapabilities.d.ts.map