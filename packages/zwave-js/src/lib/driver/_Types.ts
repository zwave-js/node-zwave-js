export type AvailableFirmwareUpdates = {
	version: string;
	changelog: string;
	files: {
		target: number;
		url: string;
		integrity: `sha256:${string}`;
	}[];
}[];
