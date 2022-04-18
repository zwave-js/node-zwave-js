# Command Classes API

The **Command Classes API** provides a high-to-mid level entrypoint which allows you to use most CC commands that are implemented in Z-Wave JS. This API can be accessed for each node or endpoint using the [`commandClasses` property](api/endpoint.md#commandClasses).

> [!NOTE] Some commands are meant to be used together and that there may be better high-level APIs exposed elsewhere to achieve certain tasks (e.g. for firmware updates).

<!--
	WARNING: This file is auto-generated. Everything past the next comment will be overwritten
-->

<!-- AUTO-GENERATE: CC List -->

-   [Alarm Sensor CC](./AlarmSensor.md) · `0x9c`
-   [Association CC](./Association.md) · `0x85`
-   [Association Group Information CC](./AssociationGroupInfo.md) · `0x59`
-   [Barrier Operator CC](./BarrierOperator.md) · `0x66`
-   [Basic CC](./Basic.md) · `0x20`
-   [Battery CC](./Battery.md) · `0x80`
-   [Binary Sensor CC](./BinarySensor.md) · `0x30`
-   [Binary Switch CC](./BinarySwitch.md) · `0x25`
-   [Central Scene CC](./CentralScene.md) · `0x5b`
-   [Climate Control Schedule CC](./ClimateControlSchedule.md) · `0x46`
-   [Clock CC](./Clock.md) · `0x81`
-   [Color Switch CC](./ColorSwitch.md) · `0x33`
-   [Configuration CC](./Configuration.md) · `0x70`
-   [CRC-16 Encapsulation CC](./CRC16.md) · `0x56`
-   [Door Lock CC](./DoorLock.md) · `0x62`
-   [Door Lock Logging CC](./DoorLockLogging.md) · `0x4c`
-   [Entry Control CC](./EntryControl.md) · `0x6f`
-   [Firmware Update Meta Data CC](./FirmwareUpdateMetaData.md) · `0x7a`
-   [Humidity Control Mode CC](./HumidityControlMode.md) · `0x6d`
-   [Humidity Control Operating State CC](./HumidityControlOperatingState.md) · `0x6e`
-   [Humidity Control Setpoint CC](./HumidityControlSetpoint.md) · `0x64`
-   [Indicator CC](./Indicator.md) · `0x87`
-   [Irrigation CC](./Irrigation.md) · `0x6b`
-   [Language CC](./Language.md) · `0x89`
-   [Lock CC](./Lock.md) · `0x76`
-   [Manufacturer Proprietary CC](./ManufacturerProprietary.md) · `0x91`
-   [Manufacturer Specific CC](./ManufacturerSpecific.md) · `0x72`
-   [Meter CC](./Meter.md) · `0x32`
-   [Multi Channel Association CC](./MultiChannelAssociation.md) · `0x8e`
-   [Multi Channel CC](./MultiChannel.md) · `0x60`
-   [Multi Command CC](./MultiCommand.md) · `0x8f`
-   [Multilevel Sensor CC](./MultilevelSensor.md) · `0x31`
-   [Multilevel Switch CC](./MultilevelSwitch.md) · `0x26`
-   [Node Naming and Location CC](./NodeNamingAndLocation.md) · `0x77`
-   [No Operation CC](./NoOperation.md) · `0x00`
-   [Notification CC](./Notification.md) · `0x71`
-   [Powerlevel CC](./Powerlevel.md) · `0x73`
-   [Protection CC](./Protection.md) · `0x75`
-   [Scene Activation CC](./SceneActivation.md) · `0x2b`
-   [Scene Actuator Configuration CC](./SceneActuatorConfiguration.md) · `0x2c`
-   [Scene Controller Configuration CC](./SceneControllerConfiguration.md) · `0x2d`
-   [Security 2 CC](./Security2.md) · `0x9f`
-   [Security CC](./Security.md) · `0x98`
-   [Sound Switch CC](./SoundSwitch.md) · `0x79`
-   [Supervision CC](./Supervision.md) · `0x6c`
-   [Thermostat Fan Mode CC](./ThermostatFanMode.md) · `0x44`
-   [Thermostat Fan State CC](./ThermostatFanState.md) · `0x45`
-   [Thermostat Mode CC](./ThermostatMode.md) · `0x40`
-   [Thermostat Operating State CC](./ThermostatOperatingState.md) · `0x42`
-   [Thermostat Setback CC](./ThermostatSetback.md) · `0x47`
-   [Thermostat Setpoint CC](./ThermostatSetpoint.md) · `0x43`
-   [Time CC](./Time.md) · `0x8a`
-   [Time Parameters CC](./TimeParameters.md) · `0x8b`
-   [User Code CC](./UserCode.md) · `0x63`
-   [Version CC](./Version.md) · `0x86`
-   [Wake Up CC](./WakeUp.md) · `0x84`
-   [Z-Wave Plus Info CC](./ZWavePlus.md) · `0x5e`
