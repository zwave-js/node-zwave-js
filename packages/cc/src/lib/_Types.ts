import {
	type CommandClasses,
	type DataRate,
	type FLiRS,
	type MaybeNotKnown,
	type MaybeUnknown,
	type MeterScale,
	type Scale,
	type ValueMetadata,
	ZWaveDataRate,
} from "@zwave-js/core/safe";

export enum AlarmSensorCommand {
	Get = 0x01,
	Report = 0x02,
	SupportedGet = 0x03,
	SupportedReport = 0x04,
}

export enum AlarmSensorType {
	"General Purpose" = 0x00,
	Smoke,
	CO,
	CO2,
	Heat,
	"Water Leak",
	Any = 0xff,
}

export type AlarmSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: AlarmSensorType;
	};
};

export enum AssociationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Remove = 0x04,
	SupportedGroupingsGet = 0x05,
	SupportedGroupingsReport = 0x06,
	SpecificGroupGet = 0x0b,
	SpecificGroupReport = 0x0c,
}

export enum AssociationCheckResult {
	OK = 0x01,
	/** The association is forbidden, because the destination is a ZWLR node. ZWLR does not support direct communication between end devices. */
	Forbidden_DestinationIsLongRange,
	/** The association is forbidden, because the source is a ZWLR node. ZWLR does not support direct communication between end devices. */
	Forbidden_SourceIsLongRange,
	/** The association is forbidden, because a node cannot be associated with itself. */
	Forbidden_SelfAssociation,
	/** The association is forbidden, because the source node's CC versions require the source and destination node to have the same (highest) security class. */
	Forbidden_SecurityClassMismatch,
	/** The association is forbidden, because the source node's CC versions require the source node to have the key for the destination node's highest security class. */
	Forbidden_DestinationSecurityClassNotGranted,
	/** The association is forbidden, because none of the CCs the source node sends are supported by the destination. */
	Forbidden_NoSupportedCCs,
}

export enum AssociationGroupInfoCommand {
	NameGet = 0x01,
	NameReport = 0x02,
	InfoGet = 0x03,
	InfoReport = 0x04,
	CommandListGet = 0x05,
	CommandListReport = 0x06,
}

// TODO: Check if this should be in a config file instead

export enum AssociationGroupInfoProfile {
	"General: N/A" = 0x00_00,
	"General: Lifeline" = 0x00_01,

	"Control: Key 01" = 0x20_01,
	"Control: Key 02",
	"Control: Key 03",
	"Control: Key 04",
	"Control: Key 05",
	"Control: Key 06",
	"Control: Key 07",
	"Control: Key 08",
	"Control: Key 09",
	"Control: Key 10",
	"Control: Key 11",
	"Control: Key 12",
	"Control: Key 13",
	"Control: Key 14",
	"Control: Key 15",
	"Control: Key 16",
	"Control: Key 17",
	"Control: Key 18",
	"Control: Key 19",
	"Control: Key 20",
	"Control: Key 21",
	"Control: Key 22",
	"Control: Key 23",
	"Control: Key 24",
	"Control: Key 25",
	"Control: Key 26",
	"Control: Key 27",
	"Control: Key 28",
	"Control: Key 29",
	"Control: Key 30",
	"Control: Key 31",
	"Control: Key 32",

	"Sensor: Air temperature" = 0x31_01,
	"Sensor: General purpose",
	"Sensor: Illuminance",
	"Sensor: Power",
	"Sensor: Humidity",
	"Sensor: Velocity",
	"Sensor: Direction",
	"Sensor: Atmospheric pressure",
	"Sensor: Barometric pressure",
	"Sensor: Solar radiation",
	"Sensor: Dew point",
	"Sensor: Rain rate",
	"Sensor: Tide level",
	"Sensor: Weight",
	"Sensor: Voltage",
	"Sensor: Current",
	"Sensor: Carbon dioxide (CO2) level",
	"Sensor: Air flow",
	"Sensor: Tank capacity",
	"Sensor: Distance",
	"Sensor: Angle position",
	"Sensor: Rotation",
	"Sensor: Water temperature",
	"Sensor: Soil temperature",
	"Sensor: Seismic Intensity",
	"Sensor: Seismic magnitude",
	"Sensor: Ultraviolet",
	"Sensor: Electrical resistivity",
	"Sensor: Electrical conductivity",
	"Sensor: Loudness",
	"Sensor: Moisture",
	"Sensor: Frequency",
	"Sensor: Time",
	"Sensor: Target temperature",
	"Sensor: Particulate Matter 2.5",
	"Sensor: Formaldehyde (CH2O) level",
	"Sensor: Radon concentration",
	"Sensor: Methane (CH4) density",
	"Sensor: Volatile Organic Compound level",
	"Sensor: Carbon monoxide (CO) level",
	"Sensor: Soil humidity",
	"Sensor: Soil reactivity",
	"Sensor: Soil salinity",
	"Sensor: Heart rate",
	"Sensor: Blood pressure",
	"Sensor: Muscle mass",
	"Sensor: Fat mass",
	"Sensor: Bone mass",
	"Sensor: Total body water (TBW)",
	"Sensor: Basis metabolic rate (BMR)",
	"Sensor: Body Mass Index (BMI)",
	"Sensor: Acceleration X-axis",
	"Sensor: Acceleration Y-axis",
	"Sensor: Acceleration Z-axis",
	"Sensor: Smoke density",
	"Sensor: Water flow",
	"Sensor: Water pressure",
	"Sensor: RF signal strength",
	"Sensor: Particulate Matter 10",
	"Sensor: Respiratory rate",
	"Sensor: Relative Modulation level",
	"Sensor: Boiler water temperature",
	"Sensor: Domestic Hot Water (DHW) temperature",
	"Sensor: Outside temperature",
	"Sensor: Exhaust temperature",
	"Sensor: Water Chlorine level",
	"Sensor: Water acidity",
	"Sensor: Water Oxidation reduction potential",
	"Sensor: Heart Rate LF/HF ratio",
	"Sensor: Motion Direction",
	"Sensor: Applied force on the sensor",
	"Sensor: Return Air temperature",
	"Sensor: Supply Air temperature",
	"Sensor: Condenser Coil temperature",
	"Sensor: Evaporator Coil temperature",
	"Sensor: Liquid Line temperature",
	"Sensor: Discharge Line temperature",
	"Sensor: Suction Pressure",
	"Sensor: Discharge Pressure",
	"Sensor: Defrost temperature",

