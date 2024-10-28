/// https://github.com/sindresorhus/uint8array-extras/ but as CommonJS

export type TypedArray =
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array
	| BigInt64Array
	| BigUint64Array;

const uint8ArrayStringified = "[object Uint8Array]";
const arrayBufferStringified = "[object ArrayBuffer]";

function isType<T extends abstract new (...args: any) => any>(
	value: unknown,
	typeConstructor: T,
	typeStringified: string,
): value is InstanceType<T> {
	if (!value) {
		return false;
	}

	if (value.constructor === typeConstructor) {
		return true;
	}

	return Object.prototype.toString.call(value) === typeStringified;
}

/**
Check if the given value is an instance of `Uint8Array`.

Replacement for [`Buffer.isBuffer()`](https://nodejs.org/api/buffer.html#static-method-bufferisbufferobj).

@example
```
import {isUint8Array} from 'uint8array-extras';

console.log(isUint8Array(new Uint8Array()));
//=> true

console.log(isUint8Array(Buffer.from('x')));
//=> true

console.log(isUint8Array(new ArrayBuffer(10)));
//=> false
```
*/
export function isUint8Array(value: unknown): value is Uint8Array {
	return isType(value, Uint8Array, uint8ArrayStringified);
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
	return isType(value, ArrayBuffer, arrayBufferStringified);
}

function isArrayLike(value: unknown): value is ArrayLike<number> {
	return typeof value === "object"
		&& value !== null
		&& "length" in value
		&& typeof value.length === "number";
}

export function isUint8ArrayOrArrayBuffer(
	value: unknown,
): value is Uint8Array | ArrayBuffer {
	return isUint8Array(value) || isArrayBuffer(value);
}

export function isUint8ArrayOrArrayLike(
	value: unknown,
): value is Uint8Array | ArrayLike<number> {
	return isUint8Array(value) || isArrayBuffer(value);
}

/**
Throw a `TypeError` if the given value is not an instance of `Uint8Array`.

@example
```
import {assertUint8Array} from 'uint8array-extras';

try {
	assertUint8Array(new ArrayBuffer(10)); // Throws a TypeError
} catch (error) {
	console.error(error.message);
}
```
*/
export function assertUint8Array(value: unknown): asserts value is Uint8Array {
	if (!isUint8Array(value)) {
		throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof value}\``);
	}
}

export function assertUint8ArrayOrArrayBuffer(
	value: unknown,
): asserts value is Uint8Array | ArrayBuffer {
	if (!isUint8ArrayOrArrayBuffer(value)) {
		throw new TypeError(
			`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof value}\``,
		);
	}
}

export function assertUint8ArrayOrArrayLike(
	value: unknown,
): asserts value is Uint8Array | ArrayLike<number> {
	if (!isUint8Array(value) && !isArrayLike(value)) {
		throw new TypeError(
			`Expected \`Uint8Array\` or a numeric array, got \`${typeof value}\``,
		);
	}
}

/**
Convert a value to a `Uint8Array` without copying its data.

This can be useful for converting a `Buffer` to a pure `Uint8Array`. `Buffer` is already an `Uint8Array` subclass, but [`Buffer` alters some behavior](https://sindresorhus.com/blog/goodbye-nodejs-buffer), so it can be useful to cast it to a pure `Uint8Array` before returning it.

Tip: If you want a copy, just call `.slice()` on the return value.
*/
export function toUint8Array(
	value: TypedArray | ArrayBuffer | DataView,
): Uint8Array {
	if (value instanceof ArrayBuffer) {
		return new Uint8Array(value);
	}

	if (ArrayBuffer.isView(value)) {
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	}

	throw new TypeError(`Unsupported value, got \`${typeof value}\`.`);
}

/**
Concatenate the given arrays into a new array.

If `arrays` is empty, it will return a zero-sized `Uint8Array`.

If `totalLength` is not specified, it is calculated from summing the lengths of the given arrays.

Replacement for [`Buffer.concat()`](https://nodejs.org/api/buffer.html#static-method-bufferconcatlist-totallength).

@example
```
import {concatUint8Arrays} from 'uint8array-extras';

const a = new Uint8Array([1, 2, 3]);
const b = new Uint8Array([4, 5, 6]);

console.log(concatUint8Arrays([a, b]));
//=> Uint8Array [1, 2, 3, 4, 5, 6]
```
*/
export function concatUint8Arrays(
	arrays: readonly (Uint8Array | ArrayLike<number>)[],
	totalLength?: number,
): Uint8Array {
	if (arrays.length === 0) {
		return new Uint8Array(0);
	}

	totalLength ??= arrays.reduce(
		(accumulator, currentValue) => accumulator + currentValue.length,
		0,
	);

	const returnValue = new Uint8Array(totalLength);

	let offset = 0;
	for (let array of arrays) {
		if (isUint8Array(array)) {
			if (offset + array.length > totalLength) {
				array = array.subarray(0, totalLength - offset);
			}
		} else if (isArrayLike(array)) {
			if (offset + array.length > totalLength) {
				array = Uint8Array.from(array).subarray(
					0,
					totalLength - offset,
				);
			}
		} else {
			throw new TypeError(
				`Expected \`Uint8Array\` or a numeric array, got \`${typeof array}\``,
			);
		}
		returnValue.set(array, offset);
		offset += array.length;
		if (offset >= totalLength) break;
	}

	return returnValue;
}

