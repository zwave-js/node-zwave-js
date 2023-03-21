import { APIMethodsOf, CCAPIs, CCNameOrId } from "@zwave-js/cc";
import { CommandClasses, IVirtualEndpoint, MulticastDestination, SendCommandOptions } from "@zwave-js/core/safe";
import type { Driver } from "../driver/Driver";
import type { VirtualNode } from "./VirtualNode";
/**
 * Represents an endpoint of a virtual (broadcast, multicast) Z-Wave node.
 * This can either be the root device itself (index 0) or a more specific endpoint like a single plug.
 *
 * The endpoint's capabilities are determined by the capabilities of the individual nodes' endpoints.
 */
export declare class VirtualEndpoint implements IVirtualEndpoint {
    /** The driver instance this endpoint belongs to */
    protected readonly driver: Driver;
    /** The index of this endpoint. 0 for the root device, 1+ otherwise */
    readonly index: number;
    /** Default command options to use for the CC API */
    private defaultCommandOptions?;
    constructor(
    /** The virtual node this endpoint belongs to (or undefined if it set later) */
    node: VirtualNode | undefined, 
    /** The driver instance this endpoint belongs to */
    driver: Driver, 
    /** The index of this endpoint. 0 for the root device, 1+ otherwise */
    index: number, 
    /** Default command options to use for the CC API */
    defaultCommandOptions?: SendCommandOptions | undefined);
    /** Required by {@link IZWaveEndpoint} */
    readonly virtual = true;
    /** The virtual node this endpoint belongs to */
    private _node;
    get node(): VirtualNode;
    get nodeId(): number | MulticastDestination;
    /** Tests if this endpoint supports the given CommandClass */
    supportsCC(cc: CommandClasses): boolean;
    /**
     * Retrieves the minimum non-zero version of the given CommandClass the physical endpoints implement
     * Returns 0 if the CC is not supported at all.
     */
    getCCVersion(cc: CommandClasses): number;
    private _commandClassAPIs;
    private _commandClassAPIsProxy;
    /**
     * Used to iterate over the commandClasses API without throwing errors by accessing unsupported CCs
     */
    private readonly commandClassesIterator;
    /**
     * Provides access to simplified APIs that are tailored to specific CCs.
     * Make sure to check support of each API using `API.isSupported()` since
     * all other API calls will throw if the API is not supported
     */
    get commandClasses(): CCAPIs;
    /** Allows checking whether a CC API is supported before calling it with {@link VirtualEndpoint.invokeCCAPI} */
    supportsCCAPI(cc: CommandClasses): boolean;
    /**
     * Allows dynamically calling any CC API method on this virtual endpoint by CC ID and method name.
     * Use {@link VirtualEndpoint.supportsCCAPI} to check support first.
     *
     * **Warning:** Get-type commands are not supported, even if auto-completion indicates that they are.
     */
    invokeCCAPI<CC extends CCNameOrId, TMethod extends keyof TAPI, TAPI extends Record<string, (...args: any[]) => any> = CommandClasses extends CC ? any : Omit<CCNameOrId, CommandClasses> extends CC ? any : APIMethodsOf<CC>>(cc: CC, method: TMethod, ...args: Parameters<TAPI[TMethod]>): ReturnType<TAPI[TMethod]>;
}
//# sourceMappingURL=VirtualEndpoint.d.ts.map