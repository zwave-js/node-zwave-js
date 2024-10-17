# Sound Switch CC

?> CommandClass ID: `0x79`

## Sound Switch CC methods

### `getToneCount`

```ts
async getToneCount(): Promise<MaybeNotKnown<number>>;
```

### `getToneInfo`

```ts
async getToneInfo(toneId: number): Promise<Pick<SoundSwitchCCToneInfoReport, "duration" | "name"> | undefined>;
```

### `setConfiguration`

```ts
async setConfiguration(
	defaultToneId: number,
	defaultVolume: number,
): Promise<SupervisionResult | undefined>;
```

### `getConfiguration`

```ts
async getConfiguration(): Promise<Pick<SoundSwitchCCConfigurationReport, "defaultToneId" | "defaultVolume"> | undefined>;
```

### `play`

```ts
async play(
	toneId: number,
	volume?: number,
): Promise<SupervisionResult | undefined>;
```

### `stopPlaying`

```ts
async stopPlaying(): Promise<SupervisionResult | undefined>;
```

### `getPlaying`

```ts
async getPlaying(): Promise<Pick<SoundSwitchCCTonePlayReport, "toneId" | "volume"> | undefined>;
```

## Sound Switch CC values

### `defaultToneId`

```ts
{
	commandClass: CommandClasses["Sound Switch"],
	endpoint: number,
	property: "defaultToneId",
}
```

- **label:** Default tone ID
- **min. CC version:** 1
- **readable:** true
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 1
- **max. value:** 254

### `defaultVolume`

```ts
{
	commandClass: CommandClasses["Sound Switch"],
	endpoint: number,
	property: "defaultVolume",
}
```

- **label:** Default volume
- **min. CC version:** 1
- **readable:** true
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 100

### `toneId`

```ts
{
	commandClass: CommandClasses["Sound Switch"],
	endpoint: number,
	property: "toneId",
}
```

- **label:** Play Tone
- **min. CC version:** 1
- **readable:** true
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255

### `volume`

```ts
{
	commandClass: CommandClasses["Sound Switch"],
	endpoint: number,
	property: "volume",
}
```

- **label:** Volume
- **min. CC version:** 1
- **readable:** true
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 100
