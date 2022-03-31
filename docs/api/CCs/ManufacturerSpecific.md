# Manufacturer Specific CC

?> CommandClass ID: `0x72`

## Manufacturer Specific CC methods

### `get`

```ts
async get(): Promise<Pick<ManufacturerSpecificCCReport, "manufacturerId" | "productType" | "productId"> | undefined>;
```

### `deviceSpecificGet`

```ts
@validateArgs()
async deviceSpecificGet(
	deviceIdType: DeviceIdType,
): Promise<string | undefined>;
```
