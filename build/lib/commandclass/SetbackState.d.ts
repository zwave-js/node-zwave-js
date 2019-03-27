export declare type SetbackSpecialState = "Frost Protection" | "Energy Saving" | "Unused";
export declare const setbackSpecialStateValues: Record<SetbackSpecialState, number>;
/** Encodes a setback state to use in a ThermostatSetbackCC */
export declare function encodeSetbackState(state: number | SetbackSpecialState): number;
/** Decodes a setback state used in a ThermostatSetbackCC */
export declare function decodeSetbackState(val: number): number | SetbackSpecialState | undefined;