	"Notification: Smoke Alarm" = 0x71_01,
	"Notification: CO Alarm",
	"Notification: CO2 Alarm",
	"Notification: Heat Alarm",
	"Notification: Water Alarm",
	"Notification: Access Control",
	"Notification: Home Security",
	"Notification: Power Management",
	"Notification: System",
	"Notification: Emergency Alarm",
	"Notification: Clock",
	"Notification: Appliance",
	"Notification: Home Health",
	"Notification: Siren",
	"Notification: Water Valve",
	"Notification: Weather Alarm",
	"Notification: Irrigation",
	"Notification: Gas alarm",
	"Notification: Pest Control",
	"Notification: Light sensor",
	"Notification: Water Quality Monitoring",
	"Notification: Home monitoring",

	"Meter: Electric" = 0x32_01,
	"Meter: Gas",
	"Meter: Water",
	"Meter: Heating",
	"Meter: Cooling",

	"Irrigation: Channel 01" = 0x6b_01,
	"Irrigation: Channel 02",
	"Irrigation: Channel 03",
	"Irrigation: Channel 04",
	"Irrigation: Channel 05",
	"Irrigation: Channel 06",
	"Irrigation: Channel 07",
	"Irrigation: Channel 08",
	"Irrigation: Channel 09",
	"Irrigation: Channel 10",
	"Irrigation: Channel 11",
	"Irrigation: Channel 12",
	"Irrigation: Channel 13",
	"Irrigation: Channel 14",
	"Irrigation: Channel 15",
	"Irrigation: Channel 16",
	"Irrigation: Channel 17",
	"Irrigation: Channel 18",
	"Irrigation: Channel 19",
	"Irrigation: Channel 20",
	"Irrigation: Channel 21",
	"Irrigation: Channel 22",
	"Irrigation: Channel 23",
	"Irrigation: Channel 24",
	"Irrigation: Channel 25",
	"Irrigation: Channel 26",
	"Irrigation: Channel 27",
	"Irrigation: Channel 28",
	"Irrigation: Channel 29",
	"Irrigation: Channel 30",
	"Irrigation: Channel 31",
	"Irrigation: Channel 32",
}

export interface AssociationGroup {
	/** How many nodes this association group supports */
	maxNodes: number;
	/** Whether this is the lifeline association (where the Controller must not be removed) */
	isLifeline: boolean;
	/** Whether multi channel associations are allowed */
	multiChannel: boolean;
	/** The name of the group */
	label: string;
	/** The association group profile (if known) */
	profile?: AssociationGroupInfoProfile;
	/** A map of Command Classes and commands issued by this group (if known) */
	issuedCommands?: ReadonlyMap<CommandClasses, readonly number[]>;
}

export enum BarrierOperatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SignalingCapabilitiesGet = 0x04,
	SignalingCapabilitiesReport = 0x05,
	EventSignalingSet = 0x06,
	EventSignalingGet = 0x07,
	EventSignalingReport = 0x08,
}

export enum BarrierState {
	Closed = 0x00,
	Closing = 0xfc,
	Stopped = 0xfd,
	Opening = 0xfe,
	Open = 0xff,
}

export enum SubsystemType {
	Audible = 0x01,
	Visual = 0x02,
}

export enum SubsystemState {
	Off = 0x00,
	On = 0xff,
}

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum BatteryChargingStatus {
	Discharging = 0x00,
	Charging = 0x01,
	Maintaining = 0x02,
}

export enum BatteryReplacementStatus {
	No = 0x00,
	Soon = 0x01,
	Now = 0x02,
}

export enum BatteryCommand {
	Get = 0x02,
	Report = 0x03,
	HealthGet = 0x04,
	HealthReport = 0x05,
}

export enum BinarySensorCommand {
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x01,
	SupportedReport = 0x04,
}

export enum BinarySensorType {
	"General Purpose" = 0x01,
	Smoke = 0x02,
	CO = 0x03,
	CO2 = 0x04,
	Heat = 0x05,
	Water = 0x06,
	Freeze = 0x07,
	Tamper = 0x08,
	Aux = 0x09,
	"Door/Window" = 0x0a,
	Tilt = 0x0b,
	Motion = 0x0c,
	"Glass Break" = 0x0d,
	Any = 0xff,
}

export type BinarySensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: BinarySensorType;
	};
};

export enum BinarySwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum CentralSceneCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Notification = 0x03,
	ConfigurationSet = 0x04,
	ConfigurationGet = 0x05,
	ConfigurationReport = 0x06,
}

export enum CentralSceneKeys {
	KeyPressed = 0x00,
	KeyReleased = 0x01,
	KeyHeldDown = 0x02,
	KeyPressed2x = 0x03,
	KeyPressed3x = 0x04,
	KeyPressed4x = 0x05,
	KeyPressed5x = 0x06,
}

export enum ClimateControlScheduleCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	ChangedGet = 0x04,
	ChangedReport = 0x05,
	OverrideSet = 0x06,
	OverrideGet = 0x07,
	OverrideReport = 0x08,
}

export enum ScheduleOverrideType {
	None = 0x00,
	Temporary = 0x01,
	Permanent = 0x02,
}

export enum ClockCommand {
	Set = 0x04,
	Get = 0x05,
	Report = 0x06,
}

