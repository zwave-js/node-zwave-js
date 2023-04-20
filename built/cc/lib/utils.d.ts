import { IZWaveNode, type IZWaveEndpoint } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost } from "@zwave-js/host/safe";
import { type ReadonlyObjectKeyMap } from "@zwave-js/shared/safe";
import type { AssociationAddress, AssociationGroup } from "./_Types";
export declare function getAssociations(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): ReadonlyMap<number, readonly AssociationAddress[]>;
export declare function getAllAssociations(applHost: ZWaveApplicationHost, node: IZWaveNode): ReadonlyObjectKeyMap<AssociationAddress, ReadonlyMap<number, readonly AssociationAddress[]>>;
export declare function isAssociationAllowed(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, group: number, destination: AssociationAddress): boolean;
export declare function getAssociationGroups(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): ReadonlyMap<number, AssociationGroup>;
export declare function getAllAssociationGroups(applHost: ZWaveApplicationHost, node: IZWaveNode): ReadonlyMap<number, ReadonlyMap<number, AssociationGroup>>;
export declare function addAssociations(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, group: number, destinations: AssociationAddress[]): Promise<void>;
export declare function removeAssociations(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, group: number, destinations: AssociationAddress[]): Promise<void>;
export declare function configureLifelineAssociations(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): Promise<void>;
//# sourceMappingURL=utils.d.ts.map