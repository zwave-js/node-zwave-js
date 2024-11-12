/** A portable version of Node.js's Buffer that is more compatible with the native Uint8Array */

import {
	type TypedArray,
	areUint8ArraysEqual,
	concatUint8Arrays,
	hexToUint8Array,
	includes,
	isUint8ArrayOrArrayBuffer,
	stringToUint8Array,
	uint8ArrayToBase64,
	uint8ArrayToHex,
	uint8ArrayToString,
} from "./uint8array-extras.js";

/** An almost drop-in replacement for the Node.js Buffer class that's compatible with the native Uint8Array */
// See https://sindresorhus.com/blog/goodbye-nodejs-buffer for background
export class Bytes extends Uint8Array {
	/** Returns `true` if both `buf` and `other` have exactly the same bytes,`false` otherwise. Equivalent to `buf.compare(otherBuffer) === 0`. */
	public equals(other: Uint8Array): boolean {
		return areUint8ArraysEqual(this, other);
	}

	/**
	Convert a value to a `Buffer` without copying its data.

	This can be useful for converting a Node.js `Buffer` to a portable `Buffer` instance. The Node.js `Buffer` is already an `Uint8Array` subclass, but [it alters some behavior](https://sindresorhus.com/blog/goodbye-nodejs-buffer), so it can be useful to cast it to a pure `Uint8Array` or portable `Buffer` before returning it.

	Tip: If you want a copy, just call `.slice()` on the return value.
	*/
	public static view(
		value: TypedArray | ArrayBuffer | DataView,
	): Bytes {
		if (value instanceof ArrayBuffer) {
			return new this(value);
		}

		if (ArrayBuffer.isView(value)) {
			return new this(value.buffer, value.byteOffset, value.byteLength);
		}

		throw new TypeError(`Unsupported value, got \`${typeof value}\`.`);
	}

	public static from(
		data: Uint8Array | ArrayBuffer | ArrayLike<number> | Iterable<number>,
	): Bytes;

	/**
	 * Creates a new Buffer containing the given JavaScript string {str}.
	 * If provided, the {encoding} parameter identifies the character encoding.
	 * If not provided, {encoding} defaults to 'utf8'.
	 */
	public static from(data: string, encoding?: BufferEncoding): Bytes;

	public static from(
		arrayLike: Iterable<number>,
		mapfn?: (v: number, k: number) => number,
		thisArg?: any,
	): Bytes;

	public static from(
		data:
			| string
			| Uint8Array
			| ArrayBuffer
			| ArrayLike<number>
			| Iterable<number>,
		encodingOrMapfn?: BufferEncoding | ((v: number, k: number) => number),
		thisArg?: any,
	): Bytes {
		if (typeof data === "string") {
			const encoding = encodingOrMapfn as BufferEncoding | undefined;
			switch (encoding) {
				case "ascii":
				case "utf-8":
				case "utf8":
				case undefined:
					return Bytes.view(stringToUint8Array(data));
				case "hex":
					return Bytes.view(hexToUint8Array(data));
			}

			throw new Error(`Unsupported encoding: ${encoding}`);
		} else if (isUint8ArrayOrArrayBuffer(data)) {
			// .from copies!
			return new Bytes(data);
		} else if ("length" in data) {
			return Bytes.view(super.from(data));
		} else {
			return Bytes.view(
				super.from(data, encodingOrMapfn as any, thisArg),
			);
		}
	}

	/**
	 * Allocates a new `Buffer` of `size` bytes. If `fill` is `undefined`, the`Buffer` will be zero-filled.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.alloc(5);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 00 00 00 00 00>
	 * ```
	 *
	 * If `size` is larger than {@link constants.MAX_LENGTH} or smaller than 0, `ERR_OUT_OF_RANGE` is thrown.
	 *
	 * If `fill` is specified, the allocated `Buffer` will be initialized by calling `buf.fill(fill)`.
	 *
	 * A `TypeError` will be thrown if `size` is not a number.
	 * @since v5.10.0
	 * @param size The desired length of the new `Buffer`.
	 * @param [fill=0] A value to pre-fill the new `Buffer` with.
	 * @param [encoding='utf8'] If `fill` is a string, this is its encoding.
	 */
	public static alloc(size: number, fill?: number): Bytes {
		const ret = new Bytes(size);
		if (fill !== undefined) {
			ret.fill(fill);
		}
		return ret;
	}

