/** Determines which kind of Z-Wave application the driver is communicating with */
export enum DriverMode {
	Unknown,
	SerialAPI,
	Bootloader,
	CLI,
}
