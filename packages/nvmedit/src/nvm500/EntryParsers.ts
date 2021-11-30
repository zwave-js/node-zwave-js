import { NodeProtocolInfo, parseNodeProtocolInfo } from "@zwave-js/core";
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

export interface NVM500NodeInfo
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
	genericDeviceClass: number;
	specificDeviceClass?: number | null;
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