export enum Weekday {
	Unknown = 0x00,
	Monday = 0x01,
	Tuesday = 0x02,
	Wednesday = 0x03,
	Thursday = 0x04,
	Friday = 0x05,
	Saturday = 0x06,
	Sunday = 0x07,
}

export enum ColorSwitchCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Get = 0x03,
	Report = 0x04,
	Set = 0x05,
	StartLevelChange = 0x06,
	StopLevelChange = 0x07,
}

export enum ColorComponent {
	"Warm White" = 0,
	"Cold White",
	Red,
	Green,
	Blue,
	Amber,
	Cyan,
	Purple,
	Index,
}

export const ColorComponentMap = {
	warmWhite: ColorComponent["Warm White"],
	coldWhite: ColorComponent["Cold White"],
	red: ColorComponent.Red,
	green: ColorComponent.Green,
	blue: ColorComponent.Blue,
	amber: ColorComponent.Amber,
	cyan: ColorComponent.Cyan,
	purple: ColorComponent.Purple,
	index: ColorComponent.Index,
};
export type ColorKey = keyof typeof ColorComponentMap;

/**
 * This type is used to accept both the kebabCase names and numeric components as table keys
 */
export type ColorTable =
	| Partial<Record<ColorKey, number>>
	| Partial<Record<ColorComponent, number>>;

export enum ConfigurationCommand {
	Set = 0x04,
	Get = 0x05,
	Report = 0x06,
	BulkSet = 0x07,
	BulkGet = 0x08,
	BulkReport = 0x09,
	NameGet = 0x0a,
	NameReport = 0x0b,
	InfoGet = 0x0c,
	InfoReport = 0x0d,
	PropertiesGet = 0x0e,
	PropertiesReport = 0x0f,
	DefaultReset = 0x01,
}

export type { ConfigValue } from "@zwave-js/core/safe";

export enum CRC16Command {
	CommandEncapsulation = 0x01,
}

export enum DeviceResetLocallyCommand {
	Notification = 0x01,
}

export enum DoorLockCommand {
	OperationSet = 0x01,
	OperationGet = 0x02,
	OperationReport = 0x03,
	ConfigurationSet = 0x04,
	ConfigurationGet = 0x05,
	ConfigurationReport = 0x06,
	CapabilitiesGet = 0x07,
	CapabilitiesReport = 0x08,
}

export enum DoorLockMode {
	Unsecured = 0x00,
	UnsecuredWithTimeout = 0x01,
	InsideUnsecured = 0x10,
	InsideUnsecuredWithTimeout = 0x11,
	OutsideUnsecured = 0x20,
	OutsideUnsecuredWithTimeout = 0x21,
	Unknown = 0xfe,
	Secured = 0xff,
}

export enum DoorLockOperationType {
	Constant = 0x01,
	Timed = 0x02,
}

export type DoorHandleStatus = [boolean, boolean, boolean, boolean];

export enum EnergyProductionCommand {
	Get = 0x02,
	Report = 0x03,
}

export enum EnergyProductionParameter {
	Power = 0x00,
	"Production Total" = 0x01,
	"Production Today" = 0x02,
	"Total Time" = 0x03,
}

export interface EnergyProductionScale {
	key: number;
	unit: string;
}

export function getEnergyProductionScale(
	parameter: EnergyProductionParameter,
	key: number,
): EnergyProductionScale {
	if (parameter === EnergyProductionParameter.Power && key === 0x00) {
		return {
			key,
			unit: "W",
		};
	} else if (
		parameter === EnergyProductionParameter["Production Total"]
		&& key === 0x00
	) {
		return {
			key,
			unit: "Wh",
		};
	} else if (
		parameter === EnergyProductionParameter["Production Today"]
		&& key === 0x00
	) {
		return {
			key,
			unit: "Wh",
		};
	} else if (parameter === EnergyProductionParameter["Total Time"]) {
		if (key === 0x00) {
			return {
				key,
				unit: "seconds",
			};
		} else if (key === 0x01) {
			return {
				key,
				unit: "hours",
			};
		}
	}
	return {
		key,
		unit: "unknown",
	};
}

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

export const entryControlEventTypeLabels: Record<
	EntryControlEventTypes,
	string
> = {
	[EntryControlEventTypes.Caching]: "Caching",
	[EntryControlEventTypes.CachedKeys]: "Cached keys",
	[EntryControlEventTypes.Enter]: "Enter",
	[EntryControlEventTypes.DisarmAll]: "Disarm all",
	[EntryControlEventTypes.ArmAll]: "Arm all",
	[EntryControlEventTypes.ArmAway]: "Away",
	[EntryControlEventTypes.ArmHome]: "Home",
	[EntryControlEventTypes.ExitDelay]: "Arm delay",
	[EntryControlEventTypes.Arm1]: "Arm zone 1",
	[EntryControlEventTypes.Arm2]: "Arm zone 2",
	[EntryControlEventTypes.Arm3]: "Arm zone 3",
	[EntryControlEventTypes.Arm4]: "Arm zone 4",
	[EntryControlEventTypes.Arm5]: "Arm zone 5",
	[EntryControlEventTypes.Arm6]: "Arm zone 6",
	[EntryControlEventTypes.Rfid]: "RFID",
	[EntryControlEventTypes.Bell]: "Bell",
	[EntryControlEventTypes.Fire]: "Fire",
	[EntryControlEventTypes.Police]: "Police",
	[EntryControlEventTypes.AlertPanic]: "Panic alert",
	[EntryControlEventTypes.AlertMedical]: "Medical alert",
	[EntryControlEventTypes.GateOpen]: "Open gate",
	[EntryControlEventTypes.GateClose]: "Close gate",
	[EntryControlEventTypes.Lock]: "Lock",
	[EntryControlEventTypes.Unlock]: "Unlock",
	[EntryControlEventTypes.Test]: "Test",
	[EntryControlEventTypes.Cancel]: "Cancel",
};

export enum DoorLockLoggingCommand {
	RecordsSupportedGet = 0x01,
	RecordsSupportedReport = 0x02,
	RecordGet = 0x03,
	RecordReport = 0x04,
}

