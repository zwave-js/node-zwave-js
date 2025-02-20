import { db } from "@zwave-js/bindings-browser/db";
import { fs } from "@zwave-js/bindings-browser/fs";
import { createWebSerialPortFactory } from "@zwave-js/bindings-browser/serial";
import { log as createLogContainer } from "@zwave-js/core/bindings/log/browser";
import { BootloaderChunkType } from "@zwave-js/serial";
import { Bytes, getErrorMessage } from "@zwave-js/shared";
import {
	ControllerFirmwareUpdateStatus,
	Driver,
	DriverMode,
	getEnumMemberName,
} from "zwave-js";

const flashButton = document.getElementById("flash") as HTMLButtonElement;
const fileInput = document.getElementById("file") as HTMLInputElement;
const flashProgress = document.getElementById(
	"progress",
) as HTMLProgressElement;
let firmwareFileContent: ArrayBuffer | null = null;

const appLabel = document.getElementById("app") as HTMLSpanElement;
const flashError = document.getElementById("flash_error") as HTMLDivElement;
const btnRunApp = document.getElementById(
	"run_application",
) as HTMLButtonElement;
const btnBootloader = document.getElementById(
	"bootloader",
) as HTMLButtonElement;
const btnEraseNVM = document.getElementById("erase_nvm") as HTMLButtonElement;
const btnGetDSK = document.getElementById("get_dsk") as HTMLButtonElement;
const btnGetRegion = document.getElementById("get_region") as HTMLButtonElement;

let driver!: Driver;

async function init() {
	let port: SerialPort;
	try {
		port = await navigator.serial.requestPort({
			filters: [
				// CP2102
				{ usbVendorId: 0x10c4, usbProductId: 0xea60 },
				// Nabu Casa ESP bridge
				{ usbVendorId: 0x1234, usbProductId: 0x5678 },
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
		.once("bootloader ready", ready)
		.once("cli ready", ready);
	(globalThis as any).driver = driver;

	await driver.start();
}

function ready() {
	try {
		driver.controller.on("firmware update progress", (progress) => {
			flashProgress.value = progress.progress;
		});
		driver.controller.on("firmware update finished", (_result) => {
			flashProgress.style.display = "none";
		});
		fileInput.disabled = false;
	} catch {
		flashError.innerText =
			"Firmware update currently not available for devices in CLI mode. Enter bootloader, then reload this page.";
	}
	btnEraseNVM.disabled = false;

	checkApp();
}

function checkApp() {
	if (driver.mode === DriverMode.Bootloader) {
		appLabel.innerText = "Bootloader";
	} else if (driver.mode === DriverMode.CLI) {
		appLabel.innerText = "End device CLI";
	} else if (driver.mode === DriverMode.SerialAPI) {
		appLabel.innerText = "Controller Serial API";
	}

	btnBootloader.disabled = driver.mode === DriverMode.Bootloader;
	btnRunApp.disabled = driver.mode !== DriverMode.Bootloader;
	btnGetDSK.disabled = driver.mode !== DriverMode.CLI;
	btnGetRegion.disabled = driver.mode !== DriverMode.CLI;
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
		alert("No firmware file loaded");
		return;
	}

	try {
		flashProgress.style.display = "initial";

		const result = await driver.controller.firmwareUpdateOTW(
			new Uint8Array(firmwareFileContent),
		);
		if (result.success) {
			alert(
				"Firmware flashed successfully. Reload the page to continue interacting.",
			);
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
		alert(`Failed to flash firmware: ${getErrorMessage(e)}`);
	}
}

async function eraseNVM() {
	if (!driver) {
		alert("Driver not initialized");
		return;
	}

	await driver.enterBootloader();
	checkApp();

	const option = driver.bootloader.findOption((o) => o === "erase nvm");
	if (option === undefined) {
		alert("Erase NVM option not found");
		return;
	}

	const areYouSurePromise = driver.waitForBootloaderChunk(
		(c) =>
			c.type === BootloaderChunkType.Message
			&& c.message.toLowerCase().includes("are you sure"),
		1000,
	);
	await driver.bootloader.selectOption(option);
	try {
		await areYouSurePromise;
	} catch {
		alert("Erase NVM confirmation not received");
		return;
	}

	const successPromise = driver.waitForBootloaderChunk(
		(c) =>
			c.type === BootloaderChunkType.Message
			&& c.message.toLowerCase().includes("erased"),
		1000,
	);

	await driver.bootloader.writeSerial(Bytes.from("y", "ascii"));
	try {
		await successPromise;
		alert("NVM erased successfully");
	} catch {
		alert("ERROR: success message not received");
		return;
	}
}

async function runApp() {
	await (driver as any).leaveBootloader();
	checkApp();
}

async function getDSK() {
	const dsk = await driver.cli.executeCommand("get_dsk");
	alert(`DSK: ${dsk}`);
}

async function getRegion() {
	const region = await driver.cli.executeCommand("get_region");
	alert(`Region: ${region}`);
}

document.getElementById("connect").addEventListener("click", init);
flashButton.addEventListener("click", flash);
btnEraseNVM.addEventListener("click", eraseNVM);
btnRunApp.addEventListener("click", runApp);
btnGetDSK.addEventListener("click", getDSK);
btnGetRegion.addEventListener("click", getRegion);
btnBootloader.addEventListener("click", async () => {
	await driver.enterBootloader();
	checkApp();
});
