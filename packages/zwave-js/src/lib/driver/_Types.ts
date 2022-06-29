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
