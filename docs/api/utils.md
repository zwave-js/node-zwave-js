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
