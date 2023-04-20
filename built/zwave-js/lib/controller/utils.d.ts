import { PlannedProvisioningEntry } from "./Inclusion";
export declare function assertProvisioningEntry(arg: any): asserts arg is PlannedProvisioningEntry;
/** Checks if the SDK version is greater than the given one */
export declare function sdkVersionGt(sdkVersion: string | undefined, compareVersion: string): boolean | undefined;
/** Checks if the SDK version is greater than or equal to the given one */
export declare function sdkVersionGte(sdkVersion: string | undefined, compareVersion: string): boolean | undefined;
/** Checks if the SDK version is lower than the given one */
export declare function sdkVersionLt(sdkVersion: string | undefined, compareVersion: string): boolean | undefined;
/** Checks if the SDK version is lower than or equal to the given one */
export declare function sdkVersionLte(sdkVersion: string | undefined, compareVersion: string): boolean | undefined;
//# sourceMappingURL=utils.d.ts.map