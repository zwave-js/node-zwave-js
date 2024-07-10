import { num2hex } from "@zwave-js/shared/safe";

export interface MeterScaleDefinition {
	readonly label: string;
	readonly unit?: string;
}

export interface MeterScale extends MeterScaleDefinition {
	readonly key: number;
}

export type MeterScaleGroup = Record<number, MeterScaleDefinition>;

export interface MeterDefinition {
	readonly name: string;
	readonly scales: MeterScaleGroup;
}

export interface Meter extends MeterDefinition {
	readonly key: number;
}

export const meters = Object.freeze(
	{
		[0x01]: {
			name: "Electric",
			scales: {
				[0x00]: {
					label: "kWh",
					unit: "kWh",
				},
				[0x01]: {
					label: "kVAh",
					unit: "kVAh",
				},
				[0x02]: {
					label: "W",
					unit: "W",
				},
				[0x03]: {
					label: "Pulse count",
				},
				[0x04]: {
					label: "V",
					unit: "V",
				},
				[0x05]: {
					label: "A",
					unit: "A",
				},
				[0x06]: {
					label: "Power Factor",
				},
				[0x07]: {
					label: "kVar",
					unit: "kVar",
				},
				[0x08]: {
					label: "kVarh",
					unit: "kVarh",
				},
			},
		},
		[0x02]: {
			name: "Gas",
			scales: {
				[0x00]: {
					label: "Cubic meters",
					unit: "m³",
				},
				[0x01]: {
					label: "Cubic feet",
					unit: "ft³",
				},
				[0x03]: {
					label: "Pulse count",
				},
			},
		},
		[0x03]: {
			name: "Water",
			scales: {
				[0x00]: {
					label: "Cubic meters",
					unit: "m³",
				},
				[0x01]: {
					label: "Cubic feet",
					unit: "ft³",
				},
				[0x02]: {
					label: "US gallons",
					unit: "gal",
				},
				[0x03]: {
					label: "Pulse count",
				},
			},
		},
		[0x04]: {
			name: "Heating",
			scales: {
				[0x00]: {
					label: "kWh",
					unit: "kWh",
				},
			},
		},
		[0x05]: {
			name: "Cooling",
			scales: {
				[0x00]: {
					label: "kWh",
					unit: "kWh",
				},
			},
		},
	} as const satisfies Record<number, MeterDefinition>,
);
export type Meters = typeof meters;

/** Returns the meter definition for the given key */
export function getMeter<MeterType extends number>(
	type: MeterType,
): MeterType extends keyof Meters ? ({ key: MeterType } & (Meters[MeterType]))
	: (Meter | undefined)
{
	const meter: MeterDefinition | undefined = (meters as any)[type];
	// @ts-expect-error Undefined is valid if the meter type is not found
	if (!meter) return;

	return {
		key: type,
		...meter,
	} satisfies Meter as any;
}

/** Returns all meter definitions including their scales */
export function getAllMeters(): readonly Meter[] {
	return Object.entries(meters)
		.map(([key, value]) => ({ key: parseInt(key, 10), ...value }));
}

export function getMeterName(meterType: number): string {
	return getMeter(meterType)?.name
		?? `UNKNOWN (${num2hex(meterType)})`;
}

/** Returns a meter scale definition for the given meter type and scale key */
export function getMeterScale<
	MeterType extends number,
	ScaleKey extends number,
>(
	type: MeterType,
	scale: ScaleKey,
): MeterType extends keyof Meters
	? ScaleKey extends keyof Meters[MeterType]["scales"]
		? ({ key: ScaleKey } & (Meters[MeterType]["scales"][ScaleKey]))
	: (MeterScale | undefined)
	: (MeterScale | undefined)
{
	const meter = getMeter(type);
	// @ts-expect-error Undefined is valid if the meter is not found
	if (!meter) return;

	const scaleDef: MeterScaleDefinition | undefined =
		(meter?.scales as any)[scale];
	// @ts-expect-error Undefined is valid if the scale is not found
	if (!scaleDef) return;

	return {
		key: type,
		...scaleDef,
	} satisfies MeterScale as any;
}

/** Returns a meter scale definition for a scale that is not known */
export function getUnknownMeterScale(key: number): MeterScale {
	return {
		key,
		label: `Unknown (${num2hex(key)})`,
	};
}

/** Returns all scales of a given meter */
export function getAllMeterScales(
	meterType: number,
): readonly MeterScale[] | undefined {
	const meter = getMeter(meterType);
	if (!meter) return;

	return Object.entries(meter.scales)
		.map(([key, value]) => ({ key: parseInt(key, 10), ...value }));
}
