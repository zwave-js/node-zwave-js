import { type ValueType } from "../values/Metadata";

export enum Indicator {
	"Armed" = 0x01,
	"Not armed / disarmed" = 0x02,
	"Ready" = 0x03,
	"Fault" = 0x04,
	"Busy" = 0x05,
	"Enter ID" = 0x06,
	"Enter PIN" = 0x07,
	"Code accepted" = 0x08,
	"Code not accepted" = 0x09,
	"Armed Stay" = 0x0a,
	"Armed Away" = 0x0b,
	"Alarming" = 0x0c,
	"Alarming: Burglar" = 0x0d,
	"Alarming: Smoke / Fire" = 0x0e,
	"Alarming: Carbon Monoxide" = 0x0f,
	"Bypass challenge" = 0x10,
	"Entry Delay" = 0x11,
	"Exit Delay" = 0x12,
	"Alarming: Medical" = 0x13,
	"Alarming: Freeze warning" = 0x14,
	"Alarming: Water leak" = 0x15,
	"Alarming: Panic" = 0x16,
	"Zone 1 armed" = 0x20,
	"Zone 2 armed" = 0x21,
	"Zone 3 armed" = 0x22,
	"Zone 4 armed" = 0x23,
	"Zone 5 armed" = 0x24,
	"Zone 6 armed" = 0x25,
	"Zone 7 armed" = 0x26,
	"Zone 8 armed" = 0x27,
	"LCD backlight" = 0x30,
	"Button backlight letters" = 0x40,
	"Button backlight digits" = 0x41,
	"Button backlight command" = 0x42,
	"Button 1 indication" = 0x43,
	"Button 2 indication" = 0x44,
	"Button 3 indication" = 0x45,
	"Button 4 indication" = 0x46,
	"Button 5 indication" = 0x47,
	"Button 6 indication" = 0x48,
	"Button 7 indication" = 0x49,
	"Button 8 indication" = 0x4a,
	"Button 9 indication" = 0x4b,
	"Button 10 indication" = 0x4c,
	"Button 11 indication" = 0x4d,
	"Button 12 indication" = 0x4e,
	"Node Identify" = 0x50,
	"Generic event sound notification 1" = 0x60,
	"Generic event sound notification 2" = 0x61,
	"Generic event sound notification 3" = 0x62,
	"Generic event sound notification 4" = 0x63,
	"Generic event sound notification 5" = 0x64,
	"Generic event sound notification 6" = 0x65,
	"Generic event sound notification 7" = 0x66,
	"Generic event sound notification 8" = 0x67,
	"Generic event sound notification 9" = 0x68,
	"Generic event sound notification 10" = 0x69,
	"Generic event sound notification 11" = 0x6a,
	"Generic event sound notification 12" = 0x6b,
	"Generic event sound notification 13" = 0x6c,
	"Generic event sound notification 14" = 0x6d,
	"Generic event sound notification 15" = 0x6e,
	"Generic event sound notification 16" = 0x6f,
	"Generic event sound notification 17" = 0x70,
	"Generic event sound notification 18" = 0x71,
	"Generic event sound notification 19" = 0x72,
	"Generic event sound notification 20" = 0x73,
	"Generic event sound notification 21" = 0x74,
	"Generic event sound notification 22" = 0x75,
	"Generic event sound notification 23" = 0x76,
	"Generic event sound notification 24" = 0x77,
	"Generic event sound notification 25" = 0x78,
	"Generic event sound notification 26" = 0x79,
	"Generic event sound notification 27" = 0x7a,
	"Generic event sound notification 28" = 0x7b,
	"Generic event sound notification 29" = 0x7c,
	"Generic event sound notification 30" = 0x7d,
	"Generic event sound notification 31" = 0x7e,
	"Generic event sound notification 32" = 0x7f,
	"Manufacturer defined 1" = 0x80,
	"Manufacturer defined 2" = 0x81,
	"Manufacturer defined 3" = 0x82,
	"Manufacturer defined 4" = 0x83,
	"Manufacturer defined 5" = 0x84,
	"Manufacturer defined 6" = 0x85,
	"Manufacturer defined 7" = 0x86,
	"Manufacturer defined 8" = 0x87,
	"Manufacturer defined 9" = 0x88,
	"Manufacturer defined 10" = 0x89,
	"Manufacturer defined 11" = 0x8a,
	"Manufacturer defined 12" = 0x8b,
	"Manufacturer defined 13" = 0x8c,
	"Manufacturer defined 14" = 0x8d,
	"Manufacturer defined 15" = 0x8e,
	"Manufacturer defined 16" = 0x8f,
	"Manufacturer defined 17" = 0x90,
	"Manufacturer defined 18" = 0x91,
	"Manufacturer defined 19" = 0x92,
	"Manufacturer defined 20" = 0x93,
	"Manufacturer defined 21" = 0x94,
	"Manufacturer defined 22" = 0x95,
	"Manufacturer defined 23" = 0x96,
	"Manufacturer defined 24" = 0x97,
	"Manufacturer defined 25" = 0x98,
	"Manufacturer defined 26" = 0x99,
	"Manufacturer defined 27" = 0x9a,
	"Manufacturer defined 28" = 0x9b,
	"Manufacturer defined 29" = 0x9c,
	"Manufacturer defined 30" = 0x9d,
	"Manufacturer defined 31" = 0x9e,
	"Manufacturer defined 32" = 0x9f,
	"Buzzer" = 0xf0,
}

