# Utilities

Under the `zwave-js/Utils` export, some helper functions are exported that may be of use in applications.

## Parse S2 or SmartStart QR code strings

Modern Z-Wave devices have a QR code that can be scanned to simplify the inclusion process. This QR code contains text-encoded provisioning information like the device types, requested security classes and DSK.

While `zwave-js` does not support scanning the QR code, it can parse the encoded information. To do so, pass the QR code string to the `parseQRCodeString` function

```ts
parseQRCodeString(qr: string): QRProvisioningInformation
```

which returns the following data structure:

```ts
interface QRProvisioningInformation {
	version: QRCodeVersion;
	securityClasses: SecurityClass[];
	dsk: string;
	genericDeviceClass: number;
	specificDeviceClass: number;
	installerIconType: number;
	manufacturerId: number;
	productType: number;
	productId: number;
	applicationVersion: string;
	maxInclusionRequestInterval?: number | undefined;
	uuid?: string | undefined;
	supportedProtocols?: Protocols[] | undefined;
}
```

> [!ATTENTION] This method will throw when the given string contains invalid or incomplete Z-Wave QR code data.

Depending on the version

<!-- #import QRCodeVersion from "@zwave-js/core" -->

```ts
enum QRCodeVersion {
	S2 = 0,
	SmartStart = 1,
}
```

the this information can be used to either include an S2 capable node via the [conventional inclusion process](api/controller.md#beginInclusion) or add the information of a SmartStart capable node to the [provisioning list](api/controller.md#provisionSmartStartNode).

## String formatting utilities

### `num2hex`

```ts
num2hex(
	val: number | undefined | null,
	uppercase: boolean = false,
): string
```

Formats a number as a hexadecimal string, while making sure that the length is a multiple of two digits. `undefined` and `null` get converted to `"undefined"`.

Parameters:

-   `val` - The value to be formatted as hexadecimal
-   `uppercase` - Whether uppercase letters should be used

### `formatId`

```ts
formatId(id: number): string
```

Formats an ID as a 4-digit lowercase hexadecimal string, to guarantee a representation that matches the Z-Wave specs. This is meant to be used to display manufacturer ID, product type and product ID, etc.

### `buffer2hex`

```ts
buffer2hex(buffer: Buffer, uppercase: boolean = false): string
```

Formats a buffer as an hexadecimal string, with an even number of digits. Returns `"(empty)"` if the buffer is empty.

Parameters:

-   `buffer` - The value to be formatted as hexadecimal
-   `uppercase` - Whether uppercase letters should be used

### `getEnumMemberName`

```ts
getEnumMemberName(enumeration: unknown, value: number): string
```

Returns a human-readable representation of the given enum value.
If the given value is not found in the enum object, `"unknown (<value-as-hex>)"` is returned.

Parameters:

-   `enumeration` - The enumeration object the value comes from
-   `value` - The enum value to be pretty-printed

### `rssiToString`

```ts
rssiToString(rssi: RSSI): string
```

Converts an RSSI value to a human readable format, i.e. the measurement including the unit or the corresponding error message.
