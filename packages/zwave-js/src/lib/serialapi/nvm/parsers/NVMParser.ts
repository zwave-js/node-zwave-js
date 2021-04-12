import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";

export abstract class NVMParser {
	protected constructor(
		public readonly appVersion: number,
		public readonly zwaveVersion: number,
	) {
		if ((appVersion & 0xffff) !== appVersion) {
			throw new ZWaveError(
				"appVersion must be a 16-bit number",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if ((zwaveVersion & 0xffff) !== zwaveVersion) {
			throw new ZWaveError(
				"zwaveVersion must be a 16-bit number",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
	}

	public abstract nvmToJSON(nvm: Buffer): NVMJSON;
	public abstract jsonToNVM(json: NVMJSON): Buffer;
}

export interface NVMJSON {
	sourceSDKVersion: string;
	foo: "bar";
}
