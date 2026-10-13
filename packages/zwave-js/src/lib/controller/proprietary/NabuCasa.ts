import {
	BinarySwitchCCValues,
	ColorComponent,
	ColorSwitchCCValues,
	ConfigurationCCValues,
	type SetValueResult,
	SetValueStatus,
} from "@zwave-js/cc";
import {
	ConfigValueFormat,
	type ConfigurationMetadata,
	MessagePriority,
	type TranslatedValueID,
	type ValueDB,
	type ValueID,
	getCCName,
	parseBitMask,
} from "@zwave-js/core";
import { FunctionType, Message, MessageType } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";
import { roundTo } from "alcalzone-shared/math";

import type { Driver } from "../../driver/Driver.js";
import type { ZWaveController } from "../Controller.js";
import type { ControllerProprietaryCommon } from "../Proprietary.js";

export const FUNC_ID_NABUCASA = FunctionType.Proprietary_F0;

export enum NabuCasaCommand {
	GetSupportedCommands = 0x00,
	GetLED = 0x01,
	SetLED = 0x02,
	ReadGyro = 0x03,
	SetSystemIndication = 0x04,
	GetConfig = 0x05,
	SetConfig = 0x06,
	GetLEDBinary = 0x07,
	SetLEDBinary = 0x08,
	GetBootloaderInfo = 0x09,
}

/**
 * Capabilities of the Gecko Bootloader, mirroring the `BOOTLOADER_CAPABILITY_*`
 * definitions in the Simplicity SDK. The unlisted bits are unassigned.
 */
export enum NabuCasaBootloaderCapability {
	EnforceUpgradeSignature = 0,
	EnforceUpgradeEncryption = 1,
	EnforceSecureBoot = 2,
	BootloaderUpgrade = 4,
	GBL = 5,
	GBLSignature = 6,
	GBLEncryption = 7,
	EnforceCertificateSecureBoot = 8,
	RollbackProtection = 9,
	PeripheralList = 10,
	Storage = 16,
	Communication = 20,
	EM4GPIORetention = 21,
}

export interface NabuCasaBootloaderInfo {
	/** Bootloader version, formatted as `major.minor.customer` */
	version: string;
	capabilities: NabuCasaBootloaderCapability[];
}

export interface RGB {
	r: number;
	g: number;
	b: number;
}

export interface Vector {
	x: number;
	y: number;
	z: number;
}

export enum NabuCasaIndicationSeverity {
	None,
	Warning,
	Error,
}

export enum NabuCasaConfigKey {
	EnableTiltIndicator = 0,
}

const binarySwitchCurrentValue = BinarySwitchCCValues.currentValue.id;
const binarySwitchCurrentValueTranslated = {
	...binarySwitchCurrentValue,
	commandClassName: getCCName(binarySwitchCurrentValue.commandClass),
	propertyName: "Current value",
};
const binarySwitchTargetValue = BinarySwitchCCValues.targetValue.id;
const binarySwitchTargetValueTranslated = {
	...binarySwitchTargetValue,
	commandClassName: getCCName(binarySwitchTargetValue.commandClass),
	propertyName: "Target value",
};

const configEnableTiltIndicator = ConfigurationCCValues.paramInformation(
	NabuCasaConfigKey.EnableTiltIndicator,
).id;
const configEnableTiltIndicatorTranslated = {
	...configEnableTiltIndicator,
	commandClassName: getCCName(configEnableTiltIndicator.commandClass),
	propertyName: "enableTiltIndicator",
};
const configEnableTiltIndicatorMeta: ConfigurationMetadata = {
	type: "number",
	readable: true,
	writeable: true,
	min: 0,
	max: 1,
	allowManualEntry: false,
	default: 1,
	format: ConfigValueFormat.UnsignedInteger,
	label: "Enable Tilt Indicator",
	states: {
		0: "Disable",
		1: "Enable",
	},
	valueSize: 1,
};

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 2, b: 0 };

