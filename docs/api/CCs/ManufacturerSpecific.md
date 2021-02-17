# Manufacturer Specific CC

## `get` method

```ts
async get(): Promise<Pick<ManufacturerSpecificCCReport, "manufacturerId" | "productType" | "productId"> | undefined>;
```

## `deviceSpecificGet` method

```ts
async deviceSpecificGet(
	deviceIdType: DeviceIdType,
): Promise<string | undefined>;
```
