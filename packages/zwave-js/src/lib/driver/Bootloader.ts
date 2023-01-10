import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";

export enum BootloaderState {
	Menu,
	UploadingFirmware,
}

/** Encapsulates information about the currently active bootloader */
export class Bootloader {
	public constructor(
		public readonly version: string,
		options: { num: number; option: string }[],
	) {
		const uploadOption = options.find(
			(o) => o.option === "upload gbl",
		)?.num;
		if (!uploadOption) {
			throw new ZWaveError(
				"The bootloader does not support uploading a GBL file!",
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		this.uploadOption = uploadOption;

		const runOption = options.find((o) => o.option === "run")?.num;
		if (!runOption) {
			throw new ZWaveError(
				"Could not find run option in bootloader menu!",
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
		this.runOption = runOption;
	}

	public readonly uploadOption: number;
	public readonly runOption: number;
	public state: BootloaderState = BootloaderState.Menu;
}
