import { Driver } from "../driver/Driver";

export enum QueryStage {
	None,					// Query process hasn't started for this node
	ProtocolInfo,			// Retrieve protocol information
	Probe,					// Ping device to see if alive
	WakeUp,					// Start wake up process if a sleeping node
	ManufacturerSpecific1,	// Retrieve manufacturer name and product ids if ProtocolInfo lets us
	NodeInfo,				// Retrieve info about supported, controlled command classes
	NodePlusInfo,			// Retrieve ZWave+ info and update device classes
	SecurityReport,			// Retrieve a list of Command Classes that require Security
	ManufacturerSpecific2,	// Retrieve manufacturer name and product ids
	Versions,				// Retrieve version information
	Instances,				// Retrieve information about multiple command class instances
	Static,					// Retrieve static information (doesn't change)

	// ===== the stuff above should never change =====
	// ===== the stuff below changes frequently, so it has to be redone on every start =====

	CacheLoad,				// Ping a device upon restarting with cached config for the device
	Associations,			// Retrieve information about associations
	Neighbors,				// Retrieve node neighbor list
	Session,				// Retrieve session information (changes infrequently)
	Dynamic,				// Retrieve dynamic information (changes frequently)
	Configuration,			// Retrieve configurable parameter information (only done on request)
	Complete,				// Query process is completed for this node
}

export class Node {

	constructor(
		public readonly id: number,
		private readonly driver: Driver,
	) {
		// TODO restore from cache
	}

	public queryStage: QueryStage = QueryStage.None;

	public beginQuery(): void {
		//
	}

}
