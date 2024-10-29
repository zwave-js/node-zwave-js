import { CRC16_CCITT, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { XModemMessageHeaders } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

export enum BootloaderState {
	Menu,
	UploadingFirmware,
}

/** Encapsulates information about the currently active bootloader */
export class Bootloader {
	public constructor(
		private writeSerial: (data: Uint8Array) => Promise<void>,
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

	public async beginUpload(): Promise<void> {
		await this.writeSerial(
			Bytes.from(this.uploadOption.toString(), "ascii"),
		);
	}

	public async runApplication(): Promise<void> {
		await this.writeSerial(Bytes.from(this.runOption.toString(), "ascii"));
	}

	public async uploadFragment(
		fragmentNumber: number,
		data: Uint8Array,
	): Promise<void> {
		const command = Bytes.concat([
			Bytes.from([
				XModemMessageHeaders.SOF,
				fragmentNumber & 0xff,
				0xff - (fragmentNumber & 0xff),
			]),
			data,
			new Bytes(2),
		]);
		command.writeUInt16BE(CRC16_CCITT(data, 0x0000), command.length - 2);

		await this.writeSerial(command);
	}

	public async finishUpload(): Promise<void> {
		await this.writeSerial(Bytes.from([XModemMessageHeaders.EOT]));
	}
}
