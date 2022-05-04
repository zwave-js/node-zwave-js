import { createHash } from "crypto";
import { Protocols } from "../capabilities/Protocols";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { parseBitMask } from "../values/Primitive";
import { dskToString } from "./DSK";
import { SecurityClass } from "./SecurityClass";

function readNumber(qr: string, offset: number, length: number): number {
	return parseInt(qr.substr(offset, length), 10);
}

function fail(reason: string): never {
	throw new ZWaveError(
		`Invalid QR code: ${reason}`,
		ZWaveErrorCodes.Security2CC_InvalidQRCode,
	);
}

/** Reads a number between 0 and 99 (2 decimal digits) */
function readLevel(qr: string, offset: number): number {
	const ret = readNumber(qr, offset, 2);
	if (ret > 99) fail("invalid data");
	return ret;
}

/** Reads a byte (3 decimal digits) */
function readUInt8(qr: string, offset: number): number {
	const ret = readNumber(qr, offset, 3);
	if (ret > 0xff) fail("invalid data");
	return ret;
}

/** Reads a 2-byte value (5 decimal digits) */
function readUInt16(qr: string, offset: number): number {
	const ret = readNumber(qr, offset, 5);
	if (ret > 0xffff) fail("invalid data");
	return ret;
}

const onlyDigitsRegex = /^\d+$/;
const minQRCodeLength = 52; // 2 digits Z, 2 digits version, 5 digits checksum, 3 digits keys, 40 digits DSK

export enum QRCodeVersion {
	S2 = 0,
	SmartStart = 1,
}

export enum ProvisioningInformationType {
	ProductType = 0x00,
	ProductId = 0x01,
	MaxInclusionRequestInterval = 0x02,
	UUID16 = 0x03,
	SupportedProtocols = 0x04,
	// The ones below are NOT QR code compatible and therefore not implemented here
	Name = 0x32,
	Location = 0x33,
	SmartStartInclusionSetting = 0x34,
	AdvancedJoining = 0x35,
	BootstrappingMode = 0x36,
	NetworkStatus = 0x37,
}

export interface ProvisioningInformation_ProductType {
	genericDeviceClass: number;
	specificDeviceClass: number;
	installerIconType: number;
}

export interface ProvisioningInformation_ProductId {
	manufacturerId: number;
	productType: number;
	productId: number;
	applicationVersion: string;
}

export interface ProvisioningInformation_MaxInclusionRequestInterval {
	maxInclusionRequestInterval: number;
}

export interface ProvisioningInformation_UUID16 {
	uuid: string;
}

export interface ProvisioningInformation_SupportedProtocols {
	supportedProtocols: Protocols[];
}

export type QRProvisioningInformation = {
	version: QRCodeVersion;
	/**
	 * The security classes that were **requested** by the device.
	 */
	readonly requestedSecurityClasses: SecurityClass[];
	/**
	 * The security classes that will be **granted** to this device.
	 * Until this has been changed by a user, this will be identical to {@link requestedSecurityClasses}.
	 */
	securityClasses: SecurityClass[];
	dsk: string;
} & ProvisioningInformation_ProductType &
	ProvisioningInformation_ProductId &
	Partial<ProvisioningInformation_MaxInclusionRequestInterval> &
	Partial<ProvisioningInformation_UUID16> &
	Partial<ProvisioningInformation_SupportedProtocols>;

