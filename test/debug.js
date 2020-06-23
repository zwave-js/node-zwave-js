// @ts-check

require("reflect-metadata");
require("zwave-js");
const { Message } = require("../packages/zwave-js/build/lib/message/Message");
const { generateAuthKey, generateEncryptionKey } = require("@zwave-js/core");

// The data to decode
const data = Buffer.from("0104011301e8", "hex");
// The nonce needed to decode it
const nonce = Buffer.from("4392826cbba0b312", "hex");
// The network key needed to decode it
const networkKey = Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex");

console.log(Message.getMessageLength(data));
const msg = Message.from(
	/** @type {any} */ ({
		getSafeCCVersionForNode: () => 100,
		controller: {
			ownNodeId: 1,
			nodes: {
				get() {
					return {
						valueDB: {
							hasMetadata: () => false,
							setMetadata() {},
							setValue() {},
						},
						isCCSecure: () => true,
					};
				},
			},
		},
		securityManager: {
			getNonce: () => nonce,
			authKey: generateAuthKey(networkKey),
			encryptionKey: generateEncryptionKey(networkKey),
		},
	}),
	data,
);

msg;
debugger;
