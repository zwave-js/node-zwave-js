import { assertZWaveError, SecurityClass, ZWaveErrorCodes } from "..";
import { parseQRCodeString, QRCodeVersion } from "./QR";

function createDummyQR(firstDigits: string): string {
	return firstDigits + "0".repeat(52 - firstDigits.length);
}

describe("QR code parsing", () => {
	const cases = [
		{
			code: createDummyQR(`90ab`),
			reason: `contains non-digits`,
		},
		{
			code: createDummyQR(`1100`),
			reason: `does not start with 90 ("Z")`,
		},
		{
			code: "900012345001",
			reason: "is too short",
		},
		{
			code: "900199999003090360850151462432730701509765221393752300100179303072022000881000020000900257",
			reason: "has an incorrect checksum",
		},
	];
	it.each(cases.map((obj) => [obj.reason, obj.code]))(
		`throws when the QR code %s`,
		(_, code) => {
			assertZWaveError(() => parseQRCodeString(code), {
				errorCode: ZWaveErrorCodes.Security2CC_InvalidQRCode,
			});
		},
	);

	it("Example case: Acme Light Dimmer", () => {
		const result = parseQRCodeString(
			"900132782003515253545541424344453132333435212223242500100435301537022065520001000000300578",
		);
		expect(result).toEqual({
			version: QRCodeVersion.SmartStart,
			securityClasses: [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
			],
			requestedSecurityClasses: [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
			],
			dsk: "51525-35455-41424-34445-31323-33435-21222-32425",
			applicationVersion: "2.66",
			genericDeviceClass: 0x11,
			specificDeviceClass: 0x01,
			installerIconType: 0x0601,
			manufacturerId: 0xfff0,
			productType: 0x0064,
			productId: 0x0003,
		});
	});

	it("Example case: Oscorp Door Lock w. UUID", () => {
		const result = parseQRCodeString(
			"9001346230075152535455414243444531323334352122232425001016387007680220655210100000017002880642002122232425414243444511121314153132333435",
		);
		expect(result).toEqual({
			version: QRCodeVersion.SmartStart,
			securityClasses: [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
				SecurityClass.S2_AccessControl,
			],
			requestedSecurityClasses: [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
				SecurityClass.S2_AccessControl,
			],
			dsk: "51525-35455-41424-34445-31323-33435-21222-32425",
			uuid: "52e67ea9a1d0868d2b717ab77a5b829b",
			applicationVersion: "1.32",
			genericDeviceClass: 0x40,
			specificDeviceClass: 0x03,
			installerIconType: 0x0300,
			manufacturerId: 0xfff1,
			productType: 0x03e8,
			productId: 0x0011,
		});
	});

	it("Example case: Acme Light Dimmer w/o SmartStart", () => {
		const result = parseQRCodeString(
			"900032782003515253545541424344453132333435212223242500100435301537022065520001000000300578",
		);
		expect(result).toEqual({
			version: QRCodeVersion.S2,
			securityClasses: [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
			],
			requestedSecurityClasses: [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
			],
			dsk: "51525-35455-41424-34445-31323-33435-21222-32425",
			applicationVersion: "2.66",
			genericDeviceClass: 0x11,
			specificDeviceClass: 0x01,
			installerIconType: 0x0601,
			manufacturerId: 0xfff0,
			productType: 0x0064,
			productId: 0x0003,
		});
	});
});