function parseGyro(msg: Message): Vector {
	// According to datasheet: 8g range => 977 µg/LSB
	const x = roundTo((msg.payload.readInt16BE(1) / 1024) * 9.77, 2);
	const y = roundTo((msg.payload.readInt16BE(3) / 1024) * 9.77, 2);
	const z = roundTo((msg.payload.readInt16BE(5) / 1024) * 9.77, 2);

	return { x, y, z };
}

export class ControllerProprietary_NabuCasa implements ControllerProprietaryCommon {
	constructor(driver: Driver, controller: ZWaveController) {
		this.driver = driver;
		this.controller = controller;
	}

	private driver: Driver;
	private controller: ZWaveController;
	private supportedCommands?: NabuCasaCommand[];
	private _bootloaderInfo?: NabuCasaBootloaderInfo;

	/** Information about the bootloader, read during the interview */
	public get bootloaderInfo(): NabuCasaBootloaderInfo | undefined {
		return this._bootloaderInfo;
	}

	public async interview(): Promise<void> {
		const valueDB = this.controller.valueDB;

		const supported = await this.getSupportedCommands();
		this.supportedCommands = supported;

		if (supported.includes(NabuCasaCommand.GetBootloaderInfo)) {
			this._bootloaderInfo ??= await this.getBootloaderInfo();
		}

		if (
			supported.includes(NabuCasaCommand.GetLEDBinary)
			|| supported.includes(NabuCasaCommand.GetLED)
		) {
			// Fake a binary switch for the LED
			valueDB.setMetadata(
				BinarySwitchCCValues.currentValue.id,
				BinarySwitchCCValues.currentValue.meta,
			);
			valueDB.setMetadata(
				BinarySwitchCCValues.targetValue.id,
				BinarySwitchCCValues.targetValue.meta,
			);

			// Clean up RGB values if they exist
			valueDB.setMetadata(ColorSwitchCCValues.currentColor.id, undefined);
			valueDB.removeValue(ColorSwitchCCValues.currentColor.id);

			valueDB.setMetadata(ColorSwitchCCValues.targetColor.id, undefined);
			valueDB.removeValue(ColorSwitchCCValues.targetColor.id);

			valueDB.setMetadata(ColorSwitchCCValues.hexColor.id, undefined);
			valueDB.removeValue(ColorSwitchCCValues.hexColor.id);

			valueDB.setMetadata(
				ColorSwitchCCValues.currentColorChannel(ColorComponent.Red).id,
				undefined,
			);
			valueDB.removeValue(
				ColorSwitchCCValues.currentColorChannel(ColorComponent.Red).id,
			);
			valueDB.setMetadata(
				ColorSwitchCCValues.currentColorChannel(ColorComponent.Green)
					.id,
				undefined,
			);
			valueDB.removeValue(
				ColorSwitchCCValues.currentColorChannel(ColorComponent.Green)
					.id,
			);
			valueDB.setMetadata(
				ColorSwitchCCValues.currentColorChannel(ColorComponent.Blue).id,
				undefined,
			);
			valueDB.removeValue(
				ColorSwitchCCValues.currentColorChannel(ColorComponent.Blue).id,
			);
		}

		if (supported.includes(NabuCasaCommand.GetLEDBinary)) {
			const state = await this.getLEDBinary();
			this.persistLEDState(valueDB, state);
		} else if (supported.includes(NabuCasaCommand.GetLED)) {
			const rgb = await this.getLED();
			this.persistRGBValue(valueDB, rgb);
		}

		if (supported.includes(NabuCasaCommand.GetConfig)) {
			const enableTiltIndicator = await this.getConfig(
				NabuCasaConfigKey.EnableTiltIndicator,
			);

			valueDB.setMetadata(
				configEnableTiltIndicator,
				configEnableTiltIndicatorMeta,
			);
			valueDB.setValue(configEnableTiltIndicator, enableTiltIndicator);
		}
	}

