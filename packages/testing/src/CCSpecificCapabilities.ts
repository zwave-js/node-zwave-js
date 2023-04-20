import { CommandClasses } from "@zwave-js/core";

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

export type CCSpecificCapabilities = {
	[CommandClasses.Notification]: NotificationCCCapabilities;
	[121 /* Sound Switch */]: SoundSwitchCCCapabilities;
	[106 /* Window Covering */]: WindowCoveringCCCapabilities;
};

export type CCIdToCapabilities<T extends CommandClasses = CommandClasses> =
	T extends keyof CCSpecificCapabilities ? CCSpecificCapabilities[T] : never;
