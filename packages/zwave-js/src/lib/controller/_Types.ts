import { type DeviceID } from "@zwave-js/config";
import { type RFRegion } from "@zwave-js/core";
import { type Expand } from "@zwave-js/shared/safe";

export type HealNodeStatus = "pending" | "done" | "failed" | "skipped";

export interface HealNetworkOptions {
	/** Whether sleeping nodes should be healed too at the end of the healing process. Default: true */
	includeSleeping?: boolean;
}

export type SDKVersion =
	| `${number}.${number}`
	| `${number}.${number}.${number}`;

export interface FirmwareUpdateFileInfo {
	target: number;
	url: string;
	integrity: `sha256:${string}`;
}

/** The information sent to the firmware update service to identify which updates are available for a device. */
export type FirmwareUpdateDeviceID = Expand<
	DeviceID & {
		firmwareVersion: string;
		rfRegion?: RFRegion;
	}
>;

export interface FirmwareUpdateServiceResponse {
	version: string;
	changelog: string;
	channel: "stable" | "beta";
	files: FirmwareUpdateFileInfo[];
	downgrade: boolean;
	normalizedVersion: string;
}

export type FirmwareUpdateInfo = Expand<
	FirmwareUpdateServiceResponse & {
		/** Which device this update is for */
		device: FirmwareUpdateDeviceID;
	}
>;

export interface GetFirmwareUpdatesOptions {
	/** Allows overriding the API key for the firmware update service */
	apiKey?: string;
	/** Allows adding new components to the user agent sent to the firmware update service (existing components cannot be overwritten) */
	additionalUserAgentComponents?: Record<string, string>;
	/** Whether the returned firmware upgrades should include prereleases from the `"beta"` channel. Default: `false`. */
	includePrereleases?: boolean;
}

export interface ControllerFirmwareUpdateProgress {
	/** How many fragments of the firmware update have been transmitted. Together with `totalFragments` this can be used to display progress. */
	sentFragments: number;
	/** How many fragments the firmware update consists of. */
	totalFragments: number;
	/** The total progress of the firmware update in %, rounded to two digits. */
	progress: number;
}

export enum ControllerFirmwareUpdateStatus {
	// An expected response was not received from the controller in time
	Error_Timeout = 0,
	/** The maximum number of retry attempts for a firmware fragments were reached */
	Error_RetryLimitReached,
	/** The update was aborted by the bootloader */
	Error_Aborted,
	/** This controller does not support firmware updates */
	Error_NotSupported,

	OK = 0xff,
}

export interface ControllerFirmwareUpdateResult {
	success: boolean;
	status: ControllerFirmwareUpdateStatus;
}
