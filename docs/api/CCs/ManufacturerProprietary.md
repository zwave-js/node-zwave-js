# Manufacturer Proprietary CC

?> CommandClass ID: `0x91`

## Manufacturer Proprietary CC methods

### `sendData`

```ts
@validateArgs()
async sendData(
	manufacturerId: number,
	data?: Buffer,
): Promise<void>;
```

### `fibaroVenetianBlindsGet`

```ts
async fibaroVenetianBlindsGet(): Promise<Pick<FibaroVenetianBlindCCReport, "position" | "tilt"> | undefined>;
```

### `fibaroVenetianBlindsSetPosition`

```ts
@validateArgs()
async fibaroVenetianBlindsSetPosition(value: number): Promise<void>;
```

### `fibaroVenetianBlindsSetTilt`

```ts
@validateArgs()
async fibaroVenetianBlindsSetTilt(value: number): Promise<void>;
```
