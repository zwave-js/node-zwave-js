# Sound Switch CC

## `getToneCount` method

```ts
async getToneCount(): Promise<number | undefined>;
```

## `getToneInfo` method

```ts
async getToneInfo(toneId: number): Promise<Pick<SoundSwitchCCToneInfoReport, "duration" | "name"> | undefined>;
```

## `setConfiguration` method

```ts
async setConfiguration(
	defaultToneId: number,
	defaultVolume: number,
): Promise<void>;
```

## `getConfiguration` method

```ts
async getConfiguration(): Promise<Pick<SoundSwitchCCConfigurationReport, "defaultToneId" | "defaultVolume"> | undefined>;
```

## `play` method

```ts
async play(toneId: number, volume?: number): Promise<void>;
```

## `stopPlaying` method

```ts
async stopPlaying(): Promise<void>;
```

## `getPlaying` method

```ts
async getPlaying(): Promise<Pick<SoundSwitchCCTonePlayReport, "toneId" | "volume"> | undefined>;
```
