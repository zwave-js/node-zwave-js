// This file is used to break some circular dependencies

import { CommandClass } from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { Endpoint } from "./Endpoint";

// prettier-ignore
export enum InterviewStage {
	None,					// [✓] Query process hasn't started for this node
	ProtocolInfo,			// [✓] Retrieve protocol information
	NodeInfo,				// [✓] Retrieve info about supported and controlled command classes
	// SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security

	// ===== the stuff above should never change =====
	RestartFromCache,		// This marks the beginning of re-interviews on application startup.
	// 						   RestartFromCache and later stages will be serialized as "Complete" in the cache
	// 						   [✓] Ping each device upon restarting with cached config
	// ===== the stuff below changes frequently, so it has to be redone on every start =====
	CommandClasses,			// [ ] Retrieve info about all command classes. This includes static information that is requested once
	// 						       as well as dynamic information that is requested on every restart

	// TODO: Heal network

	OverwriteConfig,		// [ ] Load node configuration from a configuration file
	Neighbors,				// [✓] Retrieve node neighbor list
	Configuration,			// [ ] Retrieve configurable parameter information (only done on request)
	Complete,				// [✓] Query process is completed for this node
}

export enum NodeStatus {
	Unknown,
	Asleep,
	Awake,
	Dead,
}

export interface IZWaveNode extends Endpoint {
	readonly id: number;

	/**
	 * This tells us which interview stage was last completed
	 */
	interviewStage: InterviewStage;

	/**
	 * Creates an instance of the given CC, which is linked to this node.
	 * Throws if the CC is neither supported nor controlled by the node.
	 */
	// wotan-disable no-misused-generics
	createCCInstance<T extends CommandClass>(cc: CommandClasses): T | undefined;
}
