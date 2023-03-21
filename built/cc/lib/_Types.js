"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumidityControlSetpointType = exports.HumidityControlSetpointCommand = exports.HumidityControlOperatingState = exports.HumidityControlOperatingStateCommand = exports.HumidityControlMode = exports.HumidityControlModeCommand = exports.HailCommand = exports.FirmwareDownloadStatus = exports.FirmwareUpdateActivationStatus = exports.FirmwareUpdateStatus = exports.FirmwareUpdateRequestStatus = exports.FirmwareUpdateMetaDataCommand = exports.EntryControlDataTypes = exports.EntryControlCommand = exports.DoorLockLoggingRecordStatus = exports.DoorLockLoggingEventType = exports.DoorLockLoggingCommand = exports.entryControlEventTypeLabels = exports.EntryControlEventTypes = exports.DoorLockOperationType = exports.DoorLockMode = exports.DoorLockCommand = exports.DeviceResetLocallyCommand = exports.CRC16Command = exports.ConfigurationCommand = exports.ColorComponentMap = exports.ColorComponent = exports.ColorSwitchCommand = exports.Weekday = exports.ClockCommand = exports.ScheduleOverrideType = exports.ClimateControlScheduleCommand = exports.CentralSceneKeys = exports.CentralSceneCommand = exports.BinarySwitchCommand = exports.BinarySensorType = exports.BinarySensorCommand = exports.BatteryCommand = exports.BatteryReplacementStatus = exports.BatteryChargingStatus = exports.BasicCommand = exports.SubsystemState = exports.SubsystemType = exports.BarrierState = exports.BarrierOperatorCommand = exports.AssociationGroupInfoProfile = exports.AssociationGroupInfoCommand = exports.AssociationCommand = exports.AlarmSensorType = exports.AlarmSensorCommand = void 0;
exports.ThermostatSetpointCommand = exports.SetbackType = exports.ThermostatSetbackCommand = exports.ThermostatOperatingState = exports.ThermostatOperatingStateCommand = exports.ThermostatMode = exports.ThermostatModeCommand = exports.ThermostatFanState = exports.ThermostatFanStateCommand = exports.ThermostatFanMode = exports.ThermostatFanModeCommand = exports.SupervisionCommand = exports.ToneId = exports.SoundSwitchCommand = exports.SecurityCommand = exports.Security2Command = exports.ScheduleEntryLockWeekday = exports.ScheduleEntryLockSetAction = exports.ScheduleEntryLockCommand = exports.SceneControllerConfigurationCommand = exports.SceneActuatorConfigurationCommand = exports.SceneActivationCommand = exports.RFProtectionState = exports.LocalProtectionState = exports.ProtectionCommand = exports.PowerlevelTestStatus = exports.Powerlevel = exports.PowerlevelCommand = exports.NotificationCommand = exports.NodeNamingAndLocationCommand = exports.SwitchType = exports.LevelChangeDirection = exports.MultilevelSwitchCommand = exports.MultilevelSensorCommand = exports.MultiCommandCommand = exports.MultiChannelCommand = exports.MultiChannelAssociationCommand = exports.RateType = exports.MeterCommand = exports.DeviceIdType = exports.ManufacturerSpecificCommand = exports.LockCommand = exports.LanguageCommand = exports.ValveType = exports.IrrigationSensorPolarity = exports.IrrigationCommand = exports.IndicatorCommand = exports.InclusionControllerStatus = exports.InclusionControllerStep = exports.InclusionControllerCommand = void 0;
exports.NetworkTransferStatus = exports.parseWakeUpTime = exports.ZWaveDataRate2DataRate = exports.dataRate2ZWaveDataRate = exports.wakeUpTime2FLiRS = exports.FLiRS2WakeUpTime = exports.WakeUpTime = exports.ZWaveProtocolCommand = exports.ZWavePlusNodeType = exports.ZWavePlusRoleType = exports.ZWavePlusCommand = exports.WakeUpCommand = exports.VersionCommand = exports.KeypadMode = exports.UserIDStatus = exports.UserCodeCommand = exports.TransportServiceCommand = exports.TimeParametersCommand = exports.TimeCommand = exports.ThermostatSetpointType = void 0;
const safe_1 = require("@zwave-js/core/safe");
var AlarmSensorCommand;
(function (AlarmSensorCommand) {
    AlarmSensorCommand[AlarmSensorCommand["Get"] = 1] = "Get";
    AlarmSensorCommand[AlarmSensorCommand["Report"] = 2] = "Report";
    AlarmSensorCommand[AlarmSensorCommand["SupportedGet"] = 3] = "SupportedGet";
    AlarmSensorCommand[AlarmSensorCommand["SupportedReport"] = 4] = "SupportedReport";
})(AlarmSensorCommand = exports.AlarmSensorCommand || (exports.AlarmSensorCommand = {}));
var AlarmSensorType;
(function (AlarmSensorType) {
    AlarmSensorType[AlarmSensorType["General Purpose"] = 0] = "General Purpose";
    AlarmSensorType[AlarmSensorType["Smoke"] = 1] = "Smoke";
    AlarmSensorType[AlarmSensorType["CO"] = 2] = "CO";
    AlarmSensorType[AlarmSensorType["CO2"] = 3] = "CO2";
    AlarmSensorType[AlarmSensorType["Heat"] = 4] = "Heat";
    AlarmSensorType[AlarmSensorType["Water Leak"] = 5] = "Water Leak";
    AlarmSensorType[AlarmSensorType["Any"] = 255] = "Any";
})(AlarmSensorType = exports.AlarmSensorType || (exports.AlarmSensorType = {}));
var AssociationCommand;
(function (AssociationCommand) {
    AssociationCommand[AssociationCommand["Set"] = 1] = "Set";
    AssociationCommand[AssociationCommand["Get"] = 2] = "Get";
    AssociationCommand[AssociationCommand["Report"] = 3] = "Report";
    AssociationCommand[AssociationCommand["Remove"] = 4] = "Remove";
    AssociationCommand[AssociationCommand["SupportedGroupingsGet"] = 5] = "SupportedGroupingsGet";
    AssociationCommand[AssociationCommand["SupportedGroupingsReport"] = 6] = "SupportedGroupingsReport";
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
})(AssociationCommand = exports.AssociationCommand || (exports.AssociationCommand = {}));
var AssociationGroupInfoCommand;
(function (AssociationGroupInfoCommand) {
    AssociationGroupInfoCommand[AssociationGroupInfoCommand["NameGet"] = 1] = "NameGet";
    AssociationGroupInfoCommand[AssociationGroupInfoCommand["NameReport"] = 2] = "NameReport";
    AssociationGroupInfoCommand[AssociationGroupInfoCommand["InfoGet"] = 3] = "InfoGet";
    AssociationGroupInfoCommand[AssociationGroupInfoCommand["InfoReport"] = 4] = "InfoReport";
    AssociationGroupInfoCommand[AssociationGroupInfoCommand["CommandListGet"] = 5] = "CommandListGet";
    AssociationGroupInfoCommand[AssociationGroupInfoCommand["CommandListReport"] = 6] = "CommandListReport";
})(AssociationGroupInfoCommand = exports.AssociationGroupInfoCommand || (exports.AssociationGroupInfoCommand = {}));
// TODO: Check if this should be in a config file instead
var AssociationGroupInfoProfile;
(function (AssociationGroupInfoProfile) {
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["General: N/A"] = 0] = "General: N/A";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["General: Lifeline"] = 1] = "General: Lifeline";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 01"] = 8193] = "Control: Key 01";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 02"] = 8194] = "Control: Key 02";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 03"] = 8195] = "Control: Key 03";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 04"] = 8196] = "Control: Key 04";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 05"] = 8197] = "Control: Key 05";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 06"] = 8198] = "Control: Key 06";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 07"] = 8199] = "Control: Key 07";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 08"] = 8200] = "Control: Key 08";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 09"] = 8201] = "Control: Key 09";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 10"] = 8202] = "Control: Key 10";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 11"] = 8203] = "Control: Key 11";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 12"] = 8204] = "Control: Key 12";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 13"] = 8205] = "Control: Key 13";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 14"] = 8206] = "Control: Key 14";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 15"] = 8207] = "Control: Key 15";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 16"] = 8208] = "Control: Key 16";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 17"] = 8209] = "Control: Key 17";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 18"] = 8210] = "Control: Key 18";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 19"] = 8211] = "Control: Key 19";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 20"] = 8212] = "Control: Key 20";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 21"] = 8213] = "Control: Key 21";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 22"] = 8214] = "Control: Key 22";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 23"] = 8215] = "Control: Key 23";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 24"] = 8216] = "Control: Key 24";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 25"] = 8217] = "Control: Key 25";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 26"] = 8218] = "Control: Key 26";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 27"] = 8219] = "Control: Key 27";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 28"] = 8220] = "Control: Key 28";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 29"] = 8221] = "Control: Key 29";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 30"] = 8222] = "Control: Key 30";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 31"] = 8223] = "Control: Key 31";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Control: Key 32"] = 8224] = "Control: Key 32";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Air temperature"] = 12545] = "Sensor: Air temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: General purpose"] = 12546] = "Sensor: General purpose";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Illuminance"] = 12547] = "Sensor: Illuminance";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Power"] = 12548] = "Sensor: Power";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Humidity"] = 12549] = "Sensor: Humidity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Velocity"] = 12550] = "Sensor: Velocity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Direction"] = 12551] = "Sensor: Direction";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Atmospheric pressure"] = 12552] = "Sensor: Atmospheric pressure";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Barometric pressure"] = 12553] = "Sensor: Barometric pressure";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Solar radiation"] = 12554] = "Sensor: Solar radiation";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Dew point"] = 12555] = "Sensor: Dew point";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Rain rate"] = 12556] = "Sensor: Rain rate";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Tide level"] = 12557] = "Sensor: Tide level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Weight"] = 12558] = "Sensor: Weight";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Voltage"] = 12559] = "Sensor: Voltage";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Current"] = 12560] = "Sensor: Current";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Carbon dioxide (CO2) level"] = 12561] = "Sensor: Carbon dioxide (CO2) level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Air flow"] = 12562] = "Sensor: Air flow";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Tank capacity"] = 12563] = "Sensor: Tank capacity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Distance"] = 12564] = "Sensor: Distance";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Angle position"] = 12565] = "Sensor: Angle position";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Rotation"] = 12566] = "Sensor: Rotation";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Water temperature"] = 12567] = "Sensor: Water temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Soil temperature"] = 12568] = "Sensor: Soil temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Seismic Intensity"] = 12569] = "Sensor: Seismic Intensity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Seismic magnitude"] = 12570] = "Sensor: Seismic magnitude";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Ultraviolet"] = 12571] = "Sensor: Ultraviolet";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Electrical resistivity"] = 12572] = "Sensor: Electrical resistivity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Electrical conductivity"] = 12573] = "Sensor: Electrical conductivity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Loudness"] = 12574] = "Sensor: Loudness";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Moisture"] = 12575] = "Sensor: Moisture";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Frequency"] = 12576] = "Sensor: Frequency";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Time"] = 12577] = "Sensor: Time";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Target temperature"] = 12578] = "Sensor: Target temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Particulate Matter 2.5"] = 12579] = "Sensor: Particulate Matter 2.5";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Formaldehyde (CH2O) level"] = 12580] = "Sensor: Formaldehyde (CH2O) level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Radon concentration"] = 12581] = "Sensor: Radon concentration";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Methane (CH4) density"] = 12582] = "Sensor: Methane (CH4) density";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Volatile Organic Compound level"] = 12583] = "Sensor: Volatile Organic Compound level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Carbon monoxide (CO) level"] = 12584] = "Sensor: Carbon monoxide (CO) level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Soil humidity"] = 12585] = "Sensor: Soil humidity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Soil reactivity"] = 12586] = "Sensor: Soil reactivity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Soil salinity"] = 12587] = "Sensor: Soil salinity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Heart rate"] = 12588] = "Sensor: Heart rate";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Blood pressure"] = 12589] = "Sensor: Blood pressure";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Muscle mass"] = 12590] = "Sensor: Muscle mass";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Fat mass"] = 12591] = "Sensor: Fat mass";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Bone mass"] = 12592] = "Sensor: Bone mass";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Total body water (TBW)"] = 12593] = "Sensor: Total body water (TBW)";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Basis metabolic rate (BMR)"] = 12594] = "Sensor: Basis metabolic rate (BMR)";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Body Mass Index (BMI)"] = 12595] = "Sensor: Body Mass Index (BMI)";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Acceleration X-axis"] = 12596] = "Sensor: Acceleration X-axis";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Acceleration Y-axis"] = 12597] = "Sensor: Acceleration Y-axis";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Acceleration Z-axis"] = 12598] = "Sensor: Acceleration Z-axis";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Smoke density"] = 12599] = "Sensor: Smoke density";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Water flow"] = 12600] = "Sensor: Water flow";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Water pressure"] = 12601] = "Sensor: Water pressure";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: RF signal strength"] = 12602] = "Sensor: RF signal strength";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Particulate Matter 10"] = 12603] = "Sensor: Particulate Matter 10";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Respiratory rate"] = 12604] = "Sensor: Respiratory rate";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Relative Modulation level"] = 12605] = "Sensor: Relative Modulation level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Boiler water temperature"] = 12606] = "Sensor: Boiler water temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Domestic Hot Water (DHW) temperature"] = 12607] = "Sensor: Domestic Hot Water (DHW) temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Outside temperature"] = 12608] = "Sensor: Outside temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Exhaust temperature"] = 12609] = "Sensor: Exhaust temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Water Chlorine level"] = 12610] = "Sensor: Water Chlorine level";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Water acidity"] = 12611] = "Sensor: Water acidity";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Water Oxidation reduction potential"] = 12612] = "Sensor: Water Oxidation reduction potential";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Heart Rate LF/HF ratio"] = 12613] = "Sensor: Heart Rate LF/HF ratio";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Motion Direction"] = 12614] = "Sensor: Motion Direction";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Applied force on the sensor"] = 12615] = "Sensor: Applied force on the sensor";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Return Air temperature"] = 12616] = "Sensor: Return Air temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Supply Air temperature"] = 12617] = "Sensor: Supply Air temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Condenser Coil temperature"] = 12618] = "Sensor: Condenser Coil temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Evaporator Coil temperature"] = 12619] = "Sensor: Evaporator Coil temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Liquid Line temperature"] = 12620] = "Sensor: Liquid Line temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Discharge Line temperature"] = 12621] = "Sensor: Discharge Line temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Suction Pressure"] = 12622] = "Sensor: Suction Pressure";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Discharge Pressure"] = 12623] = "Sensor: Discharge Pressure";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Sensor: Defrost temperature"] = 12624] = "Sensor: Defrost temperature";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Smoke Alarm"] = 28929] = "Notification: Smoke Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: CO Alarm"] = 28930] = "Notification: CO Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: CO2 Alarm"] = 28931] = "Notification: CO2 Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Heat Alarm"] = 28932] = "Notification: Heat Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Water Alarm"] = 28933] = "Notification: Water Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Access Control"] = 28934] = "Notification: Access Control";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Home Security"] = 28935] = "Notification: Home Security";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Power Management"] = 28936] = "Notification: Power Management";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: System"] = 28937] = "Notification: System";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Emergency Alarm"] = 28938] = "Notification: Emergency Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Clock"] = 28939] = "Notification: Clock";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Appliance"] = 28940] = "Notification: Appliance";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Home Health"] = 28941] = "Notification: Home Health";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Siren"] = 28942] = "Notification: Siren";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Water Valve"] = 28943] = "Notification: Water Valve";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Weather Alarm"] = 28944] = "Notification: Weather Alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Irrigation"] = 28945] = "Notification: Irrigation";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Gas alarm"] = 28946] = "Notification: Gas alarm";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Pest Control"] = 28947] = "Notification: Pest Control";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Light sensor"] = 28948] = "Notification: Light sensor";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Water Quality Monitoring"] = 28949] = "Notification: Water Quality Monitoring";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Notification: Home monitoring"] = 28950] = "Notification: Home monitoring";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Meter: Electric"] = 12801] = "Meter: Electric";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Meter: Gas"] = 12802] = "Meter: Gas";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Meter: Water"] = 12803] = "Meter: Water";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Meter: Heating"] = 12804] = "Meter: Heating";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Meter: Cooling"] = 12805] = "Meter: Cooling";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 01"] = 27393] = "Irrigation: Channel 01";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 02"] = 27394] = "Irrigation: Channel 02";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 03"] = 27395] = "Irrigation: Channel 03";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 04"] = 27396] = "Irrigation: Channel 04";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 05"] = 27397] = "Irrigation: Channel 05";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 06"] = 27398] = "Irrigation: Channel 06";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 07"] = 27399] = "Irrigation: Channel 07";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 08"] = 27400] = "Irrigation: Channel 08";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 09"] = 27401] = "Irrigation: Channel 09";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 10"] = 27402] = "Irrigation: Channel 10";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 11"] = 27403] = "Irrigation: Channel 11";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 12"] = 27404] = "Irrigation: Channel 12";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 13"] = 27405] = "Irrigation: Channel 13";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 14"] = 27406] = "Irrigation: Channel 14";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 15"] = 27407] = "Irrigation: Channel 15";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 16"] = 27408] = "Irrigation: Channel 16";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 17"] = 27409] = "Irrigation: Channel 17";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 18"] = 27410] = "Irrigation: Channel 18";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 19"] = 27411] = "Irrigation: Channel 19";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 20"] = 27412] = "Irrigation: Channel 20";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 21"] = 27413] = "Irrigation: Channel 21";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 22"] = 27414] = "Irrigation: Channel 22";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 23"] = 27415] = "Irrigation: Channel 23";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 24"] = 27416] = "Irrigation: Channel 24";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 25"] = 27417] = "Irrigation: Channel 25";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 26"] = 27418] = "Irrigation: Channel 26";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 27"] = 27419] = "Irrigation: Channel 27";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 28"] = 27420] = "Irrigation: Channel 28";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 29"] = 27421] = "Irrigation: Channel 29";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 30"] = 27422] = "Irrigation: Channel 30";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 31"] = 27423] = "Irrigation: Channel 31";
    AssociationGroupInfoProfile[AssociationGroupInfoProfile["Irrigation: Channel 32"] = 27424] = "Irrigation: Channel 32";
})(AssociationGroupInfoProfile = exports.AssociationGroupInfoProfile || (exports.AssociationGroupInfoProfile = {}));
var BarrierOperatorCommand;
(function (BarrierOperatorCommand) {
    BarrierOperatorCommand[BarrierOperatorCommand["Set"] = 1] = "Set";
    BarrierOperatorCommand[BarrierOperatorCommand["Get"] = 2] = "Get";
    BarrierOperatorCommand[BarrierOperatorCommand["Report"] = 3] = "Report";
    BarrierOperatorCommand[BarrierOperatorCommand["SignalingCapabilitiesGet"] = 4] = "SignalingCapabilitiesGet";
    BarrierOperatorCommand[BarrierOperatorCommand["SignalingCapabilitiesReport"] = 5] = "SignalingCapabilitiesReport";
    BarrierOperatorCommand[BarrierOperatorCommand["EventSignalingSet"] = 6] = "EventSignalingSet";
    BarrierOperatorCommand[BarrierOperatorCommand["EventSignalingGet"] = 7] = "EventSignalingGet";
    BarrierOperatorCommand[BarrierOperatorCommand["EventSignalingReport"] = 8] = "EventSignalingReport";
})(BarrierOperatorCommand = exports.BarrierOperatorCommand || (exports.BarrierOperatorCommand = {}));
var BarrierState;
(function (BarrierState) {
    BarrierState[BarrierState["Closed"] = 0] = "Closed";
    BarrierState[BarrierState["Closing"] = 252] = "Closing";
    BarrierState[BarrierState["Stopped"] = 253] = "Stopped";
    BarrierState[BarrierState["Opening"] = 254] = "Opening";
    BarrierState[BarrierState["Open"] = 255] = "Open";
})(BarrierState = exports.BarrierState || (exports.BarrierState = {}));
var SubsystemType;
(function (SubsystemType) {
    SubsystemType[SubsystemType["Audible"] = 1] = "Audible";
    SubsystemType[SubsystemType["Visual"] = 2] = "Visual";
})(SubsystemType = exports.SubsystemType || (exports.SubsystemType = {}));
var SubsystemState;
(function (SubsystemState) {
    SubsystemState[SubsystemState["Off"] = 0] = "Off";
    SubsystemState[SubsystemState["On"] = 255] = "On";
})(SubsystemState = exports.SubsystemState || (exports.SubsystemState = {}));
var BasicCommand;
(function (BasicCommand) {
    BasicCommand[BasicCommand["Set"] = 1] = "Set";
    BasicCommand[BasicCommand["Get"] = 2] = "Get";
    BasicCommand[BasicCommand["Report"] = 3] = "Report";
})(BasicCommand = exports.BasicCommand || (exports.BasicCommand = {}));
var BatteryChargingStatus;
(function (BatteryChargingStatus) {
    BatteryChargingStatus[BatteryChargingStatus["Discharging"] = 0] = "Discharging";
    BatteryChargingStatus[BatteryChargingStatus["Charging"] = 1] = "Charging";
    BatteryChargingStatus[BatteryChargingStatus["Maintaining"] = 2] = "Maintaining";
})(BatteryChargingStatus = exports.BatteryChargingStatus || (exports.BatteryChargingStatus = {}));
var BatteryReplacementStatus;
(function (BatteryReplacementStatus) {
    BatteryReplacementStatus[BatteryReplacementStatus["No"] = 0] = "No";
    BatteryReplacementStatus[BatteryReplacementStatus["Soon"] = 1] = "Soon";
    BatteryReplacementStatus[BatteryReplacementStatus["Now"] = 2] = "Now";
})(BatteryReplacementStatus = exports.BatteryReplacementStatus || (exports.BatteryReplacementStatus = {}));
var BatteryCommand;
(function (BatteryCommand) {
    BatteryCommand[BatteryCommand["Get"] = 2] = "Get";
    BatteryCommand[BatteryCommand["Report"] = 3] = "Report";
    BatteryCommand[BatteryCommand["HealthGet"] = 4] = "HealthGet";
    BatteryCommand[BatteryCommand["HealthReport"] = 5] = "HealthReport";
})(BatteryCommand = exports.BatteryCommand || (exports.BatteryCommand = {}));
var BinarySensorCommand;
(function (BinarySensorCommand) {
    BinarySensorCommand[BinarySensorCommand["Get"] = 2] = "Get";
    BinarySensorCommand[BinarySensorCommand["Report"] = 3] = "Report";
    BinarySensorCommand[BinarySensorCommand["SupportedGet"] = 1] = "SupportedGet";
    BinarySensorCommand[BinarySensorCommand["SupportedReport"] = 4] = "SupportedReport";
})(BinarySensorCommand = exports.BinarySensorCommand || (exports.BinarySensorCommand = {}));
var BinarySensorType;
(function (BinarySensorType) {
    BinarySensorType[BinarySensorType["General Purpose"] = 1] = "General Purpose";
    BinarySensorType[BinarySensorType["Smoke"] = 2] = "Smoke";
    BinarySensorType[BinarySensorType["CO"] = 3] = "CO";
    BinarySensorType[BinarySensorType["CO2"] = 4] = "CO2";
    BinarySensorType[BinarySensorType["Heat"] = 5] = "Heat";
    BinarySensorType[BinarySensorType["Water"] = 6] = "Water";
    BinarySensorType[BinarySensorType["Freeze"] = 7] = "Freeze";
    BinarySensorType[BinarySensorType["Tamper"] = 8] = "Tamper";
    BinarySensorType[BinarySensorType["Aux"] = 9] = "Aux";
    BinarySensorType[BinarySensorType["Door/Window"] = 10] = "Door/Window";
    BinarySensorType[BinarySensorType["Tilt"] = 11] = "Tilt";
    BinarySensorType[BinarySensorType["Motion"] = 12] = "Motion";
    BinarySensorType[BinarySensorType["Glass Break"] = 13] = "Glass Break";
    BinarySensorType[BinarySensorType["Any"] = 255] = "Any";
})(BinarySensorType = exports.BinarySensorType || (exports.BinarySensorType = {}));
var BinarySwitchCommand;
(function (BinarySwitchCommand) {
    BinarySwitchCommand[BinarySwitchCommand["Set"] = 1] = "Set";
    BinarySwitchCommand[BinarySwitchCommand["Get"] = 2] = "Get";
    BinarySwitchCommand[BinarySwitchCommand["Report"] = 3] = "Report";
})(BinarySwitchCommand = exports.BinarySwitchCommand || (exports.BinarySwitchCommand = {}));
var CentralSceneCommand;
(function (CentralSceneCommand) {
    CentralSceneCommand[CentralSceneCommand["SupportedGet"] = 1] = "SupportedGet";
    CentralSceneCommand[CentralSceneCommand["SupportedReport"] = 2] = "SupportedReport";
    CentralSceneCommand[CentralSceneCommand["Notification"] = 3] = "Notification";
    CentralSceneCommand[CentralSceneCommand["ConfigurationSet"] = 4] = "ConfigurationSet";
    CentralSceneCommand[CentralSceneCommand["ConfigurationGet"] = 5] = "ConfigurationGet";
    CentralSceneCommand[CentralSceneCommand["ConfigurationReport"] = 6] = "ConfigurationReport";
})(CentralSceneCommand = exports.CentralSceneCommand || (exports.CentralSceneCommand = {}));
var CentralSceneKeys;
(function (CentralSceneKeys) {
    CentralSceneKeys[CentralSceneKeys["KeyPressed"] = 0] = "KeyPressed";
    CentralSceneKeys[CentralSceneKeys["KeyReleased"] = 1] = "KeyReleased";
    CentralSceneKeys[CentralSceneKeys["KeyHeldDown"] = 2] = "KeyHeldDown";
    CentralSceneKeys[CentralSceneKeys["KeyPressed2x"] = 3] = "KeyPressed2x";
    CentralSceneKeys[CentralSceneKeys["KeyPressed3x"] = 4] = "KeyPressed3x";
    CentralSceneKeys[CentralSceneKeys["KeyPressed4x"] = 5] = "KeyPressed4x";
    CentralSceneKeys[CentralSceneKeys["KeyPressed5x"] = 6] = "KeyPressed5x";
})(CentralSceneKeys = exports.CentralSceneKeys || (exports.CentralSceneKeys = {}));
var ClimateControlScheduleCommand;
(function (ClimateControlScheduleCommand) {
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["Set"] = 1] = "Set";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["Get"] = 2] = "Get";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["Report"] = 3] = "Report";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["ChangedGet"] = 4] = "ChangedGet";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["ChangedReport"] = 5] = "ChangedReport";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["OverrideSet"] = 6] = "OverrideSet";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["OverrideGet"] = 7] = "OverrideGet";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["OverrideReport"] = 8] = "OverrideReport";
})(ClimateControlScheduleCommand = exports.ClimateControlScheduleCommand || (exports.ClimateControlScheduleCommand = {}));
var ScheduleOverrideType;
(function (ScheduleOverrideType) {
    ScheduleOverrideType[ScheduleOverrideType["None"] = 0] = "None";
    ScheduleOverrideType[ScheduleOverrideType["Temporary"] = 1] = "Temporary";
    ScheduleOverrideType[ScheduleOverrideType["Permanent"] = 2] = "Permanent";
})(ScheduleOverrideType = exports.ScheduleOverrideType || (exports.ScheduleOverrideType = {}));
var ClockCommand;
(function (ClockCommand) {
    ClockCommand[ClockCommand["Set"] = 4] = "Set";
    ClockCommand[ClockCommand["Get"] = 5] = "Get";
    ClockCommand[ClockCommand["Report"] = 6] = "Report";
})(ClockCommand = exports.ClockCommand || (exports.ClockCommand = {}));
var Weekday;
(function (Weekday) {
    Weekday[Weekday["Unknown"] = 0] = "Unknown";
    Weekday[Weekday["Monday"] = 1] = "Monday";
    Weekday[Weekday["Tuesday"] = 2] = "Tuesday";
    Weekday[Weekday["Wednesday"] = 3] = "Wednesday";
    Weekday[Weekday["Thursday"] = 4] = "Thursday";
    Weekday[Weekday["Friday"] = 5] = "Friday";
    Weekday[Weekday["Saturday"] = 6] = "Saturday";
    Weekday[Weekday["Sunday"] = 7] = "Sunday";
})(Weekday = exports.Weekday || (exports.Weekday = {}));
var ColorSwitchCommand;
(function (ColorSwitchCommand) {
    ColorSwitchCommand[ColorSwitchCommand["SupportedGet"] = 1] = "SupportedGet";
    ColorSwitchCommand[ColorSwitchCommand["SupportedReport"] = 2] = "SupportedReport";
    ColorSwitchCommand[ColorSwitchCommand["Get"] = 3] = "Get";
    ColorSwitchCommand[ColorSwitchCommand["Report"] = 4] = "Report";
    ColorSwitchCommand[ColorSwitchCommand["Set"] = 5] = "Set";
    ColorSwitchCommand[ColorSwitchCommand["StartLevelChange"] = 6] = "StartLevelChange";
    ColorSwitchCommand[ColorSwitchCommand["StopLevelChange"] = 7] = "StopLevelChange";
})(ColorSwitchCommand = exports.ColorSwitchCommand || (exports.ColorSwitchCommand = {}));
var ColorComponent;
(function (ColorComponent) {
    ColorComponent[ColorComponent["Warm White"] = 0] = "Warm White";
    ColorComponent[ColorComponent["Cold White"] = 1] = "Cold White";
    ColorComponent[ColorComponent["Red"] = 2] = "Red";
    ColorComponent[ColorComponent["Green"] = 3] = "Green";
    ColorComponent[ColorComponent["Blue"] = 4] = "Blue";
    ColorComponent[ColorComponent["Amber"] = 5] = "Amber";
    ColorComponent[ColorComponent["Cyan"] = 6] = "Cyan";
    ColorComponent[ColorComponent["Purple"] = 7] = "Purple";
    ColorComponent[ColorComponent["Index"] = 8] = "Index";
})(ColorComponent = exports.ColorComponent || (exports.ColorComponent = {}));
exports.ColorComponentMap = {
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
var ConfigurationCommand;
(function (ConfigurationCommand) {
    ConfigurationCommand[ConfigurationCommand["Set"] = 4] = "Set";
    ConfigurationCommand[ConfigurationCommand["Get"] = 5] = "Get";
    ConfigurationCommand[ConfigurationCommand["Report"] = 6] = "Report";
    ConfigurationCommand[ConfigurationCommand["BulkSet"] = 7] = "BulkSet";
    ConfigurationCommand[ConfigurationCommand["BulkGet"] = 8] = "BulkGet";
    ConfigurationCommand[ConfigurationCommand["BulkReport"] = 9] = "BulkReport";
    ConfigurationCommand[ConfigurationCommand["NameGet"] = 10] = "NameGet";
    ConfigurationCommand[ConfigurationCommand["NameReport"] = 11] = "NameReport";
    ConfigurationCommand[ConfigurationCommand["InfoGet"] = 12] = "InfoGet";
    ConfigurationCommand[ConfigurationCommand["InfoReport"] = 13] = "InfoReport";
    ConfigurationCommand[ConfigurationCommand["PropertiesGet"] = 14] = "PropertiesGet";
    ConfigurationCommand[ConfigurationCommand["PropertiesReport"] = 15] = "PropertiesReport";
    ConfigurationCommand[ConfigurationCommand["DefaultReset"] = 1] = "DefaultReset";
})(ConfigurationCommand = exports.ConfigurationCommand || (exports.ConfigurationCommand = {}));
var CRC16Command;
(function (CRC16Command) {
    CRC16Command[CRC16Command["CommandEncapsulation"] = 1] = "CommandEncapsulation";
})(CRC16Command = exports.CRC16Command || (exports.CRC16Command = {}));
var DeviceResetLocallyCommand;
(function (DeviceResetLocallyCommand) {
    DeviceResetLocallyCommand[DeviceResetLocallyCommand["Notification"] = 1] = "Notification";
})(DeviceResetLocallyCommand = exports.DeviceResetLocallyCommand || (exports.DeviceResetLocallyCommand = {}));
var DoorLockCommand;
(function (DoorLockCommand) {
    DoorLockCommand[DoorLockCommand["OperationSet"] = 1] = "OperationSet";
    DoorLockCommand[DoorLockCommand["OperationGet"] = 2] = "OperationGet";
    DoorLockCommand[DoorLockCommand["OperationReport"] = 3] = "OperationReport";
    DoorLockCommand[DoorLockCommand["ConfigurationSet"] = 4] = "ConfigurationSet";
    DoorLockCommand[DoorLockCommand["ConfigurationGet"] = 5] = "ConfigurationGet";
    DoorLockCommand[DoorLockCommand["ConfigurationReport"] = 6] = "ConfigurationReport";
    DoorLockCommand[DoorLockCommand["CapabilitiesGet"] = 7] = "CapabilitiesGet";
    DoorLockCommand[DoorLockCommand["CapabilitiesReport"] = 8] = "CapabilitiesReport";
})(DoorLockCommand = exports.DoorLockCommand || (exports.DoorLockCommand = {}));
var DoorLockMode;
(function (DoorLockMode) {
    DoorLockMode[DoorLockMode["Unsecured"] = 0] = "Unsecured";
    DoorLockMode[DoorLockMode["UnsecuredWithTimeout"] = 1] = "UnsecuredWithTimeout";
    DoorLockMode[DoorLockMode["InsideUnsecured"] = 16] = "InsideUnsecured";
    DoorLockMode[DoorLockMode["InsideUnsecuredWithTimeout"] = 17] = "InsideUnsecuredWithTimeout";
    DoorLockMode[DoorLockMode["OutsideUnsecured"] = 32] = "OutsideUnsecured";
    DoorLockMode[DoorLockMode["OutsideUnsecuredWithTimeout"] = 33] = "OutsideUnsecuredWithTimeout";
    DoorLockMode[DoorLockMode["Unknown"] = 254] = "Unknown";
    DoorLockMode[DoorLockMode["Secured"] = 255] = "Secured";
})(DoorLockMode = exports.DoorLockMode || (exports.DoorLockMode = {}));
var DoorLockOperationType;
(function (DoorLockOperationType) {
    DoorLockOperationType[DoorLockOperationType["Constant"] = 1] = "Constant";
    DoorLockOperationType[DoorLockOperationType["Timed"] = 2] = "Timed";
})(DoorLockOperationType = exports.DoorLockOperationType || (exports.DoorLockOperationType = {}));
var EntryControlEventTypes;
(function (EntryControlEventTypes) {
    EntryControlEventTypes[EntryControlEventTypes["Caching"] = 0] = "Caching";
    EntryControlEventTypes[EntryControlEventTypes["CachedKeys"] = 1] = "CachedKeys";
    EntryControlEventTypes[EntryControlEventTypes["Enter"] = 2] = "Enter";
    EntryControlEventTypes[EntryControlEventTypes["DisarmAll"] = 3] = "DisarmAll";
    EntryControlEventTypes[EntryControlEventTypes["ArmAll"] = 4] = "ArmAll";
    EntryControlEventTypes[EntryControlEventTypes["ArmAway"] = 5] = "ArmAway";
    EntryControlEventTypes[EntryControlEventTypes["ArmHome"] = 6] = "ArmHome";
    EntryControlEventTypes[EntryControlEventTypes["ExitDelay"] = 7] = "ExitDelay";
    EntryControlEventTypes[EntryControlEventTypes["Arm1"] = 8] = "Arm1";
    EntryControlEventTypes[EntryControlEventTypes["Arm2"] = 9] = "Arm2";
    EntryControlEventTypes[EntryControlEventTypes["Arm3"] = 10] = "Arm3";
    EntryControlEventTypes[EntryControlEventTypes["Arm4"] = 11] = "Arm4";
    EntryControlEventTypes[EntryControlEventTypes["Arm5"] = 12] = "Arm5";
    EntryControlEventTypes[EntryControlEventTypes["Arm6"] = 13] = "Arm6";
    EntryControlEventTypes[EntryControlEventTypes["Rfid"] = 14] = "Rfid";
    EntryControlEventTypes[EntryControlEventTypes["Bell"] = 15] = "Bell";
    EntryControlEventTypes[EntryControlEventTypes["Fire"] = 16] = "Fire";
    EntryControlEventTypes[EntryControlEventTypes["Police"] = 17] = "Police";
    EntryControlEventTypes[EntryControlEventTypes["AlertPanic"] = 18] = "AlertPanic";
    EntryControlEventTypes[EntryControlEventTypes["AlertMedical"] = 19] = "AlertMedical";
    EntryControlEventTypes[EntryControlEventTypes["GateOpen"] = 20] = "GateOpen";
    EntryControlEventTypes[EntryControlEventTypes["GateClose"] = 21] = "GateClose";
    EntryControlEventTypes[EntryControlEventTypes["Lock"] = 22] = "Lock";
    EntryControlEventTypes[EntryControlEventTypes["Unlock"] = 23] = "Unlock";
    EntryControlEventTypes[EntryControlEventTypes["Test"] = 24] = "Test";
    EntryControlEventTypes[EntryControlEventTypes["Cancel"] = 25] = "Cancel";
})(EntryControlEventTypes = exports.EntryControlEventTypes || (exports.EntryControlEventTypes = {}));
exports.entryControlEventTypeLabels = {
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
var DoorLockLoggingCommand;
(function (DoorLockLoggingCommand) {
    DoorLockLoggingCommand[DoorLockLoggingCommand["RecordsSupportedGet"] = 1] = "RecordsSupportedGet";
    DoorLockLoggingCommand[DoorLockLoggingCommand["RecordsSupportedReport"] = 2] = "RecordsSupportedReport";
    DoorLockLoggingCommand[DoorLockLoggingCommand["RecordGet"] = 3] = "RecordGet";
    DoorLockLoggingCommand[DoorLockLoggingCommand["RecordReport"] = 4] = "RecordReport";
})(DoorLockLoggingCommand = exports.DoorLockLoggingCommand || (exports.DoorLockLoggingCommand = {}));
var DoorLockLoggingEventType;
(function (DoorLockLoggingEventType) {
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockCode"] = 1] = "LockCode";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockCode"] = 2] = "UnlockCode";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockButton"] = 3] = "LockButton";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockButton"] = 4] = "UnlockButton";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockCodeOutOfSchedule"] = 5] = "LockCodeOutOfSchedule";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockCodeOutOfSchedule"] = 6] = "UnlockCodeOutOfSchedule";
    DoorLockLoggingEventType[DoorLockLoggingEventType["IllegalCode"] = 7] = "IllegalCode";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockManual"] = 8] = "LockManual";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockManual"] = 9] = "UnlockManual";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockAuto"] = 10] = "LockAuto";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockAuto"] = 11] = "UnlockAuto";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockRemoteCode"] = 12] = "LockRemoteCode";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockRemoteCode"] = 13] = "UnlockRemoteCode";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockRemote"] = 14] = "LockRemote";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockRemote"] = 15] = "UnlockRemote";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockRemoteCodeOutOfSchedule"] = 16] = "LockRemoteCodeOutOfSchedule";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockRemoteCodeOutOfSchedule"] = 17] = "UnlockRemoteCodeOutOfSchedule";
    DoorLockLoggingEventType[DoorLockLoggingEventType["RemoteIllegalCode"] = 18] = "RemoteIllegalCode";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockManual2"] = 19] = "LockManual2";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UnlockManual2"] = 20] = "UnlockManual2";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockSecured"] = 21] = "LockSecured";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockUnsecured"] = 22] = "LockUnsecured";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UserCodeAdded"] = 23] = "UserCodeAdded";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UserCodeDeleted"] = 24] = "UserCodeDeleted";
    DoorLockLoggingEventType[DoorLockLoggingEventType["AllUserCodesDeleted"] = 25] = "AllUserCodesDeleted";
    DoorLockLoggingEventType[DoorLockLoggingEventType["MasterCodeChanged"] = 26] = "MasterCodeChanged";
    DoorLockLoggingEventType[DoorLockLoggingEventType["UserCodeChanged"] = 27] = "UserCodeChanged";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LockReset"] = 28] = "LockReset";
    DoorLockLoggingEventType[DoorLockLoggingEventType["ConfigurationChanged"] = 29] = "ConfigurationChanged";
    DoorLockLoggingEventType[DoorLockLoggingEventType["LowBattery"] = 30] = "LowBattery";
    DoorLockLoggingEventType[DoorLockLoggingEventType["NewBattery"] = 31] = "NewBattery";
    DoorLockLoggingEventType[DoorLockLoggingEventType["Unknown"] = 32] = "Unknown";
})(DoorLockLoggingEventType = exports.DoorLockLoggingEventType || (exports.DoorLockLoggingEventType = {}));
var DoorLockLoggingRecordStatus;
(function (DoorLockLoggingRecordStatus) {
    DoorLockLoggingRecordStatus[DoorLockLoggingRecordStatus["Empty"] = 0] = "Empty";
    DoorLockLoggingRecordStatus[DoorLockLoggingRecordStatus["HoldsLegalData"] = 1] = "HoldsLegalData";
})(DoorLockLoggingRecordStatus = exports.DoorLockLoggingRecordStatus || (exports.DoorLockLoggingRecordStatus = {}));
var EntryControlCommand;
(function (EntryControlCommand) {
    EntryControlCommand[EntryControlCommand["Notification"] = 1] = "Notification";
    EntryControlCommand[EntryControlCommand["KeySupportedGet"] = 2] = "KeySupportedGet";
    EntryControlCommand[EntryControlCommand["KeySupportedReport"] = 3] = "KeySupportedReport";
    EntryControlCommand[EntryControlCommand["EventSupportedGet"] = 4] = "EventSupportedGet";
    EntryControlCommand[EntryControlCommand["EventSupportedReport"] = 5] = "EventSupportedReport";
    EntryControlCommand[EntryControlCommand["ConfigurationSet"] = 6] = "ConfigurationSet";
    EntryControlCommand[EntryControlCommand["ConfigurationGet"] = 7] = "ConfigurationGet";
    EntryControlCommand[EntryControlCommand["ConfigurationReport"] = 8] = "ConfigurationReport";
})(EntryControlCommand = exports.EntryControlCommand || (exports.EntryControlCommand = {}));
var EntryControlDataTypes;
(function (EntryControlDataTypes) {
    EntryControlDataTypes[EntryControlDataTypes["None"] = 0] = "None";
    EntryControlDataTypes[EntryControlDataTypes["Raw"] = 1] = "Raw";
    EntryControlDataTypes[EntryControlDataTypes["ASCII"] = 2] = "ASCII";
    EntryControlDataTypes[EntryControlDataTypes["MD5"] = 3] = "MD5";
})(EntryControlDataTypes = exports.EntryControlDataTypes || (exports.EntryControlDataTypes = {}));
var FirmwareUpdateMetaDataCommand;
(function (FirmwareUpdateMetaDataCommand) {
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["MetaDataGet"] = 1] = "MetaDataGet";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["MetaDataReport"] = 2] = "MetaDataReport";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["RequestGet"] = 3] = "RequestGet";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["RequestReport"] = 4] = "RequestReport";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["Get"] = 5] = "Get";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["Report"] = 6] = "Report";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["StatusReport"] = 7] = "StatusReport";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["ActivationSet"] = 8] = "ActivationSet";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["ActivationReport"] = 9] = "ActivationReport";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["PrepareGet"] = 10] = "PrepareGet";
    FirmwareUpdateMetaDataCommand[FirmwareUpdateMetaDataCommand["PrepareReport"] = 11] = "PrepareReport";
})(FirmwareUpdateMetaDataCommand = exports.FirmwareUpdateMetaDataCommand || (exports.FirmwareUpdateMetaDataCommand = {}));
var FirmwareUpdateRequestStatus;
(function (FirmwareUpdateRequestStatus) {
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_InvalidManufacturerOrFirmwareID"] = 0] = "Error_InvalidManufacturerOrFirmwareID";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_AuthenticationExpected"] = 1] = "Error_AuthenticationExpected";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_FragmentSizeTooLarge"] = 2] = "Error_FragmentSizeTooLarge";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_NotUpgradable"] = 3] = "Error_NotUpgradable";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_InvalidHardwareVersion"] = 4] = "Error_InvalidHardwareVersion";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_FirmwareUpgradeInProgress"] = 5] = "Error_FirmwareUpgradeInProgress";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["Error_BatteryLow"] = 6] = "Error_BatteryLow";
    FirmwareUpdateRequestStatus[FirmwareUpdateRequestStatus["OK"] = 255] = "OK";
})(FirmwareUpdateRequestStatus = exports.FirmwareUpdateRequestStatus || (exports.FirmwareUpdateRequestStatus = {}));
var FirmwareUpdateStatus;
(function (FirmwareUpdateStatus) {
    // Error_Timeout is not part of the Z-Wave standard, but we use it to report
    // that no status report was received
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_Timeout"] = -1] = "Error_Timeout";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_Checksum"] = 0] = "Error_Checksum";
    /** TransmissionFailed is also used for user-aborted upgrades */
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_TransmissionFailed"] = 1] = "Error_TransmissionFailed";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InvalidManufacturerID"] = 2] = "Error_InvalidManufacturerID";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InvalidFirmwareID"] = 3] = "Error_InvalidFirmwareID";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InvalidFirmwareTarget"] = 4] = "Error_InvalidFirmwareTarget";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InvalidHeaderInformation"] = 5] = "Error_InvalidHeaderInformation";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InvalidHeaderFormat"] = 6] = "Error_InvalidHeaderFormat";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InsufficientMemory"] = 7] = "Error_InsufficientMemory";
    FirmwareUpdateStatus[FirmwareUpdateStatus["Error_InvalidHardwareVersion"] = 8] = "Error_InvalidHardwareVersion";
    // When adding more OK statuses, change the check in Node::finishFirmwareUpdate
    FirmwareUpdateStatus[FirmwareUpdateStatus["OK_WaitingForActivation"] = 253] = "OK_WaitingForActivation";
    FirmwareUpdateStatus[FirmwareUpdateStatus["OK_NoRestart"] = 254] = "OK_NoRestart";
    FirmwareUpdateStatus[FirmwareUpdateStatus["OK_RestartPending"] = 255] = "OK_RestartPending";
})(FirmwareUpdateStatus = exports.FirmwareUpdateStatus || (exports.FirmwareUpdateStatus = {}));
var FirmwareUpdateActivationStatus;
(function (FirmwareUpdateActivationStatus) {
    FirmwareUpdateActivationStatus[FirmwareUpdateActivationStatus["Error_InvalidFirmware"] = 0] = "Error_InvalidFirmware";
    FirmwareUpdateActivationStatus[FirmwareUpdateActivationStatus["Error_ActivationFailed"] = 1] = "Error_ActivationFailed";
    FirmwareUpdateActivationStatus[FirmwareUpdateActivationStatus["OK"] = 255] = "OK";
})(FirmwareUpdateActivationStatus = exports.FirmwareUpdateActivationStatus || (exports.FirmwareUpdateActivationStatus = {}));
var FirmwareDownloadStatus;
(function (FirmwareDownloadStatus) {
    FirmwareDownloadStatus[FirmwareDownloadStatus["Error_InvalidManufacturerOrFirmwareID"] = 0] = "Error_InvalidManufacturerOrFirmwareID";
    FirmwareDownloadStatus[FirmwareDownloadStatus["Error_AuthenticationExpected"] = 1] = "Error_AuthenticationExpected";
    FirmwareDownloadStatus[FirmwareDownloadStatus["Error_FragmentSizeTooLarge"] = 2] = "Error_FragmentSizeTooLarge";
    FirmwareDownloadStatus[FirmwareDownloadStatus["Error_NotDownloadable"] = 3] = "Error_NotDownloadable";
    FirmwareDownloadStatus[FirmwareDownloadStatus["Error_InvalidHardwareVersion"] = 4] = "Error_InvalidHardwareVersion";
    FirmwareDownloadStatus[FirmwareDownloadStatus["OK"] = 255] = "OK";
})(FirmwareDownloadStatus = exports.FirmwareDownloadStatus || (exports.FirmwareDownloadStatus = {}));
var HailCommand;
(function (HailCommand) {
    HailCommand[HailCommand["Hail"] = 1] = "Hail";
})(HailCommand = exports.HailCommand || (exports.HailCommand = {}));
var HumidityControlModeCommand;
(function (HumidityControlModeCommand) {
    HumidityControlModeCommand[HumidityControlModeCommand["Set"] = 1] = "Set";
    HumidityControlModeCommand[HumidityControlModeCommand["Get"] = 2] = "Get";
    HumidityControlModeCommand[HumidityControlModeCommand["Report"] = 3] = "Report";
    HumidityControlModeCommand[HumidityControlModeCommand["SupportedGet"] = 4] = "SupportedGet";
    HumidityControlModeCommand[HumidityControlModeCommand["SupportedReport"] = 5] = "SupportedReport";
})(HumidityControlModeCommand = exports.HumidityControlModeCommand || (exports.HumidityControlModeCommand = {}));
var HumidityControlMode;
(function (HumidityControlMode) {
    HumidityControlMode[HumidityControlMode["Off"] = 0] = "Off";
    HumidityControlMode[HumidityControlMode["Humidify"] = 1] = "Humidify";
    HumidityControlMode[HumidityControlMode["De-humidify"] = 2] = "De-humidify";
    HumidityControlMode[HumidityControlMode["Auto"] = 3] = "Auto";
})(HumidityControlMode = exports.HumidityControlMode || (exports.HumidityControlMode = {}));
var HumidityControlOperatingStateCommand;
(function (HumidityControlOperatingStateCommand) {
    HumidityControlOperatingStateCommand[HumidityControlOperatingStateCommand["Get"] = 1] = "Get";
    HumidityControlOperatingStateCommand[HumidityControlOperatingStateCommand["Report"] = 2] = "Report";
})(HumidityControlOperatingStateCommand = exports.HumidityControlOperatingStateCommand || (exports.HumidityControlOperatingStateCommand = {}));
var HumidityControlOperatingState;
(function (HumidityControlOperatingState) {
    HumidityControlOperatingState[HumidityControlOperatingState["Idle"] = 0] = "Idle";
    HumidityControlOperatingState[HumidityControlOperatingState["Humidifying"] = 1] = "Humidifying";
    HumidityControlOperatingState[HumidityControlOperatingState["De-humidifying"] = 2] = "De-humidifying";
})(HumidityControlOperatingState = exports.HumidityControlOperatingState || (exports.HumidityControlOperatingState = {}));
var HumidityControlSetpointCommand;
(function (HumidityControlSetpointCommand) {
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["Set"] = 1] = "Set";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["Get"] = 2] = "Get";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["Report"] = 3] = "Report";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["SupportedGet"] = 4] = "SupportedGet";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["SupportedReport"] = 5] = "SupportedReport";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["ScaleSupportedGet"] = 6] = "ScaleSupportedGet";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["ScaleSupportedReport"] = 7] = "ScaleSupportedReport";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["CapabilitiesGet"] = 8] = "CapabilitiesGet";
    HumidityControlSetpointCommand[HumidityControlSetpointCommand["CapabilitiesReport"] = 9] = "CapabilitiesReport";
})(HumidityControlSetpointCommand = exports.HumidityControlSetpointCommand || (exports.HumidityControlSetpointCommand = {}));
var HumidityControlSetpointType;
(function (HumidityControlSetpointType) {
    HumidityControlSetpointType[HumidityControlSetpointType["N/A"] = 0] = "N/A";
    HumidityControlSetpointType[HumidityControlSetpointType["Humidifier"] = 1] = "Humidifier";
    HumidityControlSetpointType[HumidityControlSetpointType["De-humidifier"] = 2] = "De-humidifier";
    HumidityControlSetpointType[HumidityControlSetpointType["Auto"] = 3] = "Auto";
})(HumidityControlSetpointType = exports.HumidityControlSetpointType || (exports.HumidityControlSetpointType = {}));
var InclusionControllerCommand;
(function (InclusionControllerCommand) {
    InclusionControllerCommand[InclusionControllerCommand["Initiate"] = 1] = "Initiate";
    InclusionControllerCommand[InclusionControllerCommand["Complete"] = 2] = "Complete";
})(InclusionControllerCommand = exports.InclusionControllerCommand || (exports.InclusionControllerCommand = {}));
var InclusionControllerStep;
(function (InclusionControllerStep) {
    InclusionControllerStep[InclusionControllerStep["ProxyInclusion"] = 1] = "ProxyInclusion";
    InclusionControllerStep[InclusionControllerStep["S0Inclusion"] = 2] = "S0Inclusion";
    InclusionControllerStep[InclusionControllerStep["ProxyInclusionReplace"] = 3] = "ProxyInclusionReplace";
})(InclusionControllerStep = exports.InclusionControllerStep || (exports.InclusionControllerStep = {}));
var InclusionControllerStatus;
(function (InclusionControllerStatus) {
    InclusionControllerStatus[InclusionControllerStatus["OK"] = 1] = "OK";
    InclusionControllerStatus[InclusionControllerStatus["UserRejected"] = 2] = "UserRejected";
    InclusionControllerStatus[InclusionControllerStatus["Failed"] = 3] = "Failed";
    InclusionControllerStatus[InclusionControllerStatus["NotSupported"] = 4] = "NotSupported";
})(InclusionControllerStatus = exports.InclusionControllerStatus || (exports.InclusionControllerStatus = {}));
var IndicatorCommand;
(function (IndicatorCommand) {
    IndicatorCommand[IndicatorCommand["Set"] = 1] = "Set";
    IndicatorCommand[IndicatorCommand["Get"] = 2] = "Get";
    IndicatorCommand[IndicatorCommand["Report"] = 3] = "Report";
    IndicatorCommand[IndicatorCommand["SupportedGet"] = 4] = "SupportedGet";
    IndicatorCommand[IndicatorCommand["SupportedReport"] = 5] = "SupportedReport";
    IndicatorCommand[IndicatorCommand["DescriptionGet"] = 6] = "DescriptionGet";
    IndicatorCommand[IndicatorCommand["DescriptionReport"] = 7] = "DescriptionReport";
})(IndicatorCommand = exports.IndicatorCommand || (exports.IndicatorCommand = {}));
var IrrigationCommand;
(function (IrrigationCommand) {
    IrrigationCommand[IrrigationCommand["SystemInfoGet"] = 1] = "SystemInfoGet";
    IrrigationCommand[IrrigationCommand["SystemInfoReport"] = 2] = "SystemInfoReport";
    IrrigationCommand[IrrigationCommand["SystemStatusGet"] = 3] = "SystemStatusGet";
    IrrigationCommand[IrrigationCommand["SystemStatusReport"] = 4] = "SystemStatusReport";
    IrrigationCommand[IrrigationCommand["SystemConfigSet"] = 5] = "SystemConfigSet";
    IrrigationCommand[IrrigationCommand["SystemConfigGet"] = 6] = "SystemConfigGet";
    IrrigationCommand[IrrigationCommand["SystemConfigReport"] = 7] = "SystemConfigReport";
    IrrigationCommand[IrrigationCommand["ValveInfoGet"] = 8] = "ValveInfoGet";
    IrrigationCommand[IrrigationCommand["ValveInfoReport"] = 9] = "ValveInfoReport";
    IrrigationCommand[IrrigationCommand["ValveConfigSet"] = 10] = "ValveConfigSet";
    IrrigationCommand[IrrigationCommand["ValveConfigGet"] = 11] = "ValveConfigGet";
    IrrigationCommand[IrrigationCommand["ValveConfigReport"] = 12] = "ValveConfigReport";
    IrrigationCommand[IrrigationCommand["ValveRun"] = 13] = "ValveRun";
    IrrigationCommand[IrrigationCommand["ValveTableSet"] = 14] = "ValveTableSet";
    IrrigationCommand[IrrigationCommand["ValveTableGet"] = 15] = "ValveTableGet";
    IrrigationCommand[IrrigationCommand["ValveTableReport"] = 16] = "ValveTableReport";
    IrrigationCommand[IrrigationCommand["ValveTableRun"] = 17] = "ValveTableRun";
    IrrigationCommand[IrrigationCommand["SystemShutoff"] = 18] = "SystemShutoff";
})(IrrigationCommand = exports.IrrigationCommand || (exports.IrrigationCommand = {}));
var IrrigationSensorPolarity;
(function (IrrigationSensorPolarity) {
    IrrigationSensorPolarity[IrrigationSensorPolarity["Low"] = 0] = "Low";
    IrrigationSensorPolarity[IrrigationSensorPolarity["High"] = 1] = "High";
})(IrrigationSensorPolarity = exports.IrrigationSensorPolarity || (exports.IrrigationSensorPolarity = {}));
var ValveType;
(function (ValveType) {
    ValveType[ValveType["ZoneValve"] = 0] = "ZoneValve";
    ValveType[ValveType["MasterValve"] = 1] = "MasterValve";
})(ValveType = exports.ValveType || (exports.ValveType = {}));
var LanguageCommand;
(function (LanguageCommand) {
    LanguageCommand[LanguageCommand["Set"] = 1] = "Set";
    LanguageCommand[LanguageCommand["Get"] = 2] = "Get";
    LanguageCommand[LanguageCommand["Report"] = 3] = "Report";
})(LanguageCommand = exports.LanguageCommand || (exports.LanguageCommand = {}));
var LockCommand;
(function (LockCommand) {
    LockCommand[LockCommand["Set"] = 1] = "Set";
    LockCommand[LockCommand["Get"] = 2] = "Get";
    LockCommand[LockCommand["Report"] = 3] = "Report";
})(LockCommand = exports.LockCommand || (exports.LockCommand = {}));
var ManufacturerSpecificCommand;
(function (ManufacturerSpecificCommand) {
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["Get"] = 4] = "Get";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["Report"] = 5] = "Report";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["DeviceSpecificGet"] = 6] = "DeviceSpecificGet";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["DeviceSpecificReport"] = 7] = "DeviceSpecificReport";
})(ManufacturerSpecificCommand = exports.ManufacturerSpecificCommand || (exports.ManufacturerSpecificCommand = {}));
var DeviceIdType;
(function (DeviceIdType) {
    DeviceIdType[DeviceIdType["FactoryDefault"] = 0] = "FactoryDefault";
    DeviceIdType[DeviceIdType["SerialNumber"] = 1] = "SerialNumber";
    DeviceIdType[DeviceIdType["PseudoRandom"] = 2] = "PseudoRandom";
})(DeviceIdType = exports.DeviceIdType || (exports.DeviceIdType = {}));
var MeterCommand;
(function (MeterCommand) {
    MeterCommand[MeterCommand["Get"] = 1] = "Get";
    MeterCommand[MeterCommand["Report"] = 2] = "Report";
    MeterCommand[MeterCommand["SupportedGet"] = 3] = "SupportedGet";
    MeterCommand[MeterCommand["SupportedReport"] = 4] = "SupportedReport";
    MeterCommand[MeterCommand["Reset"] = 5] = "Reset";
})(MeterCommand = exports.MeterCommand || (exports.MeterCommand = {}));
var RateType;
(function (RateType) {
    RateType[RateType["Unspecified"] = 0] = "Unspecified";
    RateType[RateType["Consumed"] = 1] = "Consumed";
    RateType[RateType["Produced"] = 2] = "Produced";
})(RateType = exports.RateType || (exports.RateType = {}));
var MultiChannelAssociationCommand;
(function (MultiChannelAssociationCommand) {
    MultiChannelAssociationCommand[MultiChannelAssociationCommand["Set"] = 1] = "Set";
    MultiChannelAssociationCommand[MultiChannelAssociationCommand["Get"] = 2] = "Get";
    MultiChannelAssociationCommand[MultiChannelAssociationCommand["Report"] = 3] = "Report";
    MultiChannelAssociationCommand[MultiChannelAssociationCommand["Remove"] = 4] = "Remove";
    MultiChannelAssociationCommand[MultiChannelAssociationCommand["SupportedGroupingsGet"] = 5] = "SupportedGroupingsGet";
    MultiChannelAssociationCommand[MultiChannelAssociationCommand["SupportedGroupingsReport"] = 6] = "SupportedGroupingsReport";
})(MultiChannelAssociationCommand = exports.MultiChannelAssociationCommand || (exports.MultiChannelAssociationCommand = {}));
var MultiChannelCommand;
(function (MultiChannelCommand) {
    // Legacy commands for V1 (Multi Instance)
    MultiChannelCommand[MultiChannelCommand["GetV1"] = 4] = "GetV1";
    MultiChannelCommand[MultiChannelCommand["ReportV1"] = 5] = "ReportV1";
    MultiChannelCommand[MultiChannelCommand["CommandEncapsulationV1"] = 6] = "CommandEncapsulationV1";
    // V2+
    MultiChannelCommand[MultiChannelCommand["EndPointGet"] = 7] = "EndPointGet";
    MultiChannelCommand[MultiChannelCommand["EndPointReport"] = 8] = "EndPointReport";
    MultiChannelCommand[MultiChannelCommand["CapabilityGet"] = 9] = "CapabilityGet";
    MultiChannelCommand[MultiChannelCommand["CapabilityReport"] = 10] = "CapabilityReport";
    MultiChannelCommand[MultiChannelCommand["EndPointFind"] = 11] = "EndPointFind";
    MultiChannelCommand[MultiChannelCommand["EndPointFindReport"] = 12] = "EndPointFindReport";
    MultiChannelCommand[MultiChannelCommand["CommandEncapsulation"] = 13] = "CommandEncapsulation";
    MultiChannelCommand[MultiChannelCommand["AggregatedMembersGet"] = 14] = "AggregatedMembersGet";
    MultiChannelCommand[MultiChannelCommand["AggregatedMembersReport"] = 15] = "AggregatedMembersReport";
})(MultiChannelCommand = exports.MultiChannelCommand || (exports.MultiChannelCommand = {}));
var MultiCommandCommand;
(function (MultiCommandCommand) {
    MultiCommandCommand[MultiCommandCommand["CommandEncapsulation"] = 1] = "CommandEncapsulation";
})(MultiCommandCommand = exports.MultiCommandCommand || (exports.MultiCommandCommand = {}));
var MultilevelSensorCommand;
(function (MultilevelSensorCommand) {
    MultilevelSensorCommand[MultilevelSensorCommand["GetSupportedSensor"] = 1] = "GetSupportedSensor";
    MultilevelSensorCommand[MultilevelSensorCommand["SupportedSensorReport"] = 2] = "SupportedSensorReport";
    MultilevelSensorCommand[MultilevelSensorCommand["GetSupportedScale"] = 3] = "GetSupportedScale";
    MultilevelSensorCommand[MultilevelSensorCommand["Get"] = 4] = "Get";
    MultilevelSensorCommand[MultilevelSensorCommand["Report"] = 5] = "Report";
    MultilevelSensorCommand[MultilevelSensorCommand["SupportedScaleReport"] = 6] = "SupportedScaleReport";
})(MultilevelSensorCommand = exports.MultilevelSensorCommand || (exports.MultilevelSensorCommand = {}));
var MultilevelSwitchCommand;
(function (MultilevelSwitchCommand) {
    MultilevelSwitchCommand[MultilevelSwitchCommand["Set"] = 1] = "Set";
    MultilevelSwitchCommand[MultilevelSwitchCommand["Get"] = 2] = "Get";
    MultilevelSwitchCommand[MultilevelSwitchCommand["Report"] = 3] = "Report";
    MultilevelSwitchCommand[MultilevelSwitchCommand["StartLevelChange"] = 4] = "StartLevelChange";
    MultilevelSwitchCommand[MultilevelSwitchCommand["StopLevelChange"] = 5] = "StopLevelChange";
    MultilevelSwitchCommand[MultilevelSwitchCommand["SupportedGet"] = 6] = "SupportedGet";
    MultilevelSwitchCommand[MultilevelSwitchCommand["SupportedReport"] = 7] = "SupportedReport";
})(MultilevelSwitchCommand = exports.MultilevelSwitchCommand || (exports.MultilevelSwitchCommand = {}));
var LevelChangeDirection;
(function (LevelChangeDirection) {
    LevelChangeDirection[LevelChangeDirection["up"] = 0] = "up";
    LevelChangeDirection[LevelChangeDirection["down"] = 1] = "down";
    // "none" = 0b11,
})(LevelChangeDirection = exports.LevelChangeDirection || (exports.LevelChangeDirection = {}));
var SwitchType;
(function (SwitchType) {
    SwitchType[SwitchType["not supported"] = 0] = "not supported";
    SwitchType[SwitchType["Off/On"] = 1] = "Off/On";
    SwitchType[SwitchType["Down/Up"] = 2] = "Down/Up";
    SwitchType[SwitchType["Close/Open"] = 3] = "Close/Open";
    SwitchType[SwitchType["CCW/CW"] = 4] = "CCW/CW";
    SwitchType[SwitchType["Left/Right"] = 5] = "Left/Right";
    SwitchType[SwitchType["Reverse/Forward"] = 6] = "Reverse/Forward";
    SwitchType[SwitchType["Pull/Push"] = 7] = "Pull/Push";
})(SwitchType = exports.SwitchType || (exports.SwitchType = {}));
var NodeNamingAndLocationCommand;
(function (NodeNamingAndLocationCommand) {
    NodeNamingAndLocationCommand[NodeNamingAndLocationCommand["NameSet"] = 1] = "NameSet";
    NodeNamingAndLocationCommand[NodeNamingAndLocationCommand["NameGet"] = 2] = "NameGet";
    NodeNamingAndLocationCommand[NodeNamingAndLocationCommand["NameReport"] = 3] = "NameReport";
    NodeNamingAndLocationCommand[NodeNamingAndLocationCommand["LocationSet"] = 4] = "LocationSet";
    NodeNamingAndLocationCommand[NodeNamingAndLocationCommand["LocationGet"] = 5] = "LocationGet";
    NodeNamingAndLocationCommand[NodeNamingAndLocationCommand["LocationReport"] = 6] = "LocationReport";
})(NodeNamingAndLocationCommand = exports.NodeNamingAndLocationCommand || (exports.NodeNamingAndLocationCommand = {}));
var NotificationCommand;
(function (NotificationCommand) {
    NotificationCommand[NotificationCommand["EventSupportedGet"] = 1] = "EventSupportedGet";
    NotificationCommand[NotificationCommand["EventSupportedReport"] = 2] = "EventSupportedReport";
    NotificationCommand[NotificationCommand["Get"] = 4] = "Get";
    NotificationCommand[NotificationCommand["Report"] = 5] = "Report";
    NotificationCommand[NotificationCommand["Set"] = 6] = "Set";
    NotificationCommand[NotificationCommand["SupportedGet"] = 7] = "SupportedGet";
    NotificationCommand[NotificationCommand["SupportedReport"] = 8] = "SupportedReport";
})(NotificationCommand = exports.NotificationCommand || (exports.NotificationCommand = {}));
var PowerlevelCommand;
(function (PowerlevelCommand) {
    PowerlevelCommand[PowerlevelCommand["Set"] = 1] = "Set";
    PowerlevelCommand[PowerlevelCommand["Get"] = 2] = "Get";
    PowerlevelCommand[PowerlevelCommand["Report"] = 3] = "Report";
    PowerlevelCommand[PowerlevelCommand["TestNodeSet"] = 4] = "TestNodeSet";
    PowerlevelCommand[PowerlevelCommand["TestNodeGet"] = 5] = "TestNodeGet";
    PowerlevelCommand[PowerlevelCommand["TestNodeReport"] = 6] = "TestNodeReport";
})(PowerlevelCommand = exports.PowerlevelCommand || (exports.PowerlevelCommand = {}));
var Powerlevel;
(function (Powerlevel) {
    Powerlevel[Powerlevel["Normal Power"] = 0] = "Normal Power";
    Powerlevel[Powerlevel["-1 dBm"] = 1] = "-1 dBm";
    Powerlevel[Powerlevel["-2 dBm"] = 2] = "-2 dBm";
    Powerlevel[Powerlevel["-3 dBm"] = 3] = "-3 dBm";
    Powerlevel[Powerlevel["-4 dBm"] = 4] = "-4 dBm";
    Powerlevel[Powerlevel["-5 dBm"] = 5] = "-5 dBm";
    Powerlevel[Powerlevel["-6 dBm"] = 6] = "-6 dBm";
    Powerlevel[Powerlevel["-7 dBm"] = 7] = "-7 dBm";
    Powerlevel[Powerlevel["-8 dBm"] = 8] = "-8 dBm";
    Powerlevel[Powerlevel["-9 dBm"] = 9] = "-9 dBm";
})(Powerlevel = exports.Powerlevel || (exports.Powerlevel = {}));
var PowerlevelTestStatus;
(function (PowerlevelTestStatus) {
    PowerlevelTestStatus[PowerlevelTestStatus["Failed"] = 0] = "Failed";
    PowerlevelTestStatus[PowerlevelTestStatus["Success"] = 1] = "Success";
    PowerlevelTestStatus[PowerlevelTestStatus["In Progress"] = 2] = "In Progress";
})(PowerlevelTestStatus = exports.PowerlevelTestStatus || (exports.PowerlevelTestStatus = {}));
var ProtectionCommand;
(function (ProtectionCommand) {
    ProtectionCommand[ProtectionCommand["Set"] = 1] = "Set";
    ProtectionCommand[ProtectionCommand["Get"] = 2] = "Get";
    ProtectionCommand[ProtectionCommand["Report"] = 3] = "Report";
    ProtectionCommand[ProtectionCommand["SupportedGet"] = 4] = "SupportedGet";
    ProtectionCommand[ProtectionCommand["SupportedReport"] = 5] = "SupportedReport";
    ProtectionCommand[ProtectionCommand["ExclusiveControlSet"] = 6] = "ExclusiveControlSet";
    ProtectionCommand[ProtectionCommand["ExclusiveControlGet"] = 7] = "ExclusiveControlGet";
    ProtectionCommand[ProtectionCommand["ExclusiveControlReport"] = 8] = "ExclusiveControlReport";
    ProtectionCommand[ProtectionCommand["TimeoutSet"] = 9] = "TimeoutSet";
    ProtectionCommand[ProtectionCommand["TimeoutGet"] = 10] = "TimeoutGet";
    ProtectionCommand[ProtectionCommand["TimeoutReport"] = 11] = "TimeoutReport";
})(ProtectionCommand = exports.ProtectionCommand || (exports.ProtectionCommand = {}));
var LocalProtectionState;
(function (LocalProtectionState) {
    LocalProtectionState[LocalProtectionState["Unprotected"] = 0] = "Unprotected";
    LocalProtectionState[LocalProtectionState["ProtectedBySequence"] = 1] = "ProtectedBySequence";
    LocalProtectionState[LocalProtectionState["NoOperationPossible"] = 2] = "NoOperationPossible";
})(LocalProtectionState = exports.LocalProtectionState || (exports.LocalProtectionState = {}));
var RFProtectionState;
(function (RFProtectionState) {
    RFProtectionState[RFProtectionState["Unprotected"] = 0] = "Unprotected";
    RFProtectionState[RFProtectionState["NoControl"] = 1] = "NoControl";
    RFProtectionState[RFProtectionState["NoResponse"] = 2] = "NoResponse";
})(RFProtectionState = exports.RFProtectionState || (exports.RFProtectionState = {}));
var SceneActivationCommand;
(function (SceneActivationCommand) {
    SceneActivationCommand[SceneActivationCommand["Set"] = 1] = "Set";
})(SceneActivationCommand = exports.SceneActivationCommand || (exports.SceneActivationCommand = {}));
var SceneActuatorConfigurationCommand;
(function (SceneActuatorConfigurationCommand) {
    SceneActuatorConfigurationCommand[SceneActuatorConfigurationCommand["Set"] = 1] = "Set";
    SceneActuatorConfigurationCommand[SceneActuatorConfigurationCommand["Get"] = 2] = "Get";
    SceneActuatorConfigurationCommand[SceneActuatorConfigurationCommand["Report"] = 3] = "Report";
})(SceneActuatorConfigurationCommand = exports.SceneActuatorConfigurationCommand || (exports.SceneActuatorConfigurationCommand = {}));
var SceneControllerConfigurationCommand;
(function (SceneControllerConfigurationCommand) {
    SceneControllerConfigurationCommand[SceneControllerConfigurationCommand["Set"] = 1] = "Set";
    SceneControllerConfigurationCommand[SceneControllerConfigurationCommand["Get"] = 2] = "Get";
    SceneControllerConfigurationCommand[SceneControllerConfigurationCommand["Report"] = 3] = "Report";
})(SceneControllerConfigurationCommand = exports.SceneControllerConfigurationCommand || (exports.SceneControllerConfigurationCommand = {}));
var ScheduleEntryLockCommand;
(function (ScheduleEntryLockCommand) {
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["EnableSet"] = 1] = "EnableSet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["EnableAllSet"] = 2] = "EnableAllSet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["WeekDayScheduleSet"] = 3] = "WeekDayScheduleSet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["WeekDayScheduleGet"] = 4] = "WeekDayScheduleGet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["WeekDayScheduleReport"] = 5] = "WeekDayScheduleReport";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["YearDayScheduleSet"] = 6] = "YearDayScheduleSet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["YearDayScheduleGet"] = 7] = "YearDayScheduleGet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["YearDayScheduleReport"] = 8] = "YearDayScheduleReport";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["SupportedGet"] = 9] = "SupportedGet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["SupportedReport"] = 10] = "SupportedReport";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["TimeOffsetGet"] = 11] = "TimeOffsetGet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["TimeOffsetReport"] = 12] = "TimeOffsetReport";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["TimeOffsetSet"] = 13] = "TimeOffsetSet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["DailyRepeatingScheduleGet"] = 14] = "DailyRepeatingScheduleGet";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["DailyRepeatingScheduleReport"] = 15] = "DailyRepeatingScheduleReport";
    ScheduleEntryLockCommand[ScheduleEntryLockCommand["DailyRepeatingScheduleSet"] = 16] = "DailyRepeatingScheduleSet";
})(ScheduleEntryLockCommand = exports.ScheduleEntryLockCommand || (exports.ScheduleEntryLockCommand = {}));
var ScheduleEntryLockSetAction;
(function (ScheduleEntryLockSetAction) {
    ScheduleEntryLockSetAction[ScheduleEntryLockSetAction["Erase"] = 0] = "Erase";
    ScheduleEntryLockSetAction[ScheduleEntryLockSetAction["Set"] = 1] = "Set";
})(ScheduleEntryLockSetAction = exports.ScheduleEntryLockSetAction || (exports.ScheduleEntryLockSetAction = {}));
var ScheduleEntryLockWeekday;
(function (ScheduleEntryLockWeekday) {
    // Yay, consistency!
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Sunday"] = 0] = "Sunday";
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Monday"] = 1] = "Monday";
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Tuesday"] = 2] = "Tuesday";
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Wednesday"] = 3] = "Wednesday";
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Thursday"] = 4] = "Thursday";
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Friday"] = 5] = "Friday";
    ScheduleEntryLockWeekday[ScheduleEntryLockWeekday["Saturday"] = 6] = "Saturday";
})(ScheduleEntryLockWeekday = exports.ScheduleEntryLockWeekday || (exports.ScheduleEntryLockWeekday = {}));
var Security2Command;
(function (Security2Command) {
    Security2Command[Security2Command["NonceGet"] = 1] = "NonceGet";
    Security2Command[Security2Command["NonceReport"] = 2] = "NonceReport";
    Security2Command[Security2Command["MessageEncapsulation"] = 3] = "MessageEncapsulation";
    Security2Command[Security2Command["KEXGet"] = 4] = "KEXGet";
    Security2Command[Security2Command["KEXReport"] = 5] = "KEXReport";
    Security2Command[Security2Command["KEXSet"] = 6] = "KEXSet";
    Security2Command[Security2Command["KEXFail"] = 7] = "KEXFail";
    Security2Command[Security2Command["PublicKeyReport"] = 8] = "PublicKeyReport";
    Security2Command[Security2Command["NetworkKeyGet"] = 9] = "NetworkKeyGet";
    Security2Command[Security2Command["NetworkKeyReport"] = 10] = "NetworkKeyReport";
    Security2Command[Security2Command["NetworkKeyVerify"] = 11] = "NetworkKeyVerify";
    Security2Command[Security2Command["TransferEnd"] = 12] = "TransferEnd";
    Security2Command[Security2Command["CommandsSupportedGet"] = 13] = "CommandsSupportedGet";
    Security2Command[Security2Command["CommandsSupportedReport"] = 14] = "CommandsSupportedReport";
})(Security2Command = exports.Security2Command || (exports.Security2Command = {}));
var SecurityCommand;
(function (SecurityCommand) {
    SecurityCommand[SecurityCommand["CommandsSupportedGet"] = 2] = "CommandsSupportedGet";
    SecurityCommand[SecurityCommand["CommandsSupportedReport"] = 3] = "CommandsSupportedReport";
    SecurityCommand[SecurityCommand["SchemeGet"] = 4] = "SchemeGet";
    SecurityCommand[SecurityCommand["SchemeReport"] = 5] = "SchemeReport";
    SecurityCommand[SecurityCommand["SchemeInherit"] = 8] = "SchemeInherit";
    SecurityCommand[SecurityCommand["NetworkKeySet"] = 6] = "NetworkKeySet";
    SecurityCommand[SecurityCommand["NetworkKeyVerify"] = 7] = "NetworkKeyVerify";
    SecurityCommand[SecurityCommand["NonceGet"] = 64] = "NonceGet";
    SecurityCommand[SecurityCommand["NonceReport"] = 128] = "NonceReport";
    SecurityCommand[SecurityCommand["CommandEncapsulation"] = 129] = "CommandEncapsulation";
    SecurityCommand[SecurityCommand["CommandEncapsulationNonceGet"] = 193] = "CommandEncapsulationNonceGet";
})(SecurityCommand = exports.SecurityCommand || (exports.SecurityCommand = {}));
var SoundSwitchCommand;
(function (SoundSwitchCommand) {
    SoundSwitchCommand[SoundSwitchCommand["TonesNumberGet"] = 1] = "TonesNumberGet";
    SoundSwitchCommand[SoundSwitchCommand["TonesNumberReport"] = 2] = "TonesNumberReport";
    SoundSwitchCommand[SoundSwitchCommand["ToneInfoGet"] = 3] = "ToneInfoGet";
    SoundSwitchCommand[SoundSwitchCommand["ToneInfoReport"] = 4] = "ToneInfoReport";
    SoundSwitchCommand[SoundSwitchCommand["ConfigurationSet"] = 5] = "ConfigurationSet";
    SoundSwitchCommand[SoundSwitchCommand["ConfigurationGet"] = 6] = "ConfigurationGet";
    SoundSwitchCommand[SoundSwitchCommand["ConfigurationReport"] = 7] = "ConfigurationReport";
    SoundSwitchCommand[SoundSwitchCommand["TonePlaySet"] = 8] = "TonePlaySet";
    SoundSwitchCommand[SoundSwitchCommand["TonePlayGet"] = 9] = "TonePlayGet";
    SoundSwitchCommand[SoundSwitchCommand["TonePlayReport"] = 10] = "TonePlayReport";
})(SoundSwitchCommand = exports.SoundSwitchCommand || (exports.SoundSwitchCommand = {}));
var ToneId;
(function (ToneId) {
    ToneId[ToneId["Off"] = 0] = "Off";
    ToneId[ToneId["Default"] = 255] = "Default";
})(ToneId = exports.ToneId || (exports.ToneId = {}));
var SupervisionCommand;
(function (SupervisionCommand) {
    SupervisionCommand[SupervisionCommand["Get"] = 1] = "Get";
    SupervisionCommand[SupervisionCommand["Report"] = 2] = "Report";
})(SupervisionCommand = exports.SupervisionCommand || (exports.SupervisionCommand = {}));
var ThermostatFanModeCommand;
(function (ThermostatFanModeCommand) {
    ThermostatFanModeCommand[ThermostatFanModeCommand["Set"] = 1] = "Set";
    ThermostatFanModeCommand[ThermostatFanModeCommand["Get"] = 2] = "Get";
    ThermostatFanModeCommand[ThermostatFanModeCommand["Report"] = 3] = "Report";
    ThermostatFanModeCommand[ThermostatFanModeCommand["SupportedGet"] = 4] = "SupportedGet";
    ThermostatFanModeCommand[ThermostatFanModeCommand["SupportedReport"] = 5] = "SupportedReport";
})(ThermostatFanModeCommand = exports.ThermostatFanModeCommand || (exports.ThermostatFanModeCommand = {}));
var ThermostatFanMode;
(function (ThermostatFanMode) {
    ThermostatFanMode[ThermostatFanMode["Auto low"] = 0] = "Auto low";
    ThermostatFanMode[ThermostatFanMode["Low"] = 1] = "Low";
    ThermostatFanMode[ThermostatFanMode["Auto high"] = 2] = "Auto high";
    ThermostatFanMode[ThermostatFanMode["High"] = 3] = "High";
    ThermostatFanMode[ThermostatFanMode["Auto medium"] = 4] = "Auto medium";
    ThermostatFanMode[ThermostatFanMode["Medium"] = 5] = "Medium";
    ThermostatFanMode[ThermostatFanMode["Circulation"] = 6] = "Circulation";
    ThermostatFanMode[ThermostatFanMode["Humidity circulation"] = 7] = "Humidity circulation";
    ThermostatFanMode[ThermostatFanMode["Left and right"] = 8] = "Left and right";
    ThermostatFanMode[ThermostatFanMode["Up and down"] = 9] = "Up and down";
    ThermostatFanMode[ThermostatFanMode["Quiet"] = 10] = "Quiet";
    ThermostatFanMode[ThermostatFanMode["External circulation"] = 11] = "External circulation";
})(ThermostatFanMode = exports.ThermostatFanMode || (exports.ThermostatFanMode = {}));
var ThermostatFanStateCommand;
(function (ThermostatFanStateCommand) {
    ThermostatFanStateCommand[ThermostatFanStateCommand["Get"] = 2] = "Get";
    ThermostatFanStateCommand[ThermostatFanStateCommand["Report"] = 3] = "Report";
})(ThermostatFanStateCommand = exports.ThermostatFanStateCommand || (exports.ThermostatFanStateCommand = {}));
var ThermostatFanState;
(function (ThermostatFanState) {
    ThermostatFanState[ThermostatFanState["Idle / off"] = 0] = "Idle / off";
    ThermostatFanState[ThermostatFanState["Running / running low"] = 1] = "Running / running low";
    ThermostatFanState[ThermostatFanState["Running high"] = 2] = "Running high";
    ThermostatFanState[ThermostatFanState["Running medium"] = 3] = "Running medium";
    ThermostatFanState[ThermostatFanState["Circulation mode"] = 4] = "Circulation mode";
    ThermostatFanState[ThermostatFanState["Humidity circulation mode"] = 5] = "Humidity circulation mode";
    ThermostatFanState[ThermostatFanState["Right - left circulation mode"] = 6] = "Right - left circulation mode";
    ThermostatFanState[ThermostatFanState["Up - down circulation mode"] = 7] = "Up - down circulation mode";
    ThermostatFanState[ThermostatFanState["Quiet circulation mode"] = 8] = "Quiet circulation mode";
})(ThermostatFanState = exports.ThermostatFanState || (exports.ThermostatFanState = {}));
var ThermostatModeCommand;
(function (ThermostatModeCommand) {
    ThermostatModeCommand[ThermostatModeCommand["Set"] = 1] = "Set";
    ThermostatModeCommand[ThermostatModeCommand["Get"] = 2] = "Get";
    ThermostatModeCommand[ThermostatModeCommand["Report"] = 3] = "Report";
    ThermostatModeCommand[ThermostatModeCommand["SupportedGet"] = 4] = "SupportedGet";
    ThermostatModeCommand[ThermostatModeCommand["SupportedReport"] = 5] = "SupportedReport";
})(ThermostatModeCommand = exports.ThermostatModeCommand || (exports.ThermostatModeCommand = {}));
var ThermostatMode;
(function (ThermostatMode) {
    ThermostatMode[ThermostatMode["Off"] = 0] = "Off";
    ThermostatMode[ThermostatMode["Heat"] = 1] = "Heat";
    ThermostatMode[ThermostatMode["Cool"] = 2] = "Cool";
    ThermostatMode[ThermostatMode["Auto"] = 3] = "Auto";
    ThermostatMode[ThermostatMode["Auxiliary"] = 4] = "Auxiliary";
    ThermostatMode[ThermostatMode["Resume (on)"] = 5] = "Resume (on)";
    ThermostatMode[ThermostatMode["Fan"] = 6] = "Fan";
    ThermostatMode[ThermostatMode["Furnace"] = 7] = "Furnace";
    ThermostatMode[ThermostatMode["Dry"] = 8] = "Dry";
    ThermostatMode[ThermostatMode["Moist"] = 9] = "Moist";
    ThermostatMode[ThermostatMode["Auto changeover"] = 10] = "Auto changeover";
    ThermostatMode[ThermostatMode["Energy heat"] = 11] = "Energy heat";
    ThermostatMode[ThermostatMode["Energy cool"] = 12] = "Energy cool";
    ThermostatMode[ThermostatMode["Away"] = 13] = "Away";
    ThermostatMode[ThermostatMode["Full power"] = 15] = "Full power";
    ThermostatMode[ThermostatMode["Manufacturer specific"] = 31] = "Manufacturer specific";
})(ThermostatMode = exports.ThermostatMode || (exports.ThermostatMode = {}));
var ThermostatOperatingStateCommand;
(function (ThermostatOperatingStateCommand) {
    ThermostatOperatingStateCommand[ThermostatOperatingStateCommand["Get"] = 2] = "Get";
    ThermostatOperatingStateCommand[ThermostatOperatingStateCommand["Report"] = 3] = "Report";
    // TODO: Implement V2 commands
    // LoggingSupportedGet = 0x01,
    // LoggingSupportedReport = 0x04,
    // LoggingGet = 0x05,
    // LoggingReport = 0x06,
})(ThermostatOperatingStateCommand = exports.ThermostatOperatingStateCommand || (exports.ThermostatOperatingStateCommand = {}));
var ThermostatOperatingState;
(function (ThermostatOperatingState) {
    ThermostatOperatingState[ThermostatOperatingState["Idle"] = 0] = "Idle";
    ThermostatOperatingState[ThermostatOperatingState["Heating"] = 1] = "Heating";
    ThermostatOperatingState[ThermostatOperatingState["Cooling"] = 2] = "Cooling";
    ThermostatOperatingState[ThermostatOperatingState["Fan Only"] = 3] = "Fan Only";
    ThermostatOperatingState[ThermostatOperatingState["Pending Heat"] = 4] = "Pending Heat";
    ThermostatOperatingState[ThermostatOperatingState["Pending Cool"] = 5] = "Pending Cool";
    ThermostatOperatingState[ThermostatOperatingState["Vent/Economizer"] = 6] = "Vent/Economizer";
    ThermostatOperatingState[ThermostatOperatingState["Aux Heating"] = 7] = "Aux Heating";
    ThermostatOperatingState[ThermostatOperatingState["2nd Stage Heating"] = 8] = "2nd Stage Heating";
    ThermostatOperatingState[ThermostatOperatingState["2nd Stage Cooling"] = 9] = "2nd Stage Cooling";
    ThermostatOperatingState[ThermostatOperatingState["2nd Stage Aux Heat"] = 10] = "2nd Stage Aux Heat";
    ThermostatOperatingState[ThermostatOperatingState["3rd Stage Aux Heat"] = 11] = "3rd Stage Aux Heat";
})(ThermostatOperatingState = exports.ThermostatOperatingState || (exports.ThermostatOperatingState = {}));
var ThermostatSetbackCommand;
(function (ThermostatSetbackCommand) {
    ThermostatSetbackCommand[ThermostatSetbackCommand["Set"] = 1] = "Set";
    ThermostatSetbackCommand[ThermostatSetbackCommand["Get"] = 2] = "Get";
    ThermostatSetbackCommand[ThermostatSetbackCommand["Report"] = 3] = "Report";
})(ThermostatSetbackCommand = exports.ThermostatSetbackCommand || (exports.ThermostatSetbackCommand = {}));
var SetbackType;
(function (SetbackType) {
    SetbackType[SetbackType["None"] = 0] = "None";
    SetbackType[SetbackType["Temporary"] = 1] = "Temporary";
    SetbackType[SetbackType["Permanent"] = 2] = "Permanent";
})(SetbackType = exports.SetbackType || (exports.SetbackType = {}));
var ThermostatSetpointCommand;
(function (ThermostatSetpointCommand) {
    ThermostatSetpointCommand[ThermostatSetpointCommand["Set"] = 1] = "Set";
    ThermostatSetpointCommand[ThermostatSetpointCommand["Get"] = 2] = "Get";
    ThermostatSetpointCommand[ThermostatSetpointCommand["Report"] = 3] = "Report";
    ThermostatSetpointCommand[ThermostatSetpointCommand["SupportedGet"] = 4] = "SupportedGet";
    ThermostatSetpointCommand[ThermostatSetpointCommand["SupportedReport"] = 5] = "SupportedReport";
    ThermostatSetpointCommand[ThermostatSetpointCommand["CapabilitiesGet"] = 9] = "CapabilitiesGet";
    ThermostatSetpointCommand[ThermostatSetpointCommand["CapabilitiesReport"] = 10] = "CapabilitiesReport";
})(ThermostatSetpointCommand = exports.ThermostatSetpointCommand || (exports.ThermostatSetpointCommand = {}));
var ThermostatSetpointType;
(function (ThermostatSetpointType) {
    ThermostatSetpointType[ThermostatSetpointType["N/A"] = 0] = "N/A";
    ThermostatSetpointType[ThermostatSetpointType["Heating"] = 1] = "Heating";
    ThermostatSetpointType[ThermostatSetpointType["Cooling"] = 2] = "Cooling";
    ThermostatSetpointType[ThermostatSetpointType["Furnace"] = 7] = "Furnace";
    ThermostatSetpointType[ThermostatSetpointType["Dry Air"] = 8] = "Dry Air";
    ThermostatSetpointType[ThermostatSetpointType["Moist Air"] = 9] = "Moist Air";
    ThermostatSetpointType[ThermostatSetpointType["Auto Changeover"] = 10] = "Auto Changeover";
    ThermostatSetpointType[ThermostatSetpointType["Energy Save Heating"] = 11] = "Energy Save Heating";
    ThermostatSetpointType[ThermostatSetpointType["Energy Save Cooling"] = 12] = "Energy Save Cooling";
    ThermostatSetpointType[ThermostatSetpointType["Away Heating"] = 13] = "Away Heating";
    ThermostatSetpointType[ThermostatSetpointType["Away Cooling"] = 14] = "Away Cooling";
    ThermostatSetpointType[ThermostatSetpointType["Full Power"] = 15] = "Full Power";
})(ThermostatSetpointType = exports.ThermostatSetpointType || (exports.ThermostatSetpointType = {}));
var TimeCommand;
(function (TimeCommand) {
    TimeCommand[TimeCommand["TimeGet"] = 1] = "TimeGet";
    TimeCommand[TimeCommand["TimeReport"] = 2] = "TimeReport";
    TimeCommand[TimeCommand["DateGet"] = 3] = "DateGet";
    TimeCommand[TimeCommand["DateReport"] = 4] = "DateReport";
    TimeCommand[TimeCommand["TimeOffsetSet"] = 5] = "TimeOffsetSet";
    TimeCommand[TimeCommand["TimeOffsetGet"] = 6] = "TimeOffsetGet";
    TimeCommand[TimeCommand["TimeOffsetReport"] = 7] = "TimeOffsetReport";
})(TimeCommand = exports.TimeCommand || (exports.TimeCommand = {}));
var TimeParametersCommand;
(function (TimeParametersCommand) {
    TimeParametersCommand[TimeParametersCommand["Set"] = 1] = "Set";
    TimeParametersCommand[TimeParametersCommand["Get"] = 2] = "Get";
    TimeParametersCommand[TimeParametersCommand["Report"] = 3] = "Report";
})(TimeParametersCommand = exports.TimeParametersCommand || (exports.TimeParametersCommand = {}));
var TransportServiceCommand;
(function (TransportServiceCommand) {
    TransportServiceCommand[TransportServiceCommand["FirstSegment"] = 192] = "FirstSegment";
    TransportServiceCommand[TransportServiceCommand["SegmentComplete"] = 232] = "SegmentComplete";
    TransportServiceCommand[TransportServiceCommand["SegmentRequest"] = 200] = "SegmentRequest";
    TransportServiceCommand[TransportServiceCommand["SegmentWait"] = 240] = "SegmentWait";
    TransportServiceCommand[TransportServiceCommand["SubsequentSegment"] = 224] = "SubsequentSegment";
})(TransportServiceCommand = exports.TransportServiceCommand || (exports.TransportServiceCommand = {}));
var UserCodeCommand;
(function (UserCodeCommand) {
    UserCodeCommand[UserCodeCommand["Set"] = 1] = "Set";
    UserCodeCommand[UserCodeCommand["Get"] = 2] = "Get";
    UserCodeCommand[UserCodeCommand["Report"] = 3] = "Report";
    // V2+
    UserCodeCommand[UserCodeCommand["UsersNumberGet"] = 4] = "UsersNumberGet";
    UserCodeCommand[UserCodeCommand["UsersNumberReport"] = 5] = "UsersNumberReport";
    UserCodeCommand[UserCodeCommand["CapabilitiesGet"] = 6] = "CapabilitiesGet";
    UserCodeCommand[UserCodeCommand["CapabilitiesReport"] = 7] = "CapabilitiesReport";
    UserCodeCommand[UserCodeCommand["KeypadModeSet"] = 8] = "KeypadModeSet";
    UserCodeCommand[UserCodeCommand["KeypadModeGet"] = 9] = "KeypadModeGet";
    UserCodeCommand[UserCodeCommand["KeypadModeReport"] = 10] = "KeypadModeReport";
    UserCodeCommand[UserCodeCommand["ExtendedUserCodeSet"] = 11] = "ExtendedUserCodeSet";
    UserCodeCommand[UserCodeCommand["ExtendedUserCodeGet"] = 12] = "ExtendedUserCodeGet";
    UserCodeCommand[UserCodeCommand["ExtendedUserCodeReport"] = 13] = "ExtendedUserCodeReport";
    UserCodeCommand[UserCodeCommand["MasterCodeSet"] = 14] = "MasterCodeSet";
    UserCodeCommand[UserCodeCommand["MasterCodeGet"] = 15] = "MasterCodeGet";
    UserCodeCommand[UserCodeCommand["MasterCodeReport"] = 16] = "MasterCodeReport";
    UserCodeCommand[UserCodeCommand["UserCodeChecksumGet"] = 17] = "UserCodeChecksumGet";
    UserCodeCommand[UserCodeCommand["UserCodeChecksumReport"] = 18] = "UserCodeChecksumReport";
})(UserCodeCommand = exports.UserCodeCommand || (exports.UserCodeCommand = {}));
var UserIDStatus;
(function (UserIDStatus) {
    UserIDStatus[UserIDStatus["Available"] = 0] = "Available";
    UserIDStatus[UserIDStatus["Enabled"] = 1] = "Enabled";
    UserIDStatus[UserIDStatus["Disabled"] = 2] = "Disabled";
    UserIDStatus[UserIDStatus["Messaging"] = 3] = "Messaging";
    UserIDStatus[UserIDStatus["PassageMode"] = 4] = "PassageMode";
    UserIDStatus[UserIDStatus["StatusNotAvailable"] = 254] = "StatusNotAvailable";
})(UserIDStatus = exports.UserIDStatus || (exports.UserIDStatus = {}));
var KeypadMode;
(function (KeypadMode) {
    KeypadMode[KeypadMode["Normal"] = 0] = "Normal";
    KeypadMode[KeypadMode["Vacation"] = 1] = "Vacation";
    KeypadMode[KeypadMode["Privacy"] = 2] = "Privacy";
    KeypadMode[KeypadMode["LockedOut"] = 3] = "LockedOut";
})(KeypadMode = exports.KeypadMode || (exports.KeypadMode = {}));
var VersionCommand;
(function (VersionCommand) {
    VersionCommand[VersionCommand["Get"] = 17] = "Get";
    VersionCommand[VersionCommand["Report"] = 18] = "Report";
    VersionCommand[VersionCommand["CommandClassGet"] = 19] = "CommandClassGet";
    VersionCommand[VersionCommand["CommandClassReport"] = 20] = "CommandClassReport";
    VersionCommand[VersionCommand["CapabilitiesGet"] = 21] = "CapabilitiesGet";
    VersionCommand[VersionCommand["CapabilitiesReport"] = 22] = "CapabilitiesReport";
    VersionCommand[VersionCommand["ZWaveSoftwareGet"] = 23] = "ZWaveSoftwareGet";
    VersionCommand[VersionCommand["ZWaveSoftwareReport"] = 24] = "ZWaveSoftwareReport";
})(VersionCommand = exports.VersionCommand || (exports.VersionCommand = {}));
var WakeUpCommand;
(function (WakeUpCommand) {
    WakeUpCommand[WakeUpCommand["IntervalSet"] = 4] = "IntervalSet";
    WakeUpCommand[WakeUpCommand["IntervalGet"] = 5] = "IntervalGet";
    WakeUpCommand[WakeUpCommand["IntervalReport"] = 6] = "IntervalReport";
    WakeUpCommand[WakeUpCommand["WakeUpNotification"] = 7] = "WakeUpNotification";
    WakeUpCommand[WakeUpCommand["NoMoreInformation"] = 8] = "NoMoreInformation";
    WakeUpCommand[WakeUpCommand["IntervalCapabilitiesGet"] = 9] = "IntervalCapabilitiesGet";
    WakeUpCommand[WakeUpCommand["IntervalCapabilitiesReport"] = 10] = "IntervalCapabilitiesReport";
})(WakeUpCommand = exports.WakeUpCommand || (exports.WakeUpCommand = {}));
var ZWavePlusCommand;
(function (ZWavePlusCommand) {
    ZWavePlusCommand[ZWavePlusCommand["Get"] = 1] = "Get";
    ZWavePlusCommand[ZWavePlusCommand["Report"] = 2] = "Report";
})(ZWavePlusCommand = exports.ZWavePlusCommand || (exports.ZWavePlusCommand = {}));
var ZWavePlusRoleType;
(function (ZWavePlusRoleType) {
    ZWavePlusRoleType[ZWavePlusRoleType["CentralStaticController"] = 0] = "CentralStaticController";
    ZWavePlusRoleType[ZWavePlusRoleType["SubStaticController"] = 1] = "SubStaticController";
    ZWavePlusRoleType[ZWavePlusRoleType["PortableController"] = 2] = "PortableController";
    ZWavePlusRoleType[ZWavePlusRoleType["PortableReportingController"] = 3] = "PortableReportingController";
    ZWavePlusRoleType[ZWavePlusRoleType["PortableSlave"] = 4] = "PortableSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["AlwaysOnSlave"] = 5] = "AlwaysOnSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["SleepingReportingSlave"] = 6] = "SleepingReportingSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["SleepingListeningSlave"] = 7] = "SleepingListeningSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["NetworkAwareSlave"] = 8] = "NetworkAwareSlave";
})(ZWavePlusRoleType = exports.ZWavePlusRoleType || (exports.ZWavePlusRoleType = {}));
var ZWavePlusNodeType;
(function (ZWavePlusNodeType) {
    ZWavePlusNodeType[ZWavePlusNodeType["Node"] = 0] = "Node";
    ZWavePlusNodeType[ZWavePlusNodeType["IPGateway"] = 2] = "IPGateway";
})(ZWavePlusNodeType = exports.ZWavePlusNodeType || (exports.ZWavePlusNodeType = {}));
var ZWaveProtocolCommand;
(function (ZWaveProtocolCommand) {
    ZWaveProtocolCommand[ZWaveProtocolCommand["NodeInformationFrame"] = 1] = "NodeInformationFrame";
    ZWaveProtocolCommand[ZWaveProtocolCommand["RequestNodeInformationFrame"] = 2] = "RequestNodeInformationFrame";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AssignIDs"] = 3] = "AssignIDs";
    ZWaveProtocolCommand[ZWaveProtocolCommand["FindNodesInRange"] = 4] = "FindNodesInRange";
    ZWaveProtocolCommand[ZWaveProtocolCommand["GetNodesInRange"] = 5] = "GetNodesInRange";
    ZWaveProtocolCommand[ZWaveProtocolCommand["RangeInfo"] = 6] = "RangeInfo";
    ZWaveProtocolCommand[ZWaveProtocolCommand["CommandComplete"] = 7] = "CommandComplete";
    ZWaveProtocolCommand[ZWaveProtocolCommand["TransferPresentation"] = 8] = "TransferPresentation";
    ZWaveProtocolCommand[ZWaveProtocolCommand["TransferNodeInformation"] = 9] = "TransferNodeInformation";
    ZWaveProtocolCommand[ZWaveProtocolCommand["TransferRangeInformation"] = 10] = "TransferRangeInformation";
    ZWaveProtocolCommand[ZWaveProtocolCommand["TransferEnd"] = 11] = "TransferEnd";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AssignReturnRoute"] = 12] = "AssignReturnRoute";
    ZWaveProtocolCommand[ZWaveProtocolCommand["NewNodeRegistered"] = 13] = "NewNodeRegistered";
    ZWaveProtocolCommand[ZWaveProtocolCommand["NewRangeRegistered"] = 14] = "NewRangeRegistered";
    ZWaveProtocolCommand[ZWaveProtocolCommand["TransferNewPrimaryControllerComplete"] = 15] = "TransferNewPrimaryControllerComplete";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AutomaticControllerUpdateStart"] = 16] = "AutomaticControllerUpdateStart";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SUCNodeID"] = 17] = "SUCNodeID";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SetSUC"] = 18] = "SetSUC";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SetSUCAck"] = 19] = "SetSUCAck";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AssignSUCReturnRoute"] = 20] = "AssignSUCReturnRoute";
    ZWaveProtocolCommand[ZWaveProtocolCommand["StaticRouteRequest"] = 21] = "StaticRouteRequest";
    ZWaveProtocolCommand[ZWaveProtocolCommand["Lost"] = 22] = "Lost";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AcceptLost"] = 23] = "AcceptLost";
    ZWaveProtocolCommand[ZWaveProtocolCommand["NOPPower"] = 24] = "NOPPower";
    ZWaveProtocolCommand[ZWaveProtocolCommand["ReserveNodeIDs"] = 25] = "ReserveNodeIDs";
    ZWaveProtocolCommand[ZWaveProtocolCommand["ReservedIDs"] = 26] = "ReservedIDs";
    ZWaveProtocolCommand[ZWaveProtocolCommand["NodesExist"] = 31] = "NodesExist";
    ZWaveProtocolCommand[ZWaveProtocolCommand["NodesExistReply"] = 32] = "NodesExistReply";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SetNWIMode"] = 34] = "SetNWIMode";
    ZWaveProtocolCommand[ZWaveProtocolCommand["ExcludeRequest"] = 35] = "ExcludeRequest";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AssignReturnRoutePriority"] = 36] = "AssignReturnRoutePriority";
    ZWaveProtocolCommand[ZWaveProtocolCommand["AssignSUCReturnRoutePriority"] = 37] = "AssignSUCReturnRoutePriority";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SmartStartIncludedNodeInformation"] = 38] = "SmartStartIncludedNodeInformation";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SmartStartPrime"] = 39] = "SmartStartPrime";
    ZWaveProtocolCommand[ZWaveProtocolCommand["SmartStartInclusionRequest"] = 40] = "SmartStartInclusionRequest";
})(ZWaveProtocolCommand = exports.ZWaveProtocolCommand || (exports.ZWaveProtocolCommand = {}));
var WakeUpTime;
(function (WakeUpTime) {
    WakeUpTime[WakeUpTime["None"] = 0] = "None";
    WakeUpTime[WakeUpTime["1000ms"] = 1] = "1000ms";
    WakeUpTime[WakeUpTime["250ms"] = 2] = "250ms";
})(WakeUpTime = exports.WakeUpTime || (exports.WakeUpTime = {}));
function FLiRS2WakeUpTime(value) {
    return value === "1000ms" ? 1 : value === "250ms" ? 2 : 0;
}
exports.FLiRS2WakeUpTime = FLiRS2WakeUpTime;
function wakeUpTime2FLiRS(value) {
    return value === 1 ? "1000ms" : value === 2 ? "250ms" : false;
}
exports.wakeUpTime2FLiRS = wakeUpTime2FLiRS;
function dataRate2ZWaveDataRate(dataRate) {
    return dataRate === 100000
        ? safe_1.ZWaveDataRate["100k"]
        : dataRate === 40000
            ? safe_1.ZWaveDataRate["40k"]
            : safe_1.ZWaveDataRate["9k6"];
}
exports.dataRate2ZWaveDataRate = dataRate2ZWaveDataRate;
function ZWaveDataRate2DataRate(zdr) {
    return zdr === safe_1.ZWaveDataRate["100k"]
        ? 100000
        : zdr === safe_1.ZWaveDataRate["40k"]
            ? 40000
            : 9600;
}
exports.ZWaveDataRate2DataRate = ZWaveDataRate2DataRate;
function parseWakeUpTime(value) {
    return value <= WakeUpTime["250ms"] ? value : 0;
}
exports.parseWakeUpTime = parseWakeUpTime;
var NetworkTransferStatus;
(function (NetworkTransferStatus) {
    NetworkTransferStatus[NetworkTransferStatus["Failed"] = 0] = "Failed";
    NetworkTransferStatus[NetworkTransferStatus["Success"] = 1] = "Success";
    NetworkTransferStatus[NetworkTransferStatus["UpdateDone"] = 2] = "UpdateDone";
    NetworkTransferStatus[NetworkTransferStatus["UpdateAborted"] = 3] = "UpdateAborted";
    NetworkTransferStatus[NetworkTransferStatus["UpdateWait"] = 4] = "UpdateWait";
    NetworkTransferStatus[NetworkTransferStatus["UpdateDisabled"] = 5] = "UpdateDisabled";
    NetworkTransferStatus[NetworkTransferStatus["UpdateOverflow"] = 6] = "UpdateOverflow";
})(NetworkTransferStatus = exports.NetworkTransferStatus || (exports.NetworkTransferStatus = {}));
//# sourceMappingURL=_Types.js.map