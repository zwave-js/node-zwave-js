import { db } from "@zwave-js/bindings-browser/db";
import { fs } from "@zwave-js/bindings-browser/fs";
import { createWebSerialPortFactory } from "@zwave-js/bindings-browser/serial";
import { log as createLogContainer } from "@zwave-js/core/bindings/log/browser";
import { Bytes } from "@zwave-js/shared";
import { Driver } from "zwave-js";

async function init() {
	let port: SerialPort;
	try {
		port = await navigator.serial.requestPort({
			filters: [
				{ usbVendorId: 0x10c4, usbProductId: 0xea60 },
			],
		});
		await port.open({ baudRate: 115200 });
	} catch (e) {
		console.error(e);
		return;
	}

	const serialBinding = createWebSerialPortFactory(port);

	const d = new Driver(serialBinding, {
		host: {
			fs,
			db,
			log: createLogContainer,
			serial: {
				// no listing, no creating by path!
			},
		},

		securityKeys: {
			S0_Legacy: Bytes.from("0102030405060708090a0b0c0d0e0f10", "hex"),
			S2_Unauthenticated: Bytes.from(
				"5369389EFA18EE2A4894C7FB48347FEA",
				"hex",
			),
			S2_Authenticated: Bytes.from(
				"656EF5C0F020F3C14238C04A1748B7E1",
				"hex",
			),
			S2_AccessControl: Bytes.from(
				"31132050077310B6F7032F91C79C2EB8",
				"hex",
			),
		},
		securityKeysLongRange: {
			S2_Authenticated: Bytes.from(
				"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				"hex",
			),
			S2_AccessControl: Bytes.from(
				"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
				"hex",
			),
		},
	});

	await d.start();

	(globalThis as any).driver = d;
}

document.getElementById("connect").addEventListener("click", init);
