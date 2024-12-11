/** Allows querying the home ID and node ID of the host */
export interface HostIDs {
	/** The ID of this node in the current network */
	ownNodeId: number;
	/** The Home ID of the current network */
	homeId: number;
}
