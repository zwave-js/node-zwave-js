/// <reference types="node" />
import { FLiRS, RouteProtocolDataRate } from "@zwave-js/core/safe";
import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export declare const ROUTECACHES_PER_FILE_V1 = 8;
export interface Route {
    beaming: FLiRS;
    protocolRate: RouteProtocolDataRate;
    repeaterNodeIDs?: number[];
}
export interface RouteCache {
    nodeId: number;
    lwr: Route;
    nlwr: Route;
}
export declare function parseRoute(buffer: Buffer, offset: number): Route;
export declare function encodeRoute(route: Route | undefined): Buffer;
export declare function getEmptyRoute(): Route;
export interface RouteCacheFileV0Options extends NVMFileCreationOptions {
    routeCache: RouteCache;
}
export declare const RouteCacheFileV0IDBase = 328704;
export declare function nodeIdToRouteCacheFileIDV0(nodeId: number): number;
export declare class RouteCacheFileV0 extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | RouteCacheFileV0Options);
    routeCache: RouteCache;
    serialize(): NVM3Object;
    toJSON(): {
        routeCache: RouteCache;
    };
}
export interface RouteCacheFileV1Options extends NVMFileCreationOptions {
    routeCaches: RouteCache[];
}
export declare const RouteCacheFileV1IDBase = 332800;
export declare function nodeIdToRouteCacheFileIDV1(nodeId: number): number;
export declare class RouteCacheFileV1 extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | RouteCacheFileV1Options);
    routeCaches: RouteCache[];
    serialize(): NVM3Object;
    toJSON(): {
        "route caches": RouteCache[];
    };
}
//# sourceMappingURL=RouteCacheFiles.d.ts.map