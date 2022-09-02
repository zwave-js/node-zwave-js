// @ts-check

require("reflect-metadata");
require("zwave-js");
const { Message } = require("@zwave-js/serial");
const { generateAuthKey, generateEncryptionKey } = require("@zwave-js/core");
const { isCommandClassContainer } = require("@zwave-js/cc");
const { ConfigManager } = require("@zwave-js/config");

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
	const data = Buffer.from("010e00498414080421015e98845aeff3", "hex");
	// The nonce needed to decode it
	const nonce = Buffer.from("478d7aa05d83f3ea", "hex");
	// The network key needed to decode it
	const networkKey = Buffer.from("96bcdaa2da7b00621a7fa57e38813786", "hex");

	console.log(Message.getMessageLength(data));
	/** @type {any} */
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
	const msg = Message.from(host, data);

	if (isCommandClassContainer(msg)) {
		msg.command.mergePartialCCs(host, []);
	}
	msg;
	debugger;
})().catch(console.error);
