require("reflect-metadata");
// @ts-check
const data = Buffer.from("010e000400060891010f260303601436", "hex");
require("../build/index");
const { Message } = require("../build/lib/message/Message");
console.log(Message.getMessageLength(data));
const msg = Message.from(
	/** @type {any} */ ({
		getSafeCCVersionForNode: () => 100,
		controller: {
			nodes: {
				get() {
					return {
						valueDB: {
							setMetadata() {},
							setValue() {},
						},
					};
				},
			},
		},
	}),
	data,
);

msg;