export interface IndicatorPropertyDefinition {
	readonly label: string;
	readonly description?: string;
	readonly min?: number;
	readonly max?: number;
	readonly readonly?: boolean;
	readonly type?: ValueType;
}

export interface IndicatorProperty extends IndicatorPropertyDefinition {
	readonly id: number;
}

const indicatorProperties = Object.freeze(
	{
		[0x01]: {
			label: "Multilevel",
		},
		[0x02]: {
			label: "Binary",
			type: "boolean",
		},
		[0x03]: {
			label: "On/Off Period: Duration",
			description:
				"Sets the duration of an on/off period in 1/10th seconds. Must be set together with \"On/Off Cycle Count\"",
		},
		[0x04]: {
			label: "On/Off Cycle Count",
			description:
				"Sets the number of on/off periods. 0xff means infinite. Must be set together with \"On/Off Period duration\"",
		},
		[0x05]: {
			label: "On/Off Period: On time",
			description:
				"This property is used to set the length of the On time during an On/Off period. It allows asymmetric On/Off periods. The value 0x00 MUST represent symmetric On/Off period (On time equal to Off time)",
		},
		[0x0a]: {
			label: "Timeout: Hours",
			description:
				"Turns the indicator of after this amount of hours. Can be used together with other timeout properties",
		},
		[0x06]: {
			label: "Timeout: Minutes",
			description:
				"Turns the indicator of after this amount of minutes. Can be used together with other timeout properties",
		},
		[0x07]: {
			label: "Timeout: Seconds",
			description:
				"Turns the indicator of after this amount of seconds. Can be used together with other timeout properties",
		},
		[0x08]: {
			label: "Timeout: 1/100th seconds",
			description:
				"Turns the indicator of after this amount of 1/100th seconds. Can be used together with other timeout properties",
		},
		[0x09]: {
			label: "Sound level",
			description:
				"This property is used to set the volume of a indicator. 0 means off/mute.",
			max: 100,
		},
		[0x10]: {
			label: "Low power",
			description:
				"This property MAY be used to by a supporting node advertise that the indicator can continue working in sleep mode.",
			readonly: true,
			type: "boolean",
		},
	} as const satisfies Record<number, IndicatorPropertyDefinition>,
);
export type IndicatorProperties = typeof indicatorProperties;

/** Returns the indicator property definition for the given id */
export function getIndicatorProperty<ID extends number>(
	id: ID,
): ID extends keyof IndicatorProperties
	? ({ id: ID } & (IndicatorProperties[ID]))
	: (IndicatorProperty | undefined)
{
	const property: IndicatorPropertyDefinition | undefined =
		(indicatorProperties as any)[id];
	// @ts-expect-error Undefined is valid if the property is not found
	if (!property) return;

	return {
		id,
		...property,
	} satisfies IndicatorProperty as any;
}

/** Returns all defined indicator properties */
export function getAllIndicatorProperties(): readonly IndicatorProperty[] {
	return Object.entries(indicatorProperties)
		.map(([id, value]) => ({ id: parseInt(id, 10), ...value }));
}
