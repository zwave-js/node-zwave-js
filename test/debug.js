// @ts-check

require("reflect-metadata");
require("zwave-js");
const { Message } = require("@zwave-js/serial");
const { generateAuthKey, generateEncryptionKey } = require("@zwave-js/core");
const { ConfigManager } = require("@zwave-js/config");
const {
	isCommandClassContainer,
} = require("../packages/zwave-js/build/lib/commandclass/ICommandClassContainer");

(async () => {
	const configManager = new ConfigManager();
	await configManager.loadDeviceClasses();
	await configManager.loadManufacturers();
	await configManager.loadDeviceIndex();
	await configManager.loadNotifications();
	await configManager.loadNamedScales();
	await configManager.loadSensorTypes();
	await configManager.loadMeters();
	await configManager.loadIndicators();

	// The data to decode
	const data = Buffer.from(
		"011b00a800011f129f03a70015820de70626870e785dafb9090300d543",
		"hex",
	);
	// The nonce needed to decode it
	const nonce = Buffer.from("478d7aa05d83f3ea", "hex");
	// The network key needed to decode it
	const networkKey = Buffer.from("96bcdaa2da7b00621a7fa57e38813786", "hex");

	console.log(Message.getMessageLength(data));
	const host = {
		getSafeCCVersionForNode: () => 1,
		configManager,
		controller: {
			ownNodeId: 1,
			nodes: {
				get() {
					return {
						valueDB: {
							hasMetadata: () => false,
							setMetadata() {},
							getMetadata() {},
							setValue() {},
							getValue() {},
						},
						isCCSecure: () => true,
						getEndpoint() {},
					};
				},
			},
		},
		get ownNodeId() {
			return host.controller.ownNodeId;
		},
		get nodes() {
			return host.controller.nodes;
		},
		securityManager: {
			getNonce: () => nonce,
			deleteNonce() {},
			authKey: generateAuthKey(networkKey),
			encryptionKey: generateEncryptionKey(networkKey),
		},
	};
	const msg = Message.from(/** @type {any} */ (host), data);

	if (isCommandClassContainer(msg)) {
		msg.command.mergePartialCCs(msg.host, []);
	}
	msg;
	debugger;
})().catch(console.error);
