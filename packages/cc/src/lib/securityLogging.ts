import { getenv } from "@zwave-js/shared";

/**
 * Whether keys, nonces and plaintext of secure commands may be logged.
 * This exposes key material, so it requires an explicit opt-in outside of tests.
 */
export function shouldLogSecurityDetails(): boolean {
	return (
		getenv("NODE_ENV") === "test"
		|| getenv("ZWAVEJS_LOG_SECURITY_DETAILS") === "true"
	);
}
