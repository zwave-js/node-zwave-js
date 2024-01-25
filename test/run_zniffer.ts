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
const port = "/dev/serial/by-id/usb-Silicon_Labs_J-Link_OB_000440300307-if00";

const zniffer = new Zniffer(port, {})
	.on("error", console.error)
	.once("ready", async () => {
		// Test code goes here
		await zniffer.start();

		await wait(10000);

		await zniffer.stop();
		process.exit(0);
	});
void zniffer.init();
