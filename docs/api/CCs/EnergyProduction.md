# Energy Production CC

?> CommandClass ID: `0x90`

## Energy Production CC methods

### `get`

```ts
async get(
	parameter: EnergyProductionParameter,
): Promise<MaybeNotKnown<{ value: number; scale: EnergyProductionScale }>>;
```

## Energy Production CC values

### `value(parameter: EnergyProductionParameter)`

```ts
{
	commandClass: CommandClasses["Energy Production"],
	endpoint: number,
	property: "value",
	propertyKey: EnergyProductionParameter,
}
```

-   **label:** _(dynamic)_
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
