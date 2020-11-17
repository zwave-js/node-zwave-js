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

	function dummyInit(
		man: SecurityManager2,
		options: {
			keys?: boolean;
			nodeId?: number;
			multicastGroup?: number;
		} = {},
	): void {
		if (options.keys !== false) {
			man.setKeys(
				crypto.randomBytes(16),
				crypto.randomBytes(16),
				crypto.randomBytes(32),
			);
		}
		if (options.nodeId) {
			man.initializeSPAN(
				options.nodeId,
				crypto.randomBytes(16),
				crypto.randomBytes(16),
			);
		}
		if (options.multicastGroup) {
			man.initializeMPAN(options.multicastGroup);
		}
	}

	describe("nextNonce", () => {
		it("should throw if the PRNG for the given receiver node has not been initialized", () => {
			const man = new SecurityManager2();
			assertZWaveError(() => man.nextNonce(2), {
				errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
				messageMatches: "initialized",
			});
		});

		it("should generate a 13-byte nonce otherwise", () => {
			const man = new SecurityManager2();
			dummyInit(man, { nodeId: 2 });

			const ret = man.nextNonce(2);
			expect(Buffer.isBuffer(ret)).toBeTrue();
			expect(ret.length).toBe(13);
		});

		it("two nonces should be different", () => {
			const man = new SecurityManager2();
			dummyInit(man, { nodeId: 2 });

			const nonce1 = man.nextNonce(2);
			const nonce2 = man.nextNonce(2);
			expect(nonce1).not.toEqual(nonce2);
		});
	});

	describe("initializeSPAN", () => {
		it("should throw if either entropy input does not have length 16", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() => man.initializeSPAN(2, Buffer.alloc(15), Buffer.alloc(16)),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "16 bytes",
				},
			);

			assertZWaveError(
				() => man.initializeSPAN(2, Buffer.alloc(16), Buffer.alloc(1)),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "16 bytes",
				},
			);
		});

		it("should throw if the personalization string is not set", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() => man.initializeSPAN(2, Buffer.alloc(16), Buffer.alloc(16)),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "personalization",
				},
			);
		});

		it("should not throw otherwise", () => {
			const man = new SecurityManager2();
			dummyInit(man, { keys: true });
			expect(() =>
				man.initializeSPAN(2, Buffer.alloc(16), Buffer.alloc(16)),
			).not.toThrow();
		});
	});

	describe("setKeys", () => {
		it("should throw if keyCCM does not have length 16", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() =>
					man.setKeys(
						Buffer.alloc(15),
						Buffer.alloc(16),
						Buffer.alloc(32),
					),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "keyCCM",
				},
			);
		});

		it("should throw if keyMPAN does not have length 16", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() =>
					man.setKeys(
						Buffer.alloc(16),
						Buffer.alloc(15),
						Buffer.alloc(32),
					),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "keyMPAN",
				},
			);
		});

		it("should throw if personalizationString does not have length 32", () => {
			const man = new SecurityManager2();
			assertZWaveError(
				() =>
					man.setKeys(
						Buffer.alloc(16),
						Buffer.alloc(16),
						Buffer.alloc(31),
					),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: "personalizationString",
				},
			);
		});
	});

	describe("nextMPAN", () => {
		it("should throw if the MPAN state for the given multicast group has not been initialized", () => {
			const man = new SecurityManager2();
			assertZWaveError(() => man.nextMPAN(1), {
				errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
				messageMatches: "initialized",
			});
		});

		it("should throw if the MPAN key has not been set", () => {
			const man = new SecurityManager2();
			dummyInit(man, { keys: false, multicastGroup: 1 });
			assertZWaveError(() => man.nextMPAN(1), {
				errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
				messageMatches: "MPAN key",
			});
		});

		it("should generate a 16-byte buffer otherwise", () => {
			const man = new SecurityManager2();
			dummyInit(man, { multicastGroup: 1 });
			const ret = man.nextMPAN(1);

			expect(Buffer.isBuffer(ret)).toBeTrue();
			expect(ret.length).toBe(16);
		});

		it("two nonces should be different", () => {
			const man = new SecurityManager2();
			dummyInit(man, { multicastGroup: 2 });

			const nonce1 = man.nextMPAN(2);
			const nonce2 = man.nextMPAN(2);
			expect(nonce1).not.toEqual(nonce2);
		});
	});
});
