import type { Scale } from "@zwave-js/config/safe";
import type {
	CommandClasses,
	Duration,
	Maybe,
	ValueMetadata,
} from "@zwave-js/core/safe";
import type { ZWaveNode } from "../node/Node";
import type { NotificationCCReport } from "./NotificationCC";

export enum AlarmSensorCommand {
	Get = 0x01,
	Report = 0x02,
	SupportedGet = 0x03,
	SupportedReport = 0x04,
}

/** @publicAPI */
export enum AlarmSensorType {
	"General Purpose" = 0x00,
	Smoke,
	CO,
	CO2,
	Heat,
	"Water Leak",
	Any = 0xff,
}

/** @publicAPI */
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
	// TODO: These two commands are V2. I have no clue how this is supposed to function:
	// SpecificGroupGet = 0x0b,
	// SpecificGroupReport = 0x0c,

	// Here's what the docs have to say:
	// This functionality allows a supporting multi-button device to detect a key press and subsequently advertise
	// the identity of the key. The following sequence of events takes place:
	// * The user activates a special identification sequence and pushes the button to be identified
	// * The device issues a Node Information frame (NIF)
	// * The NIF allows the portable controller to determine the NodeID of the multi-button device
	// * The portable controller issues an Association Specific Group Get Command to the multi-button device
	// * The multi-button device returns an Association Specific Group Report Command that advertises the
	//   association group that represents the most recently detected button
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
/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
export enum BarrierState {
	Closed = 0x00,
	Closing = 0xfc,
	Stopped = 0xfd,
	Opening = 0xfe,
	Open = 0xff,
}

/** @publicAPI */
export enum SubsystemType {
	Audible = 0x01,
	Visual = 0x02,
}

/** @publicAPI */
export enum SubsystemState {
	Off = 0x00,
	On = 0xff,
}

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

/** @publicAPI */
export enum BatteryChargingStatus {
	Discharging = 0x00,
	Charging = 0x01,
	Maintaining = 0x02,
}

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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
 * @publicAPI
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
export enum DoorLockOperationType {
	Constant = 0x01,
	Timed = 0x02,
}

/** @publicAPI */
export type DoorHandleStatus = [boolean, boolean, boolean, boolean];

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

export enum DoorLockLoggingCommand {
	RecordsSupportedGet = 0x01,
	RecordsSupportedReport = 0x02,
	RecordGet = 0x03,
	RecordReport = 0x04,
}

/** @publicAPI */
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
	MasterCodeChanged = 0x1a,
	UserCodeChanged = 0x1b,
	LockReset = 0x1c,
	ConfigurationChanged = 0x1d,
	LowBattery = 0x1e,
	NewBattery = 0x1f,
	Unknown = 0x20,
}

/**
 * @publicAPI
 * @deprecated Use {@link DoorLockLoggingEventType} instead
 */
export enum EventType {
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
	MasterCodeChanged = 0x1a,
	UserCodeChanged = 0x1b,
	LockReset = 0x1c,
	ConfigurationChanged = 0x1d,
	LowBattery = 0x1e,
	NewBattery = 0x1f,
	Unknown = 0x20,
}

/** @publicAPI */
export interface DoorLockLoggingRecord {
	timestamp: string;
	eventType: DoorLockLoggingEventType;
	label: string;
	userId?: number;
	userCode?: string | Buffer;
}

/** @publicAPI */
export enum DoorLockLoggingRecordStatus {
	Empty = 0x00,
	HoldsLegalData = 0x01,
}

/**
 * @publicAPI
 * @deprecated Use {@link DoorLockLoggingRecordStatus} instead
 */
export enum RecordStatus {
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

/** @publicAPI */
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

/** @publicAPI */
export enum FirmwareUpdateStatus {
	// Error_Timeout is not part of the Z-Wave standard, but we use it to report
	// that no status report was received
	Error_Timeout = -1,

