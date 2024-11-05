import { Bytes } from "@zwave-js/shared/safe";
import { Protocols } from "../capabilities/Protocols.js";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError.js";
import { parseBitMask } from "../values/Primitive.js";
import { type SecurityClass } from "./SecurityClass.js";

function readNumber(qr: string, offset: number, length: number): number {
	return parseInt(qr.slice(offset, offset + length), 10);
}

export function fail(reason: string): never {
	throw new ZWaveError(
		`Invalid QR code: ${reason}`,
		ZWaveErrorCodes.Security2CC_InvalidQRCode,
	);
}

/** Reads a number between 0 and 99 (2 decimal digits) */
export function readLevel(qr: string, offset: number): number {
	const ret = readNumber(qr, offset, 2);
	if (ret > 99) fail("invalid data");
	return ret;
}

/** Reads a byte (3 decimal digits) */
export function readUInt8(qr: string, offset: number): number {
	const ret = readNumber(qr, offset, 3);
	if (ret > 0xff) fail("invalid data");
	return ret;
}

/** Reads a 2-byte value (5 decimal digits) */
export function readUInt16(qr: string, offset: number): number {
	const ret = readNumber(qr, offset, 5);
	if (ret > 0xffff) fail("invalid data");
	return ret;
}

export const onlyDigitsRegex = /^\d+$/;
export const minQRCodeLength = 52; // 2 digits Z, 2 digits version, 5 digits checksum, 3 digits keys, 40 digits DSK

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

export type QRProvisioningInformation =
	& {
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
	}
	& ProvisioningInformation_ProductType
	& ProvisioningInformation_ProductId
	& Partial<ProvisioningInformation_MaxInclusionRequestInterval>
	& Partial<ProvisioningInformation_UUID16>
	& Partial<ProvisioningInformation_SupportedProtocols>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function parseTLVData(type: ProvisioningInformationType, data: string) {
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
			const buffer = new Bytes(16);
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
			const bitMask = Uint8Array.from([
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

export function parseTLV(qr: string): {
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

	const data = qr.slice(offset, offset + length);
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
