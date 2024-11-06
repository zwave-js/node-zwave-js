/** The priority of messages, sorted from high (0) to low (>0) */

export enum MessagePriority {
	// High-priority controller commands that must be handled before all other commands.
	// We use this priority to decide which messages go onto the immediate queue.
	ControllerImmediate = 0,
	// Controller commands finish quickly and should be preferred over node queries
	Controller,
	// Some node commands like nonces, responses to Supervision and Transport Service
	// need to be handled before all node commands.
	// We use this priority to decide which messages go onto the immediate queue.
	Immediate,
	// To avoid S2 collisions, some commands that normally have Immediate priority
	// have to go onto the normal queue, but still before all other messages
	ImmediateLow,
	// Pings (NoOP) are used for device probing at startup and for network diagnostics
	Ping,
	// Whenever sleeping devices wake up, their queued messages must be handled quickly
	// because they want to go to sleep soon. So prioritize them over non-sleeping devices
	WakeUp,
	// Normal operation and node data exchange
	Normal,
	// Node querying is expensive and happens whenever a new node is discovered.
	// In order to keep the system responsive, give them a lower priority
	NodeQuery,
	// Some devices need their state to be polled at regular intervals. Only do that when
	// nothing else needs to be done
	Poll,
}

export function isMessagePriority(val: unknown): val is MessagePriority {
	return typeof val === "number" && val in MessagePriority;
}
