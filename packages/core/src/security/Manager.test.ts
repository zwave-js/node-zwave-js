/* eslint-disable @typescript-eslint/no-var-requires */
import { randomBytes } from "crypto";
import { SecurityManager } from "./Manager";

// prettier-ignore
const networkKey = Buffer.from([
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
]);
const ownNodeId = 1;
const options = { networkKey, ownNodeId, nonceTimeout: 500 };

describe("lib/security/Manager", () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	describe("constructor()", () => {
		it("should set the network key, auth key and encryption key", () => {
			const man = new SecurityManager(options);
			expect(man.networkKey).toEqual(networkKey);
			expect(Buffer.isBuffer(man.authKey)).toBeTrue();
			expect(man.authKey.length).toBe(16);
			expect(Buffer.isBuffer(man.encryptionKey)).toBeTrue();
			expect(man.encryptionKey.length).toBe(16);
		});

		it("should throw if the network key doesn't have length 16", () => {
			expect(
				() =>
					new SecurityManager({
						networkKey: Buffer.from([]),
						ownNodeId: 1,
						nonceTimeout: 500,
					}),
			).toThrow("16 bytes");
		});
	});

	describe("generateNonce", () => {
		it("should return a random Buffer of the given length", () => {
			const man = new SecurityManager(options);
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
			jest.isolateModules(() => {
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

				const man = new SM(options);
				const nonce1 = man.generateNonce(8);
				const nonce2 = man.generateNonce(8);
				expect(nonce1).toEqual(buf1a);
				expect(nonce2).toEqual(buf2);

				expect(man.getNonce(1)).toEqual(buf1a);
				expect(man.getNonce(2)).toEqual(buf2);
				jest.resetModules();
			});
		});

		it("should store nonces for the current node id", () => {
			const man = new SecurityManager(options);

			const nonce1 = man.generateNonce(8);
			const nonce2 = man.generateNonce(8);
			const nonce3 = man.generateNonce(8);

			expect(
				man.getNonce({ nodeId: 2, nonceId: man.getNonceId(nonce1) }),
			).toBeUndefined();
			expect(
				man.getNonce({ nodeId: 2, nonceId: man.getNonceId(nonce2) }),
			).toBeUndefined();
			expect(
				man.getNonce({ nodeId: 2, nonceId: man.getNonceId(nonce3) }),
			).toBeUndefined();
		});

		it("the nonces should timeout after the given timeout", () => {
			const man = new SecurityManager(options);
			const nonce = man.generateNonce(8);
			const nonceId = nonce[0];
			expect(man.getNonce(nonceId)).toEqual(nonce);

			jest.advanceTimersByTime(options.nonceTimeout + 50);
			expect(man.getNonce(nonceId)).toBeUndefined();
		});

		it(`the nonce should be marked as "reserved"`, () => {
			const man = new SecurityManager(options);
			man.generateNonce(8);
			expect(man.getFreeNonce(ownNodeId)).toBeUndefined();
		});
	});

	describe("getNonceId", () => {
		it("should return the first byte of the nonce", () => {
			const man = new SecurityManager(options);

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
			const man = new SecurityManager(options);

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

	describe("setNonce", () => {
		it("should store a given nonce to be retrieved later", () => {
			const man = new SecurityManager(options);

			expect(man.getNonce(1)).toBeUndefined();

			const nonce: Buffer = randomBytes(8);
			nonce[0] = 1;
			man.setNonce(1, nonce);
			expect(man.getNonce(1)).toEqual(nonce);
		});

		it("the nonces should timeout after the given timeout", () => {
			const man = new SecurityManager(options);
			const nonce: Buffer = randomBytes(8);
			const nonceId = nonce[0];
			man.setNonce(nonceId, nonce);
			expect(man.getNonce(nonceId)).toEqual(nonce);

			jest.advanceTimersByTime(options.nonceTimeout + 50);

			expect(man.getNonce(nonceId)).toBeUndefined();
		});

		it("should mark the nonce as free", () => {
			const man = new SecurityManager(options);
			const nonce: Buffer = randomBytes(8);
			nonce[0] = 1;
			man.setNonce(
				{
					nodeId: 2,
					nonceId: 1,
				},
				nonce,
			);
			// Wrong node
			expect(man.getFreeNonce(1)).toBeUndefined();
			expect(man.getFreeNonce(2)).toEqual(nonce);
		});

		it("when a free nonce expires, it should no longer be free", () => {
			const man = new SecurityManager(options);
			const nonce: Buffer = randomBytes(8);
			man.setNonce(
				{
					nodeId: 2,
					nonceId: 1,
				},
				nonce,
			);

			jest.advanceTimersByTime(options.nonceTimeout + 50);
			expect(man.getFreeNonce(2)).toBeUndefined();
		});
	});

	describe("hasNonce", () => {
		it("should return whether a nonce id is in the database", () => {
			const man = new SecurityManager(options);

			// Manually set
			expect(man.hasNonce(1)).toBeFalse();
			const nonce1: Buffer = randomBytes(8);
			nonce1[0] = 1;
			man.setNonce(1, nonce1);
			expect(man.hasNonce(1)).toBeTrue();

			// And generated
			const nonce2 = man.generateNonce(8);
			const nonceId2 = man.getNonceId(nonce2);
			expect(man.hasNonce(nonceId2)).toBeTrue();
		});
	});

	describe("deleteNonce", () => {
		it("should remove a nonce from the database", () => {
			const man = new SecurityManager(options);

			const nonce = man.generateNonce(8);
			const nonceId = man.getNonceId(nonce);

			man.deleteNonce(nonceId);
			expect(man.getNonce(nonceId)).toBeUndefined();
			expect(man.hasNonce(nonceId)).toBeFalse();
		});
	});

	describe("getFreeNonce", () => {
		it("should reserve the nonce", () => {
			const man = new SecurityManager(options);
			const nonce: Buffer = randomBytes(8);
			nonce[0] = 1;
			man.setNonce(
				{
					nodeId: 2,
					nonceId: 1,
				},
				nonce,
			);
			expect(man.getFreeNonce(2)).toEqual(nonce);
			expect(man.getFreeNonce(2)).toBeUndefined();
		});
	});

	it("nonces should be stored separately for each node", () => {
		const man = new SecurityManager(options);

		const nonce1 = man.generateNonce(8);
		const nonceId1 = man.getNonceId(nonce1);
		// Create a duplicate for another node
		const nonce2: Buffer = randomBytes(8);
		nonce2[0] = nonceId1;

		const id2 = { nodeId: 7, nonceId: nonceId1 };
		expect(man.hasNonce(id2)).toBeFalse();
		expect(man.getNonce(id2)).toBeUndefined();

		man.setNonce(id2, nonce2);
		expect(man.hasNonce(id2)).toBeTrue();
		expect(man.getNonce(id2)).toEqual(nonce2);
	});
});
