import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export interface ApplicationTypeFileOptions extends NVMFileCreationOptions {
	isListening: boolean;
	optionalFunctionality: boolean;
	genericDeviceClass: number;
	specificDeviceClass: number;
}

@nvmFileID(102)
export class ApplicationTypeFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationTypeFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.isListening = !!(this.payload[0] & 0b1);
			this.optionalFunctionality = !!(this.payload[0] & 0b10);
			this.genericDeviceClass = this.payload[1];
			this.specificDeviceClass = this.payload[2];
		} else {
			this.isListening = options.isListening;
			this.optionalFunctionality = options.optionalFunctionality;
			this.genericDeviceClass = options.genericDeviceClass;
			this.specificDeviceClass = options.specificDeviceClass;
		}
	}

	public isListening: boolean;
	public optionalFunctionality: boolean;
	public genericDeviceClass: number;
	public specificDeviceClass: number;

	public serialize(): NVM3Object {
		this.payload = Buffer.from([
			(this.isListening ? 0b1 : 0) |
				(this.optionalFunctionality ? 0b10 : 0),
			this.genericDeviceClass,
			this.specificDeviceClass,
		]);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			listening: this.isListening,
			"opt. functionality": this.optionalFunctionality,
			genericDeviceClass: this.genericDeviceClass,
			specificDeviceClass: this.specificDeviceClass,
		};
	}
}
export const ApplicationTypeFileID = getNVMFileIDStatic(ApplicationTypeFile);
