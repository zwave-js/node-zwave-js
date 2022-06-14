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

## Door Lock CC values

### `autoRelockTime`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "autoRelockTime",
}
```

-   **label:** Duration in seconds until lock returns to secure state
-   **min. CC version:** 4
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 65535

### `blockToBlock`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "blockToBlock",
}
```

-   **label:** Block-to-block functionality enabled
-   **min. CC version:** 4
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `boltStatus`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "boltStatus",
}
```

-   **label:** Current status of the bolt
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `currentMode`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "currentMode",
}
```

-   **label:** Current lock mode
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `doorStatus`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "doorStatus",
}
```

-   **label:** Current status of the door
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `duration`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "duration",
}
```

-   **label:** Remaining duration until target lock mode
-   **min. CC version:** 3
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `holdAndReleaseTime`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "holdAndReleaseTime",
}
```

-   **label:** Duration in seconds the latch stays retracted
-   **min. CC version:** 4
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 65535

### `insideHandlesCanOpenDoor`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "insideHandlesCanOpenDoor",
}
```

-   **label:** Which inside handles can open the door (actual status)
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `insideHandlesCanOpenDoorConfiguration`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "insideHandlesCanOpenDoorConfiguration",
}
```

-   **label:** Which inside handles can open the door (configuration)
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `latchStatus`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "latchStatus",
}
```

-   **label:** Current status of the latch
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `lockTimeout`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "lockTimeout",
}
```

-   **label:** Seconds until lock mode times out
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 65535

### `lockTimeoutConfiguration`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "lockTimeoutConfiguration",
}
```

-   **label:** Duration of timed mode in seconds
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 65535

### `operationType`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "operationType",
}
```

-   **label:** Lock operation type
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `outsideHandlesCanOpenDoor`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "outsideHandlesCanOpenDoor",
}
```

-   **label:** Which outside handles can open the door (actual status)
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `outsideHandlesCanOpenDoorConfiguration`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "outsideHandlesCanOpenDoorConfiguration",
}
```

-   **label:** Which outside handles can open the door (configuration)
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `targetMode`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "targetMode",
}
```

-   **label:** Target lock mode
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `twistAssist`

```ts
{
	commandClass: typeof CommandClasses["Door Lock"],
	endpoint: number,
	property: "twistAssist",
}
```

-   **label:** Twist Assist enabled
-   **min. CC version:** 4
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
