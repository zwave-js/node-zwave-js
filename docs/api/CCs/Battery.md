# Battery CC

?> CommandClass ID: `0x80`

## Battery CC methods

### `get`

```ts
async get(): Promise<Pick<BatteryCCReport, "level" | "isLow" | "chargingStatus" | "rechargeable" | "backup" | "overheating" | "lowFluid" | "rechargeOrReplace" | "lowTemperatureStatus" | "disconnected"> | undefined>;
```

### `getHealth`

```ts
async getHealth(): Promise<Pick<BatteryCCHealthReport, "maximumCapacity" | "temperature"> | undefined>;
```

## Battery CC values

### `backup`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "backup",
}
```

-   **label:** Used as backup
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `chargingStatus`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "chargingStatus",
}
```

-   **label:** Charging status
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `disconnected`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "disconnected",
}
```

-   **label:** Battery is disconnected
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `isLow`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "isLow",
}
```

-   **label:** Low battery level
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `level`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "level",
}
```

-   **label:** Battery level
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 100

### `lowFluid`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "lowFluid",
}
```

-   **label:** Fluid is low
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `lowTemperatureStatus`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "lowTemperatureStatus",
}
```

-   **label:** Battery temperature is low
-   **min. CC version:** 3
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `maximumCapacity`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "maximumCapacity",
}
```

-   **label:** Maximum capacity
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 100

### `overheating`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "overheating",
}
```

-   **label:** Overheating
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `rechargeable`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "rechargeable",
}
```

-   **label:** Rechargeable
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `rechargeOrReplace`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "rechargeOrReplace",
}
```

-   **label:** Recharge or replace
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `temperature`

```ts
{
	commandClass: CommandClasses.Battery,
	endpoint: number,
	property: "temperature",
}
```

-   **label:** Temperature
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** -128
-   **max. value:** 127
