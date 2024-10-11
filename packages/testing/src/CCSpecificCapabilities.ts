import type {
	ColorComponent,
	KeypadMode,
	SwitchType,
	ThermostatMode,
	ThermostatSetpointType,
	UserIDStatus,
	WindowCoveringParameter,
} from "@zwave-js/cc";
import type {
	CommandClasses,
	ConfigValue,
	ConfigValueFormat,
	MaybeUnknown,
} from "@zwave-js/core";

export interface BinarySensorCCCapabilities {
	supportedSensorTypes: number[];
	getValue?: (sensorType: number | undefined) => boolean | undefined;
}

export interface BinarySwitchCCCapabilities {
	defaultValue?: MaybeUnknown<boolean>;
}

export interface ConfigurationCCCapabilities {
	// We don't have bulk support implemented in the mocks
	bulkSupport?: false;

	parameters: {
		"#": number;
		valueSize: number;
		name?: string;
		info?: string;
		format?: ConfigValueFormat;
		minValue?: ConfigValue;
		maxValue?: ConfigValue;
		defaultValue?: ConfigValue;
		readonly?: boolean;
		isAdvanced?: boolean;
		altersCapabilities?: boolean;
	}[];
}

export interface ColorSwitchCCCapabilities {
	/** Supported colors and their default values */
	colorComponents: Partial<Record<ColorComponent, number | undefined>>;
}

export interface NotificationCCCapabilities {
	supportsV1Alarm: boolean;
	notificationTypesAndEvents: Record<number, number[]>;
}

export interface MeterCCCapabilities {
	meterType: number;
	supportedScales: number[];
	supportedRateTypes: number[];
	supportsReset: boolean;
	getValue?: (
		scale: number,
		rateType: number,
	) => number | {
		value: number;
		deltaTime: number;
		prevValue?: number;
	} | undefined;
	onReset?: (
		options?: {
			scale: number;
			rateType: number;
			targetValue: number;
		},
	) => void;
}

export interface MultilevelSensorCCCapabilities {
	sensors: Record<number, {
		supportedScales: number[];
	}>;
	getValue?: (
		sensorType: number | undefined,
		scale: number | undefined,
	) => number | undefined;
}

export interface MultilevelSwitchCCCapabilities {
	defaultValue?: MaybeUnknown<number>;
	primarySwitchType: SwitchType;
}

export interface SoundSwitchCCCapabilities {
	defaultToneId: number;
	defaultVolume: number;
	tones: {
		name: string;
		duration: number;
	}[];
}

export interface WindowCoveringCCCapabilities {
	supportedParameters: WindowCoveringParameter[];
}

export interface EnergyProductionCCCapabilities {
	values: {
		Power: {
			value: number;
			scale: 0;
		};
		"Production Total": {
			value: number;
			scale: 0;
		};
		"Production Today": {
			value: number;
			scale: 0;
		};
		"Total Time": {
			value: number;
			scale: 0 | 1;
		};
	};
}

export interface ThermostatModeCCCapabilities {
	supportedModes: ThermostatMode[];
}

export interface ThermostatSetpointCCCapabilities {
	setpoints: Partial<
		Record<
			ThermostatSetpointType,
			{
				minValue: number;
				maxValue: number;
				defaultValue?: number;
				scale: "°C" | "°F";
			}
		>
	>;
}

export interface UserCodeCCCapabilities {
	numUsers: number;
	supportsAdminCode?: boolean;
	supportsAdminCodeDeactivation?: boolean;
	supportsUserCodeChecksum?: boolean;
	// Not implemented in mocks:
	// supportsMultipleUserCodeReport?: boolean;
	// supportsMultipleUserCodeSet?: boolean;
	supportedUserIDStatuses?: UserIDStatus[];
	supportedKeypadModes?: KeypadMode[];
	supportedASCIIChars?: string;
}

export interface ScheduleEntryLockCCCapabilities {
	numWeekDaySlots: number;
	numYearDaySlots: number;
	numDailyRepeatingSlots: number;
}

export type CCSpecificCapabilities = {
	[CommandClasses.Configuration]: ConfigurationCCCapabilities;
	[CommandClasses.Notification]: NotificationCCCapabilities;
	[48 /* Binary Sensor */]: BinarySensorCCCapabilities;
	[0x25 /* Binary Switch */]: BinarySwitchCCCapabilities;
	[49 /* Multilevel Sensor */]: MultilevelSensorCCCapabilities;
	[0x26 /* Multilevel Switch */]: MultilevelSwitchCCCapabilities;
	[51 /* Color Switch */]: ColorSwitchCCCapabilities;
	[121 /* Sound Switch */]: SoundSwitchCCCapabilities;
	[106 /* Window Covering */]: WindowCoveringCCCapabilities;
	[144 /* Energy Production */]: EnergyProductionCCCapabilities;
	[64 /* Thermostat Mode */]: ThermostatModeCCCapabilities;
	[67 /* Thermostat Setpoint */]: ThermostatSetpointCCCapabilities;
	[99 /* User Code */]: UserCodeCCCapabilities;
	[78 /* Schedule Entry Lock */]: ScheduleEntryLockCCCapabilities;
	[CommandClasses.Meter]: MeterCCCapabilities;
};

export type CCIdToCapabilities<T extends CommandClasses = CommandClasses> =
	T extends keyof CCSpecificCapabilities ? CCSpecificCapabilities[T] : never;
