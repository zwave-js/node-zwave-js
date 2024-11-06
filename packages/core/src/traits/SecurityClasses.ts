import { type SecurityClass } from "../definitions/SecurityClass.js";
import { type MaybeNotKnown } from "../values/Primitive.js";

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
