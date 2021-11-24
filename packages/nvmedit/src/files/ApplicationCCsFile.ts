import { CommandClasses } from "@zwave-js/core";
import type { NVMObject } from "../object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export interface ApplicationCCsFileOptions extends NVMFileCreationOptions {
	includedInsecurelyCCs: CommandClasses[];
	includedSecurelyInsecureCCs: CommandClasses[];
	includedSecurelySecureCCs: CommandClasses[];
}

const MAX_CCs = 35;

@nvmFileID(103)
export class ApplicationCCsFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationCCsFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			let offset = 0;
			let numCCs = this.payload[offset];
			this.includedInsecurelyCCs = [
				...this.payload.slice(offset + 1, offset + 1 + numCCs),
			];
			offset += MAX_CCs;

			numCCs = this.payload[offset];
			this.includedSecurelyInsecureCCs = [
				...this.payload.slice(offset + 1, offset + 1 + numCCs),
			];
			offset += MAX_CCs;
			numCCs = this.payload[offset];
			this.includedSecurelySecureCCs = [
				...this.payload.slice(offset + 1, offset + 1 + numCCs),
			];
		} else {
			this.includedInsecurelyCCs = options.includedInsecurelyCCs;
			this.includedSecurelyInsecureCCs =
				options.includedSecurelyInsecureCCs;
			this.includedSecurelySecureCCs = options.includedSecurelySecureCCs;
		}
	}

	public includedInsecurelyCCs: CommandClasses[];
	public includedSecurelyInsecureCCs: CommandClasses[];
	public includedSecurelySecureCCs: CommandClasses[];

	public serialize(): NVMObject {
		this.payload = Buffer.alloc((1 + MAX_CCs) * 3);
		let offset = 0;
		for (const array of [
			this.includedInsecurelyCCs,
			this.includedSecurelyInsecureCCs,
			this.includedSecurelySecureCCs,
		]) {
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
			"included insecurely": this.includedInsecurelyCCs
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
