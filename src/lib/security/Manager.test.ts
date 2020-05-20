/* eslint-disable @typescript-eslint/no-var-requires */
import { SecurityManager } from "./Manager";

// prettier-ignore
const networkKey = Buffer.from([
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
]);

describe("lib/security/Manager", () => {
	describe("generateNonce", () => {
		it("should return a random Buffer of the given length", () => {
			const man = new SecurityManager(networkKey);
			// I know, this is not really checking if the value is random
			const nonce1 = man.generateNonce(8);
			const nonce2 = man.generateNonce(8);
			const nonce3 = man.generateNonce(8);

			expect(Buffer.isBuffer(nonce1)).toBeTrue();
			expect(Buffer.isBuffer(nonce2)).toBeTrue();
			expect(Buffer.isBuffer(nonce3)).toBeTrue();

			expect(nonce1.length).toBe(8);
			expect(nonce2.length).toBe(8);
			expect(nonce3.length).toBe(8);
		});

		it("should ensure that no collisions happen", () => {
			jest.resetModules();
			const buf1a = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
			const buf1b = Buffer.from([1, 2, 3, 4, 5, 6, 7, 9]); // has the same nonce id
			const buf2 = Buffer.from([2, 2, 3, 4, 5, 6, 7, 8]);

			jest.mock("crypto");
			const crypto: typeof import("crypto") = require("crypto");
			const original: typeof import("crypto") = jest.requireActual(
				"crypto",
			);
			(crypto.randomBytes as jest.Mock)
				.mockReturnValueOnce(buf1a)
				.mockReturnValueOnce(buf1b)
				.mockReturnValueOnce(buf2);
			crypto.createCipheriv = original.createCipheriv;
			crypto.createDecipheriv = original.createDecipheriv;
			const SM: typeof SecurityManager = require("./Manager")
				.SecurityManager;

			const man = new SM(networkKey);
			const nonce1 = man.generateNonce(8);
			const nonce2 = man.generateNonce(8);
			expect(nonce1).toEqual(buf1a);
			expect(nonce2).toEqual(buf2);

			expect(man.getNonce(1)).toEqual(buf1a);
			expect(man.getNonce(2)).toEqual(buf2);
			jest.resetModules();
		});
	});

	describe("getNonceId", () => {
		it("should return the first byte of the nonce", () => {
			const man = new SecurityManager(networkKey);

			const nonce1 = man.generateNonce(8);
			const nonce2 = man.generateNonce(8);
			const nonce3 = man.generateNonce(8);

			expect(man.getNonceId(nonce1)).toBe(nonce1[0]);
			expect(man.getNonceId(nonce2)).toBe(nonce2[0]);
			expect(man.getNonceId(nonce3)).toBe(nonce3[0]);
		});
	});

	describe("getNonce", () => {
		it("should return a previously generated nonce with the same id", () => {
			const man = new SecurityManager(networkKey);

			const nonce1 = man.generateNonce(8);
			const nonce2 = man.generateNonce(8);
			const nonce3 = man.generateNonce(8);

			const nonceId1 = man.getNonceId(nonce1);
			const nonceId2 = man.getNonceId(nonce2);
			const nonceId3 = man.getNonceId(nonce3);

			expect(nonce1).toEqual(man.getNonce(nonceId1));
			expect(nonce2).toEqual(man.getNonce(nonceId2));
			expect(nonce3).toEqual(man.getNonce(nonceId3));
		});
	});
});
