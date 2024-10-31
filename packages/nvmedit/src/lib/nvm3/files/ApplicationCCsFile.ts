import { CommandClasses } from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import type { NVM3Object } from "../object.js";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export interface ApplicationCCsFileOptions extends NVMFileCreationOptions {
	includedInsecurely: CommandClasses[];
	includedSecurelyInsecureCCs: CommandClasses[];
	includedSecurelySecureCCs: CommandClasses[];
}

const MAX_CCs = 35;

export const ApplicationCCsFileID = 103;

@nvmFileID(ApplicationCCsFileID)
@nvmSection("application")
export class ApplicationCCsFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationCCsFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			let offset = 0;
			let numCCs = this.payload[offset];
			this.includedInsecurely = [
				...this.payload.subarray(offset + 1, offset + 1 + numCCs),
			];
			offset += MAX_CCs;

			numCCs = this.payload[offset];
			this.includedSecurelyInsecureCCs = [
				...this.payload.subarray(offset + 1, offset + 1 + numCCs),
			];
			offset += MAX_CCs;
			numCCs = this.payload[offset];
			this.includedSecurelySecureCCs = [
				...this.payload.subarray(offset + 1, offset + 1 + numCCs),
			];
		} else {
			this.includedInsecurely = options.includedInsecurely;
			this.includedSecurelyInsecureCCs =
				options.includedSecurelyInsecureCCs;
			this.includedSecurelySecureCCs = options.includedSecurelySecureCCs;
		}
	}

	public includedInsecurely: CommandClasses[];
	public includedSecurelyInsecureCCs: CommandClasses[];
	public includedSecurelySecureCCs: CommandClasses[];

	public serialize(): NVM3Object & { data: Bytes } {
		this.payload = new Bytes((1 + MAX_CCs) * 3);
		let offset = 0;
		for (
			const array of [
				this.includedInsecurely,
				this.includedSecurelyInsecureCCs,
				this.includedSecurelySecureCCs,
			]
		) {
			this.payload[offset] = array.length;
			this.payload.set(array, offset + 1);
			offset += 1 + MAX_CCs;
		}
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"included insecurely": this.includedInsecurely
				.map((cc) => CommandClasses[cc])
				.join(", "),
			"included securely (insecure)": this.includedSecurelyInsecureCCs
				.map((cc) => CommandClasses[cc])
				.join(", "),
			"included securely (secure)": this.includedSecurelySecureCCs
				.map((cc) => CommandClasses[cc])
				.join(", "),
		};
	}
}
