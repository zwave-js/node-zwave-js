export enum EncapsulationFlags {
	None = 0,
	Supervision = 1 << 0,
	// Multi Channel is tracked through the endpoint index
	Security = 1 << 1,
	CRC16 = 1 << 2,
}
