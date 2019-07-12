// This file is used to break some circular dependencies

import { CommandClass } from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";

// prettier-ignore
export enum InterviewStage {
	None,					// [✓] Query process hasn't started for this node
	ProtocolInfo,			// [✓] Retrieve protocol information
	NodeInfo,				// [✓] Retrieve info about supported and controlled command classes
	NodePlusInfo,			// [✓] Retrieve ZWave+ info and update device classes
	ManufacturerSpecific,	// [✓] Retrieve manufacturer name and product ids, overwrite node info with configuration data
	SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security
	Versions,				// [✓] Retrieve version information
	Endpoints,				// [✓] Retrieve information about multiple command class endpoints
	Static,					// (✓) Retrieve static information we haven't received yet (doesn't change)

	// ===== the stuff above should never change =====
	RestartFromCache,		// This marks the beginning of re-interviews on application startup.
	// 						   RestartFromCache and later stages will be serialized as "Complete" in the cache
	// 						   [✓] Ping each device upon restarting with cached config
	// ===== the stuff below changes frequently, so it has to be redone on every start =====

	// TODO: Heal network

	WakeUp,					// [✓] Configure wake up to point to the master controller
	Associations,			// [ ] Retrieve information about associations
	OverwriteConfig,		// [ ] Load node configuration from a configuration file
	Neighbors,				// [✓] Retrieve node neighbor list
	Session,				// [ ] Retrieve session information (changes infrequently)
	Dynamic,				// [ ] Retrieve dynamic information (changes frequently)
	Configuration,			// [ ] Retrieve configurable parameter information (only done on request)
	Complete,				// [✓] Query process is completed for this node
}

export enum NodeStatus {
	Unknown,
	Asleep,
	Awake,
	Dead,
}

export interface IZWaveNode {
	readonly id: number;

	/**
	 * This tells us which interview stage was last completed
	 */
	interviewStage: InterviewStage;

	/**
	 * Retrieves the version of the given CommandClass this node implements.
	 * Returns 0 if the CC is not supported.
	 */
	getCCVersion(cc: CommandClasses): number;

	/** Tests if this node supports the given CommandClass */
	supportsCC(cc: CommandClasses): boolean;

	/** Tests if this node controls the given CommandClass */
	controlsCC(cc: CommandClasses): boolean;

	/**
	 * Creates an instance of the given CC, which is linked to this node.
	 * Throws if the CC is neither supported nor controlled by the node.
	 */
	// wotan-disable no-misused-generics
	createCCInstance<T extends CommandClass>(cc: CommandClasses): T | undefined;
}
