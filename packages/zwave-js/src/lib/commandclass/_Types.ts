import type { CommandClasses } from "@zwave-js/core/safe";
import type { ZWaveNode } from "../node/Node";
import type { NotificationCCReport } from "./NotificationCC";

/** @publicAPI */
export enum EntryControlEventTypes {
	Caching = 0x00,
	CachedKeys = 0x01,
	Enter = 0x02,
	DisarmAll = 0x03,
	ArmAll = 0x04,
	ArmAway = 0x05,
	ArmHome = 0x06,
	ExitDelay = 0x07,
	Arm1 = 0x08,
	Arm2 = 0x09,
	Arm3 = 0x0a,
	Arm4 = 0x0b,
	Arm5 = 0x0c,
	Arm6 = 0x0d,
	Rfid = 0x0e,
	Bell = 0x0f,
	Fire = 0x10,
	Police = 0x11,
	AlertPanic = 0x12,
	AlertMedical = 0x13,
	GateOpen = 0x14,
	GateClose = 0x15,
	Lock = 0x16,
	Unlock = 0x17,
	Test = 0x18,
	Cancel = 0x19,
}

/** @publicAPI */
export enum EntryControlDataTypes {
	None = 0x00,
	Raw = 0x01,
	ASCII = 0x02,
	MD5 = 0x03,
}

/** @publicAPI */
export interface ZWaveNotificationCallbackArgs_EntryControlCC {
	eventType: EntryControlEventTypes;
	dataType: EntryControlDataTypes;
	eventData?: Buffer | string;
}

/**
 * @publicAPI
 * Parameter types for the Entry Control CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_EntryControlCC = [
	node: ZWaveNode,
	ccId: typeof CommandClasses["Entry Control"],
	args: ZWaveNotificationCallbackArgs_EntryControlCC,
];

/** @publicAPI */
export enum MultilevelSwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	StartLevelChange = 0x04,
	StopLevelChange = 0x05,
	SupportedGet = 0x06,
	SupportedReport = 0x07,
}

/**
 * @publicAPI
 * This is emitted when a start or stop event is received
 */
export interface ZWaveNotificationCallbackArgs_MultilevelSwitchCC {
	/** The numeric identifier for the event type */
	eventType:
		| MultilevelSwitchCommand.StartLevelChange
		| MultilevelSwitchCommand.StopLevelChange;
	/** The direction of the level change */
	direction?: string;
}

/**
 * @publicAPI
 * Parameter types for the MultilevelSwitch CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_MultilevelSwitchCC = [
	node: ZWaveNode,
	ccId: typeof CommandClasses["Multilevel Switch"],
	args: ZWaveNotificationCallbackArgs_MultilevelSwitchCC,
];

/** @publicAPI */
export interface ZWaveNotificationCallbackArgs_NotificationCC {
	/** The numeric identifier for the notification type */
	type: number;
	/** The human-readable label for the notification type */
	label: string;
	/** The numeric identifier for the notification event */
	event: number;
	/** The human-readable label for the notification event */
	eventLabel: string;
	/** Additional information related to the event */
	parameters?: NotificationCCReport["eventParameters"];
}

/**
 * @publicAPI
 * Parameter types for the Notification CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_NotificationCC = [
	node: ZWaveNode,
	ccId: CommandClasses.Notification,
	args: ZWaveNotificationCallbackArgs_NotificationCC,
];

/** @publicAPI */
export enum Powerlevel {
	"Normal Power" = 0x00,
	"-1 dBm" = 0x01,
	"-2 dBm" = 0x02,
	"-3 dBm" = 0x03,
	"-4 dBm" = 0x04,
	"-5 dBm" = 0x05,
	"-6 dBm" = 0x06,
	"-7 dBm" = 0x07,
	"-8 dBm" = 0x08,
	"-9 dBm" = 0x09,
}

/** @publicAPI */
export enum PowerlevelTestStatus {
	Failed = 0x00,
	Success = 0x01,
	"In Progress" = 0x02,
}

/**
 * @publicAPI
 * This is emitted when an unsolicited powerlevel test report is received
 */
export interface ZWaveNotificationCallbackArgs_PowerlevelCC {
	testNodeId: number;
	status: PowerlevelTestStatus;
	acknowledgedFrames: number;
}

/**
 * @publicAPI
 * Parameter types for the Powerlevel CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_PowerlevelCC = [
	node: ZWaveNode,
	ccId: CommandClasses.Powerlevel,
	args: ZWaveNotificationCallbackArgs_PowerlevelCC,
];