	public toString(encoding: BufferEncoding = "utf8"): string {
		switch (encoding) {
			case "hex":
				return uint8ArrayToHex(this);
			case "base64":
				return uint8ArrayToBase64(this);
			case "base64url":
				return uint8ArrayToBase64(this, { urlSafe: true });
			case "ucs-2":
			case "ucs2":
			case "utf16le":
				return uint8ArrayToString(this, "utf-16le");
			case "ascii":
			case "latin1":
			case "binary":
			// For TextDecoder, these are aliases for "windows-1252"
			// which is not supported with small-icu or without ICU.
			// When dealing with actual ASCII data, there is no difference
			// to simply using "utf8" instead.
			default:
				return uint8ArrayToString(this, "utf-8");
		}
	}

	public subarray(start?: number, end?: number): Bytes {
		return Bytes.view(super.subarray(start, end));
	}

	/**
	 * Equivalent to `buf.indexOf() !== -1`.
	 *
	 * @since v5.3.0
	 * @param value What to search for.
	 * @param [byteOffset=0] Where to begin searching in `buf`. If negative, then offset is calculated from the end of `buf`.
	 * @param [encoding='utf8'] If `value` is a string, this is its encoding.
	 * @return `true` if `value` was found in `buf`, `false` otherwise.
	 */
	includes(
		value: number | Bytes,
		byteOffset: number = 0,
	): boolean {
		if (typeof value === "number") {
			return super.includes(value, byteOffset);
		} else if (byteOffset) {
			return includes(this.subarray(byteOffset), value);
		} else {
			return includes(this, value);
		}
	}

	// /**
	//  * Returns `true` if `obj` is a `Buffer`, `false` otherwise.
	//  *
	//  * ```js
	//  * import { Buffer } from 'node:buffer';
	//  *
	//  * Buffer.isBuffer(Buffer.alloc(10)); // true
	//  * Buffer.isBuffer(Buffer.from('foo')); // true
	//  * Buffer.isBuffer('a string'); // false
	//  * Buffer.isBuffer([]); // false
	//  * Buffer.isBuffer(new Uint8Array(1024)); // false
	//  * ```
	//  * @since v0.1.101
	//  */
	// public static isBuffer(obj: any): obj is Buffer {
	// 	return obj && obj instanceof Buffer;
	// }

	/**
	 * Returns a new `Buffer` which is the result of concatenating all the `Buffer` instances in the `list` together.
	 *
	 * If the list has no items, or if the `totalLength` is 0, then a new zero-length `Buffer` is returned.
	 *
	 * If `totalLength` is not provided, it is calculated from the `Buffer` instances
	 * in `list` by adding their lengths.
	 *
	 * If `totalLength` is provided, it is coerced to an unsigned integer. If the
	 * combined length of the `Buffer`s in `list` exceeds `totalLength`, the result is
	 * truncated to `totalLength`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * // Create a single `Buffer` from a list of three `Buffer` instances.
	 *
	 * const buf1 = Buffer.alloc(10);
	 * const buf2 = Buffer.alloc(14);
	 * const buf3 = Buffer.alloc(18);
	 * const totalLength = buf1.length + buf2.length + buf3.length;
	 *
	 * console.log(totalLength);
	 * // Prints: 42
	 *
	 * const bufA = Buffer.concat([buf1, buf2, buf3], totalLength);
	 *
	 * console.log(bufA);
	 * // Prints: <Buffer 00 00 00 00 ...>
	 * console.log(bufA.length);
	 * // Prints: 42
	 * ```
	 *
	 * `Buffer.concat()` may also use the internal `Buffer` pool like `new Buffer()` does.
	 * @since v0.7.11
	 * @param list List of `Buffer` or {@link Uint8Array} instances to concatenate.
	 * @param totalLength Total length of the `Buffer` instances in `list` when concatenated.
	 */
	public static concat(
		list: readonly (Uint8Array | ArrayLike<number>)[],
		totalLength?: number,
	): Bytes {
		return Bytes.view(concatUint8Arrays(list, totalLength));
	}

	private getDataView(): DataView {
		return new DataView(this.buffer, this.byteOffset, this.byteLength);
	}

