import { Bytes, type BytesView } from "@zwave-js/shared";
import {
	type DeflateOptions,
	Gunzip,
	type InflateOptions,
	deflateSync as defflateSync,
	gunzipSync as fgunzipSync,
	inflateSync as infflateSync,
} from "fflate";

export function deflateSync(data: BytesView, opts?: DeflateOptions): BytesView {
	return defflateSync(data, opts) as BytesView;
}

export function inflateSync(data: BytesView, opts?: InflateOptions): BytesView {
	return infflateSync(data, opts) as BytesView;
}

/**
 * Decompresses gzipped data. If `maxOutputLength` is given, decompression is aborted
 * with an error as soon as the output exceeds that length.
 */
export function gunzipSync(
	data: BytesView,
	maxOutputLength?: number,
): BytesView {
	if (maxOutputLength == undefined) return fgunzipSync(data) as BytesView;

	const chunks: Uint8Array[] = [];
	let outputLength = 0;
	const gunzip = new Gunzip((chunk) => {
		outputLength += chunk.length;
		if (outputLength > maxOutputLength) {
			throw new Error(
				`Decompressed data exceeds the maximum length of ${maxOutputLength} bytes`,
			);
		}
		chunks.push(chunk);
	});
	// Each push is fully decompressed before the callback is called, so feeding small
	// input chunks limits how much memory a highly compressed input can allocate at once
	const inputChunkSize = 16 * 1024;
	let offset = 0;
	do {
		const end = offset + inputChunkSize;
		gunzip.push(data.subarray(offset, end), end >= data.length);
		offset = end;
	} while (offset < data.length);

	return Bytes.concat(chunks);
}
