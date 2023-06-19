# Thermostat Operating State CC

?> CommandClass ID: `0x42`

## Thermostat Operating State CC methods

### `get`

```ts
async get(): Promise<MaybeNotKnown<ThermostatOperatingState>>;
```

## Thermostat Operating State CC values

### `operatingState`

```ts
{
	commandClass: CommandClasses["Thermostat Operating State"],
	endpoint: number,
	property: "state",
}
```

-   **label:** Operating state
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
