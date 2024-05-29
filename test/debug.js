// @ts-check

require("reflect-metadata");
require("zwave-js");
const { Message } = require("@zwave-js/serial");
const {
	generateAuthKey,
	generateEncryptionKey,
	SecurityManager2,
	SecurityClass,
	SPANState,
} = require("@zwave-js/core");
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
	const data = Buffer.from(
		"012900a8000102209f035a0112c1a5ab925f01ee99f1c610bc6c0422f7fd5923f8f1688d1999114000b5d5",
		"hex",
	);
	// The nonce needed to decode it
	const nonce = Buffer.from("478d7aa05d83f3ea", "hex");
	// The network key needed to decode it
	const networkKey = Buffer.from("96bcdaa2da7b00621a7fa57e38813786", "hex");

	const sm2 = new SecurityManager2();
	// Small hack: We do not care about S2 duplicates
	sm2.isDuplicateSinglecast = () => false;
	sm2.setKey(
		SecurityClass.S0_Legacy,
		Buffer.from("0102030405060708090a0b0c0d0e0fff", "hex"),
	);
	sm2.setKey(
		SecurityClass.S2_Unauthenticated,
		Buffer.from("5369389EFA18EE2A4894C7FB48347FEA", "hex"),
	);
	sm2.setKey(
		SecurityClass.S2_Authenticated,
		Buffer.from("656EF5C0F020F3C14238C04A1748B7E1", "hex"),
	);
	sm2.setKey(
		SecurityClass.S2_AccessControl,
		Buffer.from("31132050077310B6F7032F91C79C2EB8", "hex"),
	);

	sm2.setSPANState(2, {
		type: SPANState.LocalEI,
		receiverEI: Buffer.from("3664023a7971465342fe3d82ebb4b8e9", "hex"),
	});

	console.log(Message.getMessageLength(data));
	/** @type {any} */
	const host = {
		getSafeCCVersion: () => 1,
		getSupportedCCVersion: () => 1,
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
		securityManager2: sm2,
		getHighestSecurityClass: () => SecurityClass.S2_AccessControl,
		hasSecurityClass: () => true,
		isCCSecure: () => true,
	};
	const msg = Message.from(host, { data });

	if (isCommandClassContainer(msg)) {
		msg.command.mergePartialCCs(host, []);
	}
	msg;
	debugger;
})().catch(console.error);
