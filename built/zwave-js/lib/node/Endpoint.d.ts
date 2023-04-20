import { APIMethodsOf, CCAPIs, CCConstructor, CCNameOrId, CommandClass } from "@zwave-js/cc";
import type { IZWaveEndpoint } from "@zwave-js/core";
import { CommandClasses, CommandClassInfo, GraphNode } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import type { DeviceClass } from "./DeviceClass";
import type { ZWaveNode } from "./Node";
/**
 * Represents a physical endpoint of a Z-Wave node. This can either be the root
 * device itself (index 0) or a more specific endpoint like a single plug.
 *
 * Each endpoint may have different capabilities (device class/supported CCs)
 */
export declare class Endpoint implements IZWaveEndpoint {
    /** The id of the node this endpoint belongs to */
    readonly nodeId: number;
    /** The driver instance this endpoint belongs to */
    protected readonly driver: Driver;
    /** The index of this endpoint. 0 for the root device, 1+ otherwise */
    readonly index: number;
    constructor(
    /** The id of the node this endpoint belongs to */
    nodeId: number, 
    /** The driver instance this endpoint belongs to */
    driver: Driver, 
    /** The index of this endpoint. 0 for the root device, 1+ otherwise */
    index: number, deviceClass?: DeviceClass, supportedCCs?: CommandClasses[]);
    /** Required by {@link IZWaveEndpoint} */
    readonly virtual = false;
    /**
     * Only used for endpoints which store their device class differently than nodes.
     * DO NOT ACCESS directly!
     */
    private _deviceClass;
    get deviceClass(): DeviceClass | undefined;
    protected set deviceClass(deviceClass: DeviceClass | undefined);
    /** Can be used to distinguish multiple endpoints of a node */
    get endpointLabel(): string | undefined;
    /** Resets all stored information of this endpoint */
    protected reset(): void;
    private _implementedCommandClasses;
    getCCs(): Iterable<[ccId: CommandClasses, info: CommandClassInfo]>;
    /**
     * Sets the device class of this endpoint and configures the mandatory CCs.
     * **Note:** This does nothing if the device class was already configured
     */
    protected applyDeviceClass(deviceClass?: DeviceClass): void;
    /**
     * Adds a CC to the list of command classes implemented by the endpoint or updates the information.
     * You shouldn't need to call this yourself.
     * @param info The information about the command class. This is merged with existing information.
     */
    addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
    /**
     * Adds a mandatory CC to the list of command classes implemented by the endpoint or updates the information.
     * Performs some sanity checks before adding so the behavior is in compliance with the specifications
     */
    protected addMandatoryCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
    /** Removes a CC from the list of command classes implemented by the endpoint */
    removeCC(cc: CommandClasses): void;
    /** Tests if this endpoint supports the given CommandClass */
    supportsCC(cc: CommandClasses): boolean;
    /** Tests if this endpoint supports or controls the given CC only securely */
    isCCSecure(cc: CommandClasses): boolean;
    /** Tests if this endpoint controls the given CommandClass */
    controlsCC(cc: CommandClasses): boolean;
    /** Removes the BasicCC from the supported CCs if any other actuator CCs are supported */
    hideBasicCCInFavorOfActuatorCCs(): void;
    /**
     * Retrieves the version of the given CommandClass this endpoint implements.
     * Returns 0 if the CC is not supported.
     */
    getCCVersion(cc: CommandClasses): number;
    /**
     * Creates an instance of the given CC and links it to this endpoint.
     * Throws if the CC is neither supported nor controlled by the endpoint.
     */
    createCCInstance<T extends CommandClass>(cc: CommandClasses | CCConstructor<T>): T | undefined;
    /**
     * Creates an instance of the given CC and links it to this endpoint.
     * Returns `undefined` if the CC is neither supported nor controlled by the endpoint.
     */
    createCCInstanceUnsafe<T extends CommandClass>(cc: CommandClasses | CCConstructor<T>): T | undefined;
    /** Returns instances for all CCs this endpoint supports, that should be interviewed, and that are implemented in this library */
    getSupportedCCInstances(): readonly CommandClass[];
    /** Builds the dependency graph used to automatically determine the order of CC interviews */
    buildCCInterviewGraph(skipCCs: CommandClasses[]): GraphNode<CommandClasses>[];
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
    /** Allows checking whether a CC API is supported before calling it with {@link Endpoint.invokeCCAPI} */
    supportsCCAPI(cc: CCNameOrId): boolean;
    /**
     * Allows dynamically calling any CC API method on this endpoint by CC ID and method name.
     * Use {@link Endpoint.supportsCCAPI} to check support first.
     */
    invokeCCAPI<CC extends CCNameOrId, TMethod extends keyof TAPI, TAPI extends Record<string, (...args: any[]) => any> = CommandClasses extends CC ? any : Omit<CCNameOrId, CommandClasses> extends CC ? any : APIMethodsOf<CC>>(cc: CC, method: TMethod, ...args: Parameters<TAPI[TMethod]>): ReturnType<TAPI[TMethod]>;
    /**
     * Returns the node this endpoint belongs to (or undefined if the node doesn't exist)
     */
    getNodeUnsafe(): ZWaveNode | undefined;
    /** Z-Wave+ Icon (for management) */
    get installerIcon(): number | undefined;
    /** Z-Wave+ Icon (for end users) */
    get userIcon(): number | undefined;
}
//# sourceMappingURL=Endpoint.d.ts.map