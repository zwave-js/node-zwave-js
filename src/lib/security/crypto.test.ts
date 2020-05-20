import * as crypto from "crypto";
import { decryptAES128OFB, encryptAES128OFB } from "./crypto";

describe("lib/util/crypto", () => {
	describe("encryptAES128OFB() / decryptAES128OFB()", () => {
		it("should be able to en- and decrypt the same data", () => {
			const plaintextIn =
				"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam";
			const key = crypto.randomBytes(16);
			const iv = crypto.randomBytes(16);
			const ciphertext = encryptAES128OFB(
				Buffer.from(plaintextIn),
				key,
				iv,
			);
			const plaintextOut = decryptAES128OFB(
				ciphertext,
				key,
				iv,
			).toString();
			expect(plaintextIn).toBe(plaintextOut);
		});
	});
});
