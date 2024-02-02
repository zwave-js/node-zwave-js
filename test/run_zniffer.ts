import { wait as _wait } from "alcalzone-shared/async";
import "reflect-metadata";
import { Zniffer } from "zwave-js";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

// const port = "tcp://Z-Net-R2v2.local:2001";
// 500/700 series
// const port = require("node:os").platform() === "win32"
// 	? "COM5"
// 	: "/dev/ttyACM0";
// const port = require("os").platform() === "win32" ? "COM5" : "/dev/ttyUSB0";
// 800 series
// const port = require("node:os").platform() === "win32" ? "COM5" : "/dev/serial/by-id/usb-1a86_USB_Single_Serial_5479014030-if00";
const port = "/dev/serial/by-id/usb-0658_0200-if00";

const zniffer = new Zniffer(port, {
	convertRSSI: true,
	defaultFrequency: 0, // EU
	securityKeys: {
		S2_AccessControl: Buffer.from(
			"31132050077310B6F7032F91C79C2EB8",
			"hex",
		),
		S2_Authenticated: Buffer.from(
			"656EF5C0F020F3C14238C04A1748B7E1",
			"hex",
		),
		S2_Unauthenticated: Buffer.from(
			"5369389EFA18EE2A4894C7FB48347FEA",
			"hex",
		),
		S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
	},
	securityKeysLongRange: {
		S2_AccessControl: Buffer.from(
			"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
			"hex",
		),
		S2_Authenticated: Buffer.from(
			"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
			"hex",
		),
	},
})
	.on("error", console.error)
	.once("ready", async () => {
		// Test code goes here
		await zniffer.start();

		zniffer.on("frame", (frame) => {
			console.debug(frame);
		});

		await wait(600000);

		await zniffer.stop();
		process.exit(0);
	});
void zniffer.init();
