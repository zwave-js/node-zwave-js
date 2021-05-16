# Firmware Update Meta Data CC

?> CommandClass ID: `0x7a`

## Firmware Update Meta Data CC methods

### `getMetaData`

```ts
async getMetaData(): Promise<Pick<FirmwareUpdateMetaDataCCMetaDataReport, "manufacturerId" | "firmwareId" | "checksum" | "firmwareUpgradable" | "maxFragmentSize" | "additionalFirmwareIDs" | "hardwareVersion" | "continuesToFunction" | "supportsActivation"> | undefined>;
```

Requests information about the current firmware on the device.

### `requestUpdate`

```ts
async requestUpdate(
	options: FirmwareUpdateMetaDataCCRequestGetOptions,
): Promise<FirmwareUpdateRequestStatus>;
```

Requests the device to start the firmware update process.
WARNING: This method may wait up to 60 seconds for a reply.

### `sendFirmwareFragment`

```ts
async sendFirmwareFragment(
	fragmentNumber: number,
	isLastFragment: boolean,
	data: Buffer,
): Promise<void>;
```

Sends a fragment of the new firmware to the device.

### `activateFirmware`

```ts
async activateFirmware(
	options: FirmwareUpdateMetaDataCCActivationSetOptions,
): Promise<FirmwareUpdateActivationStatus | undefined>;
```

Activates a previously transferred firmware image.
