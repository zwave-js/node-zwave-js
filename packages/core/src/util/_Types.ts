import { type Bytes } from "@zwave-js/shared";

export type FirmwareFileFormat =
	| "aeotec"
	| "otz"
	| "ota"
	| "hex"
	| "hec"
	| "gecko"
	| "bin";

export interface Firmware {
	data: Bytes;
	firmwareTarget?: number;
}
