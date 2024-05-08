export enum ExplorerFrameCommand {
	Normal = 0x00,
	InclusionRequest = 0x01,
	SearchResult = 0x02,
}

export enum ZWaveFrameType {
	Singlecast,
	Multicast,
	AckDirect,
	ExplorerNormal,
	ExplorerSearchResult,
	ExplorerInclusionRequest,
	BeamStart,
	BeamStop,
}

/** An application-oriented representation of a Z-Wave frame that was captured by the Zniffer */

export enum LongRangeFrameType {
	Singlecast,
	Ack,
	BeamStart,
	BeamStop,
}
