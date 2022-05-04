import {
	encodeNodeProtocolInfo,
	NodeProtocolInfo,
	parseNodeProtocolInfo,
} from "@zwave-js/core/safe";
import { padStart } from "alcalzone-shared/strings";
import type { NVMModuleType } from "./shared";

export interface NVMDescriptor {
	manufacturerID: number;
	firmwareID: number;
	productType: number;
	productID: number;
	firmwareVersion: string;
	protocolVersion: string;
}

export function parseNVMDescriptor(
	buffer: Buffer,
	offset: number = 0,
): NVMDescriptor {
	return {
		manufacturerID: buffer.readUInt16BE(offset),
		firmwareID: buffer.readUInt16BE(offset + 2),
		productType: buffer.readUInt16BE(offset + 4),
		productID: buffer.readUInt16BE(offset + 6),
		firmwareVersion: `${buffer[offset + 8]}.${buffer[offset + 9]}`,
		// Z-Wave protocol versions are formatted as "6.07" and similar
		protocolVersion: `${buffer[offset + 10]}.${padStart(
			buffer[offset + 11].toString(),
			2,
			"0",
		)}`,
	};
}

export function encodeNVMDescriptor(descriptor: NVMDescriptor): Buffer {
	const ret = Buffer.allocUnsafe(12);
	ret.writeUInt16BE(descriptor.manufacturerID, 0);
	ret.writeUInt16BE(descriptor.firmwareID, 2);
	ret.writeUInt16BE(descriptor.productType, 4);
	ret.writeUInt16BE(descriptor.productID, 6);
	const fwVersionParts = descriptor.firmwareVersion
		.split(".")
		.map((i) => parseInt(i));
	ret[8] = fwVersionParts[0];
	ret[9] = fwVersionParts[1];
	const protocolVersionParts = descriptor.protocolVersion
		.split(".")
		.map((i) => parseInt(i));
	ret[10] = protocolVersionParts[0];
	ret[11] = protocolVersionParts[1];
	return ret;
}

export interface NVMModuleDescriptor {
	size: number;
	type: NVMModuleType;
	version: string;
}

export function parseNVMModuleDescriptor(
	buffer: Buffer,
	offset: number = 0,
): NVMModuleDescriptor {
	return {
		size: buffer.readUInt16BE(offset),
		type: buffer[offset + 2],
		version: `${buffer[offset + 3]}.${buffer[offset + 4]}`,
	};
}

export function encodeNVMModuleDescriptor(
	descriptior: NVMModuleDescriptor,
): Buffer {
	const ret = Buffer.allocUnsafe(5);
	ret.writeUInt16BE(descriptior.size, 0);
	ret[2] = descriptior.type;
	const versionParts = descriptior.version.split(".").map((i) => parseInt(i));
	ret[3] = versionParts[0];
	ret[4] = versionParts[1];
	return ret;
}

export interface NVM500NodeInfo
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
	genericDeviceClass: number;
	specificDeviceClass: number | null;
}

export function parseNVM500NodeInfo(
	buffer: Buffer,
	offset: number,
): NVM500NodeInfo {
	const { hasSpecificDeviceClass, ...protocolInfo } = parseNodeProtocolInfo(
		buffer,
		offset,
	);
	const genericDeviceClass = buffer[offset + 3];
	const specificDeviceClass = hasSpecificDeviceClass
		? buffer[offset + 4]
		: null;
	return {
		...protocolInfo,
		genericDeviceClass,
		specificDeviceClass,
	};
}

export function encodeNVM500NodeInfo(nodeInfo: NVM500NodeInfo): Buffer {
	return Buffer.concat([
		encodeNodeProtocolInfo({
			...nodeInfo,
			hasSpecificDeviceClass: !!nodeInfo.specificDeviceClass,
		}),
		Buffer.from([
			nodeInfo.genericDeviceClass,
			nodeInfo.specificDeviceClass ?? 0,
		]),
	]);
}
