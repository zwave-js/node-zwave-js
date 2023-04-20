export interface UnknownZWaveChipType {
    type: number;
    version: number;
}
export declare function getZWaveChipType(type: number, version: number): string | UnknownZWaveChipType;
export declare function getChipTypeAndVersion(zWaveChipType: string): {
    type: number;
    version: number;
} | undefined;
//# sourceMappingURL=ZWaveChipTypes.d.ts.map