/**
Check if two arrays are identical by verifying that they contain the same bytes in the same sequence.

Replacement for [`Buffer#equals()`](https://nodejs.org/api/buffer.html#bufequalsotherbuffer).

@example
```
import {areUint8ArraysEqual} from 'uint8array-extras';

const a = new Uint8Array([1, 2, 3]);
const b = new Uint8Array([1, 2, 3]);
const c = new Uint8Array([4, 5, 6]);

console.log(areUint8ArraysEqual(a, b));
//=> true

console.log(areUint8ArraysEqual(a, c));
//=> false
```
*/
export function areUint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
	assertUint8Array(a);
	assertUint8Array(b);

	if (a === b) {
		return true;
	}

	if (a.length !== b.length) {
		return false;
	}

	for (let index = 0; index < a.length; index++) {
		if (a[index] !== b[index]) {
			return false;
		}
	}

	return true;
}

/**
Compare two arrays and indicate their relative order or equality. Useful for sorting.

Replacement for [`Buffer.compare()`](https://nodejs.org/api/buffer.html#static-method-buffercomparebuf1-buf2).

@example
```
import {compareUint8Arrays} from 'uint8array-extras';

const array1 = new Uint8Array([1, 2, 3]);
const array2 = new Uint8Array([4, 5, 6]);
const array3 = new Uint8Array([7, 8, 9]);

[array3, array1, array2].sort(compareUint8Arrays);
//=> [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
```
*/
export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): 0 | 1 | -1 {
	assertUint8Array(a);
	assertUint8Array(b);

	const length = Math.min(a.length, b.length);

	for (let index = 0; index < length; index++) {
		const diff = a[index] - b[index];
		if (diff !== 0) {
			return Math.sign(diff) as 1 | -1;
		}
	}

	// At this point, all the compared elements are equal.
	// The shorter array should come first if the arrays are of different lengths.
	return Math.sign(a.length - b.length) as 1 | 0 | -1;
}

const cachedDecoders: Record<string, import("node:util").TextDecoder> = {
	utf8: new globalThis.TextDecoder("utf8"),
};

/**
Convert a `Uint8Array` to a string.

@param encoding - The [encoding](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings) to convert from. Default: `'utf8'`

Replacement for [`Buffer#toString()`](https://nodejs.org/api/buffer.html#buftostringencoding-start-end). For the `encoding` parameter, `latin1` should be used instead of `binary` and `utf-16le` instead of `utf16le`.

@example
```
import {uint8ArrayToString} from 'uint8array-extras';

const byteArray = new Uint8Array([72, 101, 108, 108, 111]);
console.log(uint8ArrayToString(byteArray));
//=> 'Hello'

const zh = new Uint8Array([167, 65, 166, 110]);
console.log(uint8ArrayToString(zh, 'big5'));
//=> '你好'

const ja = new Uint8Array([130, 177, 130, 241, 130, 201, 130, 191, 130, 205]);
console.log(uint8ArrayToString(ja, 'shift-jis'));
//=> 'こんにちは'
```
*/
export function uint8ArrayToString(
	array: Uint8Array | ArrayBuffer,
	encoding: string = "utf8",
): string {
	assertUint8ArrayOrArrayBuffer(array);
	cachedDecoders[encoding] ??= new globalThis.TextDecoder(encoding);
	return cachedDecoders[encoding].decode(array);
}

function assertString(value: unknown): asserts value is string {
	if (typeof value !== "string") {
		throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
	}
}

const cachedEncoder = new globalThis.TextEncoder();

