# Manufacturer Proprietary CC

## `sendData` method

```ts
async sendData(
	manufacturerId: number,
	data?: Buffer,
): Promise<void>;
```

## `fibaroVenetianBlindsGet` method

```ts
async fibaroVenetianBlindsGet(): Promise<Pick<FibaroVenetianBlindCCReport, "position" | "tilt"> | undefined>;
```

## `fibaroVenetianBlindsSetPosition` method

```ts
async fibaroVenetianBlindsSetPosition(value: number): Promise<void>;
```

## `fibaroVenetianBlindsSetTilt` method

```ts
async fibaroVenetianBlindsSetTilt(value: number): Promise<void>;
```
