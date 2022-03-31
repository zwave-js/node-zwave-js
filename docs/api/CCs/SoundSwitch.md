# Sound Switch CC

?> CommandClass ID: `0x79`

## Sound Switch CC methods

### `getToneCount`

```ts
async getToneCount(): Promise<number | undefined>;
```

### `getToneInfo`

```ts
@validateArgs()
async getToneInfo(toneId: number): Promise<Pick<SoundSwitchCCToneInfoReport, "duration" | "name"> | undefined>;
```

### `setConfiguration`

```ts
@validateArgs()
async setConfiguration(
	defaultToneId: number,
	defaultVolume: number,
): Promise<void>;
```

### `getConfiguration`

```ts
async getConfiguration(): Promise<Pick<SoundSwitchCCConfigurationReport, "defaultToneId" | "defaultVolume"> | undefined>;
```

### `play`

```ts
@validateArgs()
async play(toneId: number, volume?: number): Promise<void>;
```

### `stopPlaying`

```ts
async stopPlaying(): Promise<void>;
```

### `getPlaying`

```ts
async getPlaying(): Promise<Pick<SoundSwitchCCTonePlayReport, "toneId" | "volume"> | undefined>;
```
