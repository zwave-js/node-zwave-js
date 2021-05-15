# Door Lock CC

?> CommandClass ID: `0x62`

## Door Lock CC methods

### `getCapabilities`

```ts
async getCapabilities(): Promise<Pick<DoorLockCCCapabilitiesReport, "autoRelockSupported" | "blockToBlockSupported" | "boltSupported" | "doorSupported" | "holdAndReleaseSupported" | "latchSupported" | "twistAssistSupported" | "supportedDoorLockModes" | "supportedInsideHandles" | "supportedOperationTypes" | "supportedOutsideHandles"> | undefined>;
```

### `get`

```ts
async get(): Promise<Pick<DoorLockCCOperationReport, "currentMode" | "targetMode" | "duration" | "outsideHandlesCanOpenDoor" | "insideHandlesCanOpenDoor" | "latchStatus" | "boltStatus" | "doorStatus" | "lockTimeout"> | undefined>;
```

### `set`

```ts
async set(mode: DoorLockMode): Promise<void>;
```

### `setConfiguration`

```ts
async setConfiguration(
	configuration: DoorLockCCConfigurationSetOptions,
): Promise<void>;
```

### `getConfiguration`

```ts
async getConfiguration(): Promise<Pick<DoorLockCCConfigurationReport, "operationType" | "outsideHandlesCanOpenDoorConfiguration" | "insideHandlesCanOpenDoorConfiguration" | "lockTimeoutConfiguration" | "autoRelockTime" | "holdAndReleaseTime" | "twistAssist" | "blockToBlock"> | undefined>;
```
