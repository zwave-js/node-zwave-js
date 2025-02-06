export type FirmwareFileFormat =
	| "aeotec"
	| "otz"
	| "ota"
	| "hex"
	| "hec"
	| "gecko"
	| "bin";

export interface Firmware {
	data: Uint8Array;
	firmwareTarget?: number;
	firmwareId?: number;
}
