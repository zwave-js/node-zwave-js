import { type Protocols } from "../definitions/Protocol.js";
import { type SecurityClass } from "../definitions/SecurityClass.js";

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
