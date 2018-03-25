// This is just an interface, nothing to test!
/* istanbul ignore next */

/**
 * Represents a ZWave-Frame
 */
export interface Frame {

	/** Serializes this frame into a Buffer */
	serialize(): Buffer;
	/** 
	 * Deserializes a frame of this type from a Buffer 
	 * @returns must return the total number of bytes read
	 */
	deserialize(data: Buffer): number;

}
