import { type SecurityManager } from "../security/Manager.js";
import { type SecurityManager2 } from "../security/Manager2.js";

/** Allows accessing the security manager instances */
export interface SecurityManagers {
	/** Management of Security S0 keys and nonces */
	securityManager: SecurityManager | undefined;
	/** Management of Security S2 keys and nonces (Z-Wave Classic) */
	securityManager2: SecurityManager2 | undefined;
	/** Management of Security S2 keys and nonces (Z-Wave Long Range) */
	securityManagerLR: SecurityManager2 | undefined;
}
