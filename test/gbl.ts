import { ZWaveLogContainer } from "@zwave-js/core";
import {
	BootloaderChunkType,
	ZWaveSerialMode,
	ZWaveSerialPort,
} from "@zwave-js/serial";
import { wait as _wait } from "alcalzone-shared/async";
import os from "os";
import "reflect-metadata";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";

const logContainer = new ZWaveLogContainer();
const serial = new ZWaveSerialPort(port, logContainer);
serial.mode = ZWaveSerialMode.Bootloader;

serial.on("bootloaderData", async (data) => {
	console.log("got data:");
	console.log(data);

	if (data.type === BootloaderChunkType.Menu) {
		console.log("run");
		const promise = serial.writeAsync(Buffer.from("2", "ascii"));
		console.log("SERIAL API mode");
		serial.mode = ZWaveSerialMode.SerialAPI;
		await promise;
		await wait(2000);
		process.exit(0);
		// await gblSerial.writeAsync(Buffer.from("2", "ascii"));
	}
});

serial.on("data", (data) => {
	console.log("got SERIAL data:");
	console.log(data);
});

void serial.open().then(async () => {
	await serial.writeAsync(Buffer.from("01030027db", "hex"));
	await wait(2000);
});