export enum DoorLockLoggingEventType {
	LockCode = 0x01,
	UnlockCode = 0x02,
	LockButton = 0x03,
	UnlockButton = 0x04,
	LockCodeOutOfSchedule = 0x05,
	UnlockCodeOutOfSchedule = 0x06,
	IllegalCode = 0x07,
	LockManual = 0x08,
	UnlockManual = 0x09,
	LockAuto = 0x0a,
	UnlockAuto = 0x0b,
	LockRemoteCode = 0x0c,
	UnlockRemoteCode = 0x0d,
	LockRemote = 0x0e,
	UnlockRemote = 0x0f,
	LockRemoteCodeOutOfSchedule = 0x10,
	UnlockRemoteCodeOutOfSchedule = 0x11,
	RemoteIllegalCode = 0x12,
	LockManual2 = 0x13,
	UnlockManual2 = 0x14,
	LockSecured = 0x15,
	LockUnsecured = 0x16,
	UserCodeAdded = 0x17,
	UserCodeDeleted = 0x18,
	AllUserCodesDeleted = 0x19,
	AdminCodeChanged = 0x1a,
	UserCodeChanged = 0x1b,
	LockReset = 0x1c,
	ConfigurationChanged = 0x1d,
	LowBattery = 0x1e,
	NewBattery = 0x1f,
	Unknown = 0x20,
}

export interface DoorLockLoggingRecord {
	timestamp: string;
	eventType: DoorLockLoggingEventType;
	label: string;
	userId?: number;
	userCode?: string | Buffer;
}

export enum DoorLockLoggingRecordStatus {
	Empty = 0x00,
	HoldsLegalData = 0x01,
}

export enum EntryControlCommand {
	Notification = 0x01,
	KeySupportedGet = 0x02,
	KeySupportedReport = 0x03,
	EventSupportedGet = 0x04,
	EventSupportedReport = 0x05,
	ConfigurationSet = 0x06,
	ConfigurationGet = 0x07,
	ConfigurationReport = 0x08,
}

export enum EntryControlDataTypes {
	None = 0x00,
	Raw = 0x01,
	ASCII = 0x02,
	MD5 = 0x03,
}

export enum FirmwareUpdateMetaDataCommand {
	MetaDataGet = 0x01,
	MetaDataReport = 0x02,
	RequestGet = 0x03,
	RequestReport = 0x04,
	Get = 0x05,
	Report = 0x06,
	StatusReport = 0x07,
	ActivationSet = 0x08,
	ActivationReport = 0x09,
	PrepareGet = 0x0a,
	PrepareReport = 0x0b,
}

export interface FirmwareUpdateMetaData {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
	firmwareUpgradable: boolean;
	maxFragmentSize?: number;
	additionalFirmwareIDs: readonly number[];
	hardwareVersion?: number;
	continuesToFunction: MaybeNotKnown<boolean>;
	supportsActivation: MaybeNotKnown<boolean>;
	supportsResuming?: MaybeNotKnown<boolean>;
	supportsNonSecureTransfer?: MaybeNotKnown<boolean>;
}

export enum FirmwareUpdateRequestStatus {
	Error_InvalidManufacturerOrFirmwareID = 0,
	Error_AuthenticationExpected = 1,
	Error_FragmentSizeTooLarge = 2,
	Error_NotUpgradable = 3,
	Error_InvalidHardwareVersion = 4,
	Error_FirmwareUpgradeInProgress = 5,
	Error_BatteryLow = 6,
	OK = 0xff,
}

export enum FirmwareUpdateStatus {
	// Error_Timeout is not part of the Z-Wave standard, but we use it to report
	// that no status report was received
	Error_Timeout = -1,

	Error_Checksum = 0,
	/** TransmissionFailed is also used for user-aborted upgrades */
	Error_TransmissionFailed = 1,
	Error_InvalidManufacturerID = 2,
	Error_InvalidFirmwareID = 3,
	Error_InvalidFirmwareTarget = 4,
	Error_InvalidHeaderInformation = 5,
	Error_InvalidHeaderFormat = 6,
	Error_InsufficientMemory = 7,
	Error_InvalidHardwareVersion = 8,

	// When adding more OK statuses, change the check in Node::finishFirmwareUpdate
	OK_WaitingForActivation = 0xfd,
	OK_NoRestart = 0xfe,
	OK_RestartPending = 0xff,
}

export enum FirmwareUpdateActivationStatus {
	Error_InvalidFirmware = 0,
	Error_ActivationFailed = 1,
	OK = 0xff,
}

export enum FirmwareDownloadStatus {
	Error_InvalidManufacturerOrFirmwareID = 0,
	Error_AuthenticationExpected = 1,
	Error_FragmentSizeTooLarge = 2,
	Error_NotDownloadable = 3,
	Error_InvalidHardwareVersion = 4,
	OK = 0xff,
}

export type FirmwareUpdateCapabilities =
	| {
		/** Indicates whether the node's firmware can be upgraded */
		readonly firmwareUpgradable: false;
	}
	| {
		/** Indicates whether the node's firmware can be upgraded */
		readonly firmwareUpgradable: true;
		/** An array of firmware targets that can be upgraded */
		readonly firmwareTargets: readonly number[];
		/** Indicates whether the node continues to function normally during an upgrade */
		readonly continuesToFunction: MaybeNotKnown<boolean>;
		/** Indicates whether the node supports delayed activation of the new firmware */
		readonly supportsActivation: MaybeNotKnown<boolean>;
		/** Indicates whether the node supports resuming aborted firmware transfers */
		readonly supportsResuming: MaybeNotKnown<boolean>;
		/** Indicates whether the node supports non-secure firmware transfers */
		readonly supportsNonSecureTransfer: MaybeNotKnown<boolean>;
	};

