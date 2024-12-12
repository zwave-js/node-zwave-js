export function getErrorMessage(e: unknown, includeStack?: boolean): string {
	if (e instanceof Error) {
		return includeStack && e.stack ? e.stack : e.message;
	}
	return String(e);
}

export function isAbortError(e: unknown): boolean {
	return e instanceof DOMException && e.name === "AbortError";
}
