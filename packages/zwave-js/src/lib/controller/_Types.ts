export type HealNodeStatus = "pending" | "done" | "failed" | "skipped";
export type SDKVersion =
	| `${number}.${number}`
	| `${number}.${number}.${number}`;

export interface FirmwareUpdateFileInfo {
	target: number;
	url: string;
	integrity: `sha256:${string}`;
}

export type FirmwareUpdateInfo = {
	version: string;
	changelog: string;
	files: FirmwareUpdateFileInfo[];
};

export interface GetFirmwareUpdatesOptions {
	/** Allows overriding the API key for the firmware update service */
	apiKey?: string;
	/** Allows adding and removing components from the user agent for the firmware update service (behaves like `Driver.updateUserAgent` but only for this call) */
	userAgentComponents?: Record<string, string>;
}