export interface FirmwareUpdateProgress {
	/** Which part/file of the firmware update process is currently in progress. This is a number from 1 to `totalFiles` and can be used to display progress. */
	currentFile: number;
	/** How many files the firmware update process consists of. */
	totalFiles: number;
	/** How many fragments of the current file have been transmitted. Together with `totalFragments` this can be used to display progress. */
	sentFragments: number;
	/** How many fragments the current file of the firmware update consists of. */
	totalFragments: number;
	/** The total progress of the firmware update in %, rounded to two digits. This considers the total size of all files. */
	progress: number;
}

export interface FirmwareUpdateResult {
	/** The status returned by the device for this firmware update attempt. For multi-target updates, this will be the status for the last update. */
	status: FirmwareUpdateStatus;
	/** Whether the update was successful. This is a simpler interpretation of the `status` field. */
	success: boolean;
	/** How long (in seconds) to wait before interacting with the device again */
	waitTime?: number;
	/** Whether the device will be re-interviewed. If this is `true`, applications should wait for the `"ready"` event to interact with the device again. */
	reInterview: boolean;
}

export enum HailCommand {
	Hail = 0x01,
}

export enum HumidityControlModeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

export enum HumidityControlMode {
	"Off" = 0x00,
	"Humidify" = 0x01,
	"De-humidify" = 0x02,
	"Auto" = 0x03,
}

export enum HumidityControlOperatingStateCommand {
	Get = 0x01,
	Report = 0x02,
}

export enum HumidityControlOperatingState {
	"Idle" = 0x00,
	"Humidifying" = 0x01,
	"De-humidifying" = 0x02,
}

export enum HumidityControlSetpointCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	ScaleSupportedGet = 0x06,
	ScaleSupportedReport = 0x07,
	CapabilitiesGet = 0x08,
	CapabilitiesReport = 0x09,
}

export enum HumidityControlSetpointType {
	"N/A" = 0x00,
	"Humidifier" = 0x01, // CC v1
	"De-humidifier" = 0x02, // CC v1
	"Auto" = 0x03, // CC v2
}

export interface HumidityControlSetpointValue {
	value: number;
	scale: number;
}

export interface HumidityControlSetpointCapabilities {
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
}

export type HumidityControlSetpointMetadata = ValueMetadata & {
	ccSpecific: {
		setpointType: HumidityControlSetpointType;
	};
};

export enum InclusionControllerCommand {
	Initiate = 0x01,
	Complete = 0x02,
}

export enum InclusionControllerStep {
	ProxyInclusion = 0x01,
	S0Inclusion = 0x02,
	ProxyInclusionReplace = 0x03,
}

export enum InclusionControllerStatus {
	OK = 0x01,
	UserRejected = 0x02,
	Failed = 0x03,
	NotSupported = 0x04,
}

export enum IndicatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	DescriptionGet = 0x06,
	DescriptionReport = 0x07,
}

/** Specifies a timeout for an indicator. At least one of the properties must be present. */
export interface IndicatorTimeout {
	/** Whole hours (0-255) */
	hours?: number;
	/** Whole minutes (0-255) */
	minutes?: number;
	/** Whole and 1/100th seconds (0-59.99) */
	seconds?: number;
}

export type IndicatorMetadata = ValueMetadata & {
	ccSpecific: {
		indicatorId: number;
		// only present on V2+ indicators:
		propertyId?: number;
	};
};

export enum IrrigationCommand {
	SystemInfoGet = 0x01,
	SystemInfoReport = 0x02,
	SystemStatusGet = 0x03,
	SystemStatusReport = 0x04,
	SystemConfigSet = 0x05,
	SystemConfigGet = 0x06,
	SystemConfigReport = 0x07,
	ValveInfoGet = 0x08,
	ValveInfoReport = 0x09,
	ValveConfigSet = 0x0a,
	ValveConfigGet = 0x0b,
	ValveConfigReport = 0x0c,
	ValveRun = 0x0d,
	ValveTableSet = 0x0e,
	ValveTableGet = 0x0f,
	ValveTableReport = 0x10,
	ValveTableRun = 0x11,
	SystemShutoff = 0x12,
}

export enum IrrigationSensorPolarity {
	Low = 0,
	High = 1,
}

export enum ValveType {
	ZoneValve = 0,
	MasterValve = 1,
}

export type ValveId = "master" | number;

export interface ValveTableEntry {
	valveId: number;
	duration: number;
}

export enum LanguageCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum LockCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum ManufacturerSpecificCommand {
	Get = 0x04,
	Report = 0x05,
	DeviceSpecificGet = 0x06,
	DeviceSpecificReport = 0x07,
}

export enum DeviceIdType {
	FactoryDefault = 0x00,
	SerialNumber = 0x01,
	PseudoRandom = 0x02,
}

export enum MeterCommand {
	Get = 0x01,
	Report = 0x02,
	SupportedGet = 0x03,
	SupportedReport = 0x04,
	Reset = 0x05,
}

export enum RateType {
	Unspecified = 0x00,
	Consumed = 0x01,
	Produced = 0x02,
}

export type MeterMetadata = ValueMetadata & {
	ccSpecific: {
		meterType: number;
		rateType?: RateType;
		scale?: number;
	};
};

export interface MeterReading {
	rateType: RateType;
	value: number;
	previousValue: MaybeNotKnown<number>;
	deltaTime: MaybeUnknown<number>;
	type: number;
	scale: MeterScale;
}

export enum MultiChannelAssociationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Remove = 0x04,
	SupportedGroupingsGet = 0x05,
	SupportedGroupingsReport = 0x06,
}

export interface AssociationAddress {
	nodeId: number;
	endpoint?: number;
}

export interface EndpointAddress {
	nodeId: number;
	endpoint: number | number[];
}

export enum MultiChannelCommand {
	// Legacy commands for V1 (Multi Instance)
	GetV1 = 0x04,
	ReportV1 = 0x05,
	CommandEncapsulationV1 = 0x06,