/**
Convert a string to a `Uint8Array` (using UTF-8 encoding).

Replacement for [`Buffer.from('Hello')`](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding).

@example
```
import {stringToUint8Array} from 'uint8array-extras';

console.log(stringToUint8Array('Hello'));
//=> Uint8Array [72, 101, 108, 108, 111]
```
*/
export function stringToUint8Array(string: string): Uint8Array {
	assertString(string);
	return cachedEncoder.encode(string);
}

function base64ToBase64Url(base64: string): string {
	return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBase64(base64url: string): string {
	return base64url.replaceAll("-", "+").replaceAll("_", "/");
}

// Reference: https://phuoc.ng/collection/this-vs-that/concat-vs-push/
const MAX_BLOCK_SIZE = 65_535;

/**
Convert a `Uint8Array` to a Base64-encoded string.

Specify `{urlSafe: true}` to get a [Base64URL](https://base64.guru/standards/base64url)-encoded string.

Replacement for [`Buffer#toString('base64')`](https://nodejs.org/api/buffer.html#buftostringencoding-start-end).

@example
```
import {uint8ArrayToBase64} from 'uint8array-extras';

const byteArray = new Uint8Array([72, 101, 108, 108, 111]);

console.log(uint8ArrayToBase64(byteArray));
//=> 'SGVsbG8='
```
*/
export function uint8ArrayToBase64(
	array: Uint8Array,
	options?: { urlSafe: boolean },
): string {
	assertUint8Array(array);

	const { urlSafe = false } = options ?? {};

	let base64;

	if (array.length < MAX_BLOCK_SIZE) {
		// Required as `btoa` and `atob` don't properly support Unicode: https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
		base64 = globalThis.btoa(
			String.fromCodePoint.apply(null, array as any),
		);
	} else {
		base64 = "";
		for (const value of array) {
			base64 += String.fromCodePoint(value);
		}

		base64 = globalThis.btoa(base64);
	}

	return urlSafe ? base64ToBase64Url(base64) : base64;
}

/**
Convert a Base64-encoded or [Base64URL](https://base64.guru/standards/base64url)-encoded string to a `Uint8Array`.

Replacement for [`Buffer.from('SGVsbG8=', 'base64')`](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding).

@example
```
import {base64ToUint8Array} from 'uint8array-extras';

console.log(base64ToUint8Array('SGVsbG8='));
//=> Uint8Array [72, 101, 108, 108, 111]
```
*/
export function base64ToUint8Array(base64String: string): Uint8Array {
	assertString(base64String);
	return Uint8Array.from(
		globalThis.atob(base64UrlToBase64(base64String)),
		(x) => x.codePointAt(0)!,
	);
}

/**
Encode a string to Base64-encoded string.

Specify `{urlSafe: true}` to get a [Base64URL](https://base64.guru/standards/base64url)-encoded string.

Replacement for `Buffer.from('Hello').toString('base64')` and [`btoa()`](https://developer.mozilla.org/en-US/docs/Web/API/btoa).

@example
```
import {stringToBase64} from 'uint8array-extras';

console.log(stringToBase64('Hello'));
//=> 'SGVsbG8='
```
*/
export function stringToBase64(
	string: string,
	options?: { urlSafe: boolean },
): string {
	assertString(string);
	return uint8ArrayToBase64(stringToUint8Array(string), options);
}

/**
Decode a Base64-encoded or [Base64URL](https://base64.guru/standards/base64url)-encoded string to a string.

Replacement for `Buffer.from('SGVsbG8=', 'base64').toString()` and [`atob()`](https://developer.mozilla.org/en-US/docs/Web/API/atob).

@example
```
import {base64ToString} from 'uint8array-extras';

console.log(base64ToString('SGVsbG8='));
//=> 'Hello'
```
*/
export function base64ToString(base64String: string): string {
	assertString(base64String);
	return uint8ArrayToString(base64ToUint8Array(base64String));
}

const byteToHexLookupTable = Array.from(
	{ length: 256 },
	(_, index) => index.toString(16).padStart(2, "0"),
);

/**
Convert a `Uint8Array` to a Hex string.

Replacement for [`Buffer#toString('hex')`](https://nodejs.org/api/buffer.html#buftostringencoding-start-end).

@example
```
import {uint8ArrayToHex} from 'uint8array-extras';

const byteArray = new Uint8Array([72, 101, 108, 108, 111]);

console.log(uint8ArrayToHex(byteArray));
//=> '48656c6c6f'
```
*/
export function uint8ArrayToHex(array: Uint8Array): string {
	assertUint8Array(array);

	// Concatenating a string is faster than using an array.
	let hexString = "";

	for (let index = 0; index < array.length; index++) {
		hexString += byteToHexLookupTable[array[index]];
	}

	return hexString;
}

const hexToDecimalLookupTable = {
	0: 0,
	1: 1,
	2: 2,
	3: 3,
	4: 4,
	5: 5,
	6: 6,
	7: 7,
	8: 8,
	9: 9,
	a: 10,
	b: 11,
	c: 12,
	d: 13,
	e: 14,
	f: 15,
	A: 10,
	B: 11,
	C: 12,
	D: 13,
	E: 14,
	F: 15,
};

/**
Convert a Hex string to a `Uint8Array`.

Replacement for [`Buffer.from('48656c6c6f', 'hex')`](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding).

@example
```
import {hexToUint8Array} from 'uint8array-extras';

console.log(hexToUint8Array('48656c6c6f'));
//=> Uint8Array [72, 101, 108, 108, 111]
```
*/
export function hexToUint8Array(hexString: string): Uint8Array {
	assertString(hexString);

	if (hexString.length % 2 !== 0) {
		throw new Error("Invalid Hex string length.");
	}

	const resultLength = hexString.length / 2;
	const bytes = new Uint8Array(resultLength);

	for (let index = 0; index < resultLength; index++) {
		const highNibble: number | undefined =
			(hexToDecimalLookupTable as any)[hexString[index * 2]];
		const lowNibble: number | undefined =
			(hexToDecimalLookupTable as any)[hexString[(index * 2) + 1]];

		if (highNibble === undefined || lowNibble === undefined) {
			throw new Error(
				`Invalid Hex character encountered at position ${index * 2}`,
			);
		}

		bytes[index] = (highNibble << 4) | lowNibble;
	}

	return bytes;
}

/**
Read `DataView#byteLength` number of bytes from the given view, up to 48-bit.

Replacement for [`Buffer#readUintBE`](https://nodejs.org/api/buffer.html#bufreadintbeoffset-bytelength)

@example
```
import {getUintBE} from 'uint8array-extras';

const byteArray = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);

console.log(getUintBE(new DataView(byteArray.buffer)));
//=> 20015998341291
```
*/
export function getUintBE(view: DataView): number {
	const { byteLength } = view;

	if (byteLength === 6) {
		return (view.getUint16(0) * (2 ** 32)) + view.getUint32(2);
	}

	if (byteLength === 5) {
		return (view.getUint8(0) * (2 ** 32)) + view.getUint32(1);
	}

	if (byteLength === 4) {
		return view.getUint32(0);
	}

	if (byteLength === 3) {
		return (view.getUint8(0) * (2 ** 16)) + view.getUint16(1);
	}

	if (byteLength === 2) {
		return view.getUint16(0);
	}

	if (byteLength === 1) {
		return view.getUint8(0);
	}

	throw new Error("Invalid DataView byteLength.");
}

/**
Find the index of the first occurrence of the given sequence of bytes (`value`) within the given `Uint8Array` (`array`).

Replacement for [`Buffer#indexOf`](https://nodejs.org/api/buffer.html#bufindexofvalue-byteoffset-encoding). `Uint8Array#indexOf` only takes a number which is different from Buffer's `indexOf` implementation.

@example
```
import {indexOf} from 'uint8array-extras';

const byteArray = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);

console.log(indexOf(byteArray, new Uint8Array([0x78, 0x90])));
//=> 3
```
*/
export function indexOf(array: Uint8Array, value: Uint8Array): number {
	const arrayLength = array.length;
	const valueLength = value.length;

	if (valueLength === 0) {
		return -1;
	}

	if (valueLength > arrayLength) {
		return -1;
	}

	const validOffsetLength = arrayLength - valueLength;

	for (let index = 0; index <= validOffsetLength; index++) {
		let isMatch = true;
		for (let index2 = 0; index2 < valueLength; index2++) {
			if (array[index + index2] !== value[index2]) {
				isMatch = false;
				break;
			}
		}

		if (isMatch) {
			return index;
		}
	}

	return -1;
}

/**
Checks if the given sequence of bytes (`value`) is within the given `Uint8Array` (`array`).

Returns true if the value is included, otherwise false.

Replacement for [`Buffer#includes`](https://nodejs.org/api/buffer.html#bufincludesvalue-byteoffset-encoding). `Uint8Array#includes` only takes a number which is different from Buffer's `includes` implementation.

```
import {includes} from 'uint8array-extras';

const byteArray = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);

console.log(includes(byteArray, new Uint8Array([0x78, 0x90])));
//=> true
```
*/
export function includes(array: Uint8Array, value: Uint8Array): boolean {
	return indexOf(array, value) !== -1;
}
