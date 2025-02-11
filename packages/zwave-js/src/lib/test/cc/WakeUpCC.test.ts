import {
	MultiChannelCC,
	SecurityCC,
	WakeUpCCNoMoreInformation,
} from "@zwave-js/cc";
import { generateAuthKey, generateEncryptionKey } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { randomBytes } from "node:crypto";
import { test } from "vitest";

test("WakeUpCCNoMoreInformation should expect no response", (t) => {
	const cc = new WakeUpCCNoMoreInformation({
		nodeId: 2,
		endpointIndex: 2,
	});
	t.expect(cc.expectsCCResponse()).toBe(false);
});

test("MultiChannelCC/WakeUpCCNoMoreInformation should expect NO response", (t) => {
	const ccRequest = MultiChannelCC.encapsulate(
		new WakeUpCCNoMoreInformation({
			nodeId: 2,
			endpointIndex: 2,
		}),
	);
	t.expect(ccRequest.expectsCCResponse()).toBe(false);
});

test("SecurityCC/WakeUpCCNoMoreInformation should expect NO response", (t) => {
	// The nonce needed to decode it
	const nonce = randomBytes(8);
	// The network key needed to decode it
	const networkKey = Bytes.from("0102030405060708090a0b0c0d0e0f10", "hex");

	const securityManager = {
		getNonce: () => nonce,
		getAuthKey: generateAuthKey(networkKey),
		getEncryptionKey: generateEncryptionKey(networkKey),
	};

	const ccRequest = SecurityCC.encapsulate(
		1,
		securityManager as any,
		new WakeUpCCNoMoreInformation({
			nodeId: 2,
			endpointIndex: 2,
		}),
	);
	t.expect(ccRequest.expectsCCResponse()).toBe(false);
});
