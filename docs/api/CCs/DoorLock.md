# Door Lock CC

## `getCapabilities` method

```ts
async getCapabilities(): Promise<Pick<DoorLockCCCapabilitiesReport, "autoRelockSupported" | "blockToBlockSupported" | "boltSupported" | "doorSupported" | "holdAndReleaseSupported" | "latchSupported" | "twistAssistSupported" | "supportedDoorLockModes" | "supportedInsideHandles" | "supportedOperationTypes" | "supportedOutsideHandles"> | undefined>;
```

## `get` method

```ts
async get(): Promise<Pick<DoorLockCCOperationReport, "currentMode" | "targetMode" | "duration" | "outsideHandlesCanOpenDoor" | "insideHandlesCanOpenDoor" | "latchStatus" | "boltStatus" | "doorStatus" | "lockTimeout"> | undefined>;
```

## `set` method

```ts
async set(mode: DoorLockMode): Promise<void>;
```

## `setConfiguration` method

```ts
async setConfiguration(
	configuration: DoorLockCCConfigurationSetOptions,
): Promise<void>;
```

## `getConfiguration` method

```ts
async getConfiguration(): Promise<Pick<DoorLockCCConfigurationReport, "operationType" | "outsideHandlesCanOpenDoorConfiguration" | "insideHandlesCanOpenDoorConfiguration" | "lockTimeoutConfiguration" | "autoRelockTime" | "holdAndReleaseTime" | "twistAssist" | "blockToBlock"> | undefined>;
```
