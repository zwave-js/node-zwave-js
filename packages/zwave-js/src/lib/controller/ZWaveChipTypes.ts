const chipTypes = Object.freeze({
	[0x0102]: "ZW0102",
	[0x0201]: "ZW0201",
	[0x0301]: "ZW0301",
	[0x0401]: "ZM0401 / ZM4102 / SD3402",
	[0x0500]: "ZW050x",
	[0x0700]: "EFR32ZG14 / ZGM130S",
});

export interface UnknownZWaveChipType {
	type: number;
	version: number;
}

export function getZWaveChipType(
	type: number,
	version: number,
): string | UnknownZWaveChipType {
	return (
		(chipTypes as any)[(type << 8) | version] ?? {
			type,
			version,
		}
	);
}

export function getChipTypeAndVersion(
	zWaveChipType: string,
): { type: number; version: number } | undefined {
	for (const [id, name] of Object.entries(chipTypes)) {
		if (name === zWaveChipType) {
			const idNum = parseInt(id);
			return {
				type: idNum >>> 8,
				version: idNum & 0xff,
			};
		}
	}
}
