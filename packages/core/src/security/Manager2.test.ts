import * as crypto from "crypto";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import { SecurityManager2 } from "./Manager2";

describe("lib/security/Manager2", () => {
	// beforeAll(() => {
	// 	jest.useFakeTimers();
	// });

	// afterAll(() => {
	// 	jest.clearAllTimers();
	// 	jest.useRealTimers();
	// });

	function dummyInit(man: SecurityManager2, nodeId: number): void {
		man.establishSPAN(
			nodeId,
			crypto.randomBytes(16),
			crypto.randomBytes(16),
			crypto.randomBytes(32),
		);
	}

	describe("nextNonce", () => {
		it("should throw if the PRNG for the given receiver node has not been initialized", () => {
			const man = new SecurityManager2();
			assertZWaveError(() => man.nextNonce(2), {
				errorCode: ZWaveErrorCodes.SecurityCC_NoNonce,
				messageMatches: "established",
			});
		});

		it("should generate a 13-byte nonce otherwise", () => {
			const man = new SecurityManager2();
			dummyInit(man, 2);

			const ret = man.nextNonce(2);
			expect(Buffer.isBuffer(ret)).toBeTrue();
			expect(ret.length).toBe(13);
		});

		it("two nonces should be different", () => {
			const man = new SecurityManager2();
			dummyInit(man, 2);

			const nonce1 = man.nextNonce(2);
			const nonce2 = man.nextNonce(2);
			expect(nonce1).not.toEqual(nonce2);
		});
	});

	describe("establishSPAN", () => {
		it("should throw if either entropy input does not have length 16", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() =>
					man.establishSPAN(
						2,
						Buffer.alloc(15),
						Buffer.alloc(16),
						Buffer.alloc(32),
					),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "16 bytes",
				},
			);

			assertZWaveError(
				() =>
					man.establishSPAN(
						2,
						Buffer.alloc(16),
						Buffer.alloc(1),
						Buffer.alloc(32),
					),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "16 bytes",
				},
			);
		});

		it("should throw if the personalization string does not have length 32", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() =>
					man.establishSPAN(
						2,
						Buffer.alloc(16),
						Buffer.alloc(16),
						Buffer.alloc(31),
					),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "32 bytes",
				},
			);
		});

		it("should not throw otherwise", () => {
			const man = new SecurityManager2();
			expect(() =>
				man.establishSPAN(
					2,
					Buffer.alloc(16),
					Buffer.alloc(16),
					Buffer.alloc(32),
				),
			).not.toThrow();
		});
	});
});
