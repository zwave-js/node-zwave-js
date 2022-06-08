import {
	CommandClasses,
	CommandClassInfo,
	NodeProtocolInfoAndDeviceClass,
	NodeType,
} from "@zwave-js/core";

export type PartialCCCapabilities =
	| ({
			ccId: CommandClasses;
	  } & Partial<CommandClassInfo>)
	| CommandClasses;

export interface MockNodeCapabilities extends NodeProtocolInfoAndDeviceClass {
	firmwareVersion: string;
	manufacturerId: number;
	productType: number;
	productId: number;
}

export interface MockEndpointCapabilities {
	genericDeviceClass: number;
	specificDeviceClass: number;
}

export function getDefaultMockNodeCapabilities(): MockNodeCapabilities {
	return {
		firmwareVersion: "1.0",
		manufacturerId: 0xffff,
		productType: 0xffff,
		productId: 0xfffe,

		isListening: true,
		isFrequentListening: false,
		isRouting: true,
		supportedDataRates: [9600, 40000, 100000],
		protocolVersion: 3,
		optionalFunctionality: true,
		nodeType: NodeType["End Node"],
		supportsSecurity: false,
		supportsBeaming: true,
		basicDeviceClass: 0x04, // Routing End Node
		genericDeviceClass: 0x06, // Appliance
		specificDeviceClass: 0x01, // General Appliance
	};
}

export function getDefaultMockEndpointCapabilities(
	nodeCaps: MockNodeCapabilities,
): MockEndpointCapabilities {
	return {
		genericDeviceClass: nodeCaps.genericDeviceClass,
		specificDeviceClass: nodeCaps.specificDeviceClass,
	};
}
