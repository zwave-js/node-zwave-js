import { deflateSync as defflateSync, gunzipSync as fgunzipSync } from "fflate";

export function deflateSync(data: Uint8Array): Uint8Array {
	return defflateSync(data);
}

export function gunzipSync(data: Uint8Array): Uint8Array {
	return fgunzipSync(data);
}
