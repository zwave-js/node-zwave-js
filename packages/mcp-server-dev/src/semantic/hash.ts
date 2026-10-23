import { createHash } from "node:crypto";

/** Recursively sorts object keys so structurally identical values hash the same
 * regardless of property insertion order (e.g. from `Object.assign` during
 * template resolution). */
function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}
	if (value != null && typeof value === "object") {
		const sortedKeys = Object.keys(value).toSorted();
		const ret: Record<string, unknown> = {};
		for (const key of sortedKeys) {
			ret[key] = canonicalize((value as Record<string, unknown>)[key]);
		}
		return ret;
	}
	return value;
}

/** Deterministic JSON serialization used as the input to content/semantic hashes */
export function stableStringify(value: unknown): string {
	return JSON.stringify(canonicalize(value));
}

export function sha256Hex(input: string): string {
	return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Stable hash of the text that will be embedded (used to dedupe embedding calls
 * for records whose human-facing semantics are identical, even if their raw
 * source differs, e.g. two devices using the same template unchanged). */
export function semanticHash(semanticText: string): string {
	return sha256Hex(semanticText.trim().toLowerCase());
}
