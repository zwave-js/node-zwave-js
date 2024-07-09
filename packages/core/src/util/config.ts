export function tryParseParamNumber(str: string): {
	parameter: number;
	valueBitMask?: number;
} | undefined {
	const match = /^(\d+)(?:\[0x([0-9a-fA-F]+)\])?$/.exec(str);
	if (!match) return;

	const parameter = parseInt(match[1], 10);
	const valueBitMask = match[2] != undefined
		? parseInt(match[2], 16)
		: undefined;

	return {
		parameter,
		valueBitMask,
	};
}
