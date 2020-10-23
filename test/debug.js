// @ts-check

require("reflect-metadata");
require("zwave-js");
const { Message } = require("../packages/zwave-js/build/lib/message/Message");
const { generateAuthKey, generateEncryptionKey } = require("@zwave-js/core");
const {
	isCommandClassContainer,
} = require("../packages/zwave-js/build/lib/commandclass/ICommandClassContainer");

// The data to decode
const data = Buffer.from("010d00040003079c02000500000069", "hex");
// The nonce needed to decode it
const nonce = Buffer.from("478d7aa05d83f3ea", "hex");
// The network key needed to decode it
const networkKey = Buffer.from("96bcdaa2da7b00621a7fa57e38813786", "hex");

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
						getEndpoint() {},
					};
				},
			},
		},
		securityManager: {
			getNonce: () => nonce,
			deleteNonce() {},
			authKey: generateAuthKey(networkKey),
			encryptionKey: generateEncryptionKey(networkKey),
		},
	}),
	data,
);

if (isCommandClassContainer(msg)) {
	msg.command.mergePartialCCs([]);
}
msg;
debugger;
