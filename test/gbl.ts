import { BootloaderSerialPort } from "@zwave-js/serial";
import { wait as _wait } from "alcalzone-shared/async";
import os from "os";
import "reflect-metadata";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";

const gblSerial = new BootloaderSerialPort(port);
gblSerial.on("data", async (data) => {
	console.log("got data:");
	console.log(data);

	if (data.error != undefined) return;
	if (data.waitingForInput) {
		await gblSerial.writeAsync(Buffer.from("1", "ascii"));
	}
});

void gblSerial.open().then(async () => {
	await gblSerial.writeAsync(Buffer.from("01030027db", "hex"));
	await wait(2000);
});