	// V2+
	EndPointGet = 0x07,
	EndPointReport = 0x08,
	CapabilityGet = 0x09,
	CapabilityReport = 0x0a,
	EndPointFind = 0x0b,
	EndPointFindReport = 0x0c,
	CommandEncapsulation = 0x0d,
	AggregatedMembersGet = 0x0e,
	AggregatedMembersReport = 0x0f,
}

export enum MultiCommandCommand {
	CommandEncapsulation = 0x01,
}

export enum MultilevelSensorCommand {
	GetSupportedSensor = 0x01,
	SupportedSensorReport = 0x02,
	GetSupportedScale = 0x03,
	Get = 0x04,
	Report = 0x05,
	SupportedScaleReport = 0x06,
}

export interface MultilevelSensorValue {
	value: number;
	scale: Scale;
}

export type MultilevelSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: number;
		scale: number;
	};
};

export enum MultilevelSwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	StartLevelChange = 0x04,
	StopLevelChange = 0x05,
	SupportedGet = 0x06,
	SupportedReport = 0x07,
}

export enum LevelChangeDirection {
	"up" = 0b0,
	"down" = 0b1,
}

export enum SwitchType {
	"not supported" = 0x00,
	"Off/On" = 0x01,
	"Down/Up" = 0x02,
	"Close/Open" = 0x03,
	"CCW/CW" = 0x04,
	"Left/Right" = 0x05,
	"Reverse/Forward" = 0x06,
	"Pull/Push" = 0x07,
}

export type MultilevelSwitchLevelChangeMetadata = ValueMetadata & {
	ccSpecific: {
		switchType: SwitchType;
	};
};

export enum NodeNamingAndLocationCommand {
	NameSet = 0x01,
	NameGet = 0x02,
	NameReport = 0x03,
	LocationSet = 0x04,
	LocationGet = 0x05,
	LocationReport = 0x06,
}

export enum NotificationCommand {
	EventSupportedGet = 0x01,
	EventSupportedReport = 0x02,
	Get = 0x04,
	Report = 0x05,
	Set = 0x06,
	SupportedGet = 0x07,
	SupportedReport = 0x08,
}

export type NotificationMetadata = ValueMetadata & {
	ccSpecific: {
		notificationType: number;
	};
};

export enum PowerlevelCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	TestNodeSet = 0x04,
	TestNodeGet = 0x05,
	TestNodeReport = 0x06,
}

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

export enum PowerlevelTestStatus {
	Failed = 0x00,
	Success = 0x01,
	"In Progress" = 0x02,
}

export enum ProtectionCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	ExclusiveControlSet = 0x06,
	ExclusiveControlGet = 0x07,
	ExclusiveControlReport = 0x08,
	TimeoutSet = 0x09,
	TimeoutGet = 0x0a,
	TimeoutReport = 0x0b,
}

export enum LocalProtectionState {
	Unprotected = 0,
	ProtectedBySequence = 1,
	NoOperationPossible = 2,
}

export enum RFProtectionState {
	Unprotected = 0,
	NoControl = 1,
	NoResponse = 2,
}

export enum SceneActivationCommand {
	Set = 0x01,
}

export enum SceneActuatorConfigurationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum SceneControllerConfigurationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum ScheduleEntryLockCommand {
	EnableSet = 0x01,
	EnableAllSet = 0x02,
	WeekDayScheduleSet = 0x03,
	WeekDayScheduleGet = 0x04,
	WeekDayScheduleReport = 0x05,
	YearDayScheduleSet = 0x06,
	YearDayScheduleGet = 0x07,
	YearDayScheduleReport = 0x08,
	SupportedGet = 0x09,
	SupportedReport = 0x0a,
	TimeOffsetGet = 0x0b,
	TimeOffsetReport = 0x0c,
	TimeOffsetSet = 0x0d,
	DailyRepeatingScheduleGet = 0x0e,
	DailyRepeatingScheduleReport = 0x0f,
	DailyRepeatingScheduleSet = 0x10,
}

export enum ScheduleEntryLockSetAction {
	Erase,
	Set,
}

export interface ScheduleEntryLockSlotId {
	userId: number;
	slotId: number;
}

export enum ScheduleEntryLockWeekday {
	// Yay, consistency!
	Sunday = 0x00,
	Monday = 0x01,
	Tuesday = 0x02,
	Wednesday = 0x03,
	Thursday = 0x04,
	Friday = 0x05,
	Saturday = 0x06,
}

export interface ScheduleEntryLockDailyRepeatingSchedule {
	weekdays: ScheduleEntryLockWeekday[];
	startHour: number;
	startMinute: number;
	durationHour: number;
	durationMinute: number;
}

export interface ScheduleEntryLockYearDaySchedule {
	startYear: number;
	startMonth: number;
	startDay: number;
	startHour: number;
	startMinute: number;
	stopYear: number;
	stopMonth: number;
	stopDay: number;
	stopHour: number;
	stopMinute: number;
}

export interface ScheduleEntryLockWeekDaySchedule {
	weekday: ScheduleEntryLockWeekday;
	startHour: number;
	startMinute: number;
	stopHour: number;
	stopMinute: number;
}

export enum ScheduleEntryLockScheduleKind {
	WeekDay,
	YearDay,
	DailyRepeating,
}

export enum Security2Command {
	NonceGet = 0x01,
	NonceReport = 0x02,
	MessageEncapsulation = 0x03,
	KEXGet = 0x04,
	KEXReport = 0x05,
	KEXSet = 0x06,
	KEXFail = 0x07,
	PublicKeyReport = 0x08,
	NetworkKeyGet = 0x09,
	NetworkKeyReport = 0x0a,
	NetworkKeyVerify = 0x0b,
	TransferEnd = 0x0c,
	CommandsSupportedGet = 0x0d,
	CommandsSupportedReport = 0x0e,
}

