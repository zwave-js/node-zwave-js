export enum MPDUHeaderType {
	Singlecast = 0x1,
	Multicast = 0x2,
	Acknowledgement = 0x3,
	Explorer = 0x5,
	Routed = 0x8,
}

export enum BeamingInfo {
	None = 0b00,
	ShortContinuous = 0b01,
	LongContinuous = 0b10,
	Fragmented = 0b100,
}

export type FrameType = "singlecast" | "broadcast" | "multicast";
