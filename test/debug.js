// @ts-check

require("reflect-metadata");
require("../index");
const { Message } = require("../build/lib/message/Message");
const {
	generateAuthKey,
	generateEncryptionKey,
} = require("../build/lib/security/Manager");

// The data to decode
const data = Buffer.from(
	"0125000400141f9881ddd360c382a43751f3fb762d6e82126681c18597432bc20a8aa9bbb37142",
	"hex",
);
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
