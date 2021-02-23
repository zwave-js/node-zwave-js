# Manufacturer Specific CC

## Manufacturer Specific CC methods

### `get`

```ts
async get(): Promise<Pick<ManufacturerSpecificCCReport, "manufacturerId" | "productType" | "productId"> | undefined>;
```

### `deviceSpecificGet`

```ts
async deviceSpecificGet(
	deviceIdType: DeviceIdType,
): Promise<string | undefined>;
```
