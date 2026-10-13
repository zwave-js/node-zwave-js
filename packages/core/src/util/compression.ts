import type { BytesView } from "@zwave-js/shared";
import {
	type DeflateOptions,
	type InflateOptions,
	deflateSync as defflateSync,
	gunzipSync as fgunzipSync,
	inflateSync as infflateSync,
} from "fflate";

export function deflateSync(data: BytesView, opts?: DeflateOptions): BytesView {
	return defflateSync(data, opts);
}

export function inflateSync(data: BytesView, opts?: InflateOptions): BytesView {
	return infflateSync(data, opts) as BytesView;
}

export function gunzipSync(data: BytesView): BytesView {
	return fgunzipSync(data);
}
