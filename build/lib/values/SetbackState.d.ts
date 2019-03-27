export declare type SetbackSpecialState = "Frost Protection" | "Energy Saving" | "Unused";
export declare const setbackSpecialStateValues: Record<SetbackSpecialState, number>;
export declare type SetbackState = number | SetbackSpecialState;
/** Encodes a setback state to use in a ThermostatSetbackCC */
export declare function encodeSetbackState(state: SetbackState): number;
/** Decodes a setback state used in a ThermostatSetbackCC */
export declare function decodeSetbackState(val: number): SetbackState | undefined;
