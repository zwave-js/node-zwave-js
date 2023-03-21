import type { Maybe } from "../values/Primitive";
export declare enum SecurityClass {
    /**
     * Used internally during inclusion of a node. Don't use this!
     */
    Temporary = -2,
    /**
     * `None` is used to indicate that a node is included without security.
     * It is not meant as input to methods that accept a security class.
     */
    None = -1,
    S2_Unauthenticated = 0,
    S2_Authenticated = 1,
    S2_AccessControl = 2,
    S0_Legacy = 7
}
export type S2SecurityClass = SecurityClass.S2_Unauthenticated | SecurityClass.S2_Authenticated | SecurityClass.S2_AccessControl;
/** Tests if the given security class is S2 */
export declare function securityClassIsS2(secClass: SecurityClass | undefined): secClass is S2SecurityClass;
/** An array of security classes, ordered from high (index 0) to low (index > 0) */
export declare const securityClassOrder: readonly [SecurityClass.S2_AccessControl, SecurityClass.S2_Authenticated, SecurityClass.S2_Unauthenticated, SecurityClass.S0_Legacy];
export interface SecurityClassOwner {
    readonly id: number;
    getHighestSecurityClass(): SecurityClass | undefined;
    hasSecurityClass(securityClass: SecurityClass): Maybe<boolean>;
    setSecurityClass(securityClass: SecurityClass, granted: boolean): void;
}
export declare function getHighestSecurityClass(securityClasses: SecurityClass[]): SecurityClass;
//# sourceMappingURL=SecurityClass.d.ts.map