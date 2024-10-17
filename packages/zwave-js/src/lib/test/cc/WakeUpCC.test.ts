import {
	MultiChannelCC,
	SecurityCC,
	WakeUpCCNoMoreInformation,
} from "@zwave-js/cc";
import { generateAuthKey, generateEncryptionKey } from "@zwave-js/core";
import test from "ava";
import { randomBytes } from "node:crypto";

test("WakeUpCCNoMoreInformation should expect no response", (t) => {
	const cc = new WakeUpCCNoMoreInformation({
		nodeId: 2,
		endpoint: 2,
	});
	t.false(cc.expectsCCResponse());
});

test("MultiChannelCC/WakeUpCCNoMoreInformation should expect NO response", (t) => {
	const ccRequest = MultiChannelCC.encapsulate(
		new WakeUpCCNoMoreInformation({
			nodeId: 2,
			endpoint: 2,
		}),
	);
	t.false(ccRequest.expectsCCResponse());
});

test("SecurityCC/WakeUpCCNoMoreInformation should expect NO response", (t) => {
	// The nonce needed to decode it
	const nonce = randomBytes(8);
	// The network key needed to decode it
	const networkKey = Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex");

	const securityManager = {
		getNonce: () => nonce,
		authKey: generateAuthKey(networkKey),
		encryptionKey: generateEncryptionKey(networkKey),
	};

	const ccRequest = SecurityCC.encapsulate(
		1,
		securityManager as any,
		new WakeUpCCNoMoreInformation({
			nodeId: 2,
			endpoint: 2,
		}),
	);
	t.false(ccRequest.expectsCCResponse());
});
