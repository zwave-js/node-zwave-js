import { deflateSync as defflateSync } from "fflate";

export function deflateSync(data: Uint8Array): Uint8Array {
	return defflateSync(data);
}
