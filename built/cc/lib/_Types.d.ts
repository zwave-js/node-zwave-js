/// <reference types="node" />
import type { Scale } from "@zwave-js/config/safe";
import { CommandClasses, DataRate, FLiRS, Maybe, ValueMetadata, ZWaveDataRate } from "@zwave-js/core/safe";
export declare enum AlarmSensorCommand {
    Get = 1,
    Report = 2,
    SupportedGet = 3,
    SupportedReport = 4
}
export declare enum AlarmSensorType {
    "General Purpose" = 0,
    Smoke = 1,
    CO = 2,
    CO2 = 3,
    Heat = 4,
    "Water Leak" = 5,
    Any = 255
}
export type AlarmSensorValueMetadata = ValueMetadata & {
    ccSpecific: {
        sensorType: AlarmSensorType;
    };
};
export declare enum AssociationCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    Remove = 4,
    SupportedGroupingsGet = 5,
    SupportedGroupingsReport = 6
}
export declare enum AssociationGroupInfoCommand {
    NameGet = 1,
    NameReport = 2,
    InfoGet = 3,
    InfoReport = 4,
    CommandListGet = 5,
    CommandListReport = 6
}
export declare enum AssociationGroupInfoProfile {
    "General: N/A" = 0,
    "General: Lifeline" = 1,
    "Control: Key 01" = 8193,
    "Control: Key 02" = 8194,
    "Control: Key 03" = 8195,
    "Control: Key 04" = 8196,
    "Control: Key 05" = 8197,
    "Control: Key 06" = 8198,
    "Control: Key 07" = 8199,
    "Control: Key 08" = 8200,
    "Control: Key 09" = 8201,
    "Control: Key 10" = 8202,
    "Control: Key 11" = 8203,
    "Control: Key 12" = 8204,
    "Control: Key 13" = 8205,
    "Control: Key 14" = 8206,
    "Control: Key 15" = 8207,
    "Control: Key 16" = 8208,
    "Control: Key 17" = 8209,
    "Control: Key 18" = 8210,
    "Control: Key 19" = 8211,
    "Control: Key 20" = 8212,
    "Control: Key 21" = 8213,
    "Control: Key 22" = 8214,
    "Control: Key 23" = 8215,
    "Control: Key 24" = 8216,
    "Control: Key 25" = 8217,
    "Control: Key 26" = 8218,
    "Control: Key 27" = 8219,
    "Control: Key 28" = 8220,
    "Control: Key 29" = 8221,
    "Control: Key 30" = 8222,
    "Control: Key 31" = 8223,
    "Control: Key 32" = 8224,
    "Sensor: Air temperature" = 12545,
    "Sensor: General purpose" = 12546,
    "Sensor: Illuminance" = 12547,
    "Sensor: Power" = 12548,
    "Sensor: Humidity" = 12549,
    "Sensor: Velocity" = 12550,
    "Sensor: Direction" = 12551,
    "Sensor: Atmospheric pressure" = 12552,
    "Sensor: Barometric pressure" = 12553,
    "Sensor: Solar radiation" = 12554,
    "Sensor: Dew point" = 12555,
    "Sensor: Rain rate" = 12556,
    "Sensor: Tide level" = 12557,
    "Sensor: Weight" = 12558,
    "Sensor: Voltage" = 12559,
    "Sensor: Current" = 12560,
    "Sensor: Carbon dioxide (CO2) level" = 12561,
    "Sensor: Air flow" = 12562,
    "Sensor: Tank capacity" = 12563,
    "Sensor: Distance" = 12564,
    "Sensor: Angle position" = 12565,
    "Sensor: Rotation" = 12566,
    "Sensor: Water temperature" = 12567,
    "Sensor: Soil temperature" = 12568,
    "Sensor: Seismic Intensity" = 12569,
    "Sensor: Seismic magnitude" = 12570,
    "Sensor: Ultraviolet" = 12571,
    "Sensor: Electrical resistivity" = 12572,
    "Sensor: Electrical conductivity" = 12573,
    "Sensor: Loudness" = 12574,
    "Sensor: Moisture" = 12575,
    "Sensor: Frequency" = 12576,
    "Sensor: Time" = 12577,
    "Sensor: Target temperature" = 12578,
    "Sensor: Particulate Matter 2.5" = 12579,
    "Sensor: Formaldehyde (CH2O) level" = 12580,
    "Sensor: Radon concentration" = 12581,
    "Sensor: Methane (CH4) density" = 12582,
    "Sensor: Volatile Organic Compound level" = 12583,
    "Sensor: Carbon monoxide (CO) level" = 12584,
    "Sensor: Soil humidity" = 12585,
    "Sensor: Soil reactivity" = 12586,
    "Sensor: Soil salinity" = 12587,
    "Sensor: Heart rate" = 12588,
    "Sensor: Blood pressure" = 12589,
    "Sensor: Muscle mass" = 12590,
    "Sensor: Fat mass" = 12591,
    "Sensor: Bone mass" = 12592,
    "Sensor: Total body water (TBW)" = 12593,
    "Sensor: Basis metabolic rate (BMR)" = 12594,
    "Sensor: Body Mass Index (BMI)" = 12595,
    "Sensor: Acceleration X-axis" = 12596,
    "Sensor: Acceleration Y-axis" = 12597,
    "Sensor: Acceleration Z-axis" = 12598,
    "Sensor: Smoke density" = 12599,
    "Sensor: Water flow" = 12600,
    "Sensor: Water pressure" = 12601,
    "Sensor: RF signal strength" = 12602,
    "Sensor: Particulate Matter 10" = 12603,
    "Sensor: Respiratory rate" = 12604,
    "Sensor: Relative Modulation level" = 12605,
    "Sensor: Boiler water temperature" = 12606,
    "Sensor: Domestic Hot Water (DHW) temperature" = 12607,
    "Sensor: Outside temperature" = 12608,
    "Sensor: Exhaust temperature" = 12609,
    "Sensor: Water Chlorine level" = 12610,
    "Sensor: Water acidity" = 12611,
    "Sensor: Water Oxidation reduction potential" = 12612,
    "Sensor: Heart Rate LF/HF ratio" = 12613,
    "Sensor: Motion Direction" = 12614,
    "Sensor: Applied force on the sensor" = 12615,
    "Sensor: Return Air temperature" = 12616,
    "Sensor: Supply Air temperature" = 12617,
    "Sensor: Condenser Coil temperature" = 12618,
    "Sensor: Evaporator Coil temperature" = 12619,
    "Sensor: Liquid Line temperature" = 12620,
    "Sensor: Discharge Line temperature" = 12621,
    "Sensor: Suction Pressure" = 12622,
    "Sensor: Discharge Pressure" = 12623,
    "Sensor: Defrost temperature" = 12624,
    "Notification: Smoke Alarm" = 28929,
    "Notification: CO Alarm" = 28930,
    "Notification: CO2 Alarm" = 28931,
    "Notification: Heat Alarm" = 28932,
    "Notification: Water Alarm" = 28933,
    "Notification: Access Control" = 28934,
    "Notification: Home Security" = 28935,
    "Notification: Power Management" = 28936,
    "Notification: System" = 28937,
    "Notification: Emergency Alarm" = 28938,
    "Notification: Clock" = 28939,
    "Notification: Appliance" = 28940,
    "Notification: Home Health" = 28941,
    "Notification: Siren" = 28942,
    "Notification: Water Valve" = 28943,
    "Notification: Weather Alarm" = 28944,
    "Notification: Irrigation" = 28945,
    "Notification: Gas alarm" = 28946,
    "Notification: Pest Control" = 28947,
    "Notification: Light sensor" = 28948,
    "Notification: Water Quality Monitoring" = 28949,
    "Notification: Home monitoring" = 28950,
    "Meter: Electric" = 12801,
    "Meter: Gas" = 12802,
    "Meter: Water" = 12803,
    "Meter: Heating" = 12804,
    "Meter: Cooling" = 12805,
    "Irrigation: Channel 01" = 27393,
    "Irrigation: Channel 02" = 27394,
    "Irrigation: Channel 03" = 27395,
    "Irrigation: Channel 04" = 27396,
    "Irrigation: Channel 05" = 27397,
    "Irrigation: Channel 06" = 27398,
    "Irrigation: Channel 07" = 27399,
    "Irrigation: Channel 08" = 27400,
    "Irrigation: Channel 09" = 27401,
    "Irrigation: Channel 10" = 27402,
    "Irrigation: Channel 11" = 27403,
    "Irrigation: Channel 12" = 27404,
    "Irrigation: Channel 13" = 27405,
    "Irrigation: Channel 14" = 27406,
    "Irrigation: Channel 15" = 27407,
    "Irrigation: Channel 16" = 27408,
    "Irrigation: Channel 17" = 27409,
    "Irrigation: Channel 18" = 27410,
    "Irrigation: Channel 19" = 27411,
    "Irrigation: Channel 20" = 27412,
    "Irrigation: Channel 21" = 27413,
    "Irrigation: Channel 22" = 27414,
    "Irrigation: Channel 23" = 27415,
    "Irrigation: Channel 24" = 27416,
    "Irrigation: Channel 25" = 27417,
    "Irrigation: Channel 26" = 27418,
    "Irrigation: Channel 27" = 27419,
    "Irrigation: Channel 28" = 27420,
    "Irrigation: Channel 29" = 27421,
    "Irrigation: Channel 30" = 27422,
    "Irrigation: Channel 31" = 27423,
    "Irrigation: Channel 32" = 27424
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
export declare enum BarrierOperatorCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SignalingCapabilitiesGet = 4,
    SignalingCapabilitiesReport = 5,
    EventSignalingSet = 6,
    EventSignalingGet = 7,
    EventSignalingReport = 8
}
export declare enum BarrierState {
    Closed = 0,
    Closing = 252,
    Stopped = 253,
    Opening = 254,
    Open = 255
}
export declare enum SubsystemType {
    Audible = 1,
    Visual = 2
}
export declare enum SubsystemState {
    Off = 0,
    On = 255
}
export declare enum BasicCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum BatteryChargingStatus {
    Discharging = 0,
    Charging = 1,
    Maintaining = 2
}
export declare enum BatteryReplacementStatus {
    No = 0,
    Soon = 1,
    Now = 2
}
export declare enum BatteryCommand {
    Get = 2,
    Report = 3,
    HealthGet = 4,
    HealthReport = 5
}
export declare enum BinarySensorCommand {
    Get = 2,
    Report = 3,
    SupportedGet = 1,
    SupportedReport = 4
}
export declare enum BinarySensorType {
    "General Purpose" = 1,
    Smoke = 2,
    CO = 3,
    CO2 = 4,
    Heat = 5,
    Water = 6,
    Freeze = 7,
    Tamper = 8,
    Aux = 9,
    "Door/Window" = 10,
    Tilt = 11,
    Motion = 12,
    "Glass Break" = 13,
    Any = 255
}
export type BinarySensorValueMetadata = ValueMetadata & {
    ccSpecific: {
        sensorType: BinarySensorType;
    };
};
export declare enum BinarySwitchCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum CentralSceneCommand {
    SupportedGet = 1,
    SupportedReport = 2,
    Notification = 3,
    ConfigurationSet = 4,
    ConfigurationGet = 5,
    ConfigurationReport = 6
}
export declare enum CentralSceneKeys {
    KeyPressed = 0,
    KeyReleased = 1,
    KeyHeldDown = 2,
    KeyPressed2x = 3,
    KeyPressed3x = 4,
    KeyPressed4x = 5,
    KeyPressed5x = 6
}
export declare enum ClimateControlScheduleCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    ChangedGet = 4,
    ChangedReport = 5,
    OverrideSet = 6,
    OverrideGet = 7,
    OverrideReport = 8
}
export declare enum ScheduleOverrideType {
    None = 0,
    Temporary = 1,
    Permanent = 2
}
export declare enum ClockCommand {
    Set = 4,
    Get = 5,
    Report = 6
}
export declare enum Weekday {
    Unknown = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
    Sunday = 7
}
export declare enum ColorSwitchCommand {
    SupportedGet = 1,
    SupportedReport = 2,
    Get = 3,
    Report = 4,
    Set = 5,
    StartLevelChange = 6,
    StopLevelChange = 7
}
export declare enum ColorComponent {
    "Warm White" = 0,
    "Cold White" = 1,
    Red = 2,
    Green = 3,
    Blue = 4,
    Amber = 5,
    Cyan = 6,
    Purple = 7,
    Index = 8
}
export declare const ColorComponentMap: {
    warmWhite: ColorComponent;
    coldWhite: ColorComponent;
    red: ColorComponent;
    green: ColorComponent;
    blue: ColorComponent;
    amber: ColorComponent;
    cyan: ColorComponent;
    purple: ColorComponent;
    index: ColorComponent;
};
export type ColorKey = keyof typeof ColorComponentMap;
/**
 * This type is used to accept both the kebabCase names and numeric components as table keys
 */
