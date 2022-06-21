# Thermostat Fan State CC

?> CommandClass ID: `0x45`

## Thermostat Fan State CC methods

### `get`

```ts
async get(): Promise<ThermostatFanState | undefined>;
```

## Thermostat Fan State CC values

### `fanState`

```ts
{
	commandClass: CommandClasses["Thermostat Fan State"],
	endpoint: number,
	property: "state",
}
```

-   **label:** Thermostat fan state
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