export enum SecurityCommand {
	CommandsSupportedGet = 0x02,
	CommandsSupportedReport = 0x03,
	SchemeGet = 0x04,
	SchemeReport = 0x05,
	SchemeInherit = 0x08,
	NetworkKeySet = 0x06,
	NetworkKeyVerify = 0x07,
	NonceGet = 0x40,
	NonceReport = 0x80,
	CommandEncapsulation = 0x81,
	CommandEncapsulationNonceGet = 0xc1,
}

export enum SoundSwitchCommand {
	TonesNumberGet = 0x01,
	TonesNumberReport = 0x02,
	ToneInfoGet = 0x03,
	ToneInfoReport = 0x04,
	ConfigurationSet = 0x05,
	ConfigurationGet = 0x06,
	ConfigurationReport = 0x07,
	TonePlaySet = 0x08,
	TonePlayGet = 0x09,
	TonePlayReport = 0x0a,
}

export enum ToneId {
	Off = 0x00,
	Default = 0xff,
}

export enum SupervisionCommand {
	Get = 0x01,
	Report = 0x02,
}

export interface Timezone {
	standardOffset: number;
	dstOffset: number;
}

export enum ThermostatFanModeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

export enum ThermostatFanMode {
	"Auto low" = 0x00,
	"Low" = 0x01,
	"Auto high" = 0x02,
	"High" = 0x03,
	"Auto medium" = 0x04,
	"Medium" = 0x05,
	"Circulation" = 0x06,
	"Humidity circulation" = 0x07,
	"Left and right" = 0x08,
	"Up and down" = 0x09,
	"Quiet" = 0x0a,
	"External circulation" = 0x0b,
}

export enum ThermostatFanStateCommand {
	Get = 0x02,
	Report = 0x03,
}

export enum ThermostatFanState {
	"Idle / off" = 0x00,
	"Running / running low" = 0x01,
	"Running high" = 0x02,
	"Running medium" = 0x03,
	"Circulation mode" = 0x04,
	"Humidity circulation mode" = 0x05,
	"Right - left circulation mode" = 0x06,
	"Up - down circulation mode" = 0x07,
	"Quiet circulation mode" = 0x08,
}

export enum ThermostatModeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

export enum ThermostatMode {
	"Off" = 0x00,
	"Heat" = 0x01,
	"Cool" = 0x02,
	"Auto" = 0x03,
	"Auxiliary" = 0x04,
	"Resume (on)" = 0x05,
	"Fan" = 0x06,
	"Furnace" = 0x07,
	"Dry" = 0x08,
	"Moist" = 0x09,
	"Auto changeover" = 0x0a,
	"Energy heat" = 0x0b,
	"Energy cool" = 0x0c,
	"Away" = 0x0d,
	"Full power" = 0x0f,
	"Manufacturer specific" = 0x1f,
}

export enum ThermostatOperatingStateCommand {
	Get = 0x02,
	Report = 0x03,
	// TODO: Implement V2 commands
	// LoggingSupportedGet = 0x01,
	// LoggingSupportedReport = 0x04,
	// LoggingGet = 0x05,
	// LoggingReport = 0x06,
}

export enum ThermostatOperatingState {
	"Idle" = 0x00,
	"Heating" = 0x01,
	"Cooling" = 0x02,
	"Fan Only" = 0x03,
	"Pending Heat" = 0x04,
	"Pending Cool" = 0x05,
	"Vent/Economizer" = 0x06,
	"Aux Heating" = 0x07,
	"2nd Stage Heating" = 0x08,
	"2nd Stage Cooling" = 0x09,
	"2nd Stage Aux Heat" = 0x0a,
	"3rd Stage Aux Heat" = 0x0b,
}

export enum ThermostatSetbackCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum SetbackType {
	None = 0x00,
	Temporary = 0x01,
	Permanent = 0x02,
}

export type SetbackSpecialState =
	| "Frost Protection"
	| "Energy Saving"
	| "Unused";

export type SetbackState = number | SetbackSpecialState;

export interface Switchpoint {
	hour: number;
	minute: number;
	state: SetbackState | undefined;
}

export enum ThermostatSetpointCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	CapabilitiesGet = 0x09,
	CapabilitiesReport = 0x0a,
}

export enum ThermostatSetpointType {
	"N/A" = 0x00,
	"Heating" = 0x01, // CC v1
	"Cooling" = 0x02, // CC v1
	"Furnace" = 0x07, // CC v1
	"Dry Air" = 0x08, // CC v1
	"Moist Air" = 0x09, // CC v1
	"Auto Changeover" = 0x0a, // CC v1
	"Energy Save Heating" = 0x0b, // CC v2
	"Energy Save Cooling" = 0x0c, // CC v2
	"Away Heating" = 0x0d, // CC v2
	"Away Cooling" = 0x0e, // CC v3
	"Full Power" = 0x0f, // CC v3
}

export interface ThermostatSetpointValue {
	value: number;
	scale: number;
}

export interface ThermostatSetpointCapabilities {
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
}

export type ThermostatSetpointMetadata = ValueMetadata & {
	ccSpecific: {
		setpointType: ThermostatSetpointType;
	};
};

export enum TimeCommand {
	TimeGet = 0x01,
	TimeReport = 0x02,
	DateGet = 0x03,
	DateReport = 0x04,
	TimeOffsetSet = 0x05,
	TimeOffsetGet = 0x06,
	TimeOffsetReport = 0x07,
}

export enum TimeParametersCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export enum TransportServiceCommand {
	FirstSegment = 0xc0,
	SegmentComplete = 0xe8,
	SegmentRequest = 0xc8,
	SegmentWait = 0xf0,
	SubsequentSegment = 0xe0,
}