	/**
	 * Writes `value` to `buf` at the specified `offset` as big-endian.
	 *
	 * `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(8);
	 *
	 * buf.writeBigInt64BE(0x0102030405060708n, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 01 02 03 04 05 06 07 08>
	 * ```
	 * @since v12.0.0, v10.20.0
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy: `0 <= offset <= buf.length - 8`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeBigInt64BE(value: bigint, offset: number = 0): number {
		const view = this.getDataView();
		view.setBigInt64(offset, value, false);
		return offset + 8;
	}

	/**
	 * Writes `value` to `buf` at the specified `offset` as little-endian.
	 *
	 * `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(8);
	 *
	 * buf.writeBigInt64LE(0x0102030405060708n, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 08 07 06 05 04 03 02 01>
	 * ```
	 * @since v12.0.0, v10.20.0
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy: `0 <= offset <= buf.length - 8`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeBigInt64LE(value: bigint, offset: number = 0): number {
		const view = this.getDataView();
		view.setBigInt64(offset, value, true);
		return offset + 8;
	}

	/**
	 * Writes `value` to `buf` at the specified `offset` as big-endian.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(8);
	 *
	 * buf.writeBigUInt64BE(0xdecafafecacefaden, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer de ca fa fe ca ce fa de>
	 * ```
	 * @since v12.0.0, v10.20.0
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy: `0 <= offset <= buf.length - 8`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeBigUInt64BE(value: bigint, offset: number = 0): number {
		const view = this.getDataView();
		view.setBigUint64(offset, value, false);
		return offset + 8;
	}

	/**
	 * Writes `value` to `buf` at the specified `offset` as little-endian
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(8);
	 *
	 * buf.writeBigUInt64LE(0xdecafafecacefaden, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer de fa ce ca fe fa ca de>
	 * ```
	 *
	 * @since v12.0.0, v10.20.0
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy: `0 <= offset <= buf.length - 8`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeBigUInt64LE(value: bigint, offset: number = 0): number {
		const view = this.getDataView();
		view.setBigUint64(offset, value, true);
		return offset + 8;
	}

	/**
	 * Writes `byteLength` bytes of `value` to `buf` at the specified `offset`as little-endian. Supports up to 48 bits of accuracy. Behavior is undefined
	 * when `value` is anything other than an unsigned integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(6);
	 *
	 * buf.writeUIntLE(0x1234567890ab, 0, 6);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer ab 90 78 56 34 12>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param offset Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to write. Must satisfy `0 < byteLength <= 6`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUIntLE(value: number, offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.writeUInt8(value, offset);
			case 2:
				return this.writeUInt16LE(value, offset);
			case 3: {
				let ret = this.writeUInt16LE(value & 0xffff, offset);
				ret = this.writeUInt8(value >>> 16, ret);
				return ret;
			}
			case 4:
				return this.writeUInt32LE(value, offset);

			// Numbers > 32 bit need to be converted to BigInt for the bitwise operations to work
			case 5: {
				const big = BigInt(value);
				const low = Number(big & 0xffffffffn);
				const high = Number(big >> 32n);
				let ret = this.writeUInt32LE(low, offset);
				ret = this.writeUInt8(high, ret);
				return ret;
			}
			case 6: {
				const big = BigInt(value);
				const low = Number(big & 0xffffffffn);
				const high = Number(big >> 32n);
				let ret = this.writeUInt32LE(low, offset);
				ret = this.writeUInt16LE(high, ret);
				return ret;
			}
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Writes `byteLength` bytes of `value` to `buf` at the specified `offset`as big-endian. Supports up to 64 bits of accuracy. Behavior is undefined
	 * when `value` is anything other than an unsigned integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(6);
	 *
	 * buf.writeUIntBE(0x1234567890ab, 0, 6);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 12 34 56 78 90 ab>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param offset Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to write. Must satisfy `0 < byteLength <= 8`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUIntBE(value: number, offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.writeUInt8(value, offset);
			case 2:
				return this.writeUInt16BE(value, offset);
			case 3: {
				let ret = this.writeUInt16BE(value >> 8, offset);
				ret = this.writeUInt8(value & 0xff, ret);
				return ret;
			}
			case 4:
				return this.writeUInt32BE(value, offset);

			// Numbers > 32 bit need to be converted to BigInt for the bitwise operations to work
			case 5: {
				const big = BigInt(value);
				const high = Number(big >> 8n);
				const low = Number(big & 0xffn);
				let ret = this.writeUInt32BE(high, offset);
				ret = this.writeUInt8(low, ret);
				return ret;
			}
			case 6: {
				const big = BigInt(value);
				const high = Number(big >> 16n);
				const low = Number(big & 0xffffn);
				let ret = this.writeUInt32BE(high, offset);
				ret = this.writeUInt16BE(low, ret);
				return ret;
			}
			case 7: {
				const big = BigInt(value);
				const high = Number(big >> 24n);
				const mid = Number((big >> 8n) & 0xffffn);
				const low = Number(big & 0xffn);
				let ret = this.writeUInt32BE(high, offset);
				ret = this.writeUInt16BE(mid, ret);
				ret = this.writeUInt8(low, ret);
				return ret;
			}
			case 8: {
				const ret = this.writeBigUInt64BE(BigInt(value), offset);
				return ret;
			}
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Writes `byteLength` bytes of `value` to `buf` at the specified `offset`as little-endian. Supports up to 48 bits of accuracy. Behavior is undefined
	 * when `value` is anything other than a signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(6);
	 *
	 * buf.writeIntLE(0x1234567890ab, 0, 6);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer ab 90 78 56 34 12>
	 * ```
	 * @since v0.11.15
	 * @param value Number to be written to `buf`.
	 * @param offset Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to write. Must satisfy `0 < byteLength <= 6`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeIntLE(value: number, offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.writeInt8(value, offset);
			case 2:
				return this.writeInt16LE(value, offset);
			case 3: {
				let ret = this.writeInt16LE(value & 0xffff, offset);
				ret = this.writeInt8(value >> 16, ret);
				return ret;
			}
			case 4:
				return this.writeInt32LE(value, offset);

			case 5:
			case 6:
				throw new RangeError(
					`writeIntLE is currently not implemented for byteLength ${byteLength}`,
				);
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Writes `byteLength` bytes of `value` to `buf` at the specified `offset`as big-endian. Supports up to 48 bits of accuracy. Behavior is undefined when`value` is anything other than a
	 * signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(6);
	 *
	 * buf.writeIntBE(0x1234567890ab, 0, 6);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 12 34 56 78 90 ab>
	 * ```
	 * @since v0.11.15
	 * @param value Number to be written to `buf`.
	 * @param offset Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to write. Must satisfy `0 < byteLength <= 6`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeIntBE(value: number, offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.writeInt8(value, offset);
			case 2:
				return this.writeInt16BE(value, offset);
			case 3: {
				let ret = this.writeInt8(value >> 16, offset);
				ret = this.writeInt16BE(value & 0xffff, ret);
				return ret;
			}
			case 4:
				return this.writeInt32BE(value, offset);

			case 5:
			case 6:
				throw new RangeError(
					`writeIntBE is currently not implemented for byteLength ${byteLength}`,
				);
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}

	/**
	 * Writes `value` to `buf` at the specified `offset`. `value` must be a
	 * valid unsigned 8-bit integer. Behavior is undefined when `value` is anything
	 * other than an unsigned 8-bit integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeUInt8(0x3, 0);
	 * buf.writeUInt8(0x4, 1);
	 * buf.writeUInt8(0x23, 2);
	 * buf.writeUInt8(0x42, 3);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 03 04 23 42>
	 * ```
	 * @since v0.5.0
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 1`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUInt8(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setUint8(offset, value);
		return offset + 1;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as little-endian. The `value`must be a valid unsigned 16-bit integer. Behavior is undefined when `value` is
	 * anything other than an unsigned 16-bit integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeUInt16LE(0xdead, 0);
	 * buf.writeUInt16LE(0xbeef, 2);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer ad de ef be>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 2`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUInt16LE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setUint16(offset, value, true);
		return offset + 2;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as big-endian. The `value`must be a valid unsigned 16-bit integer. Behavior is undefined when `value`is anything other than an
	 * unsigned 16-bit integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeUInt16BE(0xdead, 0);
	 * buf.writeUInt16BE(0xbeef, 2);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer de ad be ef>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 2`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUInt16BE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setUint16(offset, value, false);
		return offset + 2;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as little-endian. The `value`must be a valid unsigned 32-bit integer. Behavior is undefined when `value` is
	 * anything other than an unsigned 32-bit integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeUInt32LE(0xfeedface, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer ce fa ed fe>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 4`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUInt32LE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setUint32(offset, value, true);
		return offset + 4;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as big-endian. The `value`must be a valid unsigned 32-bit integer. Behavior is undefined when `value`is anything other than an
	 * unsigned 32-bit integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeUInt32BE(0xfeedface, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer fe ed fa ce>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 4`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeUInt32BE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setUint32(offset, value, false);
		return offset + 4;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset`. `value` must be a valid
	 * signed 8-bit integer. Behavior is undefined when `value` is anything other than
	 * a signed 8-bit integer.
	 *
	 * `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(2);
	 *
	 * buf.writeInt8(2, 0);
	 * buf.writeInt8(-2, 1);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 02 fe>
	 * ```
	 * @since v0.5.0
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 1`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeInt8(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setInt8(offset, value);
		return offset + 1;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as little-endian.  The `value`must be a valid signed 16-bit integer. Behavior is undefined when `value` is
	 * anything other than a signed 16-bit integer.
	 *
	 * The `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(2);
	 *
	 * buf.writeInt16LE(0x0304, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 04 03>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 2`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeInt16LE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setInt16(offset, value, true);
		return offset + 2;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as big-endian.  The `value`must be a valid signed 16-bit integer. Behavior is undefined when `value` is
	 * anything other than a signed 16-bit integer.
	 *
	 * The `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(2);
	 *
	 * buf.writeInt16BE(0x0102, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 01 02>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 2`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeInt16BE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setInt16(offset, value, false);
		return offset + 2;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as little-endian. The `value`must be a valid signed 32-bit integer. Behavior is undefined when `value` is
	 * anything other than a signed 32-bit integer.
	 *
	 * The `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeInt32LE(0x05060708, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 08 07 06 05>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 4`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeInt32LE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setInt32(offset, value, true);
		return offset + 4;
	}
	/**
	 * Writes `value` to `buf` at the specified `offset` as big-endian. The `value`must be a valid signed 32-bit integer. Behavior is undefined when `value` is
	 * anything other than a signed 32-bit integer.
	 *
	 * The `value` is interpreted and written as a two's complement signed integer.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = new Buffer(4);
	 *
	 * buf.writeInt32BE(0x01020304, 0);
	 *
	 * console.log(buf);
	 * // Prints: <Buffer 01 02 03 04>
	 * ```
	 * @since v0.5.5
	 * @param value Number to be written to `buf`.
	 * @param [offset=0] Number of bytes to skip before starting to write. Must satisfy `0 <= offset <= buf.length - 4`.
	 * @return `offset` plus the number of bytes written.
	 */
	writeInt32BE(value: number, offset: number = 0): number {
		const view = this.getDataView();
		view.setInt32(offset, value, false);
		return offset + 4;
	}

