// @ts-check

import "reflect-metadata";
import "zwave-js";
import { ConfigManager } from "@zwave-js/config";
import {
	NodeIDType,
	SPANState,
	SecurityClass,
	type SecurityManager,
	SecurityManager2,
	generateAuthKey,
	generateEncryptionKey,
} from "@zwave-js/core";
import {
	Message,
	containsSerializedCC,
	isCommandRequest,
} from "@zwave-js/serial";
import { CommandClass, containsCC } from "zwave-js";

(async () => {
	const configManager = new ConfigManager();
	await configManager.loadAll();

	// The data to decode
	const data = Buffer.from(
		"011100a800000100820343050200a7007f7f25",
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
		isCCSecure: () => true,
		nodeIdType: NodeIDType.Long,
	};
	const ctx = {
		securityManager: {
			getNonce: () => nonce,
			deleteNonce() {},
			authKey: generateAuthKey(networkKey),
			encryptionKey: generateEncryptionKey(networkKey),
		} as unknown as SecurityManager,
		securityManager2: sm2,
		getHighestSecurityClass: () => SecurityClass.S2_AccessControl,
		hasSecurityClass: () => true,
	};
	const msg = Message.parse(data, ctx as any);

	// Parse embedded CCs
	if (isCommandRequest(msg) && containsSerializedCC(msg)) {
		msg.command = await CommandClass.parse(
			msg.serializedCC,
			{
				...ctx,
				sourceNodeId: msg.getNodeId()!,
				frameType: msg.frameType,
			},
		);
	}
	if (containsCC(msg)) {
		await msg.command.mergePartialCCs([], {} as any);
	}
	msg;
	debugger;
})().catch(console.error);
