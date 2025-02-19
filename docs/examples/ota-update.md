# ☁️ Perform an OTA update {docsify-ignore-all}

> **NOTE:** The following example expects that you have worked through the [Quick Start](getting-started/quickstart.md) guide and the [Blink a light with Basic CC](examples/basic-on-off.md) example. Make sure to do that before continuing.

This example assumes that you have a file with the OTA update on disk. To read it, we need to import the `fs/promises` module. Add this to the top of your script:

```ts
import fs from "node:fs/promises";
```

Then read the file before the firmware update:

```ts
const filename = "path/to/firmware.bin";
const rawData = await fs.readFile(filename);
```

There are lots of different file formats for Z-Wave firmware updates. Some are encoded as [Intel HEX](https://en.wikipedia.org/wiki/Intel_HEX), some are binary. Some are compressed, some are encrypted in a format that the end node can decrypt, some are encrypted in a format that has to be decrypted first, some are just plaintext.

Z-Wave JS can help figure out the format of the firmware file and extract the data that needs to be transmitted to the end device. To have Z-Wave JS "guess" the format of the firmware file, use the `guessFirmwareFileFormat` method. This takes conventions about the filename into account, e.g. `.otz` files are typically encoded as Intel HEX, but can also be binary, `.gbl` files are to be transmitted as-is.

To do so, add this import to the top of your script:

```ts
import { extractFirmwareAsync, guessFirmwareFileFormat } from "@zwave-js/core";
```

and determine the firmware format:

```ts
const format = guessFirmwareFileFormat(filename);
```

Alternatively, you can provide the format yourself, see the [`updateFirmware` documentation](api/node#updatefirmware) for details. For example, if you know that the firmware file is in the `gbl` format, you can specify it like this:

```ts
const format: FirmwareFileFormat = "gbl";
```

Now extract the firmware data that should be transmitted to the end device:

```ts
const firmware = await extractFirmwareAsync(rawData, format);
```

Most file formats do not contain information about the firmware target that should be updated. If you plan on updating a different target than the Z-Wave chip (0), set it manually:

```ts
firmware.firmwareTarget = 1;
```

Likewise, there is no way to determine the firmware ID from firmware update files. If your end device validates the firmware ID, you need to set it manuall, e.g.:

```ts
firmware.firmwareId = 0xcafe;
```

Afterwards, start the firmware update:

```ts
try {
	const result = await node.updateFirmware([firmware]);
	if (result.success) {
		console.log("Firmware update finished successfully");
	} else {
		console.error("Firmware update failed with status:", result.status);
	}
} catch (error) {
	console.error("Failed to start firmware update:", error);
}
```

If you know that your firmware data can be transmitted as-is, you can also skip the extraction part and provide the raw data directly:

```ts
const result = await node.updateFirmware([{
	data: firmwareData,
	// optionally specify target and firmare ID:
	firmwareTarget: 1,
	firmwareId: 0xcafe,
}]);
```

To be notified of the progress, two driver events exist. Listening to progress can be done like this:

```ts
driver.on("firmware update progress", (node, progress) => {
	console.log(
		`Firmware update progress: ${progress.sentFragments}/${progress.totalFragments}`,
	);
});
```

To be notified about the outcome, either `await` the `updateFirmware` call like we did above, or use the following event:

```ts
driver.on("firmware update finished", (node, result) => {
	if (result.success) {
		console.log("Firmware update finished successfully");
	} else {
		console.error("Firmware update failed with status:", result.status);
	}
});
```

## Putting it all together

Here's a complete example where you can provide the node ID, firmware file, target and firmware ID as command line arguments

```ts
import { extractFirmwareAsync, guessFirmwareFileFormat } from "@zwave-js/core";
import fs from "node:fs/promises";
import { Driver } from "zwave-js";

// ...driver initialization, see Quick Start guide

async function main() {
	const node = driver.controller.nodes.getOrThrow(2);

	// Expects the script to be called like
	//   node ota-update.js <nodeId> <path/to/firmware> [<target> <firmwareIdHex>]
	// where the target and firmware id are optional
	const nodeId = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;
	const filename = process.argv[3];
	if (!nodeId || !filename) {
		console.error(
			"Usage: node ota-update.js <nodeId> <path/to/firmware> [<target> <firmwareIdHex>]",
		);
		process.exit(1);
	}

	const node = driver.controller.nodes.get(nodeId);
	if (!node) {
		console.error(`Node ${nodeId} not found`);
		process.exit(1);
	}

	const firmwareTarget = process.argv[4] ? parseInt(process.argv[4], 10) : 0;
	const firmwareId = process.argv[5]
		? parseInt(process.argv[5], 16)
		: undefined;
	const rawData = await fs.readFile(filename);

	let firmware;
	try {
		const format = guessFirmwareFileFormat(filename);
		firmware = await extractFirmwareAsync(rawData, format);
	} catch (e) {
		console.error("Failed to extract firmware", e);
		process.exit(1);
	}

	if (firmwareTarget !== 0) {
		firmware.firmwareTarget = firmwareTarget;
	}
	if (firmwareId != undefined) {
		firmware.firmwareId = firmwareId;
	}

	try {
		const result = await node.updateFirmware([firmware]);
		if (result.success) {
			console.log("Firmware update finished successfully");
			process.exit(0);
		} else {
			console.error("Firmware update failed with status:", result.status);
			process.exit(1);
		}
	} catch (error) {
		console.error("Failed to start firmware update:", error);
		process.exit(1);
	}
}

driver.on("firmware update progress", (node, progress) => {
	console.log(
		`Firmware update progress: ${progress.sentFragments}/${progress.totalFragments}`,
	);
});
```

To update node 2 with `path/to/firmware.bin`, simply run the script with

```bash
node ota-update.js 2 path/to/firmware.bin
```

If you want to update a different target (1) or firmware ID (`0xcafe`), you can provide them as additional arguments:

```bash
node ota-update.js 2 path/to/firmware.bin 1 0xcafe
```
