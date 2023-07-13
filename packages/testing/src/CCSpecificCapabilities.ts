import {
	type CommandClasses,
	type ConfigValue,
	type ConfigValueFormat,
} from "@zwave-js/core";

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

export interface NotificationCCCapabilities {
	supportsV1Alarm: false;
	notificationTypesAndEvents: Record<number, number[]>;
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
	// FIXME: This should be WindowCoveringParameter[], but that would introduce a dependency cycle
	supportedParameters: number[];
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
	// FIXME: This should be ThermostatMode[], but that would introduce a dependency cycle
	supportedModes: number[];
}

export type CCSpecificCapabilities = {
	[CommandClasses.Configuration]: ConfigurationCCCapabilities;
	[CommandClasses.Notification]: NotificationCCCapabilities;
	[121 /* Sound Switch */]: SoundSwitchCCCapabilities;
	[106 /* Window Covering */]: WindowCoveringCCCapabilities;
	[144 /* Energy Production */]: EnergyProductionCCCapabilities;
	[64 /* Thermostat Mode */]: ThermostatModeCCCapabilities;
};

export type CCIdToCapabilities<T extends CommandClasses = CommandClasses> =
	T extends keyof CCSpecificCapabilities ? CCSpecificCapabilities[T] : never;