	private persistRGBValue(valueDB: ValueDB, rgb: RGB) {
		// Treat any other color than black as "on"
		valueDB.setValue(
			BinarySwitchCCValues.currentValue.id,
			rgb.r > BLACK.r || rgb.g > BLACK.g || rgb.b > BLACK.b,
		);
		valueDB.setValue(
			BinarySwitchCCValues.targetValue.id,
			rgb.r > BLACK.r || rgb.g > BLACK.g || rgb.b > BLACK.b,
		);
	}

	private persistLEDState(valueDB: ValueDB, state: boolean) {
		valueDB.setValue(BinarySwitchCCValues.currentValue.id, state);
		valueDB.setValue(BinarySwitchCCValues.targetValue.id, state);
	}

	public async getSupportedCommands(): Promise<NabuCasaCommand[]> {
		// HOST->ZW: NABU_CASA_CMD_SUPPORTED
		// ZW->HOST: NABU_CASA_CMD_SUPPORTED | supportedBitmask

		const getSupportedCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload: Bytes.from([NabuCasaCommand.GetSupportedCommands]),
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.GetSupportedCommands
				);
			},
		});

		const result = await this.driver.sendMessage(getSupportedCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const supported = result.payload.subarray(1);

		return parseBitMask(supported, NabuCasaCommand.GetSupportedCommands);
	}

	public async getLED(): Promise<RGB> {
		// HOST->ZW: NABU_CASA_LED_GET
		// ZW->HOST: NABU_CASA_LED_GET | r | g | b |

		const getLEDStateCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload: Bytes.from([NabuCasaCommand.GetLED]),
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.GetLED
				);
			},
		});

		const resultPromise = this.driver.sendMessage(getLEDStateCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const { payload: result } = await resultPromise;

		return {
			r: result[1],
			g: result[2],
			b: result[3],
		};
	}

	public async setLED(rgb: RGB): Promise<boolean> {
		// HOST->ZW: NABU_CASA_LED_SET | r | g | b | [ effect | [ speed ]]
		// ZW->HOST: NABU_CASA_LED_SET | success

		const payload = Bytes.from([
			NabuCasaCommand.SetLED,
			rgb.r,
			rgb.g,
			rgb.b,
			1, // SOLID
		]);

		const setLEDStateCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload,
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.SetLED
				);
			},
		});
		const result = await this.driver.sendMessage(setLEDStateCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const success = !!result.payload[1];

		return success;
	}

	public async getLEDBinary(): Promise<boolean> {
		// HOST->ZW: NABU_CASA_LED_GET_BINARY
		// ZW->HOST: NABU_CASA_LED_GET | state

		const getLEDStateCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload: Bytes.from([NabuCasaCommand.GetLEDBinary]),
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.GetLEDBinary
				);
			},
		});

		const resultPromise = this.driver.sendMessage(getLEDStateCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const { payload: result } = await resultPromise;

		return !!result[1]; // 0 = off, 1 = on
	}

	public async setLEDBinary(state: boolean): Promise<boolean> {
		// HOST->ZW: NABU_CASA_LED_SET | state
		// ZW->HOST: NABU_CASA_LED_SET | success

		const payload = Bytes.from([
			NabuCasaCommand.SetLEDBinary,
			state ? 0x01 : 0x00,
		]);

		const setLEDStateCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload,
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.SetLEDBinary
				);
			},
		});
		const result = await this.driver.sendMessage(setLEDStateCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const success = !!result.payload[1];

		return success;
	}

	public async readGyro(): Promise<Vector | undefined> {
		// HOST->ZW (REQ): NABU_CASA_GYRO_MEASURE
		// ZW->HOST (RES): NABU_CASA_GYRO_MEASURE | success
		// later
		// ZW->HOST (CB):  NABU_CASA_GYRO_MEASURE
		//           | accel_x (MSB) | accel_x (LSB)
		//           | accel_y (MSB) | accel_y (LSB)
		//           | accel_z (MSB) | accel_z (LSB)

		const readGyroCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload: Bytes.from([NabuCasaCommand.ReadGyro]),
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.ReadGyro
				);
			},
		});

		const callbackPromise = this.driver.waitForMessage((msg) => {
			return (
				msg.functionType === FUNC_ID_NABUCASA
				&& msg.type === MessageType.Request
				&& msg.payload[0] === NabuCasaCommand.ReadGyro
			);
		}, 1000);

		const response = await this.driver.sendMessage(readGyroCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		if (!response.payload[0]) {
			return;
		}

		const callback = await callbackPromise;

		// According to datasheet: 8g range => 977 µg/LSB
		return parseGyro(callback);
	}

	public async setSystemIndication(
		severity: NabuCasaIndicationSeverity,
	): Promise<boolean> {
		// HOST->ZW: NABU_CASA_SET_SYSTEM_INDICATION | severity
		// ZW->HOST: NABU_CASA_SET_SYSTEM_INDICATION | success

		const payload = Bytes.from([
			NabuCasaCommand.SetSystemIndication,
			severity,
		]);

		const systemIndicationCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload,
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.SetSystemIndication
				);
			},
		});
		const result = await this.driver.sendMessage(systemIndicationCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const success = !!result.payload[1];

		return success;
	}

	public async getConfig(key: NabuCasaConfigKey): Promise<number> {
		// HOST->ZW (REQ): NABU_CASA_CONFIG_GET | key
		// ZW->HOST (RES): NABU_CASA_CONFIG_GET | key | size | value...

		const payload = Bytes.from([NabuCasaCommand.GetConfig, key]);

		const getConfigCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload,
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.GetConfig
					&& msg.payload[1] === key
				);
			},
		});

		const resultPromise = this.driver.sendMessage(getConfigCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const { payload: result } = await resultPromise;

		const size = result[2];
		if (result.length > 3 + size) {
			// TODO: Decide what to do when the response is invalid
			return Number.NEGATIVE_INFINITY;
		} else {
			return result.readIntBE(3, size);
		}
	}

	public async setConfig(
		key: NabuCasaConfigKey,
		value: number,
	): Promise<boolean> {
		// HOST->ZW (REQ): NABU_CASA_CONFIG_SET | key | size | value...
		// ZW->HOST (RES): NABU_CASA_CONFIG_SET | success

		const payload = Bytes.from([
			NabuCasaCommand.SetConfig,
			key,
			// For now, only 1 byte is supported
			1,
			value,
		]);

		const setConfigCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload,
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.SetConfig
				);
			},
		});
		const result = await this.driver.sendMessage(setConfigCmd, {
			priority: MessagePriority.Controller,
			supportCheck: false,
		});
		const success = !!result.payload[1];

		return success;
	}

	public async getBootloaderVersion(): Promise<string | undefined> {
		if (
			!this.supportedCommands?.includes(NabuCasaCommand.GetBootloaderInfo)
		) {
			return undefined;
		}

		this._bootloaderInfo ??= await this.getBootloaderInfo();
		return this._bootloaderInfo.version;
	}

	public async getBootloaderInfo(): Promise<NabuCasaBootloaderInfo> {
		// HOST->ZW (REQ): NABU_CASA_BOOTLOADER_INFO
		// ZW->HOST (RES): NABU_CASA_BOOTLOADER_INFO | major | minor | customer | capabilities[4]

		const getBootloaderInfoCmd = new Message({
			type: MessageType.Request,
			functionType: FUNC_ID_NABUCASA,
			payload: Bytes.from([NabuCasaCommand.GetBootloaderInfo]),
			expectedResponse: (self, msg) => {
				return (
					msg.functionType === FUNC_ID_NABUCASA
					&& msg.type === MessageType.Response
					&& msg.payload[0] === NabuCasaCommand.GetBootloaderInfo
				);
			},
		});

		const { payload: result } = await this.driver.sendMessage(
			getBootloaderInfoCmd,
			{
				priority: MessagePriority.Controller,
				supportCheck: false,
			},
		);

		// The capabilities are transferred MSB first, but parseBitMask expects
		// the least significant byte first
		const capabilities = result.subarray(4, 8).toReversed();

		return {
			version: `${result[1]}.${result[2]}.${result[3]}`,
			capabilities: parseBitMask(capabilities, 0),
		};
	}

	public getDefinedValueIDs(): TranslatedValueID[] {
		// TODO: Make dynamic

		return [
			// LED: Binary Switch
			binarySwitchCurrentValueTranslated,
			binarySwitchTargetValueTranslated,
			// Configuration
			configEnableTiltIndicatorTranslated,
		];
	}

	public async pollValue(valueId: ValueID): Promise<unknown> {
		if (
			BinarySwitchCCValues.targetValue.is(valueId)
			|| BinarySwitchCCValues.currentValue.is(valueId)
		) {
			if (
				this.supportedCommands?.includes(NabuCasaCommand.GetLEDBinary)
			) {
				const state = await this.getLEDBinary();
				this.persistLEDState(this.controller.valueDB, state);
				return state;
			} else {
				// The binary LED command is not supported, fall back to the RGB variant
				const rgb = await this.getLED();
				this.persistRGBValue(this.controller.valueDB, rgb);
				return rgb;
			}
		}

		if (
			ConfigurationCCValues.paramInformation.is(valueId)
			&& valueId.propertyKey == undefined
		) {
			switch (valueId.property) {
				case NabuCasaConfigKey.EnableTiltIndicator:
					// OK
					break;
				default:
					return undefined;
			}

			const value = await this.getConfig(valueId.property);
			if (value != undefined) {
				this.controller.valueDB.setValue(valueId, value);
				return value;
			}
		}
	}

	public async setValue(
		valueId: ValueID,
		value: unknown,
	): Promise<SetValueResult> {
		if (
			BinarySwitchCCValues.targetValue.is(valueId)
			&& typeof value === "boolean"
		) {
			if (
				this.supportedCommands?.includes(NabuCasaCommand.SetLEDBinary)
			) {
				await this.setLEDBinary(value);
				this.persistLEDState(this.controller.valueDB, value);
				return { status: SetValueStatus.Success };
			} else {
				// The binary LED command is not supported, fall back to the RGB variant
				const rgb: RGB = value ? WHITE : BLACK;
				await this.setLED(rgb);
				this.persistRGBValue(this.controller.valueDB, rgb);
				return { status: SetValueStatus.Success };
			}
		}

		if (
			ConfigurationCCValues.paramInformation.is(valueId)
			&& valueId.propertyKey == undefined
			&& typeof value === "number"
			&& [NabuCasaConfigKey.EnableTiltIndicator].includes(
				valueId.property as any,
			)
		) {
			await this.setConfig(valueId.property as NabuCasaConfigKey, value);
			this.controller.valueDB.setValue(valueId, value);

			return { status: SetValueStatus.Success };
		}

		return { status: SetValueStatus.NoDeviceSupport };
	}

	async handleUnsolicited(_msg: Message): Promise<boolean> {
		// 	if (
		// 		msg.functionType === FUNC_ID_NABUCASA
		// 		&& msg.type === MessageType.Request
		// 	) {
		// 		const command = msg.payload[0];
		// 		if (
		// 			command === NabuCasaCommand.ReadGyro && msg.payload.length >= 7
		// 		) {
		// 			const gyro = parseGyro(msg);
		// 			this.persistGyroValues(this.controller.valueDB, gyro);
		// 			return true;
		// 		}
		// 	}
		return false;
	}
}
