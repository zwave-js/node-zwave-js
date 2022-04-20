export type FirmwareFileFormat =
	| "aeotec"
	| "otz"
	| "ota"
	| "hex"
	| "hec"
	| "gecko"
	| "bin";

export interface Firmware {
	data: Buffer;
	firmwareTarget?: number;
}