	/**
	 * Reads an unsigned, big-endian 64-bit integer from `buf` at the specified`offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
	 *
	 * console.log(buf.readBigUInt64BE(0));
	 * // Prints: 4294967295n
	 * ```
	 * @since v12.0.0, v10.20.0
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy: `0 <= offset <= buf.length - 8`.
	 */
	readBigUInt64BE(offset: number = 0): bigint {
		const view = this.getDataView();
		return view.getBigUint64(offset, false);
	}
	/**
	 * Reads an unsigned, little-endian 64-bit integer from `buf` at the specified`offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
	 *
	 * console.log(buf.readBigUInt64LE(0));
	 * // Prints: 18446744069414584320n
	 * ```
	 * @since v12.0.0, v10.20.0
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy: `0 <= offset <= buf.length - 8`.
	 */
	readBigUInt64LE(offset: number = 0): bigint {
		const view = this.getDataView();
		return view.getBigUint64(offset, true);
	}
	/**
	 * Reads a signed, big-endian 64-bit integer from `buf` at the specified `offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed
	 * values.
	 * @since v12.0.0, v10.20.0
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy: `0 <= offset <= buf.length - 8`.
	 */
	readBigInt64BE(offset: number = 0): bigint {
		const view = this.getDataView();
		return view.getBigInt64(offset, false);
	}
	/**
	 * Reads a signed, little-endian 64-bit integer from `buf` at the specified`offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed
	 * values.
	 * @since v12.0.0, v10.20.0
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy: `0 <= offset <= buf.length - 8`.
	 */
	readBigInt64LE(offset: number = 0): bigint {
		const view = this.getDataView();
		return view.getBigInt64(offset, true);
	}
	/**
	 * Reads `byteLength` number of bytes from `buf` at the specified `offset` and interprets the result as an unsigned, little-endian integer supporting
	 * up to 48 bits of accuracy.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
	 *
	 * console.log(buf.readUIntLE(0, 6).toString(16));
	 * // Prints: ab9078563412
	 * ```
	 * @since v0.11.15
	 * @param offset Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to read. Must satisfy `0 < byteLength <= 6`.
	 */
	readUIntLE(offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.readUInt8(offset);
			case 2:
				return this.readUInt16LE(offset);
			case 3: {
				let ret = this.readUInt16LE(offset);
				ret |= this.readUInt8(offset + 2) << 16;
				return ret;
			}
			case 4:
				return this.readUInt32LE(offset);

			// Numbers > 32 bit need to be converted to BigInt for the bitwise operations to work
			case 5: {
				let ret = BigInt(this.readUInt32LE(offset));
				ret |= BigInt(this.readUInt8(offset + 4)) << 32n;
				return Number(ret);
			}
			case 6: {
				let ret = BigInt(this.readUInt32LE(offset));
				ret |= BigInt(this.readUInt16LE(offset + 4)) << 32n;
				return Number(ret);
			}
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Reads `byteLength` number of bytes from `buf` at the specified `offset` and interprets the result as an unsigned big-endian integer supporting
	 * up to 48 bits of accuracy.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
	 *
	 * console.log(buf.readUIntBE(0, 6).toString(16));
	 * // Prints: 1234567890ab
	 * console.log(buf.readUIntBE(1, 6).toString(16));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.11.15
	 * @param offset Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to read. Must satisfy `0 < byteLength <= 6`.
	 */
	readUIntBE(offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.readUInt8(offset);
			case 2:
				return this.readUInt16BE(offset);
			case 3: {
				let ret = this.readUInt8(offset) << 16;
				ret |= this.readUInt16BE(offset + 1);
				return ret;
			}
			case 4:
				return this.readUInt32BE(offset);

			// Numbers > 32 bit need to be converted to BigInt for the bitwise operations to work
			case 5: {
				let ret = BigInt(this.readUInt32BE(offset)) << 32n;
				ret |= BigInt(this.readUInt8(offset + 4));
				return Number(ret);
			}
			case 6: {
				let ret = BigInt(this.readUInt32BE(offset)) << 32n;
				ret |= BigInt(this.readUInt16BE(offset + 4));
				return Number(ret);
			}
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Reads `byteLength` number of bytes from `buf` at the specified `offset` and interprets the result as a little-endian, two's complement signed value
	 * supporting up to 48 bits of accuracy.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
	 *
	 * console.log(buf.readIntLE(0, 6).toString(16));
	 * // Prints: -546f87a9cbee
	 * ```
	 * @since v0.11.15
	 * @param offset Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to read. Must satisfy `0 < byteLength <= 6`.
	 */
	readIntLE(offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.readInt8(offset);
			case 2:
				return this.readInt16LE(offset);
			case 3: {
				// Read the lower 2 bytes as unsigned, since the upper byte is signed
				let ret = this.readUInt16LE(offset);
				ret |= this.readInt8(offset + 2) << 16;
				return ret;
			}
			case 4:
				return this.readInt32LE(offset);

			case 5:
			case 6:
				throw new RangeError(
					`readIntLE is currently not implemented for byteLength ${byteLength}`,
				);
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Reads `byteLength` number of bytes from `buf` at the specified `offset` and interprets the result as a big-endian, two's complement signed value
	 * supporting up to 48 bits of accuracy.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
	 *
	 * console.log(buf.readIntBE(0, 6).toString(16));
	 * // Prints: 1234567890ab
	 * console.log(buf.readIntBE(1, 6).toString(16));
	 * // Throws ERR_OUT_OF_RANGE.
	 * console.log(buf.readIntBE(1, 0).toString(16));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.11.15
	 * @param offset Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - byteLength`.
	 * @param byteLength Number of bytes to read. Must satisfy `0 < byteLength <= 6`.
	 */
	readIntBE(offset: number, byteLength: number): number {
		switch (byteLength) {
			case 1:
				return this.readInt8(offset);
			case 2:
				return this.readInt16BE(offset);
			case 3: {
				// The upper byte is signed
				let ret = this.readInt8(offset) << 16;
				// read the rest as unsigned
				ret |= this.readUInt16BE(offset + 1);
				return ret;
			}
			case 4:
				return this.readInt32BE(offset);

			case 5:
			case 6:
				throw new RangeError(
					`readIntBE is currently not implemented for byteLength ${byteLength}`,
				);
			default:
				throw new RangeError(
					`The value of "byteLength" is out of range. It must be >= 1 and <= 6. Received ${byteLength}`,
				);
		}
	}
	/**
	 * Reads an unsigned 8-bit integer from `buf` at the specified `offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([1, -2]);
	 *
	 * console.log(buf.readUInt8(0));
	 * // Prints: 1
	 * console.log(buf.readUInt8(1));
	 * // Prints: 254
	 * console.log(buf.readUInt8(2));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.5.0
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 1`.
	 */
	readUInt8(offset: number = 0): number {
		const view = this.getDataView();
		return view.getUint8(offset);
	}
	/**
	 * Reads an unsigned, little-endian 16-bit integer from `buf` at the specified`offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56]);
	 *
	 * console.log(buf.readUInt16LE(0).toString(16));
	 * // Prints: 3412
	 * console.log(buf.readUInt16LE(1).toString(16));
	 * // Prints: 5634
	 * console.log(buf.readUInt16LE(2).toString(16));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 2`.
	 */
	readUInt16LE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getUint16(offset, true);
	}
	/**
	 * Reads an unsigned, big-endian 16-bit integer from `buf` at the specified`offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56]);
	 *
	 * console.log(buf.readUInt16BE(0).toString(16));
	 * // Prints: 1234
	 * console.log(buf.readUInt16BE(1).toString(16));
	 * // Prints: 3456
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 2`.
	 */
	readUInt16BE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getUint16(offset, false);
	}
	/**
	 * Reads an unsigned, little-endian 32-bit integer from `buf` at the specified`offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
	 *
	 * console.log(buf.readUInt32LE(0).toString(16));
	 * // Prints: 78563412
	 * console.log(buf.readUInt32LE(1).toString(16));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 4`.
	 */
	readUInt32LE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getUint32(offset, true);
	}
	/**
	 * Reads an unsigned, big-endian 32-bit integer from `buf` at the specified`offset`.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
	 *
	 * console.log(buf.readUInt32BE(0).toString(16));
	 * // Prints: 12345678
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 4`.
	 */
	readUInt32BE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getUint32(offset, false);
	}
	/**
	 * Reads a signed 8-bit integer from `buf` at the specified `offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed values.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([-1, 5]);
	 *
	 * console.log(buf.readInt8(0));
	 * // Prints: -1
	 * console.log(buf.readInt8(1));
	 * // Prints: 5
	 * console.log(buf.readInt8(2));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.5.0
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 1`.
	 */
	readInt8(offset: number = 0): number {
		const view = this.getDataView();
		return view.getInt8(offset);
	}
	/**
	 * Reads a signed, little-endian 16-bit integer from `buf` at the specified`offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed values.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0, 5]);
	 *
	 * console.log(buf.readInt16LE(0));
	 * // Prints: 1280
	 * console.log(buf.readInt16LE(1));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 2`.
	 */
	readInt16LE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getInt16(offset, true);
	}
	/**
	 * Reads a signed, big-endian 16-bit integer from `buf` at the specified `offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed values.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0, 5]);
	 *
	 * console.log(buf.readInt16BE(0));
	 * // Prints: 5
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 2`.
	 */
	readInt16BE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getInt16(offset, false);
	}
	/**
	 * Reads a signed, little-endian 32-bit integer from `buf` at the specified`offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed values.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0, 0, 0, 5]);
	 *
	 * console.log(buf.readInt32LE(0));
	 * // Prints: 83886080
	 * console.log(buf.readInt32LE(1));
	 * // Throws ERR_OUT_OF_RANGE.
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 4`.
	 */
	readInt32LE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getInt32(offset, true);
	}
	/**
	 * Reads a signed, big-endian 32-bit integer from `buf` at the specified `offset`.
	 *
	 * Integers read from a `Buffer` are interpreted as two's complement signed values.
	 *
	 * ```js
	 * import { Buffer } from 'node:buffer';
	 *
	 * const buf = Buffer.from([0, 0, 0, 5]);
	 *
	 * console.log(buf.readInt32BE(0));
	 * // Prints: 5
	 * ```
	 * @since v0.5.5
	 * @param [offset=0] Number of bytes to skip before starting to read. Must satisfy `0 <= offset <= buf.length - 4`.
	 */
	readInt32BE(offset: number = 0): number {
		const view = this.getDataView();
		return view.getInt32(offset, false);
	}
}