function parseTLVData(type: ProvisioningInformationType, data: string) {
	switch (type) {
		case ProvisioningInformationType.ProductType: {
			const deviceClasses = readUInt16(data, 0);
			const installerIconType = readUInt16(data, 5);
			const ret: ProvisioningInformation_ProductType = {
				genericDeviceClass: deviceClasses >>> 8,
				specificDeviceClass: deviceClasses & 0xff,
				installerIconType,
			};
			return ret;
		}

		case ProvisioningInformationType.ProductId: {
			const manufacturerId = readUInt16(data, 0);
			const productType = readUInt16(data, 5);
			const productId = readUInt16(data, 10);
			const applicationVersionNumeric = readUInt16(data, 15);
			const applicationVersion = `${applicationVersionNumeric >>> 8}.${
				applicationVersionNumeric & 0xff
			}`;
			const ret: ProvisioningInformation_ProductId = {
				manufacturerId,
				productType,
				productId,
				applicationVersion,
			};
			return ret;
		}

		case ProvisioningInformationType.MaxInclusionRequestInterval: {
			const maxInclusionRequestInterval = 128 * readLevel(data, 0);
			const ret: ProvisioningInformation_MaxInclusionRequestInterval = {
				maxInclusionRequestInterval,
			};
			return ret;
		}

		case ProvisioningInformationType.UUID16: {
			const buffer = Buffer.allocUnsafe(16);
			// Only format 0 is supported here
			const presentationFormat = readLevel(data, 0);
			if (presentationFormat !== 0) return;

			for (let chunk = 0; chunk < 8; chunk++) {
				const value = readUInt16(data, 2 + chunk * 5);
				buffer.writeUInt16BE(value, chunk * 2);
			}
			const ret: ProvisioningInformation_UUID16 = {
				uuid: buffer.toString("hex"),
			};
			return ret;
		}

		case ProvisioningInformationType.SupportedProtocols: {
			const bitMask = Buffer.from([
				data.length === 2
					? readLevel(data, 0)
					: data.length === 3
					? readUInt8(data, 0)
					: data.length === 5
					? readUInt16(data, 0)
					: 0,
			]);
			const supportedProtocols = parseBitMask(bitMask, Protocols.ZWave);
			const ret: ProvisioningInformation_SupportedProtocols = {
				supportedProtocols,
			};
			return ret;
		}
	}
}

function parseTLV(qr: string): {
	entry: {
		type: ProvisioningInformationType;
	} & Record<string, any>;
	charsRead: number;
} {
	let offset = 0;
	if (qr.length - offset < 4) fail("incomplete TLV block");
	const typeCritical = readLevel(qr, offset);
	const type = typeCritical >>> 1;
	const critical = !!(typeCritical & 0b1);
	const length = readLevel(qr, offset + 2);
	offset += 4;
	if (qr.length - offset < length) fail("incomplete TLV block");

	const data = qr.substr(offset, length);
	offset += length;

	// Try to parse the raw data and fail if a critical block is not understood
	const parsed = parseTLVData(type, data);
	if (!parsed && critical) fail("Unsupported critical TLV block");

	let entry: any;
	if (parsed) {
		entry = {
			type,
			...parsed,
		};
	} else {
		entry = {
			type,
			[ProvisioningInformationType[type]]: data,
		};
	}

	return {
		entry,
		charsRead: offset,
	};
}

/** Parses a string that has been decoded from a Z-Wave (S2 or SmartStart) QR code */
export function parseQRCodeString(qr: string): QRProvisioningInformation {
	if (!qr.startsWith("90")) fail("must start with 90");
	if (qr.length < minQRCodeLength) fail("too short");
	if (!onlyDigitsRegex.test(qr)) fail("contains invalid characters");

	const version = readLevel(qr, 2);
	if (version > QRCodeVersion.SmartStart) fail("invalid version");

	const checksum = readUInt16(qr, 4);
	// The checksum covers the remaining data
	const hash = createHash("sha1");
	hash.update(Buffer.from(qr.substr(9), "ascii"));
	const expectedChecksum = hash.digest().readUInt16BE(0);
	if (checksum !== expectedChecksum) fail("invalid checksum");

	const requestedKeysBitmask = readUInt8(qr, 9);
	const requestedSecurityClasses = parseBitMask(
		Buffer.from([requestedKeysBitmask]),
		SecurityClass.S2_Unauthenticated,
	);
	if (!requestedSecurityClasses.every((k) => k in SecurityClass)) {
		fail("invalid security class requested");
	}

	let offset = 12;
	const dsk = Buffer.allocUnsafe(16);
	for (let dskBlock = 0; dskBlock < 8; dskBlock++) {
		const block = readUInt16(qr, offset);
		dsk.writeUInt16BE(block, dskBlock * 2);
		offset += 5;
	}

	const ret = {
		version,
		// This seems like a duplication, but it's more convenient for applications to not have to copy this field over
		requestedSecurityClasses,
		securityClasses: [...requestedSecurityClasses],
		dsk: dskToString(dsk),
	} as QRProvisioningInformation;

	let hasProductID = false;
	let hasProductType = false;

	while (offset < qr.length) {
		const {
			entry: { type, ...data },
			charsRead,
		} = parseTLV(qr.substr(offset));
		offset += charsRead;

		if (type === ProvisioningInformationType.ProductId) {
			hasProductID = true;
		} else if (type === ProvisioningInformationType.ProductType) {
			hasProductType = true;
		}
		Object.assign(ret, data);
	}

	// Ensure the required fields are present
	if (!hasProductID || !hasProductType) {
		fail("missing required fields");
	}

	return ret;
}