export type ColorTable = Partial<Record<ColorKey, number>> | Partial<Record<ColorComponent, number>>;
export declare enum ConfigurationCommand {
    Set = 4,
    Get = 5,
    Report = 6,
    BulkSet = 7,
    BulkGet = 8,
    BulkReport = 9,
    NameGet = 10,
    NameReport = 11,
    InfoGet = 12,
    InfoReport = 13,
    PropertiesGet = 14,
    PropertiesReport = 15,
    DefaultReset = 1
}
export type { ConfigValue } from "@zwave-js/core/safe";
export declare enum CRC16Command {
    CommandEncapsulation = 1
}
export declare enum DeviceResetLocallyCommand {
    Notification = 1
}
export declare enum DoorLockCommand {
    OperationSet = 1,
    OperationGet = 2,
    OperationReport = 3,
    ConfigurationSet = 4,
    ConfigurationGet = 5,
    ConfigurationReport = 6,
    CapabilitiesGet = 7,
    CapabilitiesReport = 8
}
export declare enum DoorLockMode {
    Unsecured = 0,
    UnsecuredWithTimeout = 1,
    InsideUnsecured = 16,
    InsideUnsecuredWithTimeout = 17,
    OutsideUnsecured = 32,
    OutsideUnsecuredWithTimeout = 33,
    Unknown = 254,
    Secured = 255
}
export declare enum DoorLockOperationType {
    Constant = 1,
    Timed = 2
}
export type DoorHandleStatus = [boolean, boolean, boolean, boolean];
export declare enum EntryControlEventTypes {
    Caching = 0,
    CachedKeys = 1,
    Enter = 2,
    DisarmAll = 3,
    ArmAll = 4,
    ArmAway = 5,
    ArmHome = 6,
    ExitDelay = 7,
    Arm1 = 8,
    Arm2 = 9,
    Arm3 = 10,
    Arm4 = 11,
    Arm5 = 12,
    Arm6 = 13,
    Rfid = 14,
    Bell = 15,
    Fire = 16,
    Police = 17,
    AlertPanic = 18,
    AlertMedical = 19,
    GateOpen = 20,
    GateClose = 21,
    Lock = 22,
    Unlock = 23,
    Test = 24,
    Cancel = 25
}
export declare const entryControlEventTypeLabels: Record<EntryControlEventTypes, string>;
export declare enum DoorLockLoggingCommand {
    RecordsSupportedGet = 1,
    RecordsSupportedReport = 2,
    RecordGet = 3,
    RecordReport = 4
}
export declare enum DoorLockLoggingEventType {
    LockCode = 1,
    UnlockCode = 2,
    LockButton = 3,
    UnlockButton = 4,
    LockCodeOutOfSchedule = 5,
    UnlockCodeOutOfSchedule = 6,
    IllegalCode = 7,
    LockManual = 8,
    UnlockManual = 9,
    LockAuto = 10,
    UnlockAuto = 11,
    LockRemoteCode = 12,
    UnlockRemoteCode = 13,
    LockRemote = 14,
    UnlockRemote = 15,
    LockRemoteCodeOutOfSchedule = 16,
    UnlockRemoteCodeOutOfSchedule = 17,
    RemoteIllegalCode = 18,
    LockManual2 = 19,
    UnlockManual2 = 20,
    LockSecured = 21,
    LockUnsecured = 22,
    UserCodeAdded = 23,
    UserCodeDeleted = 24,
    AllUserCodesDeleted = 25,
    MasterCodeChanged = 26,
    UserCodeChanged = 27,
    LockReset = 28,
    ConfigurationChanged = 29,
    LowBattery = 30,
    NewBattery = 31,
    Unknown = 32
}
export interface DoorLockLoggingRecord {
    timestamp: string;
    eventType: DoorLockLoggingEventType;
    label: string;
    userId?: number;
    userCode?: string | Buffer;
}
export declare enum DoorLockLoggingRecordStatus {
    Empty = 0,
    HoldsLegalData = 1
}
export declare enum EntryControlCommand {
    Notification = 1,
    KeySupportedGet = 2,
    KeySupportedReport = 3,
    EventSupportedGet = 4,
    EventSupportedReport = 5,
    ConfigurationSet = 6,
    ConfigurationGet = 7,
    ConfigurationReport = 8
}
export declare enum EntryControlDataTypes {
    None = 0,
    Raw = 1,
    ASCII = 2,
    MD5 = 3
}
export declare enum FirmwareUpdateMetaDataCommand {
    MetaDataGet = 1,
    MetaDataReport = 2,
    RequestGet = 3,
    RequestReport = 4,
    Get = 5,
    Report = 6,
    StatusReport = 7,
    ActivationSet = 8,
    ActivationReport = 9,
    PrepareGet = 10,
    PrepareReport = 11
}
export interface FirmwareUpdateMetaData {
    manufacturerId: number;
    firmwareId: number;
    checksum: number;
    firmwareUpgradable: boolean;
    maxFragmentSize?: number;
    additionalFirmwareIDs: readonly number[];
    hardwareVersion?: number;
    continuesToFunction: Maybe<boolean>;
    supportsActivation: Maybe<boolean>;
}
export interface FirmwareUpdateMetaData {
    manufacturerId: number;
    firmwareId: number;
    checksum: number;
    firmwareUpgradable: boolean;
    maxFragmentSize?: number;
    additionalFirmwareIDs: readonly number[];
    hardwareVersion?: number;
    continuesToFunction: Maybe<boolean>;
    supportsActivation: Maybe<boolean>;
}
export declare enum FirmwareUpdateRequestStatus {
    Error_InvalidManufacturerOrFirmwareID = 0,
    Error_AuthenticationExpected = 1,
    Error_FragmentSizeTooLarge = 2,
    Error_NotUpgradable = 3,
    Error_InvalidHardwareVersion = 4,
    Error_FirmwareUpgradeInProgress = 5,
    Error_BatteryLow = 6,
    OK = 255
}
export declare enum FirmwareUpdateStatus {
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
    OK_WaitingForActivation = 253,
    OK_NoRestart = 254,
    OK_RestartPending = 255
}
export declare enum FirmwareUpdateActivationStatus {
    Error_InvalidFirmware = 0,
    Error_ActivationFailed = 1,
    OK = 255
}
export declare enum FirmwareDownloadStatus {
    Error_InvalidManufacturerOrFirmwareID = 0,
    Error_AuthenticationExpected = 1,
    Error_FragmentSizeTooLarge = 2,
    Error_NotDownloadable = 3,
    Error_InvalidHardwareVersion = 4,
    OK = 255
}
export type FirmwareUpdateCapabilities = {
    /** Indicates whether the node's firmware can be upgraded */
    readonly firmwareUpgradable: false;
} | {
    /** Indicates whether the node's firmware can be upgraded */
    readonly firmwareUpgradable: true;
    /** An array of firmware targets that can be upgraded */
    readonly firmwareTargets: readonly number[];
    /** Indicates whether the node continues to function normally during an upgrade */
    readonly continuesToFunction: Maybe<boolean>;
    /** Indicates whether the node supports delayed activation of the new firmware */
    readonly supportsActivation: Maybe<boolean>;
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
export declare enum HailCommand {
    Hail = 1
}
export declare enum HumidityControlModeCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5
}
export declare enum HumidityControlMode {
    "Off" = 0,
    "Humidify" = 1,
    "De-humidify" = 2,
    "Auto" = 3
}
export declare enum HumidityControlOperatingStateCommand {
    Get = 1,
    Report = 2
}
export declare enum HumidityControlOperatingState {
    "Idle" = 0,
    "Humidifying" = 1,
    "De-humidifying" = 2
}
export declare enum HumidityControlSetpointCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5,
    ScaleSupportedGet = 6,
    ScaleSupportedReport = 7,
    CapabilitiesGet = 8,
    CapabilitiesReport = 9
}
export declare enum HumidityControlSetpointType {
    "N/A" = 0,
    "Humidifier" = 1,
    "De-humidifier" = 2,
    "Auto" = 3
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
export declare enum InclusionControllerCommand {
    Initiate = 1,
    Complete = 2
}
export declare enum InclusionControllerStep {
    ProxyInclusion = 1,
    S0Inclusion = 2,
    ProxyInclusionReplace = 3
}
export declare enum InclusionControllerStatus {
    OK = 1,
    UserRejected = 2,
    Failed = 3,
    NotSupported = 4
}
export declare enum IndicatorCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5,
    DescriptionGet = 6,
    DescriptionReport = 7
}
export type IndicatorMetadata = ValueMetadata & {
    ccSpecific: {
        indicatorId: number;
        propertyId?: number;
    };
};
export declare enum IrrigationCommand {
    SystemInfoGet = 1,
    SystemInfoReport = 2,
    SystemStatusGet = 3,
    SystemStatusReport = 4,
    SystemConfigSet = 5,
    SystemConfigGet = 6,
    SystemConfigReport = 7,
    ValveInfoGet = 8,
    ValveInfoReport = 9,
    ValveConfigSet = 10,
    ValveConfigGet = 11,
    ValveConfigReport = 12,
    ValveRun = 13,
    ValveTableSet = 14,
    ValveTableGet = 15,
    ValveTableReport = 16,
    ValveTableRun = 17,
    SystemShutoff = 18
}
export declare enum IrrigationSensorPolarity {
    Low = 0,
    High = 1
}
export declare enum ValveType {
    ZoneValve = 0,
    MasterValve = 1
}
export type ValveId = "master" | number;
export interface ValveTableEntry {
    valveId: number;
    duration: number;
}
export declare enum LanguageCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum LockCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum ManufacturerSpecificCommand {
    Get = 4,
    Report = 5,
    DeviceSpecificGet = 6,
    DeviceSpecificReport = 7
}
export declare enum DeviceIdType {
    FactoryDefault = 0,
    SerialNumber = 1,
    PseudoRandom = 2
}
export declare enum MeterCommand {
    Get = 1,
    Report = 2,
    SupportedGet = 3,
    SupportedReport = 4,
    Reset = 5
}
export declare enum RateType {
    Unspecified = 0,
    Consumed = 1,
    Produced = 2
}
export type MeterMetadata = ValueMetadata & {
    ccSpecific: {
        meterType: number;
        rateType?: RateType;
        scale?: number;
    };
};
export declare enum MultiChannelAssociationCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    Remove = 4,
    SupportedGroupingsGet = 5,
    SupportedGroupingsReport = 6
}
export interface AssociationAddress {
    nodeId: number;
    endpoint?: number;
}
export interface EndpointAddress {
    nodeId: number;
    endpoint: number | number[];
}
export declare enum MultiChannelCommand {
    GetV1 = 4,
    ReportV1 = 5,
    CommandEncapsulationV1 = 6,
    EndPointGet = 7,
    EndPointReport = 8,
    CapabilityGet = 9,
    CapabilityReport = 10,
    EndPointFind = 11,
    EndPointFindReport = 12,
    CommandEncapsulation = 13,
    AggregatedMembersGet = 14,
    AggregatedMembersReport = 15
}
export declare enum MultiCommandCommand {
    CommandEncapsulation = 1
}
export declare enum MultilevelSensorCommand {
    GetSupportedSensor = 1,
    SupportedSensorReport = 2,
    GetSupportedScale = 3,
    Get = 4,
    Report = 5,
    SupportedScaleReport = 6
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
export declare enum MultilevelSwitchCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    StartLevelChange = 4,
    StopLevelChange = 5,
    SupportedGet = 6,
    SupportedReport = 7
}
export declare enum LevelChangeDirection {
    "up" = 0,
    "down" = 1
}
export declare enum SwitchType {
    "not supported" = 0,
    "Off/On" = 1,
    "Down/Up" = 2,
    "Close/Open" = 3,
    "CCW/CW" = 4,
    "Left/Right" = 5,
    "Reverse/Forward" = 6,
    "Pull/Push" = 7
}
export type MultilevelSwitchLevelChangeMetadata = ValueMetadata & {
    ccSpecific: {
        switchType: SwitchType;
    };
};
export declare enum NodeNamingAndLocationCommand {
    NameSet = 1,
    NameGet = 2,
    NameReport = 3,
    LocationSet = 4,
    LocationGet = 5,
    LocationReport = 6
}
export declare enum NotificationCommand {
    EventSupportedGet = 1,
    EventSupportedReport = 2,
    Get = 4,
    Report = 5,
    Set = 6,
    SupportedGet = 7,
    SupportedReport = 8
}
export type NotificationMetadata = ValueMetadata & {
    ccSpecific: {
        notificationType: number;
    };
};
export declare enum PowerlevelCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    TestNodeSet = 4,
    TestNodeGet = 5,
    TestNodeReport = 6
}
export declare enum Powerlevel {
    "Normal Power" = 0,
    "-1 dBm" = 1,
    "-2 dBm" = 2,
    "-3 dBm" = 3,
    "-4 dBm" = 4,
    "-5 dBm" = 5,
    "-6 dBm" = 6,
    "-7 dBm" = 7,
    "-8 dBm" = 8,
    "-9 dBm" = 9
}
export declare enum PowerlevelTestStatus {
    Failed = 0,
    Success = 1,
    "In Progress" = 2
}
export declare enum ProtectionCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5,
    ExclusiveControlSet = 6,
    ExclusiveControlGet = 7,
    ExclusiveControlReport = 8,
    TimeoutSet = 9,
    TimeoutGet = 10,
    TimeoutReport = 11
}
export declare enum LocalProtectionState {
    Unprotected = 0,
    ProtectedBySequence = 1,
    NoOperationPossible = 2
}
export declare enum RFProtectionState {
    Unprotected = 0,
    NoControl = 1,
    NoResponse = 2
}
export declare enum SceneActivationCommand {
    Set = 1
}
export declare enum SceneActuatorConfigurationCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum SceneControllerConfigurationCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum ScheduleEntryLockCommand {
    EnableSet = 1,
    EnableAllSet = 2,
    WeekDayScheduleSet = 3,
    WeekDayScheduleGet = 4,
    WeekDayScheduleReport = 5,
    YearDayScheduleSet = 6,
    YearDayScheduleGet = 7,
    YearDayScheduleReport = 8,
    SupportedGet = 9,
    SupportedReport = 10,
    TimeOffsetGet = 11,
    TimeOffsetReport = 12,
    TimeOffsetSet = 13,
    DailyRepeatingScheduleGet = 14,
    DailyRepeatingScheduleReport = 15,
    DailyRepeatingScheduleSet = 16
}
export declare enum ScheduleEntryLockSetAction {
    Erase = 0,
    Set = 1
}
export interface ScheduleEntryLockSlotId {
    userId: number;
    slotId: number;
}
export declare enum ScheduleEntryLockWeekday {
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6
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
export declare enum Security2Command {
    NonceGet = 1,
    NonceReport = 2,
    MessageEncapsulation = 3,
    KEXGet = 4,
    KEXReport = 5,
    KEXSet = 6,
    KEXFail = 7,
    PublicKeyReport = 8,
    NetworkKeyGet = 9,
    NetworkKeyReport = 10,
    NetworkKeyVerify = 11,
    TransferEnd = 12,
    CommandsSupportedGet = 13,
    CommandsSupportedReport = 14
}
export declare enum SecurityCommand {
    CommandsSupportedGet = 2,
    CommandsSupportedReport = 3,
    SchemeGet = 4,
    SchemeReport = 5,
    SchemeInherit = 8,
    NetworkKeySet = 6,
    NetworkKeyVerify = 7,
    NonceGet = 64,
    NonceReport = 128,
    CommandEncapsulation = 129,
    CommandEncapsulationNonceGet = 193
}
export declare enum SoundSwitchCommand {
    TonesNumberGet = 1,
    TonesNumberReport = 2,
    ToneInfoGet = 3,
    ToneInfoReport = 4,
    ConfigurationSet = 5,
    ConfigurationGet = 6,
    ConfigurationReport = 7,
    TonePlaySet = 8,
    TonePlayGet = 9,
    TonePlayReport = 10
}
export declare enum ToneId {
    Off = 0,
    Default = 255
}
export declare enum SupervisionCommand {
    Get = 1,
    Report = 2
}
export interface Timezone {
    standardOffset: number;
    dstOffset: number;
}
export declare enum ThermostatFanModeCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5
}
export declare enum ThermostatFanMode {
    "Auto low" = 0,
    "Low" = 1,
    "Auto high" = 2,
    "High" = 3,
    "Auto medium" = 4,
    "Medium" = 5,
    "Circulation" = 6,
    "Humidity circulation" = 7,
    "Left and right" = 8,
    "Up and down" = 9,
    "Quiet" = 10,
    "External circulation" = 11
}
export declare enum ThermostatFanStateCommand {
    Get = 2,
    Report = 3
}
export declare enum ThermostatFanState {
    "Idle / off" = 0,
    "Running / running low" = 1,
    "Running high" = 2,
    "Running medium" = 3,
    "Circulation mode" = 4,
    "Humidity circulation mode" = 5,
    "Right - left circulation mode" = 6,
    "Up - down circulation mode" = 7,
    "Quiet circulation mode" = 8
}
export declare enum ThermostatModeCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5
}
export declare enum ThermostatMode {
    "Off" = 0,
    "Heat" = 1,
    "Cool" = 2,
    "Auto" = 3,
    "Auxiliary" = 4,
    "Resume (on)" = 5,
    "Fan" = 6,
    "Furnace" = 7,
    "Dry" = 8,
    "Moist" = 9,
    "Auto changeover" = 10,
    "Energy heat" = 11,
    "Energy cool" = 12,
    "Away" = 13,
    "Full power" = 15,
    "Manufacturer specific" = 31
}
export declare enum ThermostatOperatingStateCommand {
    Get = 2,
    Report = 3
}
export declare enum ThermostatOperatingState {
    "Idle" = 0,
    "Heating" = 1,
    "Cooling" = 2,
    "Fan Only" = 3,
    "Pending Heat" = 4,
    "Pending Cool" = 5,
    "Vent/Economizer" = 6,
    "Aux Heating" = 7,
    "2nd Stage Heating" = 8,
    "2nd Stage Cooling" = 9,
    "2nd Stage Aux Heat" = 10,
    "3rd Stage Aux Heat" = 11
}
export declare enum ThermostatSetbackCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum SetbackType {
    None = 0,
    Temporary = 1,
    Permanent = 2
}
export type SetbackSpecialState = "Frost Protection" | "Energy Saving" | "Unused";
export type SetbackState = number | SetbackSpecialState;
export interface Switchpoint {
    hour: number;
    minute: number;
    state: SetbackState | undefined;
}
export declare enum ThermostatSetpointCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5,
    CapabilitiesGet = 9,
    CapabilitiesReport = 10
}
export declare enum ThermostatSetpointType {
    "N/A" = 0,
    "Heating" = 1,
    "Cooling" = 2,
    "Furnace" = 7,
    "Dry Air" = 8,
    "Moist Air" = 9,
    "Auto Changeover" = 10,
    "Energy Save Heating" = 11,
    "Energy Save Cooling" = 12,
    "Away Heating" = 13,
    "Away Cooling" = 14,
    "Full Power" = 15
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
export declare enum TimeCommand {
    TimeGet = 1,
    TimeReport = 2,
    DateGet = 3,
    DateReport = 4,
    TimeOffsetSet = 5,
    TimeOffsetGet = 6,
    TimeOffsetReport = 7
}
export declare enum TimeParametersCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum TransportServiceCommand {
    FirstSegment = 192,
    SegmentComplete = 232,
    SegmentRequest = 200,
    SegmentWait = 240,
    SubsequentSegment = 224
}
export declare enum UserCodeCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    UsersNumberGet = 4,
    UsersNumberReport = 5,
    CapabilitiesGet = 6,
    CapabilitiesReport = 7,
    KeypadModeSet = 8,
    KeypadModeGet = 9,
    KeypadModeReport = 10,
    ExtendedUserCodeSet = 11,
    ExtendedUserCodeGet = 12,
    ExtendedUserCodeReport = 13,
    MasterCodeSet = 14,
    MasterCodeGet = 15,
    MasterCodeReport = 16,
    UserCodeChecksumGet = 17,
    UserCodeChecksumReport = 18
}
export declare enum UserIDStatus {
    Available = 0,
    Enabled = 1,
    Disabled = 2,
    Messaging = 3,
    PassageMode = 4,
    StatusNotAvailable = 254
}
export declare enum KeypadMode {
    Normal = 0,
    Vacation = 1,
    Privacy = 2,
    LockedOut = 3
}
export declare enum VersionCommand {
    Get = 17,
    Report = 18,
    CommandClassGet = 19,
    CommandClassReport = 20,
    CapabilitiesGet = 21,
    CapabilitiesReport = 22,
    ZWaveSoftwareGet = 23,
    ZWaveSoftwareReport = 24
}
export declare enum WakeUpCommand {
    IntervalSet = 4,
    IntervalGet = 5,
    IntervalReport = 6,
    WakeUpNotification = 7,
    NoMoreInformation = 8,
    IntervalCapabilitiesGet = 9,
    IntervalCapabilitiesReport = 10
}
export declare enum ZWavePlusCommand {
    Get = 1,
    Report = 2
}
export declare enum ZWavePlusRoleType {
    CentralStaticController = 0,
    SubStaticController = 1,
    PortableController = 2,
    PortableReportingController = 3,
    PortableSlave = 4,
    AlwaysOnSlave = 5,
    SleepingReportingSlave = 6,
    SleepingListeningSlave = 7,
    NetworkAwareSlave = 8
}
export declare enum ZWavePlusNodeType {
    Node = 0,
    IPGateway = 2
}
export declare enum ZWaveProtocolCommand {
    NodeInformationFrame = 1,
    RequestNodeInformationFrame = 2,
    AssignIDs = 3,
    FindNodesInRange = 4,
    GetNodesInRange = 5,
    RangeInfo = 6,
    CommandComplete = 7,
    TransferPresentation = 8,
    TransferNodeInformation = 9,
    TransferRangeInformation = 10,
    TransferEnd = 11,
    AssignReturnRoute = 12,
    NewNodeRegistered = 13,
    NewRangeRegistered = 14,
    TransferNewPrimaryControllerComplete = 15,
    AutomaticControllerUpdateStart = 16,
    SUCNodeID = 17,
    SetSUC = 18,
    SetSUCAck = 19,
    AssignSUCReturnRoute = 20,
    StaticRouteRequest = 21,
    Lost = 22,
    AcceptLost = 23,
    NOPPower = 24,
    ReserveNodeIDs = 25,
    ReservedIDs = 26,
    NodesExist = 31,
    NodesExistReply = 32,
    SetNWIMode = 34,
    ExcludeRequest = 35,
    AssignReturnRoutePriority = 36,
    AssignSUCReturnRoutePriority = 37,
    SmartStartIncludedNodeInformation = 38,
    SmartStartPrime = 39,
    SmartStartInclusionRequest = 40
}
export declare enum WakeUpTime {
    None = 0,
    "1000ms" = 1,
    "250ms" = 2
}
export declare function FLiRS2WakeUpTime(value: FLiRS): WakeUpTime;
export declare function wakeUpTime2FLiRS(value: WakeUpTime): FLiRS;
export declare function dataRate2ZWaveDataRate(dataRate: DataRate): ZWaveDataRate;
export declare function ZWaveDataRate2DataRate(zdr: ZWaveDataRate): DataRate;
export declare function parseWakeUpTime(value: number): WakeUpTime;
export declare enum NetworkTransferStatus {
    Failed = 0,
    Success = 1,
    UpdateDone = 2,
    UpdateAborted = 3,
    UpdateWait = 4,
    UpdateDisabled = 5,
    UpdateOverflow = 6
}
//# sourceMappingURL=_Types.d.ts.map