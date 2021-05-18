# Manufacturer Proprietary CC

?> CommandClass ID: `0x91`

## Manufacturer Proprietary CC methods

### `sendData`

```ts
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
async fibaroVenetianBlindsSetPosition(value: number): Promise<void>;
```

### `fibaroVenetianBlindsSetTilt`

```ts
async fibaroVenetianBlindsSetTilt(value: number): Promise<void>;
```
