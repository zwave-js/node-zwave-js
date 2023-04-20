/// <reference types="node" />
import type { SetbackSpecialState, SetbackState, Switchpoint, Timezone } from "./_Types";
export declare const setbackSpecialStateValues: Record<SetbackSpecialState, number>;
/**
 * @publicAPI
 * Encodes a setback state to use in a ThermostatSetbackCC
 */
export declare function encodeSetbackState(state: SetbackState): number;
/**
 * @publicAPI
 * Decodes a setback state used in a ThermostatSetbackCC
 */
export declare function decodeSetbackState(val: number): SetbackState | undefined;
/**
 * @publicAPI
 * Decodes a switch point used in a ClimateControlScheduleCC
 */
export declare function decodeSwitchpoint(data: Buffer): Switchpoint;
/**
 * @publicAPI
 * Encodes a switch point to use in a ClimateControlScheduleCC
 */
export declare function encodeSwitchpoint(point: Switchpoint): Buffer;
/**
 * @publicAPI
 * Decodes timezone information used in time related CCs
 */
export declare function parseTimezone(data: Buffer): Timezone;
/**
 * @publicAPI
 * Decodes timezone information used in time related CCs
 */
export declare function encodeTimezone(tz: Timezone): Buffer;
//# sourceMappingURL=serializers.d.ts.map