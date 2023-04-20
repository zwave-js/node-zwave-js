import { IZWaveEndpoint, IZWaveNode, TranslatedValueID, ValueID } from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
export declare function endpointCountIsDynamic(applHost: ZWaveApplicationHost, node: IZWaveNode): boolean | undefined;
export declare function endpointsHaveIdenticalCapabilities(applHost: ZWaveApplicationHost, node: IZWaveNode): boolean | undefined;
export declare function getIndividualEndpointCount(applHost: ZWaveApplicationHost, node: IZWaveNode): number | undefined;
export declare function getAggregatedEndpointCount(applHost: ZWaveApplicationHost, node: IZWaveNode): number | undefined;
export declare function getEndpointCount(applHost: ZWaveApplicationHost, node: IZWaveNode): number;
export declare function setIndividualEndpointCount(applHost: ZWaveApplicationHost, node: IZWaveNode, count: number): void;
export declare function setAggregatedEndpointCount(applHost: ZWaveApplicationHost, node: IZWaveNode, count: number): void;
export declare function getEndpointIndizes(applHost: ZWaveApplicationHost, node: IZWaveNode): number[];
export declare function setEndpointIndizes(applHost: ZWaveApplicationHost, node: IZWaveNode, indizes: number[]): void;
export declare function isMultiChannelInterviewComplete(applHost: ZWaveApplicationHost, node: IZWaveNode): boolean;
export declare function setMultiChannelInterviewComplete(applHost: ZWaveApplicationHost, node: IZWaveNode, complete: boolean): void;
export declare function getAllEndpoints(applHost: ZWaveApplicationHost, node: IZWaveNode): IZWaveEndpoint[];
/** Determines whether the root application CC values should be hidden in favor of endpoint values */
export declare function shouldHideRootApplicationCCValues(applHost: ZWaveApplicationHost, node: IZWaveNode): boolean;
/**
 * Enhances a value id so it can be consumed better by applications
 */
export declare function translateValueID<T extends ValueID>(applHost: ZWaveApplicationHost, node: IZWaveNode, valueId: T): T & TranslatedValueID;
/**
 * Removes all Value IDs from an array that belong to a root endpoint and have a corresponding
 * Value ID on a non-root endpoint
 */
export declare function filterRootApplicationCCValueIDs<T extends ValueID>(allValueIds: T[]): T[];
/** Returns a list of all value names that are defined on all endpoints of this node */
export declare function getDefinedValueIDs(applHost: ZWaveApplicationHost, node: IZWaveNode): TranslatedValueID[];
//# sourceMappingURL=utils.d.ts.map