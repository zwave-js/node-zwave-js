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
	"012d00040039278f0106055b03ac0005055b03ad0205055b03ae0205055b03af0105055b03b00002055b03b1000143",
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
