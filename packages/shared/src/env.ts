export function getenv(key: string): string | undefined {
	return typeof process !== "undefined" ? process.env[key] : undefined;
}
