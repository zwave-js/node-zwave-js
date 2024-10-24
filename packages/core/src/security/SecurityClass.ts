import type { MaybeNotKnown } from "../values/Primitive";

export enum SecurityClass {
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
	S0_Legacy = 7,
}

export type S2SecurityClass =
	| SecurityClass.S2_Unauthenticated
	| SecurityClass.S2_Authenticated
	| SecurityClass.S2_AccessControl;

/** Tests if the given security class is S2 */
export function securityClassIsS2(
	secClass: SecurityClass | undefined,
): secClass is S2SecurityClass {
	return (
		secClass != undefined
		&& secClass >= SecurityClass.S2_Unauthenticated
		&& secClass <= SecurityClass.S2_AccessControl
	);
}

/** Tests if the given security class is valid for use with Z-Wave LR */
export function securityClassIsLongRange(
	secClass: SecurityClass | undefined,
): secClass is S2SecurityClass {
	return (
		secClass === SecurityClass.S2_AccessControl
		|| secClass === SecurityClass.S2_Authenticated
	);
}

/** An array of security classes, ordered from high (index 0) to low (index > 0) */
export const securityClassOrder = [
	SecurityClass.S2_AccessControl,
	SecurityClass.S2_Authenticated,
	SecurityClass.S2_Unauthenticated,
	SecurityClass.S0_Legacy,
] as const;

/** Allows querying the security classes of a node */
export interface QuerySecurityClasses {
	/** Whether the node was granted at least one security class */
	readonly isSecure: MaybeNotKnown<boolean>;

	/** Returns whether a node was granted the given security class */
	hasSecurityClass(securityClass: SecurityClass): MaybeNotKnown<boolean>;

	/** Returns the highest security class this node was granted or `undefined` if that information isn't known yet */
	getHighestSecurityClass(): MaybeNotKnown<SecurityClass>;
}

/** Allows modifying the security classes of a node */
export interface SetSecurityClass {
	setSecurityClass(securityClass: SecurityClass, granted: boolean): void;
}

export function getHighestSecurityClass(
	securityClasses: SecurityClass[],
): SecurityClass {
	for (const cls of securityClassOrder) {
		if (securityClasses.includes(cls)) return cls;
	}
	return SecurityClass.None;
}
