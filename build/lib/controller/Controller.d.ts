/// <reference types="node" />
import { EventEmitter } from "events";
import { FunctionType } from "../message/Constants";
import { ZWaveNode } from "../node/Node";
import { JSONObject } from "../util/misc";
import { ZWaveLibraryTypes } from "./ZWaveLibraryTypes";
export declare class ZWaveController extends EventEmitter {
    private readonly driver;
    private _libraryVersion;
    readonly libraryVersion: string;
    private _type;
    readonly type: ZWaveLibraryTypes;
    private _homeId;
    readonly homeId: number;
    private _ownNodeId;
    readonly ownNodeId: number;
    private _isSecondary;
    readonly isSecondary: boolean;
    private _isUsingHomeIdFromOtherNetwork;
    readonly isUsingHomeIdFromOtherNetwork: boolean;
    private _isSISPresent;
    readonly isSISPresent: boolean;
    private _wasRealPrimary;
    readonly wasRealPrimary: boolean;
    private _isStaticUpdateController;
    readonly isStaticUpdateController: boolean;
    private _isSlave;
    readonly isSlave: boolean;
    private _serialApiVersion;
    readonly serialApiVersion: string;
    private _manufacturerId;
    readonly manufacturerId: number;
    private _productType;
    readonly productType: number;
    private _productId;
    readonly productId: number;
    private _supportedFunctionTypes;
    readonly supportedFunctionTypes: FunctionType[];
    isFunctionSupported(functionType: FunctionType): boolean;
    private _sucNodeId;
    readonly sucNodeId: number;
    private _supportsTimers;
    readonly supportsTimers: boolean;
    readonly nodes: Map<number, ZWaveNode>;
    interview(): Promise<void>;
    private _inclusionActive;
    private _beginInclusionPromise;
    private _stopInclusionPromise;
    private _nodePendingInclusion;
    beginInclusion(): Promise<boolean>;
    stopInclusion(): Promise<boolean>;
    private handleAddNodeRequest;
    /** Serializes the controller information and all nodes to store them in a cache */
    serialize(): JSONObject;
    /** Deserializes the controller information and all nodes from the cache */
    deserialize(serialized: any): void;
}