	Error_Checksum = 0,
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

/** @publicAPI */
export enum FirmwareUpdateActivationStatus {
	Error_InvalidFirmware = 0,
	Error_ActivationFailed = 1,
	OK = 0xff,
}

/** @publicAPI */
export enum FirmwareDownloadStatus {
	Error_InvalidManufacturerOrFirmwareID = 0,
	Error_AuthenticationExpected = 1,
	Error_FragmentSizeTooLarge = 2,
	Error_NotDownloadable = 3,
	Error_InvalidHardwareVersion = 4,
	OK = 0xff,
}

/** @publicAPI */
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
			readonly continuesToFunction: Maybe<boolean>;
			/** Indicates whether the node supports delayed activation of the new firmware */
			readonly supportsActivation: Maybe<boolean>;
	  };

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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
export enum HumidityControlSetpointType {
	"N/A" = 0x00,
	"Humidifier" = 0x01, // CC v1
	"De-humidifier" = 0x02, // CC v1
	"Auto" = 0x03, // CC v2
}

/** @publicAPI */
export interface HumidityControlSetpointValue {
	value: number;
	scale: number;
}

/** @publicAPI */
export interface HumidityControlSetpointCapabilities {
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
}

/** @publicAPI */
export type HumidityControlSetpointMetadata = ValueMetadata & {
	ccSpecific: {
		setpointType: HumidityControlSetpointType;
	};
};

export enum IndicatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

/** @publicAPI */
export type IndicatorMetadata = ValueMetadata & {
	ccSpecific: {
		indicatorId: number;
		propertyId?: number; // only present on V2+ indicators
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

/** @publicAPI */
export enum IrrigationSensorPolarity {
	Low = 0,
	High = 1,
}

/** @publicAPI */
export enum ValveType {
	ZoneValve = 0,
	MasterValve = 1,
}

/** @publicAPI */
export type ValveId = "master" | number;

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
export enum RateType {
	Unspecified = 0x00,
	Consumed = 0x01,
	Produced = 0x02,
}

/** @publicAPI */
export type MeterMetadata = ValueMetadata & {
	ccSpecific: {
		meterType: number;
		rateType?: RateType;
		scale?: number;
	};
};

export enum MultiChannelAssociationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Remove = 0x04,
	SupportedGroupingsGet = 0x05,
	SupportedGroupingsReport = 0x06,
}

/** @publicAPI */
export interface AssociationAddress {
	nodeId: number;
	endpoint?: number;
}

/**
 * @publicAPI
 * @deprecated use AssociationAddress instead
 */
export type Association = AssociationAddress;

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

/** @publicAPI */
export interface MultilevelSensorValue {
	value: number;
	scale: Scale;
}

/** @publicAPI */
export type MultilevelSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: number;
		scale: number;
	};
};

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

/** @publicAPI */
export enum LevelChangeDirection {
	"up" = 0b0,
	"down" = 0b1,
	// "none" = 0b11,
}

/** @publicAPI */
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

/** @publicAPI */
export type MultilevelSwitchLevelChangeMetadata = ValueMetadata & {
	ccSpecific: {
		switchType: SwitchType;
	};
};

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

/** @publicAPI */
export type NotificationMetadata = ValueMetadata & {
	ccSpecific: {
		notificationType: number;
	};
};

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

export enum PowerlevelCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	TestNodeSet = 0x04,
	TestNodeGet = 0x05,
	TestNodeReport = 0x06,
}

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

/** @publicAPI */
export enum LocalProtectionState {
	Unprotected = 0,
	ProtectedBySequence = 1,
	NoOperationPossible = 2,
}

/** @publicAPI */
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

/** @publicAPI */
export enum ToneId {
	Off = 0x00,
	Default = 0xff,
}

export enum SupervisionCommand {
	Get = 0x01,
	Report = 0x02,
}

/** @publicAPI */
export enum SupervisionStatus {
	NoSupport = 0x00,
	Working = 0x01,
	Fail = 0x02,
	Success = 0xff,
}

/** @publicAPI */
export interface SupervisionResult {
	status: SupervisionStatus;
	remainingDuration?: Duration;
}

export enum ThermostatFanModeCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
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

/** @publicAPI */
export enum SetbackType {
	None = 0x00,
	Temporary = 0x01,
	Permanent = 0x02,
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

/** @publicAPI */
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

/** @publicAPI */
export interface ThermostatSetpointValue {
	value: number;
	scale: number;
}

/** @publicAPI */
export interface ThermostatSetpointCapabilities {
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
}

/** @publicAPI */
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
	MasterCodeSet = 0x0e,
	MasterCodeGet = 0x0f,
	MasterCodeReport = 0x10,
	UserCodeChecksumGet = 0x11,
	UserCodeChecksumReport = 0x12,
}

/** @publicAPI */
export enum UserIDStatus {
	Available = 0x00,
	Enabled,
	Disabled,
	Messaging,
	PassageMode,
	StatusNotAvailable = 0xfe,
}

/** @publicAPI */
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

export enum ZWavePlusCommand {
	Get = 0x01,
	Report = 0x02,
}

/** @publicAPI */
export enum ZWavePlusRoleType {
	CentralStaticController = 0x00,
	SubStaticController = 0x01,
	PortableController = 0x02,
	PortableReportingController = 0x03,
	PortableSlave = 0x04,
	AlwaysOnSlave = 0x05,
	SleepingReportingSlave = 0x06,
	SleepingListeningSlave = 0x07,
}

/** @publicAPI */
export enum ZWavePlusNodeType {
	Node = 0x00, // ZWave+ Node
	IPGateway = 0x02, // ZWave+ for IP Gateway
}
