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
		writeSerial: (data: Uint8Array) => Promise<void>,
		version: string,
		options: { num: number; option: string }[],
	) {
		this.writeSerial = writeSerial;
		this.version = version;
		this.options = new Map(options.map((o) => [o.num, o.option]));

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

	public readonly writeSerial: (data: Uint8Array) => Promise<void>;
	public state: BootloaderState = BootloaderState.Menu;
	public readonly version: string;

	public readonly options: ReadonlyMap<number, string>;

	public readonly uploadOption: number;
	public readonly runOption: number;

	public async selectOption(option: number): Promise<boolean> {
		if (!this.options.has(option)) return false;
		await this.writeSerial(Bytes.from(option.toString(), "ascii"));
		return true;
	}

	public findOption(
		predicate: (option: string) => boolean,
	): number | undefined {
		return [...this.options.entries()].find(
			([, option]) => predicate(option),
		)?.[0];
	}

	public async beginUpload(): Promise<void> {
		await this.selectOption(this.uploadOption);
	}

	public async runApplication(): Promise<void> {
		await this.selectOption(this.runOption);
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
