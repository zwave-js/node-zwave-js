import { db } from "@zwave-js/bindings-browser/db";
import { fs } from "@zwave-js/bindings-browser/fs";
import { createWebSerialPortFactory } from "@zwave-js/bindings-browser/serial";
import { log as createLogContainer } from "@zwave-js/core/bindings/log/browser";
import {
	ControllerFirmwareUpdateStatus,
	Driver,
	getEnumMemberName,
} from "zwave-js";

const flashButton = document.getElementById("flash") as HTMLButtonElement;
const fileInput = document.getElementById("file") as HTMLInputElement;
const flashProgress = document.getElementById(
	"progress",
) as HTMLProgressElement;
let firmwareFileContent: ArrayBuffer | null = null;
let driver!: Driver;

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

	driver = new Driver(serialBinding, {
		host: {
			fs,
			db,
			log: createLogContainer,
			serial: {
				// no listing, no creating by path!
			},
		},
		testingHooks: {
			skipNodeInterview: true,
			loadConfiguration: false,
		},
		bootloaderMode: "stay",
	})
		.once("driver ready", ready)
		.once("bootloader ready", ready);
	(globalThis as any).driver = driver;

	await driver.start();
}

function ready() {
	driver.controller.on("firmware update progress", (progress) => {
		flashProgress.value = progress.progress;
	});
	driver.controller.on("firmware update finished", (_result) => {
		flashProgress.style.display = "none";
	});
	fileInput.disabled = false;
}

fileInput.addEventListener("change", (event) => {
	const file = (event.target as HTMLInputElement).files?.[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = () => {
			firmwareFileContent = reader.result as ArrayBuffer;
			flashButton.disabled = false;
		};
		reader.readAsArrayBuffer(file);
	}
});

async function flash() {
	if (!firmwareFileContent) {
		console.error("No firmware file loaded");
		return;
	}

	try {
		const driver = (globalThis as any).driver as Driver;
		flashProgress.style.display = "initial";

		const result = await driver.controller.firmwareUpdateOTW(
			new Uint8Array(firmwareFileContent),
		);
		if (result.success) {
			alert("Firmware flashed successfully");
		} else {
			alert(
				`Failed to flash firmware: ${
					getEnumMemberName(
						ControllerFirmwareUpdateStatus,
						result.status,
					)
				}`,
			);
		}
	} catch (e) {
		console.error("Failed to flash firmware", e);
	}
}

document.getElementById("connect").addEventListener("click", init);
flashButton.addEventListener("click", flash);
