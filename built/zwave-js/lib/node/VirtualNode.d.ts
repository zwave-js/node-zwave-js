import { SetValueAPIOptions } from "@zwave-js/cc";
import { IVirtualNode, SendCommandOptions, TranslatedValueID, ValueID, ValueMetadata } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import type { ZWaveNode } from "./Node";
import { VirtualEndpoint } from "./VirtualEndpoint";
export interface VirtualValueID extends TranslatedValueID {
    /** The metadata that belongs to this virtual value ID */
    metadata: ValueMetadata;
    /** The maximum supported CC version among all nodes targeted by this virtual value ID */
    ccVersion: number;
}
export declare class VirtualNode extends VirtualEndpoint implements IVirtualNode {
    readonly id: number | undefined;
    constructor(id: number | undefined, driver: Driver, 
    /** The references to the physical node this virtual node abstracts */
    physicalNodes: Iterable<ZWaveNode>, 
    /** Default command options to use for the CC API */
    defaultCommandOptions?: SendCommandOptions);
    readonly physicalNodes: readonly ZWaveNode[];
    /**
     * Updates a value for a given property of a given CommandClass.
     * This will communicate with the physical node(s) this virtual node represents!
     */
    setValue(valueId: ValueID, value: unknown, options?: SetValueAPIOptions): Promise<boolean>;
    /**
     * Returns a list of all value IDs and their metadata that can be used to
     * control the physical node(s) this virtual node represents.
     */
    getDefinedValueIDs(): VirtualValueID[];
    /** Cache for this node's endpoint instances */
    private _endpointInstances;
    /**
     * Returns an endpoint of this node with the given index. 0 returns the node itself.
     */
    getEndpoint(index: 0): VirtualEndpoint;
    getEndpoint(index: number): VirtualEndpoint | undefined;
    getEndpointOrThrow(index: number): VirtualEndpoint;
    /** Returns the current endpoint count of this virtual node (the maximum in the list of physical nodes) */
    getEndpointCount(): number;
    private get isMultiChannelInterviewComplete();
}
//# sourceMappingURL=VirtualNode.d.ts.map