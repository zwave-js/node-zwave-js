/// <reference types="node" />
import { FragmentType, ObjectType } from "./consts";
export interface NVM3Object {
    type: ObjectType;
    fragmentType: FragmentType;
    key: number;
    data?: Buffer;
}
export declare function readObject(buffer: Buffer, offset: number): {
    object: NVM3Object;
    bytesRead: number;
} | undefined;
export declare function readObjects(buffer: Buffer): {
    objects: NVM3Object[];
    bytesRead: number;
};
export declare function writeObject(obj: NVM3Object): Buffer;
export declare function fragmentLargeObject(obj: NVM3Object & {
    type: ObjectType.DataLarge | ObjectType.CounterLarge;
}, maxFirstFragmentSizeWithHeader: number, maxFragmentSizeWithHeader: number): NVM3Object[];
/**
 * Takes the raw list of objects from the pages ring buffer and compresses
 * them so that each object is only stored once.
 */
export declare function compressObjects(objects: NVM3Object[]): Map<number, NVM3Object>;
//# sourceMappingURL=object.d.ts.map