export enum UserCodeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	// V2+
	UsersNumberGet = 0x04,
	UsersNumberReport = 0x05,
	CapabilitiesGet = 0x06,
	CapabilitiesReport = 0x07,
	KeypadModeSet = 0x08,
	KeypadModeGet = 0x09,
	KeypadModeReport = 0x0a,
	ExtendedUserCodeSet = 0x0b,
	ExtendedUserCodeGet = 0x0c,
	ExtendedUserCodeReport = 0x0d,
	AdminCodeSet = 0x0e,
	AdminCodeGet = 0x0f,
	AdminCodeReport = 0x10,
	UserCodeChecksumGet = 0x11,
	UserCodeChecksumReport = 0x12,
}

export enum UserIDStatus {
	Available = 0x00,
	Enabled,
	Disabled,
	Messaging,
	PassageMode,
	StatusNotAvailable = 0xfe,
}

export enum KeypadMode {
	Normal = 0x00,
	Vacation,
	Privacy,
	LockedOut,
}

export enum VersionCommand {
	Get = 0x11,
	Report = 0x12,
	CommandClassGet = 0x13,
	CommandClassReport = 0x14,
	CapabilitiesGet = 0x15,
	CapabilitiesReport = 0x16,
	ZWaveSoftwareGet = 0x17,
	ZWaveSoftwareReport = 0x18,
}

export enum WakeUpCommand {
	IntervalSet = 0x04,
	IntervalGet = 0x05,
	IntervalReport = 0x06,
	WakeUpNotification = 0x07,
	NoMoreInformation = 0x08,
	IntervalCapabilitiesGet = 0x09,
	IntervalCapabilitiesReport = 0x0a,
}

export enum WindowCoveringCommand {
	SupportedGet = 0x01,
	SupportedReport = 0x02,
	Get = 0x03,
	Report = 0x04,
	Set = 0x05,
	StartLevelChange = 0x06,
	StopLevelChange = 0x07,
}

export enum WindowCoveringParameter {
	"Outbound Left (no position)",
	"Outbound Left",
	"Outbound Right (no position)",
	"Outbound Right",
	"Inbound Left (no position)",
	"Inbound Left",
	"Inbound Right (no position)",
	"Inbound Right",
	"Inbound Left/Right (no position)",
	"Inbound Left/Right",
	"Vertical Slats Angle (no position)",
	"Vertical Slats Angle",
	"Outbound Bottom (no position)",
	"Outbound Bottom",
	"Outbound Top (no position)",
	"Outbound Top",
	"Inbound Bottom (no position)",
	"Inbound Bottom",
	"Inbound Top (no position)",
	"Inbound Top",
	"Inbound Top/Bottom (no position)",
	"Inbound Top/Bottom",
	"Horizontal Slats Angle (no position)",
	"Horizontal Slats Angle",
}

export enum ZWavePlusCommand {
	Get = 0x01,
	Report = 0x02,
}

export enum ZWavePlusRoleType {
	CentralStaticController = 0x00,
	SubStaticController = 0x01,
	PortableController = 0x02,
	PortableReportingController = 0x03,
	PortableSlave = 0x04,
	AlwaysOnSlave = 0x05,
	SleepingReportingSlave = 0x06,
	SleepingListeningSlave = 0x07,
	NetworkAwareSlave = 0x08,
}

export enum ZWavePlusNodeType {
	Node = 0x00, // ZWave+ Node
	IPGateway = 0x02, // ZWave+ for IP Gateway
}

export enum ZWaveProtocolCommand {
	NodeInformationFrame = 0x01,
	RequestNodeInformationFrame = 0x02,
	AssignIDs = 0x03,
	FindNodesInRange = 0x04,
	GetNodesInRange = 0x05,
	RangeInfo = 0x06,
	CommandComplete = 0x07,
	TransferPresentation = 0x08,
	TransferNodeInformation = 0x09,
	TransferRangeInformation = 0x0a,
	TransferEnd = 0x0b,
	AssignReturnRoute = 0x0c,
	NewNodeRegistered = 0x0d,
	NewRangeRegistered = 0x0e,
	TransferNewPrimaryControllerComplete = 0x0f,
	AutomaticControllerUpdateStart = 0x10,
	SUCNodeID = 0x11,
	SetSUC = 0x12,
	SetSUCAck = 0x13,
	AssignSUCReturnRoute = 0x14,
	StaticRouteRequest = 0x15,
	Lost = 0x16,
	AcceptLost = 0x17,
	NOPPower = 0x18,
	ReserveNodeIDs = 0x19,
	ReservedIDs = 0x1a,
	NodesExist = 0x1f,
	NodesExistReply = 0x20,
	SetNWIMode = 0x22,
	ExcludeRequest = 0x23,
	AssignReturnRoutePriority = 0x24,
	AssignSUCReturnRoutePriority = 0x25,
	SmartStartIncludedNodeInformation = 0x26,
	SmartStartPrime = 0x27,
	SmartStartInclusionRequest = 0x28,
}

export enum WakeUpTime {
	None,
	"1000ms",
	"250ms",
}

export function FLiRS2WakeUpTime(value: FLiRS): WakeUpTime {
	return value === "1000ms" ? 1 : value === "250ms" ? 2 : 0;
}

export function wakeUpTime2FLiRS(value: WakeUpTime): FLiRS {
	return value === 1 ? "1000ms" : value === 2 ? "250ms" : false;
}

export function dataRate2ZWaveDataRate(dataRate: DataRate): ZWaveDataRate {
	return dataRate === 100000
		? ZWaveDataRate["100k"]
		: dataRate === 40000
		? ZWaveDataRate["40k"]
		: ZWaveDataRate["9k6"];
}

export function ZWaveDataRate2DataRate(zdr: ZWaveDataRate): DataRate {
	return zdr === ZWaveDataRate["100k"]
		? 100000
		: zdr === ZWaveDataRate["40k"]
		? 40000
		: 9600;
}

export function parseWakeUpTime(value: number): WakeUpTime {
	return value <= WakeUpTime["250ms"] ? value : 0;
}

export enum NetworkTransferStatus {
	Failed = 0,
	Success,
	UpdateDone,
	UpdateAborted,
	UpdateWait,
	UpdateDisabled,
	UpdateOverflow,
}
