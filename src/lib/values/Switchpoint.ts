import { decodeSetbackState, encodeSetbackState, SetbackState } from "./SetbackState";

export interface Switchpoint {
	hour: number;
	minute: number;
	state: SetbackState;
}

export function decodeSwitchpoint(data: Buffer): Switchpoint {
	return {
		hour: data[0] & 0b000_11111,
		minute: data[1] & 0b00_111111,
		state: decodeSetbackState(data[2]),
	};
}

export function encodeSwitchpoint(point: Switchpoint) {
	return Buffer.from([
		point.hour & 0b000_11111,
		point.minute & 0b00_111111,
		encodeSetbackState(point.state),
	]);
}
